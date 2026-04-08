'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { saveManualCaptionAction } from '@/lib/actions/posts'
import type { GeneratedCaptions, CaptionOption } from '@/types'

interface CaptionEditorProps {
  postId: string
  initialCaption?: string
  onSaved?: () => void
}

export function CaptionEditor({ postId, initialCaption = '', onSaved }: CaptionEditorProps) {
  const router = useRouter()
  const [caption, setCaption] = useState(initialCaption)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // AI state
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiCaptions, setAiCaptions] = useState<GeneratedCaptions | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0) // 0=best, 1=alt1, 2=alt2
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Derive the ordered list of caption options
  const captionOptions: CaptionOption[] = aiCaptions
    ? [aiCaptions.best, ...aiCaptions.alternatives]
    : []

  async function handleGenerate() {
    setGenerating(true)
    setAiError('')
    setAiCaptions(null)
    setShowAlternatives(false)

    try {
      const res = await fetch('/api/ai/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })

      const data = (await res.json()) as GeneratedCaptions & { error?: string }

      if (!res.ok) {
        setAiError(data.error ?? 'Failed to generate captions.')
        return
      }

      setAiCaptions(data)
      setSelectedIdx(0)
      // Auto-fill the manual textarea with the best caption
      setCaption(data.best.content)
      router.refresh()
    } catch {
      setAiError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  function handleSelectCaption(idx: number) {
    setSelectedIdx(idx)
    if (captionOptions[idx]) {
      setCaption(captionOptions[idx].content)
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  async function handleSave() {
    if (!caption.trim()) return
    setError('')
    setSaving(true)
    setSaved(false)

    try {
      await saveManualCaptionAction(postId, caption.trim())
      setSaved(true)
      router.refresh()
      onSaved?.()
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save caption.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Manual caption textarea */}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Write a caption..."
        rows={4}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-[#555555] resize-none focus:outline-none focus:ring-1 focus:ring-[#E8732A]"
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-[#1a1a1a] hover:bg-[#222222] text-white border border-[#2a2a2a] h-8 px-3 text-sm gap-1.5 disabled:opacity-50"
        >
          <Sparkles size={13} className={`text-[#E8732A] ${generating ? 'animate-pulse' : ''}`} />
          {generating ? 'Generating…' : 'AI Captions'}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !caption.trim()}
          className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-8 px-3 text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Caption'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {aiError && <p className="text-sm text-red-400">{aiError}</p>}

      {/* AI-generated captions */}
      {captionOptions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#999999] font-medium">AI Suggestions</span>
            {captionOptions.length > 1 && (
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="flex items-center gap-1 text-xs text-[#555555] hover:text-[#999999] transition-colors"
              >
                {showAlternatives ? 'Hide' : 'Show'} alternatives
                {showAlternatives ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>

          {captionOptions.map((opt, idx) => {
            if (idx > 0 && !showAlternatives) return null
            const isSelected = idx === selectedIdx
            return (
              <div
                key={idx}
                onClick={() => handleSelectCaption(idx)}
                className={`p-3 rounded-md border text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-[#E8732A]/50 bg-[#E8732A]/5 text-white'
                    : 'border-[#2a2a2a] bg-[#111111] text-[#999999] hover:border-[#3a3a3a]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 whitespace-pre-wrap">{opt.content}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(opt.content, `cap-${idx}`) }}
                    className="shrink-0 text-[#555555] hover:text-white transition-colors"
                    title="Copy"
                  >
                    {copied === `cap-${idx}` ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                {opt.tone && (
                  <p className="mt-1 text-xs text-[#555555]">Tone: {opt.tone} | Hook: {opt.hook}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}