import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OutreachPageClient } from '@/components/outreach/OutreachPageClient'
import type { OutreachEmail, OutreachSettings, Lead } from '@/types'

export default async function OutreachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parallel fetches
  const [emailsRes, settingsRes, hotLeadsRes, statsRes] = await Promise.all([
    supabase
      .from('outreach_emails')
      .select('*, leads!inner(business_name, email, ai_score, phone, industry, service_area, heat_level)')
      .order('created_at', { ascending: false }),
    supabase
      .from('outreach_settings')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('leads')
      .select('*')
      .or('heat_level.eq.hot,and(ai_score.gte.80,has_website.eq.false)')
      .order('ai_score', { ascending: false })
      .limit(20),
    Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('lead_research').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('outreach_emails').select('id, status, sent_at'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).not('converted_to_client_id', 'is', null),
    ]),
  ])

  const emails = (emailsRes.data ?? []) as (OutreachEmail & { leads: { business_name: string; email: string | null; ai_score: number | null; phone: string | null; industry: string | null; service_area: string | null; heat_level: string | null } })[]
  const settings = settingsRes.data as OutreachSettings | null
  const hotLeads = (hotLeadsRes.data ?? []) as Lead[]

  const [leadsCount, researchedCount, allEmails, convertedCount] = statsRes
  const allEmailData = allEmails.data ?? []
  const today = new Date().toISOString().split('T')[0]
  const stats = {
    totalLeads: leadsCount.count ?? 0,
    researched: researchedCount.count ?? 0,
    emailed: allEmailData.filter((e) => e.status !== 'draft').length,
    opened: allEmailData.filter((e) => e.status === 'opened' || e.status === 'replied').length,
    replied: allEmailData.filter((e) => e.status === 'replied').length,
    converted: convertedCount.count ?? 0,
    sentToday: allEmailData.filter((e) => e.sent_at && (e.sent_at as string).startsWith(today)).length,
    dailyLimit: settings?.daily_limit ?? 20,
  }

  return (
    <OutreachPageClient
      initialEmails={emails}
      initialSettings={settings}
      initialHotLeads={hotLeads}
      initialStats={stats}
    />
  )
}
