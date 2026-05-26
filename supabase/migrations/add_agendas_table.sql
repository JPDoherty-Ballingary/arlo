-- Create agendas table
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

ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agendas" ON agendas
  FOR ALL USING (auth.uid() = owner_id);

-- Add done_at to tasks to track when each task was completed
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ;
