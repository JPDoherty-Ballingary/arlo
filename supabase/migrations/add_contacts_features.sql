-- Run this in the Supabase SQL editor before deploying the contacts feature.

-- Extend recipients table with intro email tracking and notes
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS intro_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS intro_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intro_email_scheduled_at TIMESTAMPTZ;

-- Scheduled emails table (for "schedule send" on intro emails)
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id      UUID        REFERENCES recipients(id) ON DELETE SET NULL,
  to_email          TEXT        NOT NULL,
  reply_to          TEXT,
  subject           TEXT        NOT NULL,
  html              TEXT        NOT NULL,
  send_at           TIMESTAMPTZ NOT NULL,
  sent              BOOLEAN     NOT NULL DEFAULT FALSE,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scheduled_emails_due_idx
  ON scheduled_emails(send_at)
  WHERE sent = FALSE;
