
# Add Privacy Policy and Terms of Service Links

## Overview
Add Privacy Policy and Terms of Service pages to the application and include links to them in the landing page footer.

## Current State
- The footer in `Index.tsx` only shows copyright text
- No privacy policy or terms of service pages exist
- No routes for these pages in `App.tsx`

## Proposed Changes

### 1. Create Privacy Policy Page
**New file:** `src/pages/PrivacyPolicy.tsx`

A simple, clean page with:
- Consistent styling with the rest of the app
- Navigation back to home
- Placeholder content for privacy policy (you can update the actual content later)

### 2. Create Terms of Service Page
**New file:** `src/pages/TermsOfService.tsx`

A simple, clean page with:
- Consistent styling with the rest of the app
- Navigation back to home
- Placeholder content for terms of service (you can update the actual content later)

### 3. Add Routes
**File:** `src/App.tsx`

Add two new routes:
- `/privacy` → PrivacyPolicy component
- `/terms` → TermsOfService component

### 4. Update Footer
**File:** `src/pages/Index.tsx`

Update the footer to include links:

```text
Before:
┌─────────────────────────────────────────────────┐
│  © 2025 Quackboard. Built for comedy producers. │
└─────────────────────────────────────────────────┘

After:
┌─────────────────────────────────────────────────┐
│  © 2025 Quackboard. Built for comedy producers. │
│          Privacy Policy · Terms of Service      │
└─────────────────────────────────────────────────┘
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/pages/PrivacyPolicy.tsx` | New page with privacy policy content |
| `src/pages/TermsOfService.tsx` | New page with terms of service content |
| `src/App.tsx` | Add routes for `/privacy` and `/terms` |
| `src/pages/Index.tsx` | Add footer links to Privacy Policy and Terms of Service |

## Page Layout

Both legal pages will follow this structure:
- Header with "Quackboard" branding and navigation
- Content area with the policy text
- Footer with copyright and links (same as landing page)

The placeholder content will include common sections that you can customize with your actual legal text later.
