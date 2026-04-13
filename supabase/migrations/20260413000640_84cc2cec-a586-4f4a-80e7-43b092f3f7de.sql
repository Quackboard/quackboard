ALTER TABLE events ADD COLUMN account_id uuid;

UPDATE events e
SET account_id = au.account_id
FROM accounts_users au
WHERE au.user_id = e.producer_id;