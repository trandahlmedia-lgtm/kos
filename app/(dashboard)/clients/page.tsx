import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { ClientsPageClient } from '@/components/clients/ClientsPageClient'

export default async function ClientsPage() {
  const supabase = await createClient()

  // profiles query uses adminClient to bypass the RLS policy that would otherwise
  // restrict results to only the current user's own profile row.
  const [{ data: clients }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    adminClient.from('profiles').select('id, name').order('name'),
  ])


  return (
    <div className="p-8">
      <ClientsPageClient
        clients={clients ?? []}
        profiles={profiles ?? []}
      />
    </div>
  )
}
