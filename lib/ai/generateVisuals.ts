import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { callClaude, extractJSON, MODEL } from '@/lib/ai/claude'
import { logAIRun } from '@/lib/ai/costTracker'
import { getVisualPlanSystem, buildVisualPlanUser, getVisualPlanDirectSystem, buildVisualPlanDirectUser } from '@/lib/ai/prompts/visualPlan'
import { deriveColorPalette, renderCarousel, renderStatic, renderStorySequence, renderCarouselDirect, renderStaticDirect, renderStorySequenceDirect, renderStaticStoryDirect } from '@/lib/visual-engine'
import { adminClient } from '@/lib/supabase/admin'
import type { PostVisual, CreativeBrief, FontPair, BrandLogos, DirectSlide } from '@/types'

// ---------------------------------------------------------------------------
// Helpers — extract brand color and font pair from claude_md
// ---------------------------------------------------------------------------

function extractBrandColors(claudeMd: string): { primary: string; accent?: string } {
  // Try to parse a markdown table with color rows (e.g. "| Primary (Navy) | #1B3A5C |")
  const tableColorPattern = /\|\s*([^|]+?)\s*\|\s*(#[0-9A-Fa-f]{6})\s*\|/g
  const tableColors: Array<{ label: string; hex: string }> = []
  let tableMatch: RegExpExecArray | null
  while ((tableMatch = tableColorPattern.exec(claudeMd)) !== null) {
    tableColors.push({ label: tableMatch[1].trim().toLowerCase(), hex: tableMatch[2] })
  }

  if (tableColors.length >= 2) {
    const primaryRow = tableColors.find(c =>
      /primary|dominant|main|brand\b/.test(c.label)
    )
    const accentRow = tableColors.find(c =>
      /accent|cta|highlight|action|secondary/.test(c.label)
    )
    if (primaryRow) {
      return { primary: primaryRow.hex, accent: accentRow?.hex }
    }
  }

  // Fallback: line-based extraction for "Primary: #hex" or "Accent: #hex" patterns
  const primaryMatch = claudeMd.match(/(?:primary|dominant|main\s+brand)\s*(?:\([^)]*\))?\s*[:\s|]*?(#[0-9A-Fa-f]{6})/i)
  const accentMatch = claudeMd.match(/(?:accent|cta|highlight|action)\s*(?:\([^)]*\))?\s*[:\s|]*?(#[0-9A-Fa-f]{6})/i)

  if (primaryMatch) {
    return { primary: primaryMatch[1], accent: accentMatch?.[1] }
  }

  // Final fallback: any hex color found
  const anyHexMatch = claudeMd.match(/#[0-9A-Fa-f]{6}/)
  return { primary: anyHexMatch?.[0] ?? '#E8732A' }
}

function extractFontPair(claudeMd: string): FontPair {
  // Try markdown table rows first (e.g. "| Headline / Interactive | Montserrat |")
  const fontTablePattern = /\|\s*([^|]+?)\s*\|\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*\|/g
  const fontRows: Array<{ label: string; font: string }> = []
  let fontMatch: RegExpExecArray | null
  while ((fontMatch = fontTablePattern.exec(claudeMd)) !== null) {
    fontRows.push({ label: fontMatch[1].trim().toLowerCase(), font: fontMatch[2].trim() })
  }

  let heading: string | undefined
  let body: string | undefined

  if (fontRows.length >= 1) {
    const headRow = fontRows.find(r =>
      /heading|headline|display|title|interactive/.test(r.label)
    )
    const bodyRow = fontRows.find(r =>
      /body|paragraph|text|copy/.test(r.label)
    )
    heading = headRow?.font
    body = bodyRow?.font
  }

  // Fallback: "Heading font: Montserrat" style
  if (!heading) {
    const headingMatch = claudeMd.match(/(?:heading|headline|display|title)\s*(?:font)?[:\s]*?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)
    heading = headingMatch?.[1]
  }
  if (!body) {
    const bodyMatch = claudeMd.match(/(?:body|paragraph|text)\s*(?:font)?[:\s]*?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)
    body = bodyMatch?.[1]
  }

  return {
    heading: heading ?? 'Montserrat',
    body: body ?? 'Open Sans',
  }
}

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------

export async function generateVisualForPost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  notes?: string
): Promise<PostVisual> {
  // 1. Fetch post + client data
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, client_id, platform, content_type, format, placement, angle, ai_reasoning, clients(name, claude_md, platforms, brand_logos, instagram_handle, website)')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    throw new Error('Post not found')
  }

  const clientData = Array.isArray(post.clients) ? post.clients[0] : post.clients
  const claudeMd = (clientData as { claude_md?: string } | null)?.claude_md ?? ''
  const clientName = (clientData as { name?: string } | null)?.name ?? 'Client'
  const brandLogos = (clientData as { brand_logos?: BrandLogos | null } | null)?.brand_logos ?? null
  const instagramHandle = (clientData as { instagram_handle?: string } | null)?.instagram_handle ?? undefined
  const websiteUrl = (clientData as { website?: string } | null)?.website ?? undefined

  if (!claudeMd.trim()) {
    throw new Error('No brand document on file for this client')
  }

  // 2. Extract brand colors and font pair
  const { primary, accent } = extractBrandColors(claudeMd)
  const fontPair = extractFontPair(claudeMd)

  // 3. Derive color palette
  const palette = deriveColorPalette(primary, accent)

  // 4. Query recent layout recipes for anti-repetition
  const { data: recentVisuals } = await supabase
    .from('post_visuals')
    .select('layout_recipe')
    .eq('client_id', post.client_id as string)
    .order('created_at', { ascending: false })
    .limit(5)

  const recentRecipes: string[][] = (recentVisuals ?? [])
    .map((v: { layout_recipe: string[] | null }) => v.layout_recipe)
    .filter((r): r is string[] => Array.isArray(r))

  // 5. Build the angle from post data
  const postAngle = post.angle ?? post.ai_reasoning ?? 'General brand awareness post'
  const format = (post.format ?? 'carousel') as 'carousel' | 'static' | 'story_sequence' | 'static_story'
  const placement = (post.placement ?? 'feed') as 'feed' | 'story'
  const contentType = (post.content_type ?? 'trust') as string

  // 6. Call Claude API
  const startedAt = Date.now()
  const model = MODEL.default

  try {
    const prompt = buildVisualPlanUser({
      clientName,
      claudeMd,
      postAngle,
      contentType,
      format,
      placement,
      userNotes: notes,
      recentRecipes,
    })

    const result = await callClaude({
      model,
      system: getVisualPlanSystem(format),
      prompt,
      maxTokens: 4096,
    })

    // 7. Parse JSON response
    let brief: CreativeBrief
    try {
      const jsonText = extractJSON(result.content)
      brief = JSON.parse(jsonText) as CreativeBrief
    } catch {
      console.error('[generateVisuals] Failed to parse Claude response:', result.content.slice(0, 500))
      throw new Error('AI returned invalid visual brief. Please try again.')
    }

    if (!brief?.slides?.length) {
      throw new Error('AI returned an empty visual brief. Please try again.')
    }

    // 8. Generate signed logo URLs for whichever variants exist
    const logoUrls: BrandLogos = {}
    if (brandLogos) {
      const keys = ['icon', 'wordmark_dark', 'wordmark_light', 'full'] as const
      for (const key of keys) {
        const path = brandLogos[key]
        if (path) {
          const { data: signedData } = await adminClient.storage
            .from('kos-media')
            .createSignedUrl(path, 3600)
          if (signedData?.signedUrl) {
            logoUrls[key] = signedData.signedUrl
          }
        }
      }
    }

    // 9. Render HTML — carousel, static, or story_sequence based on format
    const renderParams = { brief, palette, fontPair, clientName, instagramHandle, logoUrls, websiteUrl }
    const generatedHtml =
      format === 'static' || format === 'static_story'
        ? renderStatic(renderParams)
        : format === 'story_sequence'
        ? renderStorySequence(renderParams)
        : renderCarousel(renderParams)

    // 9. Collect all photo slots across slides
    const allPhotoSlots = brief.slides
      .flatMap((slide) => slide.photo_slots ?? [])

    // 10. Build the layout recipe array
    const layoutRecipe = brief.slides.map((s) => s.layout_type)

    // 11. Determine export status based on photo slots
    const exportStatus = allPhotoSlots.length > 0 ? 'photos_needed' : 'ready_to_export'

    // 12. Delete any existing visual for this post (one visual per post)
    await supabase
      .from('post_visuals')
      .delete()
      .eq('post_id', postId)

    // 13. Insert into post_visuals
    const { data: visual, error: insertError } = await supabase
      .from('post_visuals')
      .insert({
        post_id: postId,
        client_id: post.client_id,
        generated_html: generatedHtml,
        creative_brief: brief,
        layout_recipe: layoutRecipe,
        slide_count: brief.slides.length,
        color_palette: palette,
        photo_slots: allPhotoSlots,
        font_pair: fontPair,
        export_status: exportStatus,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (insertError || !visual) {
      console.error('[generateVisuals] insert failed:', insertError)
      throw new Error('Failed to save visual. Please try again.')
    }

    // 14. Promote post status if it has a caption and visual is complete (no missing photos)
    if (exportStatus === 'ready_to_export') {
      const { data: currentPost } = await supabase
        .from('posts')
        .select('status, caption')
        .eq('id', postId)
        .single()

      if (currentPost?.caption?.trim() && currentPost.status === 'in_production') {
        await supabase
          .from('posts')
          .update({ status: 'ready', updated_at: new Date().toISOString() })
          .eq('id', postId)
      }
    }

    // 15. Log AI run
    await logAIRun({
      supabase,
      userId,
      workflow: 'visual_plan',
      model,
      clientId: post.client_id as string,
      postId,
      usage: result.usage,
      outputSummary: `Generated ${brief.slides.length}-slide ${format} visual for post ${postId}`,
      startedAt,
    })

    return visual as PostVisual
  } catch (err) {
    // Log failed run (only if we haven't already thrown a user-friendly error)
    const isUserError = err instanceof Error && (
      err.message.includes('AI returned') ||
      err.message.includes('Failed to save') ||
      err.message === 'Post not found' ||
      err.message.includes('brand document')
    )

    await logAIRun({
      supabase,
      userId,
      workflow: 'visual_plan',
      model,
      clientId: post.client_id as string,
      postId,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      startedAt,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    })

    if (isUserError) throw err
    throw new Error('Unexpected error generating visual. Please try again.')
  }
}

// ---------------------------------------------------------------------------
// Direct generation mode — Claude produces full slide HTML, not layout JSON
// ---------------------------------------------------------------------------

interface DirectBriefResponse {
  slides: DirectSlide[]
  caption: string
  hashtags: string
  cta_text: string
}

export async function generateVisualDirectForPost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  notes?: string
): Promise<PostVisual> {
  // 1. Fetch post + client data (same as generateVisualForPost)
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, client_id, platform, content_type, format, placement, angle, ai_reasoning, clients(name, claude_md, platforms, brand_logos, instagram_handle, website)')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    throw new Error('Post not found')
  }

  const clientData = Array.isArray(post.clients) ? post.clients[0] : post.clients
  const claudeMd = (clientData as { claude_md?: string } | null)?.claude_md ?? ''
  const clientName = (clientData as { name?: string } | null)?.name ?? 'Client'
  const brandLogos = (clientData as { brand_logos?: BrandLogos | null } | null)?.brand_logos ?? null
  const instagramHandle = (clientData as { instagram_handle?: string } | null)?.instagram_handle ?? undefined
  const websiteUrl = (clientData as { website?: string } | null)?.website ?? undefined

  if (!claudeMd.trim()) {
    throw new Error('No brand document on file for this client')
  }

  // 2. Extract brand colors and font pair
  const { primary, accent } = extractBrandColors(claudeMd)
  const fontPair = extractFontPair(claudeMd)

  // 3. Derive color palette
  const palette = deriveColorPalette(primary, accent)

  // 4. Query recent visuals for anti-repetition descriptions
  const format = (post.format ?? 'carousel') as 'carousel' | 'static' | 'story_sequence' | 'static_story'

  const { data: recentVisuals } = await supabase
    .from('post_visuals')
    .select('notes, layout_recipe, slide_count')
    .eq('client_id', post.client_id as string)
    .order('created_at', { ascending: false })
    .limit(3)

  const recentDescriptions: string[] = (recentVisuals ?? []).map(
    (v: { notes: string | null; layout_recipe: string[] | null; slide_count: number | null }) => {
      if (v.notes?.trim()) return v.notes.trim()
      const count = v.slide_count ?? v.layout_recipe?.length ?? 7
      return `${count}-slide ${format} visual`
    }
  )

  // 5. Build angle from post data
  const postAngle = post.angle ?? post.ai_reasoning ?? 'General brand awareness post'
  const placement = (post.placement ?? 'feed') as 'feed' | 'story'
  const contentType = (post.content_type ?? 'trust') as string

  // 6. Generate signed logo URLs — moved up so the prompt can reference them
  const logoUrls: BrandLogos = {}
  if (brandLogos) {
    const keys = ['icon', 'wordmark_dark', 'wordmark_light', 'full'] as const
    for (const key of keys) {
      const path = brandLogos[key]
      if (path) {
        const { data: signedData } = await adminClient.storage
          .from('kos-media')
          .createSignedUrl(path, 3600)
        if (signedData?.signedUrl) {
          logoUrls[key] = signedData.signedUrl
        }
      }
    }
  }

  const startedAt = Date.now()
  const model = MODEL.default

  try {
    // 7. Call Claude with direct-mode system + user prompts
    const prompt = buildVisualPlanDirectUser({
      clientName,
      claudeMd,
      postAngle,
      contentType,
      format,
      placement,
      palette,
      fontPair,
      logoUrls,
      userNotes: notes,
      recentDescriptions,
    })

    const result = await callClaude({
      model,
      system: getVisualPlanDirectSystem(format),
      prompt,
      maxTokens: 8192,
    })

    // 8. Parse JSON response
    if (!result.content) {
      throw new Error('Claude returned empty response — try regenerating')
    }
    let directBrief: DirectBriefResponse
    try {
      const jsonText = extractJSON(result.content)
      directBrief = JSON.parse(jsonText) as DirectBriefResponse
    } catch {
      console.error('[generateVisualsDirect] Failed to parse Claude response:', result.content.slice(0, 500))
      throw new Error('AI returned invalid visual brief. Please try again.')
    }

    // 9. Validate
    if (!directBrief?.slides?.length) {
      throw new Error('AI returned an empty visual brief. Please try again.')
    }

    const emptySlide = directBrief.slides.find((s) => !s.inner_html?.trim())
    if (emptySlide) {
      throw new Error('AI returned a slide with empty content. Please try again.')
    }

    // Ensure last slide always has has_arrow: false (defensive fix)
    directBrief.slides[directBrief.slides.length - 1].has_arrow = false

    // 10. Render HTML using direct-mode renderers
    const renderParams = {
      slides: directBrief.slides,
      palette,
      fontPair,
      clientName,
      caption: directBrief.caption ?? '',
      hashtags: directBrief.hashtags ?? '',
      instagramHandle,
      logoUrls,
      websiteUrl,
    }

    const generatedHtml =
      format === 'static'
        ? renderStaticDirect(renderParams)
        : format === 'static_story'
        ? renderStaticStoryDirect(renderParams)
        : format === 'story_sequence'
        ? renderStorySequenceDirect(renderParams)
        : renderCarouselDirect(renderParams)

    // 11. Collect photo slot IDs from all slides
    const allPhotoSlotIds = directBrief.slides.flatMap((s) => s.photo_slots ?? [])
    const allPhotoSlots = allPhotoSlotIds.map((slotId) => ({
      slot_id: slotId,
      label: slotId,
      description: '',
      has_photo: false,
    }))

    // 12. Build layout recipe that signals direct mode
    const layoutRecipe = directBrief.slides.map((_, i) => `direct_slide_${i}`)

    // 13. Determine export status
    const exportStatus = allPhotoSlots.length > 0 ? 'photos_needed' : 'ready_to_export'

    // 14. Delete any existing visual for this post
    await supabase
      .from('post_visuals')
      .delete()
      .eq('post_id', postId)

    // 15. Build a minimal CreativeBrief for backward compatibility
    const brief: CreativeBrief = {
      slides: directBrief.slides.map((s) => ({
        index: s.index,
        layout_type: 'direct',
        background: s.background,
        heading: '',
        has_arrow: s.has_arrow,
        logo_placement: s.logo_placement,
        photo_slots: allPhotoSlots.filter((ps) => s.photo_slots.includes(ps.slot_id)),
      })),
      caption: directBrief.caption ?? '',
      hashtags: directBrief.hashtags ?? '',
      cta_text: directBrief.cta_text ?? '',
    }

    // 16. Insert into post_visuals
    const { data: visual, error: insertError } = await supabase
      .from('post_visuals')
      .insert({
        post_id: postId,
        client_id: post.client_id,
        generated_html: generatedHtml,
        creative_brief: brief,
        layout_recipe: layoutRecipe,
        slide_count: directBrief.slides.length,
        color_palette: palette,
        photo_slots: allPhotoSlots,
        font_pair: fontPair,
        export_status: exportStatus,
        notes: notes ?? null,
        slide_html: directBrief.slides,
        generation_mode: 'direct',
      })
      .select()
      .single()

    if (insertError || !visual) {
      console.error('[generateVisualsDirect] insert failed:', insertError)
      throw new Error('Failed to save visual. Please try again.')
    }

    // 17. Promote post status if visual is complete and post has a caption
    if (exportStatus === 'ready_to_export') {
      const { data: currentPost } = await supabase
        .from('posts')
        .select('status, caption')
        .eq('id', postId)
        .single()

      if (currentPost?.caption?.trim() && currentPost.status === 'in_production') {
        await supabase
          .from('posts')
          .update({ status: 'ready', updated_at: new Date().toISOString() })
          .eq('id', postId)
      }
    }

    // 18. Log AI run
    await logAIRun({
      supabase,
      userId,
      workflow: 'visual_plan_direct',
      model,
      clientId: post.client_id as string,
      postId,
      usage: result.usage,
      outputSummary: `Generated ${directBrief.slides.length}-slide ${format} direct visual for post ${postId}`,
      startedAt,
    })

    return visual as PostVisual
  } catch (err) {
    const isUserError = err instanceof Error && (
      err.message.includes('AI returned') ||
      err.message.includes('Failed to save') ||
      err.message === 'Post not found' ||
      err.message.includes('brand document') ||
      err.message.includes('empty content') ||
      err.message.includes('Claude returned empty response')
    )

    await logAIRun({
      supabase,
      userId,
      workflow: 'visual_plan_direct',
      model,
      clientId: post.client_id as string,
      postId,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      startedAt,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    })

    if (isUserError) throw err
    throw new Error('Unexpected error generating visual. Please try again.')
  }
}
