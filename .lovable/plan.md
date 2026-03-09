

## Launch Readiness Checklist

### CRITICAL: Race Condition on Slot Booking

The bookings table has a unique index on `(event_id, slot_position, cancelled_at)`. In PostgreSQL, **NULL values are treated as distinct** in unique indexes. Since active bookings have `cancelled_at = NULL`, **two people can book the same slot simultaneously** and the database will accept both.

The SignUpModal does a SELECT-then-INSERT (check if slot is taken, then insert). Under load with multiple people racing for the same spot, two requests can both pass the SELECT check and both INSERT successfully.

**Fix required before launch**: Add a partial unique index that only covers active (non-cancelled) bookings:

```sql
CREATE UNIQUE INDEX bookings_unique_active_slot 
ON bookings (event_id, slot_position) 
WHERE cancelled_at IS NULL;
```

This guarantees at the database level that only one active booking can exist per slot, regardless of timing. The existing `23505` error handling in SignUpModal will then correctly catch the race.

---

### 3-Device Load Test Plan

With 3 devices (phone, tablet, laptop), here is a focused test script:

**Setup**: Create a test event with signup_opens_at set ~2 minutes in the future, with 5-6 slots.

**Test 1 -- Simultaneous Slot Grab (Race Condition)**
1. Open the producer page on all 3 devices
2. Wait for signup to open (verify countdown works on all 3)
3. All 3 devices tap "Grab Spot" on **the same slot** within 1-2 seconds
4. Expected: Exactly 1 succeeds, 2 get "Spot already taken" error
5. Verify the lineup shows only 1 name in that slot

**Test 2 -- Realtime Updates**
1. Device A grabs Slot 1
2. Devices B and C should see the name appear in Slot 1 within a few seconds (realtime subscription)
3. Verify the "Grab Spot" button disappears on B and C for that slot

**Test 3 -- Confirmation Email**
1. Use a real email for one booking
2. Verify the confirmation email arrives with the new teal branding
3. Verify the cancel link works

**Test 4 -- Signup Opens Timer**
1. Set signup_opens_at to 2 minutes out
2. Open all 3 devices -- verify countdown appears
3. Wait for it to hit 0 -- verify slots become available on all devices without refresh
4. One device should be backgrounded (screen off) then brought back -- verify it catches up

**Test 5 -- Duplicate Email Block**
1. If allow_multiple_slots is OFF, have Device A book Slot 2 with email@test.com
2. Device B tries to book Slot 3 with the same email
3. Expected: "One spot per comic" error

---

### General Launch Checklist

| Category | Item | Status |
|----------|------|--------|
| **Database** | Add partial unique index for race condition fix | Must do |
| **Database** | Verify RLS policies allow anonymous inserts to bookings | Already done |
| **Edge Functions** | Verify send-booking-email is deployed | Check dashboard |
| **Edge Functions** | Verify Zeptomail secrets are set (ZEPTOMAIL_API_TOKEN, FROM_EMAIL, FROM_NAME, FRONTEND_URL) | Check dashboard |
| **DNS/URL** | Confirm published URL works: quackboard1.lovable.app | Test |
| **Producer Setup** | Producer has slug set, profile complete | Verify |
| **Event Setup** | Event is published, signup_opens_at is correct timezone | Verify |
| **Mobile** | Test the collapsible event card on phone | 3-device test |
| **Cancellation** | Test cancel link from email works | Email test |
| **Embed** | If using embed widget, test it loads on external site | If applicable |

### Implementation Summary

One database migration is needed (the partial unique index). Everything else is verification/testing. The index is non-destructive -- it only prevents future duplicate active bookings, and won't fail if no duplicates currently exist.

