import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { generateCaptionsForPost } from '@/lib/ai/generateCaptions'

const requestSchema = z.object({
  postId: z.string().uuid(),
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

  const result = await generateCaptionsForPost(supabase, parsed.data.postId, user.id)

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
