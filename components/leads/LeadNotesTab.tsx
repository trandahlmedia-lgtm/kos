'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Lead, LeadActivity } from '@/types'

interface LeadNotesTabProps {
  lead: Lead
  activities: LeadActivity[]
  onUpdate: (updates: Partial<Lead>) => Promise<void>
}

const SENTIMENT_COLOR: Record<string, string> = {
  hot: 'text-[#E8732A]',
  warm: 'text-yellow-400',
  cold: 'text-blue-400',
}

const ACTIVITY_LABELS: Record<string, string> = {
  call: 'Call',
  note: 'Note',
  stage_change: 'Stage changed',
  research_run: 'Research run',
  conversion: 'Converted to client',
}

export function LeadNotesTab({ lead, activities, onUpdate }: LeadNotesTabProps) {
  const [callNotes, setCallNotes] = useState(lead.call_notes ?? '')
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [saving, setSaving] = useState(false)

  let parsedSummary: Record<string, unknown> | null = null
  if (lead.ai_call_summary) {
    try {
      parsedSummary = JSON.parse(lead.ai_call_summary) as Record<string, unknown>
    } catch { /* ignore */ }
  }

  async function handleSaveNotes() {
    if (callNotes === (lead.call_notes ?? '')) return
    setSaving(true)
    await onUpdate({ call_notes: callNotes })
    setSaving(false)
  }

  async function handleSummarize() {
    if (!callNotes.trim()) return
    setSummarizing(true)
    setSummaryError('')
    try {
      const res = await fetch('/api/ai/call-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, call_notes: callNotes }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        setSummaryError(err.error ?? 'Failed to summarize')
        return
      }
      // Refresh lead data via parent update trigger
      await onUpdate({ call_notes: callNotes })
    } catch {
      setSummaryError('Request failed. Please try again.')
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Call notes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#999999]">Call Notes</span>
          <Button
            size="sm"
            onClick={handleSummarize}
            disabled={summarizing || !callNotes.trim()}
            className="h-6 text-[11px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#999999] hover:text-white hover:border-[#E8732A]"
          >
            {summarizing ? (
              <Loader2 size={10} className="mr-1 animate-spin" />
            ) : (
              <Sparkles size={10} className="mr-1" />
            )}
            Summarize
          </Button>
        </div>
        <Textarea
          value={callNotes}
          onChange={(e) => setCallNotes(e.target.value)}
          onBlur={handleSaveNotes}
          rows={6}
          placeholder="Paste call notes or transcript here…"
          className="bg-[#1a1a1a] border-[#2a2a2a] text-sm resize-none font-mono text-[#999999]"
        />
        {saving && <p className="text-[11px] text-[#555555]">Saving…</p>}
        {summaryError && <p className="text-[11px] text-red-400">{summaryError}</p>}
      </div>

      {/* AI Summary */}
      {parsedSummary && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#999999]">AI Summary</span>
            {typeof parsedSummary.overall_sentiment === 'string' && (
              <span className={`text-xs font-medium capitalize ${SENTIMENT_COLOR[parsedSummary.overall_sentiment] ?? 'text-[#555555]'}`}>
                {parsedSummary.overall_sentiment}
              </span>
            )}
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-3 space-y-3">
            {typeof parsedSummary.what_they_want === 'string' && (
              <SummaryRow label="What They Want" value={parsedSummary.what_they_want} />
            )}
            {typeof parsedSummary.current_situation === 'string' && (
              <SummaryRow label="Situation" value={parsedSummary.current_situation} />
            )}
            {Array.isArray(parsedSummary.pain_points) && (parsedSummary.pain_points as string[]).length > 0 && (
              <div>
                <span className="text-[11px] text-[#555555]">Pain Points</span>
                <ul className="mt-1 space-y-1">
                  {(parsedSummary.pain_points as string[]).map((p, i) => (
                    <li key={i} className="text-xs text-[#999999] pl-2 border-l border-[#2a2a2a]">{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(parsedSummary.objections) && (parsedSummary.objections as string[]).length > 0 && (
              <div>
                <span className="text-[11px] text-[#555555]">Objections</span>
                <ul className="mt-1 space-y-1">
                  {(parsedSummary.objections as string[]).map((o, i) => (
                    <li key={i} className="text-xs text-red-400/70 pl-2 border-l border-red-400/20">{o}</li>
                  ))}
                </ul>
              </div>
            )}
            {typeof parsedSummary.next_steps === 'string' && (
              <SummaryRow label="Next Steps" value={parsedSummary.next_steps} highlight />
            )}
            {typeof parsedSummary.recommended_follow_up === 'string' && (
              <SummaryRow label="Recommended Follow-up" value={parsedSummary.recommended_follow_up} highlight />
            )}
            {typeof parsedSummary.pricing_discussed === 'string' && (
              <SummaryRow label="Pricing Discussed" value={parsedSummary.pricing_discussed} />
            )}
            {typeof parsedSummary.decision_timeline === 'string' && (
              <SummaryRow label="Decision Timeline" value={parsedSummary.decision_timeline} />
            )}
          </div>
        </div>
      )}

      {/* Activity log */}
      {activities.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-[#999999]">Activity Log</span>
          <div className="space-y-1.5">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 text-xs">
                <span className="text-[#555555] shrink-0 w-[130px]">
                  {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <div>
                  <span className="text-[#E8732A] font-medium">{ACTIVITY_LABELS[a.type] ?? a.type}</span>
                  {a.content && <span className="text-[#555555] ml-1">— {a.content}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-[11px] text-[#555555]">{label}</span>
      <p className={`text-xs mt-0.5 ${highlight ? 'text-[#E8732A]' : 'text-[#999999]'}`}>{value}</p>
    </div>
  )
}
