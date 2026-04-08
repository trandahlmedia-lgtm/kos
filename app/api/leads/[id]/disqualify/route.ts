import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const disqualifySchema = z.object({
  reason: z.string().min(1).max(500),
})

export async function POST(
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

  const parsed = disqualifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { reason } = parsed.data
  const now = new Date().toISOString()

  // 1. Update lead: stage → lost, heat_level → cut, set lost_reason
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .update({
      stage: 'lost',
      lost_reason: reason,
      heat_level: 'cut',
      stage_updated_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single()

  if (leadError || !lead) {
    console.error('[POST /api/leads/[id]/disqualify]', leadError)
    return NextResponse.json({ error: 'Failed to disqualify lead' }, { status: 500 })
  }

  // 2-5: Side-effect mutations — log errors but don't fail the request
  // (the lead is already marked disqualified; these are best-effort cleanup)
  const warnings: string[] = []

  const { error: seqError } = await supabase
    .from('outreach_sequences')
    .update({ status: 'completed', updated_at: now })
    .eq('lead_id', id)
    .eq('status', 'active')
  if (seqError) {
    console.error('[disqualify] failed to complete sequences:', seqError)
    warnings.push('Failed to complete outreach sequences')
  }

  const { error: emailError } = await supabase
    .from('outreach_emails')
    .update({ status: 'cancelled', updated_at: now })
    .eq('lead_id', id)
    .in('status', ['draft', 'queued'])
  if (emailError) {
    console.error('[disqualify] failed to cancel emails:', emailError)
    warnings.push('Failed to cancel outreach emails')
  }

  const leadEmail = (lead as { email?: string | null }).email
  if (leadEmail) {
    const { error: optOutError } = await supabase
      .from('email_opt_outs')
      .upsert({ email: leadEmail.toLowerCase(), opted_out_at: now }, { onConflict: 'email' })
    if (optOutError) {
      console.error('[disqualify] failed to add opt-out:', optOutError)
      warnings.push('Failed to add email opt-out')
    }
  }

  const { error: activityError } = await supabase.from('lead_activities').insert({
    lead_id: id,
    user_id: user.id,
    type: 'stage_change',
    content: `Lead disqualified: ${reason}`,
    metadata: { action: 'disqualify', reason },
  })
  if (activityError) {
    console.error('[disqualify] failed to log activity:', activityError)
  }

  return NextResponse.json({ lead, warnings })
}
