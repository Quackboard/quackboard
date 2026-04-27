SELECT cron.schedule(
  'regenerate-recurring-events-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dkbahxjibpobbefqufqa.supabase.co/functions/v1/regenerate-recurring-events',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrYmFoeGppYnBvYmJlZnF1ZnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNDAwOTQsImV4cCI6MjA4MDkxNjA5NH0.a72D5JIqVcreWG9K6HwNbKTfC5V1ItlOS0OkFkAhpfc"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);