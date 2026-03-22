
DROP VIEW IF EXISTS public.event_availability;
CREATE VIEW public.event_availability WITH (security_invoker = true) AS
SELECT
  e.id AS event_id,
  COALESCE(
    (SELECT SUM((s->>'slots')::int)
     FROM jsonb_array_elements(e.sections_config) s),
    0
  )::int AS total_slots,
  COALESCE(
    (SELECT COUNT(*)
     FROM public.bookings b
     WHERE b.event_id = e.id AND b.cancelled_at IS NULL),
    0
  )::int AS booked_count
FROM public.events e
WHERE e.status = 'published';
