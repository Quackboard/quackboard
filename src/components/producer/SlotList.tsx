import { Button } from '@/components/ui/button';

interface Section {
  label: string;
  slots: number;
}

interface Booking {
  id: string;
  slot_position: number;
  guest_name: string;
}

interface SlotListProps {
  sectionsConfig: Section[];
  bookings: Booking[];
}

export function SlotList({ sectionsConfig, bookings }: SlotListProps) {
  // Create a map of slot_position to booking for quick lookup
  const bookingsBySlot = new Map(
    bookings.map(b => [b.slot_position, b])
  );

  let globalSlotNumber = 0;

  return (
    <div className="mt-4 space-y-3">
      {sectionsConfig.map((section, sectionIndex) => {
        const slots = [];
        
        for (let i = 0; i < section.slots; i++) {
          globalSlotNumber++;
          const booking = bookingsBySlot.get(globalSlotNumber);
          slots.push({ number: globalSlotNumber, booking });
        }

        return (
          <div key={sectionIndex}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <span className="flex-1 h-px bg-border" />
              <span className="uppercase tracking-wider font-medium">
                {section.label}
              </span>
              <span className="flex-1 h-px bg-border" />
            </div>
            
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
                      disabled
                      className="h-7 text-xs px-3 opacity-60"
                    >
                      Sign Up
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
