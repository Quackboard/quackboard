

## Wildcard Feature Access Control (Manual Approval)

### Overview
Gate the wildcard section feature so only manually approved producers can use it. You (the admin) will grant access by adding a row in the Supabase dashboard.

### Data Model

**New table: `producer_features`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| producer_id | uuid | References producers(id), not null |
| feature | text | e.g. `'wildcard'` |
| granted_at | timestamptz | Default `now()` |
| **unique** | | `(producer_id, feature)` |

RLS policies:
- SELECT: producers can view their own features (`auth.uid() = producer_id`)
- No INSERT/UPDATE/DELETE from client -- you manage this table directly via SQL Editor

To grant a producer wildcard access, run in the SQL Editor:
```text
INSERT INTO producer_features (producer_id, feature)
VALUES ('<producer-uuid>', 'wildcard');
```

### Frontend Changes

**New hook: `src/hooks/useProducerFeatures.ts`**
- Query `producer_features` for the current user
- Export a `hasFeature(name)` helper
- Cache for 5 minutes (same pattern as `useProducerSlug`)

**`src/pages/CreateMic.tsx` and `src/pages/EditMic.tsx`**
- Import `useProducerFeatures`
- Only show the "Wildcard" toggle in the section builder if `hasFeature('wildcard')` is true
- If the producer does not have the feature, wildcard UI is simply not rendered -- no error, no disabled state

**`src/components/producer/SpotList.tsx`**
- No gating needed here -- if a wildcard section exists in `sections_config`, it renders. The gate is at the creation/edit step only.

### How to Grant Access
1. Go to the Supabase SQL Editor
2. Run: `INSERT INTO producer_features (producer_id, feature) VALUES ('<uuid>', 'wildcard');`
3. The producer will see the Wildcard toggle next time they create or edit an event

### What This Does NOT Change
- All existing wildcard rendering logic (SpotList, EventCard, EventLineup) works regardless -- it just reads `sections_config`
- No changes to the public-facing producer page
- No changes to booking flow

