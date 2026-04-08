import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { LEAD_SCORE_SYSTEM, buildLeadScorePrompt } from '@/lib/ai/prompts/leadScore'

const requestSchema = z.object({
  lead_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_lead_score'),
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
  const startedAt = Date.now()
  const model = MODEL.default

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const { data: existingResearch } = await supabase
    .from('lead_research')
    .select('website_audit, social_audit, business_intel')
    .eq('lead_id', lead_id)
    .single()

  try {
    const prompt = buildLeadScorePrompt({
      businessName: lead.business_name,
      industry: lead.industry,
      serviceArea: lead.service_area,
      website: lead.website,
      hasWebsite: lead.has_website,
      instagramHandle: lead.instagram_handle,
      facebookUrl: lead.facebook_url,
      googleBusinessUrl: lead.google_business_url,
      jobsPerWeek: lead.jobs_per_week,
      yearsInBusiness: lead.years_in_business,
      reviewCount: lead.review_count,
      rating: lead.rating,
      notes: lead.notes,
      callNotes: lead.call_notes,
      existingResearch: existingResearch ?? null,
    })

    const result = await callClaude({ model, system: LEAD_SCORE_SYSTEM, prompt, maxTokens: 1024 })

    let scoreData: Record<string, unknown>
    try {
      scoreData = JSON.parse(extractJSON(result.content)) as Record<string, unknown>
    } catch {
      console.error('[lead-score] Parse error:', result.content.substring(0, 200))
      return NextResponse.json({ error: 'AI returned invalid content' }, { status: 500 })
    }

    const score = scoreData.score as number
    const heatLevel = scoreData.heat_level as string | undefined
    const tier = scoreData.recommended_tier as string | undefined
    const mrr = scoreData.estimated_mrr as number | undefined

    // Update lead
    await supabase
      .from('leads')
      .update({
        ai_score: score,
        ...(heatLevel ? { heat_level: heatLevel } : {}),
        ...(tier ? { ai_recommended_tier: tier } : {}),
        ...(mrr ? { ai_recommended_mrr: mrr } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id)

    await logAIRun({
      supabase,
      userId: user.id,
      leadId: lead_id,
      workflow: 'lead_research',
      model,
      usage: result.usage,
      outputSummary: `Lead score: ${score}/100`,
      startedAt,
    })

    return NextResponse.json({ score: scoreData })
  } catch (err) {
    console.error('[lead-score] Unexpected error:', err)
    await logAIRun({
      supabase,
      userId: user.id,
      leadId: lead_id,
      workflow: 'lead_research',
      model,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      startedAt,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
