'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, UserCheck } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LeadOverviewTab } from './LeadOverviewTab'
import { LeadResearchTab } from './LeadResearchTab'
import { LeadNotesTab } from './LeadNotesTab'
import { CallPrepTab } from './CallPrepTab'
import { ConvertLeadDialog } from './ConvertLeadDialog'
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
  const [showConvert, setShowConvert] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      if (!res.ok) return
      const json = await res.json() as LeadDetailData
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    if (open && leadId) fetchData()
    if (!open) setData(null)
  }, [open, leadId, fetchData])

  async function handleUpdate(updates: Partial<Lead>) {
    if (!leadId) return
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    await fetchData()
    if (data?.lead) onLeadUpdated({ ...data.lead, ...updates })
  }

  async function handleStageChange(stage: LeadStage, lostReason?: string) {
    if (!leadId) return
    await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, lost_reason: lostReason }),
    })
    await fetchData()
    if (data?.lead) onLeadUpdated({ ...data.lead, stage })
  }

  async function handleDelete() {
    if (!leadId || !data?.lead) return
    if (!confirm(`Delete ${data.lead.business_name}? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/leads/${leadId}`, { method: 'DELETE' })
    onLeadDeleted(leadId)
    onClose()
    setDeleting(false)
  }

  const lead = data?.lead
  const isWon = lead?.stage === 'won'

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <SheetContent
          side="right"
          className="bg-[#111111] border-l border-[#2a2a2a] w-[480px] sm:w-[520px] p-0 flex flex-col"
        >
          {loading || !lead ? (
            <div className="flex items-center justify-center flex-1">
              <div className="w-5 h-5 border-2 border-[#E8732A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <SheetHeader className="px-5 py-4 border-b border-[#2a2a2a] shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <SheetTitle className="text-white text-base leading-tight">{lead.business_name}</SheetTitle>
                  <div className="flex items-center gap-1 shrink-0">
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="h-7 w-7 p-0 text-[#555555] hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                {lead.industry && (
                  <p className="text-xs text-[#555555] mt-0.5">{lead.industry}{lead.service_area ? ` · ${lead.service_area}` : ''}</p>
                )}
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
        <ConvertLeadDialog
          open={showConvert}
          lead={lead}
          research={data?.research ?? null}
          onClose={() => setShowConvert(false)}
        />
      )}
    </>
  )
}
