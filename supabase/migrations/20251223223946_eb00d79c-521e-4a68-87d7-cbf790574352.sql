-- Drop the existing foreign key constraint and recreate with ON DELETE CASCADE
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_event_id_fkey;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES public.events(id) 
ON DELETE CASCADE;