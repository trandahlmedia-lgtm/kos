import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

// Resend webhook — no auth (verified by signature)
// Events: email.delivered, email.opened, email.bounced, email.complained

interface ResendWebhookPayload {
  type: string
  data: {
    email_id: string
    to: string[]
    created_at: string
  }
}

export async function POST(request: Request) {
  // Verify webhook signature
  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing webhook signature headers' }, { status: 400 })
  }

  // TODO: Verify signature with svix library when RESEND_WEBHOOK_SECRET is set
  // For now, check that the secret env var exists as a basic gate
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let payload: ResendWebhookPayload
  try {
    payload = (await request.json()) as ResendWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, data } = payload
  const resendId = data.email_id
  const now = new Date().toISOString()

  if (!resendId) {
    return NextResponse.json({ error: 'Missing email_id' }, { status: 400 })
  }

  // Find our email record by resend_id
  const { data: email, error: findErr } = await adminClient
    .from('outreach_emails')
    .select('id, lead_id, status')
    .eq('resend_id', resendId)
    .single()

  if (findErr || !email) {
    // Not our email or not found — acknowledge anyway
    return NextResponse.json({ received: true })
  }

  switch (type) {
    case 'email.delivered': {
      await adminClient
        .from('outreach_emails')
        .update({ status: 'delivered', updated_at: now })
        .eq('id', email.id)
      break
    }

    case 'email.opened': {
      // Only update if not already replied (replied > opened)
      if (email.status !== 'replied') {
        await adminClient
          .from('outreach_emails')
          .update({ status: 'opened', opened_at: now, updated_at: now })
          .eq('id', email.id)
      }
      break
    }

    case 'email.bounced': {
      await adminClient
        .from('outreach_emails')
        .update({ status: 'bounced', bounced_at: now, updated_at: now })
        .eq('id', email.id)

      // Pause the sequence
      await adminClient
        .from('outreach_sequences')
        .update({ status: 'paused', updated_at: now })
        .eq('lead_id', email.lead_id)
        .eq('status', 'active')
      break
    }

    case 'email.complained': {
      // Spam complaint — opt out and pause
      const recipientEmail = data.to?.[0]
      if (recipientEmail) {
        await adminClient
          .from('email_opt_outs')
          .upsert({ email: recipientEmail.toLowerCase() }, { onConflict: 'email' })
      }

      await adminClient
        .from('outreach_sequences')
        .update({ status: 'opted_out', updated_at: now })
        .eq('lead_id', email.lead_id)
        .eq('status', 'active')

      await adminClient
        .from('outreach_emails')
        .update({ status: 'bounced', bounced_at: now, updated_at: now })
        .eq('id', email.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
