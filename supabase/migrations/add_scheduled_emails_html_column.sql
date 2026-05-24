-- Add missing html column to scheduled_emails table.
-- Run this in the Supabase SQL editor if the column is absent.
ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS html TEXT NOT NULL DEFAULT '';
