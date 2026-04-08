import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type StepStatus = 'complete' | 'running' | 'pending'

/**
 * GET /api/ai/lead-research/batch-status?lead_ids=id1,id2,id3
 * Returns per-lead status, step progress, and business name for batch tracking.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rawIds = searchParams.get('lead_ids')
  if (!rawIds) return NextResponse.json({ error: 'lead_ids required' }, { status: 400 })

  const leadIds = rawIds.split(',').filter((id) => UUID_RE.test(id)).slice(0, 50)
  if (leadIds.length === 0) return NextResponse.json({ error: 'No valid lead_ids' }, { status: 400 })

  // Fetch research rows — select step fields to infer completion (small JSON, acceptable at this scale)
  const { data: researchRows } = await supabase
    .from('lead_research')
    .select('lead_id, status, error_message, overall_score, website_audit, social_audit, business_intel, service_fit, pricing_analysis, full_report')
    .in('lead_id', leadIds)

  // Fetch lead names
  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name')
    .in('id', leadIds)

  const nameMap = new Map((leads ?? []).map((l) => [l.id, l.business_name]))
  const researchMap = new Map((researchRows ?? []).map((r) => [r.lead_id, r]))

  const items = leadIds.map((id) => {
    const research = researchMap.get(id)
    const businessName = nameMap.get(id) ?? 'Unknown'

    if (!research) {
      return { lead_id: id, business_name: businessName, status: 'none' as const, steps: {} }
    }

    const steps: Record<string, StepStatus> = {
      website_audit: research.website_audit ? 'complete' : 'pending',
      social_audit: research.social_audit ? 'complete' : 'pending',
      business_intel: research.business_intel ? 'complete' : 'pending',
      service_fit: research.service_fit ? 'complete' : 'pending',
      pricing_analysis: research.pricing_analysis ? 'complete' : 'pending',
      synthesis: research.full_report ? 'complete' : 'pending',
    }

    // Mark the currently running step
    if (research.status === 'running') {
      const stepKeys = ['website_audit', 'social_audit', 'business_intel', 'service_fit', 'pricing_analysis', 'synthesis'] as const
      for (const key of stepKeys) {
        if (steps[key] === 'pending') {
          steps[key] = 'running'
          break
        }
      }
    }

    return {
      lead_id: id,
      business_name: businessName,
      status: research.status as string,
      error_message: research.error_message,
      overall_score: research.overall_score,
      steps,
    }
  })

  return NextResponse.json({ items })
}
