-- =============================================================================
-- Phase 3.5 Patch — Security & correctness fixes from Codex adversarial review
--
-- 1. Cross-client FK safety on posts (parent_post_id, weekly_direction_id)
-- 2. Storage RLS: remove broad authenticated read from kos-media
-- 3. MIME type: add video/mov to match upload API allowlist
-- 4. Legacy PostStatus remap: 7-stage → 5-stage
-- 5. Atomic reorder RPCs: reorder_client_tasks, reorder_agency_tasks
--
-- Run in Supabase SQL Editor after 003_phase3_5.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CROSS-CLIENT FK SAFETY
--
-- Problem: parent_post_id and weekly_direction_id only validate existence,
-- not ownership. A post could reference a parent or direction from a
-- different client, corrupting cross-post and weekly planning graphs.
--
-- Fix: Add composite unique constraints on (id, client_id) for posts and
-- weekly_directions, then upgrade the FKs to composite references so the DB
-- enforces same-client at write time.
-- ---------------------------------------------------------------------------

-- Composite unique on posts so we can use it as a FK target
ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_id_client_id_unique;
ALTER TABLE posts
  ADD CONSTRAINT posts_id_client_id_unique UNIQUE (id, client_id);

-- Composite unique on weekly_directions
ALTER TABLE weekly_directions
  DROP CONSTRAINT IF EXISTS weekly_directions_id_client_id_unique;
ALTER TABLE weekly_directions
  ADD CONSTRAINT weekly_directions_id_client_id_unique UNIQUE (id, client_id);

-- Drop simple FK, replace with composite FK enforcing same client
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_parent_post_id_fkey;
ALTER TABLE posts
  ADD CONSTRAINT posts_parent_post_id_client_fkey
  FOREIGN KEY (parent_post_id, client_id)
  REFERENCES posts(id, client_id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- Drop simple FK, replace with composite FK enforcing same client
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_weekly_direction_id_fkey;
ALTER TABLE posts
  ADD CONSTRAINT posts_weekly_direction_id_client_fkey
  FOREIGN KEY (weekly_direction_id, client_id)
  REFERENCES weekly_directions(id, client_id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------------------
-- 2. STORAGE RLS — REMOVE BROAD AUTHENTICATED READ
--
-- Problem: The policy in 003 grants SELECT on every object in kos-media to
-- any authenticated session, bypassing signed-URL access and removing path
-- scoping between clients.
--
-- Fix: Drop the policy entirely. Media is served exclusively via signed URLs
-- generated server-side (service role). No client-side SELECT needed.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "kos_media_authenticated_read" ON storage.objects;

-- Writes remain service-role only (no INSERT policy needed — upload route
-- uses adminClient which bypasses RLS).

-- ---------------------------------------------------------------------------
-- 3. MIME TYPE — ADD video/mov TO MATCH UPLOAD API
--
-- Problem: Bucket allows video/mp4 and video/quicktime but not video/mov.
-- Upload API accepts video/mov, so users get a client-side success then a
-- storage-layer rejection after this migration.
--
-- Fix: Update the bucket's allowed_mime_types to include video/mov.
-- ---------------------------------------------------------------------------

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/mov'
]
WHERE id = 'kos-media';

-- ---------------------------------------------------------------------------
-- 4. LEGACY PostStatus REMAP — 7-stage → 5-stage
--
-- Problem: Existing post rows may carry legacy status values. StatusBadge
-- dereferences POST_STATUS_CONFIG[status] which is undefined for unknown
-- values, causing a hard crash in the content UI.
--
-- Mapping:
--   slot              → slot           (unchanged)
--   in_production     → in_production  (unchanged)
--   ready_for_review  → in_production  (still in the production loop)
--   sent_for_approval → ready          (externally approved = ready to ship)
--   approved          → ready          (same)
--   scheduled         → scheduled      (unchanged)
--   published         → published      (unchanged)
-- ---------------------------------------------------------------------------

UPDATE posts SET status = 'in_production' WHERE status = 'ready_for_review';
UPDATE posts SET status = 'ready'         WHERE status = 'sent_for_approval';
UPDATE posts SET status = 'ready'         WHERE status = 'approved';

-- ---------------------------------------------------------------------------
-- 5. ATOMIC REORDER RPCs
--
-- Problem: reorderClientTasks / reorderAgencyTasks fire N independent
-- updates with no transaction, no input validation, and no ownership check.
-- A partial failure silently corrupts sort_order.
--
-- Fix: Move reorder logic into SECURITY DEFINER functions that validate
-- ownership and update all rows in a single statement (atomic by default
-- in Postgres).
-- ---------------------------------------------------------------------------

-- reorder_client_tasks
-- Validates every id belongs to p_client_id before writing.
CREATE OR REPLACE FUNCTION reorder_client_tasks(
  p_task_ids  uuid[],
  p_client_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF array_length(p_task_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'task list cannot be empty';
  END IF;

  -- Verify all submitted ids belong to the expected client
  SELECT COUNT(*) INTO v_count
  FROM client_tasks
  WHERE id = ANY(p_task_ids)
    AND client_id = p_client_id;

  IF v_count != array_length(p_task_ids, 1) THEN
    RAISE EXCEPTION 'one or more task ids do not belong to client %', p_client_id;
  END IF;

  -- Single UPDATE — atomic, no partial write possible
  UPDATE client_tasks AS ct
  SET sort_order = ord.idx
  FROM (
    SELECT
      unnest(p_task_ids)                                    AS task_id,
      generate_series(0, array_length(p_task_ids, 1) - 1)  AS idx
  ) AS ord
  WHERE ct.id = ord.task_id
    AND ct.client_id = p_client_id;
END;
$$;

-- reorder_agency_tasks
-- Agency tasks have no client scope — validate ids exist before writing.
CREATE OR REPLACE FUNCTION reorder_agency_tasks(
  p_task_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF array_length(p_task_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'task list cannot be empty';
  END IF;

  -- Verify all submitted ids actually exist in agency_tasks
  SELECT COUNT(*) INTO v_count
  FROM agency_tasks
  WHERE id = ANY(p_task_ids);

  IF v_count != array_length(p_task_ids, 1) THEN
    RAISE EXCEPTION 'one or more task ids do not exist in agency_tasks';
  END IF;

  -- Single UPDATE — atomic
  UPDATE agency_tasks AS at
  SET sort_order = ord.idx
  FROM (
    SELECT
      unnest(p_task_ids)                                    AS task_id,
      generate_series(0, array_length(p_task_ids, 1) - 1)  AS idx
  ) AS ord
  WHERE at.id = ord.task_id;
END;
$$;
