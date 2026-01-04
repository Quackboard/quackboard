import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProducerLayout } from '@/components/layouts/ProducerLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Section {
  label: string;
  slots: number;
}

interface Booking {
  id: string;
  slot_position: number;
  guest_name: string;
  guest_email: string;
  guest_instagram: string | null;
}

function parseSections(config: unknown): Section[] {
  if (Array.isArray(config)) {
    return config.filter(
      (item): item is Section =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.label === 'string' &&
        typeof item.slots === 'number'
    );
  }
  return [];
}

export default function EventLineup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Fetch event
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event-lineup', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, producer_id, sections_config')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Fetch bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['event-bookings', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, slot_position, guest_name, guest_email, guest_instagram')
        .eq('event_id', id!)
        .is('cancelled_at', null)
        .order('slot_position', { ascending: true });

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!id && !!user,
  });

  // Redirect if event doesn't belong to current producer
  useEffect(() => {
    if (!authLoading && !eventLoading && event && user) {
      if (event.producer_id !== user.id) {
        navigate('/dashboard');
      }
    }
  }, [event, user, authLoading, eventLoading, navigate]);

  // Redirect if event not found
  useEffect(() => {
    if (!eventLoading && !event && !authLoading && user) {
      navigate('/dashboard');
    }
  }, [event, eventLoading, authLoading, user, navigate]);

  const isLoading = authLoading || eventLoading || bookingsLoading;
  const sections = event ? parseSections(event.sections_config) : [];

  // Calculate slot ranges for each section
  const getSectionSlots = () => {
    let startSlot = 1;
    return sections.map(section => {
      const slots: number[] = [];
      for (let i = 0; i < section.slots; i++) {
        slots.push(startSlot + i);
      }
      const result = { label: section.label, slots, startSlot };
      startSlot += section.slots;
      return result;
    });
  };

  const sectionSlots = getSectionSlots();

  // Get booking for a specific slot
  const getBookingForSlot = (slotPosition: number): Booking | undefined => {
    return bookings.find(b => b.slot_position === slotPosition);
  };

  const handleRemove = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (!error) {
      // Refetch bookings
      window.location.reload();
    }
  };

  if (isLoading) {
    return (
      <ProducerLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ProducerLayout>
    );
  }

  const hasNoBookings = bookings.length === 0;

  return (
    <ProducerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">Lineup</h1>
        </div>

        {/* Empty State */}
        {hasNoBookings && (
          <div className="text-center py-12 space-y-2">
            <p className="text-muted-foreground">No one signed up yet</p>
            <p className="text-sm text-muted-foreground">
              Add someone manually or share your mic page
            </p>
          </div>
        )}

        {/* Section Tables */}
        {!hasNoBookings && sectionSlots.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-2">
            <h2 className="text-lg font-medium text-foreground">{section.label}</h2>
            
            {/* Desktop Table */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Slot</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.slots.map((slotPosition) => {
                    const booking = getBookingForSlot(slotPosition);
                    return (
                      <TableRow key={slotPosition}>
                        <TableCell className="font-medium">{slotPosition}</TableCell>
                        <TableCell>
                          {booking ? (
                            booking.guest_name
                          ) : (
                            <span className="text-muted-foreground">[Add someone]</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking?.guest_instagram ? (
                            <span className="text-muted-foreground">@{booking.guest_instagram.replace('@', '')}</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {booking?.guest_email ? (
                            <span className="text-muted-foreground">{booking.guest_email}</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {booking && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemove(booking.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {section.slots.map((slotPosition) => {
                const booking = getBookingForSlot(slotPosition);
                return (
                  <div
                    key={slotPosition}
                    className="border rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {slotPosition}
                      </span>
                      <div className="min-w-0 flex-1">
                        {booking ? (
                          <>
                            <p className="font-medium truncate">{booking.guest_name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {booking.guest_instagram && `@${booking.guest_instagram.replace('@', '')} • `}
                              {booking.guest_email}
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">[Add someone]</p>
                        )}
                      </div>
                    </div>
                    {booking && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleRemove(booking.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Show sections with empty slots even when no bookings */}
        {hasNoBookings && sectionSlots.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-2">
            <h2 className="text-lg font-medium text-foreground">{section.label}</h2>
            
            {/* Desktop Table */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Slot</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.slots.map((slotPosition) => (
                    <TableRow key={slotPosition}>
                      <TableCell className="font-medium">{slotPosition}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">[Add someone]</span>
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {section.slots.map((slotPosition) => (
                <div
                  key={slotPosition}
                  className="border rounded-lg p-3 flex items-center gap-3"
                >
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    {slotPosition}
                  </span>
                  <p className="text-muted-foreground">[Add someone]</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ProducerLayout>
  );
}
