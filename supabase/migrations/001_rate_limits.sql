-- =============================================================================
-- Rate Limits Table + Atomic Check Function
-- OWASP A04:2021 — Insecure Design (rate limiting countermeasure)
--
-- Run this in Supabase SQL Editor once before starting the application.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT        PRIMARY KEY,
  count        INTEGER     NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS with NO policies → anon/authenticated roles have zero access.
-- Only the service role key (adminClient) can read/write this table.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Index to speed up the periodic cleanup query.
CREATE INDEX IF NOT EXISTS rate_limits_updated_at_idx ON rate_limits(updated_at);

-- ---------------------------------------------------------------------------
-- Atomic check-and-increment function
--
-- Algorithm: fixed-window counter. Each key tracks a start timestamp;
-- when clock_timestamp() exceeds window_start + window_seconds the counter
-- resets to 1 atomically inside the UPSERT, so there is no separate
-- "has the window expired?" query that could race.
--
-- Returns one row:
--   allowed       BOOLEAN     true if count ≤ max after increment
--   current_count INTEGER     the count after increment
--   window_start  TIMESTAMPTZ start of the current window
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_key            TEXT,
  p_max_count      INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE(
  allowed       BOOLEAN,
  current_count INTEGER,
  window_start  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as the function owner, bypassing caller's RLS
SET search_path = public
AS $$
DECLARE
  v_now           TIMESTAMPTZ := clock_timestamp();
  v_window_cutoff TIMESTAMPTZ := v_now - (p_window_seconds * INTERVAL '1 second');
  v_count         INTEGER;
  v_win_start     TIMESTAMPTZ;
BEGIN
  INSERT INTO rate_limits (key, count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      -- Window has expired: reset to 1
      WHEN rate_limits.window_start <= v_window_cutoff THEN 1
      -- Same window: increment
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start <= v_window_cutoff THEN v_now
      ELSE rate_limits.window_start
    END,
    updated_at = v_now
  RETURNING rate_limits.count, rate_limits.window_start
  INTO v_count, v_win_start;

  RETURN QUERY
  SELECT
    (v_count <= p_max_count) AS allowed,
    v_count                  AS current_count,
    v_win_start              AS window_start;
END;
$$;

-- ---------------------------------------------------------------------------
-- Maintenance: delete stale rows older than 1 hour.
-- Call periodically via Supabase cron (pg_cron) or manually:
--   SELECT cleanup_rate_limits();
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits WHERE updated_at < now() - INTERVAL '1 hour';
END;
$$;
