import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { CLIENT_INTAKE_SYSTEM, buildClientIntakePrompt } from '@/lib/ai/prompts/clientIntake'
import { fetchWebsiteText } from '@/lib/ai/fetchWebsiteText'

const requestSchema = z.object({
  companyName: z.string().min(1).max(200),
  websiteUrl: z.string().url().optional().or(z.literal('')),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_client_intake'),
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

  const { companyName, websiteUrl } = parsed.data
  const startedAt = Date.now()
  const model = MODEL.default

  // Fetch website content server-side (avoids CORS)
  let websiteContent = ''
  let websiteFetchFailed = false
  if (websiteUrl) {
    websiteContent = await fetchWebsiteText(websiteUrl)
    if (!websiteContent) websiteFetchFailed = true
  }

  try {
    const prompt = buildClientIntakePrompt({
      companyName,
      websiteContent,
      websiteUrl,
    })

    const result = await callClaude({
      model,
      system: CLIENT_INTAKE_SYSTEM,
      prompt,
      maxTokens: 2048,
    })

    let intakeData: Record<string, unknown>
    try {
      const jsonText = extractJSON(result.content)
      intakeData = JSON.parse(jsonText) as Record<string, unknown>
    } catch {
      console.error('[client-intake] Failed to parse Claude response:', result.content.substring(0, 500))
      return NextResponse.json({ error: 'AI returned invalid content. Please try again.' }, { status: 500 })
    }

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'client_intake',
      model,
      usage: result.usage,
      outputSummary: `Intake analysis for ${companyName}`,
      startedAt,
    })

    return NextResponse.json({
      intake: intakeData,
      websiteFetchFailed,
    })
  } catch (err) {
    console.error('[client-intake] Unexpected error:', err)

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'content_calendar',
      model,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      startedAt,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
