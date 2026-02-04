-- Add email_frequency column to events table
ALTER TABLE events
ADD COLUMN email_frequency TEXT CHECK (email_frequency IN ('daily', 'weekly', 'monthly'));

-- Create index for efficient querying
CREATE INDEX idx_events_email_frequency ON events(email_frequency) WHERE email_frequency IS NOT NULL;