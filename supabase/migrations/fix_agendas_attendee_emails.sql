-- Create agendas table if it doesn't exist
CREATE TABLE IF NOT EXISTS agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  attendee_emails TEXT[] NOT NULL DEFAULT '{}',
  content JSONB NOT NULL,
  sent_at TIMESTAMPTZ,
  sent_to TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add attendee_emails if the table exists but the column is missing
ALTER TABLE agendas ADD COLUMN IF NOT EXISTS attendee_emails TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agendas' AND policyname = 'Users can manage their own agendas'
  ) THEN
    CREATE POLICY "Users can manage their own agendas" ON agendas
      FOR ALL USING (auth.uid() = owner_id);
  END IF;
END
$$;

-- Add done_at to tasks if missing
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ;
