import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { LeadStage } from '@/types'

const STAGES: LeadStage[] = ['new', 'reached_out', 'connected', 'interested', 'proposal_sent', 'won', 'lost']

const createSchema = z.object({
  business_name: z.string().min(1).max(200),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  has_website: z.boolean().optional(),
  instagram_handle: z.string().max(100).nullable().optional(),
  facebook_url: z.string().url().nullable().optional(),
  google_business_url: z.string().url().nullable().optional(),
  other_social_links: z.string().max(500).nullable().optional(),
  social_presence_notes: z.string().max(1000).nullable().optional(),
  years_in_business: z.number().int().min(0).max(200).nullable().optional(),
  jobs_per_week: z.number().int().min(0).max(10000).nullable().optional(),
  work_inflow_notes: z.string().max(500).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  service_area: z.string().max(200).nullable().optional(),
  source: z.enum(['cold_call', 'referral', 'inbound', 'other']).optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage') as LeadStage | null

  let query = supabase
    .from('leads')
    .select('*')
    .order('stage_updated_at', { ascending: false })

  if (stage && STAGES.includes(stage)) {
    query = query.eq('stage', stage)
  }

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/leads]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  return NextResponse.json({ leads: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const input = parsed.data
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
    console.error('[POST /api/leads]', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  return NextResponse.json({ lead: data }, { status: 201 })
}
