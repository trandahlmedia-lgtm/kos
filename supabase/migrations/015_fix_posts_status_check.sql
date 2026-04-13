-- =============================================================================
-- Migration 015: Fix posts.status CHECK constraint
--
-- Problem: The original posts table was created with a 7-stage status flow:
--   slot, in_production, ready_for_review, sent_for_approval, approved, scheduled, published
--
-- Migration 004 remapped the data to the 5-stage flow but never updated
-- the CHECK constraint. So any write of status = 'ready' violates the
-- original constraint — adminClient cannot bypass a DB-level CHECK.
--
-- Fix: Drop the stale constraint (if it exists) and add the correct one
-- for the current 5-stage flow.
--
-- Run in Supabase SQL Editor.
-- =============================================================================

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;

ALTER TABLE posts
  ADD CONSTRAINT posts_status_check
  CHECK (status IN ('slot', 'in_production', 'ready', 'scheduled', 'published'));
