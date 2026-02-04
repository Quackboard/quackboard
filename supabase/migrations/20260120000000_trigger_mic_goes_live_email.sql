-- Simplified migration: Email sending is now handled in EventRow.tsx
-- when it detects events have gone live (publish_at <= NOW())
-- 
-- This migration cleans up old complex trigger logic.
-- The actual email sending is triggered from EventRow component
-- using the same logic that determines if an event shows "Live" status.

-- Drop any existing triggers related to mic goes live emails
DROP TRIGGER IF EXISTS send_mic_goes_live_email_trigger ON events;
DROP TRIGGER IF EXISTS process_scheduled_message_trigger ON scheduled_messages;

-- Drop any existing functions (they're no longer needed)
DROP FUNCTION IF EXISTS trigger_send_mic_goes_live_email();
DROP FUNCTION IF EXISTS trigger_process_scheduled_message();
DROP FUNCTION IF EXISTS call_send_mic_goes_live_email(UUID, UUID);
DROP FUNCTION IF EXISTS process_pending_mic_goes_live_emails();

-- Note: The email sending logic is now handled in:
-- 1. EventRow.tsx - detects when event status changes to "Live" and sends email
-- 2. send-mic-goes-live-email edge function - sends the actual email via Zeptomail
-- 
-- This approach is simpler and more reliable because:
-- - Uses the same logic as the UI to determine if an event is "Live"
-- - No complex database triggers needed
-- - Email is sent when EventRow renders and detects live status
