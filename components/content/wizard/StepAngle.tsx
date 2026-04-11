'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StepAngleProps {
  clientId: string
  clientName: string
  scheduledDate: string
  existingAngles: string[]
  value: string
  onChange: (angle: string) => void
}

export function StepAngle({
  clientId,
  clientName,
  scheduledDate,
  existingAngles,
  value,
  onChange,
}: StepAngleProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSuggest() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/suggest-angle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          scheduled_date: scheduledDate,
          existing_angles: existingAngles,
        }),
      })

      const data = await res.json() as { angle?: string; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }

      if (data.angle) {
        onChange(data.angle)
      }
    } catch {
      setError('Failed to connect. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasSuggestion = value.trim().length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">What&apos;s this post about?</h2>
        <p className="text-sm text-[#999999]">Give a content direction or let AI suggest one</p>
        {clientName && (
          <p className="text-xs text-[#555555] mt-0.5">For {clientName} · {scheduledDate}</p>
        )}
      </div>

      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='e.g. "Spring AC tune-up — why waiting until summer costs more"'
        className="w-full resize-none rounded-md bg-[#111111] border border-[#2a2a2a] text-white text-sm placeholder:text-[#444444] px-4 py-3 focus:outline-none focus:border-[#E8732A] transition-colors"
      />

      {error && (
        <p className="text-xs text-red-400 -mt-3">{error}</p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleSuggest}
        disabled={loading}
        className="self-start bg-transparent border-[#2a2a2a] text-[#999999] hover:border-[#E8732A] hover:text-white hover:bg-transparent h-9 px-4 text-sm gap-2 transition-colors"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        {loading ? 'Thinking…' : hasSuggestion ? 'Suggest Again' : 'Suggest an Angle'}
      </Button>
    </div>
  )
}
