import { type PostStatus, type ClientStatus, type LeadStage } from '@/types'

const POST_STATUS_CONFIG: Record<PostStatus, { label: string; className: string }> = {
  slot: { label: 'Slot', className: 'text-[#555555] bg-[#1a1a1a] border border-[#2a2a2a]' },
  in_production: { label: 'In Production', className: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  ready: { label: 'Ready', className: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' },
  scheduled: { label: 'Scheduled', className: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  published: { label: 'Published', className: 'text-[#E8732A] bg-[#E8732A]/10 border border-[#E8732A]/20' },
}

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const config = POST_STATUS_CONFIG[status] ?? {
    label: 'Unknown',
    className: 'text-[#555555] bg-[#1a1a1a] border border-[#2a2a2a]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

const CLIENT_STATUS_CONFIG: Record<ClientStatus, { label: string; dot: string }> = {
  active: { label: 'Active', dot: 'bg-green-400' },
  paused: { label: 'Paused', dot: 'bg-yellow-400' },
  churned: { label: 'Churned', dot: 'bg-red-400' },
}

export function ClientStatusDot({ status }: { status: ClientStatus }) {
  const config = CLIENT_STATUS_CONFIG[status]
  return (
    <span className="flex items-center gap-1.5 text-xs text-[#999999]">
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

const LEAD_STAGE_CONFIG: Record<LeadStage, { label: string; className: string }> = {
  new: { label: 'New', className: 'text-[#999999] bg-[#1a1a1a] border border-[#2a2a2a]' },
  reached_out: { label: 'Reached Out', className: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' },
  connected: { label: 'Connected', className: 'text-sky-400 bg-sky-400/10 border border-sky-400/20' },
  interested: { label: 'Interested', className: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  proposal_sent: { label: 'Proposal Sent', className: 'text-[#E8732A] bg-[#E8732A]/10 border border-[#E8732A]/20' },
  won: { label: 'Won', className: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  lost: { label: 'Lost', className: 'text-red-400 bg-red-400/10 border border-red-400/20' },
}

export function LeadStageBadge({ stage }: { stage: LeadStage }) {
  const config = LEAD_STAGE_CONFIG[stage]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
