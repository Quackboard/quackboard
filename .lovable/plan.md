## Fix: Landing page mobile responsiveness

### Problem identified

Two issues causing the "Get Started" button to be cut off on mobile:

1. `**src/App.css**` — `#root { padding: 2rem; }` adds 32px padding on each side, stealing 64px from the 390px viewport. This is leftover Vite boilerplate and affects every page.
2. `**src/pages/Index.tsx**` — The nav bar renders all three buttons ("Browse Mics", "Log in", "Get Started") in a single horizontal row with `gap-3` and no mobile breakpoint. On screens under ~420px, the "Get Started" button overflows off-screen.

### Other pages checked

- **Login/Signup**: Fine — centered form layout, no overflow.
- **Browse (/browse)**: Fine — proper mobile layout with scrollable day chips.
- **Dashboard/Navbar**: Fine — already has a hamburger menu for mobile.
- **Account pages**: Fine — single-column layouts.

The issue is isolated to the landing page nav and the global `#root` padding.

### Changes

**File 1: `src/App.css**`

- Remove `padding: 2rem` from `#root` (or set to `0`). The individual pages already handle their own padding via `px-4`.
- Keep `max-width` and `margin: 0 auto` as-is.

**File 2: `src/pages/Index.tsx**`

- On mobile (below `sm`), hide "Browse Mics" and "Log in" text buttons. Show only the "Get Started" CTA button plus a hamburger menu icon, or alternatively:
- Simpler approach: reduce `gap-3` to `gap-1` on mobile, make the ghost buttons smaller with `text-sm` and tighter padding, and use `flex-wrap` as a safety net so nothing gets clipped.
- Recommended: Match the pattern from `Navbar.tsx` — on `md:` and below, collapse to a hamburger icon that reveals the links. On mobile, show only "Quackboard" + a compact "Get Started" button + hamburger for the rest.

### Recommended approach (simplest, consistent with brand)

On screens below `md`:

- Show: "Quackboard" logo + "Get Started" button only
- Hide "Browse Mics" and "Log in" behind a mobile menu toggle (hamburger icon), matching the existing Navbar pattern
- The hero section already has "Start for Free" and "I already have an account" buttons, so hiding nav links on mobile loses nothing

### Risk

- Display-only change to the landing page nav
- No changes to routing, auth, booking, or any edge functions
- All other pages already render correctly on mobile

Proceed with the recommended approach and do not touch any edge functions, files not in the above 2. 