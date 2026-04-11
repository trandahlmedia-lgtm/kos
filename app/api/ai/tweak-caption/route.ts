import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { TWEAK_CAPTION_SYSTEM, buildTweakCaptionPrompt } from '@/lib/ai/prompts/tweakCaption'

const requestSchema = z.object({
  caption: z.string().min(1).max(5000),
  instruction: z.string().min(1).max(500),
  client_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_tweak_caption'),
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

  const { caption, instruction, client_id } = parsed.data

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, claude_md')
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
    const prompt = buildTweakCaptionPrompt(caption, instruction, client.claude_md)

    const result = await callClaude({
      model,
      system: TWEAK_CAPTION_SYSTEM,
      prompt,
      maxTokens: 1024,
    })

    const revised = result.content.trim().replace(/^["']|["']$/g, '')

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'tweak_caption',
      model,
      clientId: client_id,
      usage: result.usage,
      outputSummary: `Tweaked caption: "${instruction.substring(0, 60)}"`,
      startedAt,
    })

    return NextResponse.json({ caption: revised })
  } catch (err) {
    console.error('[tweak-caption] Unexpected error:', err)

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'tweak_caption',
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
