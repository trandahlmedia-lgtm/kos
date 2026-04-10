'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, ImageIcon } from 'lucide-react'
import { updateClientBrandAssets, getSignedLogoUrls } from '@/lib/actions/clients'
import type { BrandLogos } from '@/types'

const ACCEPTED_TYPES = ['image/png', 'image/svg+xml', 'image/webp']
const ACCEPTED_EXTENSIONS = '.png,.svg,.webp'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

type LogoVariant = keyof BrandLogos

interface SlotConfig {
  key: LogoVariant
  label: string
  description: string
}

const LOGO_SLOTS: SlotConfig[] = [
  { key: 'icon', label: 'Icon', description: 'Square logomark — IG avatar, small placements' },
  { key: 'wordmark_dark', label: 'Wordmark Dark', description: 'Text logo on dark/transparent bg — dark slides' },
  { key: 'wordmark_light', label: 'Wordmark Light', description: 'Text logo on light/transparent bg — light slides' },
  { key: 'full', label: 'Full Logo', description: 'Icon + text — CTA slides, hero slides' },
]

interface BrandAssetsPanelProps {
  clientId: string
  brandLogos: BrandLogos | null
  instagramHandle: string | null
}

export function BrandAssetsPanel({
  clientId,
  brandLogos: initialLogos,
  instagramHandle: initialHandle,
}: BrandAssetsPanelProps) {
  const router = useRouter()

  // Storage paths (what gets saved to DB)
  const [paths, setPaths] = useState<BrandLogos>(initialLogos ?? {})
  // Signed URLs for display
  const [previewUrls, setPreviewUrls] = useState<BrandLogos>({})
  const [igHandle, setIgHandle] = useState(initialHandle ?? '')
  const [uploadingSlot, setUploadingSlot] = useState<LogoVariant | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRefs = useRef<Record<LogoVariant, HTMLInputElement | null>>({
    icon: null,
    wordmark_dark: null,
    wordmark_light: null,
    full: null,
  })

  // Load signed URLs on mount if paths exist
  const loadPreviews = useCallback(async () => {
    const hasAnyPath = Object.values(initialLogos ?? {}).some(Boolean)
    if (!hasAnyPath) return
    try {
      const urls = await getSignedLogoUrls(clientId)
      setPreviewUrls(urls)
    } catch {
      // Non-fatal — previews just won't show
    }
  }, [clientId, initialLogos])

  useEffect(() => {
    loadPreviews()
  }, [loadPreviews])

  async function handleFile(file: File, variant: LogoVariant) {
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

    setUploadingSlot(variant)

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
        storagePath?: string
      }

      if (data.storagePath) {
        setPaths((prev) => ({ ...prev, [variant]: data.storagePath }))
      }

      const previewUrl = data.thumbnailUrl ?? data.originalUrl
      if (previewUrl) {
        setPreviewUrls((prev) => ({ ...prev, [variant]: previewUrl }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingSlot(null)
    }
  }

  function handleRemove(variant: LogoVariant) {
    setPaths((prev) => {
      const next = { ...prev }
      delete next[variant]
      return next
    })
    setPreviewUrls((prev) => {
      const next = { ...prev }
      delete next[variant]
      return next
    })
    setSuccess('')
  }

  async function handleSave() {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const logosToSave = Object.keys(paths).length > 0 ? paths : null
      await updateClientBrandAssets(clientId, {
        brand_logos: logosToSave,
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
      {/* Logo slots */}
      <div className="grid grid-cols-2 gap-4">
        {LOGO_SLOTS.map((slot) => {
          const preview = previewUrls[slot.key]
          const isUploading = uploadingSlot === slot.key

          return (
            <div
              key={slot.key}
              className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4"
            >
              <p className="text-xs text-[#555555] uppercase tracking-wider mb-1">
                {slot.label}
              </p>
              <p className="text-[10px] text-[#333333] mb-3">
                {slot.description}
              </p>

              {preview ? (
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-md border border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                    <img
                      src={preview}
                      alt={slot.label}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(slot.key)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#999999] hover:text-white flex items-center justify-center transition-colors"
                    title={`Remove ${slot.label}`}
                  >
                    <X size={12} />
                  </button>
                  <button
                    onClick={() => inputRefs.current[slot.key]?.click()}
                    className="mt-2 text-xs text-[#555555] hover:text-white transition-colors"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file) handleFile(file, slot.key)
                  }}
                  onClick={() => !isUploading && inputRefs.current[slot.key]?.click()}
                  className="w-full h-28 rounded border-2 border-dashed border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#555555] flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                  {isUploading ? (
                    <p className="text-xs text-[#999999]">Uploading...</p>
                  ) : (
                    <>
                      <Upload size={14} className="text-[#555555] mb-1" />
                      <p className="text-[10px] text-[#555555]">
                        Drop or click to upload
                      </p>
                    </>
                  )}
                </div>
              )}

              <input
                ref={(el) => { inputRefs.current[slot.key] = el }}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file, slot.key)
                  e.target.value = ''
                }}
              />
            </div>
          )
        })}
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
