

## Fix Cancellation Link SSL Error

### What's wrong
The `send-booking-email` edge function builds cancel/dashboard URLs using broken domain logic that strips `.supabase.co` and produces invalid URLs like `https://dkbahxjibpobbefqufqa/cancel/...`.

### Changes

**File: `supabase/functions/send-booking-email/index.ts`**

1. Update the default `FRONTEND_URL` fallback from `"https://dkbahxjibpobbefqufqa.supabase.co"` to `"https://quackboard1.lovable.app"`
2. Remove the broken URL-stripping logic (lines 155-159) and use `FRONTEND_URL` directly:

```typescript
// Before (broken):
const baseUrl = FRONTEND_URL.includes('.supabase.co')
  ? FRONTEND_URL.replace('.supabase.co', '').replace('https://', 'https://')
  : FRONTEND_URL;
const cancelUrl = `${baseUrl}/cancel/${body.cancelToken}`;
const producerDashboardUrl = `${baseUrl}/dashboard`;

// After (fixed):
const cancelUrl = `${FRONTEND_URL}/cancel/${body.cancelToken}`;
const producerDashboardUrl = `${FRONTEND_URL}/dashboard`;
```

3. Deploy the updated edge function

### Note
The `FRONTEND_URL` secret is already configured in Supabase. If it's currently set to the Supabase project URL, you should update it in your Supabase dashboard (Edge Functions > Secrets) to `https://quackboard1.lovable.app` (or `https://quackboard.com` once the custom domain is active).

