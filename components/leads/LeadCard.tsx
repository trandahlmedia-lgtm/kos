'use client'

import { Phone, FlaskConical, Loader2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Lead } from '@/types'
import { ScoreDisplay } from './ScoreDisplay'

interface LeadCardProps {
  lead: Lead
  onClick: () => void
  isDragOverlay?: boolean
  isResearching?: boolean
}

function researchBadge(score: number | null) {
  if (score === null) return null
  return (
    <span className="text-[10px] text-[#555555]">AI researched</span>
  )
}

export function LeadCard({ lead, onClick, isDragOverlay, isResearching }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full bg-[#1a1a1a] border border-[#E8732A]/30 rounded-md px-3 py-2.5 opacity-30"
      >
        <span className="text-sm text-transparent">{lead.business_name}</span>
      </div>
    )
  }

  return (
    <button
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      onClick={onClick}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
      className={`w-full text-left bg-[#111111] border border-[#2a2a2a] rounded-md px-3 py-2.5 hover:border-[#3a3a3a] hover:bg-[#161616] transition-colors ${
        isDragOverlay ? 'shadow-lg shadow-black/50 border-[#E8732A]/40 cursor-grabbing' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-white leading-tight truncate">
          {lead.business_name}
        </span>
        {lead.ai_score !== null && (
          <FlaskConical size={12} className="text-[#E8732A] shrink-0 mt-0.5" />
        )}
      </div>

      {lead.phone && (
        <div className="flex items-center gap-1 mt-1">
          <Phone size={10} className="text-[#555555]" />
          <span className="text-[11px] text-[#555555]">{lead.phone}</span>
        </div>
      )}

      {lead.industry && (
        <p className="text-[11px] text-[#555555] mt-0.5 truncate">{lead.industry}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <ScoreDisplay
          aiScore={lead.ai_score}
          manualScore={lead.manual_score}
          readonly
          size="sm"
        />
        {isResearching ? (
          <span className="flex items-center gap-1 text-[10px] text-[#E8732A]">
            <Loader2 size={10} className="animate-spin" />
            Researching
          </span>
        ) : researchBadge(lead.ai_score)}
      </div>
    </button>
  )
}
