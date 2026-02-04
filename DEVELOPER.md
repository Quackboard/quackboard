# Quackboard Developer Documentation

Open mic management platform for comedy producers.

## Technology Stack

| Category | Technologies |
|----------|-------------|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| State Management | TanStack React Query |
| Routing | React Router DOM v6 |

## Supabase Access

### Public Credentials (safe in codebase)

- **Project ID:** `dkbahxjibpobbefqufqa`
- **Project URL:** `https://dkbahxjibpobbefqufqa.supabase.co`
- **Anon Key:** Located in `src/integrations/supabase/client.ts`

### Dashboard Access

To access the Supabase dashboard for schema editing, logs, and authentication management:

1. Request an invitation from the project owner
2. Dashboard: https://supabase.com/dashboard/project/dkbahxjibpobbefqufqa

**Dashboard provides access to:**
- Database schema and data editor
- Authentication settings and user management
- Row Level Security (RLS) policies
- Logs and monitoring
- Edge Functions

## Database Schema

| Table | Purpose |
|-------|---------|
| `producers` | User profiles (auto-created on signup) |
| `events` | Open mic events |
| `bookings` | Spot reservations |
| `event_templates` | Recurring event templates |
| `scheduled_messages` | Email scheduling |
| `message_templates` | Email templates |
| `message_logs` | Sent email records |
| `comic_profiles` | Comedian profiles |

### Key Database Features

- **Auto-profile creation:** The `handle_new_user()` trigger automatically creates a `producers` record when a user signs up
- **Types:** Database types are auto-generated in `src/integrations/supabase/types.ts`

## RLS Policies Summary

All tables have Row Level Security enabled:

- **Producers:** Can only access their own data
- **Events:** Published events are publicly viewable; producers manage their own
- **Bookings:** Publicly viewable for published events; producers manage their own event bookings
- **Templates/Messages:** Producers can only access their own

## Local Development

```bash
# Clone the repository
git clone <repo-url>
cd <project-folder>

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
src/
├── pages/           # Route components (Dashboard, CreateMic, etc.)
├── components/      # UI components
│   ├── ui/          # shadcn/ui base components
│   ├── producer/    # Producer-specific components
│   ├── lineup/      # Lineup management components
│   └── dashboard/   # Dashboard components
├── contexts/        # AuthContext for authentication state
├── hooks/           # Custom React hooks
├── integrations/
│   └── supabase/    # Supabase client and types
├── types/           # TypeScript type definitions
├── lib/             # Utility functions
└── assets/          # Images and static assets

supabase/
├── config.toml      # Supabase configuration
└── migrations/      # Database migration SQL files
```

## Email Configuration (Zeptomail)

The application uses Zeptomail for sending booking confirmation emails via a Supabase Edge Function. Email confirmations are sent in three scenarios:

1. **After user signs up for a slot** - When a user successfully books a slot via `SignUpModal`
2. **After producer manually adds someone** - When a producer adds someone to a slot via `AddToSlotModal`
3. **After successful booking creation** - Confirmation email sent automatically after booking is created

### Architecture

Email sending is handled by a Supabase Edge Function (`supabase/functions/send-booking-email/`) which securely calls the Zeptomail API. The frontend calls this Edge Function via the Supabase client, keeping API keys secure on the server side.

### Setting Up the Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Link to your Supabase project**:
   ```bash
   supabase link --project-ref dkbahxjibpobbefqufqa
   ```

3. **Set Edge Function secrets** in Supabase Dashboard:
   - Go to: https://supabase.com/dashboard/project/dkbahxjibpobbefqufqa/settings/functions
   - Add the following secrets:
     - `ZEPTOMAIL_API_TOKEN` - Your Zeptomail Send Mail Token
     - `ZEPTOMAIL_FROM_EMAIL` - Your verified sender email (e.g., `noreply@yourdomain.com`)
     - `ZEPTOMAIL_FROM_NAME` - Sender name (e.g., `QuackBoard`)
     - `FRONTEND_URL` - Your frontend application URL (e.g., `https://yourdomain.com`)

   Or use the CLI:
   ```bash
   supabase secrets set ZEPTOMAIL_API_TOKEN=your_token_here
   supabase secrets set ZEPTOMAIL_FROM_EMAIL=noreply@yourdomain.com
   supabase secrets set ZEPTOMAIL_FROM_NAME=QuackBoard
   supabase secrets set FRONTEND_URL=https://yourdomain.com
   ```

4. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy send-booking-email
   ```

### Getting Zeptomail Credentials

1. Sign up for a Zeptomail account at https://www.zoho.com/zeptomail/
2. Create a Mail Agent and get your Send Mail Token
3. Verify your sending domain
4. Add the token as a secret in Supabase (see above)

### Local Development

For local development, you can test the Edge Function using:

```bash
supabase functions serve send-booking-email
```

The function will be available at `http://localhost:54321/functions/v1/send-booking-email`

### Files

- **Edge Function**: `supabase/functions/send-booking-email/index.ts`
- **Frontend Utility**: `src/lib/email.ts` (calls the Edge Function)

## Booking Cancellation & Alert Preferences

Users can cancel their bookings and manage email alert preferences through a secure link sent in confirmation emails.

### Features

1. **Cancellation Link**: Each booking confirmation email includes a unique cancellation link
2. **Cancel Token**: Each booking has a unique `cancel_token` that allows secure access without authentication
3. **Alert Frequency**: Users can choose their email alert frequency:
   - **Immediate**: Receive emails as soon as updates happen
   - **Daily Summary**: Receive one email per day with all updates
   - **Weekly Summary**: Receive one email per week with all updates
   - **No Alerts**: Only receive booking confirmation emails

### Implementation

- **Cancellation Page**: `src/pages/CancelBooking.tsx` - Public page accessible via `/cancel/:token`
- **Cancel Token**: Generated using `crypto.randomUUID()` when booking is created
- **Alert Preferences**: Currently stored in localStorage (can be migrated to database table if needed)

### Route

- `/cancel/:token` - Public route for managing bookings and alert preferences

## Important Notes

- **Public pages:** `/producer/:slug` routes open in new browser tabs
- **Authentication:** Uses Supabase email/password auth
- **Onboarding:** New users complete onboarding to set up their producer profile
- **Logos:** `src/assets/logo-vertical.png` and `src/assets/logo-horizontal.png`

## Making Database Changes

Database changes are managed through Lovable's migration tool. Migration files are stored in `supabase/migrations/` and are read-only after creation.
