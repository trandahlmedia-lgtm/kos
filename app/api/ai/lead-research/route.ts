import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { fetchWebsiteText } from '@/lib/ai/fetchWebsiteText'
import {
  WEBSITE_AUDITOR_SYSTEM, buildWebsiteAuditorPrompt,
  SOCIAL_AUDITOR_SYSTEM, buildSocialAuditorPrompt,
  BUSINESS_INTEL_SYSTEM, buildBusinessIntelPrompt,
  SERVICE_FIT_SYSTEM, buildServiceFitPrompt,
  PRICING_RECOMMENDER_SYSTEM, buildPricingRecommenderPrompt,
  ORCHESTRATOR_SYSTEM, buildOrchestratorPrompt,
  calculateOverallScore,
} from '@/lib/ai/prompts/leadResearch'

const requestSchema = z.object({
  lead_id: z.string().uuid(),
})

// SSE helper
function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_lead_research'),
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

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Single-flight guard: only start if not already running
  const { data: researchRow } = await supabase
    .from('lead_research')
    .select('id, status')
    .eq('lead_id', lead_id)
    .single()

  if (researchRow?.status === 'running') {
    return NextResponse.json(
      { error: 'Research is already in progress for this lead.' },
      { status: 409 }
    )
  }

  // Upsert: atomically set to running (uses unique constraint on lead_id)
  if (researchRow) {
    await supabase.from('lead_research').update({ status: 'running', error_message: null, updated_at: new Date().toISOString() }).eq('lead_id', lead_id)
  } else {
    await supabase.from('lead_research').insert({ lead_id, status: 'running' })
  }

  const startedAt = Date.now()

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(data)))
      }

      try {
        // ── Sub-agent 1: Website Auditor ──────────────────────────────────
        send({ step: 'website_audit', status: 'running' })
        let websiteContent = ''
        if (lead.website) websiteContent = await fetchWebsiteText(lead.website)

        const waResult = await callClaude({
          model: MODEL.fast,
          system: WEBSITE_AUDITOR_SYSTEM,
          prompt: buildWebsiteAuditorPrompt({
            businessName: lead.business_name,
            website: lead.website,
            websiteContent,
          }),
          maxTokens: 1024,
        })
        let websiteAudit: Record<string, unknown> = {}
        try { websiteAudit = JSON.parse(extractJSON(waResult.content)) as Record<string, unknown> } catch { /* use empty */ }
        send({ step: 'website_audit', status: 'complete', score: websiteAudit.score ?? 0 })

        // ── Sub-agent 2: Social Auditor ───────────────────────────────────
        send({ step: 'social_audit', status: 'running' })
        const saResult = await callClaude({
          model: MODEL.fast,
          system: SOCIAL_AUDITOR_SYSTEM,
          prompt: buildSocialAuditorPrompt({
            businessName: lead.business_name,
            instagramHandle: lead.instagram_handle,
            facebookUrl: lead.facebook_url,
            googleBusinessUrl: lead.google_business_url,
          }),
          maxTokens: 1024,
        })
        let socialAudit: Record<string, unknown> = {}
        try { socialAudit = JSON.parse(extractJSON(saResult.content)) as Record<string, unknown> } catch { /* use empty */ }
        send({ step: 'social_audit', status: 'complete', score: socialAudit.overall_score ?? 0 })

        // ── Sub-agent 3: Business Intelligence ────────────────────────────
        send({ step: 'business_intel', status: 'running' })
        const biResult = await callClaude({
          model: MODEL.fast,
          system: BUSINESS_INTEL_SYSTEM,
          prompt: buildBusinessIntelPrompt({
            businessName: lead.business_name,
            industry: lead.industry,
            serviceArea: lead.service_area,
            jobsPerWeek: lead.jobs_per_week,
            yearsInBusiness: lead.years_in_business,
            websiteContent,
            websiteScore: (websiteAudit.score as number) ?? 0,
            socialScore: (socialAudit.overall_score as number) ?? 0,
          }),
          maxTokens: 1024,
        })
        let businessIntel: Record<string, unknown> = {}
        try { businessIntel = JSON.parse(extractJSON(biResult.content)) as Record<string, unknown> } catch { /* use empty */ }
        send({ step: 'business_intel', status: 'complete' })

        // ── Sub-agent 4: Service Fit ──────────────────────────────────────
        send({ step: 'service_fit', status: 'running' })
        const sfResult = await callClaude({
          model: MODEL.fast,
          system: SERVICE_FIT_SYSTEM,
          prompt: buildServiceFitPrompt({
            businessName: lead.business_name,
            websiteAudit,
            socialAudit,
            businessIntel,
          }),
          maxTokens: 1024,
        })
        let serviceFit: Record<string, unknown> = {}
        try { serviceFit = JSON.parse(extractJSON(sfResult.content)) as Record<string, unknown> } catch { /* use empty */ }
        send({ step: 'service_fit', status: 'complete' })

        // ── Sub-agent 5: Pricing Recommender ─────────────────────────────
        send({ step: 'pricing_analysis', status: 'running' })
        const prResult = await callClaude({
          model: MODEL.fast,
          system: PRICING_RECOMMENDER_SYSTEM,
          prompt: buildPricingRecommenderPrompt({
            businessName: lead.business_name,
            websiteAudit,
            socialAudit,
            businessIntel,
            serviceFit,
          }),
          maxTokens: 1024,
        })
        let pricingAnalysis: Record<string, unknown> = {}
        try { pricingAnalysis = JSON.parse(extractJSON(prResult.content)) as Record<string, unknown> } catch { /* use empty */ }
        send({ step: 'pricing_analysis', status: 'complete', tier: pricingAnalysis.recommended_tier })

        // ── Orchestrator: Synthesis ───────────────────────────────────────
        send({ step: 'synthesis', status: 'running' })
        const orchResult = await callClaude({
          model: MODEL.default,
          system: ORCHESTRATOR_SYSTEM,
          prompt: buildOrchestratorPrompt({
            businessName: lead.business_name,
            websiteAudit,
            socialAudit,
            businessIntel,
            serviceFit,
            pricingAnalysis,
          }),
          maxTokens: 4096,
        })
        const fullReport = orchResult.content

        const overallScore = calculateOverallScore({
          websiteScore: (websiteAudit.score as number) ?? 0,
          socialScore: (socialAudit.overall_score as number) ?? 0,
          businessIntel,
          serviceFit,
          pricingAnalysis,
        })

        // Extract tier info — support both new (website_tier/retainer_tier) and old (recommended_tier) formats
        const websiteTier = pricingAnalysis.website_tier as Record<string, unknown> | undefined
        const retainerTier = pricingAnalysis.retainer_tier as Record<string, unknown> | undefined
        const aiRecommendedTier = (websiteTier?.tier_name as string)
          ?? (pricingAnalysis.recommended_bundle as string)
          ?? (pricingAnalysis.recommended_tier as string)
          ?? 'starter'
        const aiRecommendedMrr = (retainerTier?.monthly_low as number)
          ?? (pricingAnalysis.mrr_low as number)
          ?? 0

        // Save to DB
        const researchFields = {
          website_audit: websiteAudit,
          social_audit: socialAudit,
          business_intel: businessIntel,
          service_fit: serviceFit,
          pricing_analysis: pricingAnalysis,
          full_report: fullReport,
          overall_score: overallScore,
          status: 'completed',
          error_message: null,
          updated_at: new Date().toISOString(),
        }

        const { data: savedResearch } = await supabase
          .from('lead_research')
          .update(researchFields)
          .eq('lead_id', lead_id)
          .select()
          .single()

        // Update lead
        await supabase.from('leads').update({
          ai_score: overallScore,
          ai_recommended_tier: aiRecommendedTier,
          ai_recommended_mrr: aiRecommendedMrr,
          ai_evaluation: fullReport,
          updated_at: new Date().toISOString(),
        }).eq('id', lead_id)

        // Log activity
        await supabase.from('lead_activities').insert({
          lead_id,
          user_id: user.id,
          type: 'research_run',
          content: `AI research completed — score: ${overallScore}/100, recommended tier: ${aiRecommendedTier}`,
        })

        // Log AI run cost (sum of all sub-agents — approximate via orchestrator tokens)
        await logAIRun({
          supabase,
          userId: user.id,
          leadId: lead_id,
          workflow: 'lead_research',
          model: MODEL.default,
          usage: orchResult.usage,
          outputSummary: `Research complete — score: ${overallScore}/100`,
          startedAt,
        })

        send({ step: 'synthesis', status: 'complete' })
        send({ step: 'done', score: overallScore, research_id: savedResearch?.id ?? null })
      } catch (err) {
        console.error('[lead-research] Error:', err)
        await supabase.from('lead_research').update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        }).eq('lead_id', lead_id)
        send({ step: 'error', message: 'Research failed. Please try again.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
