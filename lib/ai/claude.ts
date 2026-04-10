import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const MODEL = {
  default: 'claude-sonnet-4-6',
  fast: 'claude-haiku-4-5-20251001',
  powerful: 'claude-opus-4-6',
}

export const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-haiku-4-5-20251001': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
  'claude-opus-4-6': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
}

// ---------------------------------------------------------------------------
// Standard (non-streaming) call
// ---------------------------------------------------------------------------

export async function callClaude(params: {
  model?: string
  system: string
  prompt: string
  maxTokens?: number
}) {
  const model = params.model ?? MODEL.default
  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: [{ role: 'user', content: params.prompt }],
  })

  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  const pricing = PRICING[model]
  const costUsd = pricing
    ? inputTokens * pricing.input + outputTokens * pricing.output
    : 0

  if (response.content.length === 0 || response.content[0].type !== 'text') {
    throw new Error('Claude returned empty response — try regenerating')
  }

  return {
    content: response.content[0].text,
    usage: { inputTokens, outputTokens, costUsd },
    model,
  }
}

// ---------------------------------------------------------------------------
// Streaming call (available for future use)
// ---------------------------------------------------------------------------

export async function streamClaude(params: {
  model?: string
  system: string
  prompt: string
  maxTokens?: number
}) {
  const model = params.model ?? MODEL.default
  return client.messages.stream({
    model,
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: [{ role: 'user', content: params.prompt }],
  })
}

// ---------------------------------------------------------------------------
// JSON extraction helper
// Claude sometimes wraps JSON in markdown code fences — strip them.
// ---------------------------------------------------------------------------

export function extractJSON(text: string): string {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // Find the first top-level JSON object or array
  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) return objMatch[0].trim()

  const arrMatch = text.match(/\[[\s\S]*\]/)
  if (arrMatch) return arrMatch[0].trim()

  return text.trim()
}