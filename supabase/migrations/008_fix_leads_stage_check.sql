-- =============================================================================
-- Fix leads_stage_check constraint to allow all 7 pipeline stages.
-- The original constraint was missing: reached_out, connected, interested, proposal_sent.
-- Run in Supabase SQL Editor.
-- =============================================================================

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_stage_check;

ALTER TABLE leads ADD CONSTRAINT leads_stage_check
  CHECK (stage IN ('new', 'reached_out', 'connected', 'interested', 'proposal_sent', 'won', 'lost'));
