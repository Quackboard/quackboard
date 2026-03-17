

## Improving Your Magic Link Emails

Right now, your magic link emails use Supabase's default templates — plain, unbranded emails that often look like spam to recipients. To fix this, you need two things:

### 1. Set Up a Custom Email Domain

Before we can customize the email templates, we need to configure a sender domain so emails come from your own brand (e.g., `noreply@quackboard.com`) instead of Supabase's default address. This alone dramatically improves deliverability and trust.

No email domain is currently configured for this project.

### 2. Scaffold Branded Auth Email Templates

Once the domain is set, we'll create custom-branded templates for all auth emails (magic links, signup confirmations, etc.) that match Quackboard's visual identity:

- **Teal gradient header** matching your existing email style (`#34a08c` to `#298070`)
- **Quackboard logo** in the header
- **Casual, on-brand copy** (e.g., "Hey! Here's your magic link" instead of generic text)
- **Consistent styling** with your booking confirmation emails (600px card, border-radius, branded footer)
- **Proper sender name** ("Quackboard" from your domain)

### Steps

1. **Set up email domain** — you'll configure your sender domain through a setup dialog
2. **Scaffold auth email templates** — creates 6 branded React Email templates (magic link, signup, recovery, invite, email change, reauthentication)
3. **Apply Quackboard branding** — teal colors, duck logo, matching tone
4. **Deploy** the auth-email-hook edge function

### What Changes

- New edge function: `supabase/functions/auth-email-hook/`
- New templates: `supabase/functions/_shared/email-templates/` (6 files)
- Updated `supabase/config.toml` with function config

The first step is setting up the sender domain. Once that's done, I'll scaffold and style everything to match your existing email design.

