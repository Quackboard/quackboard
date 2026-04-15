## Add delete button to dashboard cards + fix mobile overflow

### Problems

1. **No delete on dashboard** — the delete button only exists in EditMic.tsx. Producers have to navigate into Edit just to delete.
2. **Mobile overflow** — on UpcomingEventCard, the Edit/Lineup buttons sit in a fixed row alongside the signup badge, causing spots info to get covered on narrow screens.

### Solution

#### 1. UpcomingEventCard — mobile hamburger menu + delete

Replace the two side-by-side buttons with:

- **Desktop (sm+)**: Keep Edit, Lineup, and add a Delete text link/button in a row
- **Mobile**: Replace all three with a `DropdownMenu` triggered by a vertical ellipsis (MoreVertical icon) — items: Edit, Lineup, Delete

Add delete confirmation dialog (AlertDialog) inline in the card, with the same warning logic as EditMic: if there are active bookings, show count ("3 people will be removed from the lineup"). Need to pass `onDelete` callback and `activeBookingCount` as props.

Props change:

```ts
interface UpcomingEventCardProps {
  event: { ... };  // existing
  availability: { ... } | null;  // existing
  isHappeningNow?: boolean;
  activeBookingCount?: number;   // NEW
  onDelete?: (eventId: string) => Promise<void>;  // NEW
}
```

#### 2. EventRow — same treatment

For upcoming (non-past) EventRow cards:

- **Desktop**: Add "Delete" link alongside Edit, Duplicate, Lineup
- **Mobile**: Replace the 3-column button grid with a DropdownMenu (MoreVertical) — items: Edit, Duplicate, Lineup, Delete

For past EventRow cards: Add Delete button in the collapsible content next to Duplicate.

Add delete dialog inline, same warning pattern. Props change adds `onDelete` callback.

#### 3. Dashboard parent — wire up delete handler

In whatever parent renders these cards (likely `CalendarDashboard.tsx` or `Dashboard.tsx`), add a `handleDelete` function that:

1. Calls `supabase.from('events').delete().eq('id', eventId)`
2. Shows toast on success
3. Invalidates/refetches the event list

Pass this handler + booking count down to each card.

#### 4. Mobile layout fix for UpcomingEventCard

Move the action buttons/menu below the info content on mobile instead of beside it:

```
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
  {/* info */}
  {/* actions: dropdown on mobile, buttons on desktop */}
</div>
```

This ensures the spots/signup badges never compete with buttons for horizontal space.

### Files changed

- `src/components/dashboard/UpcomingEventCard.tsx` — hamburger menu on mobile, delete with dialog
- `src/components/dashboard/EventRow.tsx` — same treatment
- `src/components/dashboard/CalendarDashboard.tsx` (or parent) — delete handler + pass props

### Risk

- Display + delete logic only, no changes to edge functions, booking flow, or auth
- Delete uses same cascade behavior as EditMic

Ensure only the selected event is deleted and it does not effect any other events in the series. 