-- Add email_frequency column to events table
-- This column controls how often producers receive email notifications about their events
-- Values: 'daily', 'weekly', 'monthly', or NULL (no notifications)
ALTER TABLE events
ADD COLUMN email_frequency TEXT CHECK (email_frequency IN ('daily', 'weekly', 'monthly'));

-- Create index for efficient querying of events with notifications enabled
CREATE INDEX idx_events_email_frequency ON events(email_frequency) WHERE email_frequency IS NOT NULL;

-- Query to remove the column if needed:
-- ALTER TABLE events DROP COLUMN email_frequency;
-- DROP INDEX IF EXISTS idx_events_email_frequency;
