import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── In-memory rate limiting: 5 requests per IP per 60s ──────────────
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Rate limit by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return json({ success: false, code: "rate_limited" }, 429);
    }

    const { eventId, email, bookingId } = await req.json();

    if (!eventId || !email) {
      return json({ success: false, code: "invalid_request" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── If bookingId provided, cancel that specific booking ─────────
    if (bookingId) {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("id, guest_name, guest_email, slot_position, cancelled_at, cancel_token, event_id")
        .eq("id", bookingId)
        .eq("event_id", eventId)
        .ilike("guest_email", email)
        .is("cancelled_at", null)
        .maybeSingle();

      if (error) {
        console.error("Error fetching booking by id:", error);
        return json({ success: false, code: "server_error" }, 500);
      }
      if (!booking) {
        return json({ success: false, code: "not_found" });
      }

      return await cancelAndNotify(supabase, booking);
    }

    // ── Look up active bookings by event + email ────────────────────
    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, guest_name, guest_email, slot_position, cancelled_at, cancel_token, event_id")
      .eq("event_id", eventId)
      .ilike("guest_email", email)
      .is("cancelled_at", null);

    if (fetchError) {
      console.error("Error fetching bookings:", fetchError);
      return json({ success: false, code: "server_error" }, 500);
    }

    if (!bookings || bookings.length === 0) {
      return json({ success: false, code: "not_found" });
    }

    // Multiple bookings — let the UI choose
    if (bookings.length > 1) {
      return json({
        success: true,
        code: "multiple",
        bookings: bookings.map((b) => ({
          id: b.id,
          guest_name: b.guest_name,
          slot_position: b.slot_position,
        })),
      });
    }

    // Single booking — cancel it
    return await cancelAndNotify(supabase, bookings[0]);
  } catch (err) {
    console.error("cancel-booking-by-email unexpected error:", err);
    return json({ success: false, code: "server_error" }, 500);
  }
});

// ── Helper: cancel a booking and trigger the cancellation email ─────
async function cancelAndNotify(
  supabase: ReturnType<typeof createClient>,
  booking: {
    id: string;
    guest_name: string;
    guest_email: string;
    slot_position: number;
    cancel_token: string;
    event_id: string;
  }
) {
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", booking.id);

  if (updateError) {
    console.error("Error updating booking:", updateError);
    return json({ success: false, code: "server_error" }, 500);
  }

  console.log(`✅ Booking ${booking.id} canceled via email lookup`);

  // Fetch event data for email
  try {
    const { data: event } = await supabase
      .from("events")
      .select(
        "title, date, start_time, end_time, venue_name, venue_address, producer_id, producer_message, sections_config"
      )
      .eq("id", booking.event_id)
      .single();

    if (event && event.producer_id) {
      const sectionsConfig = Array.isArray(event.sections_config)
        ? (event.sections_config as Array<{ label: string; slots: number }>)
        : null;
      let sectionLabel = "General";
      if (sectionsConfig && sectionsConfig.length > 0) {
        let currentSlot = 1;
        for (const section of sectionsConfig) {
          const sectionEnd = currentSlot + section.slots - 1;
          if (
            booking.slot_position >= currentSlot &&
            booking.slot_position <= sectionEnd
          ) {
            sectionLabel = section.label;
            break;
          }
          currentSlot += section.slots;
        }
      }

      const emailRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            bookingId: booking.id,
            cancelToken: booking.cancel_token,
            guestEmail: booking.guest_email,
            guestName: booking.guest_name,
            slotPosition: booking.slot_position,
            sectionLabel,
            event: {
              title: event.title,
              date: event.date,
              start_time: event.start_time,
              end_time: event.end_time,
              venue_name: event.venue_name,
              venue_address: event.venue_address,
              producer_id: event.producer_id,
              producer_message: event.producer_message,
            },
            isCancellation: true,
          }),
        }
      );

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Cancellation email failed (non-blocking):", errText);
      } else {
        console.log("✅ Cancellation email triggered");
      }
    }
  } catch (emailErr) {
    console.error("Error sending cancellation email (non-blocking):", emailErr);
  }

  return json({
    success: true,
    cancelled: [
      {
        id: booking.id,
        guest_name: booking.guest_name,
        slot_position: booking.slot_position,
      },
    ],
  });
}
