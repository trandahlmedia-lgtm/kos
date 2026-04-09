'use client'

import { useState, useCallback, useEffect } from 'react'
import { FlaskConical, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResearchProgress } from './ResearchProgress'
import { GenerateDraftsButton } from '@/components/outreach/GenerateDraftsButton'
import type { LeadResearch } from '@/types'

interface LeadResearchTabProps {
  leadId: string
  leadName?: string
  leadEmail?: string | null
  aiScore?: number | null
  hasExistingDrafts?: boolean
  draftingInProgress?: boolean
  research: LeadResearch | null
  onResearchComplete: () => void
}

export function LeadResearchTab({ leadId, leadName, leadEmail, aiScore, hasExistingDrafts, draftingInProgress, research, onResearchComplete }: LeadResearchTabProps) {
  // Auto-detect in-progress research on mount
  const alreadyRunning = research?.status === 'running'
  const [running, setRunning] = useState(alreadyRunning)
  const [pollOnly, setPollOnly] = useState(alreadyRunning)
  const [error, setError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [now, setNow] = useState(Date.now())

  // Re-check stuck status periodically so a running job surfaces the reset button
  useEffect(() => {
    if (research?.status !== 'running' && research?.status !== 'pending') return
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [research?.status])

  // Detect stuck research: running/pending for >5 minutes
  const isStuck = !running && research != null
    && (research.status === 'running' || research.status === 'pending')
    && research.updated_at
    && (now - new Date(research.updated_at).getTime()) > 5 * 60 * 1000

  async function handleReset() {
    setResetting(true)
    try {
      const res = await fetch('/api/ai/lead-research/cancel-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: [leadId] }),
      })
      if (res.ok) {
        onResearchComplete()
      } else {
        setError('Failed to reset research. Try again.')
      }
    } catch {
      setError('Failed to reset research. Try again.')
    } finally {
      setResetting(false)
    }
  }

  const handleStart = () => {
    setError(null)
    setPollOnly(false)
    setRunning(true)
  }

  const handleComplete = useCallback(() => {
    setRunning(false)
    setPollOnly(false)
    onResearchComplete()
  }, [onResearchComplete])

  const handleError = useCallback((msg: string) => {
    setRunning(false)
    setPollOnly(false)
    setError(msg)
  }, [])

  if (running) {
    return (
      <div className="space-y-4">
        <ResearchProgress leadId={leadId} pollOnly={pollOnly} onComplete={handleComplete} onError={handleError} />
      </div>
    )
  }

  if (isStuck) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-yellow-400 text-sm p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-md">
          <AlertCircle size={14} />
          Research appears stuck — no updates in over 5 minutes.
        </div>
        <Button
          onClick={handleReset}
          disabled={resetting}
          variant="outline"
          className="border-[#2a2a2a] text-[#999999]"
        >
          <RotateCcw size={14} className={`mr-2 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Resetting...' : 'Reset Research'}
        </Button>
      </div>
    )
  }

  if (!research || research.status === 'pending') {
    return (
      <div className="space-y-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-[#E8732A]" />
            <span className="text-sm font-medium text-white">Full Research</span>
          </div>
          <p className="text-sm text-[#999999]">
            Runs 5 AI agents to audit the website, social presence, business health, service fit, and pricing. Takes ~30 seconds.
          </p>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <Button onClick={handleStart} className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0">
            Run Full Research
          </Button>
        </div>
      </div>
    )
  }

  if (research.status === 'failed') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-400/5 border border-red-400/20 rounded-md">
          <AlertCircle size={14} />
          Research failed: {research.error_message ?? 'Unknown error'}
        </div>
        <Button onClick={handleStart} variant="outline" className="border-[#2a2a2a] text-[#999999]">
          <RefreshCw size={14} className="mr-2" />
          Retry Research
        </Button>
      </div>
    )
  }

  // Completed research
  const websiteAudit = research.website_audit as Record<string, unknown> | null
  const socialAudit = research.social_audit as Record<string, unknown> | null
  const businessIntel = research.business_intel as Record<string, unknown> | null
  const serviceFit = research.service_fit as Record<string, unknown> | null
  const pricingAnalysis = research.pricing_analysis as Record<string, unknown> | null

  return (
    <div className="space-y-5">
      {/* Score + re-run */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#555555]">Overall Score</span>
          <span
            className={`text-lg font-semibold ${
              (research.overall_score ?? 0) >= 71 ? 'text-green-400'
                : (research.overall_score ?? 0) >= 41 ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {research.overall_score ?? '—'}/100
          </span>
        </div>
        <Button onClick={handleStart} size="sm" variant="ghost" className="text-[#555555] hover:text-white text-xs">
          <RefreshCw size={12} className="mr-1" />
          Re-run
        </Button>
      </div>

      {/* Outreach drafting */}
      {research.status === 'completed' && (
        <GenerateDraftsButton
          leadId={leadId}
          leadName={leadName ?? 'this lead'}
          hasResearch={true}
          hasEmail={!!leadEmail}
          aiScore={aiScore ?? research.overall_score}
          hasExistingDrafts={hasExistingDrafts}
          draftingInProgress={draftingInProgress}
        />
      )}

      {/* Full report */}
      {research.full_report && (
        <div className="prose prose-invert prose-sm max-w-none text-[#999999] text-sm leading-relaxed whitespace-pre-wrap">
          {research.full_report}
        </div>
      )}

      {/* Structured sections */}
      {websiteAudit && <AuditSection title="Website" data={websiteAudit} />}
      {socialAudit && <AuditSection title="Social Media" data={socialAudit} />}
      {businessIntel && <AuditSection title="Business Intelligence" data={businessIntel} />}
      {serviceFit && <ServiceFitSection data={serviceFit} />}
      {pricingAnalysis && <PricingSection data={pricingAnalysis} />}
    </div>
  )
}

function AuditSection({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-[#E8732A] uppercase tracking-wide">{title}</h4>
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-3 space-y-2">
        {Object.entries(data).map(([key, val]) => {
          if (key === 'findings' && Array.isArray(val)) {
            return (
              <div key={key}>
                <span className="text-[11px] text-[#555555] uppercase tracking-wide">Findings</span>
                <ul className="mt-1 space-y-1">
                  {(val as string[]).map((f, i) => (
                    <li key={i} className="text-xs text-[#999999] pl-2 border-l border-[#2a2a2a]">{f}</li>
                  ))}
                </ul>
              </div>
            )
          }
          if (key === 'recommendations' && Array.isArray(val)) {
            return (
              <div key={key}>
                <span className="text-[11px] text-[#555555] uppercase tracking-wide">Recommendations</span>
                <ul className="mt-1 space-y-1">
                  {(val as string[]).map((r, i) => (
                    <li key={i} className="text-xs text-[#E8732A] pl-2 border-l border-[#E8732A]/30">{r}</li>
                  ))}
                </ul>
              </div>
            )
          }
          if (typeof val === 'object' && val !== null) return null
          return (
            <div key={key} className="flex items-start justify-between gap-2">
              <span className="text-[11px] text-[#555555] capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-xs text-[#999999] text-right">{String(val)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ServiceFitSection({ data }: { data: Record<string, unknown> }) {
  const services = data.services as Array<{ name: string; priority: string; rationale: string }> | undefined
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-[#E8732A] uppercase tracking-wide">Service Fit</h4>
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-3 space-y-2">
        {typeof data.primary_opportunity === 'string' && (
          <p className="text-sm text-white">{data.primary_opportunity}</p>
        )}
        {services?.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
              s.priority === 'high' ? 'bg-[#E8732A]/20 text-[#E8732A]'
                : s.priority === 'medium' ? 'bg-yellow-400/10 text-yellow-400'
                : 'bg-[#1a1a1a] text-[#555555]'
            }`}>{s.priority}</span>
            <div>
              <p className="text-xs font-medium text-white">{s.name}</p>
              <p className="text-[11px] text-[#555555]">{s.rationale}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PricingSection({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-[#E8732A] uppercase tracking-wide">Pricing Recommendation</h4>
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white capitalize">{String(data.recommended_tier ?? '').replace('_', ' ')}</span>
          <span className="text-sm text-[#E8732A]">
            ${data.mrr_low?.toString() ?? '?'}–${data.mrr_high?.toString() ?? '?'}/mo
          </span>
        </div>
        {typeof data.rationale === 'string' && <p className="text-xs text-[#999999]">{data.rationale}</p>}
        {typeof data.negotiation_notes === 'string' && (
          <p className="text-xs text-[#555555] italic">{data.negotiation_notes}</p>
        )}
      </div>
    </div>
  )
}
