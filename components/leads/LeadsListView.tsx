'use client'

import { FlaskConical, Search, Loader2 } from 'lucide-react'
import type { Lead } from '@/types'
import { STAGE_LABELS, scoreColor } from './leadsUtils'
import { EmptyState } from '@/components/shared/EmptyState'

interface LeadsListViewProps {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  totalCount: number
  researchingLeadIds?: Set<string>
  selectedLeadIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAll?: (ids: string[]) => void
}

function stageColor(stage: Lead['stage']): string {
  if (stage === 'won') return 'text-green-400 bg-green-400/10 border-green-400/20'
  if (stage === 'lost') return 'text-red-400 bg-red-400/10 border-red-400/20'
  return 'text-[#999999] bg-[#1a1a1a] border-[#2a2a2a]'
}

export function LeadsListView({ leads, onLeadClick, totalCount, researchingLeadIds, selectedLeadIds, onToggleSelect, onSelectAll }: LeadsListViewProps) {
  const hasSelection = selectedLeadIds && onToggleSelect
  if (totalCount === 0) {
    return <EmptyState title="No leads yet" description="Import a CSV or add a lead manually." />
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={<Search size={20} />}
        title="No leads match your filters"
        description="Try adjusting the filters above."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-[#0a0a0a]">
          <tr>
            {hasSelection && (
              <th className="w-[40px] px-3 py-2 border-b border-[#2a2a2a]">
                <input
                  type="checkbox"
                  checked={leads.length > 0 && leads.every((l) => selectedLeadIds.has(l.id))}
                  onChange={() => {
                    if (leads.every((l) => selectedLeadIds.has(l.id))) {
                      onSelectAll?.([])
                    } else {
                      onSelectAll?.(leads.map((l) => l.id))
                    }
                  }}
                  className="accent-[#E8732A]"
                />
              </th>
            )}
            <th className="text-left text-[10px] uppercase tracking-wider text-[#555555] font-medium px-3 py-2 border-b border-[#2a2a2a]">
              Business Name
            </th>
            <th className="text-left text-[10px] uppercase tracking-wider text-[#555555] font-medium px-3 py-2 border-b border-[#2a2a2a] w-[140px]">
              Industry
            </th>
            <th className="text-right text-[10px] uppercase tracking-wider text-[#555555] font-medium px-3 py-2 border-b border-[#2a2a2a] w-[72px]">
              Rating
            </th>
            <th className="text-right text-[10px] uppercase tracking-wider text-[#555555] font-medium px-3 py-2 border-b border-[#2a2a2a] w-[72px]">
              Reviews
            </th>
            <th className="text-center text-[10px] uppercase tracking-wider text-[#555555] font-medium px-3 py-2 border-b border-[#2a2a2a] w-[80px]">
              Website
            </th>
            <th className="text-left text-[10px] uppercase tracking-wider text-[#555555] font-medium px-3 py-2 border-b border-[#2a2a2a] w-[130px]">
              Phone
            </th>
            <th className="text-right text-[10px] uppercase tracking-wider text-[#555555] font-medium px-3 py-2 border-b border-[#2a2a2a] w-[72px]">
              AI Score
            </th>
            <th className="text-left text-[10px] uppercase tracking-wider text-[#555555] font-medium px-3 py-2 border-b border-[#2a2a2a] w-[110px]">
              Stage
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onLeadClick(lead)}
              className="cursor-pointer hover:bg-[#161616] transition-colors border-b border-[#1a1a1a]"
            >
              {hasSelection && (
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.has(lead.id)}
                    onChange={() => onToggleSelect(lead.id)}
                    className="accent-[#E8732A]"
                  />
                </td>
              )}
              <td className="px-3 py-2.5 text-white font-medium truncate max-w-[300px]">
                {lead.business_name}
              </td>
              <td className="px-3 py-2.5 text-[#999999] truncate">
                {lead.industry ?? '—'}
              </td>
              <td className="px-3 py-2.5 text-[#999999] text-right">
                {lead.rating !== null ? `${lead.rating}/5` : '—'}
              </td>
              <td className="px-3 py-2.5 text-[#999999] text-right">
                {lead.review_count ?? '—'}
              </td>
              <td className="px-3 py-2.5 text-center">
                {lead.has_website ? (
                  <span className="text-green-400">Yes</span>
                ) : (
                  <span className="text-[#555555]">No</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-[#999999]">
                {lead.phone ?? '—'}
              </td>
              <td className="px-3 py-2.5 text-right">
                {researchingLeadIds?.has(lead.id) ? (
                  <span className="inline-flex items-center gap-1 text-[#E8732A] text-xs">
                    <Loader2 size={11} className="animate-spin" />
                    Running
                  </span>
                ) : lead.ai_score !== null ? (
                  <span className={`inline-flex items-center gap-1 ${scoreColor(lead.ai_score)}`}>
                    <FlaskConical size={11} className="text-[#E8732A]" />
                    {lead.ai_score}
                  </span>
                ) : (
                  <span className="text-[#555555]">&mdash;</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <span className={`inline-block text-[11px] px-2 py-0.5 rounded border ${stageColor(lead.stage)}`}>
                  {STAGE_LABELS[lead.stage]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
