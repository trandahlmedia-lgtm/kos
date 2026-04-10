'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateVisualDirectForPost } from '@/lib/ai/generateVisuals'
import type { PostVisual, DirectSlide } from '@/types'

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
// generateVisualAction
// ---------------------------------------------------------------------------

export async function generateVisualAction(
  postId: string,
  notes?: string
): Promise<PostVisual> {
  const { supabase, user } = await requireAuth()

  const idResult = z.string().uuid().safeParse(postId)
  if (!idResult.success) throw new Error('Invalid post ID')

  const notesResult = z.string().max(1000).optional().safeParse(notes)
  if (!notesResult.success) throw new Error('Notes too long (max 1000 characters)')

  const visual = await generateVisualDirectForPost(
    supabase,
    idResult.data,
    user.id,
    notesResult.data
  )

  revalidatePath('/content')
  return visual
}

// ---------------------------------------------------------------------------
// getVisualForPost
// ---------------------------------------------------------------------------

export async function getVisualForPost(
  postId: string
): Promise<PostVisual | null> {
  const { supabase } = await requireAuth()

  const idResult = z.string().uuid().safeParse(postId)
  if (!idResult.success) throw new Error('Invalid post ID')

  const { data, error } = await supabase
    .from('post_visuals')
    .select()
    .eq('post_id', idResult.data)
    .maybeSingle()

  if (error) {
    console.error('[getVisualForPost] query failed:', error)
    throw new Error('Failed to fetch visual')
  }

  return (data as PostVisual) ?? null
}

// ---------------------------------------------------------------------------
// deleteVisualAction
// ---------------------------------------------------------------------------

export async function deleteVisualAction(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAuth()

    const idResult = z.string().uuid().safeParse(postId)
    if (!idResult.success) throw new Error('Invalid post ID')

    // Delete the visual
    const { error: deleteError } = await supabase
      .from('post_visuals')
      .delete()
      .eq('post_id', idResult.data)

    if (deleteError) {
      console.error('[deleteVisualAction] delete failed:', deleteError)
      throw new Error('Failed to delete visual')
    }

    // Reset post status back to in_production
    const { error: updateError } = await supabase
      .from('posts')
      .update({ status: 'in_production' })
      .eq('id', idResult.data)

    if (updateError) {
      console.error('[deleteVisualAction] update failed:', updateError)
      throw new Error('Failed to reset post status')
    }

    revalidatePath('/content')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// updateVisualHtmlAction
// ---------------------------------------------------------------------------

export async function updateVisualHtmlAction(
  postId: string,
  slideHtml: DirectSlide[],
  generatedHtml: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAuth()

    const idResult = z.string().uuid().safeParse(postId)
    if (!idResult.success) throw new Error('Invalid post ID')

    const { error } = await supabase
      .from('post_visuals')
      .update({
        slide_html: slideHtml,
        generated_html: generatedHtml,
        updated_at: new Date().toISOString(),
      })
      .eq('post_id', idResult.data)

    if (error) {
      console.error('[updateVisualHtmlAction] update failed:', error)
      throw new Error('Failed to save visual edits')
    }

    revalidatePath('/content')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// updatePhotoSlot
// ---------------------------------------------------------------------------

export async function updatePhotoSlot(
  visualId: string,
  slotId: string,
  base64Data: string,
  mimeType: string
): Promise<PostVisual> {
  const { supabase } = await requireAuth()

  const visualIdResult = z.string().uuid().safeParse(visualId)
  if (!visualIdResult.success) throw new Error('Invalid visual ID')

  const slotIdResult = z.string().min(1).safeParse(slotId)
  if (!slotIdResult.success) throw new Error('Invalid slot ID')

  const mimeResult = z.enum(['image/jpeg', 'image/png', 'image/webp']).safeParse(mimeType)
  if (!mimeResult.success) throw new Error('Unsupported image type. Use JPEG, PNG, or WebP.')

  // Fetch current visual
  const { data: visual, error: fetchError } = await supabase
    .from('post_visuals')
    .select()
    .eq('id', visualIdResult.data)
    .single()

  if (fetchError || !visual) {
    throw new Error('Visual not found')
  }

  // Update the matching photo slot
  const slots = (visual.photo_slots ?? []) as Array<{
    slot_id: string
    label: string
    description: string
    has_photo: boolean
    base64_data?: string
    mime_type?: string
  }>

  const slotIndex = slots.findIndex((s) => s.slot_id === slotIdResult.data)
  if (slotIndex === -1) throw new Error('Photo slot not found')

  slots[slotIndex] = {
    ...slots[slotIndex],
    has_photo: true,
    base64_data: base64Data,
    mime_type: mimeResult.data,
  }

  // Check if all photo slots now have photos
  const allFilled = slots.every((s) => s.has_photo)
  const exportStatus = allFilled ? 'ready_to_export' : 'photos_needed'

  const { data: updated, error: updateError } = await supabase
    .from('post_visuals')
    .update({
      photo_slots: slots,
      export_status: exportStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', visualIdResult.data)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[updatePhotoSlot] update failed:', updateError)
    throw new Error('Failed to update photo slot')
  }

  revalidatePath('/content')
  return updated as PostVisual
}
