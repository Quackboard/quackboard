

## Plan: Two-Step Signup with Dialog

### Step 1 — Clean signup page (`/signup`)
- Show only: **Access Code**, **Email**, **"Get Started"** button
- On click: validate access code via `validate_beta_code` RPC, validate email format
- If valid, open a dialog overlay for step 2
- Keep the header, beta badge, "Already have an account?" link, and legal text

### Step 2 — Dialog overlay
- Title: **"Set your password"**
- Fields: **Password**, **Confirm Password**, **"Create Account"** button
- Below that: **"or" divider** → **"Send magic link"** button (uses the email from step 1)
- Password path calls `supabase.auth.signUp()`; magic link calls `supabase.auth.signInWithOtp()`
- Duplicate email detection stays (identities check → toast + redirect to `/login`)

### Confirmation state
- On success from either method, the dialog content swaps to the "Check your email" message with method-specific copy
- "Try again" button closes dialog and resets

### File changed
- `src/pages/Signup.tsx` only

