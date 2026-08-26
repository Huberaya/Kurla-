import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables configuration
const VITE_SUPABASE_URL = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_URL
  : process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

const VITE_SUPABASE_ANON_KEY = typeof import.meta !== 'undefined' && import.meta.env
  ? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)
  : (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || VITE_SUPABASE_URL;

export const isSupabaseConfigured = Boolean(
  (SUPABASE_URL || VITE_SUPABASE_URL) && (SUPABASE_SECRET_KEY || VITE_SUPABASE_ANON_KEY)
);

// Client-side Supabase client (Uses anon/publishable key only)
let clientInstance: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient | null {
  if (!clientInstance) {
    const url = VITE_SUPABASE_URL || SUPABASE_URL;
    const key = VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      clientInstance = createClient(url, key);
    }
  }
  return clientInstance;
}

// Server-side Supabase client (Uses secret/service_role key for backend operations)
let serverInstance: SupabaseClient | null = null;
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!serverInstance) {
    const url = SUPABASE_URL || VITE_SUPABASE_URL;
    const key = SUPABASE_SECRET_KEY || VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      serverInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }
  return serverInstance;
}
