CREATE TABLE IF NOT EXISTS recipient_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL,
  recipient_id UUID      NOT NULL,
  owner_id   UUID        NOT NULL,
  token      TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recipient_sessions_token_idx ON recipient_sessions (token);
CREATE INDEX IF NOT EXISTS recipient_sessions_email_idx ON recipient_sessions (email);
