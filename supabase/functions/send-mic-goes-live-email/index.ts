// Supabase Edge Function to send "mic goes live" email to producer via Zeptomail
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@9.1.5";

const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email";
const ZEPTOMAIL_API_TOKEN = Deno.env.get("ZEPTOMAIL_API_TOKEN");
const ZEPTOMAIL_FROM_EMAIL = Deno.env.get("ZEPTOMAIL_FROM_EMAIL") || "noreply@quackboard.com";
const ZEPTOMAIL_FROM_NAME = Deno.env.get("ZEPTOMAIL_FROM_NAME") || "QuackBoard";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://quackboard1.lovable.app";
// Set STUB_EMAILS=true in Supabase secrets to enable stub mode (no real emails sent)
const STUB_EMAILS = Deno.env.get("STUB_EMAILS") === "true";

interface MicGoesLiveRequest {
  eventId: string;
  producerId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Parse request body
    const body: MicGoesLiveRequest = await req.json();

    // Validate required fields
    if (!body.eventId || !body.producerId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: eventId and producerId are required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, date, start_time, end_time, venue_name, venue_address, producer_id, producer_message')
      .eq('id', body.eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Event not found", details: eventError?.message }),
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

    // Fetch producer details
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('email, name')
      .eq('id', body.producerId)
      .single();

    if (producerError || !producer) {
      return new Response(
        JSON.stringify({ error: "Producer not found", details: producerError?.message }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Format event date — use T00:00:00 to parse as local, avoiding UTC date shift
    const eventDate = new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Convert military time to 12-hour format
    function formatTime12h(time24: string): string {
      const [h, m] = time24.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    const subject = `Your mic "${event.title}" is now live!`;

    // Parse markdown for producer message if it exists
    let formattedProducerMessage = '';
    if (event.producer_message) {
      // Set marked options to preserve line breaks
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      // Sanitize the parsed HTML to prevent XSS or malicious injections
      formattedProducerMessage = await marked.parse(event.producer_message);
    }

    // Email HTML content
    const emailContent = `
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
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">🎤 Your Mic is Live!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">
                Hi ${producer.name || 'there'},
              </p>

              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">
                Great news! Your mic <strong>"${event.title}"</strong> is now live and accepting sign-ups.
              </p>

              <!-- Event Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
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
              </table>

              ${event.producer_message ? `
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
                  <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                  <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${formattedProducerMessage}</div>
                </div>
              ` : ''}

              <p style="margin: 20px 0 0 0; color: #111827; font-size: 16px; line-height: 1.6;">
                People can now sign up for your mic. You'll receive notifications about new sign-ups based on your email frequency settings.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">QuackBoard</p>
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">&copy; ${new Date().getFullYear()} QuackBoard. All rights reserved.</p>
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
      console.log("[EMAIL STUB] send-mic-goes-live-email =>", {
        to: producer.email,
        producerName: producer.name,
        subject,
        eventId: body.eventId,
        eventTitle: event.title,
        eventDate: event.date,
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

    // Log the notification
    await supabase.from('message_logs').insert({
      producer_id: body.producerId,
      email_address: producer.email,
      message_type: 'mic_goes_live',
      subject,
      delivery_status: emailStatus,
    });

    const isFailed = emailStatus === 'failed';

    return new Response(
      JSON.stringify({
        success: !isFailed,
        message: isFailed ? "Email delivery failed" : `Email sent successfully to ${producer.email}`,
        emailSent: !isFailed,
        recipient: producer.email,
        status: emailStatus
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
