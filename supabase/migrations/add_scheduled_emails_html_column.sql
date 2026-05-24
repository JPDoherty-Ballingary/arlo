-- Patch scheduled_emails to add all columns the application expects.
-- Safe to re-run — IF NOT EXISTS means existing columns are left untouched.
ALTER TABLE scheduled_emails
  ADD COLUMN IF NOT EXISTS owner_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_id UUID        REFERENCES recipients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS to_email     TEXT,
  ADD COLUMN IF NOT EXISTS reply_to     TEXT,
  ADD COLUMN IF NOT EXISTS subject      TEXT,
  ADD COLUMN IF NOT EXISTS html         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS send_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();
