import Link from 'next/link'
import { type Client } from '@/types'
import { ClientStatusDot } from '@/components/shared/StatusBadge'

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  full_service: 'Full Service',
  website: 'Website',
  starter: 'Starter',
  growth: 'Growth',
  full_stack: 'Full Stack',
}

const TIER_COLORS: Record<string, string> = {
  basic: 'text-[#999999] bg-[#1a1a1a] border-[#2a2a2a]',
  starter: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  growth: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  full_service: 'text-[#E8732A] bg-[#E8732A]/10 border-[#E8732A]/20',
  website: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  full_stack: 'text-green-400 bg-green-400/10 border-green-400/20',
}

interface ClientCardProps {
  client: Client
  producerName?: string
}

function getDaysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export function ClientCard({ client, producerName }: ClientCardProps) {
  const lastPostLabel = client.last_post_at
    ? `${getDaysSince(client.last_post_at)}d ago`
    : 'No posts'

  return (
    <Link
      href={`/clients/${client.id}`}
      className="block bg-[#111111] border border-[#2a2a2a] rounded-md p-5 hover:border-[#E8732A]/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-semibold text-white leading-tight">{client.name}</h3>
        {client.tier && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ml-2 ${
              TIER_COLORS[client.tier] ?? TIER_COLORS.basic
            }`}
          >
            {TIER_LABELS[client.tier] ?? client.tier}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#555555]">MRR</span>
          <span className="text-sm font-medium text-white">${(client.mrr ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#555555]">Last post</span>
          <span className="text-xs text-[#999999]">{lastPostLabel}</span>
        </div>
        {producerName && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#555555]">Producer</span>
            <span className="text-xs text-[#999999]">{producerName}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
        <ClientStatusDot status={client.status} />
      </div>
    </Link>
  )
}
