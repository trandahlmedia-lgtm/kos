'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const REASONS = [
  'Not interested',
  'Wrong number / bad contact',
  'Out of business',
  'Duplicate',
  'Already has an agency',
] as const

interface DisqualifyDialogProps {
  open: boolean
  businessName: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function DisqualifyDialog({ open, businessName, onClose, onConfirm }: DisqualifyDialogProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isOther = selected === 'Other'
  const reason = isOther ? customReason.trim() : selected
  const canSubmit = !!reason && !submitting

  function handleClose() {
    setSelected(null)
    setCustomReason('')
    setSubmitting(false)
    onClose()
  }

  async function handleConfirm() {
    if (!reason) return
    setSubmitting(true)
    try {
      await onConfirm(reason)
      handleClose()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white text-sm">
            Disqualify {businessName}?
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-[#999999] -mt-1">
          This lead will be removed from the active pipeline. Outreach will be cancelled and their email opted out.
        </p>

        <div className="flex flex-col gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                selected === r
                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                  : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#999999] hover:border-[#3a3a3a] hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setSelected('Other')}
            className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
              isOther
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#999999] hover:border-[#3a3a3a] hover:text-white'
            }`}
          >
            Other...
          </button>
        </div>

        {isOther && (
          <input
            type="text"
            placeholder="Enter reason..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            autoFocus
            maxLength={500}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-[#3a3a3a]"
          />
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-[#999999] hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="flex-1 bg-red-600/80 hover:bg-red-600 text-white border-0 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin mr-1" />
            ) : null}
            Disqualify Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
