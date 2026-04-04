
Problem identified:

1. The navbar itself is not the main issue on the create pages.
   The real bug is a React Query cache collision:
   - `useProducerSlug()` uses the key `['producer-profile', user?.id]`
   - `CreateSingleMic`, `CreateRecurringMic`, and `EditMic` also use that same key
   - but those page queries fetch different data (`venue_name`, `venue_address`, `timezone`) and do not include `slug`
   - whichever query resolves last can overwrite the shared cache entry, so the navbar reads a cached producer object with no slug and hides the "View My Public Page" link

2. `EditProfile` is a separate issue:
   - it does not use `ProducerLayout`
   - so it does not render `Navbar` at all
   - that means the public page link can never appear there in the current implementation

3. The route target is already correct:
   - `Navbar` builds the link as `/${slug}`
   - that already points to the canonical root public page route, not `/producer/:slug`

Files I would touch

1. `src/hooks/useProducerSlug.ts`
   - keep this hook as the single source of truth for navbar slug lookup
   - give it a dedicated query key such as `['producer-public-page-link', user?.id]` or similar so it cannot be overwritten by unrelated producer queries

2. `src/pages/CreateSingleMic.tsx`
   - rename its current `['producer-profile', user?.id]` query key to a page-specific key like `['producer-create-single-defaults', user?.id]`
   - no behavior change besides preventing cache pollution

3. `src/pages/CreateRecurringMic.tsx`
   - rename its current `['producer-profile', user?.id]` query key to a page-specific key like `['producer-create-recurring-defaults', user?.id]`

4. `src/pages/EditMic.tsx`
   - rename its current `['producer-profile', user?.id]` query key to a page-specific key like `['producer-edit-mic-settings', user?.id]`

5. `src/pages/EditProfile.tsx`
   - wrap the page in `ProducerLayout` so the navbar appears here too
   - preserve the existing back button and page content styling while moving it inside the shared authenticated layout

Files previously touched trying to fix this

1. `src/components/Navbar.tsx`
   - previously changed to reduce wrapping/overflow risk
   - button text/spacing was adjusted so the desktop nav would not drop the public page button at narrower widths
   - link text was kept as “View My Public Page” with responsive shortening on smaller desktop widths

2. `src/hooks/useProducerSlug.ts`
   - previously updated to fall back from `producers.slug` to `accounts_users -> accounts.slug`
   - this helped when a slug lived on the account record instead of the producer record
   - but it did not fix the cache collision issue above

What I would not touch

- routing in `src/App.tsx` because `/:slug` is already the correct destination
- auth flow
- public profile page logic
- database / Supabase schema

Expected result after implementation

- the "View My Public Page" link appears consistently on:
  - `/dashboard`
  - `/create`
  - `/create/singlemic`
  - `/create/recurringmic`
  - `/edit-profile`
  - other authenticated pages already using `ProducerLayout`
- the link continues to open the canonical `/:slug` public page
- no accidental side effects to booking, event creation, or public page rendering

Technical details

```text
Current failure mode:
Navbar -> useProducerSlug() -> query key ['producer-profile', userId] -> expects slug
Create/Edit pages -> different query with same key -> returns no slug
Shared cache entry gets overwritten
Navbar sees slug = null
Button disappears
```

```text
Fix strategy:
- give slug lookup its own dedicated query key
- give page-level producer default queries their own dedicated keys
- ensure EditProfile uses ProducerLayout so Navbar is present there
```
