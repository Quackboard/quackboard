import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
  dates: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export function DaySelector({ dates, selectedDate, onSelectDate }: DaySelectorProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {dates.map(date => {
        const parsed = parseISO(date);
        const isSelected = date === selectedDate;
        
        return (
          <button
            key={date}
            onClick={() => onSelectDate(date)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all",
              "border border-border",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="block text-xs uppercase tracking-wider opacity-70">
              {format(parsed, 'EEE')}
            </span>
            <span className="block text-sm">
              {format(parsed, 'M/d')}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
