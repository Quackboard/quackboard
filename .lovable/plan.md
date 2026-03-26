

## Plan: In-App Cancel My Spot (Option B) + Remove Cancel-in-Email Message

### Overview
Add a single "Cancel My Spot" button at the bottom of each event card. Clicking it opens a modal asking for the comic's email. A new edge function looks up their active booking(s) by event + email. If multiple bookings exist, the modal lists them so the comic chooses which to cancel. Remove the cancellation-instructions banner from the bottom of the public page.

### Changes

**1. New edge function: `supabase/functions/cancel-booking-by-email/index.ts`**
- Accepts `{ eventId, email }`
- In-memory rate limiting: track requests per IP, max 5/minute; return 429 with `code: "rate_limited"` if exceeded
- Uses service role key to query `bookings` where `event_id = eventId`, `guest_email = email` (case-insensitive), `cancelled_at IS NULL`
- If no matches: return `{ success: false, code: "not_found" }`
- If one match: cancel it (set `cancelled_at`), trigger cancellation email (same pattern as existing `cancel-booking`), return `{ success: true, cancelled: [{ id, guest_name, slot_position }] }`
- If multiple matches: return `{ success: true, code: "multiple", bookings: [{ id, guest_name, slot_position }] }` so the UI can let the user pick
- Accept optional `bookingId` param: when provided, cancel only that specific booking (for the multi-booking selection flow)

**2. New component: `src/components/producer/CancelSpotModal.tsx`**
- Dialog with email input and "Cancel My Spot" destructive button
- On submit, calls `cancel-booking-by-email` with `eventId` + email
- If `code: "multiple"`, shows a list of bookings with radio/button selection, then re-calls with `bookingId`
- Success toast: "Your spot has been cancelled"
- Error states: "No booking found for this email", rate limit message, generic error
- On success, calls `onBookingSuccess` to refresh the spot list

**3. Update `src/components/producer/EventCard.tsx`**
- Add a "Cancel My Spot" text button below the SpotList (inside the signupStatus.isOpen block)
- Clicking opens the CancelSpotModal
- Appears in both mobile and desktop views

**4. Update `src/pages/ProducerPage.tsx`**
- Remove the cancellation-instructions `<div>` ("Need to cancel? Look for the cancellation link...")

### What stays the same
- Existing `/cancel/:token` email link flow -- unchanged and still works
- `cancel-booking` edge function -- unchanged
- SpotList rendering, wildcard logic, slot numbering -- unchanged
- Database schema -- no changes needed
- Cancellation emails still sent to the comic on cancel

### Technical Detail: Rate Limiting
The edge function uses a `Map<string, number[]>` in memory to track request timestamps per IP. On each request, expired entries (>60s) are pruned. If 5+ requests exist within the window, a 429 is returned. This is per-instance and resets on cold start, which is acceptable for this use case.

