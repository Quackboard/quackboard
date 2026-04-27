## Goal

Improve the "Spot already taken" recovery flow in `SignUpModal.tsx` only. No changes to the edge function, booking logic, realtime sync, or any other component.

## Changes (single file: `src/components/producer/SignUpModal.tsx`)

### 1. Persist comic info across failed attempts

Today, prefill is only written to `sessionStorage` after a *successful* booking. Update the prefill logic so the user's name/email/instagram are saved as soon as they attempt a booking, regardless of outcome.

- On submit (before calling `createBooking`), write the current form values to `sessionStorage` under the existing `quackboard:comic-prefill` key.
- Keep the existing post-success write (harmless, same data).
- Result: if the slot is taken and they pick another spot, the modal reopens with their info already filled in.

### 2. Auto-close modal on `slot_taken`

In the `switch (result.code)` block, the `slot_taken` case will:
- Show the existing destructive toast ("Spot already taken — Try another spot").
- Call `onOpenChange(false)` to close the modal.
- Do NOT call `form.reset()` (so values stay in `sessionStorage` prefill for the next open).
- Do NOT call `onSuccess()` (no booking happened — leave the parent's success-only refetch alone).

Other error cases (`duplicate_email`, default) keep current behavior: toast shown, modal stays open.

## Out of scope (explicitly untouched)

- `create-booking` edge function
- `SpotList.tsx` realtime subscription
- Any parent component (`EventCard`, `ProducerPage`)
- Toast copy for other error codes
- Success flow

## Technical notes

- The existing `useEffect` on `[open]` already calls `form.reset(readPrefill())` when the modal opens, so persisting values to sessionStorage is sufficient — no need to manually re-seed the form on next open.
- Wrap the new sessionStorage write in try/catch (matches existing pattern for private mode/quota safety).