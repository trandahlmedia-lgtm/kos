import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function logAIRun(params: {
  supabase: SupabaseClient
  userId: string
  workflow: string
  model: string
  clientId?: string
  leadId?: string
  postId?: string
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
  outputSummary?: string
  startedAt: number
  status?: 'completed' | 'failed'
  errorMessage?: string
}) {
  const { error } = await params.supabase.from('ai_runs').insert({
    user_id: params.userId,
    client_id: params.clientId ?? null,
    lead_id: params.leadId ?? null,
    post_id: params.postId ?? null,
    workflow: params.workflow,
    model: params.model,
    prompt_tokens: params.usage.inputTokens,
    completion_tokens: params.usage.outputTokens,
    cost_usd: params.usage.costUsd,
    status: params.status ?? 'completed',
    output_summary: params.outputSummary ?? null,
    error_message: params.errorMessage ?? null,
    duration_ms: Date.now() - params.startedAt,
  })

  if (error) {
    // Non-fatal — log but don't surface to user
    console.error('[costTracker] Failed to log AI run:', error.message)
  }
}
