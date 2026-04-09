'use client'

import { useState } from 'react'
import { Mail, ChevronDown, ChevronRight } from 'lucide-react'
import { EmailCard } from './EmailCard'
import type { OutreachEmail, OutreachSettings } from '@/types'
import type { EmailWithLead } from './OutreachPageClient'

interface ReviewQueueProps {
  emails: EmailWithLead[]
  sentEmails: EmailWithLead[]
  settings: OutreachSettings | null
  onEmailUpdated: (email: OutreachEmail) => void
  onEmailDeleted: (id: string) => void
}

function getTimeBucket(sentAt: string | null): 'today' | 'thisWeek' | 'earlier' {
  if (!sentAt) return 'earlier'
  const sent = new Date(sentAt)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (sent >= startOfToday) return 'today'
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  if (sent >= startOfWeek) return 'thisWeek'
  return 'earlier'
}

export function ReviewQueue({ emails, sentEmails, settings, onEmailUpdated, onEmailDeleted }: ReviewQueueProps) {
  const sendingEnabled = settings?.sending_enabled ?? false

  const grouped = groupByLead(emails)

  // Split sent emails into time buckets
  const todaySent = sentEmails.filter((e) => getTimeBucket(e.sent_at) === 'today')
  const weekSent = sentEmails.filter((e) => getTimeBucket(e.sent_at) === 'thisWeek')
  const earlierSent = sentEmails.filter((e) => getTimeBucket(e.sent_at) === 'earlier')

  if (grouped.length === 0 && sentEmails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Mail size={32} className="text-[#2a2a2a]" />
        <p className="text-sm text-[#555555]">No emails in the queue</p>
        <p className="text-xs text-[#555555]">Draft outreach from a lead&apos;s research tab to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending review */}
      {grouped.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-[#E8732A] uppercase tracking-wide">
            Awaiting Review ({emails.length} emails)
          </h3>
          {grouped.map((group) => (
            <LeadEmailGroup
              key={group.leadId}
              leadName={group.leadName}
              leadEmail={group.leadEmail}
              aiScore={group.aiScore}
              industry={group.industry}
              emails={group.emails}
              sendingEnabled={sendingEnabled}
              onEmailUpdated={onEmailUpdated}
              onEmailDeleted={onEmailDeleted}
            />
          ))}
        </div>
      )}

      {/* Sent — time-segmented */}
      {sentEmails.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-[#555555] uppercase tracking-wide">
            Sent ({sentEmails.length} emails)
          </h3>
          {todaySent.length > 0 && (
            <SentBucket
              label="Today"
              emails={todaySent}
              defaultOpen
              sendingEnabled={sendingEnabled}
              onEmailUpdated={onEmailUpdated}
              onEmailDeleted={onEmailDeleted}
            />
          )}
          {weekSent.length > 0 && (
            <SentBucket
              label="This Week"
              emails={weekSent}
              defaultOpen
              sendingEnabled={sendingEnabled}
              onEmailUpdated={onEmailUpdated}
              onEmailDeleted={onEmailDeleted}
            />
          )}
          {earlierSent.length > 0 && (
            <SentBucket
              label="Earlier"
              emails={earlierSent}
              defaultOpen={false}
              sendingEnabled={sendingEnabled}
              onEmailUpdated={onEmailUpdated}
              onEmailDeleted={onEmailDeleted}
            />
          )}
        </div>
      )}
    </div>
  )
}

interface SentBucketProps {
  label: string
  emails: EmailWithLead[]
  defaultOpen: boolean
  sendingEnabled: boolean
  onEmailUpdated: (email: OutreachEmail) => void
  onEmailDeleted: (id: string) => void
}

function SentBucket({ label, emails, defaultOpen, sendingEnabled, onEmailUpdated, onEmailDeleted }: SentBucketProps) {
  const [open, setOpen] = useState(defaultOpen)
  const groups = groupByLead(emails)

  return (
    <div className="border border-[#2a2a2a] rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#111111] hover:bg-[#161616] transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} className="text-[#555555]" /> : <ChevronRight size={14} className="text-[#555555]" />}
          <span className="text-xs font-medium text-[#999999]">{label}</span>
        </div>
        <span className="text-[10px] text-[#555555] bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5">
          {emails.length}
        </span>
      </button>
      {open && (
        <div className="p-3 space-y-4">
          {groups.map((group) => (
            <LeadEmailGroup
              key={group.leadId}
              leadName={group.leadName}
              leadEmail={group.leadEmail}
              aiScore={group.aiScore}
              industry={group.industry}
              emails={group.emails}
              sendingEnabled={sendingEnabled}
              onEmailUpdated={onEmailUpdated}
              onEmailDeleted={onEmailDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface LeadEmailGroupProps {
  leadName: string
  leadEmail: string | null
  aiScore: number | null
  industry: string | null
  emails: EmailWithLead[]
  sendingEnabled: boolean
  onEmailUpdated: (email: OutreachEmail) => void
  onEmailDeleted: (id: string) => void
}

function LeadEmailGroup({
  leadName,
  leadEmail,
  aiScore,
  industry,
  emails,
  sendingEnabled,
  onEmailUpdated,
  onEmailDeleted,
}: LeadEmailGroupProps) {
  return (
    <div className="space-y-2">
      {/* Lead header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white">{leadName}</span>
        {aiScore !== null && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            aiScore >= 71 ? 'bg-green-400/10 text-green-400'
              : aiScore >= 41 ? 'bg-yellow-400/10 text-yellow-400'
              : 'bg-red-400/10 text-red-400'
          }`}>
            {aiScore}
          </span>
        )}
        {industry && <span className="text-[10px] text-[#555555]">{industry}</span>}
        {leadEmail && <span className="text-[10px] text-[#555555]">· {leadEmail}</span>}
      </div>

      {/* Emails */}
      <div className="space-y-2 pl-3 border-l border-[#2a2a2a]">
        {emails
          .sort((a, b) => a.follow_up_number - b.follow_up_number)
          .map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              sendingEnabled={sendingEnabled}
              onUpdated={onEmailUpdated}
              onDeleted={onEmailDeleted}
            />
          ))}
      </div>
    </div>
  )
}

interface GroupedEmails {
  leadId: string
  leadName: string
  leadEmail: string | null
  aiScore: number | null
  industry: string | null
  emails: EmailWithLead[]
}

function groupByLead(emails: EmailWithLead[]): GroupedEmails[] {
  const map = new Map<string, GroupedEmails>()
  for (const email of emails) {
    const existing = map.get(email.lead_id)
    if (existing) {
      existing.emails.push(email)
    } else {
      map.set(email.lead_id, {
        leadId: email.lead_id,
        leadName: email.leads.business_name,
        leadEmail: email.leads.email,
        aiScore: email.leads.ai_score,
        industry: email.leads.industry,
        emails: [email],
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
}
