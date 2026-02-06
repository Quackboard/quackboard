-- Create a table to store beta access codes
CREATE TABLE public.beta_access_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    description text,
    max_uses integer DEFAULT NULL, -- NULL means unlimited
    current_uses integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.beta_access_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to check if a code is valid (read-only, no sensitive data exposed)
CREATE POLICY "Anyone can validate codes"
ON public.beta_access_codes
FOR SELECT
USING (is_active = true);

-- Create function to validate and use a beta code
CREATE OR REPLACE FUNCTION public.validate_beta_code(code_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code_record record;
BEGIN
    -- Find the code
    SELECT * INTO code_record
    FROM public.beta_access_codes
    WHERE code = UPPER(TRIM(code_input))
      AND is_active = true;
    
    -- Code not found or inactive
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if expired
    IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
        RETURN false;
    END IF;
    
    -- Check if max uses reached
    IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
        RETURN false;
    END IF;
    
    -- Increment usage count
    UPDATE public.beta_access_codes
    SET current_uses = current_uses + 1
    WHERE id = code_record.id;
    
    RETURN true;
END;
$$;

-- Insert a default beta code for testing
INSERT INTO public.beta_access_codes (code, description, is_active)
VALUES ('QUACKBETA', 'Default beta access code', true);