'use client'

import { useEffect, useState } from 'react'
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

interface ResearchProgressProps {
  leadId: string
  onComplete: () => void
  onError: (msg: string) => void
}

export function ResearchProgress({ leadId, onComplete, onError }: ResearchProgressProps) {
  const [steps, setSteps] = useState<Record<string, StepStatus>>(
    Object.fromEntries(STEPS.map((s) => [s.key, 'pending']))
  )

  useEffect(() => {
    const controller = new AbortController()

    async function run() {
      try {
        const res = await fetch('/api/ai/lead-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: leadId }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const err = await res.json() as { error?: string }
          onError(err.error ?? 'Research failed')
          return
        }

        if (!res.body) { onError('No response stream'); return }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const dataPart = line.replace(/^data: /, '').trim()
            if (!dataPart) continue
            try {
              const event = JSON.parse(dataPart) as {
                step: string
                status?: string
                message?: string
              }

              if (event.step === 'done') {
                onComplete()
                return
              }
              if (event.step === 'error') {
                onError(event.message ?? 'Research failed')
                return
              }
              if (event.status === 'running' || event.status === 'complete') {
                setSteps((prev) => ({
                  ...prev,
                  [event.step]: event.status as StepStatus,
                }))
              }
            } catch { /* skip malformed lines */ }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError('Connection lost. Please try again.')
        }
      }
    }

    run()
    return () => controller.abort()
  }, [leadId, onComplete, onError])

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#999999]">Running 5 research agents + synthesis…</p>
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
