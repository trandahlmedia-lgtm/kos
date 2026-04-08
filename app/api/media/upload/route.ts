import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/mov',
])
const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse FormData
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const postId = formData.get('postId') as string | null
  const clientId = formData.get('clientId') as string | null

  if (!file || !clientId) {
    return NextResponse.json({ error: 'Missing file or clientId' }, { status: 400 })
  }

  // Validate IDs are valid UUIDs before touching storage
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(clientId)) {
    return NextResponse.json({ error: 'Invalid clientId' }, { status: 400 })
  }
  if (postId && !uuidRegex.test(postId)) {
    return NextResponse.json({ error: 'Invalid postId' }, { status: 400 })
  }

  // 3. Validate MIME type
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, or MOV.' },
      { status: 422 }
    )
  }

  // 4. Validate file size
  const isVideo = file.type.startsWith('video/')
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max ${isVideo ? '100 MB' : '20 MB'}.` },
      { status: 422 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const baseName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const folder = postId
      ? `${clientId}/creatives/${postId}`
      : `${clientId}/creatives`
    const storagePath = `${folder}/${baseName}`

    // 5. Upload original to Supabase storage
    const { error: uploadError } = await adminClient.storage
      .from('kos-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[media/upload] storage upload failed:', uploadError)
      return NextResponse.json({ error: 'Storage upload failed.' }, { status: 500 })
    }

    // 6. Generate thumbnail (images only — skip video in Phase 2)
    let thumbnailPath: string | null = null

    if (!isVideo) {
      try {
        // Dynamically import Sharp so the build doesn't fail if it's not installed
        const sharp = (await import('sharp')).default
        const thumbBuffer = await sharp(buffer)
          .resize(400, null, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer()

        thumbnailPath = `${folder}/thumb_${baseName.replace(`.${ext}`, '.webp')}`

        const { error: thumbError } = await adminClient.storage
          .from('kos-media')
          .upload(thumbnailPath, thumbBuffer, {
            contentType: 'image/webp',
            upsert: true,
          })

        if (thumbError) {
          console.error('[media/upload] thumbnail upload failed:', thumbError)
          thumbnailPath = null  // non-fatal — original still uploaded
        }
      } catch (sharpErr) {
        console.error('[media/upload] Sharp processing failed (non-fatal):', sharpErr)
        thumbnailPath = null
      }
    }

    // 7. Generate signed URLs (1 hour)
    const pathsToSign = [storagePath, thumbnailPath].filter(Boolean) as string[]
    const { data: signedUrls } = await adminClient.storage
      .from('kos-media')
      .createSignedUrls(pathsToSign, 3600)

    const urlMap = Object.fromEntries(
      (signedUrls ?? []).map(({ path, signedUrl }: { path: string | null; signedUrl: string }) => [path ?? '', signedUrl])
    )

    // 8. Create media record in DB
    const { data: media, error: dbError } = await supabase
      .from('media')
      .insert({
        client_id: clientId,
        post_id: postId ?? null,
        file_name: file.name,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        media_type: isVideo ? 'video' : 'image',
        file_size_bytes: file.size,
        mime_type: file.type,
        category: 'creative',
        uploaded_by: user.id,
      })
      .select('id')
      .single()

    if (dbError || !media) {
      console.error('[media/upload] DB insert failed:', dbError)
      return NextResponse.json({ error: 'Failed to save media record.' }, { status: 500 })
    }

    // 9. Update post: set has_creative = true
    if (postId) {
      await supabase
        .from('posts')
        .update({ has_creative: true, updated_at: new Date().toISOString() })
        .eq('id', postId)
    }

    return NextResponse.json({
      mediaId: media.id,
      originalUrl: urlMap[storagePath] ?? null,
      thumbnailUrl: thumbnailPath ? (urlMap[thumbnailPath] ?? null) : null,
    })
  } catch (err) {
    console.error('[media/upload] unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
