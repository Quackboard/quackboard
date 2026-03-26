

## Plan: Remove "Schedule for Later" (publish_at) from Producer Flow

### Summary
Remove the publish scheduling UI and logic from CreateMic, EditMic, and BulkCreateMic. Producers will only have Draft (save for later) and Published (live immediately). The `publish_at` column stays in the DB untouched -- existing mics with `publish_at` set continue working. We just stop writing new values.

### Files to Change

**1. `src/pages/CreateMic.tsx`**
- Remove `publishOption`, `publishAt`, `publishAtTime` from the Zod schema and form defaults
- Remove the 3 `.refine()` blocks that validate publish scheduling
- Remove `watchPublishOption` 
- In `onSubmit`: remove `publish_at` computation block; always pass `publish_at: null`
- In email logic: remove the `publishOption === 'later'` branch; when `status === 'published'`, always send email immediately
- Remove the entire "When should this mic go live?" radio group + calendar/time UI (~lines 747-798)

**2. `src/pages/EditMic.tsx`**
- Remove `publishOption`, `publishAt`, `publishAtTime` from the Zod schema and form defaults
- Remove `originalPublishAt` state and its usage
- In `useEffect` initialization: remove the `publish_at` parsing block (lines 234-243); remove `publishOption`/`publishAt`/`publishAtTime` from `reset()` call
- Remove `watchPublishOption`
- In `validateScheduling`: remove the publish_at validation block (lines 361-373)
- In `onSubmit`: remove `publish_at` computation; always pass `publish_at: null` in the update
- In email logic: remove all `publishOption === 'later'` branches and the `publishAtChanged` rescheduling block (lines 475-520); when publishing, always send email immediately
- Remove the "When should this mic go live?" UI section (~lines 1027-1078)

**3. `src/components/producer/BulkCreateMic.tsx`**
- Remove `publishOption`, `publishAt`, `publishAtTime` from the Zod schema, form defaults, and refinements
- Remove `watchPublishOption`
- In `handleCreateEvents`: remove `publish_at` computation; always pass `publish_at: null`; status is always `'published'` (or keep draft logic if desired -- the button labels already handle draft vs published)
- Remove the "When should these mics go live?" radio group + calendar/time UI

**4. `src/components/dashboard/CalendarDashboard.tsx`**
- In `getEventStatus`: remove the "Coming Live" status check (lines 87-89). Published events that aren't past are simply "Live".

### What stays unchanged
- `publish_at` column in the database -- no migration needed
- Existing events with `publish_at` set -- they keep their stored value; dashboard just won't show "Coming Live" anymore (those events display as "Live")
- All `signup_opens_at` logic -- completely untouched
- RLS policies, booking flows, producer pages -- no changes
- Edge functions -- no changes needed (they don't reference publish_at in scheduling logic)

### Risk assessment
- **Existing mics with publish_at set**: These already have `status = 'published'` or `'draft'`. Since we stop writing `publish_at`, no existing data breaks. The "Coming Live" display label goes away, but those events were already published.
- **signup_opens_at**: Entirely independent of publish_at. No impact.
- **Scheduled messages tied to publish_at**: Any pending scheduled messages in `scheduled_messages` table will remain but won't cause harm. They'd fire when their `send_at` arrives -- this is benign.

