import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { BRAND_DOC_SYSTEM, buildBrandDocPrompt } from '@/lib/ai/prompts/brandDoc'

const requestSchema = z.object({
  clientId: z.string().uuid().optional(),
  input: z.object({
    companyName: z.string().min(1).max(200),
    industry: z.string().min(1).max(100),
    services: z.string().min(1).max(1000),
    serviceArea: z.string().min(1).max(200),
    audience: z.string().min(1).max(500),
    voiceTone: z.string().min(1).max(500),
    differentiators: z.string().min(1).max(500),
    competitors: z.string().max(500).default(''),
    phone: z.string().max(30).optional(),
    email: z.string().max(100).optional(),
    website: z.string().max(200).optional(),
    socialLinks: z.string().max(500).optional(),
    additionalNotes: z.string().max(1000).optional(),
  }),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_brand_doc'),
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

  const { clientId, input } = parsed.data
  const startedAt = Date.now()
  const model = MODEL.default

  try {
    const prompt = buildBrandDocPrompt(input)

    const result = await callClaude({
      model,
      system: BRAND_DOC_SYSTEM,
      prompt,
      maxTokens: 4096,
    })

    // Log AI run
    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'generate_claude_md',
      model,
      clientId,
      usage: result.usage,
      outputSummary: `Generated brand doc for ${input.companyName}`,
      startedAt,
    })

    return NextResponse.json({ content: result.content })
  } catch (err) {
    console.error('[brand-doc] Unexpected error:', err)

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'generate_claude_md',
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
