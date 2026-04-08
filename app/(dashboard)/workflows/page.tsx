import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { WorkflowsPageClient } from '@/components/workflows/WorkflowsPageClient'
import type { AIRun, Client } from '@/types'

export default async function WorkflowsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch clients for workflow selectors
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active')
    .order('name')

  // Fetch posts without captions (for caption workflow)
  const { data: postsWithoutCaption } = await supabase
    .from('posts')
    .select('id, client_id, platform, content_type, scheduled_date, clients(name)')
    .is('caption', null)
    .in('status', ['slot', 'in_production'])
    .order('scheduled_date', { ascending: true })

  // Fetch recent AI runs for the activity log
  const { data: recentRuns } = await adminClient
    .from('ai_runs')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <WorkflowsPageClient
      clients={(clients ?? []) as Client[]}
      postsWithoutCaption={(postsWithoutCaption ?? []).map((p) => ({
        ...p,
        clients: Array.isArray(p.clients) ? p.clients[0] ?? null : p.clients ?? null,
      })) as unknown as { id: string; client_id: string; platform: string; content_type: string | null; scheduled_date: string | null; clients: { name: string } | null }[]}
      recentRuns={(recentRuns ?? []) as (AIRun & { clients: { name: string } | null })[]}
    />
  )
}