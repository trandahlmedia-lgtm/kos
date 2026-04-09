import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

type StepStatus = 'complete' | 'running' | 'pending'

function hasContent(val: unknown): boolean {
  if (!val) return false
  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val as Record<string, unknown>).length === 0) return false
  return true
}

/**
 * GET /api/ai/lead-research/active-status
 * Returns ALL leads with research status running/pending — unified progress for batch + individual.
 * Same response shape as batch-status so the UI component can share logic.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: researchRows } = await supabase
    .from('lead_research')
    .select('lead_id, status, error_message, overall_score, updated_at, website_audit, social_audit, business_intel, service_fit, pricing_analysis')
    .in('status', ['running', 'pending'])

  if (!researchRows || researchRows.length === 0) {
    return NextResponse.json({ items: [] })
  }

  // Recover stale leads: only 'running' rows stuck for >3 min get auto-failed.
  // 'pending' rows are legitimately queued in batch processing and may wait longer.
  const STALE_MS = 3 * 60 * 1000
  const now = Date.now()
  const activeRows = []
  for (const row of researchRows) {
    if (row.status === 'running' && row.updated_at) {
      const age = now - new Date(row.updated_at as string).getTime()
      if (age > STALE_MS) {
        await adminClient.from('lead_research').update({
          status: 'failed',
          error_message: 'Timed out — processing was interrupted',
          updated_at: new Date().toISOString(),
        }).eq('lead_id', row.lead_id).eq('status', 'running')
        continue
      }
    }
    activeRows.push(row)
  }

  if (activeRows.length === 0) {
    return NextResponse.json({ items: [] })
  }

  const leadIds = activeRows.map((r) => r.lead_id)

  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name')
    .in('id', leadIds)

  const nameMap = new Map((leads ?? []).map((l) => [l.id, l.business_name]))

  const items = activeRows.map((research) => {
    const businessName = nameMap.get(research.lead_id) ?? 'Unknown'

    const steps: Record<string, StepStatus> = {
      website_audit: hasContent(research.website_audit) ? 'complete' : 'pending',
      social_audit: hasContent(research.social_audit) ? 'complete' : 'pending',
      business_intel: hasContent(research.business_intel) ? 'complete' : 'pending',
      service_fit: hasContent(research.service_fit) ? 'complete' : 'pending',
      pricing_analysis: hasContent(research.pricing_analysis) ? 'complete' : 'pending',
      synthesis: 'pending',
    }

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
      lead_id: research.lead_id,
      business_name: businessName,
      status: research.status as string,
      error_message: research.error_message,
      overall_score: research.overall_score,
      steps,
    }
  })

  return NextResponse.json({ items })
}
