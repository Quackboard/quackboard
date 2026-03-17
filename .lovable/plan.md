## Launch Readiness Checklist

This checklist covers the full booking flow after the **Atomic Server-Side Booking** refactor. The `create-booking` edge function now handles INSERT + email as one atomic operation.

---

### 1. Edge Function: `create-booking` ✅ Automated Tests

Run via Supabase test tool (`supabase/functions/create-booking/index.test.ts`):

- [ ] **Invalid request** — missing fields returns `{ success: false, code: "invalid_request" }` (400)
- [ ] **Happy path** — valid booking returns `{ success: true, bookingId, slotPosition }` (200)
- [ ] **Slot taken** — duplicate `(event_id, slot_position)` returns `{ success: false, code: "slot_taken" }`
- [ ] **Duplicate email** — same email + event with `allowMultipleSpots: false` returns `{ success: false, code: "duplicate_email" }`
- [ ] **CORS preflight** — `OPTIONS` returns 204 with `access-control-allow-origin: *`

---

### 2. Email Delivery (Manual / Logs Verification)

- [ ] Guest receives booking confirmation email after successful sign-up
- [ ] Guest email includes correct: event title, date, time, venue, section label, spot number
- [ ] Guest email has working "Cancel Your Booking" link
- [ ] Guest email has working "Go to Event Page" link
- [ ] Producer receives immediate notification email (if `email_frequency = 'immediate'`)
- [ ] Producer email includes guest name, email, section, and spot number
- [ ] `message_logs` table records both guest and producer email attempts
- [ ] If guest email fails → booking is rolled back, slot remains free
- [ ] If producer email fails → booking is kept, guest email was already sent

---

### 3. Client-Side: SignUpModal (Public Sign-Up)

- [ ] "Grab Spot" button calls `create-booking` edge function (not direct INSERT)
- [ ] Success → "You're in!" toast, modal closes, spot list refreshes
- [ ] Slot taken → "Spot already taken — try another" toast
- [ ] Duplicate email → "One spot per comic" toast
- [ ] Infrastructure failure → "Oops, that one's on us. Try again!" toast
- [ ] Loading spinner shows during submission, button disabled
- [ ] No email-related error messages visible to the user

---

### 4. Client-Side: AddToSlotModal (Producer Manual Add)

- [ ] "Add" button calls `create-booking` with `isManualAdd: true`
- [ ] Success → success toast, modal closes, lineup refreshes
- [ ] Slot taken → "Spot already taken" toast
- [ ] Infrastructure failure → "Oops, that one's on us. Try again!" toast
- [ ] Guest receives "You've been added" email (not "Booking Confirmed")

---

### 5. Cancellation Flow (Unchanged)

- [ ] Cancel link from email loads `/cancel/:token` page
- [ ] Cancellation updates `cancelled_at` on the booking
- [ ] Cancellation email sent to guest via `send-booking-email`
- [ ] Cancelled slot becomes available again on the public page

---

### 6. Edge Cases & Race Conditions

- [ ] Two users clicking "Grab Spot" on the same slot simultaneously → one gets `slot_taken`
- [ ] Booking with `allowMultipleSpots: true` allows same email to book multiple slots
- [ ] Sections with custom labels → email shows correct section name
- [ ] Events with `producer_message` → message renders as HTML in email
- [ ] Events without `producer_message` → no empty yellow box in email

---

### 7. Secrets & Configuration

- [ ] `ZEPTOMAIL_API_TOKEN` set in Supabase secrets
- [ ] `ZEPTOMAIL_FROM_EMAIL` set (or defaults to `noreply@quackboard.com`)
- [ ] `FRONTEND_URL` set to production URL (`https://quackboard1.lovable.app`)
- [ ] `STUB_EMAILS` is NOT set to `true` in production
- [ ] `supabase/config.toml` has `[functions.create-booking]` with `verify_jwt = false`

---

### 8. Database Integrity

- [ ] Unique constraint on `bookings(event_id, slot_position)` where `cancelled_at IS NULL` exists
- [ ] `cancel_token` is generated server-side (not client-provided)
- [ ] RLS on `bookings` allows anyone to INSERT (public sign-up)
- [ ] RLS on `message_logs` allows producers to view/insert own logs

---

### 9. Monitoring & Rollback

- [ ] Check edge function logs after first real bookings: https://supabase.com/dashboard/project/dkbahxjibpobbefqufqa/functions/create-booking/logs
- [ ] Verify no orphaned bookings (bookings without corresponding `message_logs` entries)
- [ ] Old `send-booking-email` function still deployed (used by cancellation flow)

---

## Wildcard Section Feature -- Full Implementation

This plan covers two parts: (1) the access control gate so only approved producers see the wildcard option, and (2) the wildcard section behavior itself across all relevant components.

---

### Part 1: Access Control (Manual Approval)

**Database: Create `producer_features` table**

A new table with columns:
- `id` (uuid, primary key)
- `producer_id` (uuid, references producers.id, not null)
- `feature` (text, not null) -- e.g. `'wildcard'`
- `granted_at` (timestamptz, default now())
- Unique constraint on `(producer_id, feature)`

RLS: Enable RLS with a single SELECT policy -- producers can only read their own rows (`auth.uid() = producer_id`). No INSERT/UPDATE/DELETE policies (admin-only via SQL Editor).

**New file: `src/hooks/useProducerFeatures.ts`**
- Query `producer_features` for the current user
- Export `hasFeature(name: string): boolean`
- Cache for 5 minutes (same pattern as `useProducerSlug`)

---

### Part 2: Data Model Changes

**`src/types/database.ts`** -- already updated with `type?` and `signup_opens_at?` on the `Section` interface. No further changes needed.

---

### Part 3: Form Changes (CreateMic + EditMic)

Both forms get the same section builder enhancement, gated behind `hasFeature('wildcard')`:

**Schema updates:**
- The `sectionSchema` becomes conditional: when `type` is `'wildcard'`, `slots` min is 0 and `signup_opens_at` is required. Otherwise, `slots` min stays 1.
- Add `type` and `signup_opens_at` fields to the section schema.

**Section builder UI changes (gated by `hasFeature('wildcard')`):**
- Add an "Add Wildcard Section" button below the existing "Add Section" button
- When clicked, appends a section with `{ label: 'Wildcards', slots: 0, type: 'wildcard' }`
- The wildcard section row shows:
  - Label input (editable, defaults to "Wildcards")
  - No "Spots" number input (spots are dynamic)
  - A date/time picker for "Cutoff / signup opens at"
  - A trash button to remove it
- Validate: only one wildcard section per event
- If the producer does not have the wildcard feature, none of this UI appears

**On submit:**
- Regular sections serialize as `{ label, slots }`
- Wildcard section serializes as `{ label, slots: 0, type: 'wildcard', signup_opens_at: isoString }`
- The `signup_opens_at` on the wildcard section is converted to UTC using the producer's timezone (same pattern as publish_at)

---

### Part 4: SpotList (Public-Facing Rendering)

**`src/components/producer/SpotList.tsx`:**

1. Detect if a wildcard section exists in `sectionsConfig` (any section with `type === 'wildcard'`)
2. Determine if the cutoff has passed (`new Date() >= new Date(wildcardSection.signup_opens_at)`)
3. **Regular sections:**
   - Before cutoff (or no wildcard): render as today (booked = name, empty = "Grab Spot")
   - After cutoff: booked slots show names, unfilled slots show a dash "--" (no "Grab Spot" button)
4. **Wildcard section:**
   - Before cutoff: render section label with "Opens [formatted time]" message, no slot rows
   - After cutoff: compute `availableWildcardSlots = totalRegularSlots - bookedRegularCount - bookedWildcardCount`
     - `totalRegularSlots` = sum of `slots` for all non-wildcard sections
     - `bookedRegularCount` = bookings with slot positions within regular range (1 to totalRegularSlots)
     - `bookedWildcardCount` = bookings with slot positions above totalRegularSlots
   - Render booked wildcard slots with names, then remaining available slots with "Grab Spot" buttons
   - Wildcard slot positions start at `totalRegularSlots + 1`
   - If 0 available, show "No wildcard spots available"

---

### Part 5: EventCard

**`src/components/producer/EventCard.tsx`:**
- Update `totalSlots` calculation: only sum slots from sections where `type !== 'wildcard'` (regular sections)
- `bookedCount` stays as `bookings.length` (includes all bookings)
- Mobile collapsed summary: "5/12 filled" where 12 = regular slots only

---

### Part 6: EventLineup (Producer View)

**`src/pages/EventLineup.tsx`:**
- For wildcard sections, compute and display the dynamic slot count in the section header: "Wildcards (X available)"
- Show booked wildcard slots normally
- Show available wildcard slots as "[Add someone]" links (same as regular empty slots)

---

### Technical Details

**Files created:**
- `src/hooks/useProducerFeatures.ts`

**Files modified:**
- `src/types/database.ts` (already done -- just needs `type` and `signup_opens_at`)
- `src/pages/CreateMic.tsx` (schema + section builder + submit logic)
- `src/pages/EditMic.tsx` (schema + section builder + submit logic)
- `src/components/producer/SpotList.tsx` (wildcard rendering logic)
- `src/components/producer/EventCard.tsx` (totalSlots calculation)
- `src/pages/EventLineup.tsx` (wildcard section display)

**Database migration:**
- Create `producer_features` table with RLS

**No changes to:**
- Booking flow / SignUpModal
- Public producer page layout
- Email/notification logic
- Any edge functions
