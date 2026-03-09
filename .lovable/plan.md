## Bug: Cancellation Silently Fails Due to RLS

### Root Cause

The `CancelBooking.tsx` page runs this update as an **unauthenticated guest**:

```ts
supabase.from('bookings').update({ cancelled_at: ... }).eq('id', booking.id)
```

The only UPDATE RLS policy on `bookings` is **"Producers can update bookings for own events"** — which requires `auth.uid() = producer_id`. Guests aren't authenticated as the producer, so Supabase returns **no error but updates 0 rows**. The code doesn't check affected row count, shows "Booking cancelled" toast, and reloads — but nothing actually changed in the database.

The realtime subscription on the ProducerPage is working correctly; there's simply no change to pick up.

### Fix

**Create a `cancel-booking` edge function** that uses the service role key to bypass RLS, validates the cancel token server-side, and performs the update atomically.

#### 1. Create `supabase/functions/cancel-booking/index.ts`

- Accept `{ cancelToken }` in the request body
- Use service role key to query the booking by `cancel_token`
- If not found or already cancelled, return appropriate error codes (`not_found`, `already_cancelled`)
- SET `cancelled_at = now()` on the matching booking
- Return `{ success: true }`
- Standard CORS headers, `verify_jwt = false`

#### 2. Update `supabase/config.toml`

Add `[functions.cancel-booking]` with `verify_jwt = false`.

#### 3. Update `src/pages/CancelBooking.tsx`

Replace the direct Supabase `.update()` call (lines 134-138) with a call to `supabase.functions.invoke('cancel-booking', { body: { cancelToken: token } })`. Handle response codes:

- `success: true` → show toast, reload
- `already_cancelled` → show "Already cancelled" message
- `not_found` → show error
- Any other failure → show retry message

#### 4. Send cancellation email from edge function (optional but recommended)

Move the `sendCancellationEmail` call into the edge function so it happens server-side (same pattern as `create-booking`). This keeps email sending atomic with the cancellation. If not done now, the existing client-side email call still works since it's non-blocking.

### Files

1. **Create** `supabase/functions/cancel-booking/index.ts`
2. **Edit** `supabase/config.toml`
3. **Edit** `src/pages/CancelBooking.tsx`

This update is quite delicate and requires utmost precision. Carefully examine all dependencies and potential impacts before implementing any changes, and test systematically to guarantee nothing is disrupted. Steer clear of shortcuts or assumptions—take a moment to seek clarification if you're unsure. Precision is crucial.