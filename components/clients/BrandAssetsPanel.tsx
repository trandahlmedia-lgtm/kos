'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, ImageIcon } from 'lucide-react'
import { updateClientBrandAssets } from '@/lib/actions/clients'

const ACCEPTED_TYPES = ['image/png', 'image/svg+xml', 'image/webp']
const ACCEPTED_EXTENSIONS = '.png,.svg,.webp'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

interface BrandAssetsPanelProps {
  clientId: string
  logoUrl: string | null
  instagramHandle: string | null
}

export function BrandAssetsPanel({
  clientId,
  logoUrl: initialLogoUrl,
  instagramHandle: initialHandle,
}: BrandAssetsPanelProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [igHandle, setIgHandle] = useState(initialHandle ?? '')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleFile(file: File) {
    setError('')
    setSuccess('')

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Use PNG, SVG, or WebP.')
      return
    }

    if (file.size > MAX_BYTES) {
      setError('File too large. Max 5 MB.')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientId', clientId)
      formData.append('category', 'brand_asset')

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Upload failed.')
      }

      const data = (await res.json()) as {
        originalUrl?: string
        thumbnailUrl?: string
      }

      const previewUrl = data.thumbnailUrl ?? data.originalUrl
      if (previewUrl) {
        setLogoUrl(previewUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
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
    e.target.value = ''
  }

  async function handleSave() {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await updateClientBrandAssets(clientId, {
        logo_url: logoUrl ?? undefined,
        instagram_handle: igHandle || undefined,
      })
      setSuccess('Brand assets saved.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo section */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-5">
        <p className="text-xs text-[#555555] uppercase tracking-wider mb-3">
          Client Logo
        </p>

        {logoUrl ? (
          <div className="relative inline-block">
            <div className="w-40 h-40 rounded-md border border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
              <img
                src={logoUrl}
                alt="Client logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <button
              onClick={() => {
                setLogoUrl(null)
                setSuccess('')
              }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#999999] hover:text-white flex items-center justify-center transition-colors"
              title="Remove logo"
            >
              <X size={12} />
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-2 text-xs text-[#555555] hover:text-white transition-colors"
            >
              Replace
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={`w-full h-36 rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragging
                ? 'border-[#E8732A] bg-[#E8732A]/5'
                : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#555555]'
            }`}
          >
            {uploading ? (
              <p className="text-xs text-[#999999]">Uploading...</p>
            ) : (
              <>
                <Upload size={16} className="text-[#555555] mb-1.5" />
                <p className="text-xs text-[#555555]">
                  Drop logo here or click to upload
                </p>
                <p className="text-[10px] text-[#333333] mt-0.5">
                  PNG, SVG, or WebP - Max 5 MB
                </p>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {/* Instagram handle */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-5">
        <label className="text-xs text-[#555555] uppercase tracking-wider mb-3 block">
          Instagram Handle
        </label>
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-[#555555] shrink-0" />
          <div className="flex items-center bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 w-full max-w-xs focus-within:border-[#555555] transition-colors">
            <span className="text-sm text-[#555555] mr-0.5">@</span>
            <input
              type="text"
              value={igHandle}
              onChange={(e) => setIgHandle(e.target.value)}
              placeholder="username"
              maxLength={30}
              className="bg-transparent text-sm text-white placeholder-[#333333] outline-none flex-1"
            />
          </div>
        </div>
      </div>

      {/* Save + feedback */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded-md bg-[#E8732A] hover:bg-[#d4621f] text-white disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Brand Assets'}
        </button>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}
      </div>
    </div>
  )
}
