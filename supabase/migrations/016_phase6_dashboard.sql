-- =============================================================================
-- Phase 6 — Dashboard Task Enhancements
--
-- Adds priority, due_date, estimated_minutes, task_type, and description
-- to client_tasks and agency_tasks.
--
-- Uses ALTER TABLE ADD COLUMN IF NOT EXISTS — safe to run on live tables.
-- RLS policies are untouched.
--
-- Run in Supabase SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTEND client_tasks
-- ---------------------------------------------------------------------------

ALTER TABLE client_tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low'));

ALTER TABLE client_tasks
  ADD COLUMN IF NOT EXISTS due_date date;

ALTER TABLE client_tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes integer;

ALTER TABLE client_tasks
  ADD COLUMN IF NOT EXISTS task_type text
    CHECK (task_type IN ('content', 'admin', 'tech', 'ads', 'seo', 'planning'));

ALTER TABLE client_tasks
  ADD COLUMN IF NOT EXISTS description text;

-- ---------------------------------------------------------------------------
-- 2. EXTEND agency_tasks
-- ---------------------------------------------------------------------------

ALTER TABLE agency_tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low'));

ALTER TABLE agency_tasks
  ADD COLUMN IF NOT EXISTS due_date date;

ALTER TABLE agency_tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes integer;

ALTER TABLE agency_tasks
  ADD COLUMN IF NOT EXISTS task_type text
    CHECK (task_type IN ('content', 'admin', 'tech', 'ads', 'seo', 'planning'));

ALTER TABLE agency_tasks
  ADD COLUMN IF NOT EXISTS description text;
