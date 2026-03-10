// Cancel booking edge function — bypasses RLS using service role key.
// Validates cancel_token server-side, sets cancelled_at, and triggers
// cancellation email via the existing send-booking-email function.
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { cancelToken } = await req.json();

    if (!cancelToken || typeof cancelToken !== "string") {
      return json({ success: false, code: "invalid_request" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Step 1: Look up the booking by cancel_token ─────────────────────
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        id,
        guest_name,
        guest_email,
        slot_position,
        cancelled_at,
        cancel_token,
        event_id
      `)
      .eq("cancel_token", cancelToken)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching booking by cancel_token:", fetchError);
      return json({ success: false, code: "server_error" }, 500);
    }

    if (!booking) {
      return json({ success: false, code: "not_found" });
    }

    if (booking.cancelled_at) {
      return json({ success: false, code: "already_cancelled" });
    }

    // ── Step 2: Set cancelled_at ────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", booking.id);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return json({ success: false, code: "server_error" }, 500);
    }

    console.log(`✅ Booking ${booking.id} canceled via token`);

    // ── Step 3: Fetch event + producer data for cancellation email ──────
    if (booking.event_id) {
      try {
        const { data: event } = await supabase
          .from("events")
          .select("title, date, start_time, end_time, venue_name, venue_address, producer_id, producer_message, sections_config")
          .eq("id", booking.event_id)
          .single();

        if (event && event.producer_id) {
          // Derive section label
          const sectionsConfig = Array.isArray(event.sections_config)
            ? (event.sections_config as Array<{ label: string; slots: number }>)
            : null;
          let sectionLabel = "General";
          if (sectionsConfig && sectionsConfig.length > 0) {
            let currentSlot = 1;
            for (const section of sectionsConfig) {
              const sectionEnd = currentSlot + section.slots - 1;
              if (booking.slot_position >= currentSlot && booking.slot_position <= sectionEnd) {
                sectionLabel = section.label;
                break;
              }
              currentSlot += section.slots;
            }
          }

          // Fire cancellation email via existing send-booking-email function
          // This is best-effort — cancellation is already committed
          const emailPayload = {
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
          };

          // Invoke send-booking-email internally
          const emailRes = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify(emailPayload),
            },
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
    }

    return json({ success: true });
  } catch (err) {
    console.error("cancel-booking unexpected error:", err);
    return json({ success: false, code: "server_error" }, 500);
  }
});
