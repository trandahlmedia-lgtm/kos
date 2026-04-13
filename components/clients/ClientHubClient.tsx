'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, Minus, PencilLine } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClaudeMdEditor } from './ClaudeMdEditor'
import { OnboardingChecklist } from './OnboardingChecklist'
import { BrandAssetsPanel } from './BrandAssetsPanel'
import { BrandKitVisual } from './BrandKitVisual'
import { BrandKitEditor } from './BrandKitEditor'
import { EditClientDialog } from './EditClientDialog'
import { MetricEntryForm } from './MetricEntryForm'
import { ContentTab } from './ContentTab'
import { TasksTab } from './TasksTab'
import { ClientStatusDot } from '@/components/shared/StatusBadge'
import { PostStatusBadge } from '@/components/shared/StatusBadge'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { type Client, type OnboardingStep, type Post, type ClientTask, type ClientMetric, type TaskPriority, type Platform } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }
const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: '#ef4444',
  medium: '#facc15',
  low: '#22c55e',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClientHubClientProps {
  client: Client
  onboardingSteps: OnboardingStep[]
  profiles: { id: string; name: string }[]
  profileMap: Record<string, string>
  postsThisMonth: number
  upcomingPosts: Post[]
  allPosts: Post[]
  clientTasks: ClientTask[]
  latestMetrics: ClientMetric[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClientHubClient({
  client,
  onboardingSteps,
  profiles,
  profileMap,
  postsThisMonth,
  upcomingPosts,
  allPosts,
  clientTasks,
  latestMetrics,
}: ClientHubClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)

  const completedSteps = onboardingSteps.filter((s) => s.completed).length
  const totalSteps = onboardingSteps.length
  const onboardingPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  const daysSinceStart = client.contract_start
    ? getDaysSince(client.contract_start)
    : null

  // Top 5 incomplete tasks sorted by priority then due_date
  const topTasks = [...clientTasks]
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (pDiff !== 0) return pDiff
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return 0
    })
    .slice(0, 5)

  // Latest and previous metric row
  const latest = latestMetrics[0] ?? null
  const previous = latestMetrics[1] ?? null

  const lastUpdatedDate = latest?.metric_date
    ? new Date(latest.metric_date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
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
          {['overview', 'content', 'tasks', 'brand', 'brand-kit', 'onboarding'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8732A] data-[state=active]:text-white data-[state=active]:bg-transparent text-[#555555] hover:text-[#999999] px-4 pb-3 text-sm font-medium capitalize transition-colors"
            >
              {tab === 'brand'
                ? 'Brand Doc'
                : tab === 'brand-kit'
                ? 'Brand Kit'
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 1 — Overview */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-3 gap-4">
            <InfoCard label="Tier" value={client.tier ? TIER_LABELS[client.tier] : '—'} />
            <InfoCard label="MRR" value={`$${(client.mrr ?? 0).toLocaleString()}`} />
            <InfoCard
              label="Contract Start"
              value={
                client.contract_start
                  ? new Date(client.contract_start + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
            <InfoCard
              label="Primary Producer"
              value={client.primary_producer ? (profileMap[client.primary_producer] ?? '—') : '—'}
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
              value={client.last_post_at ? `${getDaysSince(client.last_post_at)}d ago` : 'None'}
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

          {/* Upcoming Content */}
          {upcomingPosts.length > 0 && (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <p className="text-xs font-semibold text-[#555555] uppercase tracking-wider">
                  Upcoming Content
                </p>
                <Link href="/content" className="text-xs text-[#555555] hover:text-[#999999] transition-colors">
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {upcomingPosts.map((post) => {
                  const dateLabel = post.scheduled_date
                    ? new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'numeric',
                        day: 'numeric',
                      })
                    : null
                  const title = post.angle ?? post.caption?.slice(0, 60) ?? 'Untitled post'
                  return (
                    <Link
                      key={post.id}
                      href="/content"
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <span className="text-sm text-white flex-1 min-w-0 truncate">{title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <PlatformIcon platform={post.platform as Platform} size="sm" />
                        <PostStatusBadge status={post.status} />
                        {dateLabel && (
                          <span className="text-xs text-[#555555]">{dateLabel}</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Client Tasks */}
          {topTasks.length > 0 && (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <p className="text-xs font-semibold text-[#555555] uppercase tracking-wider">
                  Client Tasks
                </p>
                <button
                  onClick={() => {
                    // Switch to tasks tab — use URL hash trick to trigger tab change
                    const trigger = document.querySelector<HTMLButtonElement>(
                      '[data-radix-collection-item][value="tasks"]'
                    )
                    trigger?.click()
                  }}
                  className="text-xs text-[#555555] hover:text-[#999999] transition-colors"
                >
                  View all →
                </button>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {topTasks.map((task) => {
                  const dueLabel = task.due_date
                    ? new Date(task.due_date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })
                    : null
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <span
                        className="shrink-0 w-2 h-2 rounded-full"
                        style={{ backgroundColor: PRIORITY_DOT[task.priority] }}
                      />
                      <span className="text-sm text-white flex-1 min-w-0 truncate">
                        {task.title}
                      </span>
                      {dueLabel && (
                        <span className="text-xs text-[#555555] shrink-0">{dueLabel}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Analytics */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-[#555555] uppercase tracking-wider">
                  Analytics
                </p>
                {lastUpdatedDate && (
                  <span className="text-xs text-[#333333]">
                    last updated {lastUpdatedDate}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMetricsOpen(true)}
                className="flex items-center gap-1 text-xs text-[#555555] hover:text-[#999999] border border-[#2a2a2a] hover:border-[#3a3a3a] px-2.5 py-1 rounded-md transition-colors"
              >
                <PencilLine size={11} />
                Update Metrics
              </button>
            </div>

            {latest ? (
              <div className="grid grid-cols-5 divide-x divide-[#1a1a1a]">
                <MetricCell
                  label="Website Sessions"
                  current={latest.website_sessions}
                  previous={previous?.website_sessions}
                />
                <MetricCell
                  label="Meta Reach"
                  current={latest.meta_reach}
                  previous={previous?.meta_reach}
                />
                <MetricCell
                  label="Meta Leads"
                  current={latest.meta_leads}
                  previous={previous?.meta_leads}
                />
                <MetricCell
                  label="Google Reviews"
                  current={latest.google_reviews}
                  previous={previous?.google_reviews}
                />
                <MetricCell
                  label="GBP Views"
                  current={latest.gbp_views}
                  previous={previous?.gbp_views}
                />
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-[#555555]">No metrics yet.</p>
                <button
                  onClick={() => setMetricsOpen(true)}
                  className="text-xs text-[#E8732A] hover:underline mt-1"
                >
                  Add first entry →
                </button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 2 — Content */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="content">
          <ContentTab posts={allPosts} />
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 3 — Tasks */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="tasks">
          <TasksTab initialTasks={clientTasks} clientId={client.id} />
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 4 — Brand Doc */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="brand">
          <ClaudeMdEditor clientId={client.id} initialValue={client.claude_md ?? ''} />
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 5 — Brand Kit */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="brand-kit" className="space-y-6">
          {/* Logos (existing) */}
          <div>
            <p className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-3">Logos</p>
            <BrandAssetsPanel
              clientId={client.id}
              brandLogos={client.brand_logos ?? null}
              instagramHandle={client.instagram_handle ?? null}
            />
          </div>

          {/* Brand identity visual + editor */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#555555] uppercase tracking-wider">Brand Identity</p>
              <BrandKitEditor
                clientId={client.id}
                initialColors={client.brand_colors ?? null}
                initialFonts={client.brand_fonts ?? null}
                initialVoice={client.brand_voice ?? null}
                initialPillars={client.content_pillars ?? null}
                initialAudience={client.target_audience ?? null}
              />
            </div>
            <BrandKitVisual
              brandColors={client.brand_colors ?? null}
              brandFonts={client.brand_fonts ?? null}
              brandVoice={client.brand_voice ?? null}
              contentPillars={client.content_pillars ?? null}
              targetAudience={client.target_audience ?? null}
              instagramHandle={client.instagram_handle}
              website={client.website}
              phone={client.phone}
              email={client.email}
            />
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 6 — Onboarding */}
        {/* ------------------------------------------------------------------ */}
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

      <MetricEntryForm
        clientId={client.id}
        open={metricsOpen}
        onOpenChange={setMetricsOpen}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function MetricCell({
  label,
  current,
  previous,
}: {
  label: string
  current?: number | null
  previous?: number | null
}) {
  const hasData = current != null
  const hasPrev = previous != null && current != null

  let arrow: 'up' | 'down' | 'same' | null = null
  if (hasPrev) {
    if (current > previous) arrow = 'up'
    else if (current < previous) arrow = 'down'
    else arrow = 'same'
  }

  return (
    <div className="px-4 py-3">
      <p className="text-xs text-[#555555] mb-1 truncate">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-lg font-semibold text-white">
          {hasData ? current!.toLocaleString() : '—'}
        </p>
        {arrow === 'up' && <ArrowUpRight size={14} className="text-green-400 shrink-0" />}
        {arrow === 'down' && <ArrowDownRight size={14} className="text-red-400 shrink-0" />}
        {arrow === 'same' && <Minus size={14} className="text-[#555555] shrink-0" />}
      </div>
    </div>
  )
}
