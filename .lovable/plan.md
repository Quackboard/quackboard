

## Plan: "Submit a Mic" Mailto Button

### Changes (single file: `src/pages/DiscoverMics.tsx`)

**1. Add "Submit a Mic" button in the header**
- Small outlined button next to the page title

**2. On click, open mailto link**
- `mailto:hello@quackboard.com`
- Subject: `Mic Submission`
- Body template:
  ```
  Mic Name:
  Venue:
  City:
  When & How Often:
  Start Time:
  End Time:
  Details You Want Included (sign-up type, price, description):
  Link (optional):
  Instagram (optional):
  ```

No modal, no database, no edge function. One button click opens the user's email client.

