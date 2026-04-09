import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const updateSchema = z.object({
  business_name: z.string().min(1).max(200).optional(),
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
  call_notes: z.string().max(20000).nullable().optional(),
  manual_score: z.number().int().min(1).max(100).nullable().optional(),
  lost_reason: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [leadResult, researchResult, activitiesResult, outreachResult] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('lead_research').select('*').eq('lead_id', id).single(),
    supabase.from('lead_activities').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('outreach_emails').select('id, subject, created_at', { count: 'exact' }).eq('lead_id', id),
  ])

  if (leadResult.error || !leadResult.data) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const outreachEmails = outreachResult.data ?? []
  const hasOutreachDrafts = outreachEmails.length > 0
  // Placeholder rows inserted during generation have empty subjects.
  // If placeholders are older than 2 minutes, treat as stale (generation failed/died).
  const STALE_MS = 2 * 60 * 1000
  const allEmpty = outreachEmails.every((e: { subject: string }) => e.subject === '')
  const anyFresh = outreachEmails.some((e: { created_at: string }) =>
    Date.now() - new Date(e.created_at).getTime() < STALE_MS
  )
  const draftingInProgress = hasOutreachDrafts && allEmpty && anyFresh

  return NextResponse.json({
    lead: leadResult.data,
    research: researchResult.data ?? null,
    activities: activitiesResult.data ?? [],
    hasOutreachDrafts,
    draftingInProgress,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }

  return NextResponse.json({ lead: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase.from('leads').delete().eq('id', id)

  if (error) {
    console.error('[DELETE /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
