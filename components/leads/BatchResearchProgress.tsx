'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, CheckCircle2, XCircle, Circle, ChevronDown } from 'lucide-react'

interface BatchItem {
  lead_id: string
  business_name: string
  status: string
  error_message?: string | null
  overall_score?: number | null
  steps: Record<string, 'complete' | 'running' | 'pending'>
}

interface BatchStatusResponse {
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
  batchLeadIds: string[]
  onBatchComplete: () => void
}

export function BatchResearchProgress({ batchLeadIds, onBatchComplete }: BatchResearchProgressProps) {
  const [items, setItems] = useState<BatchItem[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Poll for batch status — AbortController ensures stale responses are discarded
  useEffect(() => {
    if (batchLeadIds.length === 0) return
    const controller = new AbortController()
    let localTimerId: number
    const pollFn = async () => {
      if (controller.signal.aborted) return
      try {
        const res = await fetch(
          `/api/ai/lead-research/batch-status?lead_ids=${batchLeadIds.join(',')}`,
          { signal: controller.signal }
        )
        if (controller.signal.aborted) return
        if (res.ok) {
          const data = await res.json() as BatchStatusResponse
          if (controller.signal.aborted) return
          setItems(data.items)
          const allDone = data.items.every(
            (item) => item.status === 'completed' || item.status === 'failed' || item.status === 'none'
          )
          if (allDone && data.items.some((item) => item.status === 'completed' || item.status === 'failed')) {
            onBatchComplete()
            return
          }
        }
      } catch {
        if (controller.signal.aborted) return
      }
      if (!controller.signal.aborted) {
        localTimerId = window.setTimeout(pollFn, 2000) as unknown as number
      }
    }
    localTimerId = window.setTimeout(pollFn, 300) as unknown as number
    return () => {
      controller.abort()
      window.clearTimeout(localTimerId)
    }
  }, [batchLeadIds, onBatchComplete])

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

  if (batchLeadIds.length === 0) return null

  const completedCount = items.filter((i) => i.status === 'completed').length
  const failedCount = items.filter((i) => i.status === 'failed').length
  const totalCount = batchLeadIds.length
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
          <div className="px-3 py-2 border-b border-[#2a2a2a]">
            <p className="text-xs font-medium text-white">
              Batch Research — {completedCount + failedCount} of {totalCount}
            </p>
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
