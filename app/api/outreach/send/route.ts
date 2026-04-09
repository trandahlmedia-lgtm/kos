import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/outreach/resend'
import { checkRateLimit, userAction, LIMITS } from '@/lib/security/rateLimit'

const requestSchema = z.object({
  email_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit sends
  const rl = await checkRateLimit(
    userAction(user.id, 'outreach_send'),
    LIMITS.OUTREACH_SEND.max,
    LIMITS.OUTREACH_SEND.windowS
  )
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Daily send limit reached. Try again tomorrow.' }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { email_id } = parsed.data

  // Fetch the email
  const { data: email, error: emailErr } = await supabase
    .from('outreach_emails')
    .select('*, leads!inner(email, business_name)')
    .eq('id', email_id)
    .single()

  if (emailErr || !email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  if (email.status !== 'queued') {
    return NextResponse.json({ error: `Email must be in queued status to send (current: ${email.status})` }, { status: 400 })
  }

  const recipientEmail = (email as Record<string, unknown> & { leads: { email: string; business_name: string } }).leads.email
  if (!recipientEmail) {
    return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 })
  }

  // Get settings
  const { data: settings } = await supabase
    .from('outreach_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!settings) {
    return NextResponse.json({ error: 'Outreach settings not configured. Set up your sending settings first.' }, { status: 400 })
  }

  if (!settings.sending_enabled) {
    return NextResponse.json({ error: 'Sending is disabled. Enable it in outreach settings.' }, { status: 400 })
  }

  if (!settings.business_address) {
    return NextResponse.json({ error: 'Business address is required for CAN-SPAM compliance. Set it in outreach settings.' }, { status: 400 })
  }

  // Check opt-out
  const { data: optOut } = await supabase
    .from('email_opt_outs')
    .select('email')
    .eq('email', recipientEmail.toLowerCase())
    .single()

  if (optOut) {
    return NextResponse.json({ error: 'This recipient has opted out of emails' }, { status: 400 })
  }

  // Check daily limit from settings (separate from rate limiter)
  const today = new Date().toISOString().split('T')[0]
  const { count: sentToday } = await supabase
    .from('outreach_emails')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .eq('status', 'sent')
    .gte('sent_at', `${today}T00:00:00Z`)

  if ((sentToday ?? 0) >= settings.daily_limit) {
    return NextResponse.json({ error: `Daily send limit (${settings.daily_limit}) reached` }, { status: 429 })
  }

  // Build unsubscribe URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const unsubscribeUrl = `${baseUrl}/api/outreach/unsubscribe?email=${encodeURIComponent(recipientEmail)}`

  // Replace placeholders in HTML body
  const htmlBody = email.body_html
    .replace(/\{\{unsubscribe_link\}\}/g, `<a href="${unsubscribeUrl}" style="color:#999;font-size:12px;">Unsubscribe</a>`)
    .replace(/\{\{business_address\}\}/g, settings.business_address)

  const textBody = email.body_text
    .replace(/\{\{unsubscribe_link\}\}/g, `Unsubscribe: ${unsubscribeUrl}`)
    .replace(/\{\{business_address\}\}/g, settings.business_address)

  try {
    const { resendId } = await sendEmail({
      to: recipientEmail,
      from: `${settings.from_name} <${settings.from_email}>`,
      replyTo: settings.reply_to,
      subject: email.subject,
      html: htmlBody,
      text: textBody,
      unsubscribeUrl,
    })

    const now = new Date().toISOString()

    // Update email status
    await supabase
      .from('outreach_emails')
      .update({
        status: 'sent',
        sent_at: now,
        resend_id: resendId,
        updated_at: now,
      })
      .eq('id', email_id)

    // Create or update sequence
    const followUpNumber = email.follow_up_number as number

    if (followUpNumber === 0) {
      // Initial email — create sequence
      const nextSendAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      await supabase.from('outreach_sequences').upsert({
        lead_id: email.lead_id,
        status: 'active',
        current_step: 0,
        next_send_at: nextSendAt,
      }, { onConflict: 'lead_id' })
    } else if (followUpNumber < 3) {
      // Follow-up — advance sequence
      const daysMap: Record<number, number> = { 1: 4, 2: 7 } // days until next from current
      const nextDays = daysMap[followUpNumber]
      const nextSendAt = nextDays
        ? new Date(Date.now() + nextDays * 24 * 60 * 60 * 1000).toISOString()
        : null
      await supabase
        .from('outreach_sequences')
        .update({
          current_step: followUpNumber,
          next_send_at: nextSendAt,
          updated_at: now,
        })
        .eq('lead_id', email.lead_id)
    } else {
      // Last follow-up — complete sequence
      await supabase
        .from('outreach_sequences')
        .update({
          current_step: followUpNumber,
          status: 'completed',
          next_send_at: null,
          updated_at: now,
        })
        .eq('lead_id', email.lead_id)
    }

    // Auto-update lead stage: new → reached_out on first outreach email only.
    // Uses conditional update (eq stage + neq heat_level) to avoid read-then-write race.
    console.log('[AUTO-STAGE] Checking lead stage update', { leadId: email.lead_id, followUpNumber })
    if (followUpNumber === 0) {
      const { data: updated } = await supabase
        .from('leads')
        .update({ stage: 'reached_out', stage_updated_at: now, updated_at: now })
        .eq('id', email.lead_id)
        .eq('stage', 'new')
        .neq('heat_level', 'cut')
        .select('id')

      if (updated && updated.length > 0) {
        console.log('[AUTO-STAGE] Lead updated to reached_out', { leadId: email.lead_id })
        await supabase.from('lead_activities').insert({
          lead_id: email.lead_id,
          user_id: user.id,
          type: 'stage_change',
          content: 'Stage updated to reached_out',
          metadata: { to_stage: 'reached_out', trigger: 'auto', reason: 'first_outreach_email_sent', email_id },
        })
      }

      revalidatePath('/leads')
    }

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id: email.lead_id,
      user_id: user.id,
      type: 'email_sent',
      content: `Sent ${followUpNumber === 0 ? 'initial' : `follow-up #${followUpNumber}`} outreach email: "${email.subject}"`,
      metadata: { email_id, resend_id: resendId },
    })

    return NextResponse.json({ success: true, resendId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[outreach/send] Error:', message)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
