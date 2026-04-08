'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Lead, LeadStage, LeadSource } from '@/types'

// ---------------------------------------------------------------------------
// createLead
// ---------------------------------------------------------------------------

export interface CreateLeadInput {
  business_name: string
  phone?: string | null
  email?: string | null
  website?: string | null
  has_website?: boolean
  instagram_handle?: string | null
  facebook_url?: string | null
  google_business_url?: string | null
  other_social_links?: string | null
  social_presence_notes?: string | null
  years_in_business?: number | null
  jobs_per_week?: number | null
  work_inflow_notes?: string | null
  industry?: string | null
  service_area?: string | null
  source?: LeadSource
  notes?: string | null
}

export async function createLead(input: CreateLeadInput): Promise<{ lead: Lead | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { lead: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...input,
      has_website: input.has_website ?? !!(input.website),
      source: input.source ?? 'cold_call',
      stage: 'new',
      stage_updated_at: new Date().toISOString(),
      assigned_to: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[createLead]', error)
    return { lead: null, error: 'Failed to create lead' }
  }

  revalidatePath('/leads')
  return { lead: data as Lead, error: null }
}

// ---------------------------------------------------------------------------
// updateLead
// ---------------------------------------------------------------------------

export async function updateLead(
  id: string,
  updates: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ lead: Lead | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { lead: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[updateLead]', error)
    return { lead: null, error: 'Failed to update lead' }
  }

  revalidatePath('/leads')
  return { lead: data as Lead, error: null }
}

// ---------------------------------------------------------------------------
// updateLeadStage
// ---------------------------------------------------------------------------

export async function updateLeadStage(
  id: string,
  stage: LeadStage,
  lostReason?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const updates: Record<string, unknown> = {
    stage,
    stage_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (stage === 'lost' && lostReason) updates.lost_reason = lostReason

  const { error: updateError } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)

  if (updateError) {
    console.error('[updateLeadStage]', updateError)
    return { error: 'Failed to update stage' }
  }

  // Log activity
  await supabase.from('lead_activities').insert({
    lead_id: id,
    user_id: user.id,
    type: 'stage_change',
    content: `Stage updated to ${stage}`,
    metadata: { to_stage: stage, ...(lostReason ? { lost_reason: lostReason } : {}) },
  })

  revalidatePath('/leads')
  return { error: null }
}

// ---------------------------------------------------------------------------
// deleteLead
// ---------------------------------------------------------------------------

export async function deleteLead(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('leads').delete().eq('id', id)

  if (error) {
    console.error('[deleteLead]', error)
    return { error: 'Failed to delete lead' }
  }

  revalidatePath('/leads')
  return { error: null }
}
