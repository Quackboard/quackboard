CREATE TABLE public.mic_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mic_name text NOT NULL,
  venue_name text,
  city text,
  next_occurrence date,
  start_time time without time zone,
  end_time time without time zone,
  recurrence text,
  details text,
  submitter_name text NOT NULL,
  submitter_email text NOT NULL,
  external_link text,
  instagram_url text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mic_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit mics"
  ON public.mic_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);