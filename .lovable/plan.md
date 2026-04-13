## Update browse link copy in AccountPage footer

**File**: `src/pages/AccountPage.tsx` — footer section only

Change the browse link from:

```
Looking for more mics? Browse mics that fit your schedule →
```

To:

```
More stage time is out there. Browse open mics that fit your schedule →
```

Where "Browse open mics that fit your schedule." is a hyperlink opening `/browse` in a new tab (`target="_blank"`).

No other files touched. No signup flow impact — this is a static footer link on the public account page.