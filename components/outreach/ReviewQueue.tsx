'use client'

import { Mail } from 'lucide-react'
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

export function ReviewQueue({ emails, sentEmails, settings, onEmailUpdated, onEmailDeleted }: ReviewQueueProps) {
  const sendingEnabled = settings?.sending_enabled ?? false

  // Group emails by lead, sorted by ai_score desc
  const grouped = groupByLead(emails)
  const sentGrouped = groupByLead(sentEmails)

  if (grouped.length === 0 && sentGrouped.length === 0) {
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

      {/* Recently sent */}
      {sentGrouped.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-[#555555] uppercase tracking-wide">
            Sent ({sentEmails.length} emails)
          </h3>
          {sentGrouped.map((group) => (
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
