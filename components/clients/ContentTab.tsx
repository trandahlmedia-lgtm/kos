'use client'

import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { type Post, type PostStatus, type ContentType, type Platform } from '@/types'
import { PostStatusBadge } from '@/components/shared/StatusBadge'
import { PlatformIcon } from '@/components/shared/PlatformIcon'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_ORDER: PostStatus[] = ['slot', 'in_production', 'ready', 'scheduled', 'published']
const STATUS_LABEL: Record<PostStatus, string> = {
  slot: 'Draft',
  in_production: 'In Production',
  ready: 'Ready',
  scheduled: 'Scheduled',
  published: 'Published',
}

const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  offer: 'Offer',
  seasonal: 'Seasonal',
  trust: 'Trust',
  differentiator: 'Differentiator',
  social_proof: 'Social Proof',
  education: 'Education',
  bts: 'BTS',
  before_after: 'Before/After',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

function getMonthRange() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContentTabProps {
  posts: Post[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContentTab({ posts }: ContentTabProps) {
  const now = new Date()
  const { monday, sunday } = getWeekRange()
  const monthStart = getMonthRange()

  const postsThisWeek = posts.filter((p) => {
    if (!p.scheduled_date) return false
    const d = new Date(p.scheduled_date + 'T12:00:00')
    return d >= monday && d <= sunday
  }).length

  const postsThisMonth = posts.filter((p) => {
    if (!p.scheduled_date) return false
    const d = new Date(p.scheduled_date + 'T12:00:00')
    return d >= monthStart && d <= now
  }).length

  // Build pillar distribution for chart
  const pillarCounts: Partial<Record<ContentType, number>> = {}
  for (const post of posts) {
    if (post.content_type) {
      pillarCounts[post.content_type] = (pillarCounts[post.content_type] ?? 0) + 1
    }
  }
  const chartData = (Object.entries(pillarCounts) as [ContentType, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      name: CONTENT_TYPE_LABEL[type] ?? type,
      count,
    }))

  // Group posts by status
  const grouped: Record<PostStatus, Post[]> = {
    slot: [],
    in_production: [],
    ready: [],
    scheduled: [],
    published: [],
  }
  for (const post of posts) {
    grouped[post.status]?.push(post)
  }

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3">
          <p className="text-xs text-[#555555] mb-1">Posts this week</p>
          <p className="text-lg font-semibold text-white">{postsThisWeek}</p>
        </div>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3">
          <p className="text-xs text-[#555555] mb-1">Posts this month</p>
          <p className="text-lg font-semibold text-white">{postsThisMonth}</p>
        </div>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3">
          <p className="text-xs text-[#555555] mb-1">Total posts</p>
          <p className="text-lg font-semibold text-white">{posts.length}</p>
        </div>
      </div>

      {/* Pillar distribution chart */}
      {chartData.length > 0 && (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4">
          <p className="text-xs text-[#555555] uppercase tracking-wider mb-4">By Content Type</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#555555', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#555555', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(232, 115, 42, 0.05)' }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#E8732A' : '#2a2a2a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Posts grouped by status */}
      {STATUS_ORDER.map((status) => {
        const statusPosts = grouped[status]
        if (statusPosts.length === 0) return null

        return (
          <section key={status}>
            <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-2 flex items-center gap-2">
              {STATUS_LABEL[status]}
              <span className="text-[#333333] font-normal">{statusPosts.length}</span>
            </h3>
            <div className="space-y-1.5">
              {statusPosts.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          </section>
        )
      })}

      {posts.length === 0 && (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md px-6 py-8 text-center">
          <p className="text-sm text-[#555555]">No posts yet for this client.</p>
          <Link href="/content" className="text-xs text-[#E8732A] hover:underline mt-2 inline-block">
            Go to Content →
          </Link>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PostRow
// ---------------------------------------------------------------------------

function PostRow({ post }: { post: Post }) {
  const captionPreview = post.caption?.slice(0, 60)
  const title = post.angle ?? (captionPreview ? captionPreview + (post.caption!.length > 60 ? '…' : '') : 'Untitled post')

  const dateLabel = post.scheduled_date
    ? new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <Link
      href={`/content`}
      className="flex items-center gap-3 bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3 hover:border-[#3a3a3a] transition-colors"
    >
      {/* Title */}
      <span className="text-sm text-white flex-1 min-w-0 truncate">{title}</span>

      {/* Right side metadata */}
      <div className="flex items-center gap-2 shrink-0">
        {post.content_type && (
          <span className="text-xs text-[#555555] hidden sm:block">
            {CONTENT_TYPE_LABEL[post.content_type] ?? post.content_type}
          </span>
        )}
        <PlatformIcon platform={post.platform as Platform} size="sm" />
        <PostStatusBadge status={post.status} />
        {dateLabel && (
          <span className="text-xs text-[#555555] hidden md:block">{dateLabel}</span>
        )}
      </div>
    </Link>
  )
}
