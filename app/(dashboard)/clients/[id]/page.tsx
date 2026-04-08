import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { ClientHubClient } from '@/components/clients/ClientHubClient'

interface ClientPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: client },
    { data: onboardingSteps },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase
      .from('onboarding_steps')
      .select('*')
      .eq('client_id', id)
      .order('sort_order'),
    adminClient.from('profiles').select('id, name').order('name'),
  ])

  if (!client) notFound()

  // Count posts this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: postsThisMonth } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)
    .gte('created_at', startOfMonth.toISOString())

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]))

  return (
    <ClientHubClient
      client={client}
      onboardingSteps={onboardingSteps ?? []}
      profiles={profiles ?? []}
      profileMap={profileMap}
      postsThisMonth={postsThisMonth ?? 0}
    />
  )
}
