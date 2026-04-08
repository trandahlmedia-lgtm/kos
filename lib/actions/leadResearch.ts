'use server'

import { createClient } from '@/lib/supabase/server'
import type { LeadResearch } from '@/types'

// ---------------------------------------------------------------------------
// saveResearchResult — called from the research API route after all sub-agents complete
// ---------------------------------------------------------------------------

export async function saveResearchResult(params: {
  leadId: string
  websiteAudit: Record<string, unknown>
  socialAudit: Record<string, unknown>
  businessIntel: Record<string, unknown>
  serviceFit: Record<string, unknown>
  pricingAnalysis: Record<string, unknown>
  fullReport: string
  overallScore: number
  aiRecommendedTier: string
  aiRecommendedMrr: number
}): Promise<{ research: LeadResearch | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { research: null, error: 'Unauthorized' }

  const {
    leadId, websiteAudit, socialAudit, businessIntel, serviceFit,
    pricingAnalysis, fullReport, overallScore, aiRecommendedTier, aiRecommendedMrr,
  } = params

  // Upsert research row — one research per lead at a time
  const { data: existing } = await supabase
    .from('lead_research')
    .select('id')
    .eq('lead_id', leadId)
    .single()

  let researchData: LeadResearch | null = null

  if (existing) {
    const { data, error } = await supabase
      .from('lead_research')
      .update({
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
      })
      .eq('lead_id', leadId)
      .select()
      .single()

    if (error) { console.error('[saveResearchResult] update:', error); return { research: null, error: 'Failed to save research' } }
    researchData = data as LeadResearch
  } else {
    const { data, error } = await supabase
      .from('lead_research')
      .insert({
        lead_id: leadId,
        website_audit: websiteAudit,
        social_audit: socialAudit,
        business_intel: businessIntel,
        service_fit: serviceFit,
        pricing_analysis: pricingAnalysis,
        full_report: fullReport,
        overall_score: overallScore,
        status: 'completed',
      })
      .select()
      .single()

    if (error) { console.error('[saveResearchResult] insert:', error); return { research: null, error: 'Failed to save research' } }
    researchData = data as LeadResearch
  }

  // Update lead with AI score + tier + mrr
  await supabase
    .from('leads')
    .update({
      ai_score: overallScore,
      ai_recommended_tier: aiRecommendedTier,
      ai_recommended_mrr: aiRecommendedMrr,
      ai_evaluation: fullReport,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  // Log activity
  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    user_id: user.id,
    type: 'research_run',
    content: `AI research completed — score: ${overallScore}/100, recommended tier: ${aiRecommendedTier}`,
  })

  return { research: researchData, error: null }
}
