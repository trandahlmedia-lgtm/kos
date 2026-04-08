import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { WEEKLY_PLAN_SYSTEM, buildWeeklyPlanPrompt } from '@/lib/ai/prompts/weeklyPlan'
import type { Platform, ContentType } from '@/types'

const requestSchema = z.object({
  clientId: z.string().uuid(),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

interface PlannedPost {
  scheduled_date: string
  scheduled_time: string
  platform: Platform
  cross_post_platforms: Platform[]
  content_type: ContentType
  format: 'static' | 'reel' | 'story'
  angle: string
  caption_brief: string
  ai_reasoning: string
}

const VALID_PLATFORMS = new Set<string>(['instagram', 'facebook', 'linkedin', 'tiktok', 'nextdoor'])
const VALID_CONTENT_TYPES = new Set<string>([
  'offer', 'seasonal', 'trust', 'differentiator',
  'social_proof', 'education', 'bts', 'before_after',
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: AI is a heavy action
  const rl = await checkRateLimit(
    userAction(user.id, 'ai_weekly_plan'),
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

  const { clientId, weekStartDate } = parsed.data

  // Fetch client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, claude_md, platforms, posting_frequency')
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
    const prompt = buildWeeklyPlanPrompt({
      clientName: client.name,
      claudeMd: client.claude_md,
      weekStartDate,
      platforms,
      postCount: 5,
    })

    const result = await callClaude({
      model,
      system: WEEKLY_PLAN_SYSTEM,
      prompt,
      maxTokens: 4096,
    })

    // Parse and validate JSON response
    let planData: { posts: PlannedPost[] }
    try {
      const jsonText = extractJSON(result.content)
      planData = JSON.parse(jsonText) as { posts: PlannedPost[] }
    } catch {
      console.error('[weekly-plan] Failed to parse Claude response:', result.content.substring(0, 500))
      return NextResponse.json({ error: 'AI returned invalid content. Please try again.' }, { status: 500 })
    }

    if (!Array.isArray(planData?.posts) || planData.posts.length === 0) {
      return NextResponse.json({ error: 'AI returned an empty plan. Please try again.' }, { status: 500 })
    }

    // Create post records in DB
    const postInserts = planData.posts
      .filter((p) => {
        // Validate required fields
        return (
          typeof p.scheduled_date === 'string' &&
          VALID_PLATFORMS.has(p.platform) &&
          VALID_CONTENT_TYPES.has(p.content_type)
        )
      })
      .map((p) => ({
        client_id: clientId,
        platform: p.platform as Platform,
        content_type: p.content_type as ContentType,
        status: 'slot' as const,
        scheduled_date: p.scheduled_date,
        scheduled_time: p.scheduled_time ?? null,
        ai_reasoning: [
          p.ai_reasoning,
          p.angle ? `Angle: ${p.angle}` : null,
          p.caption_brief ? `Brief: ${p.caption_brief}` : null,
          p.cross_post_platforms?.length > 1
            ? `Cross-post: ${p.cross_post_platforms.join(', ')}`
            : null,
        ]
          .filter(Boolean)
          .join(' | '),
        created_by: user.id,
      }))

    if (postInserts.length === 0) {
      return NextResponse.json({ error: 'No valid posts in AI response. Please try again.' }, { status: 500 })
    }

    const { data: createdPosts, error: insertError } = await supabase
      .from('posts')
      .insert(postInserts)
      .select('id')

    if (insertError || !createdPosts) {
      console.error('[weekly-plan] DB insert failed:', insertError)
      return NextResponse.json({ error: 'Failed to save posts. Please try again.' }, { status: 500 })
    }

    const postIds = createdPosts.map((p: { id: string }) => p.id)

    // Log AI run
    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'content_calendar',
      model,
      clientId,
      usage: result.usage,
      outputSummary: `Generated ${postIds.length} posts for week of ${weekStartDate}`,
      startedAt,
    })

    return NextResponse.json({
      postIds,
      count: postIds.length,
      weekStartDate,
    })
  } catch (err) {
    console.error('[weekly-plan] Unexpected error:', err)

    await logAIRun({
      supabase,
      userId: user.id,
      workflow: 'content_calendar',
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
