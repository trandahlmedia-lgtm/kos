import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure a profile row exists for this user. The handle_new_user trigger creates
  // profiles on signup, but if a user was created before the trigger was added
  // (or the trigger failed), this upsert fills the gap. ignoreDuplicates means
  // we never overwrite an existing profile — just create it if missing.
  await adminClient.from('profiles').upsert(
    {
      id: user.id,
      name: (user.user_metadata?.name as string | undefined) ?? user.email ?? 'User',
      email: user.email ?? '',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Use adminClient so the SELECT isn't filtered by the profiles RLS policy.
  const { data: profile } = await adminClient
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .single()

  const userName = profile?.name ?? user.email ?? 'User'
  const userEmail = profile?.email ?? user.email ?? ''

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <Sidebar userName={userName} userEmail={userEmail} />
      <main className="flex-1 ml-[240px] overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
