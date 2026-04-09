import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const now = new Date().toISOString()

  // 1. Get the lead first (need email + state validation)
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('email, stage, heat_level')
    .eq('id', id)
    .single()

  if (fetchError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // State validation: only re-qualify disqualified leads
  if (!(lead.stage === 'lost' && lead.heat_level === 'cut')) {
    return NextResponse.json({ error: 'Lead is not disqualified' }, { status: 400 })
  }

  // 2. Reset lead: stage → new, clear lost_reason, heat_level → null
  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update({
      stage: 'new',
      lost_reason: null,
      heat_level: null,
      stage_updated_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[POST /api/leads/[id]/requalify]', updateError)
    return NextResponse.json({ error: 'Failed to re-qualify lead' }, { status: 500 })
  }

  // 3. Remove email from opt-outs — only if:
  //    a) No other disqualified lead shares this email
  //    b) The opt-out was added by disqualify (not a public unsubscribe)
  const leadEmail = (lead as { email?: string | null }).email
  if (leadEmail) {
    const emailLower = leadEmail.toLowerCase()

    // Check if any other disqualified lead shares this email (case-insensitive)
    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .ilike('email', emailLower)
      .eq('stage', 'lost')
      .eq('heat_level', 'cut')
      .neq('id', id)

    if ((count ?? 0) === 0) {
      // Only remove opt-outs that were added by disqualify, not public unsubscribes
      const { error: optOutError } = await supabase
        .from('email_opt_outs')
        .delete()
        .eq('email', emailLower)
        .eq('source', 'disqualify')
      if (optOutError) {
        console.error('[requalify] failed to remove opt-out:', optOutError)
      }
    }
  }

  // 4. Log activity
  const { error: activityError } = await supabase.from('lead_activities').insert({
    lead_id: id,
    user_id: user.id,
    type: 'stage_change',
    content: 'Lead re-qualified — moved back to New',
    metadata: { action: 'requalify' },
  })
  if (activityError) {
    console.error('[requalify] failed to log activity:', activityError)
  }

  return NextResponse.json({ lead: updated })
}
