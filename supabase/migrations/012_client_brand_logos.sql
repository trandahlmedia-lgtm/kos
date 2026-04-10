-- Replace single logo_url with structured brand_logos JSONB
-- Supports multiple logo variants: icon, wordmark_dark, wordmark_light, full
-- Values are Supabase storage paths (NOT signed URLs)

-- 1. Add brand_logos column
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS brand_logos jsonb;

-- 2. Migrate existing logo_url data into brand_logos.full (if any exist)
UPDATE clients
  SET brand_logos = jsonb_build_object('full', logo_url)
  WHERE logo_url IS NOT NULL;

-- 3. Drop the old column
ALTER TABLE clients
  DROP COLUMN IF EXISTS logo_url;
