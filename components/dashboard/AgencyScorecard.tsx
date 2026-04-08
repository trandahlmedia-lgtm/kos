import Link from 'next/link'
import { type Client } from '@/types'

interface AgencyScorecardProps {
  clients: Client[]
  totalMrr: number
  overdueInvoices: { id: string; amount: number }[]
  overdueTotal: number
}

function getHealthStatus(lastPostAt?: string): { label: string; className: string } {
  if (!lastPostAt) return { label: 'No posts', className: 'text-red-400' }
  const days = Math.floor((Date.now() - new Date(lastPostAt).getTime()) / 86400000)
  if (days <= 7) return { label: `${days}d ago`, className: 'text-green-400' }
  if (days <= 14) return { label: `${days}d ago`, className: 'text-yellow-400' }
  return { label: `${days}d ago`, className: 'text-red-400' }
}

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  full_service: 'Full Service',
  website: 'Website',
  starter: 'Starter',
  growth: 'Growth',
  full_stack: 'Full Stack',
}

export function AgencyScorecard({
  clients,
  totalMrr,
  overdueInvoices,
  overdueTotal,
}: AgencyScorecardProps) {
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-5">
          <p className="text-xs text-[#555555] uppercase tracking-wider mb-1">Monthly MRR</p>
          <p className="text-2xl font-semibold text-white">
            ${totalMrr.toLocaleString()}
          </p>
        </div>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-5">
          <p className="text-xs text-[#555555] uppercase tracking-wider mb-1">Active Clients</p>
          <p className="text-2xl font-semibold text-white">{clients.length}</p>
        </div>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-5">
          <p className="text-xs text-[#555555] uppercase tracking-wider mb-1">Outstanding</p>
          <p className={`text-2xl font-semibold ${overdueTotal > 0 ? 'text-[#E8732A]' : 'text-white'}`}>
            ${overdueTotal.toLocaleString()}
          </p>
          {overdueInvoices.length > 0 && (
            <p className="text-xs text-[#555555] mt-1">{overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* Client Health Table */}
      <section>
        <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-3">
          Client Health
        </h3>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-xs text-[#555555] font-medium uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs text-[#555555] font-medium uppercase tracking-wider">Tier</th>
                <th className="text-left px-4 py-3 text-xs text-[#555555] font-medium uppercase tracking-wider">MRR</th>
                <th className="text-left px-4 py-3 text-xs text-[#555555] font-medium uppercase tracking-wider">Last Post</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#555555] text-sm">
                    No active clients
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const health = getHealthStatus(client.last_post_at)
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/clients/${client.id}`} className="text-white hover:text-[#E8732A] transition-colors">
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#999999]">
                        {client.tier ? TIER_LABELS[client.tier] : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#999999]">
                        ${(client.mrr ?? 0).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 ${health.className}`}>
                        {health.label}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
