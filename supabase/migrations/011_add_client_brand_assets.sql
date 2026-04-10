-- Add brand asset fields to clients table
-- logo_url: Supabase storage path to the client's logo
-- instagram_handle: for IG frame header in visual engine

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS instagram_handle text;
