-- Digest mode: instead of the usual per-task, frequency-based nags, a
-- recipient in digest mode gets one email a day listing everything
-- outstanding for them under that owner.
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS digest_mode BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ;
