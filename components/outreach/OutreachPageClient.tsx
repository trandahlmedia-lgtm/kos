'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReviewQueue } from './ReviewQueue'
import { FollowUpsDue } from './FollowUpsDue'
import { HotLeads } from './HotLeads'
import { OutreachStats } from './OutreachStats'
import { OutreachSettings } from './OutreachSettings'
import type { OutreachEmail, OutreachSettings as OutreachSettingsType, Lead } from '@/types'

export interface EmailWithLead extends OutreachEmail {
  leads: {
    business_name: string
    email: string | null
    ai_score: number | null
    phone: string | null
    industry: string | null
    service_area: string | null
    heat_level: string | null
  }
}

interface OutreachPageClientProps {
  initialEmails: EmailWithLead[]
  initialSettings: OutreachSettingsType | null
  initialHotLeads: Lead[]
  initialStats: {
    totalLeads: number
    researched: number
    emailed: number
    opened: number
    replied: number
    converted: number
    sentToday: number
    dailyLimit: number
  }
}

export function OutreachPageClient({
  initialEmails,
  initialSettings,
  initialHotLeads,
  initialStats,
}: OutreachPageClientProps) {
  const [emails, setEmails] = useState<EmailWithLead[]>(initialEmails)
  const [settings, setSettings] = useState<OutreachSettingsType | null>(initialSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const draftEmails = emails.filter((e) => e.status === 'draft' || e.status === 'queued')
  const followUpEmails = emails.filter(
    (e) => e.status === 'draft' && e.follow_up_number > 0
  )
  const sentEmails = emails.filter((e) => e.status === 'sent' || e.status === 'delivered' || e.status === 'opened')

  function handleEmailUpdated(updated: OutreachEmail) {
    setEmails((prev) => prev.map((e) => e.id === updated.id ? { ...e, ...updated } : e))
  }

  function handleEmailDeleted(id: string) {
    setEmails((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white">Outreach</h1>
          <p className="text-xs text-[#555555] mt-0.5">
            {initialStats.sentToday}/{initialStats.dailyLimit} sent today
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSettingsOpen(true)}
          className="border-[#2a2a2a] text-[#999999] hover:text-white h-8 text-sm"
        >
          <Settings size={14} className="mr-1" />
          Settings
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="review" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="shrink-0 bg-transparent border-b border-[#2a2a2a] rounded-none px-6 gap-0 justify-start">
          <TabsTrigger
            value="review"
            className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white text-[#555555] px-4 py-2.5"
          >
            Review Queue
            {draftEmails.length > 0 && (
              <span className="ml-1.5 text-[9px] bg-[#E8732A]/20 text-[#E8732A] px-1.5 rounded-full">
                {draftEmails.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="followups"
            className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white text-[#555555] px-4 py-2.5"
          >
            Follow-ups Due
            {followUpEmails.length > 0 && (
              <span className="ml-1.5 text-[9px] bg-yellow-400/20 text-yellow-400 px-1.5 rounded-full">
                {followUpEmails.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="hot"
            className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white text-[#555555] px-4 py-2.5"
          >
            Hot Leads
            {initialHotLeads.length > 0 && (
              <span className="ml-1.5 text-[9px] bg-red-400/20 text-red-400 px-1.5 rounded-full">
                {initialHotLeads.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white text-[#555555] px-4 py-2.5"
          >
            Stats
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="review" className="m-0 p-6">
            <ReviewQueue
              emails={draftEmails}
              sentEmails={sentEmails}
              settings={settings}
              onEmailUpdated={handleEmailUpdated}
              onEmailDeleted={handleEmailDeleted}
            />
          </TabsContent>
          <TabsContent value="followups" className="m-0 p-6">
            <FollowUpsDue
              emails={followUpEmails}
              settings={settings}
              onEmailUpdated={handleEmailUpdated}
            />
          </TabsContent>
          <TabsContent value="hot" className="m-0 p-6">
            <HotLeads leads={initialHotLeads} />
          </TabsContent>
          <TabsContent value="stats" className="m-0 p-6">
            <OutreachStats stats={initialStats} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Settings dialog */}
      <OutreachSettings
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSaved={setSettings}
      />
    </div>
  )
}
