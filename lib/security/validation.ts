/**
 * Schema-based input validation for all user-facing actions.
 * OWASP A03:2021 — Injection
 * OWASP A04:2021 — Insecure Design
 *
 * Every schema enforces:
 *   - Correct runtime type (Zod rejects wrong types, not just "falsy")
 *   - Length limits (prevents oversized payloads)
 *   - Format constraints (email, URL, UUID, ISO date)
 *   - Enum allowlists (only known values accepted; rejects anything else)
 *
 * These schemas are isomorphic (work on server and client) so the same
 * rules can be used for immediate client-side feedback AND server-side enforcement.
 * Never skip server-side validation even when you also validate client-side.
 *
 * Zod v4 note: error messages use the `error` key (not `required_error` /
 * `invalid_type_error` which were removed in v4).
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared field validators (reused across schemas)
// ---------------------------------------------------------------------------

/** Required text, 1–200 chars, leading/trailing whitespace stripped. */
const requiredName = z
  .string('Name is required')
  .min(1, 'Name is required')
  .max(200, 'Name must be 200 characters or fewer')
  .trim()

/**
 * Optional email — empty string treated as absent (cleared form fields default to '').
 * Normalised to lowercase so "Jay@example.com" and "jay@example.com" are the same.
 * RFC 5321 limits the full address to 320 chars.
 */
const optionalEmail = z
  .string()
  .email('Invalid email address')
  .max(320, 'Email must be 320 characters or fewer')
  .toLowerCase()
  .trim()
  .optional()
  .or(z.literal('').transform(() => undefined))

/**
 * Optional phone — strips all non-digit characters before storing.
 * The form displays a formatted (612) 555-1234 version, but only the raw
 * digits (e.g. "6125551234") are persisted. 20 digits covers any real number.
 *
 * z.preprocess runs before type-checking so the input can arrive as a
 * formatted string and still pass validation after normalisation.
 */
const optionalPhone = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === '') return undefined
    if (typeof val !== 'string') return val
    const digits = val.replace(/\D/g, '')
    return digits || undefined
  },
  z.string().max(20, 'Phone number is too long').optional()
)

/**
 * Optional URL — auto-prepends https:// when the user omits the scheme.
 * Entering "example.com" or "www.example.com" both produce a valid URL.
 * Only truly malformed values (gibberish that can't be parsed as a URL after
 * prepending) are rejected.
 *
 * z.preprocess runs before type-checking so the normalisation happens
 * server-side as a safety net, even if the client already fixed it.
 */
const optionalUrl = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === '') return undefined
    if (typeof val !== 'string') return val
    const trimmed = val.trim()
    if (!trimmed) return undefined
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
    return trimmed
  },
  z.string().url('Invalid URL').max(500, 'URL must be 500 characters or fewer').optional()
)

/** Optional monetary value — non-negative, capped at $999,999. */
const optionalMrr = z
  .number('MRR must be a number')
  .min(0, 'MRR must be zero or a positive number')
  .max(999_999, 'MRR value exceeds maximum allowed')
  .optional()

/** Optional ISO date (YYYY-MM-DD). */
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .optional()
  .or(z.literal('').transform(() => undefined))

/**
 * Optional UUID — used for foreign-key fields (primary_producer, client IDs, etc.).
 * Empty string is treated as absent so cleared select menus don't fail validation.
 */
const optionalUuid = z
  .string()
  .uuid('Invalid ID format')
  .optional()
  .or(z.literal('').transform(() => undefined))

// ---------------------------------------------------------------------------
// Enum allowlists — reject any value not in this list
// ---------------------------------------------------------------------------

const tierEnum = z.enum(
  ['basic', 'full_service', 'website', 'starter', 'growth', 'full_stack'],
  { error: 'Invalid tier value' }
)

const platformEnum = z.enum(
  ['instagram', 'facebook', 'linkedin', 'tiktok', 'nextdoor'],
  { error: 'Invalid platform value' }
)

// ---------------------------------------------------------------------------
// Action schemas
// ---------------------------------------------------------------------------

/** Creating a new client. */
export const createClientSchema = z.object({
  name: requiredName,
  email: optionalEmail,
  phone: optionalPhone,
  website: optionalUrl,
  tier: tierEnum.optional(),
  mrr: optionalMrr,
  contract_start: optionalDate,
  primary_producer: optionalUuid,
  // Max 5 platforms; each must be a known value.
  platforms: z
    .array(platformEnum)
    .max(5, 'Maximum 5 platforms allowed')
    .default([]),
})

/** Updating an existing client — every field optional. */
export const updateClientSchema = createClientSchema.partial()

/** Login credentials. */
export const loginSchema = z.object({
  // Normalise email so rate-limit keys are consistent.
  email: z
    .string('Email is required')
    .email('Invalid email address')
    .max(320, 'Email too long')
    .toLowerCase()
    .trim(),
  // 128 chars is a generous upper bound; we're validating presence, not strength.
  password: z
    .string('Password is required')
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
})

/** Saving the client brand document (CLAUDE.md). */
export const saveClaudeMdSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  // ~100 KB max — generous for any brand doc, prevents runaway DB writes.
  claudeMd: z
    .string()
    .max(100_000, 'Brand document exceeds the 100 KB limit. Please shorten it.'),
})

/** Brand logos JSONB shape — each value is a Supabase storage path. */
export const brandLogosSchema = z.object({
  icon: z.string().max(500, 'Storage path too long').optional(),
  wordmark_dark: z.string().max(500, 'Storage path too long').optional(),
  wordmark_light: z.string().max(500, 'Storage path too long').optional(),
  full: z.string().max(500, 'Storage path too long').optional(),
}).nullable().optional()

/** Updating client brand assets (logos + IG handle). */
export const updateBrandAssetsSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  brand_logos: brandLogosSchema,
  instagram_handle: z
    .string()
    .max(30, 'Instagram handle must be 30 characters or fewer')
    .trim()
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

/** Toggling an onboarding step. */
export const toggleOnboardingSchema = z.object({
  stepId: z.string().uuid('Invalid step ID'),
  completed: z.boolean('Completed must be true or false'),
  clientId: z.string().uuid('Invalid client ID'),
})

/** Creating a lead. */
export const createLeadSchema = z.object({
  business_name: requiredName,
  phone: optionalPhone,
  email: optionalEmail,
  website: optionalUrl,
  industry: z.string().max(200).trim().optional().or(z.literal('').transform(() => undefined)),
  service_area: z.string().max(200).trim().optional().or(z.literal('').transform(() => undefined)),
  source: z.enum(['cold_call', 'referral', 'inbound', 'scraped', 'other']).default('cold_call'),
  instagram_handle: z.string().max(200).trim().optional().or(z.literal('').transform(() => undefined)),
  facebook_url: optionalUrl,
  google_business_url: optionalUrl,
  assigned_to: optionalUuid,
  review_count: z.number().int().min(0).max(99999).optional(),
  rating: z.number().min(0).max(5).optional(),
  notes: z.string().max(10_000).optional().or(z.literal('').transform(() => undefined)),
})

/** Bulk lead import row — relaxed validation for CSV data. */
export const leadImportRowSchema = z.object({
  business_name: z.string().min(1, 'Business name is required').max(300).trim(),
  phone: z.string().max(50).optional().or(z.literal('').transform(() => undefined)),
  email: z.string().max(320).optional().or(z.literal('').transform(() => undefined)),
  website: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  industry: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
  service_area: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
  review_count: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined
      const n = Number(String(val).replace(/[^0-9.-]/g, ''))
      return isNaN(n) ? undefined : Math.abs(Math.round(n))
    },
    z.number().int().min(0).max(99999).optional()
  ),
  rating: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined
      const n = Number(val)
      return isNaN(n) ? undefined : n
    },
    z.number().min(0).max(5).optional()
  ),
  google_business_url: z.string().max(1000).optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().max(10_000).optional().or(z.literal('').transform(() => undefined)),
})

/** Outreach email draft. */
export const outreachEmailSchema = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  templateType: z.enum(['initial', 'followup_1', 'followup_2', 'followup_3']).default('initial'),
})

/** Outreach email update (edit before sending). */
export const updateOutreachEmailSchema = z.object({
  emailId: z.string().uuid('Invalid email ID'),
  subject: z.string().min(1).max(500).trim(),
  body_text: z.string().max(50_000),
  body_html: z.string().max(100_000),
})

/** Outreach settings update. */
export const updateOutreachSettingsSchema = z.object({
  from_name: z.string().min(1).max(200).trim(),
  from_email: z.string().email().max(320).toLowerCase().trim(),
  reply_to: z.string().email().max(320).toLowerCase().trim(),
  daily_limit: z.number().int().min(1).max(100),
  score_threshold: z.number().int().min(0).max(100),
  business_address: z.string().max(500).trim(),
  sending_enabled: z.boolean(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Flatten Zod issues into a single human-readable string.
 * Safe to surface to the user — no internal paths or stack traces.
 *
 * Uses z.core.$ZodIssue (the Zod v4 canonical type).
 * z.ZodIssue is an alias for the same type but deprecated in v4.
 */
export function formatZodErrors(issues: z.core.$ZodIssue[]): string {
  return issues.map((i) => i.message).join('. ')
}
