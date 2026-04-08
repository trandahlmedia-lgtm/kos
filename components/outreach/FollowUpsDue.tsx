'use client'

import { Clock } from 'lucide-react'
import { EmailCard } from './EmailCard'
import type { OutreachEmail, OutreachSettings } from '@/types'
import type { EmailWithLead } from './OutreachPageClient'

interface FollowUpsDueProps {
  emails: EmailWithLead[]
  settings: OutreachSettings | null
  onEmailUpdated: (email: OutreachEmail) => void
}

const FOLLOW_UP_LABELS: Record<number, string> = {
  1: '3-day follow-up',
  2: '7-day follow-up',
  3: '14-day follow-up',
}

export function FollowUpsDue({ emails, settings, onEmailUpdated }: FollowUpsDueProps) {
  const sendingEnabled = settings?.sending_enabled ?? false

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Clock size={32} className="text-[#2a2a2a]" />
        <p className="text-sm text-[#555555]">No follow-ups due</p>
        <p className="text-xs text-[#555555]">Follow-ups appear here when scheduled sends are due.</p>
      </div>
    )
  }

  // Group by follow_up_number
  const byStep = new Map<number, EmailWithLead[]>()
  for (const email of emails) {
    const existing = byStep.get(email.follow_up_number)
    if (existing) existing.push(email)
    else byStep.set(email.follow_up_number, [email])
  }

  return (
    <div className="space-y-6">
      {Array.from(byStep.entries())
        .sort(([a], [b]) => a - b)
        .map(([step, stepEmails]) => (
          <div key={step} className="space-y-3">
            <h3 className="text-xs font-medium text-[#E8732A] uppercase tracking-wide">
              {FOLLOW_UP_LABELS[step] ?? `Follow-up #${step}`} ({stepEmails.length})
            </h3>
            {stepEmails.map((email) => (
              <div key={email.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{email.leads.business_name}</span>
                  {email.leads.ai_score !== null && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      email.leads.ai_score >= 71 ? 'bg-green-400/10 text-green-400'
                        : email.leads.ai_score >= 41 ? 'bg-yellow-400/10 text-yellow-400'
                        : 'bg-red-400/10 text-red-400'
                    }`}>
                      {email.leads.ai_score}
                    </span>
                  )}
                </div>
                <EmailCard
                  email={email}
                  sendingEnabled={sendingEnabled}
                  onUpdated={onEmailUpdated}
                  onDeleted={() => {}}
                />
              </div>
            ))}
          </div>
        ))}
    </div>
  )
}
