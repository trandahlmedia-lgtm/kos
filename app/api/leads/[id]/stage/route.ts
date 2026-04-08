import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const stageSchema = z.object({
  stage: z.enum(['new', 'reached_out', 'connected', 'interested', 'proposal_sent', 'won', 'lost']),
  lost_reason: z.string().max(500).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = stageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { stage, lost_reason } = parsed.data
  const now = new Date().toISOString()

  const updates: Record<string, unknown> = {
    stage,
    stage_updated_at: now,
    updated_at: now,
  }
  if (stage === 'lost' && lost_reason) updates.lost_reason = lost_reason

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/leads/[id]/stage]', error)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }

  // Log activity
  await supabase.from('lead_activities').insert({
    lead_id: id,
    user_id: user.id,
    type: 'stage_change',
    content: `Stage updated to ${stage}`,
    metadata: { to_stage: stage, ...(lost_reason ? { lost_reason } : {}) },
  })

  return NextResponse.json({ lead: data })
}
