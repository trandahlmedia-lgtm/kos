import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { RECOMMEND_FORMAT_SYSTEM, buildRecommendFormatPrompt } from '@/lib/ai/prompts/recommendFormat'
import type { PostFormat, PostPlacement, ContentType } from '@/types'

const requestSchema = z.object({
  angle: z.string().min(1),
  client_id: z.string().uuid(),
})

const VALID_FORMATS = new Set<string>(['carousel', 'static', 'story_sequence', 'static_story'])
const VALID_PLACEMENTS = new Set<string>(['feed', 'story'])
const VALID_CONTENT_TYPES = new Set<string>([
  'offer', 'seasonal', 'trust', 'differentiator',
  'social_proof', 'education', 'bts', 'before_after',
])

const FORMAT_PLACEMENT: Record<string, PostPlacement> = {
  carousel: 'feed',
  static: 'feed',
  story_sequence: 'story',
  static_story: 'story',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_recommend_format'),
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

  const { angle, client_id } = parsed.data

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
    const prompt = buildRecommendFormatPrompt(angle, client.claude_md)

    const result = await callClaude({
      model,
      system: RECOMMEND_FORMAT_SYSTEM,
      prompt,
      maxTokens: 256,
    })

    let recommendation: {
      format: PostFormat
      placement: PostPlacement
      content_type: ContentType
      reasoning: string
    }

    try {
      const jsonText = extractJSON(result.content)
      const raw = JSON.parse(jsonText) as Record<string, unknown>

      const format = VALID_FORMATS.has(String(raw.format)) ? String(raw.format) as PostFormat : 'static'
      const placement = VALID_PLACEMENTS.has(String(raw.placement))
        ? String(raw.placement) as PostPlacement
        : FORMAT_PLACEMENT[format]
      const content_type = VALID_CONTENT_TYPES.has(String(raw.content_type))
        ? String(raw.content_type) as ContentType
        : 'education'
      const reasoning = typeof raw.reasoning === 'string' ? raw.reasoning : ''

      // Enforce placement consistency
      recommendation = { format, placement: FORMAT_PLACEMENT[format] ?? placement, content_type, reasoning }
    } catch {
      console.error('[recommend-format] Failed to parse Claude response:', result.content.substring(0, 500))
      return NextResponse.json({ error: 'AI returned invalid content. Please try again.' }, { status: 500 })
    }

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'recommend_format',
      model,
      clientId: client_id,
      usage: result.usage,
      outputSummary: `Recommended ${recommendation.format} for angle: ${angle.substring(0, 60)}`,
      startedAt,
    })

    return NextResponse.json(recommendation)
  } catch (err) {
    console.error('[recommend-format] Unexpected error:', err)

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'recommend_format',
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
