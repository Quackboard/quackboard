// Supabase Edge Function to send booking confirmation emails via Zeptomail
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

interface EmailRequest {
  bookingId: string;
  cancelToken: string;
  guestEmail: string;
  guestName: string;
  slotPosition: number;
  sectionLabel: string;
  event: {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    venue_name: string;
    venue_address: string | null;
    producer_id: string;
    producer_message: string | null;
  };
  isManualAdd?: boolean;
  isCancellation?: boolean; // Add this field
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
    const body: EmailRequest = await req.json();

    // Validate required fields
    if (!body.guestEmail || !body.guestName || !body.event || !body.bookingId || !body.cancelToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Validate producer_id is present
    if (!body.event.producer_id) {
      console.error("Producer ID is missing from event data");
      return new Response(
        JSON.stringify({ error: "Producer ID is required" }),
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

    // Fetch event details to get email_frequency
    // We need to get the event_id from the booking to fetch the event
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('event_id')
      .eq('id', body.bookingId)
      .single();

    let emailFrequency: string | null = null;
    if (bookingData?.event_id) {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('email_frequency, producer_message')
        .eq('id', bookingData.event_id)
        .single();

      if (eventData) {
        // Set marked options to preserve line breaks
        marked.setOptions({
          gfm: true,
          breaks: true,
        });
        body.event = {
          ...body.event,
          producer_message: eventData.producer_message,
        };
      }

      if (eventError) {
        console.error(`Error fetching event email_frequency:`, eventError);
      } else {
        // Normalize the email_frequency value (trim whitespace, lowercase)
        const rawFrequency = eventData?.email_frequency;
        if (rawFrequency) {
          const normalized = String(rawFrequency).trim().toLowerCase();
          emailFrequency = normalized || null;
        } else {
          emailFrequency = null;
        }
      }
    } else {
      console.log('No booking data found for ID:', body.bookingId);
    }

    // Fetch producer details
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('email, name, timezone, slug')
      .eq('id', body.event.producer_id)
      .single();

    if (producerError || !producer) {
      console.error("Error fetching producer:", producerError || "Producer not found");
      // Continue to send email to guest even if producer not found
    }

    // Build cancellation and preferences URL
    const cancelUrl = `${FRONTEND_URL}/cancel/${body.cancelToken}`;
    const producerDashboardUrl = `${FRONTEND_URL}/dashboard`;

    // Format date — append T00:00 to parse as local midnight, avoiding UTC date shift
    const eventDate = new Date(`${body.event.date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Convert military time (e.g. "18:00") to 12-hour format (e.g. "6:00 PM")
    function formatTime12h(time24: string): string {
      const [h, m] = time24.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    const eventTime = `${formatTime12h(body.event.start_time)} - ${formatTime12h(body.event.end_time)}`;
    const venueInfo = body.event.venue_address
      ? `${body.event.venue_name}, ${body.event.venue_address}`
      : body.event.venue_name;

    // Parse markdown for producer message if it exists
    let formattedProducerMessage = '';
    if (body.event.producer_message) {
      // Sanitize the parsed HTML to prevent XSS or malicious injections
      formattedProducerMessage = await marked.parse(body.event.producer_message);
    }

    const producerName = producer?.name || 'Producer';
    const guestSubject = body.isCancellation
      ? `Booking Canceled: ${producerName} - ${body.event.title} on ${eventDate} at ${formatTime12h(body.event.start_time)}`
      : (body.isManualAdd
        ? `You've been added to ${producerName} - ${body.event.title} on ${eventDate} at ${formatTime12h(body.event.start_time)}`
        : `Booking Confirmed: ${producerName} - ${body.event.title} on ${eventDate} at ${formatTime12h(body.event.start_time)}`);

    const guestHeading = body.isCancellation ? "Booking Canceled" : (body.isManualAdd ? "🎤 You've Been Added!" : "✅ Booking Confirmed!");
    const guestIntro = body.isCancellation
      ? `Your booking for <strong>"${body.event.title}"</strong> (${body.sectionLabel}) has been successfully canceled.`
      : (body.isManualAdd
        ? `You've been added to <strong>"${body.event.title}"</strong> by the producer.`
        : `Your booking for <strong>"${body.event.title}"</strong> has been confirmed!`);

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
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #34a08c 0%, #298070 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">${guestHeading}</h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${body.guestName},</p>
                      <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">${guestIntro}</p>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                        <tr>
                          <td style="background-color: #f9fafb; padding: 24px;">
                            <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${body.event.title}</h2>
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📅</span><span>${eventDate} at ${eventTime}</span></td></tr>
                              <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📍</span><span>${venueInfo}</span></td></tr>
                              <tr><td style="color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">🎯</span><span><strong>${body.sectionLabel}</strong> · Spot #${body.slotPosition}</span></td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      ${body.event.producer_message ? `
                        <div style="background-color: #FFF8E1; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 8px;">
                          <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                          <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${formattedProducerMessage}</div>
                        </div>
                      ` : ''}

                      ${body.isCancellation ? `
                        <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">If you have any questions, please contact the event producer.</p>
                      ` : `
                        <p style="margin: 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">We look forward to seeing you there!</p>
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 10px 0;">
                              <a href="${FRONTEND_URL}/producer/${producer?.slug || body.event.producer_id}" style="display: inline-block; background-color: #34a08c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Go to Event Page</a>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding: 10px 0;">
                              <a href="${cancelUrl}" style="display: inline-block; border: 2px solid #e5e7eb; color: #6b7280; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">Cancel Your Booking</a>
                            </td>
                          </tr>
                        </table>
                      `}
                    </td>
                  </tr>
                  <!-- Footer -->
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

    let guestEmailStatus: 'sent' | 'failed' | 'stubbed' = STUB_EMAILS ? 'stubbed' : 'sent';
    let producerEmailStatus: 'sent' | 'failed' | 'stubbed' | 'not_sent' = 'not_sent';

    if (!STUB_EMAILS) {
      const authHeader = ZEPTOMAIL_API_TOKEN!.startsWith("Zoho-enczapikey")
        ? ZEPTOMAIL_API_TOKEN!
        : `Zoho-enczapikey ${ZEPTOMAIL_API_TOKEN}`;

      const res = await fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: { "Authorization": authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { address: ZEPTOMAIL_FROM_EMAIL, name: ZEPTOMAIL_FROM_NAME },
          to: [{ email_address: { address: body.guestEmail, name: body.guestName } }],
          subject: guestSubject,
          htmlbody: guestHtmlBody,
        }),
      });

      const responseText = await res.text();
      if (!res.ok) {
        console.error("Zeptomail API error (Guest):", res.status, responseText);
        guestEmailStatus = 'failed';
      } else {
        console.log(`✅ Guest email sent successfully to ${body.guestEmail} | Booking: ${body.bookingId} | Spot: ${body.slotPosition} | Response: ${responseText.substring(0, 200)}`);
      }
    } else {
      console.log("[EMAIL STUB] send-booking-email => GUEST EMAIL", {
        to: body.guestEmail,
        guestName: body.guestName,
        subject: guestSubject,
        bookingId: body.bookingId,
        slotPosition: body.slotPosition,
        sectionLabel: body.sectionLabel,
        isManualAdd: body.isManualAdd,
        isCancellation: body.isCancellation,
        eventTitle: body.event.title,
      });
    }

    // Log guest notification
    await supabase.from('message_logs').insert({
      booking_id: body.bookingId,
      email_address: body.guestEmail,
      message_type: body.isCancellation ? 'booking_cancellation_guest' : 'booking_confirmation_guest',
      subject: guestSubject,
      delivery_status: guestEmailStatus,
    });

    // --- Producer Email Content ---
    // IMPORTANT: Cancellation emails should ALWAYS be sent immediately, regardless of email_frequency
    // For new bookings: Only send immediate producer email if email_frequency is explicitly 'immediate'
    // For 'daily' new bookings, the scheduled notification functions will handle it
    const normalizedFrequency = emailFrequency ? String(emailFrequency).trim().toLowerCase() : null;
    const isCancellation = body.isCancellation === true;
    const shouldSendImmediateProducerEmail = producer && (
      isCancellation || // Always send cancellation emails immediately
      normalizedFrequency === 'immediate' // Only send new booking emails for immediate frequency
    );

    console.log(`Producer email check - producer: ${!!producer}, isCancellation: ${isCancellation}, emailFrequency: "${emailFrequency}" (normalized: "${normalizedFrequency}"), shouldSend: ${shouldSendImmediateProducerEmail}`);

    if (!shouldSendImmediateProducerEmail && producer && !isCancellation) {
      console.log(`Skipping immediate producer email - email_frequency is "${normalizedFrequency}" (not 'daily'). Will be included in scheduled ${normalizedFrequency || 'none'} notifications.`);
    }

    if (shouldSendImmediateProducerEmail) {
      const producerSubject = body.isCancellation
        ? `Booking Canceled for ${body.event.title} - Slot ${body.slotPosition}`
        : `New Booking for ${body.event.title} - Slot ${body.slotPosition}`;

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
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #34a08c 0%, #298070 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">${body.isCancellation ? "Booking Canceled" : "🎉 New Booking!"}</h1>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${producer.name},</p>
                        ${body.isCancellation
                          ? `<p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">A booking for your event <strong>"${body.event.title}"</strong> (${body.sectionLabel}), made by ${body.guestName}, has been canceled.</p>`
                          : `<p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;"><strong>${body.guestName}</strong> (${body.guestEmail}) has signed up for your event <strong>"${body.event.title}"</strong>!</p>`
                        }
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                          <tr>
                            <td style="background-color: #f9fafb; padding: 24px; border-bottom: 2px solid #e5e7eb;">
                              <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${body.event.title}</h2>
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
                                <tr><td style="padding-bottom: 8px; color: #4b5563; font-size: 14px;"><strong>Section:</strong> ${body.sectionLabel}</td></tr>
                                <tr><td style="color: #4b5563; font-size: 14px;"><strong>Spot:</strong> #${body.slotPosition}</td></tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        ${body.event.producer_message ? `
                          <div style="background-color: #FFF8E1; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                            <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${formattedProducerMessage}</div>
                          </div>
                        ` : ''}

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
                    <!-- Footer -->
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

      producerEmailStatus = STUB_EMAILS ? 'stubbed' : 'sent';

      if (STUB_EMAILS) {
        console.log("[EMAIL STUB] send-booking-email => PRODUCER EMAIL", {
          to: producer.email,
          producerName: producer.name,
          subject: producerSubject,
          bookingId: body.bookingId,
          guestName: body.guestName,
          isCancellation: body.isCancellation,
          eventTitle: body.event.title,
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
            subject: producerSubject,
            htmlbody: producerHtmlBody,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Zeptomail API error (Producer):", errorText);
          producerEmailStatus = 'failed';
        }
      }
      // Log producer notification
      await supabase.from('message_logs').insert({
        booking_id: body.bookingId,
        email_address: producer.email,
        message_type: body.isCancellation ? 'booking_cancellation_producer' : 'booking_confirmation_producer',
        subject: producerSubject,
        delivery_status: producerEmailStatus,
      });
    }

    const anyFailed = guestEmailStatus === 'failed' || (producer && typeof producerEmailStatus !== 'undefined' && producerEmailStatus === 'failed');

    return new Response(
      JSON.stringify({
        success: !anyFailed,
        message: anyFailed ? "One or more emails failed to send" : "Emails sent successfully",
        guestStatus: guestEmailStatus,
        producerStatus: producerEmailStatus
      }),
      {
        status: anyFailed ? 500 : 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-booking-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
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
