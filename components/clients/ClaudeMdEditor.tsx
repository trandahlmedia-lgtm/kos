'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { saveClaudeMd } from '@/lib/actions/onboarding'

// Must match saveClaudeMdSchema in lib/security/validation.ts
const MAX_BYTES = 100_000

interface ClaudeMdEditorProps {
  clientId: string
  initialValue: string
}

export function ClaudeMdEditor({ clientId, initialValue }: ClaudeMdEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const isDirty = value !== initialValue

  // Client-side size check — gives immediate feedback before the server round-trip.
  const byteSize = new TextEncoder().encode(value).length
  const overLimit = byteSize > MAX_BYTES

  async function handleSave() {
    // Enforce size limit client-side first (server validates too).
    if (overLimit) {
      setError(`Document is too large (${(byteSize / 1000).toFixed(1)} KB). Maximum is ${MAX_BYTES / 1000} KB.`)
      return
    }

    setSaving(true)
    setError('')
    try {
      await saveClaudeMd(clientId, value)
      setSavedAt(new Date())
    } catch (err) {
      // Surface the server error (rate limit, size, etc.) directly to the user.
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Warning banner */}
      <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-md px-4 py-2.5">
        <span className="text-yellow-400 text-xs font-medium">
          This document is read by all AI workflows. Keep it accurate.
        </span>
      </div>

      {/* Editor */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full h-[520px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-md p-4 text-sm text-white font-mono leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[#E8732A] focus:border-[#E8732A] placeholder:text-[#555555]"
        placeholder="Paste or write the client's brand document here..."
        spellCheck={false}
      />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty || overLimit}
            className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-8 px-4 text-sm disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            disabled
            variant="ghost"
            className="h-8 px-4 text-sm text-[#555555] cursor-not-allowed"
            title="Available in Phase 3"
          >
            Generate with AI
          </Button>
        </div>
        <div className="text-xs text-[#555555]">
          {error && <span className="text-red-400">{error}</span>}
          {!error && overLimit && (
            <span className="text-red-400">
              {(byteSize / 1000).toFixed(1)} KB / {MAX_BYTES / 1000} KB — too large
            </span>
          )}
          {!error && !overLimit && savedAt && !isDirty && (
            <span>Saved {savedAt.toLocaleTimeString()}</span>
          )}
          {!error && !overLimit && isDirty && (
            <span className="text-yellow-400">
              Unsaved — {(byteSize / 1000).toFixed(1)} KB / {MAX_BYTES / 1000} KB
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
