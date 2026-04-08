import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getDueFollowUps } from '@/lib/outreach/followUps'

/**
 * Vercel Cron endpoint — runs daily at 8am CT (13:00 UTC).
 * Checks for due follow-ups and ensures they're surfaced in the review queue.
 * Does NOT send anything — just validates sequences and computes state.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dueFollowUps = await getDueFollowUps(adminClient)

    // Log how many are due (for monitoring)
    const withDrafts = dueFollowUps.filter((f) => f.emailId).length
    const withoutDrafts = dueFollowUps.filter((f) => !f.emailId).length

    return NextResponse.json({
      success: true,
      due: dueFollowUps.length,
      withDrafts,
      withoutDrafts,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/outreach-followups] Error:', message)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
