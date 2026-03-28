

## Plan: Password Signup with Magic Link Fallback

### Layout (top to bottom)

1. Header (unchanged): logo, "Create your account", beta badge
2. **Access Code** field (shared by both methods)
3. **Email** field
4. **Password** + **Confirm Password** fields
5. **"Get Started"** button (password signup)
6. **"or" divider**
7. **"Send magic link"** button (uses the email already entered above -- no second email field)
8. Terms/privacy text
9. "Already have an account?" link

### How it works

**Password path ("Get Started")**:
- Validates access code via `validate_beta_code` RPC
- Calls `supabase.auth.signUp({ email, password })` 
- Detects duplicate email (Supabase returns `identities: []`) → shows toast "An account with this email already exists. Try signing in." and navigates to `/login`
- On success → shows "Check your email" confirmation screen: "We sent a confirmation link to your email. Click it to activate your account."

**Magic link path ("Send magic link")**:
- Validates access code first (same RPC call)
- Calls `supabase.auth.signInWithOtp({ email })` (existing logic)
- On success → shows "Check your email" screen with "We sent a signup link to your email address."

### Schema changes

Replace the current schema with a discriminated approach using two separate form handlers:
- Password form schema: `accessCode`, `email`, `password`, `confirmPassword` with `.refine()` for match check and `.min(8)` on password
- Magic link uses the same `accessCode` and `email` fields but skips password validation

### Confirmation screen

Track which method was used (`'password' | 'magiclink'`) to show the appropriate confirmation message:
- Password: "Click it to activate your account."
- Magic link: "We sent a signup link to your email address."

### Files changed
- `src/pages/Signup.tsx` -- only file modified

