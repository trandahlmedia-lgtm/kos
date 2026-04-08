'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateClientAction } from '@/lib/actions/clients'
import { formatPhoneDisplay, parsePhoneDigits } from '@/lib/utils'
import { type Client, type ClientTier, type Platform } from '@/types'

const TIERS: { value: ClientTier; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'full_service', label: 'Full Service' },
  { value: 'website', label: 'Website' },
  { value: 'full_stack', label: 'Full Stack' },
]

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'nextdoor', label: 'Nextdoor' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'churned', label: 'Churned' },
]

interface EditClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client
  profiles: { id: string; name: string }[]
}

export function EditClientDialog({ open, onOpenChange, client, profiles }: EditClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: client.name,
    email: client.email ?? '',
    // Normalize to raw digits in case DB has a formatted value from before this fix
    phone: parsePhoneDigits(client.phone ?? ''),
    website: client.website ?? '',
    tier: client.tier ?? '',
    mrr: client.mrr?.toString() ?? '',
    contract_start: client.contract_start ?? '',
    primary_producer: client.primary_producer ?? '',
    status: client.status,
    platforms: client.platforms ?? [],
  })

  function togglePlatform(platform: Platform) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(platform)
        ? f.platforms.filter((p) => p !== platform)
        : [...f.platforms, platform],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await updateClientAction(client.id, {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,        // raw digits, server strips non-digits too
        website: form.website || undefined,
        tier: (form.tier as ClientTier) || undefined,
        mrr: form.mrr ? parseFloat(form.mrr) : undefined,
        contract_start: form.contract_start || undefined,
        primary_producer: form.primary_producer || undefined,
        platforms: form.platforms,
      })
      onOpenChange(false)
    } catch (err) {
      // Surface validation and rate-limit messages from the server action.
      setError(err instanceof Error ? err.message : 'Failed to save changes. Please try again.')
      setLoading(false)
    }
  }

  const inputClass =
    'bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-[#555555] focus-visible:ring-[#E8732A] focus-visible:border-[#E8732A] h-9 text-sm'
  const labelClass = 'text-xs text-[#999999] font-medium'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className={labelClass}>Business Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Phone</Label>
              <Input
                value={formatPhoneDisplay(form.phone)}
                onChange={(e) => setForm((f) => ({ ...f, phone: parsePhoneDigits(e.target.value) }))}
                placeholder="(612) 555-0100"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                onBlur={(e) => {
                  const val = e.target.value.trim()
                  if (val && !/^https?:\/\//i.test(val)) {
                    setForm((f) => ({ ...f, website: `https://${val}` }))
                  }
                }}
                placeholder="example.com"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Contract Start</Label>
              <Input type="date" value={form.contract_start} onChange={(e) => setForm((f) => ({ ...f, contract_start: e.target.value }))} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Tier</Label>
              <select value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))} className="w-full h-9 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8732A]">
                <option value="">Select tier</option>
                {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Status</Label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Client['status'] }))} className="w-full h-9 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8732A]">
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Monthly MRR ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.mrr} onChange={(e) => setForm((f) => ({ ...f, mrr: e.target.value }))} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Primary Producer</Label>
              <select value={form.primary_producer} onChange={(e) => setForm((f) => ({ ...f, primary_producer: e.target.value }))} className="w-full h-9 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8732A]">
                <option value="">Select producer</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className={labelClass}>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button key={p.value} type="button" onClick={() => togglePlatform(p.value)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    form.platforms.includes(p.value)
                      ? 'bg-[#E8732A]/10 border-[#E8732A] text-[#E8732A]'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#999999] hover:border-[#555555]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-[#999999] hover:text-white hover:bg-[#1a1a1a]">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0">
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
