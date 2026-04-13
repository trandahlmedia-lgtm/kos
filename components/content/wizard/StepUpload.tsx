'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { createPostAction } from '@/lib/actions/posts'
import type { Client, PostFormat, PostPlacement, ContentType, Platform } from '@/types'

interface StepUploadProps {
  wizardData: {
    clientId: string
    clientName: string
    scheduledDate: string
    angle: string
    format: PostFormat | ''
    placement: PostPlacement | ''
    contentType: ContentType | ''
    platforms: Platform[]
  }
  clients: Client[]
  onPostCreated: (postId: string) => void
  onCreativeUploaded: (mediaUrl: string) => void
}

export function StepUpload({ wizardData, onPostCreated, onCreativeUploaded }: StepUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasRunRef = useRef(false)

  const [postId, setPostId] = useState('')
  const [creatingPost, setCreatingPost] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  // Create the post record on mount — runs exactly once
  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    createPostAction({
      client_id: wizardData.clientId,
      platform: wizardData.platforms[0] ?? 'instagram',
      content_type: (wizardData.contentType as ContentType) || undefined,
      format: (wizardData.format as PostFormat) || 'static',
      placement: (wizardData.placement as PostPlacement) || 'feed',
      scheduled_date: wizardData.scheduledDate || undefined,
    })
      .then((id) => {
        setPostId(id)
        onPostCreated(id)
        setCreatingPost(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to set up post.')
        setCreatingPost(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — must run exactly once on mount

  async function handleFile(file: File) {
    if (!postId) return
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientId', wizardData.clientId)
      formData.append('postId', postId)
      formData.append('category', 'creative')

      const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
      const data = await res.json() as { originalUrl?: string; error?: string }

      if (!res.ok || !data.originalUrl) {
        setError(data.error ?? 'Upload failed.')
        return
      }

      setPreviewUrl(data.originalUrl)
      onCreativeUploaded(data.originalUrl)
    } catch {
      setError('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  if (creatingPost) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 size={24} className="animate-spin text-[#E8732A]" />
        <p className="text-sm text-[#999999]">Setting up your post...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center">
        <h2 className="text-white text-lg font-semibold">Upload your creative</h2>
        <p className="text-[#999999] text-sm mt-1">Upload the finished image for this post.</p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {previewUrl ? (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Creative preview"
            className="max-w-sm max-h-80 rounded-md border border-[#2a2a2a] object-contain"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-[#999999] hover:text-white transition-colors"
          >
            Replace
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`w-full max-w-sm h-52 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
            dragging
              ? 'border-[#E8732A]/50 bg-[#E8732A]/5'
              : 'border-[#2a2a2a] hover:border-[#E8732A]/30 hover:bg-[#111111]'
          }`}
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-[#E8732A]" />
          ) : (
            <>
              <Upload size={24} className="text-[#555555]" />
              <p className="text-sm text-[#555555]">Drop your creative here or click to upload</p>
              <p className="text-xs text-[#333333]">JPG, PNG, WebP</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
