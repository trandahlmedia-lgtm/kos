'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, UserCheck, Ban, RotateCcw } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LeadOverviewTab } from './LeadOverviewTab'
import { LeadResearchTab } from './LeadResearchTab'
import { LeadNotesTab } from './LeadNotesTab'
import { CallPrepTab } from './CallPrepTab'
import { ConvertLeadDialog } from './ConvertLeadDialog'
import { DisqualifyDialog } from './DisqualifyDialog'
import { QuickLinks } from './QuickLinks'
import type { Lead, LeadResearch, LeadActivity, LeadStage } from '@/types'

interface LeadDetailData {
  lead: Lead
  research: LeadResearch | null
  activities: LeadActivity[]
  hasOutreachDrafts?: boolean
}

interface LeadDetailPanelProps {
  leadId: string | null
  open: boolean
  onClose: () => void
  onLeadUpdated: (lead: Lead) => void
  onLeadDeleted: (id: string) => void
}

export function LeadDetailPanel({
  leadId,
  open,
  onClose,
  onLeadUpdated,
  onLeadDeleted,
}: LeadDetailPanelProps) {
  const [data, setData] = useState<LeadDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showConvert, setShowConvert] = useState(false)
  const [showDisqualify, setShowDisqualify] = useState(false)
  const [requalifying, setRequalifying] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!leadId) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/leads/${leadId}`, { signal })
      if (!res.ok) {
        setLoadError('Failed to load lead details')
        return
      }
      const json = await res.json() as LeadDetailData
      setData(json)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLoadError('Failed to load lead details')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    if (open && leadId) {
      const controller = new AbortController()
      fetchData(controller.signal)
      return () => controller.abort()
    }
    if (!open) {
      setData(null)
      setLoadError(null)
    }
  }, [open, leadId, fetchData])

  async function handleUpdate(updates: Partial<Lead>) {
    if (!leadId) return
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) return
    await fetchData()
    if (data?.lead) onLeadUpdated({ ...data.lead, ...updates })
  }

  async function handleStageChange(stage: LeadStage, lostReason?: string) {
    if (!leadId) return
    const res = await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, lost_reason: lostReason }),
    })
    if (!res.ok) return
    await fetchData()
    if (data?.lead) onLeadUpdated({ ...data.lead, stage })
  }

  async function handleDelete() {
    if (!leadId || !data?.lead) return
    if (!confirm(`Delete ${data.lead.business_name}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' })
      if (!res.ok) {
        setDeleting(false)
        return
      }
      onLeadDeleted(leadId)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  async function handleDisqualify(reason: string) {
    if (!leadId) return
    const res = await fetch(`/api/leads/${leadId}/disqualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) throw new Error('Failed to disqualify lead')
    const json = await res.json() as { lead: Lead }
    onLeadUpdated(json.lead)
    await fetchData()
  }

  async function handleRequalify() {
    if (!leadId) return
    setRequalifying(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/requalify`, { method: 'POST' })
      if (!res.ok) {
        setLoadError('Failed to re-qualify lead')
        return
      }
      const json = await res.json() as { lead: Lead }
      onLeadUpdated(json.lead)
      await fetchData()
    } finally {
      setRequalifying(false)
    }
  }

  const lead = data?.lead
  const isWon = lead?.stage === 'won'
  const isDisqualified = lead?.stage === 'lost' && lead?.heat_level === 'cut'

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <SheetContent
          side="right"
          className="bg-[#111111] border-l border-[#2a2a2a] w-[480px] sm:w-[520px] p-0 flex flex-col"
        >
          {loading ? (
            <div className="flex items-center justify-center flex-1" role="status" aria-label="Loading lead details">
              <div className="w-5 h-5 border-2 border-[#E8732A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center px-6" role="alert">
              <p className="text-sm text-red-400">{loadError}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fetchData()}
                className="text-xs text-[#999999] hover:text-white"
              >
                Retry
              </Button>
            </div>
          ) : !lead ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-[#555555]">No lead selected</p>
            </div>
          ) : (
            <>
              <SheetHeader className="px-5 py-4 border-b border-[#2a2a2a] shrink-0">
                <div className="flex items-start gap-3">
                  <SheetTitle className="text-white text-base leading-tight min-w-0 truncate">{lead.business_name}</SheetTitle>
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    {isWon && (
                      <Button
                        size="sm"
                        onClick={() => setShowConvert(true)}
                        className="h-7 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30"
                      >
                        <UserCheck size={12} className="mr-1" />
                        Convert
                      </Button>
                    )}
                    {isDisqualified ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRequalify}
                        disabled={requalifying}
                        className="h-7 text-xs text-[#999999] hover:text-white"
                      >
                        <RotateCcw size={12} className="mr-1" />
                        Re-qualify
                      </Button>
                    ) : !isWon && lead.stage !== 'lost' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDisqualify(true)}
                        className="h-7 text-xs text-[#555555] hover:text-red-400"
                      >
                        <Ban size={12} className="mr-1" />
                        Disqualify
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDelete}
                      disabled={deleting}
                      aria-label={`Delete ${lead.business_name}`}
                      className="h-7 w-7 p-0 text-[#555555] hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {lead.industry && (
                    <p className="text-xs text-[#555555]">{lead.industry}{lead.service_area ? ` · ${lead.service_area}` : ''}</p>
                  )}
                  <QuickLinks lead={lead} research={data?.research ?? null} />
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="shrink-0 bg-transparent border-b border-[#2a2a2a] rounded-none px-5 gap-0 justify-start">
                  <TabsTrigger value="overview" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white text-[#555555] px-3 py-2">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="call-prep" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white text-[#555555] px-3 py-2">
                    Call Prep
                  </TabsTrigger>
                  <TabsTrigger value="research" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white text-[#555555] px-3 py-2">
                    Research
                    {lead.ai_score !== null && (
                      <span className="ml-1.5 text-[9px] bg-[#E8732A]/20 text-[#E8732A] px-1 rounded">{lead.ai_score}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white text-[#555555] px-3 py-2">
                    Notes
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="overview" className="m-0 p-5">
                    <LeadOverviewTab lead={lead} onUpdate={handleUpdate} onStageChange={handleStageChange} />
                  </TabsContent>
                  <TabsContent value="call-prep" className="m-0 p-5">
                    <CallPrepTab lead={lead} research={data?.research ?? null} />
                  </TabsContent>
                  <TabsContent value="research" className="m-0 p-5">
                    <LeadResearchTab
                      leadId={lead.id}
                      leadName={lead.business_name}
                      leadEmail={lead.email}
                      aiScore={lead.ai_score}
                      hasExistingDrafts={data?.hasOutreachDrafts}
                      research={data?.research ?? null}
                      onResearchComplete={fetchData}
                    />
                  </TabsContent>
                  <TabsContent value="notes" className="m-0 p-5">
                    <LeadNotesTab lead={lead} activities={data?.activities ?? []} onUpdate={handleUpdate} />
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {lead && (
        <>
          <ConvertLeadDialog
            open={showConvert}
            lead={lead}
            research={data?.research ?? null}
            onClose={() => setShowConvert(false)}
          />
          <DisqualifyDialog
            open={showDisqualify}
            businessName={lead.business_name}
            onClose={() => setShowDisqualify(false)}
            onConfirm={handleDisqualify}
          />
        </>
      )}
    </>
  )
}
