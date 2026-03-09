// Atomic booking creation: INSERT + email in one transaction.
// If the guest email fails after retries, the booking is rolled back.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@9.1.5";

const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email";
const ZEPTOMAIL_API_TOKEN = Deno.env.get("ZEPTOMAIL_API_TOKEN");
const ZEPTOMAIL_FROM_EMAIL = Deno.env.get("ZEPTOMAIL_FROM_EMAIL") || "noreply@quackboard.com";
const ZEPTOMAIL_FROM_NAME = Deno.env.get("ZEPTOMAIL_FROM_NAME") || "QuackBoard";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://quackboard1.lovable.app";
const STUB_EMAILS = Deno.env.get("STUB_EMAILS") === "true";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateBookingRequest {
  eventId: string;
  slotPosition: number;
  guestName: string;
  guestEmail: string;
  guestInstagram?: string;
  allowMultipleSpots: boolean;
  isManualAdd: boolean;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getSectionLabel(
  slotPosition: number,
  sectionsConfig: Array<{ label: string; slots: number }> | null,
): string {
  if (!sectionsConfig || sectionsConfig.length === 0) return "General";
  let currentSlot = 1;
  for (const section of sectionsConfig) {
    const sectionEnd = currentSlot + section.slots - 1;
    if (slotPosition >= currentSlot && slotPosition <= sectionEnd) {
      return section.label;
    }
    currentSlot += section.slots;
  }
  return "General";
}

async function sendZeptomail(
  to: { address: string; name: string },
  subject: string,
  htmlbody: string,
): Promise<boolean> {
  if (STUB_EMAILS) {
    console.log("[EMAIL STUB] create-booking =>", { to: to.address, subject });
    return true;
  }
  if (!ZEPTOMAIL_API_TOKEN) {
    console.error("ZEPTOMAIL_API_TOKEN not configured");
    return false;
  }

  const authHeader = ZEPTOMAIL_API_TOKEN.startsWith("Zoho-enczapikey")
    ? ZEPTOMAIL_API_TOKEN
    : `Zoho-enczapikey ${ZEPTOMAIL_API_TOKEN}`;

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { address: ZEPTOMAIL_FROM_EMAIL, name: ZEPTOMAIL_FROM_NAME },
          to: [{ email_address: to }],
          subject,
          htmlbody,
        }),
      });
      const text = await res.text();
      if (res.ok) {
        console.log(`✅ Email sent to ${to.address} | Subject: ${subject} | Response: ${text.substring(0, 200)}`);
        return true;
      }
      console.error(`Zeptomail error attempt ${attempt + 1}/${MAX_RETRIES + 1}: ${res.status} ${text}`);
    } catch (err) {
      console.error(`Zeptomail fetch error attempt ${attempt + 1}/${MAX_RETRIES + 1}:`, err);
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body: CreateBookingRequest = await req.json();

    // Validate required fields
    if (!body.eventId || !body.slotPosition || !body.guestName || !body.guestEmail) {
      return new Response(
        JSON.stringify({ success: false, code: "invalid_request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Step 1: Duplicate email check ───────────────────────────────────
    if (!body.allowMultipleSpots) {
      const { data: existingByEmail } = await supabase
        .from("bookings")
        .select("id")
        .eq("event_id", body.eventId)
        .eq("guest_email", body.guestEmail.toLowerCase())
        .is("cancelled_at", null)
        .maybeSingle();

      if (existingByEmail) {
        return new Response(
          JSON.stringify({ success: false, code: "duplicate_email" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── Step 2: Generate cancel token + INSERT ──────────────────────────
    const cancelToken = crypto.randomUUID();

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        event_id: body.eventId,
        slot_position: body.slotPosition,
        guest_name: body.guestName,
        guest_email: body.guestEmail,
        guest_instagram: body.guestInstagram || null,
        cancel_token: cancelToken,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ success: false, code: "slot_taken" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, code: "booking_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bookingId = booking.id;

    // ── Step 3: Fetch canonical event + producer data from DB ───────────
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("title, date, start_time, end_time, venue_name, venue_address, producer_id, producer_message, email_frequency, sections_config")
      .eq("id", body.eventId)
      .single();

    if (eventError || !event || !event.producer_id) {
      console.error("Event fetch error after insert:", eventError);
      // Rollback
      await supabase.from("bookings").delete().eq("id", bookingId);
      return new Response(
        JSON.stringify({ success: false, code: "booking_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: producer } = await supabase
      .from("producers")
      .select("email, name, slug")
      .eq("id", event.producer_id)
      .single();

    // ── Step 4: Derive section label from DB sections_config ────────────
    const sectionsConfig = Array.isArray(event.sections_config) ? event.sections_config as Array<{ label: string; slots: number }> : null;
    const sectionLabel = getSectionLabel(body.slotPosition, sectionsConfig);

    // ── Step 5: Build guest email HTML ──────────────────────────────────
    const eventDate = new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const eventTime = `${formatTime12h(event.start_time)} - ${formatTime12h(event.end_time)}`;
    const venueInfo = event.venue_address ? `${event.venue_name}, ${event.venue_address}` : event.venue_name;
    const cancelUrl = `${FRONTEND_URL}/cancel/${cancelToken}`;
    const producerName = producer?.name || "Producer";
    const producerSlug = producer?.slug || event.producer_id;

    let formattedProducerMessage = "";
    if (event.producer_message) {
      marked.setOptions({ gfm: true, breaks: true });
      formattedProducerMessage = await marked.parse(event.producer_message);
    }

    const guestSubject = body.isManualAdd
      ? `You've been added to ${producerName} - ${event.title} on ${eventDate} at ${formatTime12h(event.start_time)}`
      : `Booking Confirmed: ${producerName} - ${event.title} on ${eventDate} at ${formatTime12h(event.start_time)}`;

    const guestHeading = body.isManualAdd ? "🎤 You've Been Added!" : "✅ Booking Confirmed!";
    const guestIntro = body.isManualAdd
      ? `You've been added to <strong>"${event.title}"</strong> by the producer.`
      : `Your booking for <strong>"${event.title}"</strong> has been confirmed!`;

    const guestHtmlBody = `
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
                  <tr>
                    <td style="background: linear-gradient(135deg, #34a08c 0%, #298070 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">${guestHeading}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${body.guestName},</p>
                      <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">${guestIntro}</p>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                        <tr>
                          <td style="background-color: #f9fafb; padding: 24px;">
                            <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${event.title}</h2>
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📅</span><span>${eventDate} at ${eventTime}</span></td></tr>
                              <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📍</span><span>${venueInfo}</span></td></tr>
                              <tr><td style="color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">🎯</span><span><strong>${sectionLabel}</strong> · Spot #${body.slotPosition}</span></td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      ${event.producer_message ? `
                        <div style="background-color: #FFF8E1; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 8px;">
                          <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                          <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${formattedProducerMessage}</div>
                        </div>
                      ` : ""}

                      <p style="margin: 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">We look forward to seeing you there!</p>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <a href="${FRONTEND_URL}/producer/${producerSlug}" style="display: inline-block; background-color: #34a08c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Go to Event Page</a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <a href="${cancelUrl}" style="display: inline-block; border: 2px solid #e5e7eb; color: #6b7280; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">Cancel Your Booking</a>
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

    // ── Step 6: Send guest email ────────────────────────────────────────
    const guestEmailOk = await sendZeptomail(
      { address: body.guestEmail, name: body.guestName },
      guestSubject,
      guestHtmlBody,
    );

    if (!guestEmailOk) {
      // ROLLBACK: delete the booking so the slot is freed
      console.error(`Guest email failed for booking ${bookingId}. Rolling back.`);
      await supabase.from("bookings").delete().eq("id", bookingId);

      // Log the failed attempt
      await supabase.from("message_logs").insert({
        booking_id: bookingId,
        producer_id: event.producer_id,
        email_address: body.guestEmail,
        message_type: "booking_confirmation_guest",
        subject: guestSubject,
        delivery_status: "failed",
        error_message: "Email delivery failed after retries; booking rolled back",
      });

      return new Response(
        JSON.stringify({ success: false, code: "booking_failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Log successful guest email
    await supabase.from("message_logs").insert({
      booking_id: bookingId,
      producer_id: event.producer_id,
      email_address: body.guestEmail,
      message_type: "booking_confirmation_guest",
      subject: guestSubject,
      delivery_status: STUB_EMAILS ? "stubbed" : "sent",
    });

    // ── Step 7: Producer email (best-effort, no rollback) ───────────────
    const normalizedFrequency = event.email_frequency ? String(event.email_frequency).trim().toLowerCase() : null;

    if (producer && normalizedFrequency === "immediate") {
      const producerDashboardUrl = `${FRONTEND_URL}/dashboard`;
      const producerSubject = `New Booking for ${event.title} - Slot ${body.slotPosition}`;

      const producerHtmlBody = `
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
                    <tr>
                      <td style="background: linear-gradient(135deg, #34a08c 0%, #298070 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">🎉 New Booking!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${producer.name},</p>
                        <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;"><strong>${body.guestName}</strong> (${body.guestEmail}) has signed up for your event <strong>"${event.title}"</strong>!</p>
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                          <tr>
                            <td style="background-color: #f9fafb; padding: 24px; border-bottom: 2px solid #e5e7eb;">
                              <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${event.title}</h2>
                              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📅</span><span>${eventDate} at ${eventTime}</span></td></tr>
                                <tr><td style="color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📍</span><span>${venueInfo}</span></td></tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 24px; border-top: 2px solid #e5e7eb;">
                              <p style="margin: 0 0 12px 0; font-weight: 600; color: #34a08c; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Sign Up Details</p>
                              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr><td style="padding-bottom: 8px; color: #4b5563; font-size: 14px;"><strong>Name:</strong> ${body.guestName}</td></tr>
                                <tr><td style="padding-bottom: 8px; color: #4b5563; font-size: 14px;"><strong>Email:</strong> ${body.guestEmail}</td></tr>
                                <tr><td style="padding-bottom: 8px; color: #4b5563; font-size: 14px;"><strong>Section:</strong> ${sectionLabel}</td></tr>
                                <tr><td style="color: #4b5563; font-size: 14px;"><strong>Spot:</strong> #${body.slotPosition}</td></tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        ${event.producer_message ? `
                          <div style="background-color: #FFF8E1; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                            <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${formattedProducerMessage}</div>
                          </div>
                        ` : ""}

                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 20px 0 10px;">
                              <a href="${producerDashboardUrl}" style="display: inline-block; background-color: #34a08c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Go to Dashboard</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; text-align: center;">This is an automated notification. Please do not reply directly to this email.</p>
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

      const producerEmailOk = await sendZeptomail(
        { address: producer.email, name: producer.name },
        producerSubject,
        producerHtmlBody,
      );

      // Log producer email (best-effort — don't rollback for producer email failure)
      await supabase.from("message_logs").insert({
        booking_id: bookingId,
        producer_id: event.producer_id,
        email_address: producer.email,
        message_type: "booking_confirmation_producer",
        subject: producerSubject,
        delivery_status: producerEmailOk ? (STUB_EMAILS ? "stubbed" : "sent") : "failed",
      });

      if (!producerEmailOk) {
        console.error(`Producer email failed for booking ${bookingId}. Booking kept (guest email succeeded).`);
      }
    }

    // ── Step 8: Success ─────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ success: true, bookingId, slotPosition: body.slotPosition }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unhandled error in create-booking:", error);
    return new Response(
      JSON.stringify({ success: false, code: "booking_failed", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
