'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X } from 'lucide-react'

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/mov',
]
const MAX_IMAGE_BYTES = 20 * 1024 * 1024   // 20 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024  // 100 MB

interface CreativeUploaderProps {
  postId: string
  clientId: string
  existingThumbnailUrl?: string
  onUploaded?: (thumbnailUrl: string) => void
}

export function CreativeUploader({
  postId,
  clientId,
  existingThumbnailUrl,
  onUploaded,
}: CreativeUploaderProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [localThumbnail, setLocalThumbnail] = useState<string | null>(null)

  const thumbnailUrl = localThumbnail ?? existingThumbnailUrl

  async function handleFile(file: File) {
    setUploadError('')

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, or MOV.')
      return
    }

    const isVideo = file.type.startsWith('video/')
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    if (file.size > maxBytes) {
      setUploadError(`File too large. Max ${isVideo ? '100 MB' : '20 MB'} for ${isVideo ? 'video' : 'images'}.`)
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('postId', postId)
      formData.append('clientId', clientId)

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Upload failed.')
      }

      const data = await res.json() as { thumbnailUrl?: string; originalUrl?: string }
      // Prefer thumbnail; fall back to original if Sharp skipped or failed
      const previewUrl = data.thumbnailUrl ?? data.originalUrl
      if (previewUrl) {
        setLocalThumbnail(previewUrl)
        onUploaded?.(previewUrl)
      }

      router.refresh()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so the same file can be re-selected if needed
    e.target.value = ''
  }

  function clearCreative() {
    setLocalThumbnail(null)
  }

  if (thumbnailUrl) {
    return (
      <div className="relative w-full rounded overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a]">
        <img
          src={thumbnailUrl}
          alt="Creative"
          className="w-full object-cover max-h-[240px]"
        />
        <button
          onClick={clearCreative}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
          title="Remove preview"
        >
          <X size={12} />
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-2 right-2 text-[10px] bg-black/70 text-white px-2 py-1 rounded hover:bg-black transition-colors"
        >
          Replace
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`w-full h-32 rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
          dragging
            ? 'border-[#E8732A] bg-[#E8732A]/5'
            : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#555555]'
        }`}
      >
        {uploading ? (
          <p className="text-xs text-[#999999]">Uploading…</p>
        ) : (
          <>
            <Upload size={16} className="text-[#555555] mb-1.5" />
            <p className="text-xs text-[#555555]">Drop file here or click to upload</p>
            <p className="text-[10px] text-[#333333] mt-0.5">JPEG · PNG · WebP · GIF · MP4 · MOV</p>
          </>
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-red-400 mt-1.5">{uploadError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
