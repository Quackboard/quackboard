

## Add Comics Banner Under Nav on Home Page

### Change
**`src/pages/Index.tsx`** only.

1. **Remove** the existing "Browse Mics Banner" section (the rounded card with "Looking for stage time?" between features grid and CTA).

2. **Add a full-width banner** immediately after `</header>`, before `<main>`:
   - Copy: **"Comics! Quackboard is open. Waddle over and find your next mic."**
   - `Mic` icon, "Browse Open Mics →" button
   - Styled as `w-full border-b border-primary/15 bg-primary/5 py-3 px-4`
   - Flex row on `md:`, stacked + centered on mobile

Since this markup lives inside `Index.tsx`, it only renders on the home page.

### No other files touched.

