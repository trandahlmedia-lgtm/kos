'use client'

import { useState } from 'react'
import { TodayView } from './TodayView'
import { AgencyScorecard } from './AgencyScorecard'
import { type Client, type Post, type ClientTask, type AgencyTask } from '@/types'

interface DashboardTabsProps {
  upcomingPosts: (Post & { clients?: { name: string } | null })[]
  clients: Client[]
  overdueInvoices: { id: string; amount: number }[]
  totalMrr: number
  overdueTotal: number
  today: string
  clientTasks: (ClientTask & { clients?: { id: string; name: string } | null })[]
  agencyTasks: AgencyTask[]
  // Overview tab data
  aiCostThisMonth: number
  contentVelocityData: { week: string; count: number }[]
  postsThisMonthByClient: Record<string, number>
  onboardingPctByClient: Record<string, number>
  weeklyWinsTasks: AgencyTask[]
}

export function DashboardTabs({
  upcomingPosts,
  clients,
  overdueInvoices,
  totalMrr,
  overdueTotal,
  today,
  clientTasks,
  agencyTasks,
  aiCostThisMonth,
  contentVelocityData,
  postsThisMonthByClient,
  onboardingPctByClient,
  weeklyWinsTasks,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'overview'>('today')

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8 border-b border-[#2a2a2a] pb-0">
        <button
          onClick={() => setActiveTab('today')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'today'
              ? 'border-[#E8732A] text-white'
              : 'border-transparent text-[#555555] hover:text-[#999999]'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-[#E8732A] text-white'
              : 'border-transparent text-[#555555] hover:text-[#999999]'
          }`}
        >
          Overview
        </button>
      </div>

      {activeTab === 'today' ? (
        <TodayView
          clientTasks={clientTasks}
          agencyTasks={agencyTasks}
          upcomingPosts={upcomingPosts}
          clients={clients}
          today={today}
        />
      ) : (
        <AgencyScorecard
          clients={clients}
          totalMrr={totalMrr}
          overdueInvoices={overdueInvoices}
          overdueTotal={overdueTotal}
          aiCostThisMonth={aiCostThisMonth}
          contentVelocityData={contentVelocityData}
          postsThisMonthByClient={postsThisMonthByClient}
          onboardingPctByClient={onboardingPctByClient}
          weeklyWinsTasks={weeklyWinsTasks}
        />
      )}
    </div>
  )
}
