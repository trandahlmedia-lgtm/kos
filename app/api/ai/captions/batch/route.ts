import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { generateCaptionsForPost } from '@/lib/ai/generateCaptions'

const requestSchema = z.object({
  postIds: z.array(z.string().uuid()).min(1).max(20),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check rate limit once for the whole batch
  const rl = await checkRateLimit(
    userAction(user.id, 'ai_captions_batch'),
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

  const { postIds } = parsed.data

  // Process sequentially to stay within Claude rate limits
  const results: { postId: string; success: boolean; error?: string }[] = []

  for (const postId of postIds) {
    const result = await generateCaptionsForPost(supabase, postId, user.id)
    results.push({
      postId,
      success: result.success,
      error: result.error,
    })
  }

  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return NextResponse.json({ results, succeeded, failed })
}
