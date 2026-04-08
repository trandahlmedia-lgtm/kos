-- =============================================================================
-- Phase 4 — Lead Pipeline
-- Alters existing `leads` table, creates `lead_research` and `lead_activities`.
-- Run in Supabase SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CREATE leads base table if it doesn't exist, then add Phase 4 columns
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  stage        text NOT NULL DEFAULT 'new',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to         uuid REFERENCES profiles(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_website         boolean NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_handle    text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS facebook_url        text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_business_url text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS other_social_links  text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS social_presence_notes text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS years_in_business   integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS jobs_per_week       integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS work_inflow_notes   text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS service_area        text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source              text NOT NULL DEFAULT 'cold_call';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_updated_at    timestamptz NOT NULL DEFAULT now();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_notes          text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_call_summary     text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_score            integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS manual_score        integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_evaluation       text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_recommended_tier text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_recommended_mrr  integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_to_client_id uuid REFERENCES clients(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at        timestamptz;

-- Ensure stage column exists with correct default (may already exist with different values)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new';

-- Ensure core columns exist (may already be present)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone         text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email         text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website       text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry      text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason   text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes         text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at    timestamptz NOT NULL DEFAULT now();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at    timestamptz NOT NULL DEFAULT now();

-- RLS on leads (enable if not already enabled)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_authenticated" ON leads;
CREATE POLICY "leads_authenticated" ON leads
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Indexes on leads
CREATE INDEX IF NOT EXISTS leads_stage_idx       ON leads(stage);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads(assigned_to);

-- ---------------------------------------------------------------------------
-- 2. CREATE lead_research
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lead_research (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  website_audit    jsonb,
  social_audit     jsonb,
  business_intel   jsonb,
  service_fit      jsonb,
  pricing_analysis jsonb,
  full_report      text,
  overall_score    integer,
  status           text NOT NULL DEFAULT 'pending',
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_research ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_research_authenticated" ON lead_research;
CREATE POLICY "lead_research_authenticated" ON lead_research
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE UNIQUE INDEX IF NOT EXISTS lead_research_lead_id_unique ON lead_research(lead_id);
CREATE INDEX IF NOT EXISTS lead_research_lead_id_idx ON lead_research(lead_id);

-- ---------------------------------------------------------------------------
-- 3. CREATE lead_activities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lead_activities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id),
  type       text NOT NULL,
  content    text NOT NULL DEFAULT '',
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_activities_authenticated" ON lead_activities;
CREATE POLICY "lead_activities_authenticated" ON lead_activities
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS lead_activities_lead_id_idx ON lead_activities(lead_id);
