import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://dkbahxjibpobbefqufqa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrYmFoeGppYnBvYmJlZnF1ZnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNDAwOTQsImV4cCI6MjA4MDkxNjA5NH0.a72D5JIqVcreWG9K6HwNbKTfC5V1ItlOS0OkFkAhpfc";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const SUPABASE_URL_PUBLIC = SUPABASE_URL;