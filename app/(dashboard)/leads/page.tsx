import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LeadsPageClient } from '@/components/leads/LeadsPageClient'
import type { Lead } from '@/types'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[LeadsPage]', error)
  }

  return <LeadsPageClient initialLeads={(leads as Lead[]) ?? []} />
}
