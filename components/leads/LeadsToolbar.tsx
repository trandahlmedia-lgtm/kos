'use client'

import { LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, FlaskConical } from 'lucide-react'
import { BatchResearchProgress } from './BatchResearchProgress'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { Lead, LeadSource, LeadHeatLevel, LeadStage } from '@/types'
import {
  type ViewMode,
  type SortKey,
  type SortDirection,
  type FilterState,
  DEFAULT_FILTERS,
  SORT_LABELS,
  STAGE_LABELS,
  SOURCE_LABELS,
  HEAT_LABELS,
  countActiveFilters,
  getDistinctIndustries,
} from './leadsUtils'

const ALL_SOURCES: LeadSource[] = ['cold_call', 'referral', 'inbound', 'scraped', 'other']
const ALL_HEAT_LEVELS: LeadHeatLevel[] = ['hot', 'good', 'maybe', 'cut']
const ALL_STAGES: LeadStage[] = ['new', 'reached_out', 'connected', 'interested', 'proposal_sent', 'won', 'lost']
const SORT_KEYS: SortKey[] = ['priority', 'review_count', 'rating', 'ai_score', 'newest']

interface LeadsToolbarProps {
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  sortKey: SortKey
  onSortChange: (k: SortKey) => void
  sortDirection: SortDirection
  onSortDirectionChange: (d: SortDirection) => void
  filters: FilterState
  onFiltersChange: (f: FilterState) => void
  allLeads: Lead[]
  filteredCount: number
  totalCount: number
  onBatchResearch?: (leadIds: string[]) => void
  batchLeadIds?: string[]
  onBatchComplete?: () => void
}

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

export function LeadsToolbar({
  view,
  onViewChange,
  sortKey,
  onSortChange,
  sortDirection,
  onSortDirectionChange,
  filters,
  onFiltersChange,
  allLeads,
  filteredCount,
  totalCount,
  onBatchResearch,
  batchLeadIds,
  onBatchComplete,
}: LeadsToolbarProps) {
  const activeFilterCount = countActiveFilters(filters)
  const industries = getDistinctIndustries(allLeads)

  const viewBtn = (mode: ViewMode, icon: React.ReactNode) => (
    <button
      onClick={() => onViewChange(mode)}
      className={`p-1.5 rounded transition-colors ${
        view === mode
          ? 'text-white bg-[#1a1a1a]'
          : 'text-[#555555] hover:text-[#999999]'
      }`}
    >
      {icon}
    </button>
  )

  return (
    <div className="flex items-center gap-2 px-6 py-2.5 border-b border-[#2a2a2a] shrink-0">
      {/* View toggle */}
      <div className="flex items-center gap-0.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded p-0.5">
        {viewBtn('kanban', <LayoutGrid size={14} />)}
        {viewBtn('list', <List size={14} />)}
      </div>

      {/* Right group */}
      <div className="ml-auto flex items-center gap-2">
        {/* Sort dropdown + direction toggle */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-1.5 border border-[#2a2a2a] border-r-0 text-[#999999] hover:text-white h-7 text-xs px-2.5 rounded-l-md bg-transparent transition-colors"
            >
              <ArrowUpDown size={13} />
              {SORT_LABELS[sortKey]}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={sortKey}
                  onValueChange={(v) => onSortChange(v as SortKey)}
                >
                  {SORT_KEYS.map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {SORT_LABELS[key]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => onSortDirectionChange(sortDirection === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center justify-center border border-[#2a2a2a] text-[#999999] hover:text-white h-7 w-7 rounded-r-md bg-transparent transition-colors"
            title={sortDirection === 'desc' ? 'Highest first' : 'Lowest first'}
          >
            {sortDirection === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
          </button>
        </div>

        {/* Filters dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center gap-1.5 border border-[#2a2a2a] text-[#999999] hover:text-white h-7 text-xs px-2.5 rounded-md bg-transparent transition-colors"
          >
            <Filter size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-[#E8732A] text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[280px]">
            {/* Website */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Website</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filters.hasWebsite}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, hasWebsite: v as FilterState['hasWebsite'] })
                }
              >
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="no">No Website</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="yes">Has Website</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* AI Researched */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>AI Researched</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filters.aiResearched}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, aiResearched: v as FilterState['aiResearched'] })
                }
              >
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="yes">Researched</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="no">Not Researched</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Industry */}
            {industries.length > 0 && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Industry</DropdownMenuLabel>
                  {industries.map((ind) => (
                    <DropdownMenuCheckboxItem
                      key={ind}
                      checked={filters.industries.includes(ind)}
                      onCheckedChange={() =>
                        onFiltersChange({
                          ...filters,
                          industries: toggleInArray(filters.industries, ind),
                        })
                      }
                    >
                      {ind}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Source */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Source</DropdownMenuLabel>
              {ALL_SOURCES.map((src) => (
                <DropdownMenuCheckboxItem
                  key={src}
                  checked={filters.sources.includes(src)}
                  onCheckedChange={() =>
                    onFiltersChange({
                      ...filters,
                      sources: toggleInArray(filters.sources, src),
                    })
                  }
                >
                  {SOURCE_LABELS[src]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Heat Level */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Heat Level</DropdownMenuLabel>
              {ALL_HEAT_LEVELS.map((heat) => (
                <DropdownMenuCheckboxItem
                  key={heat}
                  checked={filters.heatLevels.includes(heat)}
                  onCheckedChange={() =>
                    onFiltersChange({
                      ...filters,
                      heatLevels: toggleInArray(filters.heatLevels, heat),
                    })
                  }
                >
                  {HEAT_LABELS[heat]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Stage */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Stage</DropdownMenuLabel>
              {ALL_STAGES.map((stage) => (
                <DropdownMenuCheckboxItem
                  key={stage}
                  checked={filters.stages.includes(stage)}
                  onCheckedChange={() =>
                    onFiltersChange({
                      ...filters,
                      stages: toggleInArray(filters.stages, stage),
                    })
                  }
                >
                  {STAGE_LABELS[stage]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onFiltersChange(DEFAULT_FILTERS)}
                >
                  <X size={13} />
                  Clear all filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filtered count */}
        {filteredCount !== totalCount && (
          <span className="text-xs text-[#555555]">
            {filteredCount} of {totalCount}
          </span>
        )}

        {/* Batch research progress dropdown */}
        {(batchLeadIds?.length ?? 0) > 0 && onBatchComplete && (
          <BatchResearchProgress
            batchLeadIds={batchLeadIds!}
            onBatchComplete={onBatchComplete}
          />
        )}

        {/* Batch research buttons */}
        {onBatchResearch && (
          <>
            <div className="w-px h-4 bg-[#2a2a2a]" />
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-1.5 border border-[#2a2a2a] text-[#999999] hover:text-white h-7 text-xs px-2.5 rounded-md bg-transparent transition-colors"
              >
                <FlaskConical size={13} />
                Batch Research
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      const newLeads = allLeads.filter((l) => l.stage === 'new' && l.ai_score === null)
                      if (newLeads.length > 0) onBatchResearch(newLeads.map((l) => l.id))
                    }}
                  >
                    <FlaskConical size={13} className="mr-2" />
                    Research All New ({allLeads.filter((l) => l.stage === 'new' && l.ai_score === null).length})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const unresearched = allLeads.filter((l) => l.ai_score === null).slice(0, 20)
                      if (unresearched.length > 0) onBatchResearch(unresearched.map((l) => l.id))
                    }}
                  >
                    <FlaskConical size={13} className="mr-2" />
                    Research Top 20 ({Math.min(20, allLeads.filter((l) => l.ai_score === null).length)})
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  )
}
