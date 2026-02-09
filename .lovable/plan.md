

## Fix Unreadable Calendar on Mobile

**Problem**: The calendar uses a 7-column grid regardless of screen size. On mobile (~375px wide), each day cell is roughly 45px -- far too small to display event titles, times, or status text.

**Solution**: Switch to a responsive layout that uses different approaches for mobile vs desktop.

### Mobile Layout: Agenda-style list

On mobile (below 768px), replace the traditional calendar grid with a **month agenda view**:

- Keep the same month navigation header (arrows + month/year title)
- Show only the days that have events, rendered as a vertical list
- Each day shows the date as a heading (e.g. "Tue, Feb 10") followed by the event cards beneath it
- Event cards display title, time, and status -- all fully readable
- Days without events are simply not shown, keeping the view compact
- If no events exist in the current month, show a "No mics this month" empty state

### Desktop Layout: Keep the grid (unchanged)

On desktop (768px+), the existing 7-column calendar grid remains exactly as-is since it has enough space.

### Technical Details

**File: `src/components/dashboard/CalendarDashboard.tsx`**

- Import `useIsMobile` from `@/hooks/use-mobile`
- Add a mobile agenda renderer that:
  - Filters `calendarDays` to only days with events in the current month
  - Sorts them chronologically
  - Renders each as a date heading + event card list
- Wrap the return in a conditional: `isMobile ? <AgendaView /> : <GridView />`
- Remove the bottom legend card (it adds clutter and the view type toggle above already communicates this)

### Result

Mobile users get a clean, scrollable list of their mics grouped by date -- fully readable with no truncation. Desktop users keep the familiar calendar grid.

