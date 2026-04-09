'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Loader2, CheckCircle2, XCircle, Circle, ChevronDown, Ban } from 'lucide-react'

interface BatchItem {
  lead_id: string
  business_name: string
  status: string
  error_message?: string | null
  overall_score?: number | null
  steps: Record<string, 'complete' | 'running' | 'pending'>
}

interface ActiveStatusResponse {
  items: BatchItem[]
}

const STEP_LABELS: Record<string, string> = {
  website_audit: 'Fetching business data',
  social_audit: 'Searching web presence',
  business_intel: 'Analyzing reviews',
  service_fit: 'Scoring lead',
  pricing_analysis: 'Generating report',
  synthesis: 'Synthesizing final report',
}

const STEP_ORDER = ['website_audit', 'social_audit', 'business_intel', 'service_fit', 'pricing_analysis', 'synthesis']

interface BatchResearchProgressProps {
  onAllComplete?: () => void
  onCancelBatch?: () => void
}

export function BatchResearchProgress({ onAllComplete, onCancelBatch }: BatchResearchProgressProps) {
  const [items, setItems] = useState<BatchItem[]>([])
  const [open, setOpen] = useState(true)
  const [visible, setVisible] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const wasActiveRef = useRef(false)

  const handleAllComplete = useCallback(() => {
    onAllComplete?.()
  }, [onAllComplete])

  // Poll for ALL active research
  useEffect(() => {
    const controller = new AbortController()
    let localTimerId: number

    const pollFn = async () => {
      if (controller.signal.aborted) return
      try {
        const res = await fetch('/api/ai/lead-research/active-status', {
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (res.ok) {
          const data = await res.json() as ActiveStatusResponse
          if (controller.signal.aborted) return

          if (data.items.length > 0) {
            setItems(data.items)
            setVisible(true)
            wasActiveRef.current = true
          } else if (wasActiveRef.current) {
            // Was active, now everything is done
            setVisible(false)
            wasActiveRef.current = false
            handleAllComplete()
          }
        } else if (res.status === 401 || res.status === 403) {
          return
        }
      } catch {
        if (controller.signal.aborted) return
      }
      if (!controller.signal.aborted) {
        localTimerId = window.setTimeout(pollFn, 2000) as unknown as number
      }
    }

    localTimerId = window.setTimeout(pollFn, 500) as unknown as number
    return () => {
      controller.abort()
      window.clearTimeout(localTimerId)
    }
  }, [handleAllComplete])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!visible || items.length === 0) return null

  const completedCount = items.filter((i) => i.status === 'completed').length
  const failedCount = items.filter((i) => i.status === 'failed').length
  const totalCount = items.length
  const isRunning = items.some((i) => i.status === 'running' || i.status === 'pending')

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 border border-[#2a2a2a] text-[#E8732A] hover:text-white h-7 text-xs px-2.5 rounded-md bg-transparent transition-colors"
      >
        {isRunning ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <CheckCircle2 size={12} className="text-green-400" />
        )}
        {completedCount + failedCount}/{totalCount}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-[320px] bg-[#111111] border border-[#2a2a2a] rounded-md shadow-lg shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center justify-between">
            <p className="text-xs font-medium text-white">
              Research — {completedCount + failedCount} of {totalCount}
            </p>
            {isRunning && onCancelBatch && (
              <button
                onClick={onCancelBatch}
                className="inline-flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
              >
                <Ban size={10} />
                Cancel
              </button>
            )}
          </div>

          {/* Queue list */}
          <div className="max-h-[400px] overflow-y-auto">
            {items.map((item) => (
              <div key={item.lead_id}>
                {/* Lead row */}
                <div
                  className={`flex items-center gap-2 px-3 py-2 ${
                    item.status === 'running' ? 'bg-[#1a1a1a]' : ''
                  }`}
                >
                  {/* Status icon */}
                  {item.status === 'completed' ? (
                    <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  ) : item.status === 'failed' ? (
                    <XCircle size={14} className="text-red-400 shrink-0" />
                  ) : item.status === 'running' ? (
                    <Loader2 size={14} className="text-[#E8732A] shrink-0 animate-spin" />
                  ) : (
                    <Circle size={14} className="text-[#555555] shrink-0" />
                  )}

                  {/* Name */}
                  <span
                    className={`text-sm truncate ${
                      item.status === 'running'
                        ? 'text-[#E8732A] font-medium'
                        : item.status === 'completed'
                        ? 'text-white'
                        : item.status === 'failed'
                        ? 'text-red-400'
                        : 'text-[#555555]'
                    }`}
                  >
                    {item.business_name}
                  </span>

                  {/* Score badge for completed */}
                  {item.status === 'completed' && item.overall_score != null && (
                    <span className="ml-auto text-[10px] text-[#999999] font-mono">
                      {item.overall_score}/100
                    </span>
                  )}
                </div>

                {/* Steps checklist for active lead */}
                {item.status === 'running' && (
                  <div className="px-3 pb-2 pl-9 space-y-1">
                    {STEP_ORDER.map((stepKey) => {
                      const stepStatus = item.steps[stepKey] ?? 'pending'
                      return (
                        <div key={stepKey} className="flex items-center gap-2">
                          {stepStatus === 'complete' ? (
                            <CheckCircle2 size={11} className="text-green-400 shrink-0" />
                          ) : stepStatus === 'running' ? (
                            <Loader2 size={11} className="text-[#E8732A] shrink-0 animate-spin" />
                          ) : (
                            <Circle size={11} className="text-[#2a2a2a] shrink-0" />
                          )}
                          <span
                            className={`text-[11px] ${
                              stepStatus === 'complete'
                                ? 'text-[#999999]'
                                : stepStatus === 'running'
                                ? 'text-[#E8732A]'
                                : 'text-[#555555]'
                            }`}
                          >
                            {STEP_LABELS[stepKey]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
