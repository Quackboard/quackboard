## Problem

The magic link email's header takes up so much vertical space that Gmail clips the message and shows a "..." to expand. Logo is 200px wide with chunky padding above and below, and the outer body adds another 40px of padding before the card even starts.

## Changes

Edit `supabase/functions/_shared/email-templates/magic-link.tsx` to tighten the top of the email:

- Logo width: `200px` → `140px` (still clearly readable, much shorter)
- Logo section padding: `32px 24px 24px` → `16px 24px 12px`
- Outer body padding: `40px 0` → `20px 0` (less dead space above the card)
- Content section top padding: `32px 28px 20px` → `24px 28px 20px` (small trim so the heading sits closer to the divider)

Divider bar, body copy, button, and footer stay as-is.

## Deploy

Redeploy the `auth-email-hook` edge function so the new template ships.

## Out of scope

No other email templates touched. No content/copy changes.
