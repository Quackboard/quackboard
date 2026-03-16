import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SignUpModal } from './SignUpModal';
import { format, parseISO, isAfter, differenceInMilliseconds, differenceInSeconds } from 'date-fns';

interface Section {
  label: string;
  slots: number;
  type?: 'regular' | 'wildcard';
  signup_opens_at?: string;
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

  // Wildcard logic
  const wildcardSection = sectionsConfig.find(s => s.type === 'wildcard');
  const regularSections = sectionsConfig.filter(s => s.type !== 'wildcard');
  const totalRegularSlots = regularSections.reduce((sum, s) => sum + s.slots, 0);

  const [now, setNow] = useState(() => new Date());

  // Auto-open timer for wildcard section
  useEffect(() => {
    if (!wildcardSection?.signup_opens_at) return;
    const target = parseISO(wildcardSection.signup_opens_at);
    if (!isAfter(target, new Date())) return;

    const msUntilOpen = differenceInMilliseconds(target, new Date());
    const openTimer = setTimeout(() => setNow(new Date()), msUntilOpen + 50);

    let countdownInterval: ReturnType<typeof setInterval> | undefined;
    if (msUntilOpen <= 5 * 60 * 1000) {
      countdownInterval = setInterval(() => setNow(new Date()), 1000);
    } else {
      const startTimer = setTimeout(() => {
        setNow(new Date());
        countdownInterval = setInterval(() => setNow(new Date()), 1000);
      }, msUntilOpen - 5 * 60 * 1000);
      return () => {
        clearTimeout(openTimer);
        clearTimeout(startTimer);
        if (countdownInterval) clearInterval(countdownInterval);
      };
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(openTimer);
      if (countdownInterval) clearInterval(countdownInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [wildcardSection?.signup_opens_at]);

  const wildcardCutoffPassed = wildcardSection?.signup_opens_at
    ? !isAfter(parseISO(wildcardSection.signup_opens_at), now)
    : false;

  // Compute wildcard countdown
  const wildcardCountdown = (() => {
    if (!wildcardSection?.signup_opens_at || wildcardCutoffPassed) return null;
    const target = parseISO(wildcardSection.signup_opens_at);
    const secsLeft = differenceInSeconds(target, now);
    if (secsLeft <= 300) {
      const mins = Math.floor(secsLeft / 60);
      const secs = secsLeft % 60;
      return `Opens in ${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return null;
  })();

  // Count booked regular and wildcard slots
  const bookedRegularCount = bookings.filter(b => b.slot_position <= totalRegularSlots).length;
  const bookedWildcardCount = bookings.filter(b => b.slot_position > totalRegularSlots).length;
  const reservedWildcardSlots = wildcardSection?.slots || 0;
  const unfilledRegularSlots = totalRegularSlots - bookedRegularCount;
  const totalWildcardSlots = unfilledRegularSlots + reservedWildcardSlots;
  const availableWildcardSlots = Math.max(0, totalWildcardSlots - bookedWildcardCount);

  let globalSlotNumber = 0;
  let displayCounter = 0;

  return (
    <>
      <div className="mt-4 space-y-3">
        {sectionsConfig.map((section, sectionIndex) => {
          // Wildcard section rendering
          if (section.type === 'wildcard') {
            if (!wildcardCutoffPassed) {
              // Before cutoff: hide wildcard section entirely
              return null;
            }

            // After cutoff: show dynamic wildcard slots
            const wildcardBookings = bookings.filter(b => b.slot_position > totalRegularSlots);

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

                {availableWildcardSlots === 0 && wildcardBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-2">
                    No wildcard spots available
                  </p>
                ) : (
                  <div className="space-y-1 mt-2">
                    {/* Show booked wildcard slots */}
                    {wildcardBookings.map(booking => {
                      displayCounter++;
                      return (
                        <div
                          key={booking.id}
                          className="flex items-center gap-3 py-1.5 px-2 rounded-md"
                        >
                          <span className="w-6 text-sm font-mono text-muted-foreground">
                            {displayCounter}.
                          </span>
                          <span className="text-sm text-foreground font-medium">
                            {booking.guest_name}
                          </span>
                        </div>
                      );
                    })}

                    {/* Show available wildcard slots */}
                    {Array.from({ length: availableWildcardSlots }, (_, i) => {
                      const slotPos = totalRegularSlots + bookedWildcardCount + i + 1;
                      displayCounter++;
                      return (
                        <div
                          key={`wc-${slotPos}`}
                          className="flex items-center gap-3 py-1.5 px-2 rounded-md"
                        >
                          <span className="w-6 text-sm font-mono text-muted-foreground">
                            {displayCounter}.
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openModal(slotPos, section.label)}
                            className="h-7 text-xs px-3"
                          >
                            Grab Spot
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular section rendering
          const slots = [];
          const startSlot = globalSlotNumber + 1;
          
          for (let i = 0; i < section.slots; i++) {
            globalSlotNumber++;
            const booking = bookingsBySlot.get(globalSlotNumber);
            slots.push({ number: globalSlotNumber, booking });
          }

          const bookedCount = slots.filter(s => s.booking).length;
          const availableCount = slots.filter(s => !s.booking).length;

          // After cutoff, hide entire section if no bookings
          if (wildcardCutoffPassed && bookedCount === 0) return null;

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
                {slots.map(slot => {
                  // After wildcard cutoff, hide unbooked regular slots
                  if (wildcardCutoffPassed && !slot.booking) return null;
                  if (wildcardCutoffPassed && slot.booking) displayCounter++;
                  const displayNum = wildcardCutoffPassed ? displayCounter : slot.number;
                  return (
                    <div
                      key={slot.number}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-md"
                    >
                      <span className="w-6 text-sm font-mono text-muted-foreground">
                        {displayNum}.
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
                  );
                })}
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
