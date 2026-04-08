import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Follow-up cadence: days after initial send
 * Step 1 = 3 days, Step 2 = 7 days, Step 3 = 14 days
 */
const FOLLOW_UP_DAYS: Record<number, number> = {
  1: 3,
  2: 7,
  3: 14,
}

export interface DueFollowUp {
  sequenceId: string
  leadId: string
  leadName: string
  leadEmail: string | null
  currentStep: number
  nextStep: number
  emailId: string | null
  emailSubject: string | null
}

/**
 * Get follow-ups that are due (next_send_at <= now, sequence active, no reply).
 * Returns follow-ups with their pre-generated draft email if it exists.
 */
export async function getDueFollowUps(
  supabase: SupabaseClient
): Promise<DueFollowUp[]> {
  const now = new Date().toISOString()

  // Get active sequences where next_send_at has passed
  const { data: sequences, error } = await supabase
    .from('outreach_sequences')
    .select('id, lead_id, current_step, next_send_at')
    .eq('status', 'active')
    .lte('next_send_at', now)

  if (error || !sequences || sequences.length === 0) return []

  const results: DueFollowUp[] = []

  for (const seq of sequences) {
    const nextStep = (seq.current_step as number) + 1

    // Skip if past last follow-up
    if (nextStep > 3) continue

    // Check if lead has replied to any email
    const { data: repliedEmails } = await supabase
      .from('outreach_emails')
      .select('id')
      .eq('lead_id', seq.lead_id)
      .not('replied_at', 'is', null)
      .limit(1)

    if (repliedEmails && repliedEmails.length > 0) {
      // Lead replied — mark sequence completed
      await supabase
        .from('outreach_sequences')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', seq.id)
      continue
    }

    // Check if lead opted out
    const { data: lead } = await supabase
      .from('leads')
      .select('business_name, email')
      .eq('id', seq.lead_id)
      .single()

    if (lead?.email) {
      const { data: optOut } = await supabase
        .from('email_opt_outs')
        .select('email')
        .eq('email', lead.email.toLowerCase())
        .single()

      if (optOut) {
        await supabase
          .from('outreach_sequences')
          .update({ status: 'opted_out', updated_at: new Date().toISOString() })
          .eq('id', seq.id)
        continue
      }
    }

    // Find pre-generated follow-up draft
    const templateType = `followup_${nextStep}` as const
    const { data: draft } = await supabase
      .from('outreach_emails')
      .select('id, subject')
      .eq('lead_id', seq.lead_id)
      .eq('template_type', templateType)
      .eq('status', 'draft')
      .single()

    results.push({
      sequenceId: seq.id,
      leadId: seq.lead_id,
      leadName: lead?.business_name ?? 'Unknown',
      leadEmail: lead?.email ?? null,
      currentStep: seq.current_step as number,
      nextStep,
      emailId: draft?.id ?? null,
      emailSubject: draft?.subject ?? null,
    })
  }

  return results
}

/**
 * Compute the next_send_at timestamp based on the initial email's sent_at
 * and the follow-up step number.
 */
export function computeNextSendAt(initialSentAt: string, step: number): string | null {
  const days = FOLLOW_UP_DAYS[step]
  if (!days) return null
  const date = new Date(initialSentAt)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}
