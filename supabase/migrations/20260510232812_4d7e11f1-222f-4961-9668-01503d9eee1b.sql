
ALTER TABLE public.event_templates
  ADD COLUMN IF NOT EXISTS account_id uuid;

UPDATE public.event_templates t
SET account_id = au.account_id
FROM public.accounts_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.producer_id
  AND au.role = 'owner';

CREATE INDEX IF NOT EXISTS event_templates_account_id_idx
  ON public.event_templates(account_id);

CREATE POLICY "Admin can view all accounts"
  ON public.accounts FOR SELECT
  USING ((auth.jwt() ->> 'email') = 'sarah@quackboard.com');

CREATE POLICY "Admin can view all events"
  ON public.events FOR SELECT
  USING ((auth.jwt() ->> 'email') = 'sarah@quackboard.com');

CREATE POLICY "Admin can view all templates"
  ON public.event_templates FOR SELECT
  USING ((auth.jwt() ->> 'email') = 'sarah@quackboard.com');
