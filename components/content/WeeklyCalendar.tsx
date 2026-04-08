'use client'

import { PostPill } from './PostCard'
import { type Post, type Client } from '@/types'

interface WeeklyCalendarProps {
  weekDates: string[]           // 7 ISO date strings, Mon → Sun
  posts: Post[]
  clients: Client[]             // filtered to currently selected client(s)
  onPostClick: (post: Post) => void
  onCellClick: (clientId: string, date: string) => void
}

export function WeeklyCalendar({
  weekDates,
  posts,
  clients,
  onPostClick,
  onCellClick,
}: WeeklyCalendarProps) {
  // Index posts by (client_id, date)
  const postIndex: Record<string, Post[]> = {}
  for (const post of posts) {
    if (!post.scheduled_date) continue
    const key = `${post.client_id}__${post.scheduled_date}`
    if (!postIndex[key]) postIndex[key] = []
    postIndex[key].push(post)
  }

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div
          className="grid gap-px bg-[#2a2a2a]"
          style={{ gridTemplateColumns: `160px repeat(7, 1fr)` }}
        >
          <div className="bg-[#0a0a0a] px-3 py-2" />
          {weekDates.map((date, i) => {
            const isToday = date === today
            return (
              <div
                key={date}
                className="bg-[#0a0a0a] px-2 py-2 text-center"
              >
                <p className={`text-[10px] font-medium ${isToday ? 'text-[#E8732A]' : 'text-[#555555]'}`}>
                  {DAY_LABELS[i]}
                </p>
                <p className={`text-xs font-semibold ${isToday ? 'text-[#E8732A]' : 'text-[#999999]'}`}>
                  {new Date(date + 'T12:00:00').getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Client rows */}
        {clients.map((client) => (
          <div
            key={client.id}
            className="grid gap-px bg-[#2a2a2a]"
            style={{ gridTemplateColumns: `160px repeat(7, 1fr)` }}
          >
            {/* Client label */}
            <div className="bg-[#0a0a0a] px-3 py-2 flex items-center min-h-[64px]">
              <span className="text-xs text-[#999999] font-medium truncate">{client.name}</span>
            </div>

            {/* Day cells */}
            {weekDates.map((date) => {
              const cellPosts = postIndex[`${client.id}__${date}`] ?? []
              const isToday = date === today

              return (
                <div
                  key={date}
                  onClick={() => cellPosts.length === 0 && onCellClick(client.id, date)}
                  className={`bg-[#0a0a0a] p-1.5 min-h-[64px] flex flex-col gap-0.5 transition-colors ${
                    cellPosts.length === 0
                      ? 'cursor-pointer hover:bg-[#111111] group'
                      : ''
                  } ${isToday ? 'ring-1 ring-inset ring-[#E8732A]/20' : ''}`}
                >
                  {cellPosts.length === 0 ? (
                    <span className="text-[10px] text-[#2a2a2a] group-hover:text-[#555555] transition-colors m-auto">
                      +
                    </span>
                  ) : (
                    cellPosts.map((post) => (
                      <PostPill
                        key={post.id}
                        post={post}
                        onClick={() => onPostClick(post)}
                      />
                    ))
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {clients.length === 0 && (
          <div className="text-center py-8 text-[#555555] text-sm">
            Select a client to view their calendar.
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Day View
// ---------------------------------------------------------------------------

interface DayViewProps {
  date: string
  posts: Post[]
  clients: Client[]
  signedUrlMap: Record<string, string>
  profiles: { id: string; name: string }[]
  onPostClick: (post: Post) => void
  onRefresh: () => void
}

export function DayView({
  date,
  posts,
  clients,
  onPostClick,
  onRefresh,
}: DayViewProps) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]))

  // Sort by scheduled_time (nulls last), group by client
  const byClient = posts.reduce<Record<string, Post[]>>((acc, p) => {
    if (!acc[p.client_id]) acc[p.client_id] = []
    acc[p.client_id].push(p)
    return acc
  }, {})

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div>
      <p className="text-sm text-[#999999] mb-4">{displayDate}</p>
      {posts.length === 0 ? (
        <p className="text-sm text-[#555555] italic">No posts scheduled for this day.</p>
      ) : (
        Object.entries(byClient).map(([clientId, clientPosts]) => (
          <div key={clientId} className="mb-6">
            <p className="text-xs text-[#555555] font-medium uppercase tracking-wider mb-3">
              {clientMap[clientId] ?? 'Unknown client'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {clientPosts
                .sort((a, b) => (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? ''))
                .map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onPostClick(post)}
                    className="bg-[#111111] border border-[#2a2a2a] rounded-md p-3 cursor-pointer hover:border-[#555555] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[#E8732A] font-medium">
                        {post.scheduled_time ? formatTime(post.scheduled_time) : 'No time set'}
                      </span>
                      <span className="text-xs text-[#555555]">
                        {post.platform}
                      </span>
                    </div>
                    <p className="text-xs text-[#999999] line-clamp-2">
                      {post.caption ?? <span className="italic text-[#555555]">No caption</span>}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`
}
