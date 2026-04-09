-- =============================================================================
-- 009 — Add source column to email_opt_outs
-- Tracks whether an opt-out came from disqualify vs public unsubscribe link.
-- Re-qualify only removes disqualify-sourced opt-outs, preserving public ones.
-- =============================================================================

ALTER TABLE email_opt_outs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'disqualify';

-- Backfill: any existing opt-outs with sequences marked 'opted_out' came from
-- the public unsubscribe link; mark them accordingly.
UPDATE email_opt_outs
SET source = 'unsubscribe'
WHERE email IN (
  SELECT DISTINCT lower(l.email)
  FROM leads l
  JOIN outreach_sequences os ON os.lead_id = l.id
  WHERE os.status = 'opted_out'
    AND l.email IS NOT NULL
);
