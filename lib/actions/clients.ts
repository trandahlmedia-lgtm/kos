/**
 * Client CRUD server actions.
 * OWASP A03:2021 — Injection (input validation)
 * OWASP A04:2021 — Insecure Design (rate limiting)
 * OWASP A07:2021 — Authentication Failures (re-verify auth in every action)
 */
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  createClientSchema,
  updateClientSchema,
  updateBrandAssetsSchema,
  formatZodErrors,
} from '@/lib/security/validation'
import { adminClient } from '@/lib/supabase/admin'
import type { BrandLogos, BrandColor, BrandFonts, BrandVoice, ContentPillar, TargetAudience } from '@/types'
import {
  checkRateLimit,
  userAction,
  LIMITS,
} from '@/lib/security/rateLimit'
import { type ClientTier, type Platform } from '@/types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Onboarding step templates keyed by tier (kept server-side only). */
function getOnboardingSteps(tier: ClientTier) {
  const base = [
    { step_key: 'intake_questionnaire', title: 'Intake questionnaire', sort_order: 1 },
    { step_key: 'competitor_research', title: 'Competitor research', sort_order: 2 },
    { step_key: 'generate_claude_md', title: 'Generate brand doc (CLAUDE.md)', sort_order: 3 },
    { step_key: 'folder_structure', title: 'Set up folder structure', sort_order: 4 },
    { step_key: 'brand_identity_review', title: 'Brand identity review', sort_order: 5 },
  ]

  const fullService = [
    { step_key: 'platform_setup', title: 'Platform setup', sort_order: 6 },
    { step_key: 'first_filming_session', title: 'First filming session scheduled', sort_order: 7 },
    { step_key: 'first_content_calendar', title: 'First content calendar generated', sort_order: 8 },
    {
      step_key: 'ads_eligibility_review',
      title: 'Paid ads eligibility review',
      description: 'Auto-triggered at 90 days',
      sort_order: 9,
    },
  ]

  const website = [
    { step_key: 'domain_hosting', title: 'Domain/hosting setup', sort_order: 6 },
    { step_key: 'website_brief', title: 'Website brief', sort_order: 7 },
    { step_key: 'design_approval', title: 'Design approval', sort_order: 8 },
    { step_key: 'launch', title: 'Launch', sort_order: 9 },
  ]

  if (tier === 'full_service' || tier === 'full_stack' || tier === 'growth') {
    return [...base, ...fullService]
  }
  if (tier === 'website') {
    return [...base, ...website]
  }
  return base
}

// ---------------------------------------------------------------------------
// Input types (shape before validation)
// ---------------------------------------------------------------------------

export interface CreateClientInput {
  name: string
  email?: string
  phone?: string
  website?: string
  tier?: ClientTier
  mrr?: number
  contract_start?: string
  primary_producer?: string
  platforms?: Platform[]
}

// ---------------------------------------------------------------------------
// createClientAction
// ---------------------------------------------------------------------------

/**
 * Create a new client record + auto-generate onboarding steps.
 *
 * Security:
 *   1. Auth re-verification (Page-level auth does not protect Server Actions)
 *   2. Rate limit: 20 creates per user per minute
 *   3. Zod validation: types, lengths, enum allowlists
 */
export async function createClientAction(input: CreateClientInput): Promise<string> {
  // 1. Re-verify auth inside the action — never trust the session from the page.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Rate limit — heavy threshold (creating clients is infrequent; 20/min is generous).
  const rl = await checkRateLimit(
    userAction(user.id, 'create_client'),
    LIMITS.USER_HEAVY.max,
    LIMITS.USER_HEAVY.windowS
  )
  if (!rl.allowed) {
    const secs = rl.retryAfter
    throw new Error(`Rate limit exceeded. Please wait ${secs} second${secs !== 1 ? 's' : ''} and try again.`)
  }

  // 3. Validate and sanitise all fields.
  //    Zod strips leading/trailing whitespace (trim()) and normalises empty strings
  //    to undefined so the DB receives NULL instead of ''.
  const parsed = createClientSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(formatZodErrors(parsed.error.issues))
  }

  const clean = parsed.data

  // 4. Insert — use only the cleaned/validated object, not the raw input.
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: clean.name,
      email: clean.email ?? null,
      phone: clean.phone ?? null,
      website: clean.website ?? null,
      tier: clean.tier ?? null,
      mrr: clean.mrr ?? 0,
      contract_start: clean.contract_start ?? null,
      primary_producer: clean.primary_producer ?? null,
      platforms: clean.platforms,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    // Log full error server-side; return a generic message to the client.
    console.error('[createClientAction] DB insert failed:', error)
    throw new Error('Failed to create client. Please try again.')
  }

  // 5. Auto-generate onboarding steps for the selected tier.
  if (clean.tier) {
    const steps = getOnboardingSteps(clean.tier)
    await supabase.from('onboarding_steps').insert(
      steps.map((step) => ({
        ...step,
        client_id: client.id,
        description: (step as { description?: string }).description ?? null,
      }))
    )
  }

  revalidatePath('/clients')
  return client.id
}

// ---------------------------------------------------------------------------
// updateClientAction
// ---------------------------------------------------------------------------

/**
 * Update an existing client record.
 *
 * Security:
 *   1. Auth re-verification
 *   2. clientId format validated as UUID (prevents path-injection)
 *   3. Rate limit: 60 updates per user per minute
 *   4. Zod validation on all fields
 *
 * Note: Authorization is "authenticated user can edit any client" — this is
 * intentional for a 2-person internal tool where both users are admins.
 * RLS in Supabase enforces the authenticated-user-only boundary.
 */
export async function updateClientAction(
  clientId: string,
  input: Partial<CreateClientInput>
): Promise<void> {
  // 1. Auth.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Validate the client ID is a real UUID (prevents injection via path params).
  const idResult = z.string().uuid('Invalid client ID').safeParse(clientId)
  if (!idResult.success) throw new Error('Invalid client ID')

  // 3. Rate limit.
  const rl = await checkRateLimit(
    userAction(user.id, 'update_client'),
    LIMITS.USER_WRITE.max,
    LIMITS.USER_WRITE.windowS
  )
  if (!rl.allowed) {
    const secs = rl.retryAfter
    throw new Error(`Rate limit exceeded. Please wait ${secs} second${secs !== 1 ? 's' : ''} and try again.`)
  }

  // 4. Validate all provided fields.
  const parsed = updateClientSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(formatZodErrors(parsed.error.issues))
  }

  const clean = parsed.data

  // 5. Update — only the validated fields, plus updated_at.
  const { error } = await supabase
    .from('clients')
    .update({
      ...(clean.name !== undefined && { name: clean.name }),
      ...(clean.email !== undefined && { email: clean.email ?? null }),
      ...(clean.phone !== undefined && { phone: clean.phone ?? null }),
      ...(clean.website !== undefined && { website: clean.website ?? null }),
      ...(clean.tier !== undefined && { tier: clean.tier ?? null }),
      ...(clean.mrr !== undefined && { mrr: clean.mrr }),
      ...(clean.contract_start !== undefined && { contract_start: clean.contract_start ?? null }),
      ...(clean.primary_producer !== undefined && { primary_producer: clean.primary_producer ?? null }),
      ...(clean.platforms !== undefined && { platforms: clean.platforms }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', idResult.data)

  if (error) {
    console.error('[updateClientAction] DB update failed:', error)
    throw new Error('Failed to update client. Please try again.')
  }

  revalidatePath(`/clients/${idResult.data}`)
  revalidatePath('/clients')
}

// ---------------------------------------------------------------------------
// updateClientBrandAssets
// ---------------------------------------------------------------------------

/**
 * Update a client's brand asset fields (brand_logos, instagram_handle).
 *
 * Security:
 *   1. Auth re-verification
 *   2. UUID validation on clientId
 *   3. Rate limit: USER_WRITE
 *   4. Zod validation on all fields
 */
export async function updateClientBrandAssets(
  clientId: string,
  input: { brand_logos?: BrandLogos | null; instagram_handle?: string }
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateBrandAssetsSchema.safeParse({ clientId, ...input })
  if (!parsed.success) {
    throw new Error(formatZodErrors(parsed.error.issues))
  }

  const { clientId: validId, ...clean } = parsed.data

  const rl = await checkRateLimit(
    userAction(user.id, 'update_client_brand'),
    LIMITS.USER_WRITE.max,
    LIMITS.USER_WRITE.windowS
  )
  if (!rl.allowed) {
    const secs = rl.retryAfter
    throw new Error(`Rate limit exceeded. Please wait ${secs} second${secs !== 1 ? 's' : ''} and try again.`)
  }

  const { error } = await supabase
    .from('clients')
    .update({
      ...(clean.brand_logos !== undefined && { brand_logos: clean.brand_logos ?? null }),
      ...(clean.instagram_handle !== undefined && { instagram_handle: clean.instagram_handle ?? null }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', validId)

  if (error) {
    console.error('[updateClientBrandAssets] DB update failed:', error)
    throw new Error('Failed to update brand assets. Please try again.')
  }

  revalidatePath(`/clients/${validId}`)
}

// ---------------------------------------------------------------------------
// getSignedLogoUrls
// ---------------------------------------------------------------------------

/**
 * Generate fresh signed URLs for a client's brand logos.
 * Reads brand_logos (storage paths) and returns signed URLs (1-hour expiry).
 */
export async function getSignedLogoUrls(
  clientId: string
): Promise<BrandLogos> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const idResult = z.string().uuid('Invalid client ID').safeParse(clientId)
  if (!idResult.success) throw new Error('Invalid client ID')

  const { data: client, error } = await supabase
    .from('clients')
    .select('brand_logos')
    .eq('id', idResult.data)
    .single()

  if (error || !client) {
    throw new Error('Client not found')
  }

  const logos = client.brand_logos as BrandLogos | null
  if (!logos) return {}

  const result: BrandLogos = {}
  const keys = ['icon', 'wordmark_dark', 'wordmark_light', 'full'] as const

  for (const key of keys) {
    const path = logos[key]
    if (path) {
      const { data: signedData, error: signError } = await adminClient.storage
        .from('kos-media')
        .createSignedUrl(path, 3600)
      if (signError) {
        console.error(`[getSignedLogoUrls] Failed to sign ${key} (${path}):`, signError.message)
      }
      if (signedData?.signedUrl) {
        result[key] = signedData.signedUrl
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// updateClientBrandData
// ---------------------------------------------------------------------------

export interface BrandDataInput {
  brand_colors?: BrandColor[]
  brand_fonts?: BrandFonts
  brand_voice?: BrandVoice
  content_pillars?: ContentPillar[]
  target_audience?: TargetAudience
}

/**
 * Update a client's structured brand identity fields (JSONB columns).
 */
export async function updateClientBrandData(
  clientId: string,
  input: BrandDataInput
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const idResult = z.string().uuid('Invalid client ID').safeParse(clientId)
  if (!idResult.success) throw new Error('Invalid client ID')

  const rl = await checkRateLimit(
    userAction(user.id, 'update_client_brand_data'),
    LIMITS.USER_WRITE.max,
    LIMITS.USER_WRITE.windowS
  )
  if (!rl.allowed) {
    const secs = rl.retryAfter
    throw new Error(`Rate limit exceeded. Please wait ${secs} second${secs !== 1 ? 's' : ''} and try again.`)
  }

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.brand_colors !== undefined) updatePayload.brand_colors = input.brand_colors
  if (input.brand_fonts !== undefined) updatePayload.brand_fonts = input.brand_fonts
  if (input.brand_voice !== undefined) updatePayload.brand_voice = input.brand_voice
  if (input.content_pillars !== undefined) updatePayload.content_pillars = input.content_pillars
  if (input.target_audience !== undefined) updatePayload.target_audience = input.target_audience

  const { error } = await supabase
    .from('clients')
    .update(updatePayload)
    .eq('id', idResult.data)

  if (error) {
    console.error('[updateClientBrandData] DB update failed:', error)
    throw new Error('Failed to update brand data. Please try again.')
  }

  revalidatePath(`/clients/${idResult.data}`)
}
