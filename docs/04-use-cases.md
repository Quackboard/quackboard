# QuackBoard — Supported Use Cases

## 1. Producer Workflows

### 1.1 Account Setup

```
Sign up (/signup)
  → Supabase creates auth.users row
  → Trigger creates producers row
  → Redirect to /onboarding
  → Set name, slug, venue name, venue address, timezone
  → Redirect to /dashboard
```

- The `slug` becomes the producer's public URL: `/producer/<slug>`.
- Slugs must be 3–50 characters, alphanumeric + hyphens, not in the reserved list.
- UUID-based URLs still work for backward compatibility and auto-redirect to the slug URL.

### 1.2 Create an Open Mic Event

**Page:** `/create` (`CreateMic.tsx`)

1. Set date, start/end time.
2. Enter venue name and address (pre-filled from producer profile).
3. Define **sections** — each section has a label and slot count:
   - Regular sections: fixed number of spots available immediately.
   - Wildcard sections: overflow spots that open at a specified cutoff time (e.g., day-of at 6 PM).
4. Choose sign-up availability:
   - **Live now:** Event publishes immediately.
   - **Later:** Specify days-before and time for when sign-ups open.
5. Optionally set a **producer message** (Markdown) shown in confirmation emails.
6. Choose **email notification frequency**: none, immediate, or daily.
7. Optionally enable **allow multiple slots** per comic.
8. Optionally configure **recurrence** (weekly, biweekly, or monthly with an end date).
9. Save as draft or publish.

**Form draft persistence:** If the producer navigates away mid-form, the draft is saved to localStorage and restored on return.

### 1.3 Manage Events from the Dashboard

**Page:** `/dashboard` (`Dashboard.tsx`)

- **List view:** Upcoming and past events with fill-rate badges.
- **Calendar view:** Monthly grid showing events by event date or creation date.
- Per-event actions:
  - **Edit** → `/events/:id/edit`
  - **Duplicate** → `/events/:id/duplicate` (creates a new draft based on the event)
  - **View Lineup** → `/events/:id/lineup`

### 1.4 Manage a Lineup

**Page:** `/events/:id/lineup` (`EventLineup.tsx`)

- See all sections and slots in a table.
- Each slot shows: position number, guest name, email, Instagram.
- **Add to slot:** Producer can manually add a comic to an empty slot via `AddToSlotModal`. This calls the `create-booking` Edge Function with `isManualAdd: true`, sending the guest a "you've been added" email.
- **Remove from lineup:** Soft-delete — sets `cancelled_at` on the booking.
- **Export CSV:** Download the entire lineup as a CSV file.
- Wildcard sections: before the cutoff time, wildcard slots are hidden. After cutoff, they appear with dynamic availability (unfilled regular slots become additional wildcard capacity).

### 1.5 Share & Embed

From the dashboard, producers can:
- **Copy their public page link** (`/producer/<slug>`).
- **Generate embed code** — an `<iframe>` snippet that renders the `CalendarWidget` on external websites. The widget fetches data from the `get-producer-events-embed` Edge Function.

### 1.6 Edit Profile

**Page:** `/edit-profile` (`EditProfile.tsx`)

Edit: display name, slug, bio (Markdown), venue name, venue address, Instagram, website, timezone, event window (how many days ahead events are visible on the public page).

---

## 2. Comic / Performer Workflows

### 2.1 Browse and Sign Up

**Page:** `/producer/:slug` (`ProducerPage.tsx`)

1. Comic visits the producer's public page.
2. Sees the producer's bio, venue info, and upcoming events within the event window.
3. Selects a date via the `DaySelector`.
4. For each event on that date, sees the `SpotList` with available and taken spots.
5. Clicks an available spot → `SignUpModal` opens.
6. Enters name, email, optional Instagram handle.
7. Submits → `createBooking` Edge Function is called:
   - Booking is inserted.
   - Guest receives a confirmation email with event details, spot number, and a **cancel link**.
   - Producer optionally receives a notification (if email frequency = immediate).
8. The spot appears as taken in real time (via Supabase Realtime).

### 2.2 Cancel a Booking

**Page:** `/cancel/:token` (`CancelBooking.tsx`)

1. Comic clicks the "Cancel Your Booking" link in their confirmation email.
2. The page loads booking details using the `cancel_token`.
3. Comic confirms cancellation.
4. The `cancel-booking` Edge Function sets `cancelled_at` and triggers a cancellation email to both the guest and the producer.
5. The spot becomes available again on the public page.

### 2.3 Alert Preferences

On the cancellation page, comics can also set their email alert frequency preference:
- Immediate, Daily Summary, Weekly Summary, or No Alerts.
- Currently stored in **localStorage** (not the database).

---

## 3. Wildcard Section Mechanics

Wildcard sections are a unique feature for events that want a "first come, first served" overflow pool.

### How It Works

1. Producer creates an event with regular sections + one wildcard section.
2. The wildcard section has:
   - A base `slots` count (reserved wildcard spots).
   - A `signup_opens_at` cutoff datetime.
   - `signup_opens_at_days_before` and `signup_opens_at_time` for configuration.
3. **Before cutoff:** Wildcard section is completely hidden on the public page. Only regular sections are visible and bookable.
4. **At cutoff:** The wildcard section appears. Its available capacity = `reserved wildcard slots` + `unfilled regular slots`. This means empty regular spots effectively convert into additional wildcard spots.
5. **After cutoff:** Regular sections show only their booked slots (empty regular spots are no longer directly bookable). All new sign-ups go to wildcard slots.

### Countdown Timer

`SpotList.tsx` implements a real-time countdown:
- When the cutoff is ≤5 minutes away, a `MM:SS` countdown appears.
- Uses `setInterval(1000)` for second-by-second updates.
- Handles browser tab visibility changes to correct any drift.
- Once the timer hits zero, the wildcard section appears without a page refresh.

### Lineup View

In `EventLineup.tsx`, wildcard slots are displayed separately:
- Before cutoff: hidden.
- After cutoff: booked wildcard slots + available wildcard slots are shown.

---

## 4. Recurring Events

**Component:** `RecurrenceSelector` (`src/components/ui/RecurrenceSelector.tsx`)

Producers can create recurring events when creating a mic:

| Pattern | Description |
|---------|-------------|
| Weekly | Same day every week |
| Biweekly | Same day every two weeks |
| Monthly | Same day-of-week each month |

Configuration:
- Select a recurrence pattern.
- Set an end date.
- The `generateRecurringDates` function calculates all occurrence dates.
- Each occurrence is inserted as a separate `events` row (not linked by a foreign key, but grouped by `event_templates.series_id` if templates are used).

---

## 5. Email Notification Tiers

Producers choose a notification frequency per event:

| Frequency | Behavior |
|-----------|----------|
| **None** | No producer emails for bookings. Guest still receives confirmation. |
| **Immediate** | Producer gets an email for each new booking as it happens. |
| **Daily** | Producer receives a daily digest summarizing all bookings from that day. |
| **Weekly** | Producer receives a weekly digest (triggered by cron). |
| **Monthly** | Producer receives a monthly digest (triggered by cron). |

### Implementation
- `email_frequency` is stored on the `events` table.
- Immediate: handled inside `create-booking` and `send-booking-email`.
- Daily/Weekly/Monthly: handled by `send-daily-notifications`, `send-weekly-notifications`, `send-monthly-notifications` → `send-producer-notifications`.
- Cancellation emails to producers are **always sent immediately**, regardless of the frequency setting.

---

## 6. Embeddable Calendar Widget

Producers can embed an upcoming events calendar on their own website.

### How It Works

1. Producer copies the embed `<iframe>` code from the Dashboard's "Share & Embed" section.
2. The iframe loads `/embed/:slug` which renders `EmbedWidgetPage` → `CalendarWidget`.
3. `CalendarWidget` calls the `get-producer-events-embed` Edge Function to fetch events.
4. The widget renders a compact calendar with event titles, dates, times, and spot availability (X/Y booked).
5. Clicking an event links to the producer's public page.

### Preview

`/preview/embed/:slug` shows the embed widget in a simulated iframe container for the producer to preview.

---

## 7. Discover / Browse Open Mics

**Page:** `/browse` (`DiscoverMics.tsx`)

A public directory where anyone can browse open mics. Producers can list their mic via the `ListMicSheet` component in the discover section.

---

## 8. Admin Panel

**Page:** `/admin` (`Admin.tsx`)

An admin interface (not wrapped in `ProtectedRoute` — authorization is likely handled internally). Used for platform-level management like beta access codes and producer features.

---

## 9. CSV Export

From the lineup page (`EventLineup.tsx`), producers can export the lineup as a CSV:
- Triggers `ExportCsvModal`.
- Exports columns: slot position, section, guest name, guest email, guest Instagram.

---

## 10. Scheduled Publishing

Events support deferred publishing:
- `publish_at`: when the event becomes visible on the public page.
- `signup_opens_at`: when the sign-up slots actually open (may differ from publish time).
- Computed from `signupDaysBefore` + `signupOpensAtTime` relative to the event date and the producer's timezone.
