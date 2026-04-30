## Goal

Stop the silent "nothing happens on Publish" experience in `src/pages/CreateSingleMic.tsx`. When validation fails, surface a destructive toast naming the first invalid field so the user knows what to fix.

## Changes (single file: `src/pages/CreateSingleMic.tsx`)

### 1. Add a validation-error handler

Add a small helper inside the component that takes the RHF `errors` object (the second arg `handleSubmit` passes to its error callback), walks it to find the first field with a `message`, and shows a destructive toast:

- Title: "Please fix the errors above"
- Description: the first error message (e.g. "End time must be after start time", "Venue name is required"), prefixed with a human-readable field label when possible (date, start time, end time, venue name, venue address, sections, signup timing, etc.).
- Falls back to "Some required fields are missing or invalid." if no message can be extracted.

It will also attempt to scroll the first invalid field into view using `document.querySelector('[aria-invalid="true"]')` + `scrollIntoView({ behavior: 'smooth', block: 'center' })`, wrapped in a try/catch.

### 2. Wire it into both buttons

Update the two buttons on lines 552 and 555 so `handleSubmit` receives the new error handler as its second argument:

```ts
onClick={handleSubmit(
  (data) => onSubmit(data, 'draft'),
  onValidationError,
)}
```

Same for the Publish button with `'published'`.

### 3. Field label map

Small `Record<string, string>` inside the component mapping form field names (`date`, `startTime`, `endTime`, `venueName`, `venueAddress`, `sections`, `signupDaysBefore`, `signupOpensAtTime`, `producerMessage`, etc.) to friendly labels used in the toast description. Wildcard sub-errors (`sections.0.slots`, `sections.1.signup_opens_at_time`) get a generic "Spot section" label.

## Out of scope (explicitly untouched)

- `onSubmit` itself, the edge function call, and the success path
- The Zod schema and any validation rules
- `CreateRecurringMic.tsx` (same pattern could be applied later but not in this change)
- Recurring mic generation horizon work discussed earlier
- Toast styling (uses existing `useToast` already imported on line 24)

## Technical notes

- `handleSubmit(onValid, onInvalid)` is the standard RHF API; `onInvalid` receives `FieldErrors<FormData>`.
- Nested errors (sections array, refinements) are walked recursively to find the first `{ message: string }` leaf.
- No new dependencies. No schema changes. No DB or edge function changes.
