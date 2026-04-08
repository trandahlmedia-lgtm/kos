import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { runResearchPipeline } from '@/lib/ai/researchPipeline'

const requestSchema = z.object({
  lead_id: z.string().uuid(),
})

/**
 * POST /api/ai/lead-research/process-one
 * Processes a single lead that was already claimed as "pending" by the batch endpoint.
 * Runs synchronously within the request lifecycle — no after() needed.
 * The client calls this sequentially for each lead in the batch.
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

  const { lead_id } = parsed.data

  // Atomically transition pending → running
  const { data: claimed } = await adminClient
    .from('lead_research')
    .update({
      status: 'running',
      updated_at: new Date().toISOString(),
    })
    .eq('lead_id', lead_id)
    .eq('status', 'pending')
    .select('id')
    .single()

  if (!claimed) {
    return NextResponse.json({ error: 'Lead not pending' }, { status: 409 })
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .single()

  if (!lead) {
    await adminClient.from('lead_research').update({
      status: 'failed',
      error_message: 'Lead not found',
      updated_at: new Date().toISOString(),
    }).eq('lead_id', lead_id)
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Process synchronously — pipeline handles its own error marking
  await runResearchPipeline(adminClient, lead_id, lead, user.id)

  return NextResponse.json({ status: 'processed', lead_id })
}
