DO $$
DECLARE
  cutoff text;
BEGIN
  cutoff := to_char((now() + interval '5 minutes'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  
  INSERT INTO public.events (
    producer_id, title, date, start_time, end_time,
    venue_name, venue_address, status,
    sections_config, type
  ) VALUES (
    '80ee8e6c-f25e-48bb-8473-c06ea43c092e',
    'Wildcard Test Mic',
    '2026-03-16',
    '21:00', '23:00',
    'The Comedy Club', '123 Main Street',
    'published',
    jsonb_build_array(
      jsonb_build_object('label', 'Open Mic', 'slots', 4),
      jsonb_build_object('label', 'Wildcards', 'slots', 2, 'type', 'wildcard', 'signup_opens_at', cutoff)
    ),
    'managed_mic'
  );
END $$;