'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { type ClientMetric } from '@/types'

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

// ---------------------------------------------------------------------------
// getLatestMetrics — returns the 2 most recent rows for change indicators
// ---------------------------------------------------------------------------

export async function getLatestMetrics(clientId: string): Promise<ClientMetric[]> {
  const idResult = z.string().uuid().safeParse(clientId)
  if (!idResult.success) return []

  const { supabase } = await requireAuth()

  const { data } = await supabase
    .from('client_metrics')
    .select('*')
    .eq('client_id', idResult.data)
    .order('metric_date', { ascending: false })
    .limit(2)

  return (data ?? []) as ClientMetric[]
}

// ---------------------------------------------------------------------------
// getMetricHistory — returns up to `limit` rows, newest first
// ---------------------------------------------------------------------------

export async function getMetricHistory(
  clientId: string,
  limit = 12
): Promise<ClientMetric[]> {
  const idResult = z.string().uuid().safeParse(clientId)
  if (!idResult.success) return []

  const { supabase } = await requireAuth()

  const { data } = await supabase
    .from('client_metrics')
    .select('*')
    .eq('client_id', idResult.data)
    .order('metric_date', { ascending: false })
    .limit(limit)

  return (data ?? []) as ClientMetric[]
}

// ---------------------------------------------------------------------------
// createMetricEntry — insert a new weekly metrics row
// ---------------------------------------------------------------------------

const createMetricSchema = z.object({
  client_id: z.string().uuid(),
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  website_sessions: z.number().int().nonnegative().optional().nullable(),
  meta_reach: z.number().int().nonnegative().optional().nullable(),
  meta_impressions: z.number().int().nonnegative().optional().nullable(),
  meta_clicks: z.number().int().nonnegative().optional().nullable(),
  meta_spend: z.number().nonnegative().optional().nullable(),
  meta_leads: z.number().int().nonnegative().optional().nullable(),
  google_reviews: z.number().int().nonnegative().optional().nullable(),
  google_rating: z.number().min(0).max(5).optional().nullable(),
  gbp_views: z.number().int().nonnegative().optional().nullable(),
  gbp_clicks: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

export async function createMetricEntry(data: {
  client_id: string
  metric_date: string
  website_sessions?: number | null
  meta_reach?: number | null
  meta_impressions?: number | null
  meta_clicks?: number | null
  meta_spend?: number | null
  meta_leads?: number | null
  google_reviews?: number | null
  google_rating?: number | null
  gbp_views?: number | null
  gbp_clicks?: number | null
  notes?: string | null
}): Promise<void> {
  const { supabase } = await requireAuth()

  const parsed = createMetricSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('. '))
  }

  const { error } = await supabase.from('client_metrics').insert(parsed.data)

  if (error) {
    console.error('[createMetricEntry]', error)
    throw new Error('Failed to save metrics')
  }

  revalidatePath(`/clients/${data.client_id}`)
  revalidatePath('/')
}
