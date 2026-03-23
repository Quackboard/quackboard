

## Plan: "List a Mic" Submission Form

### 1. Database Migration

Update the existing `mic_submissions` table to match the new field requirements. Based on the memory note, the table already exists with `mic_name`, `venue_name`, `venue_address`, `day_of_week`, `start_time`, `end_time`, `external_link`, `submitter_email`, `status`. Need to add/adjust columns:

- Add `details` (text, nullable)
- Add `submitter_name` (text, not null)
- Add `instagram_url` (text, nullable)
- Add `next_occurrence` (date, nullable) — the date picker value
- Add `recurrence` (text, nullable) — free-text field
- Drop `day_of_week` if it exists (replaced by next_occurrence + recurrence)

### 2. UI Changes (`src/pages/DiscoverMics.tsx`)

- Rename "Submit a Mic" button to "List a Mic"
- Replace the `mailto:` link with a button that opens a `Sheet` (slide-up form)
- Form fields:
  - **Mic Name** (required, text input)
  - **Next Occurrence** (required, date picker using shadcn Popover+Calendar)
  - **Start Time** (required, time input)
  - **End Time** (required, time input, labeled "approx")
  - **Recurring?** (optional, text input — e.g. "Every Tuesday", "Monthly first Wednesday")
  - **Details** (optional, textarea)
  - **Location** (required, text input for venue name + optional city)
  - **Your Name** (required, text input)
  - **Email** (required, email input)
  - **Link** (optional, URL input)
  - **Instagram** (optional, text input)
- On submit: insert into `mic_submissions`, show success toast, close sheet

### Technical Details

- Use shadcn `Sheet` component for the form overlay
- Date picker: shadcn Popover + Calendar with `pointer-events-auto`
- Time inputs: native HTML `<input type="time">`
- Basic client-side validation (required fields) before Supabase insert
- RLS already allows public INSERT on `mic_submissions`

