import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { AddToSlotModal } from '@/components/lineup/AddToSlotModal';
import { RemoveFromLineupModal } from '@/components/lineup/RemoveFromLineupModal';
import { toast } from '@/hooks/use-toast';

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
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ position: number; sectionLabel: string } | null>(null);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [bookingToRemove, setBookingToRemove] = useState<Booking | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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

  const handleRemoveClick = (booking: Booking) => {
    setBookingToRemove(booking);
    setRemoveModalOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!bookingToRemove) return;
    
    setIsRemoving(true);
    const { error } = await supabase
      .from('bookings')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', bookingToRemove.id);

    if (!error) {
      toast({
        title: `${bookingToRemove.guest_name} removed from lineup`,
      });
      queryClient.invalidateQueries({ queryKey: ['event-bookings', id] });
      setRemoveModalOpen(false);
      setBookingToRemove(null);
    } else {
      toast({
        title: 'Failed to remove from lineup',
        variant: 'destructive',
      });
    }
    setIsRemoving(false);
  };

  const handleAddClick = (slotPosition: number, sectionLabel: string) => {
    setSelectedSlot({ position: slotPosition, sectionLabel });
    setAddModalOpen(true);
  };

  const handleAddSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['event-bookings', id] });
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

        {/* Section Tables - always show all slots */}
        {sectionSlots.map((section, sectionIndex) => (
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
                            <button
                              onClick={() => handleAddClick(slotPosition, section.label)}
                              className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                            >
                              [Add someone]
                            </button>
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
                              onClick={() => handleRemoveClick(booking)}
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
                          <button
                            onClick={() => handleAddClick(slotPosition, section.label)}
                            className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                          >
                            [Add someone]
                          </button>
                        )}
                      </div>
                    </div>
                    {booking && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleRemoveClick(booking)}
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

        {/* Empty state message when no bookings */}
        {bookings.length === 0 && sectionSlots.length > 0 && (
          <div className="text-center py-6 space-y-2">
            <p className="text-muted-foreground">No one signed up yet</p>
            <p className="text-sm text-muted-foreground">
              Click "[Add someone]" to add manually or share your mic page
            </p>
          </div>
        )}
      </div>

      {/* Add to Slot Modal */}
      {selectedSlot && (
        <AddToSlotModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          eventId={id!}
          slotPosition={selectedSlot.position}
          sectionLabel={selectedSlot.sectionLabel}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Remove Confirmation Modal */}
      {bookingToRemove && (
        <RemoveFromLineupModal
          open={removeModalOpen}
          onOpenChange={setRemoveModalOpen}
          guestName={bookingToRemove.guest_name}
          slotPosition={bookingToRemove.slot_position}
          onConfirm={handleConfirmRemove}
          isRemoving={isRemoving}
        />
      )}
    </ProducerLayout>
  );
}
