'use client'

import { Plus } from 'lucide-react'
import { PostCard } from './PostCard'
import { type Post, type Client } from '@/types'

function getSevenDaysAgo(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
}

interface WhatNextQueueProps {
  posts: Post[]
  clients: Client[]
  signedUrlMap: Record<string, string>
  profiles: { id: string; name: string }[]
  onPostClick: (post: Post) => void
  onRefresh: () => void
  onNewPost: () => void
  onPreviewVisual?: (postId: string) => void
}

export function WhatNextQueue({
  posts,
  clients,
  signedUrlMap,
  profiles,
  onPostClick,
  onRefresh,
  onNewPost,
  onPreviewVisual,
}: WhatNextQueueProps) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]))
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.name]))

  const sevenDaysAgo = getSevenDaysAgo()

  // A post has complete creative if media was uploaded OR a visual is ready
  // (visuals still needing photos are not considered complete)
  const hasCompleteCreative = (p: Post) =>
    p.has_creative ||
    (!!p.visual && p.visual.export_status !== 'photos_needed')

  // Group posts into queue sections (mutually exclusive, priority order)
  const needsCaption = posts.filter(
    (p) => !p.caption?.trim() && p.status !== 'published'
  )
  const needsCreative = posts.filter(
    (p) =>
      p.caption?.trim() &&
      !hasCompleteCreative(p) &&
      p.status !== 'published'
  )
  // Include in_production posts that have both caption and complete creative —
  // they have no remaining blockers and belong in this queue, not a dead zone.
  const readyToPublish = posts.filter(
    (p) =>
      p.caption?.trim() &&
      hasCompleteCreative(p) &&
      (p.status === 'ready' || p.status === 'scheduled' || p.status === 'in_production')
  )
  const publishedThisWeek = posts.filter(
    (p) =>
      p.status === 'published' &&
      p.published_at != null &&
      new Date(p.published_at) >= sevenDaysAgo
  )

  const totalActionable = needsCaption.length + needsCreative.length + readyToPublish.length

  return (
    <div className="space-y-8">
      {totalActionable === 0 && publishedThisWeek.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#555555] text-sm">All clear — no posts need attention.</p>
          <button
            onClick={onNewPost}
            className="mt-3 text-xs text-[#E8732A] hover:text-[#d4621f] transition-colors"
          >
            + Create your first post
          </button>
        </div>
      )}

      <QueueSection
        title="Needs Caption"
        count={needsCaption.length}
        posts={needsCaption}
        clientMap={clientMap}
        profileMap={profileMap}
        signedUrlMap={signedUrlMap}
        onPostClick={onPostClick}
        onRefresh={onRefresh}
        onPreviewVisual={onPreviewVisual}
        emptyText="No posts waiting on a caption."
      />

      <QueueSection
        title="Needs Creative"
        count={needsCreative.length}
        posts={needsCreative}
        clientMap={clientMap}
        profileMap={profileMap}
        signedUrlMap={signedUrlMap}
        onPostClick={onPostClick}
        onRefresh={onRefresh}
        onPreviewVisual={onPreviewVisual}
        emptyText="No posts waiting on a creative."
      />

      <QueueSection
        title="Ready to Publish"
        count={readyToPublish.length}
        posts={readyToPublish}
        clientMap={clientMap}
        profileMap={profileMap}
        signedUrlMap={signedUrlMap}
        onPostClick={onPostClick}
        onRefresh={onRefresh}
        onPreviewVisual={onPreviewVisual}
        emptyText="Nothing approved or scheduled yet."
      />

      <QueueSection
        title="Published This Week"
        count={publishedThisWeek.length}
        posts={publishedThisWeek}
        clientMap={clientMap}
        profileMap={profileMap}
        signedUrlMap={signedUrlMap}
        onPostClick={onPostClick}
        onRefresh={onRefresh}
        onPreviewVisual={onPreviewVisual}
        emptyText="Nothing published in the last 7 days."
        muted
      />
    </div>
  )
}

interface QueueSectionProps {
  title: string
  count: number
  posts: Post[]
  clientMap: Record<string, string>
  profileMap: Record<string, string>
  signedUrlMap: Record<string, string>
  onPostClick: (post: Post) => void
  onRefresh: () => void
  onPreviewVisual?: (postId: string) => void
  emptyText: string
  muted?: boolean
}

function QueueSection({
  title,
  count,
  posts,
  clientMap,
  profileMap,
  signedUrlMap,
  onPostClick,
  onRefresh,
  onPreviewVisual,
  emptyText,
  muted,
}: QueueSectionProps) {
  // Resolve thumbnail URL for a post
  function getThumbnailUrl(post: Post): string | undefined {
    const thumb = post.media?.[0]
    if (!thumb) return undefined
    return signedUrlMap[thumb.thumbnail_path ?? ''] ?? signedUrlMap[thumb.storage_path] ?? undefined
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className={`text-sm font-medium ${muted ? 'text-[#555555]' : 'text-white'}`}>
          {title}
        </h2>
        {count > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            muted
              ? 'bg-[#1a1a1a] text-[#555555]'
              : 'bg-[#E8732A]/10 text-[#E8732A]'
          }`}>
            {count}
          </span>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="text-xs text-[#333333] italic">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              clientName={clientMap[post.client_id]}
              producerName={post.assigned_to ? profileMap[post.assigned_to] : undefined}
              thumbnailUrl={getThumbnailUrl(post)}
              onClick={() => onPostClick(post)}
              onRefresh={onRefresh}
              onPreviewVisual={onPreviewVisual}
            />
          ))}
        </div>
      )}
    </div>
  )
}
