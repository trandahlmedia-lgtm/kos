import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

// Public endpoint — no auth required (recipient clicks this link)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return new NextResponse('Missing email parameter', { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Upsert into opt-outs (uses service role — no RLS user context)
  const { error } = await adminClient
    .from('email_opt_outs')
    .upsert({ email: normalizedEmail, source: 'unsubscribe' }, { onConflict: 'email' })

  if (error) {
    console.error('[unsubscribe] Error:', error)
    return new NextResponse('Something went wrong. Please try again.', { status: 500 })
  }

  // Pause any active sequences for leads with this email
  const { data: leads } = await adminClient
    .from('leads')
    .select('id')
    .eq('email', normalizedEmail)

  if (leads && leads.length > 0) {
    const leadIds = leads.map((l) => l.id)
    await adminClient
      .from('outreach_sequences')
      .update({ status: 'opted_out', updated_at: new Date().toISOString() })
      .in('lead_id', leadIds)
      .eq('status', 'active')
  }

  // Return a simple HTML confirmation
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>Unsubscribed</title></head>
<body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center;color:#333;">
  <h2>You've been unsubscribed</h2>
  <p>You will no longer receive outreach emails from Konvyrt Marketing.</p>
  <p style="color:#999;font-size:14px;">If this was a mistake, reply to any previous email and we'll re-add you.</p>
</body>
</html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }
  )
}
