'use client'

import { useEffect, useState, useRef } from 'react'
import { CheckCircle, Loader2, Circle } from 'lucide-react'

interface Step {
  key: string
  label: string
}

const STEPS: Step[] = [
  { key: 'website_audit', label: 'Website audit' },
  { key: 'social_audit', label: 'Social media audit' },
  { key: 'business_intel', label: 'Business intelligence' },
  { key: 'service_fit', label: 'Service fit analysis' },
  { key: 'pricing_analysis', label: 'Pricing recommendation' },
  { key: 'synthesis', label: 'Synthesizing report' },
]

type StepStatus = 'pending' | 'running' | 'complete'

interface StatusResponse {
  status: 'none' | 'running' | 'completed' | 'failed' | 'pending'
  error_message?: string | null
  overall_score?: number | null
  steps: Record<string, StepStatus>
}

interface ResearchProgressProps {
  leadId: string
  /** If true, only poll — don't trigger the research POST */
  pollOnly?: boolean
  onComplete: () => void
  onError: (msg: string) => void
}

const POLL_INTERVAL = 2000

export function ResearchProgress({ leadId, pollOnly, onComplete, onError }: ResearchProgressProps) {
  const [steps, setSteps] = useState<Record<string, StepStatus>>(
    Object.fromEntries(STEPS.map((s) => [s.key, 'pending']))
  )
  const [started, setStarted] = useState(!!pollOnly)
  const cancelledRef = useRef(false)

  // Start research (fire-and-forget POST) — only when not in pollOnly mode
  useEffect(() => {
    if (pollOnly) return

    let cancelled = false
    async function start() {
      try {
        const res = await fetch('/api/ai/lead-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: leadId }),
        })

        if (cancelled) return

        if (!res.ok) {
          const err = await res.json() as { error?: string }
          // 409 = already running, still poll
          if (res.status === 409) {
            setStarted(true)
            return
          }
          onError(err.error ?? 'Research failed to start')
          return
        }

        setStarted(true)
      } catch {
        if (!cancelled) onError('Failed to start research')
      }
    }

    start()
    return () => { cancelled = true }
  }, [leadId, pollOnly, onError])

  // Poll for progress
  useEffect(() => {
    if (!started) return

    cancelledRef.current = false

    let failCount = 0
    async function poll() {
      try {
        const res = await fetch(`/api/ai/lead-research/status?lead_id=${leadId}`)
        if (cancelledRef.current) return
        if (!res.ok) {
          failCount++
          if (failCount >= 5) {
            onError('Lost connection to research status. Please refresh.')
            return
          }
          // Continue polling on transient errors
          if (!cancelledRef.current) {
            timerId = window.setTimeout(poll, POLL_INTERVAL) as unknown as number
          }
          return
        }
        failCount = 0

        const data = await res.json() as StatusResponse

        if (data.status === 'completed') {
          // Mark all steps complete
          setSteps(Object.fromEntries(STEPS.map((s) => [s.key, 'complete' as StepStatus])))
          onComplete()
          return
        }

        if (data.status === 'failed') {
          onError(data.error_message ?? 'Research failed')
          return
        }

        if (data.status === 'running' && data.steps) {
          setSteps(data.steps)
        }
      } catch {
        // Silently retry on network errors
      }

      if (!cancelledRef.current) {
        timerId = window.setTimeout(poll, POLL_INTERVAL) as unknown as number
      }
    }

    let timerId: number
    // Start first poll quickly
    timerId = window.setTimeout(poll, 500) as unknown as number

    return () => {
      cancelledRef.current = true
      window.clearTimeout(timerId)
    }
  }, [started, leadId, onComplete, onError])

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#999999]">Running 5 research agents + synthesis&hellip;</p>
      <div className="space-y-2">
        {STEPS.map((step) => {
          const status = steps[step.key] ?? 'pending'
          return (
            <div key={step.key} className="flex items-center gap-2.5">
              {status === 'complete' ? (
                <CheckCircle size={14} className="text-green-400 shrink-0" />
              ) : status === 'running' ? (
                <Loader2 size={14} className="text-[#E8732A] shrink-0 animate-spin" />
              ) : (
                <Circle size={14} className="text-[#2a2a2a] shrink-0" />
              )}
              <span
                className={`text-sm ${
                  status === 'complete'
                    ? 'text-white'
                    : status === 'running'
                    ? 'text-[#E8732A]'
                    : 'text-[#555555]'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
