'use client'

import { useState } from 'react'
import { Check, Send, Trash2, Pencil, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmailEditor } from './EmailEditor'
import { approveOutreachEmail, deleteOutreachEmail, markAsReplied } from '@/lib/actions/outreach'
import type { OutreachEmail } from '@/types'

const TEMPLATE_LABELS: Record<string, string> = {
  initial: 'Initial',
  followup_1: 'FU #1 · 3 day',
  followup_2: 'FU #2 · 7 day',
  followup_3: 'FU #3 · 14 day',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-[#1a1a1a] text-[#555555]',
  queued: 'bg-blue-400/10 text-blue-400',
  sent: 'bg-green-400/10 text-green-400',
  delivered: 'bg-green-400/10 text-green-400',
  opened: 'bg-[#E8732A]/10 text-[#E8732A]',
  replied: 'bg-purple-400/10 text-purple-400',
  bounced: 'bg-red-400/10 text-red-400',
}

interface EmailCardProps {
  email: OutreachEmail
  sendingEnabled: boolean
  onUpdated: (email: OutreachEmail) => void
  onDeleted: (id: string) => void
}

export function EmailCard({ email, sendingEnabled, onUpdated, onDeleted }: EmailCardProps) {
  const [editing, setEditing] = useState(false)
  const [approving, setApproving] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [replying, setReplying] = useState(false)

  const isDraft = email.status === 'draft'
  const isQueued = email.status === 'queued'
  const isSent = email.status === 'sent' || email.status === 'delivered' || email.status === 'opened'

  async function handleApprove() {
    setApproving(true)
    const { email: updated } = await approveOutreachEmail(email.id)
    if (updated) onUpdated(updated)
    setApproving(false)
  }

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: email.id }),
      })
      if (res.ok) {
        onUpdated({ ...email, status: 'sent', sent_at: new Date().toISOString() })
      }
    } finally {
      setSending(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this email draft?')) return
    setDeleting(true)
    const { error } = await deleteOutreachEmail(email.id)
    if (!error) onDeleted(email.id)
    setDeleting(false)
  }

  async function handleMarkReplied() {
    setReplying(true)
    const { error } = await markAsReplied(email.id)
    if (!error) onUpdated({ ...email, status: 'replied', replied_at: new Date().toISOString() })
    setReplying(false)
  }

  if (editing) {
    return (
      <EmailEditor
        email={email}
        onSaved={(updated) => { onUpdated(updated); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#555555] shrink-0">
            {TEMPLATE_LABELS[email.template_type] ?? email.template_type}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${STATUS_STYLES[email.status] ?? ''}`}>
            {email.status}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isDraft && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-6 w-6 p-0 text-[#555555] hover:text-white">
                <Pencil size={12} />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleApprove} disabled={approving} className="h-6 w-6 p-0 text-[#555555] hover:text-green-400">
                <Check size={12} />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting} className="h-6 w-6 p-0 text-[#555555] hover:text-red-400">
                <Trash2 size={12} />
              </Button>
            </>
          )}
          {isQueued && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-6 w-6 p-0 text-[#555555] hover:text-white">
                <Pencil size={12} />
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || !sendingEnabled}
                className="h-6 text-xs bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 px-2"
                title={!sendingEnabled ? 'Enable sending in settings first' : undefined}
              >
                <Send size={10} className="mr-1" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </>
          )}
          {isSent && email.status !== 'replied' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkReplied}
              disabled={replying}
              className="h-6 text-xs text-[#555555] hover:text-purple-400 px-2"
            >
              <MessageCircle size={10} className="mr-1" />
              Mark Replied
            </Button>
          )}
        </div>
      </div>

      {/* Subject */}
      <p className="text-sm font-medium text-white leading-tight">{email.subject}</p>

      {/* Body preview */}
      <p className="text-xs text-[#999999] leading-relaxed line-clamp-3">{email.body_text}</p>

      {/* Timestamps */}
      {email.sent_at && (
        <div className="flex gap-3 text-[10px] text-[#555555]">
          <span>Sent {new Date(email.sent_at).toLocaleDateString()}</span>
          {email.opened_at && <span>· Opened {new Date(email.opened_at).toLocaleDateString()}</span>}
          {email.replied_at && <span className="text-purple-400">· Replied {new Date(email.replied_at).toLocaleDateString()}</span>}
          {email.bounced_at && <span className="text-red-400">· Bounced</span>}
        </div>
      )}
    </div>
  )
}
