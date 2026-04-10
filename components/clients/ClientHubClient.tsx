'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClaudeMdEditor } from './ClaudeMdEditor'
import { OnboardingChecklist } from './OnboardingChecklist'
import { BrandAssetsPanel } from './BrandAssetsPanel'
import { EditClientDialog } from './EditClientDialog'
import { ClientStatusDot } from '@/components/shared/StatusBadge'
import { type Client, type OnboardingStep } from '@/types'

function getDaysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  full_service: 'Full Service',
  website: 'Website',
  starter: 'Starter',
  growth: 'Growth',
  full_stack: 'Full Stack',
}

interface ClientHubClientProps {
  client: Client
  onboardingSteps: OnboardingStep[]
  profiles: { id: string; name: string }[]
  profileMap: Record<string, string>
  postsThisMonth: number
}

export function ClientHubClient({
  client,
  onboardingSteps,
  profiles,
  profileMap,
  postsThisMonth,
}: ClientHubClientProps) {
  const [editOpen, setEditOpen] = useState(false)

  const completedSteps = onboardingSteps.filter((s) => s.completed).length
  const totalSteps = onboardingSteps.length
  const onboardingPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  const daysSinceStart = client.contract_start
    ? getDaysSince(client.contract_start)
    : null

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">{client.name}</h1>
          <div className="mt-1">
            <ClientStatusDot status={client.status} />
          </div>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="text-xs text-[#555555] hover:text-white border border-[#2a2a2a] hover:border-[#555555] px-3 py-1.5 rounded-md transition-colors"
        >
          Edit client
        </button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-transparent border-b border-[#2a2a2a] rounded-none p-0 h-auto gap-0 w-full justify-start">
          {['overview', 'brand', 'brand-kit', 'onboarding'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white data-[state=active]:bg-transparent text-[#555555] hover:text-[#999999] px-4 pb-3 text-sm font-medium capitalize transition-colors"
            >
              {tab === 'brand' ? 'Brand Doc' : tab === 'brand-kit' ? 'Brand Kit' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1 — Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-3 gap-4">
            <InfoCard label="Tier" value={client.tier ? TIER_LABELS[client.tier] : '—'} />
            <InfoCard label="MRR" value={`$${(client.mrr ?? 0).toLocaleString()}`} />
            <InfoCard
              label="Contract Start"
              value={client.contract_start
                ? new Date(client.contract_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—'}
            />
            <InfoCard
              label="Primary Producer"
              value={client.primary_producer ? profileMap[client.primary_producer] ?? '—' : '—'}
            />
            <InfoCard
              label="Days as Client"
              value={daysSinceStart !== null ? `${daysSinceStart} days` : '—'}
            />
            <InfoCard
              label="Platforms"
              value={client.platforms?.length > 0 ? client.platforms.join(', ') : '—'}
            />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Posts this month" value={postsThisMonth} />
            <StatCard
              label="Last post"
              value={
                client.last_post_at
                  ? `${getDaysSince(client.last_post_at)}d ago`
                  : 'None'
              }
            />
            <StatCard
              label="Onboarding"
              value={totalSteps > 0 ? `${onboardingPercent}%` : '—'}
            />
          </div>

          {client.notes && (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4">
              <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-[#999999] whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </TabsContent>

        {/* Tab 2 — Brand Doc */}
        <TabsContent value="brand">
          <ClaudeMdEditor clientId={client.id} initialValue={client.claude_md ?? ''} />
        </TabsContent>

        {/* Tab 3 — Brand Kit */}
        <TabsContent value="brand-kit">
          <BrandAssetsPanel
            clientId={client.id}
            logoUrl={client.logo_url ?? null}
            instagramHandle={client.instagram_handle ?? null}
          />
        </TabsContent>

        {/* Tab 4 — Onboarding */}
        <TabsContent value="onboarding">
          <OnboardingChecklist
            steps={onboardingSteps}
            clientId={client.id}
            profiles={profileMap}
          />
        </TabsContent>
      </Tabs>

      <EditClientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        profiles={profiles}
      />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3">
      <p className="text-xs text-[#555555] mb-1">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-md px-4 py-3">
      <p className="text-xs text-[#555555] mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
