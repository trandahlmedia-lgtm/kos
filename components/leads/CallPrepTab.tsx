'use client'

import { useState } from 'react'
import { Phone, Copy, Check, Flame, Globe, Star, MapPin, Target } from 'lucide-react'
import type { Lead, LeadResearch } from '@/types'
import { scoreColor } from './leadsUtils'

interface CallPrepTabProps {
  lead: Lead
  research: LeadResearch | null
}

// ---------------------------------------------------------------------------
// Parse existing research into call-prep structure
// ---------------------------------------------------------------------------

interface CallPrepData {
  opener: string
  situation: string[]
  pitch: { services: string; tier: string; price: string } | null
  objections: string[]
  goal: string
}

function buildCallPrep(lead: Lead, research: LeadResearch | null): CallPrepData {
  const situation: string[] = []
  const objections: string[] = []
  let opener = ''
  let pitch: CallPrepData['pitch'] = null
  let goal = 'Book a follow-up call or send a proposal'

  // Build opener from lead data
  const hasReviews = (lead.review_count ?? 0) > 0
  const noWebsite = !lead.has_website
  const rating = lead.rating

  if (noWebsite && hasReviews && rating && rating >= 4) {
    opener = `You've got ${lead.review_count} reviews at ${rating} stars but no website sending you leads — I help ${lead.industry ?? 'businesses'} like yours fix that`
  } else if (noWebsite) {
    opener = `I noticed you don't have a website yet — for a ${lead.industry ?? 'business'} in ${lead.service_area ?? 'your area'}, that's leaving money on the table`
  } else if (hasReviews && rating && rating >= 4) {
    opener = `Your ${lead.review_count} reviews at ${rating} stars tell me you're doing great work — I help ${lead.industry ?? 'businesses'} turn that reputation into more booked jobs online`
  } else {
    opener = `I work with ${lead.industry ?? 'home service companies'} in ${lead.service_area ?? 'the area'} and wanted to see if you're looking for more leads from online`
  }

  // Build situation from research data
  if (research?.status === 'completed') {
    const websiteAudit = research.website_audit as Record<string, unknown> | null
    const socialAudit = research.social_audit as Record<string, unknown> | null
    const businessIntel = research.business_intel as Record<string, unknown> | null
    const serviceFit = research.service_fit as Record<string, unknown> | null
    const pricingAnalysis = research.pricing_analysis as Record<string, unknown> | null

    // Website situation
    if (noWebsite) {
      situation.push('No website — losing organic search traffic to competitors')
    } else if (websiteAudit) {
      const findings = websiteAudit.findings as string[] | undefined
      if (findings?.length) situation.push(findings[0])
    }

    // Social situation
    if (socialAudit) {
      const findings = socialAudit.findings as string[] | undefined
      if (findings?.length) situation.push(findings[0])
    }

    // Business intel
    if (businessIntel) {
      const findings = businessIntel.findings as string[] | undefined
      if (findings?.length) situation.push(findings[0])
    }

    // Reviews as social proof
    if (hasReviews) {
      situation.push(`${lead.review_count} Google reviews (${rating ?? '?'}★) — strong reputation to leverage`)
    }

    // Service fit → pitch
    if (serviceFit) {
      const services = serviceFit.services as Array<{ name: string; priority: string }> | undefined
      const highPriority = services?.filter((s) => s.priority === 'high').map((s) => s.name) ?? []
      const serviceList = highPriority.length > 0
        ? highPriority.join(', ')
        : services?.map((s) => s.name).slice(0, 3).join(', ') ?? ''

      if (pricingAnalysis) {
        const tier = String(pricingAnalysis.recommended_tier ?? '').replace(/_/g, ' ')
        const low = pricingAnalysis.mrr_low
        const high = pricingAnalysis.mrr_high
        pitch = {
          services: serviceList || 'Full-service marketing',
          tier: tier || 'custom',
          price: low && high ? `$${low}–$${high}/mo` : 'Custom pricing',
        }
      } else if (serviceList) {
        pitch = { services: serviceList, tier: '', price: '' }
      }
    }

    // Pricing from lead-level fields as fallback
    if (!pitch && lead.ai_recommended_tier) {
      pitch = {
        services: 'Based on AI research',
        tier: lead.ai_recommended_tier.replace(/_/g, ' '),
        price: lead.ai_recommended_mrr ? `~$${lead.ai_recommended_mrr}/mo` : '',
      }
    }

    // Objections from pricing analysis
    if (pricingAnalysis?.negotiation_notes) {
      objections.push(String(pricingAnalysis.negotiation_notes))
    }

    // Generic objections based on business type
    if (noWebsite) {
      objections.push('\u201cI get all my work from referrals\u201d \u2192 Referrals are great but they plateau. A website captures the people searching right now who don\u2019t know you yet.')
    }
    if ((lead.review_count ?? 0) < 10) {
      objections.push('\u201cI\u2019m too small for marketing\u201d \u2192 That\u2019s exactly when marketing has the biggest ROI. You\u2019re building the foundation for growth.')
    }
    if (objections.length < 2) {
      objections.push('\u201cWhat\u2019s it going to cost me?\u201d \u2192 Start with the lowest tier, show ROI in 90 days, then scale up.')
    }

    // Goal based on research score
    const score = research.overall_score ?? lead.ai_score ?? 0
    if (score >= 70) {
      goal = 'High-fit lead — aim to book a strategy call this week or send a proposal'
    } else if (score >= 40) {
      goal = 'Medium fit — qualify their budget and timeline, then propose if ready'
    } else {
      goal = 'Lower fit — quick qualification call, move to "maybe" or "cut" if not ready'
    }
  } else {
    // No research — build from lead data only
    if (noWebsite) situation.push('No website — potential for website build + SEO')
    if (hasReviews) situation.push(`${lead.review_count} Google reviews (${rating ?? '?'}★)`)
    if (lead.industry) situation.push(`Industry: ${lead.industry}`)
    if (!situation.length) situation.push('Limited info — this is a discovery call')

    objections.push('\u201cHow did you find me?\u201d \u2192 Google Maps research \u2014 saw your reviews and wanted to reach out.')
    objections.push('\u201cI\u2019m not interested\u201d \u2192 Totally fair. Just wanted to see if getting more leads online was on your radar. If not now, happy to follow up later.')
  }

  return { opener, situation, pitch, objections: objections.slice(0, 3), goal }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CallPrepTab({ lead, research }: CallPrepTabProps) {
  const [phoneCopied, setPhoneCopied] = useState(false)
  const prep = buildCallPrep(lead, research)

  function copyPhone() {
    if (!lead.phone) return
    navigator.clipboard.writeText(lead.phone)
    setPhoneCopied(true)
    setTimeout(() => setPhoneCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Essentials header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {lead.ai_score !== null && (
            <span className={`text-sm font-semibold ${scoreColor(lead.ai_score)}`}>
              {lead.ai_score}
            </span>
          )}
          {lead.heat_level === 'hot' && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#E8732A]/20 text-[#E8732A]">
              <Flame size={10} />
              Hot
            </span>
          )}
        </div>

        {/* Phone — large, click to copy */}
        {lead.phone ? (
          <button
            onClick={copyPhone}
            className="flex items-center gap-2 text-lg font-mono text-white hover:text-[#E8732A] transition-colors group"
          >
            <Phone size={16} className="text-[#E8732A]" />
            {lead.phone}
            {phoneCopied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} className="text-[#555555] group-hover:text-[#E8732A]" />
            )}
          </button>
        ) : (
          <p className="text-sm text-[#555555]">No phone number</p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-[#999999]">
          {lead.industry && <span>{lead.industry}</span>}
          {lead.service_area && (
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-[#555555]" />
              {lead.service_area}
            </span>
          )}
          {!lead.has_website && (
            <span className="flex items-center gap-1 text-red-400">
              <Globe size={10} />
              No website
            </span>
          )}
          {(lead.review_count ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Star size={10} className="text-yellow-400" />
              {lead.review_count} reviews · {lead.rating ?? '?'}★
            </span>
          )}
        </div>
      </div>

      {/* Opening line */}
      <PrepCard title="Opening Line" accent>
        <p className="text-sm text-white leading-relaxed">&ldquo;{prep.opener}&rdquo;</p>
      </PrepCard>

      {/* Their situation */}
      <PrepCard title="Their Situation">
        <ul className="space-y-1.5">
          {prep.situation.map((s, i) => (
            <li key={i} className="text-xs text-[#999999] pl-2 border-l-2 border-[#2a2a2a]">{s}</li>
          ))}
        </ul>
      </PrepCard>

      {/* What to pitch */}
      {prep.pitch && (
        <PrepCard title="What to Pitch">
          <div className="flex flex-wrap items-center gap-2">
            <Target size={12} className="text-[#E8732A]" />
            <span className="text-sm text-white">{prep.pitch.services}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            {prep.pitch.tier && (
              <span className="text-[#E8732A] capitalize">{prep.pitch.tier} tier</span>
            )}
            {prep.pitch.price && (
              <span className="text-[#999999]">{prep.pitch.price}</span>
            )}
          </div>
        </PrepCard>
      )}

      {/* Objection handles */}
      <PrepCard title="Objection Handles">
        <ul className="space-y-2">
          {prep.objections.map((o, i) => (
            <li key={i} className="text-xs text-[#999999] pl-2 border-l-2 border-red-400/30">{o}</li>
          ))}
        </ul>
      </PrepCard>

      {/* Goal */}
      <PrepCard title="Goal of This Call">
        <p className="text-sm text-[#E8732A]">{prep.goal}</p>
      </PrepCard>

      {/* Previous call notes (compact) */}
      {lead.call_notes && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-[#555555] uppercase tracking-wide">Previous Call Notes</span>
          <p className="text-xs text-[#999999] bg-[#0a0a0a] border border-[#2a2a2a] rounded-md p-2.5 max-h-24 overflow-y-auto whitespace-pre-wrap">
            {lead.call_notes}
          </p>
        </div>
      )}

      {/* Previous AI summary (compact) */}
      {lead.ai_call_summary && (() => {
        try {
          const summary = JSON.parse(lead.ai_call_summary) as Record<string, unknown>
          return (
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium text-[#555555] uppercase tracking-wide">AI Call Summary</span>
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-md p-2.5 space-y-1 text-xs">
                {typeof summary.what_they_want === 'string' && (
                  <p className="text-[#999999]"><span className="text-[#555555]">Want:</span> {summary.what_they_want}</p>
                )}
                {typeof summary.next_steps === 'string' && (
                  <p className="text-[#E8732A]"><span className="text-[#555555]">Next:</span> {summary.next_steps}</p>
                )}
                {typeof summary.overall_sentiment === 'string' && (
                  <p className="text-[#999999]"><span className="text-[#555555]">Sentiment:</span> {summary.overall_sentiment}</p>
                )}
              </div>
            </div>
          )
        } catch {
          return null
        }
      })()}
    </div>
  )
}

function PrepCard({ title, accent, children }: { title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-md p-3 space-y-2 ${accent ? 'bg-[#E8732A]/5 border border-[#E8732A]/20' : 'bg-[#111111] border border-[#2a2a2a]'}`}>
      <span className={`text-[10px] font-medium uppercase tracking-wide ${accent ? 'text-[#E8732A]' : 'text-[#555555]'}`}>
        {title}
      </span>
      {children}
    </div>
  )
}
