-- Patch scheduled_emails table to add columns missing from the initial migration.
-- Run this in the Supabase SQL editor.
ALTER TABLE scheduled_emails
  ADD COLUMN IF NOT EXISTS reply_to   TEXT,
  ADD COLUMN IF NOT EXISTS html       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sent_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
