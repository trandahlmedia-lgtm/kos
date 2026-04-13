import { createClient } from '@/lib/supabase/server'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { type Client, type Post, type ClientTask, type AgencyTask } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // Month start (first day of current month, UTC)
  const monthStartStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`

  // Current week: Monday → Sunday (UTC)
  const dayOfWeek = now.getUTCDay() // 0=Sunday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekMondayDate = new Date(now)
  weekMondayDate.setUTCDate(now.getUTCDate() + daysToMonday)
  weekMondayDate.setUTCHours(0, 0, 0, 0)
  const weekStartStr = weekMondayDate.toISOString().split('T')[0]
  const weekSundayDate = new Date(weekMondayDate)
  weekSundayDate.setUTCDate(weekMondayDate.getUTCDate() + 6)
  const weekEndStr = weekSundayDate.toISOString().split('T')[0]

  // 8 weeks ago from this week's Monday (for content velocity)
  const eightWeeksAgoDate = new Date(weekMondayDate)
  eightWeeksAgoDate.setUTCDate(weekMondayDate.getUTCDate() - 7 * 7)
  const eightWeeksAgoStr = eightWeeksAgoDate.toISOString().split('T')[0]

  // Fetch all in parallel
  const [
    { data: upcomingPosts },
    { data: clients },
    { data: overdueInvoices },
    { data: clientTasks },
    { data: agencyTasks },
    { data: aiRunsCost },
    { data: publishedPostsRaw },
    { data: postsThisMonthRaw },
    { data: weeklyWinsRaw },
    { data: onboardingStepsRaw },
  ] = await Promise.all([
    // Posts scheduled today through next 2 days, not yet published
    supabase
      .from('posts')
      .select('*, clients(name)')
      .gte('scheduled_date', today)
      .lte('scheduled_date', twoDaysLater)
      .neq('status', 'published')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true, nullsFirst: false }),

    // All active clients
    supabase.from('clients').select('*').eq('status', 'active').order('name'),

    // Outstanding invoices
    supabase
      .from('invoices')
      .select('id, amount')
      .in('status', ['pending', 'overdue']),

    // All incomplete client tasks
    supabase
      .from('client_tasks')
      .select('*, clients(id, name)')
      .eq('completed', false)
      .order('sort_order', { ascending: true }),

    // All incomplete agency tasks
    supabase
      .from('agency_tasks')
      .select('*')
      .eq('completed', false)
      .order('sort_order', { ascending: true }),

    // AI cost this month
    supabase
      .from('ai_runs')
      .select('cost_usd')
      .gte('created_at', monthStartStr + 'T00:00:00.000Z'),

    // Published posts in last 8 weeks (content velocity)
    supabase
      .from('posts')
      .select('scheduled_date')
      .eq('status', 'published')
      .gte('scheduled_date', eightWeeksAgoStr)
      .not('scheduled_date', 'is', null),

    // All posts this month (Posts/Mo per client)
    supabase
      .from('posts')
      .select('client_id')
      .gte('scheduled_date', monthStartStr)
      .lte('scheduled_date', today),

    // Agency tasks due this week (for Weekly Wins — includes completed)
    supabase
      .from('agency_tasks')
      .select('*')
      .gte('due_date', weekStartStr)
      .lte('due_date', weekEndStr)
      .order('due_date', { ascending: true })
      .order('sort_order', { ascending: true }),

    // Onboarding steps (for client health "New" detection)
    supabase
      .from('onboarding_steps')
      .select('client_id, completed'),
  ])

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const totalMrr = (clients ?? []).reduce(
    (sum: number, c: Client) => sum + (c.mrr ?? 0),
    0
  )

  const overdueTotal = (overdueInvoices ?? []).reduce(
    (sum: number, inv: { amount: number }) => sum + (inv.amount ?? 0),
    0
  )

  // AI cost this month
  const aiCostThisMonth = (aiRunsCost ?? []).reduce(
    (sum: number, r: { cost_usd: number | null }) => sum + (r.cost_usd ?? 0),
    0
  )

  // Posts this month grouped by client_id
  const postsThisMonthByClient: Record<string, number> = {}
  for (const post of postsThisMonthRaw ?? []) {
    const p = post as { client_id: string }
    postsThisMonthByClient[p.client_id] = (postsThisMonthByClient[p.client_id] ?? 0) + 1
  }

  // Onboarding completion % per client
  const onboardingPctByClient: Record<string, number> = {}
  const stepsByClient: Record<string, { total: number; completed: number }> = {}
  for (const step of onboardingStepsRaw ?? []) {
    const s = step as { client_id: string; completed: boolean }
    if (!stepsByClient[s.client_id]) {
      stepsByClient[s.client_id] = { total: 0, completed: 0 }
    }
    stepsByClient[s.client_id].total++
    if (s.completed) stepsByClient[s.client_id].completed++
  }
  for (const [clientId, { total, completed }] of Object.entries(stepsByClient)) {
    onboardingPctByClient[clientId] = total > 0 ? (completed / total) * 100 : 100
  }

  // Content velocity: 8 weekly buckets
  const contentVelocityData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(eightWeeksAgoDate)
    weekStart.setUTCDate(eightWeeksAgoDate.getUTCDate() + i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6)

    const wStart = weekStart.toISOString().split('T')[0]
    const wEnd = weekEnd.toISOString().split('T')[0]

    const count = (publishedPostsRaw ?? []).filter((p: { scheduled_date: string | null }) => {
      if (!p.scheduled_date) return false
      return p.scheduled_date >= wStart && p.scheduled_date <= wEnd
    }).length

    const label = weekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })

    return { week: label, count }
  })

  return (
    <DashboardTabs
      upcomingPosts={(upcomingPosts as (Post & { clients?: { name: string } | null })[]) ?? []}
      clients={clients ?? []}
      overdueInvoices={overdueInvoices ?? []}
      totalMrr={totalMrr}
      overdueTotal={overdueTotal}
      today={today}
      clientTasks={
        (clientTasks as (ClientTask & { clients?: { id: string; name: string } | null })[]) ?? []
      }
      agencyTasks={(agencyTasks as AgencyTask[]) ?? []}
      aiCostThisMonth={aiCostThisMonth}
      contentVelocityData={contentVelocityData}
      postsThisMonthByClient={postsThisMonthByClient}
      onboardingPctByClient={onboardingPctByClient}
      weeklyWinsTasks={(weeklyWinsRaw as AgencyTask[]) ?? []}
    />
  )
}
