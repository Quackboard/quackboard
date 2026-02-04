# Supabase Edge Functions

This directory contains Supabase Edge Functions, which are server-side TypeScript functions deployed to the Supabase Edge network. They are designed to run close to your users for low latency and can be triggered by various events (e.g., API calls, database changes, scheduled jobs).

## Structure

Each subdirectory within `supabase/functions/` represents a single Edge Function. For example:

- `supabase/functions/send-booking-email/index.ts`
- `supabase/functions/send-producer-notifications/index.ts`
- `supabase/functions/send-daily-notifications/index.ts`
- `supabase/functions/send-weekly-notifications/index.ts`
- `supabase/functions/send-monthly-notifications/index.ts`

Each function typically consists of an `index.ts` file containing the Deno-based TypeScript code.

## Deployment

Supabase Edge Functions can be deployed in a few ways:

1.  **Via CLI:**
    You can deploy functions using the Supabase CLI. Navigate to the root of your project and use the `supabase functions deploy` command:

    ```bash
    supabase functions deploy <function-name>
    # Example:
    supabase functions deploy send-producer-notifications
    ```
    To deploy all functions, you might need to iterate through them or use a script.

2.  **Via Supabase Dashboard Editor:**
    You can also deploy functions directly from the Supabase dashboard.
    - Go to your Supabase project dashboard.
    - Navigate to "Edge Functions".
    - Click on "Deploy a new function" and select "Via Editor".
    - You can then copy and paste the content of the `index.ts` file for the specific function into the editor and deploy it.

## Environment Variables (Secrets)

Edge Functions often require access to sensitive information like API keys or database connection strings. These are stored as "Secrets" in your Supabase project.

To manage secrets:

-   Go to your Supabase project dashboard.
-   Navigate to "Edge Functions" and then select the "Secrets" tab.
-   You can add or update key-value pairs here. These secrets are then accessible within your Edge Functions via `Deno.env.get("YOUR_SECRET_NAME")`.

    For example, in `send-producer-notifications/index.ts`:
    ```typescript
    const ZEPTOMAIL_API_TOKEN = Deno.env.get("ZEPTOMAIL_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    ```

## Function Explanations

### `send-producer-notifications/index.ts`

This is the core notification sending function. It's invoked by the daily, weekly, and monthly notification functions to actually compose and send an email to a producer. It performs the following steps:

1.  **Receives Notification Request:** Takes `producerId`, `frequency` ('daily', 'weekly', 'monthly'), and an optional `date`, `weekStart`, or `monthStart` as input.
2.  **Authenticates and Fetches Producer Data:** Uses the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from environment variables) to connect to Supabase and retrieve the producer's email and name based on `producerId`.
3.  **Determines Reporting Period:** Based on the `frequency` and provided date parameters, it calculates the start and end dates for the reporting period (e.g., yesterday for daily, last Monday for weekly, 1st of last month for monthly).
4.  **Fetches Events:** Queries the `events` table for events associated with the `producerId` that have their `email_frequency` set to the requested `frequency` and fall within the calculated reporting period.
5.  **Fetches Bookings:** For the fetched events, it then queries the `bookings` table to find new bookings created within the reporting period.
6.  **Categorizes Activity:** It categorizes events into:
    -   `micLiveEvents`: Events that were published during the reporting period.
    -   `signupOpenEvents`: Events for which sign-ups opened during the reporting period.
    -   `newBookings`: New bookings made for the producer's events during the period.
7.  **Composes Email Content:** If there's activity, it dynamically generates an HTML email with a summary of:
    -   Mics that went live.
    -   Sign-ups that are now open.
    -   New sign-ups (bookings) for their events.
8.  **Sends Email via Zeptomail:** It uses the `ZEPTOMAIL_API_URL` and `ZEPTOMAIL_API_TOKEN` (from environment variables) to send the composed email to the producer via the Zeptomail API.
9.  **Logs Notification:** Records the sent notification in a `message_logs` table within Supabase.
10. **Handles Errors:** Includes comprehensive error handling for API issues, missing environment variables, or database errors.

### `send-daily-notifications/index.ts`

This function is designed to be triggered daily to send activity summaries for the *previous day* to relevant producers. Its workflow is as follows:

1.  **Calculates Previous Day:** Determines yesterday's date.
2.  **Identifies Daily Notification Producers:** Queries Supabase to find all producers who have at least one event configured with `email_frequency: 'daily'` and that event was active yesterday.
3.  **Invokes `send-producer-notifications`:** For each identified producer, it invokes the `send-producer-notifications` function with `frequency: 'daily'` and yesterday's date.
4.  **Aggregates Results:** Collects the success/failure status of each invocation and logs a summary.

### `send-weekly-notifications/index.ts`

This function is triggered weekly to send activity summaries for the *previous week* to relevant producers. It works as follows:

1.  **Calculates Previous Week's Monday:** Determines the date of the Monday of the previous week.
2.  **Identifies Weekly Notification Producers:** Queries Supabase to find all producers who have at least one event configured with `email_frequency: 'weekly'` and that event was active in the previous week.
3.  **Invokes `send-producer-notifications`:** For each identified producer, it invokes the `send-producer-notifications` function with `frequency: 'weekly'` and the start date of the previous week.
4.  **Aggregates Results:** Collects the success/failure status of each invocation and logs a summary.

### `send-monthly-notifications/index.ts`

This function is triggered monthly to send activity summaries for the *previous month* to relevant producers. Its steps are:

1.  **Calculates Previous Month's First Day:** Determines the first day of the previous month.
2.  **Identifies Monthly Notification Producers:** Queries Supabase to find all producers who have at least one event configured with `email_frequency: 'monthly'` and that event was active in the previous month.
3.  **Invokes `send-producer-notifications`:** For each identified producer, it invokes the `send-producer-notifications` function with `frequency: 'monthly'` and the first day of the previous month.
4.  **Aggregates Results:** Collects the success/failure status of each invocation and logs a summary.

## Scheduling (Cron Jobs)

Some functions, like the daily, weekly, and monthly notification functions, are designed to run on a schedule. This is typically achieved using cron jobs or a similar scheduling service configured outside of the function itself (e.g., via a cloud provider's scheduler or a `cron.yaml` file if using a platform like Google Cloud Run with Cloud Scheduler).

Examples of cron expressions for scheduling:

-   **Daily Notifications (9:00 AM daily):**
    ```cron
    0 9 * * * supabase functions invoke send-daily-notifications
    ```
-   **Weekly Notifications (9:00 AM Mondays):**
    ```cron
    0 9 * * 1 supabase functions invoke send-weekly-notifications
    ```
-   **Monthly Notifications (9:00 AM on 1st of month):**
    ```cron
    0 9 1 * * supabase functions invoke send-monthly-notifications
    ```
    Note: The `supabase functions invoke` command shown above is a conceptual representation for scheduling. In a production environment, you would use a dedicated cron job runner or cloud-native scheduler to trigger the function's HTTP endpoint.
