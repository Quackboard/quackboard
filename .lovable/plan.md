

## Plan: Re-scaffold Auth Email Infrastructure and Restore Branding

### What's happening

The `auth-email-hook` Edge Function exists but the underlying email queue infrastructure (pgmq queues, `enqueue_email` RPC, `email_send_log` table, `process-email-queue` dispatcher) was never created. Re-scaffolding will trigger the infrastructure setup automatically.

### Steps

1. **Re-scaffold auth email templates** with overwrite enabled -- this recreates the hook and triggers the missing queue infrastructure setup

2. **Restore Quackboard branding** to all 6 email templates:
   - Teal gradient headers (`#34a08c` to `#298070`)
   - Quackboard logo from `favicon.png`
   - Custom copy (e.g. "Hey! Here's your magic link 🪄", "No worries — it happens!")
   - Brand footer: "Sent by Quackboard · Open mic management for comedy producers"
   - All templates already have the correct styling in the codebase -- I'll read and re-apply after scaffold overwrites them

3. **Deploy** the `auth-email-hook` Edge Function

4. **Verify** setup status and confirm emails will start flowing from `notify.quackboard.com`

### What changes

- `supabase/functions/auth-email-hook/index.ts` -- regenerated with queue-based sending
- `supabase/functions/_shared/email-templates/*.tsx` -- regenerated then re-branded
- Database: queue infrastructure tables and functions created automatically
- No frontend changes

