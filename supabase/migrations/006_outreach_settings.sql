-- =============================================================================
-- 006 — Outreach Settings + outreach_emails patch
-- Run in Supabase SQL Editor after 005_outreach_engine.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CREATE outreach_settings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS outreach_settings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id),
  from_name        text NOT NULL DEFAULT 'Jay Trandahl',
  from_email       text NOT NULL DEFAULT 'jay@mail.konvyrt.com',
  reply_to         text NOT NULL DEFAULT 'jay@konvyrt.com',
  daily_limit      integer NOT NULL DEFAULT 20,
  score_threshold  integer NOT NULL DEFAULT 60,
  business_address text NOT NULL DEFAULT '',
  sending_enabled  boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outreach_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outreach_settings_authenticated" ON outreach_settings;
CREATE POLICY "outreach_settings_authenticated" ON outreach_settings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE UNIQUE INDEX IF NOT EXISTS outreach_settings_user_id_unique
  ON outreach_settings(user_id);

-- ---------------------------------------------------------------------------
-- 2. PATCH outreach_emails — add follow_up_number
-- ---------------------------------------------------------------------------

ALTER TABLE outreach_emails
  ADD COLUMN IF NOT EXISTS follow_up_number integer NOT NULL DEFAULT 0;
-- 0 = initial, 1 = 3-day follow-up, 2 = 7-day, 3 = 14-day
