import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

/**
 * POST /api/ai/lead-research/reset-stuck
 * Resets pending/running lead_research rows to failed for the caller's accessible leads.
 * Nuclear option for when the queue gets stuck.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Scope to caller's accessible leads via RLS
  const { data: accessibleLeads } = await supabase
    .from('leads')
    .select('id')
  const accessibleIds = (accessibleLeads ?? []).map((l) => l.id)
  if (accessibleIds.length === 0) {
    return NextResponse.json({ status: 'reset', count: 0 })
  }

  const { data, error } = await adminClient
    .from('lead_research')
    .update({
      status: 'failed',
      error_message: 'Reset by user',
      updated_at: new Date().toISOString(),
    })
    .in('lead_id', accessibleIds)
    .in('status', ['pending', 'running'])
    .select('id')

  if (error) {
    return NextResponse.json({ error: 'Failed to reset research' }, { status: 500 })
  }

  return NextResponse.json({ status: 'reset', count: data?.length ?? 0 })
}
