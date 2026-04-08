'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar, Sparkles, FileText, Search, Radio,
  Copy, Check, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClientAction } from '@/lib/actions/clients'
import { saveClaudeMd } from '@/lib/actions/onboarding'
import type { Client, AIRun, ClientIntakeResult, ClientTier } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkflowId = 'weekly_plan' | 'captions' | 'brand_doc' | 'client_intake' | 'platform_bios'

interface PostOption {
  id: string
  client_id: string
  platform: string
  content_type: string | null
  scheduled_date: string | null
  clients: { name: string } | null
}

interface WorkflowsPageClientProps {
  clients: Client[]
  postsWithoutCaption: PostOption[]
  recentRuns: (AIRun & { clients: { name: string } | null })[]
}

// ---------------------------------------------------------------------------
// Workflow definitions
// ---------------------------------------------------------------------------

const WORKFLOWS: {
  id: WorkflowId
  icon: React.ReactNode
  name: string
  description: string
  requiresClient: boolean
}[] = [
  {
    id: 'weekly_plan',
    icon: <Calendar size={16} className="text-[#E8732A]" />,
    name: 'Weekly Content Plan',
    description: 'Generate a full week of post slots with angles and captions',
    requiresClient: true,
  },
  {
    id: 'captions',
    icon: <Sparkles size={16} className="text-[#E8732A]" />,
    name: 'Caption Generator',
    description: 'Write AI captions for a specific post',
    requiresClient: false,
  },
  {
    id: 'brand_doc',
    icon: <FileText size={16} className="text-[#E8732A]" />,
    name: 'Brand Doc Generator',
    description: "Generate a client's brand document from structured intake",
    requiresClient: false,
  },
  {
    id: 'client_intake',
    icon: <Search size={16} className="text-[#E8732A]" />,
    name: 'Client Intake Assistant',
    description: 'Research a business and pre-fill their client profile',
    requiresClient: false,
  },
  {
    id: 'platform_bios',
    icon: <Radio size={16} className="text-[#E8732A]" />,
    name: 'Platform Bios',
    description: 'Generate platform-optimized bios for all active platforms',
    requiresClient: true,
  },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkflowsPageClient({ clients, postsWithoutCaption, recentRuns }: WorkflowsPageClientProps) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [openWorkflow, setOpenWorkflow] = useState<WorkflowId | null>(null)
  const [runsExpanded, setRunsExpanded] = useState(false)

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null

  function openDialog(id: WorkflowId) {
    const wf = WORKFLOWS.find((w) => w.id === id)
    if (wf?.requiresClient && !selectedClientId) return
    setOpenWorkflow(id)
  }

  function closeDialog() { setOpenWorkflow(null) }

  return (
    <div className="p-8 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Workflows</h1>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="h-8 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8732A]"
        >
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Workflow grid */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        {WORKFLOWS.map((wf) => {
          const disabled = wf.requiresClient && !selectedClientId
          return (
            <div
              key={wf.id}
              className={`p-4 rounded-md border transition-colors ${
                disabled
                  ? 'border-[#1a1a1a] bg-[#0a0a0a] opacity-50 cursor-not-allowed'
                  : 'border-[#2a2a2a] bg-[#111111] hover:border-[#3a3a3a] cursor-pointer'
              }`}
              onClick={() => !disabled && openDialog(wf.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{wf.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{wf.name}</p>
                    <p className="text-xs text-[#555555] mt-0.5">{wf.description}</p>
                    {wf.requiresClient && !selectedClientId && (
                      <p className="text-[10px] text-[#333333] mt-1">Select a client to run this workflow</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={(e) => { e.stopPropagation(); if (!disabled) openDialog(wf.id) }}
                  className="h-7 text-xs px-3 bg-[#1a1a1a] hover:bg-[#222222] text-white border border-[#2a2a2a] flex-shrink-0"
                >
                  Run
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Runs */}
      <div>
        <button
          onClick={() => setRunsExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm text-[#555555] hover:text-[#999999] transition-colors mb-3"
        >
          {runsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Recent Runs
          {recentRuns.length > 0 && (
            <span className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5 text-[#555555]">
              {recentRuns.length}
            </span>
          )}
        </button>

        {runsExpanded && (
          <div className="border border-[#2a2a2a] rounded-md overflow-hidden">
            {recentRuns.length === 0 ? (
              <p className="text-xs text-[#333333] italic p-4">No AI runs yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    {['Workflow', 'Client', 'Model', 'Tokens', 'Cost', 'Status', 'When'].map((h) => (
                      <th key={h} className="text-left text-[#555555] font-medium px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="border-b border-[#1a1a1a] hover:bg-[#111111]">
                      <td className="px-3 py-2 text-[#999999]">{run.workflow.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-[#555555]">
                        {(run.clients as { name: string } | null)?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-[#555555]">{run.model.replace('claude-', '')}</td>
                      <td className="px-3 py-2 text-[#555555]">{run.total_tokens?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2 text-[#555555]">
                        {run.cost_usd != null ? `$${run.cost_usd.toFixed(4)}` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          run.status === 'completed'
                            ? 'bg-green-900/30 text-green-400'
                            : run.status === 'failed'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-[#1a1a1a] text-[#555555]'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#555555]">
                        {new Date(run.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Workflow dialogs */}
      {openWorkflow === 'weekly_plan' && selectedClient && (
        <WeeklyPlanDialog client={selectedClient} onClose={closeDialog} />
      )}
      {openWorkflow === 'captions' && (
        <CaptionDialog posts={postsWithoutCaption} onClose={closeDialog} />
      )}
      {openWorkflow === 'brand_doc' && (
        <BrandDocDialog client={selectedClient} onClose={closeDialog} />
      )}
      {openWorkflow === 'client_intake' && (
        <ClientIntakeDialog onClose={closeDialog} />
      )}
      {openWorkflow === 'platform_bios' && selectedClient && (
        <PlatformBiosDialog client={selectedClient} onClose={closeDialog} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Weekly Plan Dialog
// ---------------------------------------------------------------------------

function WeeklyPlanDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(getNextMonday())
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState<'idle' | 'plan' | 'captions' | 'done'>('idle')
  const [result, setResult] = useState<{ count: number } | null>(null)
  const [error, setError] = useState('')

  async function handleRun() {
    setRunning(true)
    setError('')
    setStep('plan')

    try {
      const planRes = await fetch('/api/ai/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, weekStartDate: weekStart }),
      })
      const planData = (await planRes.json()) as { postIds?: string[]; count?: number; error?: string }
      if (!planRes.ok) { setError(planData.error ?? 'Failed'); return }

      setStep('captions')
      await fetch('/api/ai/captions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds: planData.postIds }),
      })

      setResult({ count: planData.count ?? planData.postIds?.length ?? 0 })
      setStep('done')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  const stepLabel = step === 'plan' ? 'Building content plan…' : step === 'captions' ? 'Writing captions…' : ''

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#111111] border border-[#2a2a2a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Weekly Content Plan</DialogTitle>
          <p className="text-xs text-[#555555]">{client.name}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {step !== 'done' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-[#999999] font-medium">Week starting (Monday)</label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  disabled={running}
                  className="w-full h-9 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8732A] disabled:opacity-50"
                />
              </div>

              <div className="text-xs text-[#555555] space-y-1">
                <p>Will generate ~5 post slots with:</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li>Angles and reasoning per post</li>
                  <li>AI captions auto-written for each</li>
                  <li>Posts saved to content calendar</li>
                </ul>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleRun}
                  disabled={running || !weekStart}
                  className="flex-1 bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-9 gap-1.5"
                >
                  <Sparkles size={13} className={running ? 'animate-pulse' : ''} />
                  {running ? stepLabel : 'Generate Plan'}
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-[#2a2a2a] text-[#999999] hover:text-white h-9"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-white font-medium">
                {result?.count} posts created for week of {formatDate(weekStart)}
              </p>
              <p className="text-xs text-[#555555]">
                Captions have been written and auto-applied. Review them in the content calendar.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => { onClose(); router.push('/content?view=calendar') }}
                  className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-8 text-xs px-3 gap-1"
                >
                  View in Calendar
                  <ExternalLink size={11} />
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-[#2a2a2a] text-[#999999] hover:text-white h-8 text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Caption Dialog
// ---------------------------------------------------------------------------

function CaptionDialog({ posts, onClose }: { posts: PostOption[]; onClose: () => void }) {
  const router = useRouter()
  const [selectedPostId, setSelectedPostId] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ best: { content: string; cta: string; hashtags: string } } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleRun() {
    if (!selectedPostId) return
    setRunning(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/ai/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: selectedPostId }),
      })
      const data = (await res.json()) as { best?: { content: string; cta: string; hashtags: string }; error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setResult({ best: data.best! })
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  function copy() {
    if (!result) return
    const text = [result.best.content, result.best.cta, result.best.hashtags].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#111111] border border-[#2a2a2a] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Caption Generator</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs text-[#999999] font-medium">Select post</label>
            <select
              value={selectedPostId}
              onChange={(e) => setSelectedPostId(e.target.value)}
              disabled={running}
              className="w-full h-9 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8732A] disabled:opacity-50"
            >
              <option value="">Choose a post without a caption…</option>
              {posts.map((p) => {
                const clientName = (p.clients as { name: string } | null)?.name ?? '?'
                const date = p.scheduled_date ?? 'unscheduled'
                const type = p.content_type?.replace(/_/g, ' ') ?? 'post'
                return (
                  <option key={p.id} value={p.id}>
                    {clientName} · {type} · {p.platform} · {date}
                  </option>
                )
              })}
            </select>
          </div>

          {posts.length === 0 && (
            <p className="text-xs text-[#555555] italic">No posts without captions found.</p>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {result && (
            <div className="space-y-2">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-3 space-y-2">
                <p className="text-xs text-white leading-relaxed">{result.best.content}</p>
                {result.best.cta && (
                  <p className="text-xs text-[#E8732A]">{result.best.cta}</p>
                )}
                {result.best.hashtags && (
                  <p className="text-[10px] text-[#555555]">{result.best.hashtags}</p>
                )}
              </div>
              <p className="text-[10px] text-[#555555]">Applied to post automatically. Open the post to see all 3 options.</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {!result ? (
              <>
                <Button
                  onClick={handleRun}
                  disabled={running || !selectedPostId}
                  className="flex-1 bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-9 gap-1.5"
                >
                  <Sparkles size={13} className={running ? 'animate-pulse' : ''} />
                  {running ? 'Writing captions…' : 'Generate Captions'}
                </Button>
                <Button onClick={onClose} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button onClick={copy} className="flex-1 bg-[#1a1a1a] hover:bg-[#222222] text-white border border-[#2a2a2a] h-9 gap-1.5">
                  {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy Caption'}
                </Button>
                <Button
                  onClick={() => { setResult(null); setSelectedPostId('') }}
                  variant="outline"
                  className="border-[#2a2a2a] text-[#999999] hover:text-white h-9"
                >
                  Another Post
                </Button>
                <Button onClick={onClose} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Brand Doc Dialog
// ---------------------------------------------------------------------------

function BrandDocDialog({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({
    companyName: client?.name ?? '',
    industry: '',
    services: '',
    serviceArea: '',
    audience: '',
    voiceTone: '',
    differentiators: '',
    competitors: '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    website: client?.website ?? '',
    socialLinks: '',
    additionalNotes: '',
  })
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleRun() {
    if (!form.companyName || !form.industry || !form.services || !form.serviceArea || !form.audience || !form.voiceTone || !form.differentiators) {
      setError('Fill in all required fields: company name, industry, services, service area, target audience, voice & tone, and key differentiators.')
      return
    }
    setRunning(true)
    setError('')

    try {
      const res = await fetch('/api/ai/brand-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client?.id, input: form }),
      })
      const data = (await res.json()) as { content?: string; error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setResult(data.content ?? '')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  async function handleSaveToClient() {
    if (!client || !result) return
    setSaved(false)
    try {
      await saveClaudeMd(client.id, result)
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    } catch { /* non-fatal */ }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#111111] border border-[#2a2a2a] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Brand Doc Generator</DialogTitle>
          {client && <p className="text-xs text-[#555555]">{client.name}</p>}
        </DialogHeader>

        {!result ? (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company Name *" value={form.companyName} onChange={update('companyName')} />
              <Field label="Industry *" value={form.industry} onChange={update('industry')} placeholder="HVAC, Plumbing, Roofing…" />
              <Field label="Service Area *" value={form.serviceArea} onChange={update('serviceArea')} placeholder="Twin Cities, MN" />
              <Field label="Phone" value={form.phone} onChange={update('phone')} />
              <Field label="Email" value={form.email} onChange={update('email')} />
              <Field label="Website" value={form.website} onChange={update('website')} />
            </div>
            <TextareaField label="Services Offered *" value={form.services} onChange={update('services')} placeholder="AC install, furnace repair, duct cleaning…" rows={2} />
            <TextareaField label="Target Audience" value={form.audience} onChange={update('audience')} placeholder="Homeowners 35-60, Twin Cities suburbs, family-oriented…" rows={2} />
            <TextareaField label="Voice & Tone" value={form.voiceTone} onChange={update('voiceTone')} placeholder="Professional but approachable. Honest. No corporate speak." rows={2} />
            <TextareaField label="Key Differentiators" value={form.differentiators} onChange={update('differentiators')} placeholder="Family-owned, same-day service, 5-star Google rating…" rows={2} />
            <TextareaField label="Competitors" value={form.competitors} onChange={update('competitors')} placeholder="Other HVAC companies in market" rows={1} />
            <TextareaField label="Social Links" value={form.socialLinks} onChange={update('socialLinks')} placeholder="Instagram, Facebook URLs if known" rows={1} />
            <TextareaField label="Additional Notes" value={form.additionalNotes} onChange={update('additionalNotes')} placeholder="Anything else the AI should know" rows={2} />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button onClick={handleRun} disabled={running} className="flex-1 bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-9 gap-1.5">
                <Sparkles size={13} className={running ? 'animate-pulse' : ''} />
                {running ? 'Generating…' : 'Generate Brand Doc'}
              </Button>
              <Button onClick={onClose} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={18}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#999999] text-xs font-mono rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#E8732A]"
            />
            <div className="flex gap-2">
              {client && (
                <Button
                  onClick={handleSaveToClient}
                  className="flex-1 bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-9 text-sm"
                >
                  {saved ? 'Saved ✓' : `Save to ${client.name}`}
                </Button>
              )}
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(result).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
                }}
                variant="outline"
                className="border-[#2a2a2a] text-[#999999] hover:text-white h-9 gap-1.5"
              >
                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                Copy
              </Button>
              <Button onClick={() => setResult('')} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">Regenerate</Button>
              <Button onClick={onClose} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Client Intake Dialog
// ---------------------------------------------------------------------------

function ClientIntakeDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ClientIntakeResult | null>(null)
  const [error, setError] = useState('')
  const [websiteFailed, setWebsiteFailed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)

  async function handleRun() {
    if (!companyName.trim()) { setError('Enter a company name.'); return }
    setRunning(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/ai/client-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, websiteUrl: websiteUrl || undefined }),
      })
      const data = (await res.json()) as { intake?: ClientIntakeResult; websiteFetchFailed?: boolean; error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setResult(data.intake ?? null)
      setWebsiteFailed(data.websiteFetchFailed ?? false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  async function handleCreateClient() {
    if (!result) return
    setCreating(true)
    try {
      await createClientAction({
        name: result.name || companyName,
        phone: result.phone ?? undefined,
        email: result.email ?? undefined,
        website: result.website ?? undefined,
        tier: (result.recommended_tier as ClientTier) ?? undefined,
        mrr: result.estimated_mrr,
      })
      setCreated(true)
      router.refresh()
      setTimeout(() => { onClose(); router.push('/clients') }, 1500)
    } catch { /* non-fatal */ } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#111111] border border-[#2a2a2a] text-white max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Client Intake Assistant</DialogTitle>
          <p className="text-xs text-[#555555]">Research a business and pre-fill their profile</p>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3 pt-2">
            <Field label="Company Name *" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Northern Standard Heating & Air" />
            <Field label="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://northernstandardhvac.com" />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button onClick={handleRun} disabled={running || !companyName.trim()} className="flex-1 bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-9 gap-1.5">
                <Search size={13} className={running ? 'animate-pulse' : ''} />
                {running ? `Researching ${companyName}…` : 'Run Intake'}
              </Button>
              <Button onClick={onClose} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {websiteFailed && (
              <div className="px-3 py-2 rounded bg-yellow-900/20 border border-yellow-800/30 text-xs text-yellow-400">
                Couldn&apos;t reach the website — recommendations are based on name only.
              </div>
            )}
            {result.flags?.length > 0 && (
              <div className="space-y-1">
                {result.flags.map((flag, i) => (
                  <div key={i} className="px-3 py-2 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#999999]">
                    ⚠ {flag}
                  </div>
                ))}
              </div>
            )}

            <IntakeField label="Company Name" value={result.name} />
            <IntakeField label="Industry" value={result.industry} />
            <IntakeField label="Service Area" value={result.service_area} />
            {result.phone && <IntakeField label="Phone" value={result.phone} />}
            {result.email && <IntakeField label="Email" value={result.email} />}
            {result.website && <IntakeField label="Website" value={result.website} />}
            <IntakeField label="Services" value={result.services.join(', ')} />

            <div className="bg-[#E8732A]/5 border border-[#E8732A]/30 rounded p-3 space-y-1">
              <p className="text-xs font-medium text-[#E8732A]">Recommended Tier: {result.recommended_tier.replace(/_/g, ' ')}</p>
              <p className="text-xs text-[#999999]">${result.estimated_mrr?.toLocaleString()}/mo</p>
              <p className="text-xs text-[#555555]">{result.tier_reasoning}</p>
            </div>

            {result.existing_social_presence?.summary && (
              <div className="space-y-1">
                <p className="text-xs text-[#555555] font-medium uppercase tracking-wider">Social Presence</p>
                <p className="text-xs text-[#999999]">{result.existing_social_presence.summary}</p>
              </div>
            )}

            <p className="text-[10px] text-[#555555]">
              Confidence: {result.confidence?.overall ?? 'medium'} — {result.confidence?.notes}
            </p>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleCreateClient}
                disabled={creating || created}
                className="flex-1 bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-9 text-sm"
              >
                {created ? 'Created ✓' : creating ? 'Creating…' : 'Create Client'}
              </Button>
              <Button onClick={() => setResult(null)} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">Back</Button>
              <Button onClick={onClose} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Platform Bios Dialog
// ---------------------------------------------------------------------------

function PlatformBiosDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const [running, setRunning] = useState(false)
  const [bios, setBios] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  async function handleRun() {
    setRunning(true)
    setError('')

    try {
      const res = await fetch('/api/ai/platform-bios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
      const data = (await res.json()) as { bios?: Record<string, string>; error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setBios(data.bios ?? null)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  function copy(platform: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(platform)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#111111] border border-[#2a2a2a] text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Platform Bios</DialogTitle>
          <p className="text-xs text-[#555555]">{client.name} · {client.platforms.join(', ')}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!bios ? (
            <>
              <p className="text-xs text-[#555555]">
                Generates platform-optimized bio text for each of {client.name}&apos;s active platforms, drawn from their brand document.
              </p>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <Button onClick={handleRun} disabled={running} className="flex-1 bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-9 gap-1.5">
                  <Radio size={13} className={running ? 'animate-pulse' : ''} />
                  {running ? 'Generating…' : 'Generate Bios'}
                </Button>
                <Button onClick={onClose} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">Cancel</Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {Object.entries(bios).map(([platform, text]) => (
                <div key={platform}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-[#999999] capitalize">{platform}</span>
                    <button
                      onClick={() => copy(platform, text)}
                      className="flex items-center gap-1 text-xs text-[#555555] hover:text-white transition-colors"
                    >
                      {copied === platform ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                      {copied === platform ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3">
                    <p className="text-xs text-[#999999] leading-relaxed whitespace-pre-wrap">{text}</p>
                    <p className="text-[10px] text-[#333333] mt-1.5">{text.length} chars</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button onClick={() => setBios(null)} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">Regenerate</Button>
                <Button onClick={onClose} variant="outline" className="border-[#2a2a2a] text-[#999999] hover:text-white h-9">Close</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Small form field helpers
// ---------------------------------------------------------------------------

function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[#999999] font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-8 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm placeholder:text-[#333333] focus:outline-none focus:ring-1 focus:ring-[#E8732A]"
      />
    </div>
  )
}

function TextareaField({
  label, value, onChange, placeholder, rows = 3,
}: {
  label: string; value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string; rows?: number
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[#999999] font-medium">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-md px-3 py-2 resize-none placeholder:text-[#333333] focus:outline-none focus:ring-1 focus:ring-[#E8732A]"
      />
    </div>
  )
}

function IntakeField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[#555555] w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-white">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getNextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
