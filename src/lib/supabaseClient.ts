import { createClient, SupabaseClient } from '@supabase/supabase-js';

function readNodeEnv(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

function readViteEnv(name: string): string | undefined {
  return typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env[name]
    : undefined;
}

function getClientUrl(): string | undefined {
  return readViteEnv('VITE_SUPABASE_URL') || readNodeEnv('VITE_SUPABASE_URL') || readNodeEnv('SUPABASE_URL');
}

function getPublicKey(): string | undefined {
  return readViteEnv('VITE_SUPABASE_PUBLISHABLE_KEY')
    || readViteEnv('VITE_SUPABASE_ANON_KEY')
    || readNodeEnv('VITE_SUPABASE_PUBLISHABLE_KEY')
    || readNodeEnv('VITE_SUPABASE_ANON_KEY')
    || readNodeEnv('SUPABASE_ANON_KEY');
}

function getServerUrl(): string | undefined {
  return readNodeEnv('SUPABASE_URL') || readNodeEnv('VITE_SUPABASE_URL') || readViteEnv('VITE_SUPABASE_URL');
}

function getServerSecret(): string | undefined {
  return readNodeEnv('SUPABASE_SECRET_KEY') || readNodeEnv('SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Client configuration is intentionally separate from server configuration.
 * A public VITE key is safe for the browser, but it must never be used by the
 * privileged server store or token verifier as a silent fallback.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(getClientUrl() && getPublicKey());
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(getServerUrl() && getServerSecret());
}

// Client-side Supabase client (public anon/publishable key only)
let clientInstance: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient | null {
  if (!clientInstance) {
    const url = getClientUrl();
    const key = getPublicKey();
    if (url && key) {
      clientInstance = createClient(url, key);
    }
  }
  return clientInstance;
}

// Server-side Supabase client (privileged operations only).
// Never fall back to an exposed VITE/anon key here: a missing secret must put
// server persistence in an explicit offline mode, not in a half-authorized mode.
let serverInstance: SupabaseClient | null = null;
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!serverInstance && isSupabaseServerConfigured()) {
    serverInstance = createClient(getServerUrl()!, getServerSecret()!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverInstance;
}

// Dedicated verifier for request bearer tokens. `auth.getUser(token)` asks
// Supabase Auth to validate the JWT instead of trusting user supplied headers.
let authVerifierInstance: SupabaseClient | null = null;
export function getSupabaseAuthVerifier(): SupabaseClient | null {
  if (!authVerifierInstance && isSupabaseServerConfigured()) {
    authVerifierInstance = createClient(getServerUrl()!, getServerSecret()!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return authVerifierInstance;
}
