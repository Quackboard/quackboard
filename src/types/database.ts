export interface Producer {
  id: string;
  email: string;
  name: string;
  venue_name: string | null;
  bio_markdown: string | null;
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
  sections_config: Record<string, unknown> | null;
  status: 'draft' | 'published' | 'cancelled';
}
