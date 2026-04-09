import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
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

// --- Retry helpers ---

const MAX_RETRIES = 2
const BACKOFF_MS = [5_000, 15_000] // exponential backoff: 5s, 15s

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  // API timeouts, rate limits, network errors, 5xx from Anthropic
  if (msg.includes('timeout') || msg.includes('timed out')) return true
  if (msg.includes('rate limit') || msg.includes('429')) return true
  if (msg.includes('network') || msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('fetch failed')) return true
  if (msg.includes('overloaded')) return true
  // Anthropic SDK error shapes — any 5xx or 429
  if ('status' in err) {
    const status = (err as { status: number }).status
    if (status === 429 || (status >= 500 && status < 600)) return true
  }
  return false
}

function isPermanentError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  if (msg.includes('400') || msg.includes('invalid')) return true
  if ('status' in err) {
    const status = (err as { status: number }).status
    if (status === 400 || status === 401 || status === 403 || status === 404) return true
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callClaudeWithRetry(
  params: Parameters<typeof callClaude>[0],
  label: string,
  supabase?: SupabaseClient,
  leadId?: string,
): ReturnType<typeof callClaude> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callClaude(params)
    } catch (err) {
      lastError = err
      if (isPermanentError(err)) throw err
      if (!isTransientError(err) || attempt === MAX_RETRIES) {
        const suffix = attempt > 0 ? ` after ${attempt + 1} attempts` : ''
        throw new Error(`${label} failed${suffix}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
      console.warn(`[research-pipeline] ${label} attempt ${attempt + 1} failed, retrying in ${BACKOFF_MS[attempt]}ms:`, err instanceof Error ? err.message : err)
      // Touch updated_at so the stale detector doesn't kill this active retry
      if (supabase && leadId) {
        await supabase.from('lead_research').update({
          updated_at: new Date().toISOString(),
        }).eq('lead_id', leadId).eq('status', 'running')
      }
      await sleep(BACKOFF_MS[attempt])
    }
  }
  throw lastError
}

/**
 * Run the full 5-agent + orchestrator research pipeline for a single lead.
 * Saves results incrementally to lead_research so polling can track progress.
 * Must be called from a server context (API route, after(), etc).
 * Includes auto-retry with exponential backoff for transient errors.
 */
export async function runResearchPipeline(
  supabase: SupabaseClient,
  leadId: string,
  lead: Record<string, unknown>,
  userId: string,
): Promise<void> {
  const startedAt = Date.now()

  // Validate lead data upfront — permanent failure if missing
  if (!lead.business_name) {
    await supabase.from('lead_research').update({
      status: 'failed',
      error_message: 'Invalid lead data: no business name',
      updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId)
    return
  }

  // Helper: check if this research row is still running (not cancelled/failed)
  async function isStillRunning(): Promise<boolean> {
    const { data } = await supabase
      .from('lead_research')
      .select('status')
      .eq('lead_id', leadId)
      .single()
    return data?.status === 'running'
  }

  try {
    // ── Sub-agent 1: Website Auditor ──────────────────────────────────
    let websiteContent = ''
    if (lead.website) websiteContent = await fetchWebsiteText(lead.website as string)

    const waResult = await callClaudeWithRetry({
      model: MODEL.fast,
      system: WEBSITE_AUDITOR_SYSTEM,
      prompt: buildWebsiteAuditorPrompt({
        businessName: lead.business_name as string,
        website: lead.website as string | null,
        websiteContent,
      }),
      maxTokens: 1024,
    }, 'Website auditor', supabase, leadId)
    let websiteAudit: Record<string, unknown> = {}
    try { websiteAudit = JSON.parse(extractJSON(waResult.content)) as Record<string, unknown> } catch { /* use empty */ }

    await supabase.from('lead_research').update({
      website_audit: websiteAudit,
      updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId).eq('status', 'running')

    if (!await isStillRunning()) return

    // ── Sub-agent 2: Social Auditor ───────────────────────────────────
    const saResult = await callClaudeWithRetry({
      model: MODEL.fast,
      system: SOCIAL_AUDITOR_SYSTEM,
      prompt: buildSocialAuditorPrompt({
        businessName: lead.business_name as string,
        instagramHandle: lead.instagram_handle as string | null,
        facebookUrl: lead.facebook_url as string | null,
        googleBusinessUrl: lead.google_business_url as string | null,
      }),
      maxTokens: 1024,
    }, 'Social auditor', supabase, leadId)
    let socialAudit: Record<string, unknown> = {}
    try { socialAudit = JSON.parse(extractJSON(saResult.content)) as Record<string, unknown> } catch { /* use empty */ }

    await supabase.from('lead_research').update({
      social_audit: socialAudit,
      updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId).eq('status', 'running')

    if (!await isStillRunning()) return

    // ── Sub-agent 3: Business Intelligence ────────────────────────────
    const biResult = await callClaudeWithRetry({
      model: MODEL.fast,
      system: BUSINESS_INTEL_SYSTEM,
      prompt: buildBusinessIntelPrompt({
        businessName: lead.business_name as string,
        industry: lead.industry as string | null,
        serviceArea: lead.service_area as string | null,
        jobsPerWeek: lead.jobs_per_week as number | null,
        yearsInBusiness: lead.years_in_business as number | null,
        websiteContent,
        websiteScore: (websiteAudit.score as number) ?? 0,
        socialScore: (socialAudit.overall_score as number) ?? 0,
      }),
      maxTokens: 1024,
    }, 'Business intelligence', supabase, leadId)
    let businessIntel: Record<string, unknown> = {}
    try { businessIntel = JSON.parse(extractJSON(biResult.content)) as Record<string, unknown> } catch { /* use empty */ }

    await supabase.from('lead_research').update({
      business_intel: businessIntel,
      updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId).eq('status', 'running')

    if (!await isStillRunning()) return

    // ── Sub-agent 4: Service Fit ──────────────────────────────────────
    const sfResult = await callClaudeWithRetry({
      model: MODEL.fast,
      system: SERVICE_FIT_SYSTEM,
      prompt: buildServiceFitPrompt({
        businessName: lead.business_name as string,
        websiteAudit,
        socialAudit,
        businessIntel,
      }),
      maxTokens: 1024,
    }, 'Service fit', supabase, leadId)
    let serviceFit: Record<string, unknown> = {}
    try { serviceFit = JSON.parse(extractJSON(sfResult.content)) as Record<string, unknown> } catch { /* use empty */ }

    await supabase.from('lead_research').update({
      service_fit: serviceFit,
      updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId).eq('status', 'running')

    if (!await isStillRunning()) return

    // ── Sub-agent 5: Pricing Recommender ─────────────────────────────
    const prResult = await callClaudeWithRetry({
      model: MODEL.fast,
      system: PRICING_RECOMMENDER_SYSTEM,
      prompt: buildPricingRecommenderPrompt({
        businessName: lead.business_name as string,
        websiteAudit,
        socialAudit,
        businessIntel,
        serviceFit,
      }),
      maxTokens: 1024,
    }, 'Pricing recommender', supabase, leadId)
    let pricingAnalysis: Record<string, unknown> = {}
    try { pricingAnalysis = JSON.parse(extractJSON(prResult.content)) as Record<string, unknown> } catch { /* use empty */ }

    await supabase.from('lead_research').update({
      pricing_analysis: pricingAnalysis,
      updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId).eq('status', 'running')

    if (!await isStillRunning()) return

    // ── Orchestrator: Synthesis ───────────────────────────────────────
    const orchResult = await callClaudeWithRetry({
      model: MODEL.default,
      system: ORCHESTRATOR_SYSTEM,
      prompt: buildOrchestratorPrompt({
        businessName: lead.business_name as string,
        websiteAudit,
        socialAudit,
        businessIntel,
        serviceFit,
        pricingAnalysis,
      }),
      maxTokens: 4096,
    }, 'Orchestrator', supabase, leadId)
    const fullReport = orchResult.content

    const overallScore = calculateOverallScore({
      websiteScore: (websiteAudit.score as number) ?? 0,
      socialScore: (socialAudit.overall_score as number) ?? 0,
      businessIntel,
      serviceFit,
      pricingAnalysis,
    })

    // Extract tier info
    const websiteTier = pricingAnalysis.website_tier as Record<string, unknown> | undefined
    const retainerTier = pricingAnalysis.retainer_tier as Record<string, unknown> | undefined
    const aiRecommendedTier = (websiteTier?.tier_name as string)
      ?? (pricingAnalysis.recommended_bundle as string)
      ?? (pricingAnalysis.recommended_tier as string)
      ?? 'starter'
    const aiRecommendedMrr = (retainerTier?.monthly_low as number)
      ?? (pricingAnalysis.mrr_low as number)
      ?? 0

    // Save final results — only if still running (not cancelled)
    const { data: finalUpdate } = await supabase.from('lead_research').update({
      full_report: fullReport,
      overall_score: overallScore,
      status: 'completed',
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId).eq('status', 'running').select('id').single()

    // If the row was cancelled mid-pipeline, don't update the lead
    if (!finalUpdate) return

    // Update lead
    await supabase.from('leads').update({
      ai_score: overallScore,
      ai_recommended_tier: aiRecommendedTier,
      ai_recommended_mrr: aiRecommendedMrr,
      ai_evaluation: fullReport,
      updated_at: new Date().toISOString(),
    }).eq('id', leadId)

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id: leadId,
      user_id: userId,
      type: 'research_run',
      content: `AI research completed — score: ${overallScore}/100, recommended tier: ${aiRecommendedTier}`,
    })

    // Log AI run cost
    await logAIRun({
      supabase,
      userId,
      leadId,
      workflow: 'lead_research',
      model: MODEL.default,
      usage: orchResult.usage,
      outputSummary: `Research complete — score: ${overallScore}/100`,
      startedAt,
    })
  } catch (err) {
    console.error(`[research-pipeline] Error for lead ${leadId}:`, err)
    await supabase.from('lead_research').update({
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
      updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId)
  }
}
