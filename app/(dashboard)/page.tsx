import { createClient } from '@/lib/supabase/server'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { type Client, type Post } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // Fetch today's scheduled posts
  const { data: todayPosts } = await supabase
    .from('posts')
    .select('*, clients(name)')
    .eq('scheduled_date', today)
    .order('scheduled_time', { ascending: true })

  // Fetch all active clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active')
    .order('name')

  // Fetch outstanding invoices
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, amount')
    .in('status', ['pending', 'overdue'])

  const totalMrr = (clients ?? []).reduce((sum: number, c: Client) => sum + (c.mrr ?? 0), 0)
  const overdueTotal = (overdueInvoices ?? []).reduce(
    (sum: number, inv: { amount: number }) => sum + (inv.amount ?? 0),
    0
  )

  return (
    <DashboardTabs
      todayPosts={todayPosts ?? []}
      clients={clients ?? []}
      overdueInvoices={overdueInvoices ?? []}
      totalMrr={totalMrr}
      overdueTotal={overdueTotal}
      today={today}
    />
  )
}
