'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type Platform, type ContentType, type PostFormat, type PostPlacement } from '@/types'

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  nextdoor: 'Nextdoor',
}

type PlatformCaption = { content: string; cta: string; hashtags: string }

interface StepCaptionProps {
  postId: string
  clientId: string
  platforms: Platform[]
  contentType: ContentType
  angle: string
  format: PostFormat
  placement?: PostPlacement
  onCaptionsReady: (captions: Partial<Record<Platform, string>>) => void
}

export function StepCaption({
  postId,
  clientId,
  platforms,
  contentType,
  angle,
  format,
  onCaptionsReady,
}: StepCaptionProps) {
  const [captions, setCaptions] = useState<Partial<Record<Platform, PlatformCaption>>>({})
  const [activePlatform, setActivePlatform] = useState<Platform>(platforms[0])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [specificContext, setSpecificContext] = useState('')
  const [tweakInstruction, setTweakInstruction] = useState('')
  const [tweaking, setTweaking] = useState(false)
  const [tweakError, setTweakError] = useState('')

  // Notify parent whenever captions state changes
  useEffect(() => {
    const contentMap: Partial<Record<Platform, string>> = {}
    for (const [p, cap] of Object.entries(captions)) {
      if (cap?.content) contentMap[p as Platform] = cap.content
    }
    if (Object.keys(contentMap).length > 0) {
      onCaptionsReady(contentMap)
    }
  }, [captions, onCaptionsReady])

  const generateCaptions = useCallback(async (contextOverride?: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          angle,
          contentType,
          format,
          platforms,
          specificContext: contextOverride ?? specificContext,
        }),
      })
      const data = await res.json() as {
        platformCaptions?: Partial<Record<Platform, PlatformCaption>>
        error?: string
      }
      if (!res.ok || !data.platformCaptions) {
        setError(data.error ?? 'Failed to generate captions.')
        return
      }
      setCaptions(data.platformCaptions)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [postId, angle, contentType, format, platforms, specificContext])

  // Auto-generate on mount
  useEffect(() => {
    void generateCaptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateCaption(platform: Platform, content: string) {
    setCaptions((prev) => ({
      ...prev,
      [platform]: { ...(prev[platform] ?? { cta: '', hashtags: '' }), content },
    }))
  }

  async function handleTweak() {
    if (!tweakInstruction.trim()) return
    const currentCaption = captions[activePlatform]?.content ?? ''
    setTweaking(true)
    setTweakError('')
    try {
      const res = await fetch('/api/ai/tweak-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: currentCaption, instruction: tweakInstruction, client_id: clientId }),
      })
      const data = await res.json() as { caption?: string; error?: string }
      if (!res.ok || !data.caption) {
        setTweakError(data.error ?? 'Failed to tweak caption.')
        return
      }
      updateCaption(activePlatform, data.caption)
      setTweakInstruction('')
    } catch {
      setTweakError('Network error. Please try again.')
    } finally {
      setTweaking(false)
    }
  }

  function handleRegenerate() {
    setCaptions({})
    void generateCaptions()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 size={24} className="text-[#E8732A] animate-spin" />
        <p className="text-[#999999] text-sm">Writing your captions...</p>
      </div>
    )
  }

  if (error && Object.keys(captions).length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-red-400 text-sm">{error}</p>
        <Button
          onClick={() => void generateCaptions()}
          className="bg-[#1a1a1a] hover:bg-[#222222] text-white border border-[#2a2a2a] text-sm h-9"
        >
          Try Again
        </Button>
      </div>
    )
  }

  const activeCaption = captions[activePlatform]

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-white">
        {platforms.length > 1 ? 'Your captions' : 'Your caption'}
      </h2>

      {/* Optional: specific context for the AI */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[#555555] uppercase tracking-wider font-medium">
          Anything specific to mention? <span className="normal-case text-[#444444]">(optional)</span>
        </label>
        <input
          type="text"
          value={specificContext}
          onChange={(e) => setSpecificContext(e.target.value)}
          placeholder='e.g. "mention the spring discount" or "reference the before/after photos"'
          className="w-full bg-[#111111] border border-[#2a2a2a] rounded-md text-white text-sm px-3 h-9 placeholder:text-[#444444] focus:outline-none focus:border-[#E8732A] transition-colors"
        />
      </div>

      {/* Platform tabs — only shown when multiple platforms selected */}
      {platforms.length > 1 && (
        <div className="flex gap-0 border-b border-[#2a2a2a]">
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setActivePlatform(p); setTweakInstruction(''); setTweakError('') }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activePlatform === p
                  ? 'border-[#E8732A] text-white'
                  : 'border-transparent text-[#555555] hover:text-[#999999]'
              }`}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      )}

      {/* Editable caption textarea */}
      <textarea
        value={activeCaption?.content ?? ''}
        onChange={(e) => updateCaption(activePlatform, e.target.value)}
        className="w-full bg-[#111111] border border-[#2a2a2a] rounded-md text-white text-sm p-4 resize-none focus:outline-none focus:border-[#E8732A] transition-colors"
        style={{ minHeight: '200px' }}
        placeholder="Caption will appear here..."
      />

      {/* Tweak section */}
      <div className="flex gap-2">
        <input
          type="text"
          value={tweakInstruction}
          onChange={(e) => setTweakInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !tweaking) void handleTweak()
          }}
          placeholder='Tell AI how to adjust it... (e.g., "shorter", "add a question hook", "more urgent")'
          className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-md text-white text-sm px-3 h-9 placeholder:text-[#555555] focus:outline-none focus:border-[#E8732A] transition-colors"
        />
        <Button
          onClick={() => void handleTweak()}
          disabled={tweaking || !tweakInstruction.trim()}
          className="bg-[#1a1a1a] hover:bg-[#222222] text-white border border-[#2a2a2a] text-sm h-9 px-4 disabled:opacity-40 shrink-0"
        >
          {tweaking ? <Loader2 size={14} className="animate-spin" /> : 'Tweak'}
        </Button>
      </div>

      {tweakError && (
        <p className="text-red-400 text-xs -mt-2">{tweakError}</p>
      )}

      {/* Regenerate all from scratch */}
      <Button
        variant="ghost"
        onClick={handleRegenerate}
        className="self-start text-[#555555] hover:text-[#999999] hover:bg-transparent text-sm h-8 px-0 gap-1.5"
      >
        <RefreshCw size={13} />
        Regenerate from Scratch
      </Button>

      {/* CTA and hashtags for active platform */}
      {(activeCaption?.cta || activeCaption?.hashtags) && (
        <div className="flex flex-col gap-1.5 pt-3 border-t border-[#1a1a1a]">
          {activeCaption?.cta && (
            <p className="text-xs text-[#555555]">
              <span className="text-[#333333] mr-1">CTA:</span>{activeCaption.cta}
            </p>
          )}
          {activeCaption?.hashtags && (
            <p className="text-xs text-[#555555]">
              <span className="text-[#333333] mr-1">Tags:</span>{activeCaption.hashtags}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
