-- =============================================================================
-- Phase 6 — Client Metrics Table
--
-- Stores weekly client performance data entered manually by Jay.
-- Future: automate with GA4 + Meta APIs.
--
-- Run in Supabase SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS client_metrics (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  metric_date         date NOT NULL,
  website_sessions    integer,
  meta_reach          integer,
  meta_impressions    integer,
  meta_clicks         integer,
  meta_spend          decimal(10, 2),
  meta_leads          integer,
  google_reviews      integer,
  google_rating       decimal(3, 2),
  gbp_views           integer,
  gbp_clicks          integer,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_metrics_authenticated" ON client_metrics;
CREATE POLICY "client_metrics_authenticated" ON client_metrics
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS client_metrics_client_date_idx
  ON client_metrics(client_id, metric_date DESC);
