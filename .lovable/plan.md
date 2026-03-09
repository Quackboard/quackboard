

## Atomic Server-Side Booking — Implementation Plan

### Problem
The client currently performs INSERT → fetch event → send email as separate steps. Under race conditions, the wrong client's data can reach the email function. The booking and email must be atomic: either both succeed, or the user is told they didn't get the spot.

### Changes

#### 1. Create `supabase/functions/create-booking/index.ts`

New edge function that handles the entire booking flow server-side:

1. Accept: `eventId`, `slotPosition`, `guestName`, `guestEmail`, `guestInstagram`, `allowMultipleSpots`, `isManualAdd`
2. Use service role key (bypasses RLS)
3. If `!allowMultipleSpots`: query bookings for same `guest_email` + `event_id` with no `cancelled_at` → return `{ success: false, code: 'duplicate_email' }`
4. Generate `cancel_token`, INSERT booking → if `23505` unique violation, return `{ success: false, code: 'slot_taken' }`
5. Fetch event + producer data from DB (canonical source of truth)
6. Derive `sectionLabel` from `sections_config` + `slot_position` (same logic as `CancelBooking.tsx` line 37-52)
7. Build guest + producer email HTML (copied from existing `send-booking-email`)
8. Send guest email via Zeptomail with 2 retries + backoff
9. Send producer email if `email_frequency === 'immediate'`
10. If guest email fails after all retries: DELETE the booking, return `{ success: false, code: 'booking_failed' }`
11. Log to `message_logs`
12. Return `{ success: true, bookingId, slotPosition }`

#### 2. Update `supabase/config.toml`

Add `[functions.create-booking]` with `verify_jwt = false` (public sign-up, no auth required).

#### 3. Update `src/lib/email.ts`

Add `createBooking()` function that calls the new edge function via `supabase.functions.invoke('create-booking', { body })`. Uses existing `invokeWithRetry`. Returns `{ success, code?, bookingId? }`.

Keep `sendCancellationEmail` and `sendBookingConfirmationEmail` unchanged (still used by `CancelBooking.tsx`).

#### 4. Simplify `src/components/producer/SignUpModal.tsx`

Replace the multi-step `handleSubmit` (SELECT check → INSERT → fetch event → send email) with a single `createBooking()` call. Handle responses:
- `success: true` → "You're in!" toast, close modal, `onSuccess()`
- `code: 'slot_taken'` → "Spot already taken" toast
- `code: 'duplicate_email'` → "One spot per comic" toast
- `code: 'booking_failed'` → "Oops, that one's on us. Try again!" toast
- Any other failure → "Oops, that one's on us. Try again!" toast

#### 5. Simplify `src/components/lineup/AddToSlotModal.tsx`

Same simplification as SignUpModal but with `isManualAdd: true`. Same error code handling (except `duplicate_email` is not applicable since producers can add anyone). Infrastructure failure message: "Oops, that one's on us. Try again!"

#### 6. No changes to `CancelBooking.tsx`

Cancellation continues to use `send-booking-email` with `isCancellation: true`. No race condition concern — only the booking holder can cancel.

### UX Outcomes
- Happy path: "Grab Spot" → spinner → "You're in!"
- Spot taken: "Grab Spot" → spinner → "Spot already taken"
- Duplicate email: "Grab Spot" → spinner → "One spot per comic"
- Infrastructure failure: "Grab Spot" → spinner → "Oops, that one's on us. Try again!" (booking rolled back, slot free for retry)
- No email error messages visible to users, ever

### Files
1. **Create** `supabase/functions/create-booking/index.ts`
2. **Edit** `supabase/config.toml` — add function config
3. **Edit** `src/lib/email.ts` — add `createBooking()`
4. **Edit** `src/components/producer/SignUpModal.tsx` — use `createBooking()`
5. **Edit** `src/components/lineup/AddToSlotModal.tsx` — use `createBooking()`
6. **Deploy** `create-booking` edge function

