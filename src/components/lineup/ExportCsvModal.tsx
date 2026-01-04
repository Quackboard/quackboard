import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  slot_position: number;
  guest_name: string;
  guest_email: string;
  guest_instagram: string | null;
}

interface SectionSlot {
  label: string;
  slots: number[];
}

interface ExportCsvModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: Booking[];
  sectionSlots: SectionSlot[];
  eventTitle: string;
  eventDate?: string;
}

type ColumnKey = 'slot' | 'section' | 'name' | 'email' | 'instagram';

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'slot', label: 'Slot number' },
  { key: 'section', label: 'Section' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'instagram', label: 'Instagram' },
];

export function ExportCsvModal({
  open,
  onOpenChange,
  bookings,
  sectionSlots,
  eventTitle,
  eventDate,
}: ExportCsvModalProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(
    new Set(['slot', 'section', 'name', 'email', 'instagram'])
  );

  const toggleColumn = (key: ColumnKey) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedColumns(newSelected);
  };

  const getSectionForSlot = (slotPosition: number): string => {
    for (const section of sectionSlots) {
      if (section.slots.includes(slotPosition)) {
        return section.label;
      }
    }
    return '';
  };

  const generateCsv = () => {
    const headers: string[] = [];
    if (selectedColumns.has('slot')) headers.push('slot');
    if (selectedColumns.has('section')) headers.push('section');
    if (selectedColumns.has('name')) headers.push('name');
    if (selectedColumns.has('email')) headers.push('email');
    if (selectedColumns.has('instagram')) headers.push('instagram');

    const rows = bookings.map(booking => {
      const row: string[] = [];
      if (selectedColumns.has('slot')) row.push(String(booking.slot_position));
      if (selectedColumns.has('section')) row.push(getSectionForSlot(booking.slot_position));
      if (selectedColumns.has('name')) row.push(booking.guest_name);
      if (selectedColumns.has('email')) row.push(booking.guest_email);
      if (selectedColumns.has('instagram')) {
        const ig = booking.guest_instagram 
          ? `@${booking.guest_instagram.replace('@', '')}` 
          : '';
        row.push(ig);
      }
      return row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const handleDownload = () => {
    if (selectedColumns.size === 0) {
      toast({ title: 'Select at least one column', variant: 'destructive' });
      return;
    }

    const csv = generateCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Generate filename
    const slugTitle = eventTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const dateStr = eventDate || new Date().toISOString().split('T')[0];
    const filename = `lineup-${slugTitle}-${dateStr}.csv`;

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'CSV downloaded' });
    onOpenChange(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset to all selected when closing
      setSelectedColumns(new Set(['slot', 'section', 'name', 'email', 'instagram']));
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Columns to Export</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {COLUMNS.map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-3">
              <Checkbox
                id={`col-${key}`}
                checked={selectedColumns.has(key)}
                onCheckedChange={() => toggleColumn(key)}
              />
              <Label htmlFor={`col-${key}`} className="cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={selectedColumns.size === 0}>
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
