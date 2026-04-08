'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Lead, LeadStage } from '@/types'
import { LeadCard } from './LeadCard'
import { STAGE_LABELS } from './leadsUtils'

interface KanbanColumnProps {
  stage: LeadStage
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}

export function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  const isWon = stage === 'won'
  const isLost = stage === 'lost'

  const { isOver, setNodeRef } = useDroppable({
    id: `column-${stage}`,
    data: { type: 'column', stage },
  })

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

      {/* Cards — droppable area */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[120px] rounded-md p-1 -m-1 transition-colors ${
          isOver ? 'bg-[#E8732A]/5 ring-1 ring-[#E8732A]/20' : ''
        }`}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="border border-dashed border-[#2a2a2a] rounded-md h-20 flex items-center justify-center">
              <span className="text-[11px] text-[#333333]">Empty</span>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
