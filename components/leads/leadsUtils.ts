import type { Lead, LeadSource, LeadHeatLevel, LeadStage } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewMode = 'kanban' | 'list'

export type SortKey = 'priority' | 'review_count' | 'rating' | 'ai_score' | 'newest'

export interface FilterState {
  hasWebsite: 'yes' | 'no' | 'all'
  aiResearched: 'yes' | 'no' | 'all'
  industries: string[]
  sources: LeadSource[]
  heatLevels: LeadHeatLevel[]
  stages: LeadStage[]
}

export const DEFAULT_FILTERS: FilterState = {
  hasWebsite: 'all',
  aiResearched: 'all',
  industries: [],
  sources: [],
  heatLevels: [],
  stages: [],
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  reached_out: 'Reached Out',
  connected: 'Connected',
  interested: 'Interested',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
}

export const SORT_LABELS: Record<SortKey, string> = {
  priority: 'Priority',
  review_count: 'Reviews',
  rating: 'Rating',
  ai_score: 'AI Score',
  newest: 'Newest',
}

export const SOURCE_LABELS: Record<LeadSource, string> = {
  cold_call: 'Cold Call',
  referral: 'Referral',
  inbound: 'Inbound',
  scraped: 'Scraped',
  other: 'Other',
}

export const HEAT_LABELS: Record<LeadHeatLevel, string> = {
  hot: 'Hot',
  good: 'Good',
  maybe: 'Maybe',
  cut: 'Cut',
}

// ---------------------------------------------------------------------------
// Score color (shared with ScoreDisplay)
// ---------------------------------------------------------------------------

export function scoreColor(score: number | null): string {
  if (score === null) return 'text-[#555555]'
  if (score >= 71) return 'text-green-400'
  if (score >= 41) return 'text-yellow-400'
  return 'text-red-400'
}

// ---------------------------------------------------------------------------
// Priority score — client-side ranking for sales triage
// ---------------------------------------------------------------------------

export function computePriorityScore(lead: Lead): number {
  let score = 0
  if (!lead.has_website) score += 1_000_000
  score += (lead.review_count ?? 0) * 10
  score += (lead.rating ?? 0) * 100
  return score
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export function sortLeads(leads: Lead[], sortKey: SortKey): Lead[] {
  const sorted = [...leads]
  switch (sortKey) {
    case 'priority':
      sorted.sort((a, b) => computePriorityScore(b) - computePriorityScore(a))
      break
    case 'review_count':
      sorted.sort((a, b) => (b.review_count ?? -1) - (a.review_count ?? -1))
      break
    case 'rating':
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
      break
    case 'ai_score':
      sorted.sort((a, b) => {
        if (a.ai_score === null && b.ai_score === null) return 0
        if (a.ai_score === null) return 1
        if (b.ai_score === null) return -1
        return b.ai_score - a.ai_score
      })
      break
    case 'newest':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      break
  }
  return sorted
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

export function filterLeads(leads: Lead[], filters: FilterState): Lead[] {
  return leads.filter((lead) => {
    if (filters.hasWebsite !== 'all') {
      const want = filters.hasWebsite === 'yes'
      if (lead.has_website !== want) return false
    }
    if (filters.aiResearched !== 'all') {
      const researched = lead.ai_score !== null
      if (filters.aiResearched === 'yes' && !researched) return false
      if (filters.aiResearched === 'no' && researched) return false
    }
    if (filters.industries.length > 0) {
      if (!lead.industry || !filters.industries.includes(lead.industry)) return false
    }
    if (filters.sources.length > 0) {
      if (!filters.sources.includes(lead.source)) return false
    }
    if (filters.heatLevels.length > 0) {
      if (!lead.heat_level || !filters.heatLevels.includes(lead.heat_level)) return false
    }
    if (filters.stages.length > 0) {
      if (!filters.stages.includes(lead.stage)) return false
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getDistinctIndustries(leads: Lead[]): string[] {
  return [...new Set(leads.map((l) => l.industry).filter(Boolean) as string[])].sort()
}

export function countActiveFilters(filters: FilterState): number {
  let count = 0
  if (filters.hasWebsite !== 'all') count++
  if (filters.aiResearched !== 'all') count++
  if (filters.industries.length > 0) count++
  if (filters.sources.length > 0) count++
  if (filters.heatLevels.length > 0) count++
  if (filters.stages.length > 0) count++
  return count
}
