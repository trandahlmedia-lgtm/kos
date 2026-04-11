'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { type Platform, type ContentType, type PostStatus, type PostFormat } from '@/types'

// ---------------------------------------------------------------------------
// Input validation schemas
// ---------------------------------------------------------------------------

const platformEnum = z.enum(['instagram', 'facebook', 'linkedin', 'tiktok', 'nextdoor'])
const contentTypeEnum = z.enum([
  'offer', 'seasonal', 'trust', 'differentiator',
  'social_proof', 'education', 'bts', 'before_after',
])
const postStatusEnum = z.enum([
  'slot', 'in_production', 'ready', 'scheduled', 'published',
])
const postFormatEnum = z.enum(['carousel', 'static', 'story_sequence', 'static_story'])
const placementEnum = z.enum(['feed', 'story'])

const createPostSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  platform: platformEnum,
  content_type: contentTypeEnum.optional(),
  format: postFormatEnum.default('carousel'),
  placement: placementEnum.default('feed'),
  status: postStatusEnum.default('slot'),
  caption: z.string().max(5000).optional(),
  cta: z.string().max(200).trim().optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().max(30).optional().or(z.literal('').transform(() => undefined)),
  hashtags: z.string().max(500).trim().optional().or(z.literal('').transform(() => undefined)),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().or(z.literal('').transform(() => undefined)),
  assigned_to: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
})

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

// ---------------------------------------------------------------------------
// createPostAction
// ---------------------------------------------------------------------------

export async function createPostAction(input: {
  client_id: string
  platform: Platform
  content_type?: ContentType
  format?: PostFormat
  placement?: 'feed' | 'story'
  caption?: string
  cta?: string
  phone?: string
  hashtags?: string
  scheduled_date?: string
  scheduled_time?: string
  assigned_to?: string
}): Promise<string> {
  const { supabase, user } = await requireAuth()

  const parsed = createPostSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('. '))
  }

  const clean = parsed.data

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      client_id: clean.client_id,
      platform: clean.platform,
      content_type: clean.content_type ?? null,
      format: clean.format,
      placement: clean.placement,
      status: clean.status,
      caption: clean.caption ?? null,
      cta: clean.cta ?? null,
      phone: clean.phone ?? null,
      hashtags: clean.hashtags ?? null,
      scheduled_date: clean.scheduled_date ?? null,
      scheduled_time: clean.scheduled_time ?? null,
      assigned_to: clean.assigned_to ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createPostAction] insert failed:', error)
    throw new Error('Failed to create post. Please try again.')
  }

  revalidatePath('/content')
  return post.id
}

// ---------------------------------------------------------------------------
// updatePostAction
// ---------------------------------------------------------------------------

export async function updatePostAction(
  postId: string,
  input: Partial<{
    platform: Platform
    content_type: ContentType
    format: PostFormat
    placement: 'feed' | 'story'
    caption: string
    cta: string
    phone: string
    hashtags: string
    scheduled_date: string
    scheduled_time: string
    assigned_to: string
  }>
): Promise<void> {
  const { supabase } = await requireAuth()

  const idResult = z.string().uuid().safeParse(postId)
  if (!idResult.success) throw new Error('Invalid post ID')

  const parsed = createPostSchema.partial().safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('. '))
  }

  const clean = parsed.data
  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (clean.platform !== undefined) updatePayload.platform = clean.platform
  if (clean.content_type !== undefined) updatePayload.content_type = clean.content_type ?? null
  if (clean.format !== undefined) updatePayload.format = clean.format
  if (clean.caption !== undefined) updatePayload.caption = clean.caption ?? null
  if (clean.cta !== undefined) updatePayload.cta = clean.cta ?? null
  if (clean.phone !== undefined) updatePayload.phone = clean.phone ?? null
  if (clean.hashtags !== undefined) updatePayload.hashtags = clean.hashtags ?? null
  if (clean.scheduled_date !== undefined) updatePayload.scheduled_date = clean.scheduled_date ?? null
  if (clean.scheduled_time !== undefined) updatePayload.scheduled_time = clean.scheduled_time ?? null
  if (clean.assigned_to !== undefined) updatePayload.assigned_to = clean.assigned_to ?? null

  const { error } = await supabase
    .from('posts')
    .update(updatePayload)
    .eq('id', idResult.data)

  if (error) {
    console.error('[updatePostAction] update failed:', error)
    throw new Error('Failed to update post. Please try again.')
  }

  revalidatePath('/content')
}

// ---------------------------------------------------------------------------
// updatePostStatusAction
// ---------------------------------------------------------------------------

const STATUS_TIMESTAMPS: Partial<Record<PostStatus, string>> = {
  scheduled: 'scheduled_at',
  published: 'published_at',
}

export async function updatePostStatusAction(
  postId: string,
  status: PostStatus
): Promise<void> {
  const { supabase, user } = await requireAuth()

  const idResult = z.string().uuid().safeParse(postId)
  if (!idResult.success) throw new Error('Invalid post ID')

  const statusResult = postStatusEnum.safeParse(status)
  if (!statusResult.success) throw new Error('Invalid status')

  // Verify ownership via the user-authenticated client before bypassing RLS.
  // The RLS WITH CHECK on posts may block certain status transitions (e.g. slot → ready),
  // so we use adminClient for the write after explicit ownership confirmation.
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, created_by')
    .eq('id', idResult.data)
    .single()

  if (fetchError || !post) throw new Error('Post not found')
  if (post.created_by !== user.id) throw new Error('Unauthorized')

  const now = new Date().toISOString()
  const timestampField = STATUS_TIMESTAMPS[statusResult.data]
  const updatePayload: Record<string, unknown> = {
    status: statusResult.data,
    updated_at: now,
  }
  if (timestampField) updatePayload[timestampField] = now

  // Use adminClient to write — ownership already verified above.
  // Belt-and-suspenders: also filter by created_by to prevent any race condition.
  const { error } = await adminClient
    .from('posts')
    .update(updatePayload)
    .eq('id', idResult.data)
    .eq('created_by', user.id)

  if (error) {
    console.error('[updatePostStatusAction] update failed:', error)
    throw new Error('Failed to update status. Please try again.')
  }

  revalidatePath('/content')
}

// ---------------------------------------------------------------------------
// deletePostAction
// ---------------------------------------------------------------------------

export async function deletePostAction(postId: string): Promise<void> {
  const { supabase } = await requireAuth()

  const idResult = z.string().uuid().safeParse(postId)
  if (!idResult.success) throw new Error('Invalid post ID')

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', idResult.data)

  if (error) {
    console.error('[deletePostAction] delete failed:', error)
    throw new Error('Failed to delete post. Please try again.')
  }

  revalidatePath('/content')
}

// ---------------------------------------------------------------------------
// saveManualCaptionAction
// Writes the caption to the captions table, links it to the post, and
// advances status to in_production if the post is still a bare slot.
// ---------------------------------------------------------------------------

export async function saveManualCaptionAction(
  postId: string,
  content: string
): Promise<void> {
  const { supabase } = await requireAuth()

  const idResult = z.string().uuid().safeParse(postId)
  if (!idResult.success) throw new Error('Invalid post ID')

  const contentResult = z
    .string()
    .min(1, 'Caption cannot be empty')
    .max(5000)
    .safeParse(content)
  if (!contentResult.success) {
    throw new Error(contentResult.error.issues[0]?.message ?? 'Invalid caption')
  }

  // Find the existing manual caption for this post (if any)
  const { data: existing } = await supabase
    .from('captions')
    .select('id')
    .eq('post_id', idResult.data)
    .eq('is_manual', true)
    .maybeSingle()

  let captionId: string

  if (existing) {
    await supabase
      .from('captions')
      .update({ content: contentResult.data, is_selected: true })
      .eq('id', existing.id)
    captionId = existing.id
  } else {
    const { data: newCaption, error: insertError } = await supabase
      .from('captions')
      .insert({
        post_id: idResult.data,
        content: contentResult.data,
        is_selected: true,
        is_manual: true,
      })
      .select('id')
      .single()

    if (insertError || !newCaption) {
      console.error('[saveManualCaptionAction] insert failed:', insertError)
      throw new Error('Failed to save caption. Please try again.')
    }
    captionId = newCaption.id
  }

  // Deselect all other captions for this post
  await supabase
    .from('captions')
    .update({ is_selected: false })
    .eq('post_id', idResult.data)
    .neq('id', captionId)

  // Read current status and check for a complete visual to decide auto-advance
  const { data: currentPost } = await supabase
    .from('posts')
    .select('status')
    .eq('id', idResult.data)
    .single()

  // Check if the post has a visual that's ready (no missing photos)
  const { data: visual } = await supabase
    .from('post_visuals')
    .select('export_status')
    .eq('post_id', idResult.data)
    .maybeSingle()

  const hasCompleteVisual = visual && visual.export_status !== 'photos_needed'

  let newStatus = currentPost?.status
  if (newStatus === 'slot') {
    // Advance slot → in_production when first caption is saved
    newStatus = 'in_production'
  }
  if (newStatus === 'in_production' && hasCompleteVisual) {
    // Caption + complete visual → ready
    newStatus = 'ready'
  }

  await supabase
    .from('posts')
    .update({
      caption: contentResult.data,
      selected_caption_id: captionId,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', idResult.data)

  revalidatePath('/content')
}
