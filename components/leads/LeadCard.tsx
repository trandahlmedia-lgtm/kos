'use client'

import { Phone, FlaskConical } from 'lucide-react'
import type { Lead } from '@/types'
import { ScoreDisplay } from './ScoreDisplay'

interface LeadCardProps {
  lead: Lead
  onClick: () => void
}

function researchBadge(score: number | null) {
  if (score === null) return null
  return (
    <span className="text-[10px] text-[#555555]">AI researched</span>
  )
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#111111] border border-[#2a2a2a] rounded-md px-3 py-2.5 hover:border-[#3a3a3a] hover:bg-[#161616] transition-colors"
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
        {researchBadge(lead.ai_score)}
      </div>
    </button>
  )
}
