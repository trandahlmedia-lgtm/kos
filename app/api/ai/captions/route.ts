import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { generateCaptionsForPost, generateCaptionsForPlatforms } from '@/lib/ai/generateCaptions'
import type { Platform } from '@/types'

const requestSchema = z.object({
  postId: z.string().uuid(),
  angle: z.string().max(500).optional(),
  contentType: z.string().max(100).optional(),
  format: z.string().max(50).optional(),
  platforms: z.array(z.string().max(50)).min(1).max(5).optional(),
  platform: z.string().max(50).optional(),
  specificContext: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_captions'),
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
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
  }

  const { postId, angle, contentType, format, platforms, platform, specificContext } = parsed.data

  // Multi-platform path
  if (platforms && platforms.length > 0) {
    const result = await generateCaptionsForPlatforms(supabase, postId, user.id, platforms as Platform[], {
      angle,
      contentType,
      format,
      specificContext,
    })

    if (!result.success) {
      const status = result.error === 'Post not found' ? 404
        : result.error?.includes('brand document') ? 422
        : 500
      return NextResponse.json({ error: result.error ?? 'Something went wrong.' }, { status })
    }

    return NextResponse.json({ platformCaptions: result.platformCaptions })
  }

  // Single-platform fallback (backward compat)
  const result = await generateCaptionsForPost(supabase, postId, user.id, {
    angle,
    contentType,
    format,
    platform,
    specificContext,
  })

  if (!result.success) {
    const status = result.error === 'Post not found' ? 404
      : result.error?.includes('brand document') ? 422
      : 500
    return NextResponse.json({ error: result.error ?? 'Something went wrong.' }, { status })
  }

  return NextResponse.json({
    captions: result.captions,
    best: result.best,
    alternatives: result.alternatives,
  })
}
