## What this does

Reassigns two future No Bad Mics events from the redundant template `380419f4` to the keeper template `523ea87a`, and updates their `signup_opens_at` so all this week's mics open for sign-ups at the same time (Saturday 5/02 @ 8:00 AM PT).

## Affected events

| Event ID | Date / Time | Current template | New template | New signup_opens_at |
|---|---|---|---|---|
| `a22ec6fa-2663-4320-9f5b-2d754dab412e` | Tue 2026-05-05 @ 7:30 PM | `380419f4` | `523ea87a` | 2026-05-02 15:00 UTC |
| `47fed86c-bcae-483c-a89d-02a65bf9096e` | Wed 2026-05-06 @ 7:30 PM | `380419f4` | `523ea87a` | 2026-05-02 15:00 UTC |

Both events have **zero bookings** and identical metadata to the keeper template's events (title, venue, sections, producer message). Only `template_id` and `signup_opens_at` change.

## SQL

```sql
UPDATE public.events
SET template_id = '523ea87a-e7e9-4e67-bc60-94e8ac99b9a4',
    signup_opens_at = '2026-05-02 15:00:00+00'
WHERE id IN (
  'a22ec6fa-2663-4320-9f5b-2d754dab412e',
  '47fed86c-bcae-483c-a89d-02a65bf9096e'
)
AND template_id = '380419f4-35ee-4d34-b295-7ece03d5e6b8';
```

## Out of scope

No code changes, no other events touched, no edge function or RLS changes, no emails sent. Step 3 (deactivating redundant templates) and step 4 (verification) will be handled in follow-up requests.
