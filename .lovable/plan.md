

## Schedule View for Mobile on Public Profile (`/producer/:slug`)

### Overview
Redesign the event cards on the public producer page to display as a compact, scannable schedule -- but only on mobile. Desktop keeps the current fully-expanded card layout.

### How It Works

**Mobile (collapsed by default):**
```text
 7:00 - 9:00 PM        3/10 spots filled    ▼
 9:30 - 11:00 PM       0/8 spots filled     ▼
```
Tapping a row expands it to reveal venue info and the full SpotList with "Grab Spot" buttons.

**Desktop:** No changes -- cards remain fully expanded as they are today.

### Technical Changes

**`src/components/producer/EventCard.tsx`**
- Import `useIsMobile` hook (already used elsewhere in the project)
- Add `expanded` state (default: `false`)
- Compute `totalSlots` and `bookedCount` from `sectionsConfig` and `bookings`
- When `isMobile`:
  - Render a compact clickable header row: time, availability summary ("X/Y spots filled"), and a chevron icon
  - Wrap venue info, signup status, and SpotList inside `CollapsibleContent` from `@radix-ui/react-collapsible`
  - Reduce padding for schedule-like density
- When not mobile: render the current layout unchanged
- Remove `status` prop usage (badges, colored borders) since all public events are live -- this simplifies the card for the public page context

**`src/pages/ProducerPage.tsx`**
- Remove the grouped section headers ("Active Events", "Upcoming Events", "Past Events") and their Badge imports
- Merge all events for the selected date into a single chronologically sorted list
- Use tighter spacing (`space-y-2`) for mobile density
- Past events toggle remains unchanged at the bottom

### What Stays the Same
- DaySelector at top
- Desktop layout (fully expanded cards)
- SpotList and SignUpModal internals
- All booking logic and data fetching
- Venue display logic

