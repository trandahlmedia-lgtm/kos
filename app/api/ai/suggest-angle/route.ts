import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { SUGGEST_ANGLE_SYSTEM, buildSuggestAnglePrompt } from '@/lib/ai/prompts/suggestAngle'
import { getUpcomingContext } from '@/lib/ai/seasonalCalendar'

const contentTypeEnum = z.enum([
  'offer', 'seasonal', 'trust', 'differentiator',
  'social_proof', 'education', 'bts', 'before_after',
])

const requestSchema = z.object({
  client_id: z.string().uuid(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  existing_angles: z.array(z.string()).default([]),
  content_type: contentTypeEnum.optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_suggest_angle'),
    LIMITS.USER_HEAVY.max,
    LIMITS.USER_HEAVY.windowS
  )
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in a minute.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { client_id, scheduled_date, existing_angles, content_type } = parsed.data

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, claude_md')
    .eq('id', client_id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  if (!client.claude_md?.trim()) {
    return NextResponse.json(
      { error: 'This client has no brand document. Add one in the client hub first.' },
      { status: 422 }
    )
  }

  const startedAt = Date.now()
  const model = MODEL.fast

  try {
    const scheduledDateObj = new Date(scheduled_date + 'T12:00:00')
    const seasonalContext = getUpcomingContext(scheduledDateObj)

    const prompt = buildSuggestAnglePrompt({
      claudeMd: client.claude_md,
      scheduledDate: scheduled_date,
      existingAngles: existing_angles,
      contentType: content_type,
      seasonalContext: seasonalContext || undefined,
    })

    const result = await callClaude({
      model,
      system: SUGGEST_ANGLE_SYSTEM,
      prompt,
      maxTokens: 256,
    })

    const angle = result.content.trim().replace(/^["']|["']$/g, '')

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'suggest_angle',
      model,
      clientId: client_id,
      usage: result.usage,
      outputSummary: `Suggested angle for ${scheduled_date}: ${angle.substring(0, 80)}`,
      startedAt,
    })

    return NextResponse.json({ angle })
  } catch (err) {
    console.error('[suggest-angle] Unexpected error:', err)

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'suggest_angle',
      model,
      clientId: client_id,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      startedAt,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
