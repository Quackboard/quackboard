import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from '@/components/ui/sheet';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

export default function ListMicSheet() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [micName, setMicName] = useState('');
  const [nextOccurrence, setNextOccurrence] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [details, setDetails] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [instagram, setInstagram] = useState('');

  const resetForm = () => {
    setMicName('');
    setNextOccurrence(undefined);
    setStartTime('');
    setEndTime('');
    setRecurrence('');
    setDetails('');
    setVenueName('');
    setCity('');
    setSubmitterName('');
    setEmail('');
    setLink('');
    setInstagram('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!micName.trim() || !submitterName.trim() || !email.trim() || !nextOccurrence || !startTime || !endTime || !venueName.trim()) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('mic_submissions').insert({
      mic_name: micName.trim(),
      venue_name: venueName.trim(),
      city: city.trim() || null,
      next_occurrence: format(nextOccurrence, 'yyyy-MM-dd'),
      start_time: startTime,
      end_time: endTime,
      recurrence: recurrence.trim() || null,
      details: details.trim() || null,
      submitter_name: submitterName.trim(),
      submitter_email: email.trim(),
      external_link: link.trim() || null,
      instagram_url: instagram.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: 'Something went wrong', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Mic submitted!', description: "We'll review and add it shortly." });
    resetForm();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          List a Mic
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>List a Mic</SheetTitle>
          <SheetDescription>Submit an open mic to be listed on the Browse page.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Mic Name */}
          <div className="space-y-1.5">
            <Label htmlFor="mic-name">Mic Name *</Label>
            <Input id="mic-name" value={micName} onChange={e => setMicName(e.target.value)} placeholder="e.g. Tuesday Night Comedy" maxLength={200} required />
          </div>

          {/* Schedule row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label>Next Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal text-sm', !nextOccurrence && 'text-muted-foreground')}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {nextOccurrence ? format(nextOccurrence, 'MMM d') : 'Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={nextOccurrence} onSelect={setNextOccurrence} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start-time">Start *</Label>
              <Input id="start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-time">End (approx) *</Label>
              <Input id="end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-1.5">
            <Label htmlFor="recurrence">Recurring?</Label>
            <Input id="recurrence" value={recurrence} onChange={e => setRecurrence(e.target.value)} placeholder="e.g. Every Tuesday, Monthly first Wednesday" maxLength={200} />
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <Label htmlFor="details">Details</Label>
            <Textarea id="details" value={details} onChange={e => setDetails(e.target.value)} placeholder="Sign-up type, cost, any other info..." rows={3} maxLength={1000} />
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="venue">Venue *</Label>
              <Input id="venue" value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="Venue name" maxLength={200} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="City" maxLength={100} />
            </div>
          </div>

          {/* Submitter info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your Name *</Label>
              <Input id="name" value={submitterName} onChange={e => setSubmitterName(e.target.value)} maxLength={100} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={255} required />
            </div>
          </div>

          {/* Optional links */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="link">Link</Label>
              <Input id="link" type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle or URL" maxLength={200} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Mic'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
