'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Sparkles } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { PostStatusBadge } from '@/components/shared/StatusBadge'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { CaptionEditor } from './CaptionEditor'
import { CreativeUploader } from './CreativeUploader'
import { updatePostStatusAction } from '@/lib/actions/posts'
import { type Post, type PostStatus, type GeneratedCaptions } from '@/types'

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: 'slot', label: 'Slot' },
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
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [captionGenError, setCaptionGenError] = useState('')

  if (!post) return null

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
            <CreativeUploader
              postId={post.id}
              clientId={post.client_id}
              existingThumbnailUrl={thumbnailUrl}
            />
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
        </div>
      </SheetContent>
    </Sheet>
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
