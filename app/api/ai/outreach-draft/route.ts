import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import {
  OUTREACH_EMAIL_SYSTEM,
  buildOutreachSequencePrompt,
} from '@/lib/ai/prompts/outreachEmail'

const requestSchema = z.object({
  lead_id: z.string().uuid(),
})

const TEMPLATE_TYPES = ['initial', 'followup_1', 'followup_2', 'followup_3'] as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_outreach_draft'),
    LIMITS.USER_HEAVY.max,
    LIMITS.USER_HEAVY.windowS
  )
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { lead_id } = parsed.data

  // Fetch lead + research
  const [leadRes, researchRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', lead_id).single(),
    supabase.from('lead_research').select('*').eq('lead_id', lead_id).eq('status', 'completed').order('created_at', { ascending: false }).limit(1).single(),
  ])

  if (leadRes.error || !leadRes.data) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const lead = leadRes.data
  const research = researchRes.data

  if (!research) {
    return NextResponse.json({ error: 'No completed research found for this lead. Run research first.' }, { status: 400 })
  }

  if (!lead.email) {
    return NextResponse.json({ error: 'Lead has no email address. Add an email before drafting outreach.' }, { status: 400 })
  }

  // Check if emails already exist or are being generated for this lead
  const { data: existingEmails } = await supabase
    .from('outreach_emails')
    .select('id, subject, created_at')
    .eq('lead_id', lead_id)

  if (existingEmails && existingEmails.length > 0) {
    // Auto-clean stale placeholders (empty subject, older than 2 min) from a previous failed generation
    const STALE_MS = 2 * 60 * 1000
    const allEmpty = existingEmails.every((e) => e.subject === '')
    const allStale = existingEmails.every((e) => Date.now() - new Date(e.created_at).getTime() > STALE_MS)

    if (allEmpty && allStale) {
      await supabase
        .from('outreach_emails')
        .delete()
        .in('id', existingEmails.map((e) => e.id))
    } else {
      return NextResponse.json({ error: 'Outreach emails already exist for this lead. Delete existing drafts to regenerate.' }, { status: 409 })
    }
  }

  // Insert placeholder rows BEFORE calling Claude to prevent duplicate generation.
  // If the panel is closed and reopened while drafting, these rows signal "in progress."
  const placeholderRows = TEMPLATE_TYPES.map((type, idx) => ({
    lead_id,
    subject: '',
    body_html: '',
    body_text: '',
    status: 'draft' as const,
    template_type: type,
    follow_up_number: idx,
    created_by: user.id,
  }))

  const { data: placeholders, error: placeholderErr } = await supabase
    .from('outreach_emails')
    .insert(placeholderRows)
    .select('id, template_type')

  if (placeholderErr || !placeholders) {
    // Unique constraint violation (23505) = another request beat us; otherwise unexpected
    const isConstraintViolation = placeholderErr?.code === '23505'
    console.error('[outreach-draft] Placeholder insert error:', placeholderErr)
    return NextResponse.json(
      { error: isConstraintViolation
          ? 'Outreach emails already exist or are being generated for this lead.'
          : 'Failed to reserve email slots' },
      { status: isConstraintViolation ? 409 : 500 }
    )
  }

  const placeholderIds = placeholders.map((p) => p.id)

  // Extract findings from research
  const websiteAudit = research.website_audit as Record<string, unknown> | null
  const socialAudit = research.social_audit as Record<string, unknown> | null
  const serviceFit = research.service_fit as Record<string, unknown> | null
  const websiteFindings = (websiteAudit?.findings as string[] | undefined) ?? []
  const socialFindings = (socialAudit?.findings as string[] | undefined) ?? []
  const primaryOpportunity = (serviceFit?.primary_opportunity as string | undefined) ?? null
  const quickWins = (serviceFit?.quick_wins as string[] | undefined) ?? []

  const startedAt = Date.now()

  try {
    const result = await callClaude({
      model: MODEL.default,
      system: OUTREACH_EMAIL_SYSTEM,
      prompt: buildOutreachSequencePrompt({
        businessName: lead.business_name,
        industry: lead.industry,
        serviceArea: lead.service_area,
        website: lead.website,
        hasWebsite: lead.has_website ?? false,
        reviewCount: lead.review_count,
        rating: lead.rating ? Number(lead.rating) : null,
        aiScore: lead.ai_score,
        recommendedTier: lead.ai_recommended_tier,
        recommendedMrr: lead.ai_recommended_mrr,
        researchReport: research.full_report,
        websiteFindings,
        socialFindings,
        primaryOpportunity,
        quickWins,
      }),
      maxTokens: 4096,
    })

    const json = extractJSON(result.content)
    const sequence = JSON.parse(json) as Record<string, { subject: string; body_text: string; body_html: string }>

    // Validate expected keys
    const keys = ['initial', 'followup_1', 'followup_2', 'followup_3']
    for (const key of keys) {
      if (!sequence[key]?.subject || !sequence[key]?.body_text) {
        throw new Error(`Missing or invalid email for: ${key}`)
      }
    }

    // Update placeholder rows with generated content
    const updatePromises = placeholders.map((p) => {
      const content = sequence[p.template_type]
      return supabase
        .from('outreach_emails')
        .update({
          subject: content.subject,
          body_html: content.body_html || '',
          body_text: content.body_text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.id)
    })

    await Promise.all(updatePromises)

    // Re-fetch completed emails
    const { data: emails } = await supabase
      .from('outreach_emails')
      .select('*')
      .in('id', placeholderIds)
      .order('follow_up_number', { ascending: true })

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id,
      user_id: user.id,
      type: 'email_drafted',
      content: `AI drafted outreach sequence (4 emails) for ${lead.business_name}`,
    })

    // Log AI run
    await logAIRun({
      supabase,
      userId: user.id,
      leadId: lead_id,
      workflow: 'outreach_draft',
      model: result.model,
      usage: result.usage,
      outputSummary: `Drafted 4 outreach emails for ${lead.business_name}`,
      startedAt,
    })

    return NextResponse.json({ emails, count: emails?.length ?? 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[outreach-draft] Error:', message)

    // Clean up placeholder rows on failure
    await supabase
      .from('outreach_emails')
      .delete()
      .in('id', placeholderIds)

    await logAIRun({
      supabase,
      userId: user.id,
      leadId: lead_id,
      workflow: 'outreach_draft',
      model: MODEL.default,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      startedAt,
      status: 'failed',
      errorMessage: message,
    })

    return NextResponse.json({ error: 'Failed to generate email drafts' }, { status: 500 })
  }
}
