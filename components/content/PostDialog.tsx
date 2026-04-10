'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { createPostAction, updatePostAction } from '@/lib/actions/posts'
import { type Post, type Platform, type ContentType, type PostFormat, type PostPlacement, type Client } from '@/types'

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'nextdoor', label: 'Nextdoor' },
]

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'offer', label: 'Offer' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'trust', label: 'Trust' },
  { value: 'differentiator', label: 'Differentiator' },
  { value: 'social_proof', label: 'Social Proof' },
  { value: 'education', label: 'Education' },
  { value: 'bts', label: 'Behind the Scenes' },
  { value: 'before_after', label: 'Before & After' },
]

const VISUAL_FORMATS: { value: PostFormat; label: string }[] = [
  { value: 'carousel', label: 'Carousel · Feed' },
  { value: 'static', label: 'Static · Feed' },
  { value: 'story_sequence', label: 'Carousel · Story' },
  { value: 'static_story', label: 'Static · Story' },
]

const FORMAT_PLACEMENT: Record<PostFormat, PostPlacement> = {
  carousel: 'feed',
  static: 'feed',
  story_sequence: 'story',
  static_story: 'story',
}

interface PostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // When editing an existing post
  post?: Post
  // Pre-fill values when creating (e.g. from calendar cell click)
  defaultClientId?: string
  defaultDate?: string
  clients: Client[]
  profiles: { id: string; name: string }[]
}

export function PostDialog({
  open,
  onOpenChange,
  post,
  defaultClientId,
  defaultDate,
  clients,
  profiles,
}: PostDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    client_id: post?.client_id ?? defaultClientId ?? '',
    platform: (post?.platform ?? '') as Platform | '',
    content_type: (post?.content_type ?? '') as ContentType | '',
    format: (post?.format ?? 'carousel') as PostFormat,
    placement: (post?.placement ?? FORMAT_PLACEMENT[post?.format ?? 'carousel']) as PostPlacement,
    scheduled_date: post?.scheduled_date ?? defaultDate ?? '',
    scheduled_time: post?.scheduled_time ?? '',
    assigned_to: post?.assigned_to ?? '',
    cta: post?.cta ?? '',
    phone: post?.phone ?? '',
    hashtags: post?.hashtags ?? '',
  })

  const isEditing = !!post

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.platform) return
    setError('')
    setLoading(true)

    try {
      if (isEditing) {
        await updatePostAction(post.id, {
          platform: form.platform as Platform,
          content_type: (form.content_type as ContentType) || undefined,
          format: form.format,
          placement: form.placement,
          cta: form.cta || undefined,
          phone: form.phone || undefined,
          hashtags: form.hashtags || undefined,
          scheduled_date: form.scheduled_date || undefined,
          scheduled_time: form.scheduled_time || undefined,
          assigned_to: form.assigned_to || undefined,
        })
      } else {
        await createPostAction({
          client_id: form.client_id,
          platform: form.platform as Platform,
          content_type: (form.content_type as ContentType) || undefined,
          format: form.format,
          placement: form.placement,
          cta: form.cta || undefined,
          phone: form.phone || undefined,
          hashtags: form.hashtags || undefined,
          scheduled_date: form.scheduled_date || undefined,
          scheduled_time: form.scheduled_time || undefined,
          assigned_to: form.assigned_to || undefined,
        })
      }

      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post.')
      setLoading(false)
    }
  }

  const inputClass =
    'bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-[#555555] focus-visible:ring-[#E8732A] focus-visible:border-[#E8732A] h-9 text-sm'
  const labelClass = 'text-xs text-[#999999] font-medium'
  const selectClass =
    'w-full h-9 px-3 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8732A]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{isEditing ? 'Edit Post' : 'New Post'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Client — only shown when creating */}
            {!isEditing && (
              <div className="col-span-2 space-y-1.5">
                <Label className={labelClass}>Client *</Label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                  required
                  className={selectClass}
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className={labelClass}>Platform *</Label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as Platform }))}
                required
                className={selectClass}
              >
                <option value="">Select platform</option>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Content Type</Label>
              <select
                value={form.content_type}
                onChange={(e) => setForm((f) => ({ ...f, content_type: e.target.value as ContentType }))}
                className={selectClass}
              >
                <option value="">Select type</option>
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Visual Format</Label>
              <select
                value={form.format}
                onChange={(e) => {
                  const fmt = e.target.value as PostFormat
                  setForm((f) => ({ ...f, format: fmt, placement: FORMAT_PLACEMENT[fmt] }))
                }}
                className={selectClass}
              >
                {VISUAL_FORMATS.map((vf) => (
                  <option key={vf.value} value={vf.value}>{vf.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Scheduled Date</Label>
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Scheduled Time</Label>
              <Input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className={labelClass}>Assigned To</Label>
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                className={selectClass}
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>CTA</Label>
              <Input
                value={form.cta}
                onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))}
                placeholder="Book a Free Estimate"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Phone (for CTA)</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(612) 555-0100"
                className={inputClass}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className={labelClass}>Hashtags</Label>
              <Input
                value={form.hashtags}
                onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
                placeholder="#hvac #twincitieshvac #homeservice"
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[#999999] hover:text-white hover:bg-[#1a1a1a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.client_id || !form.platform}
              className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0"
            >
              {loading ? 'Saving…' : isEditing ? 'Save changes' : 'Create post'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
