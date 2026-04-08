/**
 * Authentication server action.
 * OWASP A07:2021 — Identification and Authentication Failures
 *
 * Moving login server-side (vs. direct browser Supabase call) enables:
 *   1. Rate limiting before the auth attempt hits Supabase
 *   2. Input validation before any downstream call
 *   3. No API keys or sensitive logic in the client bundle
 */
'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, formatZodErrors } from '@/lib/security/validation'
import {
  checkRateLimit,
  loginByIp,
  loginByEmail,
  LIMITS,
} from '@/lib/security/rateLimit'

export interface LoginResult {
  success: boolean
  error?: string
  /** If rate-limited, how many seconds to wait before retrying */
  retryAfter?: number
}

/**
 * Authenticate a user.
 *
 * Security layers (in order):
 *   1. Zod validation — rejects malformed input before any I/O
 *   2. IP-based rate limit — 5 attempts / 15 min per IP
 *   3. Email-based rate limit — 10 attempts / 15 min per email
 *   4. Supabase signInWithPassword — server-side only
 *   5. Generic error on failure — prevents user enumeration
 */
export async function loginAction(credentials: {
  email: string
  password: string
}): Promise<LoginResult> {
  // -------------------------------------------------------------------------
  // 1. Validate input with Zod
  //    Rejects garbage before we make any DB calls.
  // -------------------------------------------------------------------------
  const parsed = loginSchema.safeParse(credentials)
  if (!parsed.success) {
    // Return a generic message — don't reveal which field failed.
    // Detailed errors here could help an attacker enumerate valid addresses.
    return { success: false, error: 'Invalid email or password.' }
  }

  const { email, password } = parsed.data

  // -------------------------------------------------------------------------
  // 2. Extract the client IP from forwarded headers.
  //    Vercel sets x-forwarded-for; x-real-ip is a common reverse-proxy header.
  //    On localhost both may be absent — 'unknown' is used as a fallback key.
  // -------------------------------------------------------------------------
  const headersList = await headers()
  const clientIp =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  // -------------------------------------------------------------------------
  // 3. IP-based rate limit — catches credential-stuffing from a single IP
  // -------------------------------------------------------------------------
  const ipLimit = await checkRateLimit(
    loginByIp(clientIp),
    LIMITS.LOGIN_IP.max,
    LIMITS.LOGIN_IP.windowS
  )
  if (!ipLimit.allowed) {
    const minutes = Math.ceil(ipLimit.retryAfter / 60)
    return {
      success: false,
      error: `Too many login attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
      retryAfter: ipLimit.retryAfter,
    }
  }

  // -------------------------------------------------------------------------
  // 4. Email-based rate limit — protects individual accounts even when
  //    the attacker rotates IPs
  // -------------------------------------------------------------------------
  const emailLimit = await checkRateLimit(
    loginByEmail(email),
    LIMITS.LOGIN_EMAIL.max,
    LIMITS.LOGIN_EMAIL.windowS
  )
  if (!emailLimit.allowed) {
    const minutes = Math.ceil(emailLimit.retryAfter / 60)
    return {
      success: false,
      error: `Too many login attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
      retryAfter: emailLimit.retryAfter,
    }
  }

  // -------------------------------------------------------------------------
  // 5. Attempt authentication server-side.
  //    The Supabase SSR library sets auth cookies via the server cookie store,
  //    so the session is available to all subsequent Server Components.
  // -------------------------------------------------------------------------
  const supabase = await createClient()
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    // Deliberately generic — don't reveal whether the email exists.
    return { success: false, error: 'Invalid email or password.' }
  }

  return { success: true }
}
