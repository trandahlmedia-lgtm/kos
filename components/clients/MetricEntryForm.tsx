'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createMetricEntry } from '@/lib/actions/metrics'
import { useRouter } from 'next/navigation'

interface MetricEntryFormProps {
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function MetricField({
  label,
  name,
  value,
  onChange,
  step,
  placeholder,
}: {
  label: string
  name: string
  value: string
  onChange: (val: string) => void
  step?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#555555] mb-1">{label}</label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step ?? '1'}
        min="0"
        placeholder={placeholder ?? '—'}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-[#333333] focus:outline-none focus:border-[#E8732A] transition-colors"
      />
    </div>
  )
}

export function MetricEntryForm({ clientId, open, onOpenChange }: MetricEntryFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Today in YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10)
  const [metricDate, setMetricDate] = useState(todayStr)
  const [websiteSessions, setWebsiteSessions] = useState('')
  const [metaReach, setMetaReach] = useState('')
  const [metaImpressions, setMetaImpressions] = useState('')
  const [metaClicks, setMetaClicks] = useState('')
  const [metaSpend, setMetaSpend] = useState('')
  const [metaLeads, setMetaLeads] = useState('')
  const [googleReviews, setGoogleReviews] = useState('')
  const [googleRating, setGoogleRating] = useState('')
  const [gbpViews, setGbpViews] = useState('')
  const [gbpClicks, setGbpClicks] = useState('')
  const [notes, setNotes] = useState('')

  function reset() {
    setMetricDate(todayStr)
    setWebsiteSessions('')
    setMetaReach('')
    setMetaImpressions('')
    setMetaClicks('')
    setMetaSpend('')
    setMetaLeads('')
    setGoogleReviews('')
    setGoogleRating('')
    setGbpViews('')
    setGbpClicks('')
    setNotes('')
    setError('')
  }

  function parseNum(val: string): number | null {
    if (!val.trim()) return null
    const n = parseFloat(val)
    return isNaN(n) ? null : n
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        await createMetricEntry({
          client_id: clientId,
          metric_date: metricDate,
          website_sessions: parseNum(websiteSessions) != null ? Math.round(parseNum(websiteSessions)!) : null,
          meta_reach: parseNum(metaReach) != null ? Math.round(parseNum(metaReach)!) : null,
          meta_impressions: parseNum(metaImpressions) != null ? Math.round(parseNum(metaImpressions)!) : null,
          meta_clicks: parseNum(metaClicks) != null ? Math.round(parseNum(metaClicks)!) : null,
          meta_spend: parseNum(metaSpend),
          meta_leads: parseNum(metaLeads) != null ? Math.round(parseNum(metaLeads)!) : null,
          google_reviews: parseNum(googleReviews) != null ? Math.round(parseNum(googleReviews)!) : null,
          google_rating: parseNum(googleRating),
          gbp_views: parseNum(gbpViews) != null ? Math.round(parseNum(gbpViews)!) : null,
          gbp_clicks: parseNum(gbpClicks) != null ? Math.round(parseNum(gbpClicks)!) : null,
          notes: notes.trim() || null,
        })
        reset()
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save metrics')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border border-[#2a2a2a] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-white">Update Metrics</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Date */}
          <div>
            <label className="block text-xs text-[#555555] mb-1">Date</label>
            <input
              type="date"
              value={metricDate}
              onChange={(e) => setMetricDate(e.target.value)}
              required
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8732A] transition-colors"
            />
          </div>

          {/* Website */}
          <div>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-2">Website</p>
            <MetricField label="Sessions" name="website_sessions" value={websiteSessions} onChange={setWebsiteSessions} />
          </div>

          {/* Meta */}
          <div>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-2">Meta</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricField label="Reach" name="meta_reach" value={metaReach} onChange={setMetaReach} />
              <MetricField label="Impressions" name="meta_impressions" value={metaImpressions} onChange={setMetaImpressions} />
              <MetricField label="Clicks" name="meta_clicks" value={metaClicks} onChange={setMetaClicks} />
              <MetricField label="Spend ($)" name="meta_spend" value={metaSpend} onChange={setMetaSpend} step="0.01" />
              <MetricField label="Leads" name="meta_leads" value={metaLeads} onChange={setMetaLeads} />
            </div>
          </div>

          {/* Google */}
          <div>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-2">Google</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricField label="Reviews" name="google_reviews" value={googleReviews} onChange={setGoogleReviews} />
              <MetricField label="Rating" name="google_rating" value={googleRating} onChange={setGoogleRating} step="0.1" placeholder="e.g. 4.8" />
              <MetricField label="GBP Views" name="gbp_views" value={gbpViews} onChange={setGbpViews} />
              <MetricField label="GBP Clicks" name="gbp_clicks" value={gbpClicks} onChange={setGbpClicks} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-[#555555] mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any context for this week's numbers..."
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-[#333333] focus:outline-none focus:border-[#E8732A] transition-colors resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { reset(); onOpenChange(false) }}
              className="px-3 py-1.5 text-sm text-[#555555] hover:text-[#999999] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 text-sm font-medium text-white bg-[#E8732A] rounded-md hover:bg-[#d4621f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Saving…' : 'Save Metrics'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
