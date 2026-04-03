

## Plan: Update internal `/producer/:slug` links to `/:slug`

### Navbar fix (item 1)

Current line 20: `const producerPageUrl = slug ? `/producer/${slug}` : `/producer/${user?.id}`;`

The fallback to `user?.id` won't work on AccountPage since it only resolves slugs. Change to:
- `const producerPageUrl = slug ? `/${slug}` : null;`
- Conditionally render the "View My Page" link only when `slug` is available. If the producer hasn't completed onboarding (no slug yet), hide the link entirely.

### All changes

| # | File | Change |
|---|------|--------|
| 1 | `src/components/Navbar.tsx` (line 20) | Change to `const producerPageUrl = slug ? `/${slug}` : null;` and conditionally render the "View My Page" button only when `producerPageUrl` is truthy |
| 2 | `src/pages/Dashboard.tsx` | Change `/producer/${displaySlug}` to `/${displaySlug}` |
| 3 | `src/pages/DiscoverMics.tsx` | Change `/producer/${producer.slug}` to `/${producer.slug}` |
| 4 | `src/components/embed/CalendarWidget.tsx` | Change `/producer/${producerSlug}` to `/${producerSlug}` |
| 5 | `src/pages/Onboarding.tsx` | Change URL prefix display from `quackboard.com/producer/` to `quackboard.com/` |
| 6 | `src/pages/ProducerPage.tsx` | Change redirect from `/producer/${data.slug}` to `/${data.slug}` |

### What is NOT touched
- `/producer/:slug` route in App.tsx (stays as fallback)
- Email templates, edge functions, booking flow, signup flow

