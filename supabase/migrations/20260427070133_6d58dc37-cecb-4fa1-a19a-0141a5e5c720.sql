
UPDATE public.bookings
SET event_id = '8d028aeb-4fe5-49ae-a062-584f49b783ff'
WHERE id = '68c7000c-0735-48bc-b320-977d7d6b076a'
  AND event_id = '18286a61-5f61-4868-8a87-95e338178196'
  AND cancelled_at IS NULL;
