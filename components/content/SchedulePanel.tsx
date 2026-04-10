'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Copy, Check, Sparkles, Eye, RefreshCw, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { PostStatusBadge } from '@/components/shared/StatusBadge'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { CaptionEditor } from './CaptionEditor'
import { CreativeUploader } from './CreativeUploader'
import { VisualPreviewModal } from './VisualPreviewModal'
import { updatePostStatusAction } from '@/lib/actions/posts'
import { generateVisualAction, deleteVisualAction } from '@/lib/actions/visuals'
import { type Post, type PostStatus, type GeneratedCaptions } from '@/types'

const PREVIEW_WIDTH = 280
const NATIVE_WIDTH = 420
const NATIVE_HEIGHT = 700
const PREVIEW_SCALE = PREVIEW_WIDTH / NATIVE_WIDTH
const PREVIEW_HEIGHT = Math.round(NATIVE_HEIGHT * PREVIEW_SCALE)

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: 'in_production', label: 'In Production' },
  { value: 'ready', label: 'Ready' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
]

interface SchedulePanelProps {
  post: Post | null
  clientName?: string
  thumbnailUrl?: string
  profiles: { id: string; name: string }[]
  open: boolean
  onClose: () => void
}

export function SchedulePanel({
  post,
  clientName,
  thumbnailUrl,
  profiles,
  open,
  onClose,
}: SchedulePanelProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [captionGenError, setCaptionGenError] = useState('')
  const [visualModalOpen, setVisualModalOpen] = useState(false)
  const [regeneratingVisual, setRegeneratingVisual] = useState(false)
  const [visualError, setVisualError] = useState('')
  const [deletingVisual, setDeletingVisual] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Portal SSR safety
  useEffect(() => { setMounted(true) }, [])

  // Latch last known post/clientName so the modal keeps its data after the panel closes
  const lastPostRef = useRef<Post | null>(null)
  const lastClientNameRef = useRef<string | undefined>(undefined)
  if (post) {
    lastPostRef.current = post
    lastClientNameRef.current = clientName
  }

  // Close the visual modal when the user switches to a different post
  useEffect(() => {
    if (post?.id) setVisualModalOpen(false)
  }, [post?.id])

  const generatedHtml = post?.visual?.generated_html ?? null
  const iframeSrc = useMemo(() => {
    if (!generatedHtml) return undefined
    return URL.createObjectURL(new Blob([generatedHtml], { type: 'text/html' }))
  }, [generatedHtml])

  useEffect(() => {
    return () => {
      if (iframeSrc) URL.revokeObjectURL(iframeSrc)
    }
  }, [iframeSrc])

  // Portal the modal to document.body so it:
  // 1. Escapes the Sheet's stacking context (fixes z-index layering)
  // 2. Stays mounted even when the panel closes (post becomes null)
  const modalPortal =
    mounted && lastPostRef.current
      ? createPortal(
          <VisualPreviewModal
            postId={lastPostRef.current.id}
            postMeta={{
              clientName: lastClientNameRef.current,
              contentType: lastPostRef.current.content_type,
              format: lastPostRef.current.format,
              placement: lastPostRef.current.placement,
              angle: lastPostRef.current.angle,
            }}
            isOpen={visualModalOpen}
            onClose={() => setVisualModalOpen(false)}
          />,
          document.body
        )
      : null

  // Return the portal alone when the panel is closed — keeps the modal alive
  if (!post) return modalPortal

  const assignedProfile = post.assigned_to
    ? profiles.find((p) => p.id === post.assigned_to)
    : null

  async function handleGenerateCaption() {
    if (!post) return
    setGeneratingCaption(true)
    setCaptionGenError('')
    try {
      const res = await fetch('/api/ai/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      })
      const data = (await res.json()) as GeneratedCaptions & { error?: string }
      if (!res.ok) {
        setCaptionGenError(data.error ?? 'Failed to generate caption.')
        return
      }
      router.refresh()
    } catch {
      setCaptionGenError('Network error. Please try again.')
    } finally {
      setGeneratingCaption(false)
    }
  }

  async function handleRegenerateVisual() {
    if (!post) return
    setRegeneratingVisual(true)
    setVisualError('')
    try {
      await generateVisualAction(post.id)
      router.refresh()
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Regeneration failed.')
    } finally {
      setRegeneratingVisual(false)
    }
  }

  async function handleDeleteVisual() {
    if (!post) return
    setDeletingVisual(true)
    setVisualError('')
    try {
      const result = await deleteVisualAction(post.id)
      if (!result.success) {
        setVisualError(result.error ?? 'Failed to delete visual.')
        return
      }
      router.refresh()
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeletingVisual(false)
      setShowDeleteConfirm(false)
    }
  }

  async function handleStatusChange(status: PostStatus) {
    if (!post) return
    setUpdatingStatus(true)
    try {
      await updatePostStatusAction(post.id, status)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }

  function CopyBtn({ text, field }: { text: string; field: string }) {
    const copied = copiedField === field
    return (
      <button
        onClick={() => copyToClipboard(text, field)}
        className="p-1 text-[#555555] hover:text-white transition-colors rounded"
        title="Copy"
      >
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      </button>
    )
  }

  const scheduledDisplay = post.scheduled_date
    ? new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      })
    : null

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-[420px] bg-[#111111] border-l border-[#2a2a2a] text-white overflow-y-auto p-0"
      >
        {/* Panel header */}
        <SheetHeader className="px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <PlatformIcon platform={post.platform} />
            <div>
              <SheetTitle className="text-white text-sm font-medium">
                {clientName ?? 'Post'}
              </SheetTitle>
              <p className="text-xs text-[#555555] mt-0.5">
                {post.content_type?.replace(/_/g, ' ') ?? 'Untyped'}
                {scheduledDisplay && ` · ${scheduledDisplay}`}
                {post.scheduled_time && ` · ${formatTime(post.scheduled_time)}`}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Creative */}
          <Section label="Creative">
            {iframeSrc ? (
              <>
                <div
                  className="rounded-md border border-[#2a2a2a] overflow-hidden"
                  style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
                >
                  <iframe
                    src={iframeSrc}
                    title="Visual preview"
                    sandbox="allow-scripts"
                    style={{
                      width: NATIVE_WIDTH,
                      height: NATIVE_HEIGHT,
                      transform: `scale(${PREVIEW_SCALE})`,
                      transformOrigin: 'top left',
                      border: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setVisualModalOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-[#E8732A] text-[#E8732A] hover:bg-[#E8732A]/10 transition-colors"
                  >
                    <Eye size={12} />
                    View Full Preview
                  </button>
                  <button
                    onClick={handleRegenerateVisual}
                    disabled={regeneratingVisual}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-[#2a2a2a] text-[#555555] hover:text-white hover:border-[#555555] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={regeneratingVisual ? 'animate-spin' : ''} />
                    Regenerate
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deletingVisual}
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[#555555] hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Delete visual"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {visualError && (
                  <p className="text-[10px] text-red-400">{visualError}</p>
                )}
                <CreativeUploader
                  postId={post.id}
                  clientId={post.client_id}
                  existingThumbnailUrl={thumbnailUrl}
                />
              </>
            ) : (
              <CreativeUploader
                postId={post.id}
                clientId={post.client_id}
                existingThumbnailUrl={thumbnailUrl}
              />
            )}
          </Section>

          {/* Caption */}
          <Section label="Caption">
            {/* Quick generate trigger when post has no caption yet */}
            {!post.caption?.trim() && (
              <div className="mb-2">
                <button
                  onClick={handleGenerateCaption}
                  disabled={generatingCaption}
                  className="flex items-center gap-1.5 text-xs text-[#E8732A] hover:text-[#d4621f] transition-colors disabled:opacity-50"
                >
                  <Sparkles size={11} className={generatingCaption ? 'animate-pulse' : ''} />
                  {generatingCaption ? 'Generating…' : 'Quick generate caption'}
                </button>
                {captionGenError && (
                  <p className="text-[10px] text-red-400 mt-1">{captionGenError}</p>
                )}
              </div>
            )}
            <CaptionEditor
              postId={post.id}
              initialCaption={post.caption ?? ''}
              onSaved={() => router.refresh()}
            />
          </Section>

          {/* CTA + Phone */}
          {(post.cta || post.phone) && (
            <Section label="CTA">
              <div className="space-y-1.5">
                {post.cta && (
                  <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2">
                    <span className="text-sm text-white">{post.cta}</span>
                    <CopyBtn text={post.cta} field="cta" />
                  </div>
                )}
                {post.phone && (
                  <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2">
                    <span className="text-sm text-[#999999]">{post.phone}</span>
                    <CopyBtn text={post.phone} field="phone" />
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Hashtags */}
          {post.hashtags && (
            <Section label="Hashtags">
              <div className="flex items-start justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 gap-2">
                <p className="text-xs text-[#999999] leading-relaxed flex-1">{post.hashtags}</p>
                <CopyBtn text={post.hashtags} field="hashtags" />
              </div>
            </Section>
          )}

          {/* AI Reasoning */}
          {post.ai_reasoning && (
            <Section label="AI Reasoning">
              <p className="text-xs text-[#555555] italic leading-relaxed">{post.ai_reasoning}</p>
            </Section>
          )}

          {/* Assigned to */}
          {assignedProfile && (
            <Section label="Assigned To">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#E8732A]/20 text-[#E8732A] text-[10px] font-bold flex items-center justify-center">
                  {assignedProfile.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm text-white">{assignedProfile.name}</span>
              </div>
            </Section>
          )}

          {/* Status */}
          <Section label="Status">
            <div className="space-y-2">
              <PostStatusBadge status={post.status} />
              <select
                value={post.status}
                onChange={(e) => handleStatusChange(e.target.value as PostStatus)}
                disabled={updatingStatus}
                className="w-full h-9 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8732A] disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </Section>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={() => handleStatusChange('scheduled')}
              disabled={updatingStatus || post.status === 'scheduled' || post.status === 'published'}
              className="w-full bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-9"
            >
              Mark as Scheduled
            </Button>
            <Button
              onClick={() => handleStatusChange('ready')}
              disabled={updatingStatus || post.status === 'ready' || post.status === 'scheduled' || post.status === 'published'}
              variant="outline"
              className="w-full border-[#2a2a2a] text-[#999999] hover:text-white hover:border-[#555555] h-9"
            >
              Mark as Ready
            </Button>
            {/* Push to Meta — disabled in Phase 2 (Amendment 4) */}
            <Button
              disabled
              variant="outline"
              className="w-full border-[#2a2a2a] text-[#555555] h-9 cursor-not-allowed"
              title="Meta publishing — coming soon."
            >
              Push to Meta
              <span className="ml-2 text-[10px] text-[#333333]">coming soon</span>
            </Button>
          </div>

          {/* Delete confirmation dialog */}
          {showDeleteConfirm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => !deletingVisual && setShowDeleteConfirm(false)}
            >
              <div
                className="bg-[#111111] border border-[#2a2a2a] rounded-md p-5 max-w-sm mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-white font-medium mb-2">Delete Visual?</h3>
                <p className="text-sm text-[#999999] mb-4">
                  This will remove the visual and reset the post to &quot;In Production&quot;.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => !deletingVisual && setShowDeleteConfirm(false)}
                    disabled={deletingVisual}
                    className="px-3 py-2 rounded-md text-sm font-medium border border-[#2a2a2a] text-[#999999] hover:text-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteVisual}
                    disabled={deletingVisual}
                    className="px-3 py-2 rounded-md text-sm font-medium bg-red-900/20 border border-red-600/50 text-red-400 hover:bg-red-900/30 hover:border-red-500/70 transition-colors disabled:opacity-50"
                  >
                    {deletingVisual ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
    {modalPortal}
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-[#555555] font-medium uppercase tracking-wider">{label}</p>
      {children}
    </div>
  )
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`
}
