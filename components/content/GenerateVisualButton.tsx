'use client'

import { useState } from 'react'
import { Loader2, Eye, Check } from 'lucide-react'
import { generateVisualAction } from '@/lib/actions/visuals'

interface GenerateVisualButtonProps {
  postId: string
  hasVisual: boolean
  exportStatus?: string
  onPreview: () => void
  onRefresh?: () => void
}

export function GenerateVisualButton({
  postId,
  hasVisual,
  exportStatus,
  onPreview,
  onRefresh,
}: GenerateVisualButtonProps) {
  const [generating, setGenerating] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  async function handleGenerate(e: React.MouseEvent) {
    e.stopPropagation()
    setError('')
    setGenerating(true)
    try {
      await generateVisualAction(postId, notes || undefined)
      setShowNotes(false)
      setNotes('')
      onRefresh?.()
      onPreview()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  // Visual exists — show Preview button (with Exported badge if exported)
  if (hasVisual) {
    return (
      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview() }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-green-400 bg-green-400/10 border border-green-400/20 hover:bg-green-400/20 transition-colors"
        >
          <Eye size={10} />
          Preview
        </button>
        {exportStatus === 'exported' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-green-400 bg-green-400/10 border border-green-400/20">
            <Check size={10} />
            Exported
          </span>
        )}
      </div>
    )
  }

  // Generating state
  if (generating) {
    return (
      <span
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium text-[#E8732A] bg-[#E8732A]/10 border border-[#E8732A]/20"
      >
        <Loader2 size={10} className="animate-spin" />
        Generating...
      </span>
    )
  }

  // No visual — show Generate button (with expandable notes)
  return (
    <div onClick={(e) => e.stopPropagation()} className="space-y-1">
      {showNotes ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            aria-label="Visual generation notes"
            className="h-6 px-2 text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] rounded text-white placeholder:text-[#555555] focus:outline-none focus:ring-1 focus:ring-[#E8732A] flex-1 min-w-0"
          />
          <button
            onClick={handleGenerate}
            className="h-6 px-2 text-[10px] font-medium bg-[#E8732A] hover:bg-[#d4621f] text-white rounded transition-colors whitespace-nowrap"
          >
            Generate
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setShowNotes(true) }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-[#E8732A] border border-[#E8732A]/30 hover:bg-[#E8732A]/10 transition-colors"
        >
          Generate Visual
        </button>
      )}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  )
}
