import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate the previous month's first day (we send notifications for the month that just ended)
    const today = new Date();
    const monthStartDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() - 1, 1)); // First day of previous month UTC
    const monthStartStr = monthStartDate.toISOString().split('T')[0];

    // Get all producers with monthly events
    const { data: monthlyEventProducers } = await supabase
      .from('events')
      .select('producer_id')
      .eq('email_frequency', 'monthly')
      .not('producer_id', 'is', null);

    if (!monthlyEventProducers || monthlyEventProducers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No producers with monthly notifications" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const producerIds = [...new Set(monthlyEventProducers.map(e => e.producer_id))];

    const { data: producers, error: producersError } = await supabase
      .from('producers')
      .select('id, email, name')
      .in('id', producerIds);

    if (producersError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch producers", details: producersError.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (!producers || producers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No producers with monthly notifications" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Send monthly notifications for each producer
    const results = await Promise.all(
      producers.map(async (producer) => {
        try {
          const { data, error } = await supabase.functions.invoke('send-producer-notifications', {
            body: {
              producerId: producer.id,
              frequency: 'monthly',
              monthStart: monthStartStr,
            },
          });

          if (error) {
            return {
              producer,
              success: false,
              emailSent: false,
              error: error.message || 'Edge Function returned a non-2xx status code',
              errorDetails: error.context || error.details || {},
              data: data || null,
            };
          }

          // Check if data indicates success
          if (data && data.success !== false && data.emailSent === true) {
            return {
              producer,
              success: true,
              emailSent: true,
              error: null,
              errorDetails: null,
              data,
            };
          }

          // No content to send (not an error)
          return {
            producer,
            success: true,
            emailSent: data?.emailSent || false,
            error: null,
            errorDetails: null,
            data,
          };
        } catch (error) {
          return {
            producer,
            success: false,
            emailSent: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorDetails: error instanceof Error ? error.stack : String(error),
            data: null,
          };
        }
      })
    );

    // Calculate summary statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const emailsSent = results.filter(r => r.success && r.emailSent === true).length;
    const noContent = results.filter(r => r.success && r.emailSent === false).length;

    // Build detailed results
    const details = results.map(r => ({
      producerEmail: r.producer.email,
      producerName: r.producer.name,
      success: r.success,
      emailSent: r.emailSent,
      message: r.data?.message || r.error || 'Unknown',
      reason: r.data?.reason || null,
      recipient: r.data?.recipient || null,
      stats: r.data?.stats || null,
      error: r.error || null,
      errorDetails: r.errorDetails || null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Monthly notifications processed: ${emailsSent} emails sent, ${noContent} skipped (no bookings), ${failed} failed`,
        total: producers.length,
        successful,
        failed,
        emailsSent,
        noContent,
        monthStart: monthStartStr,
        details,
      }),
      {
        status: 200,
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
        stack: errorStack,
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
