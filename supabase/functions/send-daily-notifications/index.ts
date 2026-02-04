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

    // Calculate yesterday's date (we send notifications for the previous day's activity)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get all producers who have events with daily email notifications enabled
    const { data: producers, error } = await supabase
      .from('producers')
      .select('id, email, name')
      .in(
        'id',
        supabase
          .from('events')
          .select('producer_id')
          .eq('email_frequency', 'daily')
          .gte('date', yesterdayStr)
          .lt('date', new Date().toISOString().split('T')[0])
      );

    if (error) {
      console.error("Error fetching producers:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch producers" }),
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
        JSON.stringify({ success: true, message: "No producers with daily notifications" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`Sending daily notifications to ${producers.length} producers for ${yesterdayStr}`);

    // Send daily notifications for each producer
    const notificationPromises = producers.map(producer =>
      supabase.functions.invoke('send-producer-notifications', {
        body: {
          producerId: producer.id,
          frequency: 'daily',
          date: yesterdayStr,
        },
      })
    );

    const results = await Promise.allSettled(notificationPromises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Daily notifications completed: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily notifications sent: ${successful} successful, ${failed} failed`,
        stats: { total: producers.length, successful, failed }
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
    console.error("Error in send-daily-notifications function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
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
