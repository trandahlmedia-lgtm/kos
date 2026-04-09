'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, CheckCircle2, Mail, ChevronDown } from 'lucide-react'

interface DraftItem {
  lead_id: string
  business_name: string
  status: 'drafting' | 'done'
}

interface ActiveDraftResponse {
  items: DraftItem[]
}

export function DraftProgress() {
  const [items, setItems] = useState<DraftItem[]>([])
  const [open, setOpen] = useState(true)
  const [visible, setVisible] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Poll for active drafts
  useEffect(() => {
    const controller = new AbortController()
    let localTimerId: number

    const pollFn = async () => {
      if (controller.signal.aborted) return
      try {
        const res = await fetch('/api/ai/outreach-draft/active', {
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (res.ok) {
          const data = await res.json() as ActiveDraftResponse
          if (controller.signal.aborted) return

          if (data.items.length > 0) {
            setItems(data.items)
            setVisible(true)
          } else {
            setVisible(false)
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

    localTimerId = window.setTimeout(pollFn, 1000) as unknown as number
    return () => {
      controller.abort()
      window.clearTimeout(localTimerId)
    }
  }, [])

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

  const draftingCount = items.filter((i) => i.status === 'drafting').length
  const doneCount = items.filter((i) => i.status === 'done').length
  const isRunning = draftingCount > 0

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
        <Mail size={12} />
        {isRunning ? `Drafting ${draftingCount}` : `Done ${doneCount}`}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-[280px] bg-[#111111] border border-[#2a2a2a] rounded-md shadow-lg shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#2a2a2a]">
            <p className="text-xs font-medium text-white">
              Email Drafts
            </p>
          </div>

          {/* List */}
          <div className="max-h-[300px] overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.lead_id}
                className={`flex items-center gap-2 px-3 py-2 ${
                  item.status === 'drafting' ? 'bg-[#1a1a1a]' : ''
                }`}
              >
                {item.status === 'drafting' ? (
                  <Loader2 size={14} className="text-[#E8732A] shrink-0 animate-spin" />
                ) : (
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                )}
                <span
                  className={`text-sm truncate ${
                    item.status === 'drafting'
                      ? 'text-[#E8732A] font-medium'
                      : 'text-white'
                  }`}
                >
                  {item.business_name}
                </span>
                <span className="ml-auto text-[10px] text-[#555555]">
                  {item.status === 'drafting' ? 'Drafting...' : 'Done'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
