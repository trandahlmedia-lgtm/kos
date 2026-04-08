'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Plus, Upload, FlaskConical, X } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { KanbanColumn } from './KanbanColumn'
import { LeadCard } from './LeadCard'
import { LeadDetailPanel } from './LeadDetailPanel'
import { NewLeadDialog } from './NewLeadDialog'
import { BulkImportDialog } from './BulkImportDialog'
import { LeadsToolbar } from './LeadsToolbar'
import { LeadsListView } from './LeadsListView'
import {
  type ViewMode,
  type SortKey,
  type SortDirection,
  type FilterState,
  DEFAULT_FILTERS,
  filterLeads,
  sortLeads,
} from './leadsUtils'
import type { Lead, LeadStage } from '@/types'

const STAGES: LeadStage[] = ['new', 'reached_out', 'connected', 'interested', 'proposal_sent', 'won', 'lost']

interface LeadsPageClientProps {
  initialLeads: Lead[]
}

export function LeadsPageClient({ initialLeads }: LeadsPageClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('kanban')
  const [sortKey, setSortKey] = useState<SortKey>('priority')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  // Research tracking — poll for leads with status 'running'
  const [researchingLeadIds, setResearchingLeadIds] = useState<Set<string>>(new Set())
  const researchPollRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const controller = new AbortController()
    async function pollResearching() {
      try {
        const res = await fetch('/api/ai/lead-research/running', { signal: controller.signal })
        if (controller.signal.aborted) return
        if (res.ok) {
          const data = await res.json() as { lead_ids: string[] }
          if (!controller.signal.aborted) setResearchingLeadIds(new Set(data.lead_ids))
        }
      } catch {
        if (controller.signal.aborted) return
      }
      if (!controller.signal.aborted) {
        researchPollRef.current = setTimeout(pollResearching, 3000)
      }
    }
    pollResearching()
    return () => {
      controller.abort()
      clearTimeout(researchPollRef.current)
    }
  }, [])

  // Batch selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [batchLeadIds, setBatchLeadIds] = useState<Set<string>>(new Set())

  function toggleLeadSelection(id: string) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllLeads(leadIds: string[]) {
    setSelectedLeadIds(new Set(leadIds))
  }

  function clearSelection() {
    setSelectedLeadIds(new Set())
  }

  // Abort controller for client-driven sequential processing
  const batchAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { batchAbortRef.current?.abort() }
  }, [])

  async function startBatchResearch(leadIds: string[]) {
    batchAbortRef.current?.abort()
    clearSelection()
    try {
      const res = await fetch('/api/ai/lead-research/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        console.error('[batch-research]', err.error)
        return
      }
      const data = await res.json() as { lead_ids: string[] }
      setBatchLeadIds(new Set(data.lead_ids))

      // Drive sequential processing from the client — one lead at a time
      const controller = new AbortController()
      batchAbortRef.current = controller
      for (const id of data.lead_ids) {
        if (controller.signal.aborted) break
        try {
          const processRes = await fetch('/api/ai/lead-research/process-one', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: id }),
            signal: controller.signal,
          })
          if (!processRes.ok && processRes.status === 401) break
        } catch (err) {
          if (controller.signal.aborted) break
          console.error(`[batch-research] Failed to process ${id}:`, err)
        }
      }
    } catch {
      // ignore
    }
  }

  const handleBatchComplete = useCallback(() => {
    setBatchLeadIds(new Set())
    window.location.reload()
  }, [])

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  function openLead(lead: Lead) {
    setSelectedLeadId(lead.id)
    setPanelOpen(true)
  }

  function handleLeadUpdated(updated: Lead) {
    setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l))
  }

  function handleLeadDeleted(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  function handleLeadCreated(lead: Lead) {
    setLeads((prev) => [lead, ...prev])
  }

  // --- Drag and Drop handlers ---

  const activeLead = activeId ? leads.find((l) => l.id === activeId) ?? null : null

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback(() => {
    // Visual feedback handled by useDroppable's isOver in KanbanColumn
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const overData = over.data.current as { type: string; stage?: LeadStage; lead?: Lead } | undefined

    // Determine target stage
    let targetStage: LeadStage | null = null
    if (overData?.type === 'column' && overData.stage) {
      targetStage = overData.stage
    } else if (overData?.type === 'lead' && overData.lead) {
      targetStage = overData.lead.stage
    }
    if (!targetStage) return

    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage === targetStage) return

    // Optimistic update
    const previousLeads = [...leads]
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, stage: targetStage } : l
      )
    )

    // Server update
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      })
      if (!res.ok) throw new Error('Failed to update stage')
    } catch {
      // Revert on failure
      setLeads(previousLeads)
    }
  }, [leads])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  // --- Derived data ---

  // Stable array reference — only recreates when the Set itself changes
  const batchLeadIdsArray = useMemo(() => [...batchLeadIds], [batchLeadIds])

  const filteredLeads = filterLeads(leads, filters)
  const sortedLeads = sortLeads(filteredLeads, sortKey, sortDirection)

  const leadsByStage = STAGES.reduce<Record<LeadStage, Lead[]>>(
    (acc, stage) => {
      acc[stage] = sortedLeads.filter((l) => l.stage === stage)
      return acc
    },
    {} as Record<LeadStage, Lead[]>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white">Leads</h1>
          <p className="text-xs text-[#555555] mt-0.5">{leads.length} total</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="border-[#2a2a2a] text-[#999999] hover:text-white h-8 text-sm"
          >
            <Upload size={14} className="mr-1" />
            Import CSV
          </Button>
          <Button
            onClick={() => setNewLeadOpen(true)}
            className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-8 text-sm"
          >
            <Plus size={14} className="mr-1" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <LeadsToolbar
        view={view}
        onViewChange={setView}
        sortKey={sortKey}
        onSortChange={setSortKey}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        filters={filters}
        onFiltersChange={setFilters}
        allLeads={leads}
        filteredCount={filteredLeads.length}
        totalCount={leads.length}
        onBatchResearch={startBatchResearch}
        batchLeadIds={batchLeadIdsArray}
        onBatchComplete={handleBatchComplete}
      />

      {/* View area */}
      {view === 'kanban' ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-4 px-6 py-5 min-w-max">
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  leads={leadsByStage[stage]}
                  onLeadClick={openLead}
                  researchingLeadIds={researchingLeadIds}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeLead ? (
              <div className="w-[220px]">
                <LeadCard lead={activeLead} onClick={() => {}} isDragOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex-1 overflow-auto px-6 py-4">
          <LeadsListView
            leads={sortedLeads}
            onLeadClick={openLead}
            totalCount={leads.length}
            researchingLeadIds={researchingLeadIds}
            selectedLeadIds={selectedLeadIds}
            onToggleSelect={toggleLeadSelection}
            onSelectAll={selectAllLeads}
          />
        </div>
      )}

      {/* Floating action bar for selected leads */}
      {selectedLeadIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg shadow-black/50 px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm text-white font-medium">{selectedLeadIds.size} selected</span>
          <Button
            onClick={() => startBatchResearch([...selectedLeadIds])}
            className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-7 text-xs px-3"
          >
            <FlaskConical size={12} className="mr-1" />
            Research Selected
          </Button>
          <button
            onClick={clearSelection}
            className="text-[#555555] hover:text-white transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Detail panel */}
      <LeadDetailPanel
        leadId={selectedLeadId}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onLeadUpdated={handleLeadUpdated}
        onLeadDeleted={handleLeadDeleted}
      />

      {/* New lead dialog */}
      <NewLeadDialog
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        onCreated={handleLeadCreated}
      />

      {/* Bulk import dialog */}
      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => window.location.reload()}
      />
    </div>
  )
}
