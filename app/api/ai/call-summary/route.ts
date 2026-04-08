import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { CALL_SUMMARY_SYSTEM, buildCallSummaryPrompt } from '@/lib/ai/prompts/callSummary'

const requestSchema = z.object({
  lead_id: z.string().uuid(),
  call_notes: z.string().min(10).max(20000),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_call_summary'),
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

  const { lead_id, call_notes } = parsed.data
  const startedAt = Date.now()
  const model = MODEL.fast

  try {
    const prompt = buildCallSummaryPrompt(call_notes)
    const result = await callClaude({ model, system: CALL_SUMMARY_SYSTEM, prompt, maxTokens: 1024 })

    let summaryData: Record<string, unknown>
    try {
      summaryData = JSON.parse(extractJSON(result.content)) as Record<string, unknown>
    } catch {
      console.error('[call-summary] Parse error:', result.content.substring(0, 200))
      return NextResponse.json({ error: 'AI returned invalid content' }, { status: 500 })
    }

    // Save summary back to lead
    const summaryText = JSON.stringify(summaryData)
    await supabase
      .from('leads')
      .update({
        call_notes,
        ai_call_summary: summaryText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id)

    await logAIRun({
      supabase,
      userId: user.id,
      leadId: lead_id,
      workflow: 'lead_research',
      model,
      usage: result.usage,
      outputSummary: `Call summary for lead ${lead_id}`,
      startedAt,
    })

    return NextResponse.json({ summary: summaryData })
  } catch (err) {
    console.error('[call-summary] Unexpected error:', err)
    await logAIRun({
      supabase,
      userId: user.id,
      leadId: lead_id,
      workflow: 'lead_research',
      model,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      startedAt,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
