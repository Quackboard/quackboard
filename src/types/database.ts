export interface Producer {
  id: string;
  email: string;
  name: string;
  slug: string | null;
  venue_name: string | null;
  bio_markdown: string | null;
}

export interface Section {
  label: string;
  slots: number;
  type?: 'regular' | 'wildcard';
  signup_opens_at?: string;
}

export interface ProducerFeature {
  id: string;
  producer_id: string;
  feature: string;
  granted_at: string;
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
  status: 'upcoming' | 'active' | 'past';
  allow_multiple_slots: boolean | null;
  publish_at: string | null;
  signup_opens_at: string | null;
}

export interface Booking {
  id: string;
  event_id: string;
  slot_position: number;
  guest_name: string;
  cancelled_at: string | null;
}
