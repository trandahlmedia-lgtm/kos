import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const convertSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  service_area: z.string().max(200).nullable().optional(),
  tier: z.enum(['basic', 'full_service', 'website', 'starter', 'growth', 'full_stack']).optional(),
  mrr: z.number().int().min(0).optional(),
  notes: z.string().max(5000).nullable().optional(),
  claude_md: z.string().max(50000).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify lead exists and is in 'won' stage
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  if (lead.stage !== 'won') {
    return NextResponse.json({ error: 'Lead must be in Won stage to convert' }, { status: 400 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = convertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const input = parsed.data

  // Create client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      tier: input.tier ?? 'starter',
      mrr: input.mrr ?? 0,
      status: 'active',
      claude_md: input.claude_md ?? '',
      platforms: [],
      posting_frequency: {},
      ads_eligible: false,
      notes: input.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (clientError || !client) {
    console.error('[POST /api/leads/[id]/convert] create client:', clientError)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }

  // Update lead
  const now = new Date().toISOString()
  await supabase
    .from('leads')
    .update({
      converted_to_client_id: client.id,
      converted_at: now,
      updated_at: now,
    })
    .eq('id', id)

  // Log activity
  await supabase.from('lead_activities').insert({
    lead_id: id,
    user_id: user.id,
    type: 'conversion',
    content: `Converted to client: ${input.name}`,
    metadata: { client_id: client.id },
  })

  return NextResponse.json({ client }, { status: 201 })
}
