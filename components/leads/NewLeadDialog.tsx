'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createLead } from '@/lib/actions/leads'
import type { Lead, LeadSource } from '@/types'

interface NewLeadDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (lead: Lead) => void
}

export function NewLeadDialog({ open, onClose, onCreated }: NewLeadDialogProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    business_name: '',
    phone: '',
    source: 'cold_call' as LeadSource,
    notes: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleClose() {
    setForm({ business_name: '', phone: '', source: 'cold_call', notes: '' })
    setError('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.business_name.trim()) { setError('Business name is required'); return }
    setSaving(true)
    setError('')

    const { lead, error: createError } = await createLead({
      business_name: form.business_name.trim(),
      phone: form.phone || null,
      source: form.source,
      notes: form.notes || null,
    })

    setSaving(false)
    if (createError || !lead) { setError(createError ?? 'Failed to create lead'); return }
    onCreated(lead)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="bg-[#111111] border-[#2a2a2a] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">New Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label className="text-xs text-[#555555]">Business Name *</Label>
            <Input
              value={form.business_name}
              onChange={(e) => set('business_name', e.target.value)}
              placeholder="Northern Standard Heating & Air"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-sm"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#555555]">Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="(612) 555-0100"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-sm h-8"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#555555]">Source</Label>
            <select
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm text-white px-2 py-1.5 focus:outline-none focus:border-[#E8732A]"
            >
              <option value="cold_call">Cold Call</option>
              <option value="referral">Referral</option>
              <option value="inbound">Inbound</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#555555]">Call Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Quick notes from the call..."
              rows={3}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-sm resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={handleClose} className="text-[#555555]">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0">
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Add Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
