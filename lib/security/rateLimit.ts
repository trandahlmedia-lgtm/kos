/**
 * Rate limiting — Supabase-backed, server-side only.
 * OWASP A04:2021 — Insecure Design
 *
 * Architecture: fixed-window counter stored in Supabase (rate_limits table).
 * Uses an atomic DB upsert so concurrent requests can't beat the counter.
 * Works correctly on Vercel serverless (no shared in-process memory needed).
 *
 * Fails OPEN: if the DB is unreachable, requests are allowed through.
 * This prevents rate-limit outages from becoming a self-inflicted DoS.
 *
 * Prerequisite: run supabase/migrations/001_rate_limits.sql in Supabase SQL Editor.
 *
 * For higher throughput (thousands of req/s), replace adminClient calls here
 * with Upstash Redis: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */
import 'server-only'
import { adminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean
  /** Requests remaining in the current window */
  remaining: number
  /** Seconds until the window resets; 0 when allowed */
  retryAfter: number
}

// ---------------------------------------------------------------------------
// Core check function
// ---------------------------------------------------------------------------

/**
 * Check and atomically increment the rate limit counter for a given key.
 *
 * @param key     Unique string identifying the subject + action, e.g. "login:ip:1.2.3.4"
 * @param max     Maximum requests allowed within the window
 * @param windowS Window duration in seconds
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowS: number
): Promise<RateLimitResult> {
  try {
    const { data, error } = await adminClient.rpc(
      'check_and_increment_rate_limit',
      { p_key: key, p_max_count: max, p_window_seconds: windowS }
    )

    if (error) {
      // Fail open: log but allow the request through.
      // Common cause: migration not yet run — table doesn't exist.
      console.error('[RateLimit] DB check failed (failing open):', error.message)
      return { allowed: true, remaining: max, retryAfter: 0 }
    }

    // RPC returns an array of rows; take the first.
    const row = (Array.isArray(data) ? data[0] : data) as
      | { allowed: boolean; current_count: number; window_start: string }
      | null

    if (!row) return { allowed: true, remaining: max, retryAfter: 0 }

    const currentCount = row.current_count
    const allowed = row.allowed

    return {
      allowed,
      remaining: Math.max(0, max - currentCount),
      retryAfter: allowed ? 0 : windowS,
    }
  } catch (err) {
    // Fail open on any unexpected error.
    console.error('[RateLimit] Unexpected error (failing open):', err)
    return { allowed: true, remaining: max, retryAfter: 0 }
  }
}

// ---------------------------------------------------------------------------
// Key builders — deterministic, collision-resistant strings
// ---------------------------------------------------------------------------

/** Login attempts per IP address (brute-force protection) */
export const loginByIp = (ip: string) => `login:ip:${ip}`

/** Login attempts per email (targeted account lockout protection) */
export const loginByEmail = (email: string) =>
  `login:email:${email.toLowerCase().trim()}`

/** General authenticated-user action */
export const userAction = (userId: string, action: string) =>
  `action:user:${userId}:${action}`

// ---------------------------------------------------------------------------
// Limit presets
// ---------------------------------------------------------------------------

export const LIMITS = {
  /** 5 login attempts per IP per 15 minutes */
  LOGIN_IP: { max: 5, windowS: 900 } as const,

  /** 10 login attempts per email per 15 minutes (per-account protection) */
  LOGIN_EMAIL: { max: 10, windowS: 900 } as const,

  /** 60 standard mutations per authenticated user per minute */
  USER_WRITE: { max: 60, windowS: 60 } as const,

  /** 20 heavyweight / resource-intensive actions per user per minute */
  USER_HEAVY: { max: 20, windowS: 60 } as const,

  /** 30 outreach email sends per user per day (86400s) */
  OUTREACH_SEND: { max: 30, windowS: 86_400 } as const,
} as const
