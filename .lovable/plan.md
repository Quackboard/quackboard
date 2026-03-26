

## Plan: Update Edit Public Page Subtext + Add Event Window Setting

### Changes

**1. Database: Add `event_window_days` column to `producers`**
- New column: `event_window_days integer DEFAULT 7`
- Values: 7, 14, or 30

**2. `src/pages/EditProfile.tsx`**
- Change subtext from "Update your public page." to "Update your public page and manage page settings."
- Add a "Page Settings" section with a radio/select for "Show events for the next" with options: 7 days, 14 days, 30 days
- Add `event_window_days` to the form schema, load, and save logic

**3. `src/pages/ProducerPage.tsx`**
- Read `event_window_days` from the producer record (default 7)
- Replace the hardcoded 7-day filter with the producer's chosen window when filtering `currentEvents`

**4. `src/types/database.ts`**
- Add `event_window_days` to the `Producer` type

### What stays the same
- Onboarding flow unchanged (defaults to 7 days)
- No changes to dashboard, calendar, or embed views
- Public page layout and event card rendering unchanged

