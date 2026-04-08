'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OutreachEmail, OutreachSequence, OutreachSettings } from '@/types'

// ---------------------------------------------------------------------------
// getOutreachSettings — get or create default settings for the user
// ---------------------------------------------------------------------------

export async function getOutreachSettings(): Promise<{
  settings: OutreachSettings | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { settings: null, error: 'Unauthorized' }

  // Try to fetch existing
  const { data, error } = await supabase
    .from('outreach_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (data) return { settings: data as OutreachSettings, error: null }

  // If not found, create default
  if (error?.code === 'PGRST116') {
    const { data: created, error: createErr } = await supabase
      .from('outreach_settings')
      .insert({ user_id: user.id })
      .select()
      .single()

    if (createErr) {
      console.error('[getOutreachSettings]', createErr)
      return { settings: null, error: 'Failed to create settings' }
    }
    return { settings: created as OutreachSettings, error: null }
  }

  console.error('[getOutreachSettings]', error)
  return { settings: null, error: 'Failed to load settings' }
}

// ---------------------------------------------------------------------------
// updateOutreachSettings
// ---------------------------------------------------------------------------

export async function updateOutreachSettings(
  updates: Partial<Omit<OutreachSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ settings: OutreachSettings | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { settings: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('outreach_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[updateOutreachSettings]', error)
    return { settings: null, error: 'Failed to update settings' }
  }

  revalidatePath('/outreach')
  return { settings: data as OutreachSettings, error: null }
}

// ---------------------------------------------------------------------------
// getOutreachEmails — fetch emails for a lead or all drafts
// ---------------------------------------------------------------------------

export async function getOutreachEmails(params?: {
  leadId?: string
  status?: string
}): Promise<{ emails: OutreachEmail[]; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { emails: [], error: 'Unauthorized' }

  let query = supabase
    .from('outreach_emails')
    .select('*')
    .order('follow_up_number', { ascending: true })
    .order('created_at', { ascending: false })

  if (params?.leadId) query = query.eq('lead_id', params.leadId)
  if (params?.status) query = query.eq('status', params.status)

  const { data, error } = await query

  if (error) {
    console.error('[getOutreachEmails]', error)
    return { emails: [], error: 'Failed to load emails' }
  }

  return { emails: (data ?? []) as OutreachEmail[], error: null }
}

// ---------------------------------------------------------------------------
// updateOutreachEmail — edit subject/body before sending
// ---------------------------------------------------------------------------

export async function updateOutreachEmail(
  emailId: string,
  updates: { subject?: string; body_text?: string; body_html?: string }
): Promise<{ email: OutreachEmail | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { email: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('outreach_emails')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', emailId)
    .select()
    .single()

  if (error) {
    console.error('[updateOutreachEmail]', error)
    return { email: null, error: 'Failed to update email' }
  }

  revalidatePath('/outreach')
  return { email: data as OutreachEmail, error: null }
}

// ---------------------------------------------------------------------------
// approveOutreachEmail — move from draft to queued
// ---------------------------------------------------------------------------

export async function approveOutreachEmail(
  emailId: string
): Promise<{ email: OutreachEmail | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { email: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('outreach_emails')
    .update({ status: 'queued', updated_at: new Date().toISOString() })
    .eq('id', emailId)
    .eq('status', 'draft')
    .select()
    .single()

  if (error) {
    console.error('[approveOutreachEmail]', error)
    return { email: null, error: 'Failed to approve email' }
  }

  revalidatePath('/outreach')
  return { email: data as OutreachEmail, error: null }
}

// ---------------------------------------------------------------------------
// deleteOutreachEmail
// ---------------------------------------------------------------------------

export async function deleteOutreachEmail(
  emailId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('outreach_emails')
    .delete()
    .eq('id', emailId)

  if (error) {
    console.error('[deleteOutreachEmail]', error)
    return { error: 'Failed to delete email' }
  }

  revalidatePath('/outreach')
  return { error: null }
}

// ---------------------------------------------------------------------------
// markAsReplied — manual reply detection
// ---------------------------------------------------------------------------

export async function markAsReplied(
  emailId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const now = new Date().toISOString()

  // Update email
  const { data: email, error: emailErr } = await supabase
    .from('outreach_emails')
    .update({ status: 'replied', replied_at: now, updated_at: now })
    .eq('id', emailId)
    .select('lead_id')
    .single()

  if (emailErr || !email) {
    console.error('[markAsReplied]', emailErr)
    return { error: 'Failed to mark as replied' }
  }

  // Pause the sequence for this lead
  await supabase
    .from('outreach_sequences')
    .update({ status: 'completed', updated_at: now })
    .eq('lead_id', email.lead_id)
    .eq('status', 'active')

  // Update lead heat level to hot
  await supabase
    .from('leads')
    .update({ heat_level: 'hot', updated_at: now })
    .eq('id', email.lead_id)

  // Log activity
  await supabase.from('lead_activities').insert({
    lead_id: email.lead_id,
    user_id: user.id,
    type: 'note',
    content: 'Lead replied to outreach email — marked as high intent',
    metadata: { email_id: emailId },
  })

  revalidatePath('/outreach')
  revalidatePath('/leads')
  return { error: null }
}

// ---------------------------------------------------------------------------
// getOutreachSequence — get sequence for a lead
// ---------------------------------------------------------------------------

export async function getOutreachSequence(
  leadId: string
): Promise<{ sequence: OutreachSequence | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { sequence: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('outreach_sequences')
    .select('*')
    .eq('lead_id', leadId)
    .single()

  if (error?.code === 'PGRST116') return { sequence: null, error: null }
  if (error) {
    console.error('[getOutreachSequence]', error)
    return { sequence: null, error: 'Failed to load sequence' }
  }

  return { sequence: data as OutreachSequence, error: null }
}

// ---------------------------------------------------------------------------
// getOutreachStats — pipeline numbers
// ---------------------------------------------------------------------------

export async function getOutreachStats(): Promise<{
  stats: {
    totalLeads: number
    researched: number
    emailed: number
    opened: number
    replied: number
    converted: number
    sentToday: number
  } | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { stats: null, error: 'Unauthorized' }

  // Parallel queries
  const [leadsRes, researchedRes, emailsRes, convertedRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('lead_research').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('outreach_emails').select('id, status, sent_at'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).not('converted_to_client_id', 'is', null),
  ])

  const emails = emailsRes.data ?? []
  const today = new Date().toISOString().split('T')[0]

  return {
    stats: {
      totalLeads: leadsRes.count ?? 0,
      researched: researchedRes.count ?? 0,
      emailed: emails.filter((e) => e.status !== 'draft').length,
      opened: emails.filter((e) => e.status === 'opened' || e.status === 'replied').length,
      replied: emails.filter((e) => e.status === 'replied').length,
      converted: convertedRes.count ?? 0,
      sentToday: emails.filter((e) => e.sent_at && e.sent_at.startsWith(today)).length,
    },
    error: null,
  }
}
