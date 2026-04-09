'use client'

import { useState } from 'react'
import { MoreHorizontal, Copy, Trash2, CheckSquare, Video } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PostStatusBadge } from '@/components/shared/StatusBadge'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { GenerateVisualButton } from './GenerateVisualButton'
import { VisualStatusBadge } from './VisualStatusBadge'
import { deletePostAction, updatePostStatusAction } from '@/lib/actions/posts'
import { type Post } from '@/types'

const CONTENT_TYPE_LABELS: Record<string, string> = {
  offer: 'Offer',
  seasonal: 'Seasonal',
  trust: 'Trust',
  differentiator: 'Differentiator',
  social_proof: 'Social Proof',
  education: 'Education',
  bts: 'BTS',
  before_after: 'Before & After',
}

interface PostCardProps {
  post: Post
  clientName?: string
  producerName?: string
  thumbnailUrl?: string
  onClick: () => void
  onRefresh: () => void
  onPreviewVisual?: (postId: string) => void
}

const FORMAT_LABELS: Record<string, string> = {
  carousel: 'Carousel',
  static: 'Static',
}

const PLACEMENT_LABELS: Record<string, string> = {
  feed: 'Feed',
  story: 'Story',
}

export function PostCard({
  post,
  clientName,
  producerName,
  thumbnailUrl,
  onClick,
  onRefresh,
  onPreviewVisual,
}: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const captionPreview = post.caption
    ? post.caption.slice(0, 80) + (post.caption.length > 80 ? '…' : '')
    : null

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    if (!confirm('Delete this post?')) return
    try {
      await deletePostAction(post.id)
      onRefresh()
    } catch {
      alert('Failed to delete post.')
    }
  }

  async function handleMarkPublished(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    try {
      await updatePostStatusAction(post.id, 'published')
      onRefresh()
    } catch {
      alert('Failed to update status.')
    }
  }

  return (
    <div
      onClick={onClick}
      className="relative bg-[#111111] border border-[#2a2a2a] rounded-md p-3 cursor-pointer hover:border-[#555555] transition-colors group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={post.platform} size="sm" />
          {post.content_type && (
            <span className="text-xs text-[#555555]">
              {CONTENT_TYPE_LABELS[post.content_type] ?? post.content_type}
            </span>
          )}
          {post.format && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-[#999999] bg-[#1a1a1a] border border-[#2a2a2a]">
              {FORMAT_LABELS[post.format] ?? post.format}
            </span>
          )}
          {post.placement && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-[#999999] bg-[#1a1a1a] border border-[#2a2a2a]">
              {PLACEMENT_LABELS[post.placement] ?? post.placement}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PostStatusBadge status={post.status} />
          {/* Three-dot menu — stops propagation so it doesn't open the panel */}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-[#555555] hover:text-white transition-colors rounded"
            >
              <MoreHorizontal size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={handleMarkPublished}
                className="cursor-pointer hover:bg-[#2a2a2a] text-xs"
              >
                <CheckSquare size={12} className="mr-2" />
                Mark Published
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2a2a2a]" />
              <DropdownMenuItem
                onClick={handleDelete}
                className="cursor-pointer hover:bg-[#2a2a2a] text-red-400 text-xs"
              >
                <Trash2 size={12} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Creative thumbnail or upload placeholder */}
      <div className="mb-2">
        {thumbnailUrl ? (
          <div className="w-full h-24 rounded overflow-hidden bg-[#1a1a1a]">
            <img
              src={thumbnailUrl}
              alt="Creative thumbnail"
              className="w-full h-full object-cover"
            />
          </div>
        ) : post.has_creative ? (
          // Has creative but no thumbnail yet (e.g., video)
          <div className="w-full h-24 rounded bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <Video size={20} className="text-[#555555]" />
          </div>
        ) : (
          // No creative — dashed upload hint
          <div className="w-full h-24 rounded border border-dashed border-[#2a2a2a] flex items-center justify-center">
            <span className="text-[10px] text-[#555555]">No creative</span>
          </div>
        )}
      </div>

      {/* Caption preview */}
      {captionPreview ? (
        <p className="text-xs text-[#999999] leading-relaxed mb-1 line-clamp-2">
          {captionPreview}
        </p>
      ) : (
        <p className="text-xs text-[#555555] italic mb-1">No caption yet</p>
      )}

      {/* AI reasoning */}
      {post.ai_reasoning && (
        <p className="text-[10px] text-[#555555] italic leading-relaxed mb-2 line-clamp-1">
          {post.ai_reasoning}
        </p>
      )}

      {/* Visual generate / preview */}
      <div className="flex items-center gap-2 mb-2">
        <GenerateVisualButton
          postId={post.id}
          hasVisual={!!post.visual}
          exportStatus={post.visual?.export_status}
          onPreview={() => onPreviewVisual?.(post.id)}
          onRefresh={onRefresh}
        />
        <VisualStatusBadge status={post.visual?.export_status} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-1.5">
          {/* Assigned-to initial badge */}
          {producerName && (
            <span className="w-5 h-5 rounded-full bg-[#E8732A]/20 text-[#E8732A] text-[9px] font-bold flex items-center justify-center">
              {producerName.charAt(0).toUpperCase()}
            </span>
          )}
          {clientName && (
            <span className="text-[10px] text-[#555555] truncate max-w-[80px]">{clientName}</span>
          )}
        </div>
        {post.scheduled_date && (
          <span className="text-[10px] text-[#555555]">
            {new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
            {post.scheduled_time && ` · ${formatTime(post.scheduled_time)}`}
          </span>
        )}
      </div>
    </div>
  )
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

// Compact pill variant used in the weekly calendar grid
interface PostPillProps {
  post: Post
  onClick: () => void
}

const PILL_STATUS_COLORS: Record<string, string> = {
  slot: '#555555',
  in_production: '#facc15',
  ready: '#60a5fa',
  scheduled: '#4ade80',
  published: '#E8732A',
}

export function PostPill({ post, onClick }: PostPillProps) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] cursor-pointer hover:border-[#555555] transition-colors w-full"
    >
      <PlatformIcon platform={post.platform} size="sm" />
      <span className="text-[#999999] truncate flex-1">
        {post.content_type
          ? (CONTENT_TYPE_LABELS[post.content_type] ?? post.content_type)
          : 'Post'}
      </span>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: PILL_STATUS_COLORS[post.status] ?? '#555555' }}
      />
    </div>
  )
}
