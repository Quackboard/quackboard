import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SignUpModal } from './SignUpModal';

interface Section {
  label: string;
  slots: number;
}

interface Booking {
  id: string;
  slot_position: number;
  guest_name: string;
}

interface SpotListProps {
  sectionsConfig: Section[];
  bookings: Booking[];
  eventId: string;
  eventTime: string;
  allowMultipleSpots: boolean;
  onBookingSuccess: () => void;
}

interface ModalState {
  open: boolean;
  spotNumber: number;
  sectionLabel: string;
}

export function SpotList({ 
  sectionsConfig, 
  bookings, 
  eventId, 
  eventTime,
  allowMultipleSpots,
  onBookingSuccess 
}: SpotListProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    spotNumber: 0,
    sectionLabel: '',
  });

  const bookingsBySlot = new Map(
    bookings.map(b => [b.slot_position, b])
  );

  const toggleSection = (sectionIndex: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionIndex)) {
        next.delete(sectionIndex);
      } else {
        next.add(sectionIndex);
      }
      return next;
    });
  };

  const openModal = (spotNumber: number, sectionLabel: string) => {
    setModalState({ open: true, spotNumber, sectionLabel });
  };

  let globalSlotNumber = 0;

  return (
    <>
      <div className="mt-4 space-y-3">
        {sectionsConfig.map((section, sectionIndex) => {
          const slots = [];
          const startSlot = globalSlotNumber + 1;
          
          for (let i = 0; i < section.slots; i++) {
            globalSlotNumber++;
            const booking = bookingsBySlot.get(globalSlotNumber);
            slots.push({ number: globalSlotNumber, booking });
          }

          const availableCount = slots.filter(s => !s.booking).length;
          const shouldCollapse = section.slots > 6;
          const isExpanded = expandedSections.has(sectionIndex);

          // If collapsed, show summary instead of full list
          if (shouldCollapse && !isExpanded) {
            return (
              <div key={sectionIndex}>
                {section.label && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70 py-1">
                    <span className="flex-1 h-px bg-border/50" />
                    <span className="uppercase tracking-wider text-[10px]">
                      {section.label}
                    </span>
                    <span className="flex-1 h-px bg-border/50" />
                  </div>
                )}
                <div className="flex items-center justify-between py-2 px-2">
                  <span className="text-sm text-muted-foreground">
                    {availableCount} spot{availableCount !== 1 ? 's' : ''} available
                  </span>
                  <button
                    onClick={() => toggleSection(sectionIndex)}
                    className="text-xs text-primary hover:underline"
                  >
                    View all spots
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={sectionIndex}>
              {section.label && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70 py-1">
                  <span className="flex-1 h-px bg-border/50" />
                  <span className="uppercase tracking-wider text-[10px]">
                    {section.label}
                  </span>
                  <span className="flex-1 h-px bg-border/50" />
                </div>
              )}
              
              <div className="space-y-1 mt-2">
                {slots.map(slot => (
                  <div
                    key={slot.number}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-md"
                  >
                    <span className="w-6 text-sm font-mono text-muted-foreground">
                      {slot.number}.
                    </span>
                    {slot.booking ? (
                      <span className="text-sm text-foreground font-medium">
                        {slot.booking.guest_name}
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal(slot.number, section.label)}
                        className="h-7 text-xs px-3"
                      >
                        Grab Spot
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {shouldCollapse && isExpanded && (
                <div className="px-2 pt-2">
                  <button
                    onClick={() => toggleSection(sectionIndex)}
                    className="text-xs text-primary hover:underline"
                  >
                    Collapse
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SignUpModal
        open={modalState.open}
        onOpenChange={(open) => setModalState(prev => ({ ...prev, open }))}
        eventId={eventId}
        eventTime={eventTime}
        sectionLabel={modalState.sectionLabel}
        spotNumber={modalState.spotNumber}
        allowMultipleSpots={allowMultipleSpots}
        onSuccess={onBookingSuccess}
      />
    </>
  );
}
