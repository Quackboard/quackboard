## Problem

The magic link email shows a broken image inside a teal gradient header, with "Quackboard" rendered as text. The current image URL (`https://quackboard1.lovable.app/favicon.png`) doesn't render reliably in Gmail, and the favicon is just the duck — not the dual-color wordmark on the login page.

## Goal

Match the login page: duck + dual-color "Quackboard" wordmark on a clean white header, separated from the body by a thin teal divider bar.

## Changes

**1. Host the login-page logo publicly**
- Copy `src/assets/logo-full-clean.png` → `public/logo-full-clean.png` so it's served at `https://quackboard.com/logo-full-clean.png` (reachable by email clients).

**2. Update `supabase/functions/_shared/email-templates/magic-link.tsx`**
- Remove the teal gradient header section (the broken `<Img>` and the "Quackboard" `<Text>`).
- Add a new white header containing only the full logo image (~180px wide, height auto, centered) with comfortable padding.
- Add a thin teal divider bar (3-4px tall, `#34a08c`, full card width) immediately below the header to separate it from the body copy.
- Drop the unused `header` / `headerText` style constants.
- Body copy, button, and footer are untouched.

**3. Deploy**
- Redeploy the `auth-email-hook` edge function so the new template ships.

## Out of scope

Per your earlier instruction, no other email templates or edge functions are touched — only `magic-link.tsx` and the new public asset.
