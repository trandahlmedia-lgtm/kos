'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'
import type { WeeklyDirection } from '@/types'

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid('Invalid ID')

const saveDirectionSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'weekStartDate must be YYYY-MM-DD'),
  directionText: z.string().min(1, 'Direction text required').max(5000).trim(),
  postCountOverride: z.number().int().min(1).max(30).optional(),
})

// ---------------------------------------------------------------------------
// getWeeklyDirection
// ---------------------------------------------------------------------------

export async function getWeeklyDirection(
  clientId: string,
  weekStartDate: string
): Promise<WeeklyDirection | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const clientIdResult = uuidSchema.safeParse(clientId)
  if (!clientIdResult.success) throw new Error('Invalid client ID')

  const { data, error } = await supabase
    .from('weekly_directions')
    .select('*')
    .eq('client_id', clientIdResult.data)
    .eq('week_start_date', weekStartDate)
    .maybeSingle()

  if (error) {
    console.error('[getWeeklyDirection] query failed:', error)
    throw new Error('Failed to load weekly direction.')
  }

  return data as WeeklyDirection | null
}

// ---------------------------------------------------------------------------
// listWeeklyDirections — recent directions for a client (for historical reference)
// ---------------------------------------------------------------------------

export async function listWeeklyDirections(
  clientId: string,
  limit = 8
): Promise<WeeklyDirection[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const idResult = uuidSchema.safeParse(clientId)
  if (!idResult.success) throw new Error('Invalid client ID')

  const { data, error } = await supabase
    .from('weekly_directions')
    .select('*')
    .eq('client_id', idResult.data)
    .order('week_start_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[listWeeklyDirections] query failed:', error)
    throw new Error('Failed to load weekly directions.')
  }

  return data as WeeklyDirection[]
}

// ---------------------------------------------------------------------------
// saveWeeklyDirection — upsert by client + week (one direction per week)
// ---------------------------------------------------------------------------

export async function saveWeeklyDirection(input: {
  clientId: string
  weekStartDate: string
  directionText: string
  postCountOverride?: number
}): Promise<WeeklyDirection> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = saveDirectionSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)

  const rl = await checkRateLimit(
    userAction(user.id, 'save_weekly_direction'),
    LIMITS.USER_WRITE.max,
    LIMITS.USER_WRITE.windowS
  )
  if (!rl.allowed) throw new Error(`Rate limit exceeded. Wait ${rl.retryAfter}s.`)

  const clean = parsed.data

  const { data, error } = await supabase
    .from('weekly_directions')
    .upsert(
      {
        client_id: clean.clientId,
        week_start_date: clean.weekStartDate,
        direction_text: clean.directionText,
        post_count_override: clean.postCountOverride ?? null,
        created_by: user.id,
      },
      { onConflict: 'client_id,week_start_date' }
    )
    .select('*')
    .single()

  if (error || !data) {
    console.error('[saveWeeklyDirection] upsert failed:', error)
    throw new Error('Failed to save weekly direction.')
  }

  return data as WeeklyDirection
}
