'use client'

import type { Lead, LeadStage } from '@/types'
import { LeadCard } from './LeadCard'

const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  reached_out: 'Reached Out',
  connected: 'Connected',
  interested: 'Interested',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
}

interface KanbanColumnProps {
  stage: LeadStage
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}

export function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  const isWon = stage === 'won'
  const isLost = stage === 'lost'

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span
          className={`text-xs font-medium ${
            isWon ? 'text-green-400' : isLost ? 'text-red-400' : 'text-[#999999]'
          }`}
        >
          {STAGE_LABELS[stage]}
        </span>
        <span className="text-[10px] text-[#555555] bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 min-h-[120px]">
        {leads.length === 0 ? (
          <div className="border border-dashed border-[#2a2a2a] rounded-md h-20 flex items-center justify-center">
            <span className="text-[11px] text-[#333333]">Empty</span>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
          ))
        )}
      </div>
    </div>
  )
}
