-- =============================================================================
-- Phase 3.5 — Client Hub Rebuild & Content Workflow Refactor
--
-- 1. Extend posts table (cross-posting, angle, visual direction, caption brief)
-- 2. Extend captions table (per-platform captions, visual notes)
-- 3. New tables: client_tasks, weekly_directions, agency_tasks
-- 4. Storage bucket + policies for kos-media
--
-- Run in Supabase SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTEND posts
-- ---------------------------------------------------------------------------

-- Cross-post targets (e.g. ['facebook', 'nextdoor'] alongside primary platform)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cross_post_platforms text[] NOT NULL DEFAULT '{}';

-- AI-generated angle/brief for this post slot
ALTER TABLE posts ADD COLUMN IF NOT EXISTS angle text;

-- Visual direction: what the creative should look like
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visual_direction text;

-- Caption brief: structured direction for caption generation
ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption_brief text;

-- FK to weekly_directions (created below — add FK after table exists)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS weekly_direction_id uuid;

-- FK to parent post (for linked cross-posts sharing a creative)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id uuid REFERENCES posts(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 2. EXTEND captions
-- ---------------------------------------------------------------------------

-- Platform this caption is written for (enables per-platform variants)
ALTER TABLE captions ADD COLUMN IF NOT EXISTS platform text;

-- AI visual analysis notes (from vision API pass on the uploaded creative)
ALTER TABLE captions ADD COLUMN IF NOT EXISTS visual_notes text;

-- ---------------------------------------------------------------------------
-- 3. CREATE weekly_directions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS weekly_directions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start_date     date NOT NULL,
  direction_text      text NOT NULL,
  post_count_override integer,
  created_by          uuid REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, week_start_date)
);

ALTER TABLE weekly_directions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_directions_authenticated" ON weekly_directions;
CREATE POLICY "weekly_directions_authenticated" ON weekly_directions
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS weekly_directions_client_id_idx   ON weekly_directions(client_id);
CREATE INDEX IF NOT EXISTS weekly_directions_week_start_idx  ON weekly_directions(week_start_date);

-- Now add the FK on posts (table exists now)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_weekly_direction_id_fkey;
ALTER TABLE posts
  ADD CONSTRAINT posts_weekly_direction_id_fkey
  FOREIGN KEY (weekly_direction_id) REFERENCES weekly_directions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4. CREATE client_tasks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title       text NOT NULL,
  completed   boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order  integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_tasks_authenticated" ON client_tasks;
CREATE POLICY "client_tasks_authenticated" ON client_tasks
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS client_tasks_client_id_idx ON client_tasks(client_id);

-- ---------------------------------------------------------------------------
-- 5. CREATE agency_tasks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agency_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order   integer NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agency_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_tasks_authenticated" ON agency_tasks;
CREATE POLICY "agency_tasks_authenticated" ON agency_tasks
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 6. STORAGE — kos-media bucket
-- ---------------------------------------------------------------------------

-- Create the bucket if it doesn't exist.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kos-media',
  'kos-media',
  false,
  104857600,  -- 100 MB hard cap
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can read files in the bucket.
-- Writes go through the service role (adminClient) in the upload API route — no RLS policy needed for INSERT.
DROP POLICY IF EXISTS "kos_media_authenticated_read" ON storage.objects;
CREATE POLICY "kos_media_authenticated_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'kos-media' AND auth.role() = 'authenticated');
