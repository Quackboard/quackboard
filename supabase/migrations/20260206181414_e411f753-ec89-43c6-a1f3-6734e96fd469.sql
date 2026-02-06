-- Drop the existing foreign key constraint and recreate with CASCADE
ALTER TABLE public.message_logs 
DROP CONSTRAINT IF EXISTS message_logs_host_id_fkey;

ALTER TABLE public.message_logs 
DROP CONSTRAINT IF EXISTS message_logs_producer_id_fkey;

-- Add the foreign key with ON DELETE CASCADE
ALTER TABLE public.message_logs
ADD CONSTRAINT message_logs_producer_id_fkey 
FOREIGN KEY (producer_id) 
REFERENCES public.producers(id) 
ON DELETE CASCADE;