import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://gtrvctisqwayicrucglg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cnZjdGlzcXdheWljcnVjZ2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDI2NzgsImV4cCI6MjA5MDQ3ODY3OH0.OLtqQjP1B65oc5jdadQZbI_qbsvhHM3NyznE_AfYt5Y";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const SUPABASE_URL_PUBLIC = SUPABASE_URL;