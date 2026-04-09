-- Migration: add visual fields to posts + create post_visuals table
-- Already applied to Supabase — this file is for version control tracking only

-- Add format and placement columns to posts
ALTER TABLE posts
  ADD COLUMN format text DEFAULT 'static',
  ADD COLUMN placement text DEFAULT 'feed';

ALTER TABLE posts
  ADD CONSTRAINT posts_format_check CHECK (format IN ('carousel', 'static')),
  ADD CONSTRAINT posts_placement_check CHECK (placement IN ('feed', 'story'));

-- Create post_visuals table
CREATE TABLE post_visuals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  client_id       uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  generated_html  text,
  creative_brief  jsonb,
  layout_recipe   jsonb,
  slide_count     integer,
  color_palette   jsonb,
  photo_slots     jsonb,
  font_pair       jsonb,
  export_status   text DEFAULT 'pending',
  exported_at     timestamptz,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  UNIQUE(post_id)
);

-- RLS
ALTER TABLE post_visuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own post visuals"
  ON post_visuals FOR ALL
  USING (
    client_id IN (SELECT id FROM clients WHERE assigned_to = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_post_visuals_client_id ON post_visuals(client_id);
CREATE INDEX idx_post_visuals_created_at ON post_visuals(created_at DESC);
