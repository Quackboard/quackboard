## Browse Cards: Signup Status + Deep Links

### Files changed: 2

**Do not make any changes or do any work on the the account page.** 

1. `src/pages/DiscoverMics.tsx**` (the `/browse` page)

- Add `signup_opens_at` to the existing events `.select()` call
- Import `getSignupStatus` from `src/lib/signup-status.ts`
- For each platform mic card:
  - **Signups open + spots available**: Green badge (unchanged) + "Grab a Spot" links to `/{slug}?date={event.date}`
  - **Signups not open yet**: Amber/gray badge with status label (e.g. "Opens in 3h" or "Sign-ups open Monday 4/14/2026 at 7:00pm") + "View Page" link to `/{slug}?date={event.date}`
  - **Full (0 spots)**: "Full" badge, no CTA, card still links to `/{slug}?date={event.date}`

### What is NOT touched

- ProducerPage.tsx -- not changed
- EventCard, SignUpModal, SpotList -- not changed
- Booking edge functions -- not changed
- Database / RLS / migrations -- none needed
- `signup_opens_at` already exists on the events table

### Do not touch anything on AccountPage or ProducerPage. Do not touch any file or edge function besides pages/discovermics.tsx.  Do not touch anything relating to booking, cancellation, or signup flow is modified.