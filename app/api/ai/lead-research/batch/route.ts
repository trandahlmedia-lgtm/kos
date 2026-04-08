import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { runResearchPipeline } from '@/lib/ai/researchPipeline'

const requestSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1).max(50),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_lead_research'),
    LIMITS.USER_HEAVY.max,
    LIMITS.USER_HEAVY.windowS
  )
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { lead_ids } = parsed.data

  // Fetch all leads
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .in('id', lead_ids)

  if (leadsError || !leads?.length) {
    return NextResponse.json({ error: 'No leads found' }, { status: 404 })
  }

  // Atomically claim each lead — only start if not already running
  const { data: existingResearch } = await supabase
    .from('lead_research')
    .select('lead_id, status')
    .in('lead_id', lead_ids)

  const existingMap = new Map((existingResearch ?? []).map((r) => [r.lead_id, r]))

  const pendingFields = {
    status: 'pending' as const,
    error_message: null,
    website_audit: null,
    social_audit: null,
    business_intel: null,
    service_fit: null,
    pricing_analysis: null,
    full_report: null,
    overall_score: null,
    updated_at: new Date().toISOString(),
  }

  const claimedLeads: typeof leads = []
  for (const lead of leads) {
    const existing = existingMap.get(lead.id)
    if (existing?.status === 'running' || existing?.status === 'pending') continue

    let claimed = false
    if (existing) {
      const { data: updated } = await supabase
        .from('lead_research')
        .update(pendingFields)
        .eq('lead_id', lead.id)
        .not('status', 'in', '("running","pending")')
        .select('id')
        .single()
      claimed = !!updated
    } else {
      const { data: inserted } = await supabase
        .from('lead_research')
        .insert({ lead_id: lead.id, ...pendingFields })
        .select('id')
        .single()
      claimed = !!inserted
    }

    if (claimed) claimedLeads.push(lead)
  }

  if (claimedLeads.length === 0) {
    return NextResponse.json({ error: 'All selected leads already have research running' }, { status: 409 })
  }

  // Fire-and-forget: process sequentially in background (one at a time)
  const userId = user.id
  after(async () => {
    for (const lead of claimedLeads) {
      try {
        // Mark this lead as running before starting
        await adminClient.from('lead_research').update({
          status: 'running',
          updated_at: new Date().toISOString(),
        }).eq('lead_id', lead.id).eq('status', 'pending')

        await runResearchPipeline(adminClient, lead.id, lead, userId)
      } catch (err) {
        // Mark failed so the queue continues to the next lead
        console.error(`[batch-research] Unhandled error for lead ${lead.id}:`, err)
        await adminClient.from('lead_research').update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown batch error',
          updated_at: new Date().toISOString(),
        }).eq('lead_id', lead.id)
      }
    }
  })

  return NextResponse.json({
    status: 'started',
    count: claimedLeads.length,
    lead_ids: claimedLeads.map((l) => l.id),
  }, { status: 202 })
}
