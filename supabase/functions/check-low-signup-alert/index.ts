import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ACCOUNT_ID = "c9f7bec9-9c8a-4e0f-87ff-2e64832c1027";
const SIGNUP_THRESHOLD = 4;
const HOURS_BEFORE = 2;

function eventLocalToUTC(dateStr: string, timeStr: string, tz = "America/Los_Angeles"): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi, s] = timeStr.split(":").map(Number);
  let guess = Date.UTC(y, mo - 1, d, h, mi, s || 0);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).formatToParts(new Date(guess));
    const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value);
    const laUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    const target = Date.UTC(y, mo - 1, d, h, mi, s || 0);
    guess += target - laUTC;
  }
  return new Date(guess);
}

const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email";
const ZEPTOMAIL_API_TOKEN = Deno.env.get("ZEPTOMAIL_API_TOKEN");
const ZEPTOMAIL_FROM_EMAIL = Deno.env.get("ZEPTOMAIL_FROM_EMAIL") || "noreply@quackboard.com";
const ZEPTOMAIL_FROM_NAME = Deno.env.get("ZEPTOMAIL_FROM_NAME") || "QuackBoard";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://quackboard.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find events for this account starting in ~2 hours (window: 1.5h to 2.5h from now)
    const now = new Date();
    const windowStart = new Date(now.getTime() + 90 * 60 * 1000); // 1.5h from now
    const windowEnd = new Date(now.getTime() + 150 * 60 * 1000);  // 2.5h from now

    // Get the account's producer_id via accounts_users
    const { data: accountUser, error: auError } = await supabase
      .from("accounts_users")
      .select("user_id")
      .eq("account_id", ACCOUNT_ID)
      .single();

    if (auError || !accountUser) {
      console.error("Could not find account user:", auError);
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const producerId = accountUser.user_id;

    // Query published events for this producer in the time window
    // We need to combine date + start_time to compare against our window
    const windowStartDate = windowStart.toISOString().split("T")[0];
    const windowEndDate = windowEnd.toISOString().split("T")[0];

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, date, start_time, end_time, venue_name, venue_address, signup_opens_at, sections_config")
      .eq("producer_id", producerId)
      .eq("status", "published")
      .gte("date", windowStartDate)
      .lte("date", windowEndDate);

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      return new Response(JSON.stringify({ error: "Failed to fetch events" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!events || events.length === 0) {
      console.log("No events in the 2-hour window");
      return new Response(JSON.stringify({ message: "No events in window", checked: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Filter events whose date+start_time falls within the window
    const eventsInWindow = events.filter((e) => {
      const eventDateTime = eventLocalToUTC(e.date, e.start_time);
      return eventDateTime >= windowStart && eventDateTime <= windowEnd;
    });

    if (eventsInWindow.length === 0) {
      console.log("No events match the exact time window");
      return new Response(JSON.stringify({ message: "No events in exact window", checked: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Filter out events where signups haven't opened yet
    const nowIso = now.toISOString();
    const eligibleEvents = eventsInWindow.filter((e) => {
      if (!e.signup_opens_at) return true; // No gate = always open
      return e.signup_opens_at <= nowIso;
    });

    if (eligibleEvents.length === 0) {
      console.log("All events in window have signups not yet opened — skipping");
      return new Response(JSON.stringify({ message: "Signups not open yet", checked: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get producer email
    const { data: producer } = await supabase
      .from("producers")
      .select("email, name, slug")
      .eq("id", producerId)
      .single();

    if (!producer?.email) {
      console.error("Producer email not found");
      return new Response(JSON.stringify({ error: "Producer email not found" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const alerts: string[] = [];

    for (const event of eligibleEvents) {
      // Count active bookings
      const { count, error: countError } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .is("cancelled_at", null);

      if (countError) {
        console.error(`Error counting bookings for event ${event.id}:`, countError);
        continue;
      }

      const bookingCount = count || 0;

      // Calculate total slots from sections_config
      let totalSlots = 0;
      try {
        const sections = event.sections_config as Array<{ label: string; slots: number }>;
        totalSlots = sections.reduce((sum: number, s: { slots: number }) => sum + (s.slots || 0), 0);
      } catch {
        totalSlots = 0;
      }

      console.log(`Event "${event.title}" (${event.id}): ${bookingCount}/${totalSlots} signups`);

      if (bookingCount <= SIGNUP_THRESHOLD) {
        // Check if we already sent an alert for this event today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: existingLog } = await supabase
          .from("message_logs")
          .select("id")
          .eq("message_type", "low_signup_alert")
          .eq("email_address", producer.email)
          .gte("sent_at", todayStart.toISOString())
          .like("subject", `%${event.title}%`)
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          console.log(`Already sent low-signup alert for "${event.title}" today — skipping`);
          continue;
        }

        // Format event time
        function formatTime12h(time24: string): string {
          const [h, m] = time24.split(":").map(Number);
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
        }

        const eventDate = new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        const eventTime = formatTime12h(event.start_time);
        const dashboardUrl = `${FRONTEND_URL}/dashboard`;
        const lineupUrl = `${FRONTEND_URL}/events/${event.id}/lineup`;

        const subject = `⚠️ Low Signups: "${event.title}" — only ${bookingCount} signed up`;

        const htmlBody = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="background: linear-gradient(135deg, #e8a820 0%, #d4941a 100%); padding: 40px 30px; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">⚠️ Heads Up — Low Signups</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 40px 30px;">
                          <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">
                            Hey ${producer.name || "there"},
                          </p>
                          <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">
                            Your mic <strong>"${event.title}"</strong> is about 2 hours out and only has <strong>${bookingCount} signup${bookingCount !== 1 ? "s" : ""}</strong> out of ${totalSlots} spots.
                          </p>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                            <tr>
                              <td style="background-color: #f9fafb; padding: 20px;">
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px;">📅 ${eventDate} at ${eventTime}</td></tr>
                                  <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px;">📍 ${event.venue_name}${event.venue_address ? `, ${event.venue_address}` : ""}</td></tr>
                                  <tr><td style="color: #6b7280; font-size: 14px;">🎤 ${bookingCount} / ${totalSlots} spots filled</td></tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                            Just a heads up so you can decide what to do. You can check the lineup or manage the event from your dashboard.
                          </p>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td align="center" style="padding: 8px 0;">
                                <a href="${lineupUrl}" style="display: inline-block; background-color: #34a08c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">View Lineup</a>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="padding: 8px 0;">
                                <a href="${dashboardUrl}" style="display: inline-block; border: 2px solid #e5e7eb; color: #6b7280; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">Go to Dashboard</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">QuackBoard</p>
                          <p style="margin: 0; color: #9ca3af; font-size: 13px;">&copy; ${new Date().getFullYear()} QuackBoard. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `;

        // Send email
        if (!ZEPTOMAIL_API_TOKEN) {
          console.error("ZEPTOMAIL_API_TOKEN not configured");
          continue;
        }

        const authHeader = ZEPTOMAIL_API_TOKEN.startsWith("Zoho-enczapikey")
          ? ZEPTOMAIL_API_TOKEN
          : `Zoho-enczapikey ${ZEPTOMAIL_API_TOKEN}`;

        const res = await fetch(ZEPTOMAIL_API_URL, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: { address: ZEPTOMAIL_FROM_EMAIL, name: ZEPTOMAIL_FROM_NAME },
            to: [{ email_address: { address: producer.email, name: producer.name || "Producer" } }],
            subject,
            htmlbody: htmlBody,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Failed to send alert email: ${res.status} ${errText}`);
        } else {
          console.log(`✅ Low-signup alert sent for "${event.title}" (${bookingCount} signups)`);
          alerts.push(event.title);
        }

        // Log it
        await supabase.from("message_logs").insert({
          producer_id: producerId,
          email_address: producer.email,
          message_type: "low_signup_alert",
          subject,
          delivery_status: res.ok ? "sent" : "failed",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked ${eligibleEvents.length} event(s), sent ${alerts.length} alert(s)`,
        alerts,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
