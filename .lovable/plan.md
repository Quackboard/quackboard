## Plan: Create `/:slug` page with full booking functionality

### Overview

New page reusing ProducerPage's exact component wiring (EventCard, DaySelector) for full booking support. Queries `accounts` for profile display and `producers` for event data.

### RLS consideration

The `accounts` table RLS only allows SELECT where `discoverable = true`. If a producer's account is not discoverable, the accounts query will return null. The page will fall back to displaying producer data from the `producers` table (which has unrestricted SELECT). This means /:slug always works via direct URL — `discoverable` only controls browse/search visibility.

### Changes


| #   | File                        | Action             |
| --- | --------------------------- | ------------------ |
| 1   | `src/pages/AccountPage.tsx` | **Create**         |
| 2   | `src/App.tsx`               | Add import + route |


### `AccountPage.tsx` details

**Reserved slug guard**: Hardcoded set of reserved slugs. If matched, render `<NotFound />`.

**Data fetching** (mirrors ProducerPage pattern):

1. Query `accounts` by slug — for profile display (header_image_url, profile_image_url, bio_markdown, account_name, venue, social links)
2. Query `producers` by slug — for producer_id, event_window_days, and fallback profile data
3. Query `events` where producer_id matches + status='published', ordered by date/start_time
4. Query `bookings` for all event IDs, filtered to non-cancelled

**Realtime**: Subscribe to bookings table changes, same pattern as ProducerPage.

**Profile header** (custom, not reusing ProducerHeader since accounts has different fields):

- `header_image_url` as banner image (if present)
- `profile_image_url` as avatar (if present)
- `account_name` (or producer.name fallback) as h1
- Venue name + address (Google Maps link)
- Instagram + website links
- `bio_markdown` rendered via ReactMarkdown

**Event listing**: Identical to ProducerPage:

- `DaySelector` for date tabs
- `EventCard` for each event (internally renders SpotList, SignUpModal, CancelSpotModal)
- Same window filtering (event_window_days), past-event exclusion, auto-select first date. Read event_window_days from producers table. 
- `refetchBookings` callback passed to EventCard

**Footer**: "Powered by Quackboard" link.

**Not found state**: If neither accounts nor producers return data for the slug, render `<NotFound />`.

### `App.tsx` change

Add `<Route path="/:slug" element={<AccountPage />} />` immediately before the `path="*"` catch-all. Import AccountPage.

### What is NOT touched

- ProducerPage.tsx, ProducerHeader, EventCard, DaySelector, SpotList, SignUpModal, CancelSpotModal — no modifications
- `/browse` link — untouched
- Booking flow, signup flow, dashboard, edge functions