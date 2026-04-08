import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/ai/lead-research/status?lead_id=xxx
 * Returns the current research status and which steps are complete (inferred from non-null fields).
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('lead_id')
  if (!leadId || !UUID_RE.test(leadId)) return NextResponse.json({ error: 'Valid lead_id required' }, { status: 400 })

  const { data: research } = await supabase
    .from('lead_research')
    .select('status, error_message, website_audit, social_audit, business_intel, service_fit, pricing_analysis, full_report, overall_score')
    .eq('lead_id', leadId)
    .single()

  if (!research) {
    return NextResponse.json({ status: 'none', steps: {} })
  }

  type StepStatus = 'complete' | 'running' | 'pending'

  // Infer step completion from non-null fields
  const steps: Record<string, StepStatus> = {
    website_audit: research.website_audit ? 'complete' : 'pending',
    social_audit: research.social_audit ? 'complete' : 'pending',
    business_intel: research.business_intel ? 'complete' : 'pending',
    service_fit: research.service_fit ? 'complete' : 'pending',
    pricing_analysis: research.pricing_analysis ? 'complete' : 'pending',
    synthesis: research.full_report ? 'complete' : 'pending',
  }

  // Figure out which step is currently running
  if (research.status === 'running') {
    const stepKeys = ['website_audit', 'social_audit', 'business_intel', 'service_fit', 'pricing_analysis', 'synthesis'] as const
    for (const key of stepKeys) {
      if (steps[key] === 'pending') {
        steps[key] = 'running'
        break
      }
    }
  }

  return NextResponse.json({
    status: research.status,
    error_message: research.error_message,
    overall_score: research.overall_score,
    steps,
  })
}
