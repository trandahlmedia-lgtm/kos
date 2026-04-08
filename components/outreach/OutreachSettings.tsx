'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOutreachSettings, getOutreachSettings } from '@/lib/actions/outreach'
import type { OutreachSettings as OutreachSettingsType } from '@/types'

interface OutreachSettingsProps {
  open: boolean
  settings: OutreachSettingsType | null
  onClose: () => void
  onSaved: (settings: OutreachSettingsType) => void
}

export function OutreachSettings({ open, settings, onClose, onSaved }: OutreachSettingsProps) {
  const [fromName, setFromName] = useState(settings?.from_name ?? 'Jay Trandahl')
  const [fromEmail, setFromEmail] = useState(settings?.from_email ?? 'jay@mail.konvyrt.com')
  const [replyTo, setReplyTo] = useState(settings?.reply_to ?? 'jay@konvyrt.com')
  const [dailyLimit, setDailyLimit] = useState(settings?.daily_limit ?? 20)
  const [scoreThreshold, setScoreThreshold] = useState(settings?.score_threshold ?? 60)
  const [businessAddress, setBusinessAddress] = useState(settings?.business_address ?? '')
  const [sendingEnabled, setSendingEnabled] = useState(settings?.sending_enabled ?? false)
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(!settings)

  // If no settings on mount, initialize them
  useEffect(() => {
    if (!settings && open) {
      getOutreachSettings().then(({ settings: s }) => {
        if (s) {
          setFromName(s.from_name)
          setFromEmail(s.from_email)
          setReplyTo(s.reply_to)
          setDailyLimit(s.daily_limit)
          setScoreThreshold(s.score_threshold)
          setBusinessAddress(s.business_address)
          setSendingEnabled(s.sending_enabled)
          onSaved(s)
        }
        setInitializing(false)
      })
    }
  }, [open, settings, onSaved])

  async function handleSave() {
    setSaving(true)
    const { settings: updated } = await updateOutreachSettings({
      from_name: fromName,
      from_email: fromEmail,
      reply_to: replyTo,
      daily_limit: dailyLimit,
      score_threshold: scoreThreshold,
      business_address: businessAddress,
      sending_enabled: sendingEnabled,
    })
    if (updated) onSaved(updated)
    setSaving(false)
    onClose()
  }

  const canEnableSending = businessAddress.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Outreach Settings</DialogTitle>
        </DialogHeader>

        {initializing ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#E8732A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#999999]">From Name</Label>
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="bg-[#0a0a0a] border-[#2a2a2a] text-sm h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#999999]">From Email</Label>
              <Input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="bg-[#0a0a0a] border-[#2a2a2a] text-sm h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#999999]">Reply-To</Label>
              <Input
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                className="bg-[#0a0a0a] border-[#2a2a2a] text-sm h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#999999]">Daily Send Limit</Label>
                <Input
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-sm h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#999999]">Min Score to Draft</Label>
                <Input
                  type="number"
                  value={scoreThreshold}
                  onChange={(e) => setScoreThreshold(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-sm h-8"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#999999]">Business Address (CAN-SPAM required)</Label>
              <Input
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="123 Main St, Minneapolis, MN 55401"
                className="bg-[#0a0a0a] border-[#2a2a2a] text-sm h-8"
              />
              {!canEnableSending && (
                <p className="text-[10px] text-red-400">Required before sending can be enabled.</p>
              )}
            </div>

            {/* Sending toggle */}
            <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#2a2a2a] rounded-md p-3">
              <div>
                <p className="text-sm text-white">Enable Sending</p>
                <p className="text-[10px] text-[#555555]">Allow approved emails to be sent via Resend</p>
              </div>
              <button
                onClick={() => canEnableSending && setSendingEnabled(!sendingEnabled)}
                className={`w-10 h-5 rounded-full transition-colors ${
                  sendingEnabled ? 'bg-[#E8732A]' : 'bg-[#2a2a2a]'
                } ${!canEnableSending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    sendingEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#E8732A] hover:bg-[#d4621f] text-white border-0"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
