'use client'

import { useState } from 'react'
import { Mail, Loader2, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GenerateDraftsButtonProps {
  leadId: string
  leadName: string
  hasResearch: boolean
  hasEmail: boolean
  aiScore: number | null
  scoreThreshold?: number
  hasExistingDrafts?: boolean
  draftingInProgress?: boolean
}

export function GenerateDraftsButton({
  leadId,
  leadName,
  hasResearch,
  hasEmail,
  aiScore,
  scoreThreshold = 60,
  hasExistingDrafts = false,
  draftingInProgress = false,
}: GenerateDraftsButtonProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const meetsThreshold = aiScore !== null && aiScore >= scoreThreshold
  const canGenerate = hasResearch && hasEmail && meetsThreshold && !hasExistingDrafts

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/ai/outreach-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to generate drafts')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate drafts')
    } finally {
      setGenerating(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm p-3 bg-green-400/5 border border-green-400/20 rounded-md">
        <Check size={14} />
        Outreach emails drafted for {leadName}. Review them in the Outreach page.
      </div>
    )
  }

  if (draftingInProgress) {
    return (
      <div className="flex items-center gap-2 text-[#E8732A] text-xs">
        <Loader2 size={12} className="animate-spin" />
        Drafting in progress...
      </div>
    )
  }

  if (hasExistingDrafts) {
    return (
      <div className="flex items-center gap-2 text-[#555555] text-xs">
        <Mail size={12} />
        Outreach drafts already exist for this lead.
      </div>
    )
  }

  let disabledReason: string | null = null
  if (!hasResearch) disabledReason = 'Run research first'
  else if (!hasEmail) disabledReason = 'Add an email address first'
  else if (!meetsThreshold) disabledReason = `AI score (${aiScore ?? 0}) is below threshold (${scoreThreshold})`

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate || generating}
        className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 text-xs h-8"
      >
        {generating ? (
          <>
            <Loader2 size={12} className="mr-1 animate-spin" />
            Drafting emails...
          </>
        ) : (
          <>
            <Mail size={12} className="mr-1" />
            Draft Outreach Email
          </>
        )}
      </Button>

      {disabledReason && (
        <p className="text-[10px] text-[#555555]">{disabledReason}</p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  )
}
