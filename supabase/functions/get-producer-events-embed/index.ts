import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Producer slug is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client with SERVICE_ROLE_KEY to bypass RLS
    // This allows the public widget to see events without exposing the whole table via anon RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, serviceKey || anonKey);

    // Invincible Search: Find producer by slug OR id (UUID)
    // We check if it's a UUID first to avoid Postgres common type mismatch errors
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    let query = supabaseClient
      .from('producers')
      .select('id, name, venue_name, slug, timezone');

    if (isUuid) {
      query = query.or(`slug.eq.${slug},id.eq.${slug}`);
    } else {
      query = query.eq('slug', slug);
    }

    const { data: producer, error: producerError } = await query.maybeSingle();

    if (producerError || !producer) {
      console.error('Producer not found:', slug, producerError);
      return new Response(
        JSON.stringify({
          error: 'Producer not found',
          details: producerError?.message || `No producer found with slug or ID: ${slug}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Compute "today" in the producer's timezone so we don't filter out events prematurely
    const tz = producer.timezone || 'America/Los_Angeles';
    const nowInTz = new Date().toLocaleString('en-CA', { timeZone: tz }); // en-CA gives YYYY-MM-DD format
    const today = nowInTz.split(',')[0].trim();
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select(`
        id,
        title,
        description,
        venue_name,
        venue_address,
        date,
        start_time,
        end_time,
        sections_config,
        status
      `)
      .eq('producer_id', producer.id)
      .eq('status', 'published')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(10)

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch events',
          details: eventsError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get booking counts for each event
    const eventIds = events.map(e => e.id)
    let bookingsCount: Record<string, number> = {}
    if (eventIds.length > 0) {
      const { data: bookings, error: bookingsError } = await supabaseClient
        .from('bookings')
        .select('event_id, slot_position')
        .in('event_id', eventIds)
        .is('cancelled_at', null)

      if (!bookingsError && bookings) {
        bookingsCount = bookings.reduce((acc: Record<string, number>, booking) => {
          acc[booking.event_id] = (acc[booking.event_id] || 0) + 1
          return acc
        }, {})
      }
    }

    // Format events for embed
    const formattedEvents = events.map(event => {
      // Robust handling for sections_config which might be JSON or stringified JSON
      let totalSlots = 0;
      try {
        const sections = Array.isArray(event.sections_config)
          ? event.sections_config
          : (typeof event.sections_config === 'string' ? JSON.parse(event.sections_config) : []);

        totalSlots = sections.reduce((sum: number, section: any) => sum + (Number(section.slots) || 0), 0);
      } catch (e) {
        console.warn(`Failed to parse sections_config for event ${event.id}:`, e);
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        venue_name: event.venue_name,
        venue_address: event.venue_address,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        total_slots: totalSlots,
        booked_slots: bookingsCount[event.id] || 0
      }
    })

    return new Response(
      JSON.stringify({
        producer: {
          name: producer.name,
          venue_name: producer.venue_name
        },
        events: formattedEvents
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Critical internal error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
