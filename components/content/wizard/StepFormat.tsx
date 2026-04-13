'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { PostFormat, PostPlacement, Platform } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORMAT_META: Record<PostFormat, { label: string; description: string; dims: string }> = {
  carousel:       { label: 'Carousel',        description: '7-slide story arc',    dims: '1080×1350' },
  static:         { label: 'Feed Post',        description: 'Single bold image',   dims: '1080×1350' },
  story_sequence: { label: 'Story Sequence',   description: 'Multi-slide vertical', dims: '1080×1920' },
  static_story:   { label: 'Story',            description: 'Single vertical image', dims: '1080×1920' },
}

const FORMAT_PLACEMENT: Record<PostFormat, PostPlacement> = {
  carousel:       'feed',
  static:         'feed',
  story_sequence: 'story',
  static_story:   'story',
}

const FORMATS = Object.keys(FORMAT_META) as PostFormat[]

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'instagram',  label: 'Instagram' },
  { value: 'facebook',   label: 'Facebook' },
  { value: 'tiktok',     label: 'TikTok' },
  { value: 'linkedin',   label: 'LinkedIn' },
  { value: 'nextdoor',   label: 'Nextdoor' },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormatValue {
  format: PostFormat
  placement: PostPlacement
  platforms: Platform[]
}

interface StepFormatProps {
  clientId: string
  angle: string
  value: FormatValue
  onChange: (data: FormatValue) => void
}

interface ApiRecommendation {
  format: PostFormat
  placement: PostPlacement
  reasoning: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepFormat({ clientId, angle, value, onChange }: StepFormatProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reasoning, setReasoning] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function fetchRecommendation() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/ai/recommend-format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ angle, client_id: clientId }),
        })

        const data = await res.json() as ApiRecommendation & { error?: string }

        if (cancelled) return

        if (!res.ok) {
          setError(data.error ?? 'Something went wrong.')
          return
        }

        setReasoning(data.reasoning ?? '')
        onChange({
          format: data.format,
          placement: data.placement,
          platforms: value.platforms,
        })
      } catch {
        if (!cancelled) setError('Failed to connect. Check your connection and try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchRecommendation()
    return () => { cancelled = true }
    // Only run on mount — angle + clientId are stable from previous step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFormatSelect(fmt: PostFormat) {
    onChange({ ...value, format: fmt, placement: FORMAT_PLACEMENT[fmt] })
  }

  function handlePlatformToggle(p: Platform) {
    const current = value.platforms
    const next = current.includes(p)
      ? current.length > 1 ? current.filter((x) => x !== p) : current
      : [...current, p]
    onChange({ ...value, platforms: next })
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-white">How should this look?</h2>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          <div className="h-24 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] animate-pulse" />
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Loaded state */}
      {!loading && !error && (
        <>
          {/* AI recommendation card */}
          <div className="rounded-md bg-[#111111] border border-[#E8732A] px-4 py-3 flex items-start gap-3">
            <div className="mt-0.5 w-5 h-5 rounded-full bg-[#E8732A] flex items-center justify-center flex-none">
              <Check size={11} className="text-white" strokeWidth={3} />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-white text-sm font-semibold">
                {FORMAT_META[value.format]?.label ?? value.format}
              </p>
              {reasoning && (
                <p className="text-[#999999] text-xs leading-relaxed">{reasoning}</p>
              )}
            </div>
          </div>

          {/* Format picker */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[#555555] uppercase tracking-wider font-medium">Choose a different format</p>
            <div className="grid grid-cols-4 gap-2">
              {FORMATS.map((fmt) => {
                const meta = FORMAT_META[fmt]
                const isSelected = value.format === fmt
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleFormatSelect(fmt)}
                    className={`rounded-md px-3 py-3 flex flex-col gap-1 text-left border transition-colors ${
                      isSelected
                        ? 'bg-[#111111] border-[#E8732A] text-white'
                        : 'bg-[#111111] border-[#2a2a2a] text-[#999999] hover:border-[#E8732A]/50 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-semibold leading-tight">{meta.label}</span>
                    <span className="text-[10px] text-[#555555] leading-tight">{meta.description}</span>
                    <span className="text-[10px] text-[#444444] leading-tight font-mono">{meta.dims}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Platform multi-select */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[#555555] uppercase tracking-wider font-medium">
              Platforms <span className="normal-case text-[#444444]">(select all that apply)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const isSelected = value.platforms.includes(p.value)
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePlatformToggle(p.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      isSelected
                        ? 'bg-[#E8732A]/10 border-[#E8732A] text-white'
                        : 'bg-[#111111] border-[#2a2a2a] text-[#999999] hover:border-[#E8732A]/50 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
