'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateClientBrandData } from '@/lib/actions/clients'
import type { BrandColor, BrandFonts, BrandVoice, ContentPillar, TargetAudience } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrandKitEditorProps {
  clientId: string
  initialColors: BrandColor[] | null
  initialFonts: BrandFonts | null
  initialVoice: BrandVoice | null
  initialPillars: ContentPillar[] | null
  initialAudience: TargetAudience | null
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-2">
      {children}
    </p>
  )
}

function FieldInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-[#333333] outline-none focus:border-[#555555] transition-colors"
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-[#333333] outline-none focus:border-[#555555] transition-colors resize-none"
    />
  )
}

function TagList({
  items,
  onChange,
  placeholder,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const trimmed = draft.trim()
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed])
    }
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#999999]"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i !== item))}
              className="text-[#555555] hover:text-red-400 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add() }
          }}
          placeholder={placeholder}
          className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white placeholder-[#333333] outline-none focus:border-[#555555] transition-colors"
        />
        <button
          type="button"
          onClick={add}
          className="px-2.5 py-1.5 text-xs border border-[#2a2a2a] rounded-md text-[#555555] hover:text-white hover:border-[#555555] transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BrandKitEditor({
  clientId,
  initialColors,
  initialFonts,
  initialVoice,
  initialPillars,
  initialAudience,
}: BrandKitEditorProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Colors state
  const [colors, setColors] = useState<BrandColor[]>(initialColors ?? [])
  const [colorDraft, setColorDraft] = useState<BrandColor>({ name: '', hex: '#000000', role: '' })

  // Fonts state
  const [fonts, setFonts] = useState<BrandFonts>(initialFonts ?? { headline: '', body: '' })

  // Voice state
  const [voice, setVoice] = useState<BrandVoice>(
    initialVoice ?? { keywords: [], description: '', dos: [], donts: [] }
  )

  // Pillars state
  const [pillars, setPillars] = useState<ContentPillar[]>(initialPillars ?? [])
  const [pillarDraft, setPillarDraft] = useState<ContentPillar>({ name: '', description: '' })

  // Audience state
  const [audience, setAudience] = useState<TargetAudience>(
    initialAudience ?? { age_range: '', location: '', traits: [], pain_points: [] }
  )

  function addColor() {
    if (!colorDraft.name.trim() || !colorDraft.hex) return
    setColors((prev) => [...prev, { ...colorDraft, name: colorDraft.name.trim(), role: colorDraft.role.trim() }])
    setColorDraft({ name: '', hex: '#000000', role: '' })
  }

  function addPillar() {
    if (!pillarDraft.name.trim()) return
    setPillars((prev) => [...prev, { name: pillarDraft.name.trim(), description: pillarDraft.description.trim() }])
    setPillarDraft({ name: '', description: '' })
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await updateClientBrandData(clientId, {
        brand_colors: colors,
        brand_fonts: fonts.headline || fonts.body ? fonts : undefined,
        brand_voice: voice,
        content_pillars: pillars,
        target_audience: audience,
      })
      router.refresh()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs border border-[#2a2a2a] rounded-md text-[#555555] hover:text-white hover:border-[#555555] transition-colors"
      >
        Edit Brand Kit
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Edit Brand Kit</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">

            {/* ---------------------------------------------------------------- */}
            {/* Colors */}
            {/* ---------------------------------------------------------------- */}
            <div>
              <Label>Colors</Label>
              <div className="space-y-2 mb-3">
                {colors.map((color, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-[#2a2a2a] shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm text-white flex-1">{color.name}</span>
                    <span className="text-xs text-[#555555] font-mono">{color.hex}</span>
                    <span className="text-xs text-[#333333]">{color.role}</span>
                    <button
                      type="button"
                      onClick={() => setColors((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-[#555555] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <FieldInput value={colorDraft.name} onChange={(v) => setColorDraft((p) => ({ ...p, name: v }))} placeholder="Name" />
                <input
                  type="color"
                  value={colorDraft.hex}
                  onChange={(e) => setColorDraft((p) => ({ ...p, hex: e.target.value }))}
                  className="h-9 w-full rounded-md border border-[#2a2a2a] bg-[#0a0a0a] cursor-pointer"
                />
                <FieldInput value={colorDraft.role} onChange={(v) => setColorDraft((p) => ({ ...p, role: v }))} placeholder="Role (e.g. Primary)" />
                <button
                  type="button"
                  onClick={addColor}
                  className="flex items-center justify-center gap-1 px-2 py-2 text-xs border border-[#2a2a2a] rounded-md text-[#555555] hover:text-white hover:border-[#555555] transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Typography */}
            {/* ---------------------------------------------------------------- */}
            <div>
              <Label>Typography</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#555555] mb-1">Headline font</p>
                  <FieldInput value={fonts.headline} onChange={(v) => setFonts((p) => ({ ...p, headline: v }))} placeholder="e.g. Montserrat" />
                </div>
                <div>
                  <p className="text-xs text-[#555555] mb-1">Body font</p>
                  <FieldInput value={fonts.body} onChange={(v) => setFonts((p) => ({ ...p, body: v }))} placeholder="e.g. Open Sans" />
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Voice & Tone */}
            {/* ---------------------------------------------------------------- */}
            <div>
              <Label>Voice & Tone</Label>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#555555] mb-1">Keywords</p>
                  <TagList items={voice.keywords} onChange={(kw) => setVoice((p) => ({ ...p, keywords: kw }))} placeholder="Add keyword (press Enter)" />
                </div>
                <div>
                  <p className="text-xs text-[#555555] mb-1">Sounds like</p>
                  <Textarea value={voice.description} onChange={(v) => setVoice((p) => ({ ...p, description: v }))} placeholder="e.g. A knowledgeable neighbor, not a salesperson." />
                </div>
                <div>
                  <p className="text-xs text-[#555555] mb-1">Do</p>
                  <TagList items={voice.dos} onChange={(dos) => setVoice((p) => ({ ...p, dos }))} placeholder="Add a &quot;do&quot; (press Enter)" />
                </div>
                <div>
                  <p className="text-xs text-[#555555] mb-1">Don&apos;t</p>
                  <TagList items={voice.donts} onChange={(donts) => setVoice((p) => ({ ...p, donts }))} placeholder="Add a &quot;don't&quot; (press Enter)" />
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Content Pillars */}
            {/* ---------------------------------------------------------------- */}
            <div>
              <Label>Content Pillars</Label>
              <div className="space-y-1.5 mb-3">
                {pillars.map((pillar, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-[#E8732A] font-mono w-4 shrink-0">{i + 1}.</span>
                    <span className="text-sm text-white flex-1">{pillar.name}</span>
                    <span className="text-xs text-[#555555] flex-1 truncate">{pillar.description}</span>
                    <button
                      type="button"
                      onClick={() => setPillars((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-[#555555] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <FieldInput value={pillarDraft.name} onChange={(v) => setPillarDraft((p) => ({ ...p, name: v }))} placeholder="Pillar name" />
                </div>
                <div className="col-span-2">
                  <FieldInput value={pillarDraft.description} onChange={(v) => setPillarDraft((p) => ({ ...p, description: v }))} placeholder="Description" />
                </div>
                <button
                  type="button"
                  onClick={addPillar}
                  className="flex items-center justify-center gap-1 px-2 py-2 text-xs border border-[#2a2a2a] rounded-md text-[#555555] hover:text-white hover:border-[#555555] transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Target Audience */}
            {/* ---------------------------------------------------------------- */}
            <div>
              <Label>Target Audience</Label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[#555555] mb-1">Age range</p>
                    <FieldInput value={audience.age_range} onChange={(v) => setAudience((p) => ({ ...p, age_range: v }))} placeholder="e.g. 30-65" />
                  </div>
                  <div>
                    <p className="text-xs text-[#555555] mb-1">Location</p>
                    <FieldInput value={audience.location} onChange={(v) => setAudience((p) => ({ ...p, location: v }))} placeholder="e.g. Twin Cities metro" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#555555] mb-1">Traits</p>
                  <TagList items={audience.traits} onChange={(traits) => setAudience((p) => ({ ...p, traits }))} placeholder="Add trait (press Enter)" />
                </div>
                <div>
                  <p className="text-xs text-[#555555] mb-1">Pain Points</p>
                  <TagList items={audience.pain_points} onChange={(pp) => setAudience((p) => ({ ...p, pain_points: pp }))} placeholder="Add pain point (press Enter)" />
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Save */}
            {/* ---------------------------------------------------------------- */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#2a2a2a]">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-md bg-[#E8732A] hover:bg-[#d4621f] text-white disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Brand Kit'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm rounded-md border border-[#2a2a2a] text-[#555555] hover:text-white hover:border-[#555555] transition-colors"
              >
                Cancel
              </button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
