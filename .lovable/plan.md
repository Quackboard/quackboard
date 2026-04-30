## Restore Duplicate on Single Mic Cards

The duplication backend is fully intact:
- Route `/events/:id/duplicate` is registered in `App.tsx`
- `src/pages/DuplicateMic.tsx` clones the event as a draft, pre-fills the edit-page localStorage draft, and redirects to `/events/:newId/edit`

What's missing is the entry point on the **single mic** card (`UpcomingEventCard`) shown on the dashboard. Recurring series cards and the legacy `EventRow` still link to it; single-mic cards do not.

### Change (one file only)

**`src/components/dashboard/UpcomingEventCard.tsx`**

1. Import `Copy` from `lucide-react` (alongside existing `MoreVertical`, `Trash2`).
2. **Mobile dropdown menu** — add a "Duplicate" item between "Lineup" and "Delete":
   ```tsx
   <DropdownMenuItem asChild>
     <Link to={`/events/${event.id}/duplicate`}>Duplicate</Link>
   </DropdownMenuItem>
   ```
3. **Desktop button row** — add a ghost icon button matching the existing visual pattern, placed between "Lineup" and the delete trash button:
   ```tsx
   <Button variant="ghost" size="sm" asChild title="Duplicate">
     <Link to={`/events/${event.id}/duplicate`}>
       <Copy className="h-4 w-4" />
     </Link>
   </Button>
   ```

### Out of scope (per your instructions)

- No changes to `DuplicateMic.tsx`, `CreateSingleMic.tsx`, the route, or any other component
- No changes to `RecurringSeriesCard` or `EventRow` (already wired)
- No styling/design-token changes beyond reusing existing variants

### Result

Clicking Duplicate on any upcoming single mic will:
1. Clone the event as a draft (same title, venue, times, sections, signup config)
2. Pre-fill the edit form draft via localStorage
3. Land you on the edit page with a "Mic duplicated!" toast prompting you to update the date
