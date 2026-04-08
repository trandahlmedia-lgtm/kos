import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/ai/lead-research/running
 * Returns list of lead_ids that currently have research status 'running'.
 * Used by the UI to show "Researching..." indicators.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('lead_research')
    .select('lead_id, status')
    .in('status', ['running', 'pending'])

  const rows = data ?? []
  return NextResponse.json({
    lead_ids: rows.map((r) => r.lead_id),
    running_ids: rows.filter((r) => r.status === 'running').map((r) => r.lead_id),
    pending_ids: rows.filter((r) => r.status === 'pending').map((r) => r.lead_id),
  })
}
