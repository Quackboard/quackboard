

## Plan: Tap-on-Name to Cancel

Remove the standalone "Cancel my spot" button entirely. Instead, make each booked comic's name tappable/clickable directly in the spot list. Tapping a name opens the existing CancelSpotModal.

### How it works
- Each booked name row in SpotList becomes interactive -- on tap, it opens the cancel modal
- A subtle visual hint shows it's tappable: on hover (desktop) or on tap (mobile), the row highlights and shows an "x" or "Cancel" label that slides/fades in next to the name
- The CancelSpotModal still handles email verification, so random users can't cancel someone else's spot

### Changes

**1. `src/components/producer/SpotList.tsx`**
- Accept new props: `onCancelSpot: (bookingId: string) => void`
- For each booked slot row, wrap the name in a group that:
  - On hover/tap shows a small red "x" icon or "cancel" text that fades in to the right of the name
  - Uses `cursor-pointer` and a subtle hover background (`hover:bg-destructive/5 rounded`)
  - On click, calls `onCancelSpot(booking.id)` (but since we use email verification, we just open the modal)
- Apply this to both regular and wildcard booked rows

**2. `src/components/producer/EventCard.tsx`**
- Remove the standalone "Cancel my spot" button from both desktop and mobile views
- Remove the "Cancel" text from the mobile collapsible header
- Pass `onCancelSpot={() => setCancelOpen(true)}` to SpotList
- Keep CancelSpotModal wired up as-is

### Visual behavior
- **Default state**: names look normal (no cancel indicator visible)
- **Hover (desktop) / Tap (mobile)**: row gets a subtle red-tinted background, a small "x" icon fades in next to the name
- **Click/tap the row**: opens the CancelSpotModal with email verification

### What stays the same
- CancelSpotModal flow (email lookup, multi-booking selection)
- Edge function, rate limiting, email notifications
- Slot numbering, wildcard logic, SpotList structure
- "Grab Spot" buttons for empty slots

