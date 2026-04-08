import Link from 'next/link'

function getDaysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}
import { CheckCircle, AlertCircle } from 'lucide-react'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { PostStatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { type Client, type Post, type Platform } from '@/types'

interface TodayViewProps {
  posts: (Post & { clients?: { name: string } | null })[]
  clients: Client[]
  today: string
}

export function TodayView({ posts, clients, today }: TodayViewProps) {
  const formattedDate = new Date(today + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // Clients with no post scheduled in last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const inactiveClients = clients.filter((c) => {
    if (!c.last_post_at) return true
    return new Date(c.last_post_at) < sevenDaysAgo
  })

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-white">{formattedDate}</h2>

      {/* Going out today */}
      <section>
        <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-3">
          Going out today
        </h3>
        {posts.length === 0 ? (
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-md">
            <EmptyState
              title="All clear today"
              description="Nothing scheduled to go out."
              icon={<CheckCircle size={24} />}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/content/${post.id}`}
                className="flex items-center gap-4 bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3 hover:border-[#E8732A]/30 transition-colors"
              >
                <PlatformIcon platform={post.platform as Platform} size="sm" />
                <span className="text-sm font-medium text-white flex-1 min-w-0">
                  {post.clients?.name ?? 'Unknown client'}
                </span>
                {post.scheduled_time && (
                  <span className="text-xs text-[#555555] shrink-0">
                    {post.scheduled_time.slice(0, 5)}
                  </span>
                )}
                <PostStatusBadge status={post.status} />
                {post.caption && (
                  <span className="text-xs text-[#555555] truncate max-w-[200px] hidden lg:block">
                    {post.caption.slice(0, 80)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Needs attention */}
      {inactiveClients.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-3">
            Needs attention
          </h3>
          <div className="space-y-2">
            {inactiveClients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center gap-3 bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3 hover:border-yellow-400/30 transition-colors"
              >
                <AlertCircle size={14} className="text-yellow-400 shrink-0" />
                <span className="text-sm text-white">{client.name}</span>
                <span className="text-xs text-[#555555]">
                  {client.last_post_at
                    ? `No posts in ${getDaysSince(client.last_post_at)} days`
                    : 'No posts yet'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
