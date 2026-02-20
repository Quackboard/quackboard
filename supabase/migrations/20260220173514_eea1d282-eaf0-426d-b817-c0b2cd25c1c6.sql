
-- Create producer_features table for manual feature gating
CREATE TABLE public.producer_features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id uuid NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  feature text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (producer_id, feature)
);

-- Enable RLS
ALTER TABLE public.producer_features ENABLE ROW LEVEL SECURITY;

-- Producers can only read their own features
CREATE POLICY "Producers can view own features"
  ON public.producer_features
  FOR SELECT
  USING (auth.uid() = producer_id);
