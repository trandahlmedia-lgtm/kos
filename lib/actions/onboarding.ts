/**
 * Onboarding server actions.
 * OWASP A03:2021 — Injection (input validation)
 * OWASP A04:2021 — Insecure Design (rate limiting, size limits)
 * OWASP A07:2021 — Authentication Failures (re-verify auth in every action)
 */
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  saveClaudeMdSchema,
  toggleOnboardingSchema,
  formatZodErrors,
} from '@/lib/security/validation'
import {
  checkRateLimit,
  userAction,
  LIMITS,
} from '@/lib/security/rateLimit'

// ---------------------------------------------------------------------------
// toggleOnboardingStep
// ---------------------------------------------------------------------------

/**
 * Mark an onboarding step as complete or incomplete.
 *
 * Security:
 *   1. Auth re-verification
 *   2. Rate limit: 60 per user per minute (toggling steps is fast/frequent)
 *   3. Zod validation: stepId and clientId must be valid UUIDs; completed is boolean
 */
export async function toggleOnboardingStep(
  stepId: string,
  completed: boolean,
  clientId: string
): Promise<void> {
  // 1. Auth.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Rate limit.
  const rl = await checkRateLimit(
    userAction(user.id, 'toggle_onboarding'),
    LIMITS.USER_WRITE.max,
    LIMITS.USER_WRITE.windowS
  )
  if (!rl.allowed) {
    const secs = rl.retryAfter
    throw new Error(`Rate limit exceeded. Please wait ${secs} second${secs !== 1 ? 's' : ''}.`)
  }

  // 3. Validate all three parameters.
  const parsed = toggleOnboardingSchema.safeParse({ stepId, completed, clientId })
  if (!parsed.success) {
    throw new Error(formatZodErrors(parsed.error.issues))
  }

  const { stepId: validStepId, completed: validCompleted, clientId: validClientId } =
    parsed.data

  // 4. Update — use the validated IDs, not the raw inputs.
  const { error } = await supabase
    .from('onboarding_steps')
    .update({
      completed: validCompleted,
      completed_at: validCompleted ? new Date().toISOString() : null,
      completed_by: validCompleted ? user.id : null,
    })
    .eq('id', validStepId)
    // Extra safety: confirm the step actually belongs to the stated client.
    .eq('client_id', validClientId)

  if (error) {
    console.error('[toggleOnboardingStep] DB update failed:', error)
    throw new Error('Failed to update step.')
  }

  revalidatePath(`/clients/${validClientId}`)
}

// ---------------------------------------------------------------------------
// saveClaudeMd
// ---------------------------------------------------------------------------

/**
 * Save the client brand document.
 *
 * Security:
 *   1. Auth re-verification
 *   2. Rate limit: 60 saves per user per minute
 *   3. Size cap: 100 KB — prevents oversized writes to the DB.
 *      The client-side editor also enforces this, but server validation
 *      is the authoritative check.
 *   4. Zod validation: clientId must be a valid UUID
 */
export async function saveClaudeMd(clientId: string, claudeMd: string): Promise<void> {
  // 1. Auth.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Rate limit.
  const rl = await checkRateLimit(
    userAction(user.id, 'save_claude_md'),
    LIMITS.USER_WRITE.max,
    LIMITS.USER_WRITE.windowS
  )
  if (!rl.allowed) {
    const secs = rl.retryAfter
    throw new Error(`Rate limit exceeded. Please wait ${secs} second${secs !== 1 ? 's' : ''}.`)
  }

  // 3. Validate — clientId format + document size.
  const parsed = saveClaudeMdSchema.safeParse({ clientId, claudeMd })
  if (!parsed.success) {
    throw new Error(formatZodErrors(parsed.error.issues))
  }

  const { clientId: validClientId, claudeMd: validDoc } = parsed.data

  // 4. Update.
  const { error } = await supabase
    .from('clients')
    .update({ claude_md: validDoc, updated_at: new Date().toISOString() })
    .eq('id', validClientId)

  if (error) {
    console.error('[saveClaudeMd] DB update failed:', error)
    throw new Error('Failed to save brand document. Please try again.')
  }

  revalidatePath(`/clients/${validClientId}`)
}
