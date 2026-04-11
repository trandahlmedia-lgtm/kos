import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { CAPTIONS_SYSTEM, buildCaptionsPrompt } from '@/lib/ai/prompts/captions'
import type { Platform, ContentType } from '@/types'

interface CaptionOption {
  content: string
  cta: string
  hashtags: string
}

interface CaptionResponse {
  best_caption: CaptionOption
  alternative_1: CaptionOption
  alternative_2: CaptionOption
}

export interface GenerateCaptionsResult {
  success: boolean
  error?: string
  captions?: Array<{ id: string; content: string; is_selected: boolean; is_manual: boolean }>
  best?: CaptionOption
  alternatives?: CaptionOption[]
}

interface CaptionOverrides {
  angle?: string
  contentType?: string
  format?: string
  platform?: string
  specificContext?: string
}

/**
 * Generates 3 AI captions for a post and saves them to the DB.
 * Shared by both the single-caption and batch-caption routes.
 */
export async function generateCaptionsForPost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  overrides?: CaptionOverrides
): Promise<GenerateCaptionsResult> {
  // Fetch post + client brand doc
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, client_id, platform, content_type, ai_reasoning, clients(name, claude_md)')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return { success: false, error: 'Post not found' }
  }

  const clientData = Array.isArray(post.clients) ? post.clients[0] : post.clients
  const claudeMd = (clientData as { claude_md?: string } | null)?.claude_md ?? ''
  const clientName = (clientData as { name?: string } | null)?.name ?? 'Client'

  if (!claudeMd.trim()) {
    return { success: false, error: 'No brand document on file for this client' }
  }

  // Extract angle + brief from ai_reasoning (fallback when no overrides provided)
  const reasoningParts = (post.ai_reasoning ?? '').split(' | ')
  const anglePart = reasoningParts.find((p: string) => p.startsWith('Angle: '))
  const briefPart = reasoningParts.find((p: string) => p.startsWith('Brief: '))
  const dbAngle = anglePart ? anglePart.replace('Angle: ', '') : post.ai_reasoning ?? ''
  const captionBrief = briefPart ? briefPart.replace('Brief: ', '') : 'Write an engaging caption for this post'

  // Use wizard overrides when provided — they carry live context not yet persisted to DB
  const angle = overrides?.angle?.trim() || dbAngle
  const specificContextLine = overrides?.specificContext?.trim()
    ? `Additional context to incorporate: ${overrides.specificContext.trim()}`
    : ''

  const startedAt = Date.now()
  const model = MODEL.default

  try {
    const prompt = buildCaptionsPrompt({
      clientName,
      claudeMd,
      platform: (overrides?.platform as Platform | undefined) ?? (post.platform as Platform),
      contentType: (overrides?.contentType as ContentType | undefined) ?? ((post.content_type ?? 'trust') as ContentType),
      format: (overrides?.format ?? 'static') as 'static' | 'reel' | 'story',
      angle,
      captionBrief: specificContextLine ? `${captionBrief}\n${specificContextLine}` : captionBrief,
    })

    const result = await callClaude({
      model,
      system: CAPTIONS_SYSTEM,
      prompt,
      maxTokens: 2048,
    })

    let captionData: CaptionResponse
    try {
      const jsonText = extractJSON(result.content)
      captionData = JSON.parse(jsonText) as CaptionResponse
    } catch {
      return { success: false, error: 'AI returned invalid content' }
    }

    if (!captionData?.best_caption?.content) {
      return { success: false, error: 'AI returned incomplete captions' }
    }

    // Remove old AI captions for this post
    await supabase
      .from('captions')
      .delete()
      .eq('post_id', postId)
      .eq('is_manual', false)

    // Insert 3 new caption rows
    const { data: insertedCaptions, error: captionInsertError } = await supabase
      .from('captions')
      .insert([
        { post_id: postId, content: captionData.best_caption.content, is_selected: true, is_manual: false },
        { post_id: postId, content: captionData.alternative_1.content, is_selected: false, is_manual: false },
        { post_id: postId, content: captionData.alternative_2.content, is_selected: false, is_manual: false },
      ])
      .select('id, content, is_selected, is_manual')

    if (captionInsertError || !insertedCaptions) {
      return { success: false, error: 'Failed to save captions' }
    }

    const bestCaption = insertedCaptions.find((c: { is_selected: boolean }) => c.is_selected)

    // Fetch current post status to decide whether to advance it
    const { data: currentPost } = await supabase
      .from('posts')
      .select('status')
      .eq('id', postId)
      .single()

    await supabase
      .from('posts')
      .update({
        caption: captionData.best_caption.content,
        selected_caption_id: bestCaption?.id ?? null,
        cta: captionData.best_caption.cta ?? null,
        hashtags: captionData.best_caption.hashtags ?? null,
        status: currentPost?.status === 'slot' ? 'in_production' : currentPost?.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    // Log AI run
    await logAIRun({
      supabase,
      userId,
      workflow: 'captions',
      model,
      clientId: post.client_id as string,
      postId,
      usage: result.usage,
      outputSummary: `Generated 3 captions for post ${postId}`,
      startedAt,
    })

    return {
      success: true,
      captions: insertedCaptions as Array<{ id: string; content: string; is_selected: boolean; is_manual: boolean }>,
      best: captionData.best_caption,
      alternatives: [captionData.alternative_1, captionData.alternative_2],
    }
  } catch (err) {
    await logAIRun({
      supabase,
      userId,
      workflow: 'captions',
      model,
      clientId: post.client_id as string,
      postId,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      startedAt,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    })
    return { success: false, error: 'Unexpected error generating captions' }
  }
}
