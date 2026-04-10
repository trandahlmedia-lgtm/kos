import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import { generateVisualForPost, generateVisualDirectForPost } from '@/lib/ai/generateVisuals'

const requestSchema = z.object({
  postId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
  mode: z.enum(['direct', 'template']).optional().default('direct'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(
    userAction(user.id, 'ai_visuals'),
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
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('. ') },
      { status: 400 }
    )
  }

  try {
    const visual = parsed.data.mode === 'template'
      ? await generateVisualForPost(supabase, parsed.data.postId, user.id, parsed.data.notes)
      : await generateVisualDirectForPost(supabase, parsed.data.postId, user.id, parsed.data.notes)

    return NextResponse.json(visual)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    const status = message === 'Post not found' ? 404
      : message.includes('brand document') ? 422
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
