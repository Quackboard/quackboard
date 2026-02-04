import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface EmbedEvent {
  id: string;
  title: string;
  description: string | null;
  venue_name: string;
  venue_address: string;
  date: string;
  start_time: string;
  end_time: string;
  total_slots: number;
  booked_slots: number;
}

interface Producer {
  id?: string;
  name: string;
  venue_name: string | null;
}

interface EmbedData {
  producer: Producer;
  events: EmbedEvent[];
}

interface CalendarWidgetProps {
  producerSlug: string;
  supabaseUrl?: string;
  maxEvents?: number;
}

export default function CalendarWidget({
  producerSlug,
  supabaseUrl = 'https://your-project.supabase.co',
  maxEvents = 5
}: CalendarWidgetProps) {
  const [data, setData] = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Loading events + bookings...");

        // Detect UUID vs slug
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            producerSlug
          );

        // ---- 1. Load Producer ----
        let producerQuery = supabase
          .from("producers")
          .select("id, name, venue_name");

        if (isUuid) {
          producerQuery = producerQuery.or(
            `id.eq.${producerSlug},slug.eq.${producerSlug}`
          );
        } else {
          producerQuery = producerQuery.eq("slug", producerSlug);
        }

        const { data: producer, error: producerError } =
          await producerQuery.maybeSingle();

        if (producerError || !producer) {
          throw new Error("Producer not found");
        }

        // ---- 2. Load Events ----
        const today = new Date().toISOString().split("T")[0];

        const { data: events, error: eventsError } = await supabase
          .from("events")
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
          .eq("producer_id", producer.id)
          .eq("status", "published")
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(maxEvents);

        if (eventsError) throw eventsError;

        // ---- 3. Load Bookings ----
        const eventIds = (events || []).map(e => e.id);

        let bookingsCount: Record<string, number> = {};

        if (eventIds.length > 0) {
          const { data: bookings } = await supabase
            .from("bookings")
            .select("event_id")
            .in("event_id", eventIds)
            .is("cancelled_at", null);

          bookingsCount = (bookings || []).reduce((acc: any, b: any) => {
            acc[b.event_id] = (acc[b.event_id] || 0) + 1;
            return acc;
          }, {});
        }

        // ---- 4. Build Final Events ----
        const formattedEvents = (events || []).map(event => {
          let totalSlots = 0;

          try {
            const sections = Array.isArray(event.sections_config)
              ? event.sections_config
              : JSON.parse(event.sections_config || "[]");

            totalSlots = sections.reduce(
              (sum: number, s: any) => sum + (Number(s.slots) || 0),
              0
            );
          } catch { }

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
          };
        });

        setData({
          producer,
          events: formattedEvents
        });

      } catch (err: any) {
        console.error(err);
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    const channel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings"
        },
        () => {
          console.log("Booking changed → refreshing widget");
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };


  }, [producerSlug, maxEvents]);

  useEffect(() => {
    const height = document.documentElement.scrollHeight;

    window.parent.postMessage(
      { type: "QB_RESIZE", height },
      "*"
    );
  }, [data]);


  if (loading) {
    return (
      <div className="quackboard-widget" style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '450px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>Loading events...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="quackboard-widget" style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '450px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <p style={{ color: '#dc2626', fontSize: '16px', margin: 0 }}>
            {error || 'Failed to load events'}
          </p>
        </div>
      </div>
    );
  }

  const eventsToShow = data.events.slice(0, maxEvents);

  return (
    <div className="quackboard-widget" style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      width: '100%',
      maxWidth: '480px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      overflow: 'hidden',
      margin: '0 auto'
    }}>


      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '700',
          color: '#111827'
        }}>
          {data.producer.name}
        </h3>
        {data.producer.venue_name && (
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            {data.producer.venue_name}
          </p>
        )}
      </div>

      {/* Events */}
      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        {eventsToShow.length === 0 ? (
          <p style={{
            textAlign: 'center',
            fontSize: '16px',
            color: '#9ca3af',
            margin: '30px 0'
          }}>
            No upcoming mics
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {eventsToShow.map((event) => (
              <a
                key={event.id}
                href={`${window.location.origin}/producer/${producerSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '14px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '12px'
                }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: '700',
                    color: '#111827'
                  }}>
                    {event.title}
                  </h4>
                  {event.venue_name && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '17px',
                      fontWeight: '700',
                      color: '#111827'
                    }}>
                      <MapPin size={18} strokeWidth={2.5} color="#111827" />
                      <span>{event.venue_name}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#4b5563' }}>
                    <Calendar size={18} strokeWidth={2.5} color="#111827" style={{ opacity: 0.8 }} />
                    <span style={{ fontWeight: '500' }}>{format(parseISO(event.date), 'EEE, MMM d')}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#4b5563' }}>
                    <Clock size={18} strokeWidth={2.5} color="#111827" style={{ opacity: 0.8 }} />
                    <span style={{ fontWeight: '500' }}>{event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}</span>
                  </div>
                </div>

                <div style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid #f3f4f6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px'
                }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Available spots</span>
                  <span style={{ fontWeight: '700', color: '#059669' }}>
                    {event.total_slots - event.booked_slots} / {event.total_slots}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
