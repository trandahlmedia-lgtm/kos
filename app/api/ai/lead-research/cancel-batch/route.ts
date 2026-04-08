import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const requestSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1).max(50),
})

/**
 * POST /api/ai/lead-research/cancel-batch
 * Resets pending/running lead_research rows to failed so they can be re-researched.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { lead_ids } = parsed.data

  // Verify caller can access these leads via RLS-scoped client
  const { data: accessibleLeads } = await supabase
    .from('leads')
    .select('id')
    .in('id', lead_ids)
  const accessibleIds = (accessibleLeads ?? []).map((l) => l.id)
  if (accessibleIds.length === 0) {
    return NextResponse.json({ error: 'No accessible leads found' }, { status: 404 })
  }

  const { error } = await adminClient
    .from('lead_research')
    .update({
      status: 'failed',
      error_message: 'Cancelled by user',
      updated_at: new Date().toISOString(),
    })
    .in('lead_id', accessibleIds)
    .in('status', ['pending', 'running'])

  if (error) {
    return NextResponse.json({ error: 'Failed to cancel research' }, { status: 500 })
  }

  return NextResponse.json({ status: 'cancelled', count: accessibleIds.length })
}
