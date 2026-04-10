-- Migration 014: Direct visual generation mode support
-- Stores per-slide HTML separately for inline editing, and tracks which generation pipeline produced the visual

ALTER TABLE post_visuals ADD COLUMN IF NOT EXISTS slide_html jsonb;
ALTER TABLE post_visuals ADD COLUMN IF NOT EXISTS generation_mode text NOT NULL DEFAULT 'template';

COMMENT ON COLUMN post_visuals.slide_html IS 'Array of per-slide objects with inner_html, background, has_arrow, logo_placement, photo_slots — used by direct generation mode for inline editing';
COMMENT ON COLUMN post_visuals.generation_mode IS 'Which pipeline produced this visual: template (JSON→layout registry) or direct (Claude generates HTML)';
