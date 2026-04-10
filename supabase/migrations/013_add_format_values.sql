-- Migration 013: Expand posts.format constraint to include story_sequence and static_story
-- ⚠️  DO NOT run automatically — apply manually in Supabase SQL Editor.

-- Drop the existing format constraint (only allowed 'carousel' and 'static')
ALTER TABLE posts DROP CONSTRAINT posts_format_check;

-- Re-add with all four supported visual format values
ALTER TABLE posts
  ADD CONSTRAINT posts_format_check
  CHECK (format IN ('carousel', 'static', 'story_sequence', 'static_story'));

-- Update default from 'static' to 'carousel' to match the UI default
ALTER TABLE posts ALTER COLUMN format SET DEFAULT 'carousel';
