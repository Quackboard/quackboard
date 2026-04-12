CREATE OR REPLACE FUNCTION public.get_discoverable_producers(producer_ids uuid[])
RETURNS TABLE(user_id uuid, slug text, account_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT au.user_id, a.slug, a.account_name
  FROM accounts_users au
  JOIN accounts a ON a.id = au.account_id
  WHERE au.user_id = ANY(producer_ids)
    AND a.discoverable = true;
$$;