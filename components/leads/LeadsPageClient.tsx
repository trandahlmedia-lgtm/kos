'use client'

import { useState, useCallback } from 'react'
import { Plus, Upload } from 'lucide-react'
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
          />
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
