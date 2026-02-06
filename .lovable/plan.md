

# Add "Request Access Code" Option to Signup Page

## Overview
Add a clear path for users who don't have an access code to request one, making the signup flow more complete and user-friendly.

## Current State
- The signup page requires an access code to proceed
- There's a "Beta Access Required" badge but no way to request a code
- Users without a code have no clear next step

## Proposed Changes

### `src/pages/Signup.tsx`

Add a "Request Access" link/button below the access code field that allows users to request a code. This will be implemented as a mailto link (simple and immediate) with a pre-filled subject line.

**Visual Layout:**

```text
┌─────────────────────────────────────┐
│            Quackboard               │
│       Create your account           │
│  Start managing your open mics...   │
│       [Beta Access Required]        │
│                                     │
│  Access Code                        │
│  ┌─────────────────────────────┐    │
│  │ Enter your beta access code │    │
│  └─────────────────────────────┘    │
│  Don't have a code? Request access  │  ← NEW
│                                     │
│  Email                              │
│  ┌─────────────────────────────┐    │
│  │ you@example.com             │    │
│  └─────────────────────────────┘    │
│                                     │
│       [ Get Started ]               │
│                                     │
│  Already have an account? Sign in   │
└─────────────────────────────────────┘
```

**Code Changes:**

1. Add a help text below the access code input field:
   ```tsx
   <p className="text-sm text-muted-foreground">
     Don't have a code?{' '}
     <a 
       href="mailto:hello@quackboard.com?subject=Quackboard Beta Access Request"
       className="text-primary font-medium hover:underline"
     >
       Request access
     </a>
   </p>
   ```

2. The mailto link will:
   - Open the user's email client
   - Pre-fill the subject line with "Quackboard Beta Access Request"
   - Allow the user to write their request

## Technical Details

| Element | Implementation |
|---------|---------------|
| Request link | `mailto:` link with pre-filled subject |
| Placement | Below the access code input, before email field |
| Styling | Matches existing link style (`text-primary font-medium hover:underline`) |

## Alternative Consideration
If you'd prefer a different email address or want to use an external form instead, let me know and I can adjust the implementation.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Signup.tsx` | Add "Request access" link below the access code field |

