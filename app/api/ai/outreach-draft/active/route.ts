import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ActiveDraft {
  lead_id: string
  business_name: string
  status: 'drafting' | 'done'
}

/**
 * GET /api/ai/outreach-draft/active
 * Returns leads with outreach emails currently being drafted (placeholder rows with empty subject).
 * Also returns recently completed drafts (subject filled, created within last 10s) for brief "Done" display.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find placeholder rows: emails with empty subject = drafting in progress
  const { data: emails } = await supabase
    .from('outreach_emails')
    .select('lead_id, subject, created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!emails || emails.length === 0) {
    return NextResponse.json({ items: [] })
  }

  // Group by lead_id
  const byLead = new Map<string, { hasEmpty: boolean; latestCreated: string }>()
  for (const email of emails) {
    const existing = byLead.get(email.lead_id)
    if (!existing) {
      byLead.set(email.lead_id, {
        hasEmpty: email.subject === '',
        latestCreated: email.created_at,
      })
    } else {
      if (email.subject === '') existing.hasEmpty = true
      if (email.created_at > existing.latestCreated) existing.latestCreated = email.created_at
    }
  }

  // Only include leads with empty-subject emails (actively drafting)
  // Or leads with all subjects filled but created in last 10s (just completed)
  const now = Date.now()
  const DONE_WINDOW_MS = 10_000
  const draftingLeadIds: string[] = []
  const doneLeadIds: string[] = []

  for (const [leadId, info] of byLead) {
    if (info.hasEmpty) {
      draftingLeadIds.push(leadId)
    } else {
      const age = now - new Date(info.latestCreated).getTime()
      if (age < DONE_WINDOW_MS) {
        doneLeadIds.push(leadId)
      }
    }
  }

  const allLeadIds = [...draftingLeadIds, ...doneLeadIds]
  if (allLeadIds.length === 0) {
    return NextResponse.json({ items: [] })
  }

  // Fetch lead names
  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name')
    .in('id', allLeadIds)

  const nameMap = new Map((leads ?? []).map((l) => [l.id, l.business_name]))
  const draftingSet = new Set(draftingLeadIds)

  const items: ActiveDraft[] = allLeadIds.map((id) => ({
    lead_id: id,
    business_name: nameMap.get(id) ?? 'Unknown',
    status: draftingSet.has(id) ? 'drafting' : 'done',
  }))

  return NextResponse.json({ items })
}
