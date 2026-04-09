'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScoreDisplay } from './ScoreDisplay'
import type { Lead, LeadStage, LeadSource } from '@/types'

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reached_out', label: 'Reached Out' },
  { value: 'connected', label: 'Connected' },
  { value: 'interested', label: 'Interested' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'other', label: 'Other' },
]

interface LeadOverviewTabProps {
  lead: Lead
  onUpdate: (updates: Partial<Lead>) => Promise<void>
  onStageChange: (stage: LeadStage, lostReason?: string) => Promise<void>
}

export function LeadOverviewTab({ lead, onUpdate, onStageChange }: LeadOverviewTabProps) {
  const [saving, setSaving] = useState(false)
  const [stageSaving, setStageSaving] = useState(false)
  const [lostReason, setLostReason] = useState(lead.lost_reason ?? '')
  const [showLostReason, setShowLostReason] = useState(false)
  const [manualScore, setManualScore] = useState<number | null>(lead.manual_score)

  async function handleStageChange(newStage: LeadStage) {
    console.log('[STAGE-DEBUG] handleStageChange fired:', { newStage, currentStage: lead.stage })
    if (newStage === 'lost') {
      setShowLostReason(true)
      return
    }
    setStageSaving(true)
    try {
      await onStageChange(newStage)
      console.log('[STAGE-DEBUG] onStageChange completed successfully')
    } catch (err) {
      console.error('[STAGE-DEBUG] onStageChange threw:', err)
    }
    setStageSaving(false)
  }

  async function confirmLost() {
    setStageSaving(true)
    await onStageChange('lost', lostReason)
    setShowLostReason(false)
    setStageSaving(false)
  }

  async function handleManualScoreBlur() {
    if (manualScore === lead.manual_score) return
    setSaving(true)
    await onUpdate({ manual_score: manualScore })
    setSaving(false)
  }

  async function handleFieldBlur(field: keyof Lead, value: string | null) {
    if ((lead[field] ?? null) === (value || null)) return
    setSaving(true)
    await onUpdate({ [field]: value || null })
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      {/* Stage + Score row */}
      <div className="flex items-center gap-6">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-[#555555]">Stage</Label>
          <div className="flex items-center gap-2">
            <Select
              value={lead.stage}
              onValueChange={(val) => handleStageChange(val as LeadStage)}
              disabled={stageSaving}
            >
              <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-sm text-white h-8 w-[160px] focus:ring-[#E8732A] disabled:opacity-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                {STAGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm text-white focus:bg-[#2a2a2a] focus:text-white">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stageSaving && <Loader2 size={12} className="animate-spin text-[#555555]" />}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-[#555555]">Scores</Label>
          <ScoreDisplay
            aiScore={lead.ai_score}
            manualScore={manualScore}
            onManualScoreChange={setManualScore}
            readonly={false}
          />
          {/* trigger save on blur via hidden button trick — use onBlur on container */}
          <div onBlur={handleManualScoreBlur} className="sr-only" aria-hidden />
        </div>
      </div>

      {/* Lost reason */}
      {showLostReason && (
        <div className="space-y-2 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md">
          <Label className="text-xs text-[#999999]">Reason lost (optional)</Label>
          <Input
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder="Bad timing, price, no budget…"
            className="bg-[#0a0a0a] border-[#2a2a2a] text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmLost} disabled={stageSaving} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
              Mark Lost
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowLostReason(false)} className="text-[#555555]">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Basic info fields */}
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Business Name" defaultValue={lead.business_name} onBlur={(v) => handleFieldBlur('business_name', v)} />
        <FieldInput label="Phone" defaultValue={lead.phone ?? ''} onBlur={(v) => handleFieldBlur('phone', v)} />
        <FieldInput label="Email" defaultValue={lead.email ?? ''} onBlur={(v) => handleFieldBlur('email', v)} />
        <FieldInput label="Website" defaultValue={lead.website ?? ''} onBlur={(v) => handleFieldBlur('website', v)} />
        <FieldInput label="Industry" defaultValue={lead.industry ?? ''} onBlur={(v) => handleFieldBlur('industry', v)} />
        <FieldInput label="Service Area" defaultValue={lead.service_area ?? ''} onBlur={(v) => handleFieldBlur('service_area', v)} />
        <FieldInput label="Years in Business" defaultValue={lead.years_in_business?.toString() ?? ''} onBlur={(v) => handleFieldBlur('years_in_business', v)} type="number" />
        <FieldInput label="Jobs/Week" defaultValue={lead.jobs_per_week?.toString() ?? ''} onBlur={(v) => handleFieldBlur('jobs_per_week', v)} type="number" />
      </div>

      {/* Source */}
      <div className="space-y-1">
        <Label className="text-xs text-[#555555]">Source</Label>
        <Select
          defaultValue={lead.source}
          onValueChange={(val) => handleFieldBlur('source', val)}
        >
          <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-sm text-white h-8 w-full focus:ring-[#E8732A]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
            {SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-sm text-white focus:bg-[#2a2a2a] focus:text-white">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Social handles */}
      <div className="space-y-2">
        <Label className="text-xs text-[#555555]">Social Presence</Label>
        <div className="grid grid-cols-1 gap-2">
          <FieldInput label="Instagram" placeholder="@handle" defaultValue={lead.instagram_handle ?? ''} onBlur={(v) => handleFieldBlur('instagram_handle', v)} />
          <FieldInput label="Facebook" placeholder="URL" defaultValue={lead.facebook_url ?? ''} onBlur={(v) => handleFieldBlur('facebook_url', v)} />
          <FieldInput label="Google Business" placeholder="URL" defaultValue={lead.google_business_url ?? ''} onBlur={(v) => handleFieldBlur('google_business_url', v)} />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs text-[#555555]">Notes</Label>
        <Textarea
          defaultValue={lead.notes ?? ''}
          onBlur={(e) => handleFieldBlur('notes', e.target.value)}
          rows={3}
          className="bg-[#1a1a1a] border-[#2a2a2a] text-sm resize-none"
          placeholder="General notes…"
        />
      </div>

      {saving && <p className="text-[11px] text-[#555555]">Saving…</p>}
    </div>
  )
}

// Simple inline field helper
function FieldInput({
  label,
  defaultValue,
  placeholder,
  onBlur,
  type = 'text',
}: {
  label: string
  defaultValue: string
  placeholder?: string
  onBlur: (value: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-[#555555]">{label}</Label>
      <Input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onBlur={(e) => onBlur(e.target.value)}
        className="bg-[#1a1a1a] border-[#2a2a2a] text-sm h-8"
      />
    </div>
  )
}
