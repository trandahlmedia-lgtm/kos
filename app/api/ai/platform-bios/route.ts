import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { PLATFORM_BIOS_SYSTEM, buildPlatformBiosPrompt } from '@/lib/ai/prompts/platformBios'
import type { Platform } from '@/types'

const requestSchema = z.object({
  clientId: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_platform_bios'),
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
    return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
  }

  const { clientId } = parsed.data

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, claude_md, platforms')
    .eq('id', clientId)
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

  const platforms = (client.platforms ?? []) as Platform[]
  if (platforms.length === 0) {
    return NextResponse.json(
      { error: 'This client has no active platforms configured.' },
      { status: 422 }
    )
  }

  const startedAt = Date.now()
  const model = MODEL.default

  try {
    const prompt = buildPlatformBiosPrompt({
      clientName: client.name,
      claudeMd: client.claude_md,
      platforms,
    })

    const result = await callClaude({
      model,
      system: PLATFORM_BIOS_SYSTEM,
      prompt,
      maxTokens: 2048,
    })

    let bios: Record<string, string>
    try {
      const jsonText = extractJSON(result.content)
      bios = JSON.parse(jsonText) as Record<string, string>
    } catch {
      console.error('[platform-bios] Failed to parse Claude response:', result.content.substring(0, 500))
      return NextResponse.json({ error: 'AI returned invalid content. Please try again.' }, { status: 500 })
    }

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'platform_bios',
      model,
      clientId,
      usage: result.usage,
      outputSummary: `Generated bios for ${platforms.join(', ')}`,
      startedAt,
    })

    return NextResponse.json({ bios })
  } catch (err) {
    console.error('[platform-bios] Unexpected error:', err)

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'platform_bios',
      model,
      clientId,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      startedAt,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
