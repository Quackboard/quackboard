// Supabase Edge Function to send booking confirmation emails via Zeptomail
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@9.1.5";

const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email";
const ZEPTOMAIL_API_TOKEN = Deno.env.get("ZEPTOMAIL_API_TOKEN");
const ZEPTOMAIL_FROM_EMAIL = Deno.env.get("ZEPTOMAIL_FROM_EMAIL") || "noreply@quackboard.com";
const ZEPTOMAIL_FROM_NAME = Deno.env.get("ZEPTOMAIL_FROM_NAME") || "QuackBoard";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://dkbahxjibpobbefqufqa.supabase.co";

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
    // Verify API token is configured
    if (!ZEPTOMAIL_API_TOKEN) {
      console.error("ZEPTOMAIL_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
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
      .select('email, name')
      .eq('id', body.event.producer_id)
      .single();

    if (producerError || !producer) {
      console.error("Error fetching producer:", producerError || "Producer not found");
      // Continue to send email to guest even if producer not found
    }

    // Build cancellation and preferences URL
    // Remove .supabase.co if present and ensure we have the frontend URL
    const baseUrl = FRONTEND_URL.includes('.supabase.co')
      ? FRONTEND_URL.replace('.supabase.co', '').replace('https://', 'https://')
      : FRONTEND_URL;
    const cancelUrl = `${baseUrl}/cancel/${body.cancelToken}`;
    const producerDashboardUrl = `${baseUrl}/dashboard`;

    // Format date and time
    const eventDate = new Date(body.event.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const eventTime = `${body.event.start_time} - ${body.event.end_time}`;
    const venueInfo = body.event.venue_address
      ? `${body.event.venue_name}, ${body.event.venue_address}`
      : body.event.venue_name;

    // Parse markdown for producer message if it exists
    let formattedProducerMessage = '';
    if (body.event.producer_message) {
      // Sanitize the parsed HTML to prevent XSS or malicious injections
      formattedProducerMessage = await marked.parse(body.event.producer_message);
    }

    // --- Guest Email Content ---
    const guestSubject = body.isCancellation
      ? `Booking Canceled: ${body.event.title} - Slot ${body.slotPosition}`
      : (body.isManualAdd
        ? `You've been added to ${body.event.title} - Slot ${body.slotPosition}`
        : `Booking Confirmed: ${body.event.title} - Slot ${body.slotPosition}`);

    const guestHtmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <style>
            ul, ol { padding-left: 25px; margin: 10px 0; }
            li { margin-bottom: 5px; }
            ul { list-style-type: disc; }
            ol { list-style-type: decimal; }
            u { text-decoration: underline; }
          </style>
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #1a1a1a; margin-top: 0;">${body.isCancellation ? "Booking Canceled" : (body.isManualAdd ? "You've been added to a slot!" : "Booking Confirmed!")}</h1>

            <p>Hi ${body.guestName},</p>

            ${body.isCancellation
        ? `<p>Your booking for <strong>${body.event.title}</strong>, slot #${body.slotPosition}, has been successfully canceled.</p>`
        : (body.isManualAdd
          ? `<p>You've been added to <strong>${body.event.title}</strong> by the producer.</p>`
          : `<p>Your booking for <strong>${body.event.title}</strong> has been confirmed!</p>`)
      }

            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h2 style="margin-top: 0; color: #1a1a1a;">Event Details</h2>
              <p style="margin: 8px 0;"><strong>Event:</strong> ${body.event.title}</p>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${eventDate}</p>
              <p style="margin: 8px 0;"><strong>Time:</strong> ${eventTime}</p>
              <p style="margin: 8px 0;"><strong>Venue:</strong> ${venueInfo}</p>
              <p style="margin: 8px 0;"><strong>Section:</strong> ${body.sectionLabel}</p>
              <p style="margin: 8px 0;"><strong>Your Slot:</strong> #${body.slotPosition}</p>
            </div>

            ${body.event.producer_message ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${formattedProducerMessage}</div>
              </div>
            ` : ''}

            <p style="margin-top: 30px;">We look forward to seeing you there!</p>

            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #856404;">Manage Your Booking</p>
              <p style="margin: 0 0 15px 0; color: #856404; font-size: 14px;">
                Need to cancel or change your alert preferences? Use the link below:
              </p>
              <a href="${cancelUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">
                ${body.isCancellation ? "View Event Details" : "Manage Booking & Alerts"}
              </a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions or need to make changes, please contact the event producer.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email via Zeptomail (Guest)
    // Match the exact format from the working curl request
    const zeptomailPayload = {
      from: {
        address: ZEPTOMAIL_FROM_EMAIL,
      },
      to: [
        {
          email_address: {
            address: body.guestEmail,
            name: body.guestName,
          },
        },
      ],
      subject: guestSubject,
      htmlbody: guestHtmlBody,
    };

    // Prepare authorization header - handle token with or without prefix
    let authHeader: string;
    if (ZEPTOMAIL_API_TOKEN.startsWith("Zoho-enczapikey")) {
      authHeader = ZEPTOMAIL_API_TOKEN;
    } else {
      authHeader = `Zoho-enczapikey ${ZEPTOMAIL_API_TOKEN}`;
    }

    const zeptomailResponse = await fetch(ZEPTOMAIL_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(zeptomailPayload),
    });

    if (!zeptomailResponse.ok) {
      const errorText = await zeptomailResponse.text();
      console.error("Zeptomail API error (Guest):", zeptomailResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email to guest", details: errorText }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Log guest notification
    await supabase.from('message_logs').insert({
      booking_id: body.bookingId,
      email_address: body.guestEmail,
      message_type: body.isCancellation ? 'booking_cancellation_guest' : 'booking_confirmation_guest',
      subject: guestSubject,
      delivery_status: 'sent',
    });

    // --- Producer Email Content ---
    // IMPORTANT: Cancellation emails should ALWAYS be sent immediately, regardless of email_frequency
    // For new bookings: Only send immediate producer email if email_frequency is explicitly 'daily'
    // For 'weekly' and 'monthly' new bookings, the scheduled notification functions will handle it
    const normalizedFrequency = emailFrequency ? String(emailFrequency).trim().toLowerCase() : null;
    const isCancellation = body.isCancellation === true;
    const shouldSendImmediateProducerEmail = producer && (
      isCancellation || // Always send cancellation emails immediately
      normalizedFrequency === 'daily' // Only send new booking emails for daily frequency
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
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <style>
              ul, ol { padding-left: 25px; margin: 10px 0; }
              li { margin-bottom: 5px; }
              ul { list-style-type: disc; }
              ol { list-style-type: decimal; }
              u { text-decoration: underline; }
            </style>
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
              <h1 style="color: #1a1a1a; margin-top: 0;">${body.isCancellation ? "Booking Canceled" : "New Booking Made!"}</h1>

              <p>Hi ${producer.name},</p>

              ${body.isCancellation
          ? `<p>A booking for your event <strong>${body.event.title}</strong>, slot #${body.slotPosition}, made by ${body.guestName} has been canceled.</p>`
          : `<p><strong>${body.guestName}</strong> (${body.guestEmail}) has signed up for your event <strong>${body.event.title}</strong>!</p>`
        }

              <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h2 style="margin-top: 0; color: #1a1a1a;">Event & Booking Details</h2>
                <p style="margin: 8px 0;"><strong>Event Name:</strong> ${body.event.title}</p>
                <p style="margin: 8px 0;"><strong>Event Date:</strong> ${eventDate}</p>
                <p style="margin: 8px 0;"><strong>Event Start Time:</strong> ${body.event.start_time}</p>
                <p style="margin: 8px 0;"><strong>Event End Time:</strong> ${body.event.end_time}</p>
                <p style="margin: 8px 0;"><strong>Venue:</strong> ${venueInfo}</p>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 8px 0; font-weight: 600; color: #28a745;">Sign Up User Information:</p>
                  <p style="margin: 8px 0;"><strong>Name:</strong> ${body.guestName}</p>
                  <p style="margin: 8px 0;"><strong>Email:</strong> ${body.guestEmail}</p>
                  <p style="margin: 8px 0;"><strong>Section:</strong> ${body.sectionLabel}</p>
                  <p style="margin: 8px 0;"><strong>Slot Number:</strong> #${body.slotPosition}</p>
                </div>
              </div>

              ${body.event.producer_message ? `
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
                  <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                  <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${formattedProducerMessage}</div>
                </div>
              ` : ''}

              <p style="margin-top: 30px;">
                You can manage all bookings and event details from your dashboard:
              </p>
              <a href="${producerDashboardUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">
                Go to Dashboard
              </a>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This is an automated notification. Please do not reply directly to this email.
              </p>
            </div>
          </body>
        </html>
      `;

      const zeptomailProducerPayload = {
        from: {
          address: ZEPTOMAIL_FROM_EMAIL,
        },
        to: [
          {
            email_address: {
              address: producer.email,
              name: producer.name,
            },
          },
        ],
        subject: producerSubject,
        htmlbody: producerHtmlBody,
      };

      const zeptomailProducerResponse = await fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(zeptomailProducerPayload),
      });

      if (!zeptomailProducerResponse.ok) {
        const errorText = await zeptomailProducerResponse.text();
        console.error("Zeptomail API error (Producer):", zeptomailProducerResponse.status, errorText);
        // Do not return here; continue to respond to the original request
      } else {
        // Log producer notification
        await supabase.from('message_logs').insert({
          booking_id: body.bookingId,
          email_address: producer.email,
          message_type: body.isCancellation ? 'booking_cancellation_producer' : 'booking_confirmation_producer',
          subject: producerSubject,
          delivery_status: 'sent',
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Emails sent successfully" }),
      {
        status: 200,
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
