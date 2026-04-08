'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Lead, LeadResearch } from '@/types'

interface ConvertLeadDialogProps {
  open: boolean
  lead: Lead
  research: LeadResearch | null
  onClose: () => void
}

const TIER_OPTIONS = [
  { value: 'starter', label: 'Starter ($500–$1,500/mo)' },
  { value: 'growth', label: 'Growth ($1,500–$3,000/mo)' },
  { value: 'full_service', label: 'Full Service ($3,000–$5,000/mo)' },
  { value: 'full_stack', label: 'Full Stack ($5,000+/mo)' },
]

export function ConvertLeadDialog({ open, lead, research, onClose }: ConvertLeadDialogProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Build pre-filled claude_md from research
  function buildClaudeMd(): string {
    const parts: string[] = [`# ${lead.business_name}`, '']
    if (lead.industry) parts.push(`**Industry:** ${lead.industry}`)
    if (lead.service_area) parts.push(`**Service Area:** ${lead.service_area}`)
    if (lead.website) parts.push(`**Website:** ${lead.website}`)
    parts.push('')

    if (research?.full_report) {
      parts.push('## Research Report', '', research.full_report, '')
    }

    let parsedSummary: Record<string, unknown> | null = null
    if (lead.ai_call_summary) {
      try { parsedSummary = JSON.parse(lead.ai_call_summary) as Record<string, unknown> } catch { /* skip */ }
    }
    if (parsedSummary) {
      parts.push('## Call Summary', '')
      if (parsedSummary.what_they_want) parts.push(`**What They Want:** ${parsedSummary.what_they_want}`)
      if (parsedSummary.pain_points && Array.isArray(parsedSummary.pain_points)) {
        parts.push('**Pain Points:**')
        ;(parsedSummary.pain_points as string[]).forEach((p) => parts.push(`- ${p}`))
      }
      if (parsedSummary.next_steps) parts.push(`**Next Steps:** ${parsedSummary.next_steps}`)
      parts.push('')
    }

    return parts.join('\n')
  }

  const [form, setForm] = useState({
    name: lead.business_name,
    phone: lead.phone ?? '',
    email: lead.email ?? '',
    website: lead.website ?? '',
    industry: lead.industry ?? '',
    service_area: lead.service_area ?? '',
    tier: lead.ai_recommended_tier ?? 'starter',
    mrr: lead.ai_recommended_mrr?.toString() ?? '',
    notes: lead.notes ?? '',
    claude_md: buildClaudeMd(),
  })

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
          industry: form.industry || null,
          service_area: form.service_area || null,
          tier: form.tier,
          mrr: form.mrr ? parseInt(form.mrr, 10) : 0,
          notes: form.notes || null,
          claude_md: form.claude_md,
        }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        setError(err.error ?? 'Conversion failed')
        return
      }

      const data = await res.json() as { client: { id: string } }
      router.push(`/clients/${data.client.id}`)
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-[#111111] border-[#2a2a2a] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Convert to Client — {lead.business_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#555555]">Client Name *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="bg-[#1a1a1a] border-[#2a2a2a] text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#555555]">Phone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="bg-[#1a1a1a] border-[#2a2a2a] text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#555555]">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="bg-[#1a1a1a] border-[#2a2a2a] text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#555555]">Website</Label>
              <Input value={form.website} onChange={(e) => set('website', e.target.value)} className="bg-[#1a1a1a] border-[#2a2a2a] text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#555555]">Industry</Label>
              <Input value={form.industry} onChange={(e) => set('industry', e.target.value)} className="bg-[#1a1a1a] border-[#2a2a2a] text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#555555]">Service Area</Label>
              <Input value={form.service_area} onChange={(e) => set('service_area', e.target.value)} className="bg-[#1a1a1a] border-[#2a2a2a] text-sm h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#555555]">Tier</Label>
              <select
                value={form.tier}
                onChange={(e) => set('tier', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm text-white px-2 py-1.5 focus:outline-none focus:border-[#E8732A]"
              >
                {TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#555555]">MRR ($)</Label>
              <Input type="number" value={form.mrr} onChange={(e) => set('mrr', e.target.value)} placeholder="3000" className="bg-[#1a1a1a] border-[#2a2a2a] text-sm h-8" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#555555]">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="bg-[#1a1a1a] border-[#2a2a2a] text-sm resize-none" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#555555]">CLAUDE.md (pre-filled from research)</Label>
            <Textarea value={form.claude_md} onChange={(e) => set('claude_md', e.target.value)} rows={8} className="bg-[#1a1a1a] border-[#2a2a2a] text-sm resize-none font-mono text-[#999999]" />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-[#555555]">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white border-0">
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Confirm & Create Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
