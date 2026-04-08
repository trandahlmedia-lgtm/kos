'use client'

import { Users, FlaskConical, Mail, Eye, MessageCircle, UserCheck, Send } from 'lucide-react'

interface OutreachStatsProps {
  stats: {
    totalLeads: number
    researched: number
    emailed: number
    opened: number
    replied: number
    converted: number
    sentToday: number
    dailyLimit: number
  }
}

const PIPELINE_STEPS = [
  { key: 'totalLeads', label: 'Discovered', icon: Users, color: 'text-[#999999]' },
  { key: 'researched', label: 'Researched', icon: FlaskConical, color: 'text-blue-400' },
  { key: 'emailed', label: 'Emailed', icon: Mail, color: 'text-[#E8732A]' },
  { key: 'opened', label: 'Opened', icon: Eye, color: 'text-yellow-400' },
  { key: 'replied', label: 'Replied', icon: MessageCircle, color: 'text-purple-400' },
  { key: 'converted', label: 'Converted', icon: UserCheck, color: 'text-green-400' },
] as const

export function OutreachStats({ stats }: OutreachStatsProps) {
  return (
    <div className="space-y-6">
      {/* Pipeline funnel */}
      <div>
        <h3 className="text-xs font-medium text-[#E8732A] uppercase tracking-wide mb-4">Pipeline</h3>
        <div className="grid grid-cols-6 gap-3">
          {PIPELINE_STEPS.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="bg-[#111111] border border-[#2a2a2a] rounded-md p-3 text-center space-y-2">
              <Icon size={16} className={`mx-auto ${color}`} />
              <p className="text-lg font-semibold text-white">{stats[key]}</p>
              <p className="text-[10px] text-[#555555] uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion rates */}
      <div>
        <h3 className="text-xs font-medium text-[#555555] uppercase tracking-wide mb-4">Conversion Rates</h3>
        <div className="grid grid-cols-3 gap-3">
          <RateCard
            label="Research → Email"
            value={stats.researched > 0 ? Math.round((stats.emailed / stats.researched) * 100) : 0}
          />
          <RateCard
            label="Email → Open"
            value={stats.emailed > 0 ? Math.round((stats.opened / stats.emailed) * 100) : 0}
          />
          <RateCard
            label="Email → Reply"
            value={stats.emailed > 0 ? Math.round((stats.replied / stats.emailed) * 100) : 0}
          />
        </div>
      </div>

      {/* Daily sends */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send size={14} className="text-[#555555]" />
            <span className="text-sm text-[#999999]">Daily Sends</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold text-white">{stats.sentToday}</span>
            <span className="text-sm text-[#555555]"> / {stats.dailyLimit}</span>
          </div>
        </div>
        <div className="mt-2 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#E8732A] rounded-full transition-all"
            style={{ width: `${Math.min(100, (stats.sentToday / stats.dailyLimit) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function RateCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-3 text-center">
      <p className="text-lg font-semibold text-white">{value}%</p>
      <p className="text-[10px] text-[#555555] mt-1">{label}</p>
    </div>
  )
}
