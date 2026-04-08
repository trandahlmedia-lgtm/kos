'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateOutreachEmail } from '@/lib/actions/outreach'
import type { OutreachEmail } from '@/types'

interface EmailEditorProps {
  email: OutreachEmail
  onSaved: (email: OutreachEmail) => void
  onCancel: () => void
}

export function EmailEditor({ email, onSaved, onCancel }: EmailEditorProps) {
  const [subject, setSubject] = useState(email.subject)
  const [bodyText, setBodyText] = useState(email.body_text)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    // Generate simple HTML from text
    const bodyHtml = bodyText
      .split('\n\n')
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('')

    const { email: updated } = await updateOutreachEmail(email.id, {
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
    })
    if (updated) onSaved(updated)
    setSaving(false)
  }

  return (
    <div className="bg-[#111111] border border-[#E8732A]/30 rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#E8732A] font-medium">Editing</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-6 w-6 p-0 text-[#555555] hover:text-white">
            <X size={12} />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-[#555555] uppercase tracking-wide">Subject</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-[#0a0a0a] border-[#2a2a2a] text-sm text-white h-8"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-[#555555] uppercase tracking-wide">Body</label>
        <Textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={10}
          className="bg-[#0a0a0a] border-[#2a2a2a] text-sm text-white resize-y"
        />
      </div>

      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || !subject.trim() || !bodyText.trim()}
        className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-7 text-xs"
      >
        <Save size={10} className="mr-1" />
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}
