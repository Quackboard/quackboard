export interface Producer {
  id: string;
  email: string;
  name: string;
  venue_name: string | null;
  bio_markdown: string | null;
}

export interface Section {
  label: string;
  slots: number;
}

export interface Event {
  id: string;
  producer_id: string;
  title: string;
  description: string | null;
  venue_name: string;
  venue_address: string;
  date: string;
  start_time: string;
  end_time: string;
  sections_config: Section[];
  status: 'draft' | 'published' | 'cancelled';
  allow_multiple_slots: boolean | null;
}

export interface Booking {
  id: string;
  event_id: string;
  slot_position: number;
  guest_name: string;
  cancelled_at: string | null;
}
