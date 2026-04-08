-- =============================================================================
-- Phase 4A+B — Outreach Engine
-- Extends leads table, creates outreach email tables.
-- Run in Supabase SQL Editor after 004_phase3_5_patch.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTEND leads for outreach engine
-- ---------------------------------------------------------------------------

ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_count    integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rating          numeric(2,1);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS heat_level      text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority_tag    text;

CREATE INDEX IF NOT EXISTS leads_heat_level_idx ON leads(heat_level);
CREATE INDEX IF NOT EXISTS leads_source_idx     ON leads(source);

-- ---------------------------------------------------------------------------
-- 2. CREATE outreach_emails
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS outreach_emails (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  subject           text NOT NULL,
  body_html         text NOT NULL DEFAULT '',
  body_text         text NOT NULL DEFAULT '',
  status            text NOT NULL DEFAULT 'draft',
  template_type     text NOT NULL DEFAULT 'initial',
  scheduled_send_at timestamptz,
  sent_at           timestamptz,
  opened_at         timestamptz,
  replied_at        timestamptz,
  bounced_at        timestamptz,
  resend_id         text,
  created_by        uuid REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outreach_emails_authenticated" ON outreach_emails;
CREATE POLICY "outreach_emails_authenticated" ON outreach_emails
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS outreach_emails_lead_id_idx ON outreach_emails(lead_id);
CREATE INDEX IF NOT EXISTS outreach_emails_status_idx  ON outreach_emails(status);

-- ---------------------------------------------------------------------------
-- 3. CREATE outreach_sequences
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS outreach_sequences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'active',
  current_step integer NOT NULL DEFAULT 0,
  next_send_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outreach_sequences_authenticated" ON outreach_sequences;
CREATE POLICY "outreach_sequences_authenticated" ON outreach_sequences
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE UNIQUE INDEX IF NOT EXISTS outreach_sequences_lead_id_unique ON outreach_sequences(lead_id);

-- ---------------------------------------------------------------------------
-- 4. CREATE email_opt_outs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_opt_outs (
  email       text PRIMARY KEY,
  opted_out_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_opt_outs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_opt_outs_authenticated" ON email_opt_outs;
CREATE POLICY "email_opt_outs_authenticated" ON email_opt_outs
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
