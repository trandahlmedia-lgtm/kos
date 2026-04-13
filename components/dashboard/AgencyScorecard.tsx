import Link from 'next/link'
import { type Client, type AgencyTask } from '@/types'
import { ContentVelocityChart } from './ContentVelocityChart'
import { WeeklyWins } from './WeeklyWins'

interface AgencyScorecardProps {
  clients: Client[]
  totalMrr: number
  overdueInvoices: { id: string; amount: number }[]
  overdueTotal: number
  aiCostThisMonth: number
  contentVelocityData: { week: string; count: number }[]
  postsThisMonthByClient: Record<string, number>
  onboardingPctByClient: Record<string, number>
  weeklyWinsTasks: AgencyTask[]
}

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  full_service: 'Full Service',
  website: 'Website',
  starter: 'Starter',
  growth: 'Growth',
  full_stack: 'Full Stack',
}

function getHealthBadge(
  lastPostAt: string | undefined,
  onboardingPct: number | undefined
): { label: string; dotColor: string; textColor: string } {
  // New: onboarding exists but < 50% complete
  if (onboardingPct !== undefined && onboardingPct < 50) {
    return { label: 'New', dotColor: '#555555', textColor: 'text-[#999999]' }
  }

  // No posts at all
  if (!lastPostAt) {
    return { label: 'At Risk', dotColor: '#ef4444', textColor: 'text-red-400' }
  }

  const days = Math.floor((Date.now() - new Date(lastPostAt).getTime()) / 86400000)

  if (days <= 7) return { label: 'Good', dotColor: '#22c55e', textColor: 'text-green-400' }
  if (days <= 14) return { label: 'Attention', dotColor: '#facc15', textColor: 'text-yellow-400' }
  return { label: 'At Risk', dotColor: '#ef4444', textColor: 'text-red-400' }
}

export function AgencyScorecard({
  clients,
  totalMrr,
  overdueInvoices,
  overdueTotal,
  aiCostThisMonth,
  contentVelocityData,
  postsThisMonthByClient,
  onboardingPctByClient,
  weeklyWinsTasks,
}: AgencyScorecardProps) {
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
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
            <p className="text-xs text-[#555555] mt-1">
              {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-5">
          <p className="text-xs text-[#555555] uppercase tracking-wider mb-1">AI Cost (Mo)</p>
          <p className="text-2xl font-semibold text-white">
            ${aiCostThisMonth.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Content Velocity Chart */}
      <ContentVelocityChart data={contentVelocityData} />

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
                <th className="text-left px-4 py-3 text-xs text-[#555555] font-medium uppercase tracking-wider">Posts/Mo</th>
                <th className="text-left px-4 py-3 text-xs text-[#555555] font-medium uppercase tracking-wider">Health</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#555555] text-sm">
                    No active clients
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const health = getHealthBadge(
                    client.last_post_at,
                    onboardingPctByClient[client.id]
                  )
                  const postsThisMonth = postsThisMonthByClient[client.id] ?? 0
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-white hover:text-[#E8732A] transition-colors"
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#999999]">
                        {client.tier ? TIER_LABELS[client.tier] : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#999999]">
                        ${(client.mrr ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[#999999]">
                        {postsThisMonth > 0 ? postsThisMonth : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 ${health.textColor}`}>
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: health.dotColor }}
                          />
                          {health.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* This Week's Wins */}
      <WeeklyWins tasks={weeklyWinsTasks} />
    </div>
  )
}
