

## Add Slug Editing to Edit Profile Page

### Overview
Add a "Page URL" field to `src/pages/EditProfile.tsx` with real-time availability checking and a warning when the slug is changed. No other files are modified.

### Changes to `src/pages/EditProfile.tsx`

1. **New imports**: Add `validateSlug`, `RESERVED_SLUGS` from `@/lib/slug`; `Alert`, `AlertDescription` from UI; `CheckCircle2`, `XCircle`, `AlertTriangle` icons.

2. **Add `slug` to form schema**: Same validation as Onboarding (min 3, max 50, lowercase alphanumeric + hyphens, no consecutive hyphens, no reserved slugs).

3. **Add state**: `slugTaken` (boolean), `isCheckingSlug` (boolean), `originalSlug` (string, set when data loads).

4. **Fetch slug**: Add `slug` to the producer query select. Store as `originalSlug` and set as form default.

5. **Debounced availability check**: 300ms debounce `useEffect` watching `slugValue`. Queries `producers` with `.neq('id', user.id)`. Skips check if slug equals `originalSlug`.

6. **UI -- Slug input field**: In the "Page Settings" section, add a `quackboard.com/` prefixed input (same pattern as Instagram handle input). Show inline availability indicator (spinner / green check / red X).

7. **UI -- Warning alert**: When slug differs from `originalSlug`, show an amber alert: "Changing your URL will break any existing links, bookmarks, or embeds using your current URL (quackboard.com/{originalSlug}). This cannot be undone."

8. **Update payload**: Add `slug` to the update object. Block submit if `slugTaken` is true (show error toast).

### Technical notes
- Reuses existing `validateSlug` and `RESERVED_SLUGS` from `src/lib/slug.ts`
- No database migration needed -- `slug` column already exists on `producers`
- The existing `sync_producer_to_account` trigger syncs slug changes to `accounts` automatically
- Only `src/pages/EditProfile.tsx` is touched

