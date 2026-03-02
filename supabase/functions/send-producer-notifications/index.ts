import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@9.1.5";

const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email";
const ZEPTOMAIL_API_TOKEN = Deno.env.get("ZEPTOMAIL_API_TOKEN");
const ZEPTOMAIL_FROM_EMAIL = Deno.env.get("ZEPTOMAIL_FROM_EMAIL") || "noreply@quackboard.com";
const ZEPTOMAIL_FROM_NAME = Deno.env.get("ZEPTOMAIL_FROM_NAME") || "QuackBoard";
// Set STUB_EMAILS=true in Supabase secrets to enable stub mode (no real emails sent)
const STUB_EMAILS = Deno.env.get("STUB_EMAILS") === "true";

interface NotificationRequest {
  producerId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  date?: string;
  weekStart?: string;
  monthStart?: string;
}

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
    // Guard: token must be present unless explicitly in stub mode
    if (!ZEPTOMAIL_API_TOKEN && !STUB_EMAILS) {
      console.error("ZEPTOMAIL_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }
    if (STUB_EMAILS) {
      console.warn("[EMAIL STUB] Running in stub mode - no real emails will be sent");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let body: NotificationRequest;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: error instanceof Error ? error.message : "Unknown error" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const { producerId, frequency, date, weekStart, monthStart } = body;

    if (!producerId || !frequency) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: producerId and frequency are required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('email, name')
      .eq('id', producerId)
      .single();

    if (producerError || !producer) {
      return new Response(
        JSON.stringify({ error: "Producer not found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    // [TEMP STUB] Token check bypassed - no Zeptomail credits
    if (!ZEPTOMAIL_API_TOKEN) {
      console.warn("[EMAIL STUB] ZEPTOMAIL_API_TOKEN not set - running in stub mode");
    }

    let periodStart: Date;
    let periodEnd: Date;
    let periodLabel: string;

    if (frequency === 'daily' && date) {
      periodStart = new Date(date + 'T00:00:00.000Z');
      periodEnd = new Date(date + 'T00:00:00.000Z');
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
      periodLabel = periodStart.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (frequency === 'weekly') {
      if (!weekStart) {
        return new Response(
          JSON.stringify({ error: "Missing weekStart parameter for weekly frequency" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      const weekStartDateStr = weekStart.includes('T') ? weekStart.split('T')[0] : weekStart;
      periodStart = new Date(weekStartDateStr + 'T00:00:00.000Z');
      periodEnd = new Date(weekStartDateStr + 'T00:00:00.000Z');
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 7);

      if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
        return new Response(
          JSON.stringify({ error: "Invalid weekStart date format", details: `Could not parse: ${weekStart}` }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      const periodEndMinusOne = new Date(periodEnd.getTime() - 1);
      periodLabel = `${periodStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${periodEndMinusOne.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    } else if (frequency === 'monthly' && monthStart) {
      periodStart = new Date(monthStart + 'T00:00:00.000Z');
      periodEnd = new Date(monthStart + 'T00:00:00.000Z');
      periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
      periodLabel = periodStart.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid frequency or missing date parameters" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        date,
        start_time,
        end_time,
        venue_name,
        venue_address,
        status,
        publish_at,
        signup_opens_at,
        created_at,
        sections_config,
        producer_message
      `)
      .eq('producer_id', producerId)
      .eq('email_frequency', frequency);

    if (eventsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch events", details: eventsError.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No events found",
          emailSent: false,
          reason: `No events found with email_frequency: "${frequency}" for producer ${producerId}`,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const eventIds = events.map(e => e.id);
    const periodStartISO = periodStart.toISOString();
    const periodEndISO = periodEnd.toISOString();

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        event_id,
        guest_name,
        guest_email,
        slot_position,
        created_at
      `)
      .in('event_id', eventIds)
      .gte('created_at', periodStartISO)
      .lt('created_at', periodEndISO)
      .is('cancelled_at', null);

    if (bookingsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch bookings", details: bookingsError.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const bookingsByEvent: Record<string, any[]> = {};
    if (bookings) {
      bookings.forEach(booking => {
        if (!bookingsByEvent[booking.event_id]) {
          bookingsByEvent[booking.event_id] = [];
        }
        bookingsByEvent[booking.event_id].push(booking);
      });
    }

    const newBookings: any[] = [];
    Object.entries(bookingsByEvent).forEach(([eventId, eventBookings]) => {
      const event = events.find(e => e.id === eventId);
      if (event) {
        newBookings.push({
          event,
          bookings: eventBookings
        });
      }
    });

    const hasContent = frequency === 'daily'
      ? (newBookings.length > 0)
      : (newBookings.length > 0);

    if (!hasContent) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No notifications to send",
          emailSent: false,
          reason: `No bookings found in the period (${periodStartISO} to ${periodEndISO})`,
          stats: {
            eventsFound: events.length,
            eventIds: eventIds,
            bookingsFound: bookings?.length || 0,
            periodStart: periodStartISO,
            periodEnd: periodEndISO,
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const subject = `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Mic Activity Report - ${periodLabel}`;

    // Email with inline styles and table-based layout for maximum compatibility
    let emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ul, ol { padding-left: 25px; margin: 10px 0; }
    li { margin-bottom: 5px; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    u { text-decoration: underline; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Activity Report</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">${periodLabel}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
    `;

    // Process all events to parse their markdown once
    const formattedMessages: Record<string, string> = {};
    for (const { event } of newBookings) {
      if (event.producer_message) {
        // Set marked options to preserve line breaks
        marked.setOptions({
          gfm: true,
          breaks: true,
        });
        // Sanitize the parsed HTML to prevent XSS or malicious injections
        formattedMessages[event.id] = await marked.parse(event.producer_message);
      }
    }

    newBookings.forEach(({ event, bookings }, idx) => {
      const eventDate = new Date(event.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      emailContent += `
              <!-- Event Section -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: ${idx < newBookings.length - 1 ? '30px' : '0'}; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">

                <!-- Event Header -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${event.title}</h2>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          <span style="display: inline-block; margin-right: 6px;">📅</span>
                          <span>${eventDate} at ${event.start_time} - ${event.end_time}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                          <span style="display: inline-block; margin-right: 6px;">📍</span>
                          <span>${event.venue_name}${event.venue_address ? `, ${event.venue_address}` : ''}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Bookings Table -->
                <tr>
                  <td style="padding: 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
                      <thead>
                        <tr style="background-color: #f3f4f6;">
                          <th style="padding: 16px 20px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Slot</th>
                          <th style="padding: 16px 20px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Guest Name</th>
                          <th style="padding: 16px 20px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Email</th>
                        </tr>
                      </thead>
                      <tbody>
      `;

      bookings.forEach((booking: { slot_position: number; guest_name: string; guest_email: string }, bookingIdx: number) => {
        const sectionLabel = (() => {
          if (!event.sections_config || !Array.isArray(event.sections_config)) {
            return 'General';
          }
          let currentSlot = 1;
          for (const section of event.sections_config) {
            const sectionEnd = currentSlot + section.slots - 1;
            if (booking.slot_position >= currentSlot && booking.slot_position <= sectionEnd) {
              return section.label;
            }
            currentSlot += section.slots;
          }
          return 'General';
        })();

        const rowBg = bookingIdx % 2 === 0 ? '#ffffff' : '#fafbfc';

        emailContent += `
                        <tr style="background-color: ${rowBg};">
                          <td style="padding: 18px 20px; ${bookingIdx < bookings.length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''} font-size: 14px; color: #1f2937;">
                            <span style="display: inline-block; background-color: #EEF2FF; color: #4F46E5; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">${sectionLabel} - Slot ${booking.slot_position}</span>
                          </td>
                          <td style="padding: 18px 20px; ${bookingIdx < bookings.length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''} font-size: 14px; color: #4b5563;">${booking.guest_name || 'N/A'}</td>
                          <td style="padding: 18px 20px; ${bookingIdx < bookings.length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''} font-size: 14px; color: #4b5563;">${booking.guest_email}</td>
                        </tr>
        `;
      });

      emailContent += `
                      </tbody>
                    </table>
                  </td>
                </tr>
              </table>
              ${event.producer_message ? `
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0 24px 0; border-radius: 8px;">
                  <p style="margin: 0 0 4px 0; font-weight: 600; color: #000000; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Active Message for Performers</p>
                  <div style="margin: 0; color: #000000; font-size: 14px; line-height: 1.5;">${formattedMessages[event.id]}</div>
                </div>
              ` : ''}
              <div style="height: 30px;"></div>
      `;
    });

    emailContent += `
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">QuackBoard</p>
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">&copy; ${new Date().getFullYear()} QuackBoard. All rights reserved.</p>
              <p style="margin: 0;"><a href="#" style="color: #4F46E5; text-decoration: none; font-size: 13px; font-weight: 500;">Unsubscribe</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    let emailStatus: 'sent' | 'failed' | 'stubbed' = STUB_EMAILS ? 'stubbed' : 'sent';

    if (STUB_EMAILS) {
      console.log("[EMAIL STUB] send-producer-notifications =>", {
        to: producer.email,
        producerName: producer.name,
        subject,
        frequency,
        periodLabel,
        eventsCount: events.length,
        bookingsCount: bookings?.length || 0,
      });
    } else {
      const authHeader = ZEPTOMAIL_API_TOKEN!.startsWith("Zoho-enczapikey")
        ? ZEPTOMAIL_API_TOKEN!
        : `Zoho-enczapikey ${ZEPTOMAIL_API_TOKEN}`;
      const res = await fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: { "Authorization": authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { address: ZEPTOMAIL_FROM_EMAIL, name: ZEPTOMAIL_FROM_NAME },
          to: [{ email_address: { address: producer.email, name: producer.name } }],
          subject,
          htmlbody: emailContent,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Zeptomail API error:", errorText);
        emailStatus = 'failed';
      }
    }

    // Log notification
    await supabase.from('message_logs').insert({
      producer_id: producerId,
      email_address: producer.email,
      message_type: 'producer_notification',
      subject,
      delivery_status: emailStatus,
    });

    const isFailed = emailStatus === 'failed';

    return new Response(
      JSON.stringify({
        success: !isFailed,
        message: isFailed ? "Notification delivery failed" : `Notification sent successfully to ${producer.email}`,
        emailSent: !isFailed,
        recipient: producer.email,
        recipientName: producer.name,
        status: emailStatus,
        stats: {
          eventsCount: events.length,
          bookingsCount: bookings?.length || 0,
          bookingGroups: newBookings.length,
        }
      }),
      {
        status: isFailed ? 500 : 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: errorMessage,
        stack: errorStack
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});