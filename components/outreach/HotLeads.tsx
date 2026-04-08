'use client'

import { useState } from 'react'
import { Flame, Phone, Copy, Check, Globe, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Lead } from '@/types'

interface HotLeadsProps {
  leads: Lead[]
}

export function HotLeads({ leads }: HotLeadsProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Flame size={32} className="text-[#2a2a2a]" />
        <p className="text-sm text-[#555555]">No hot leads right now</p>
        <p className="text-xs text-[#555555]">Leads appear here when they reply to outreach or score 80+ with no website.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-red-400 uppercase tracking-wide">
        Call These People ({leads.length})
      </h3>
      {leads.map((lead) => (
        <HotLeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  )
}

function HotLeadCard({ lead }: { lead: Lead }) {
  const [copied, setCopied] = useState(false)

  function handleCopyPhone() {
    if (!lead.phone) return
    navigator.clipboard.writeText(lead.phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isReplied = lead.heat_level === 'hot'
  const hasNoWebsite = !lead.has_website

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{lead.business_name}</span>
            {lead.ai_score !== null && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                lead.ai_score >= 71 ? 'bg-green-400/10 text-green-400'
                  : lead.ai_score >= 41 ? 'bg-yellow-400/10 text-yellow-400'
                  : 'bg-red-400/10 text-red-400'
              }`}>
                {lead.ai_score}
              </span>
            )}
            {isReplied && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400">
                Replied
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#555555]">
            {lead.industry && <span>{lead.industry}</span>}
            {lead.service_area && (
              <>
                <MapPin size={10} />
                <span>{lead.service_area}</span>
              </>
            )}
          </div>
        </div>

        {lead.phone && (
          <Button
            onClick={handleCopyPhone}
            className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-8 text-sm shrink-0"
          >
            {copied ? <Check size={14} className="mr-1" /> : <Phone size={14} className="mr-1" />}
            {copied ? 'Copied!' : 'Call This Person'}
          </Button>
        )}
      </div>

      {/* Key signals */}
      <div className="flex flex-wrap gap-2">
        {hasNoWebsite && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-400/10 text-red-400 flex items-center gap-1">
            <Globe size={10} />
            No website
          </span>
        )}
        {lead.review_count !== null && lead.review_count > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] text-[#999999]">
            {lead.review_count} Google reviews
            {lead.rating ? ` · ${lead.rating}★` : ''}
          </span>
        )}
        {lead.ai_recommended_tier && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] text-[#999999] capitalize">
            {lead.ai_recommended_tier.replace('_', ' ')} tier
          </span>
        )}
        {lead.ai_recommended_mrr && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#E8732A]/10 text-[#E8732A]">
            ~${lead.ai_recommended_mrr}/mo
          </span>
        )}
      </div>

      {/* Phone display */}
      {lead.phone && (
        <div className="flex items-center gap-2 text-xs text-[#999999]">
          <Phone size={12} className="text-[#555555]" />
          <span className="font-mono">{lead.phone}</span>
          <button onClick={handleCopyPhone} className="text-[#555555] hover:text-white transition-colors">
            {copied ? <Check size={10} /> : <Copy size={10} />}
          </button>
        </div>
      )}

      {lead.email && (
        <div className="text-xs text-[#555555]">{lead.email}</div>
      )}
    </div>
  )
}
