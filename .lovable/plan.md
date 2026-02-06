
# Remove Duck Logo from Header, Lineup, and Signup

## Overview
Remove the duck logo imagery from the specified pages while maintaining the "Quackboard" text branding. The duck appears in various logo assets used across the application.

## Current Logo Usage

| Location | File | Logo Asset Used |
|----------|------|-----------------|
| Navbar (header) | `src/components/Navbar.tsx` | `logo-header.png` |
| Signup page | `src/pages/Signup.tsx` | `logo-duck-clean.png` |
| Login page | `src/pages/Login.tsx` | `logo-vertical.png` |
| Landing page | `src/pages/Index.tsx` | `logo-vertical.png` |
| EventLineup | Uses `ProducerLayout` which includes Navbar | (inherits from Navbar) |

## Proposed Changes

### 1. Navbar (Header) - `src/components/Navbar.tsx`
**Current:** Shows `logo-header.png` (horizontal logo with duck)
**Change:** Replace image with styled text "Quackboard"

```text
Before: <img src={logoHorizontal} alt="Quackboard" className="h-8" />
After:  <span className="text-xl font-bold text-foreground">Quackboard</span>
```

This change automatically applies to the EventLineup page since it uses `ProducerLayout`.

### 2. Signup Page - `src/pages/Signup.tsx`
**Current:** Shows `logo-duck-clean.png` (duck icon)
**Change:** Replace with styled text heading

```text
Before: <img src={logoDuck} alt="Quackboard" className="h-24 mx-auto mb-6" />
After:  <h1 className="text-3xl font-bold text-foreground mb-2">Quackboard</h1>
```

Also update the existing `<h1>` to become the subheading.

### 3. Login Page - `src/pages/Login.tsx` (for consistency)
**Current:** Shows `logo-vertical.png` (duck + text stacked)
**Change:** Replace with styled text

```text
Before: <img src={logoVertical} alt="Quackboard" className="h-24 mx-auto mb-6" />
After:  <h1 className="text-3xl font-bold text-foreground mb-2">Quackboard</h1>
```

### 4. Landing Page - `src/pages/Index.tsx`
**Current:** Shows `logo-vertical.png` in nav
**Change:** Replace with styled text

```text
Before: <img src={logoVertical} alt="Quackboard" className="h-12" />
After:  <span className="text-xl font-bold text-foreground">Quackboard</span>
```

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Replace logo image with text |
| `src/pages/Signup.tsx` | Replace duck image with text heading |
| `src/pages/Login.tsx` | Replace logo image with text heading |
| `src/pages/Index.tsx` | Replace logo image with text in nav |

## Technical Notes

- Remove unused logo imports from each file
- Use the "Outfit" font family (already applied to headings via CSS)
- Maintain consistent text styling across all locations
- The logo asset files themselves will remain in `/src/assets/` in case needed later
