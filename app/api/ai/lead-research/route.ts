import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { runResearchPipeline } from '@/lib/ai/researchPipeline'

const requestSchema = z.object({
  lead_id: z.string().uuid(),
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

  const { lead_id } = parsed.data

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const runningFields = {
    status: 'running' as const,
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

  // Atomic claim: only update if not already running
  const { data: existingRow } = await supabase
    .from('lead_research')
    .select('id, status')
    .eq('lead_id', lead_id)
    .single()

  if (existingRow?.status === 'running') {
    return NextResponse.json(
      { error: 'Research is already in progress for this lead.' },
      { status: 409 }
    )
  }

  let claimed = false
  if (existingRow) {
    // Atomic conditional update: only claim if still not running
    const { data: updated } = await supabase
      .from('lead_research')
      .update(runningFields)
      .eq('lead_id', lead_id)
      .neq('status', 'running')
      .select('id')
      .single()
    claimed = !!updated
  } else {
    const { data: inserted } = await supabase
      .from('lead_research')
      .insert({ lead_id, ...runningFields })
      .select('id')
      .single()
    claimed = !!inserted
  }

  if (!claimed) {
    return NextResponse.json(
      { error: 'Research is already in progress for this lead.' },
      { status: 409 }
    )
  }

  // Fire-and-forget: return 202, process in background
  const userId = user.id
  after(async () => {
    await runResearchPipeline(adminClient, lead_id, lead, userId)
  })

  return NextResponse.json({ status: 'started', lead_id }, { status: 202 })
}
