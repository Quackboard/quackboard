

## Plan: Fix email cancellation button not working

### Root Cause

The `cancel-booking` edge function has **zero logs**, meaning it is not being invoked at all. This strongly suggests the function is not deployed (or was un-deployed at some point). The code in `supabase/functions/cancel-booking/index.ts` and the config in `supabase/config.toml` both look correct — the function just needs to be redeployed.

The database confirms the issue: booking `6efa3568` has `cancelled_at: null` despite the user attempting cancellation via the email link.

### Fix

**Step 1: Redeploy the `cancel-booking` edge function**

The function code is correct — it already:
- Validates the `cancelToken`
- Sets `cancelled_at` via service role (bypassing RLS)
- Triggers the cancellation email
- Returns `{ success: true }`

No code changes are needed. The function just needs to be redeployed so it's live on Supabase.

**Step 2: Add a defensive `refetchInterval` to the producer pages**

As a belt-and-suspenders measure, add `refetchInterval: 10000` (10 seconds) to the bookings query in both `AccountPage.tsx` and `ProducerPage.tsx`. This ensures that even if a Supabase Realtime event is missed after an email-based cancellation, the UI will self-correct within 10 seconds.

### What is NOT touched
- CancelBooking.tsx (the `/cancel/:token` page) — works correctly
- cancel-booking edge function code — already correct
- cancel-booking-by-email (in-app cancellation) — already working
- Email templates, signup flow, booking flow

### Technical Details

| File | Change |
|------|--------|
| `supabase/functions/cancel-booking/index.ts` | Redeploy only (no code change) |
| `src/pages/AccountPage.tsx` | Add `refetchInterval: 10000` to bookings query |
| `src/pages/ProducerPage.tsx` | Add `refetchInterval: 10000` to bookings query |

