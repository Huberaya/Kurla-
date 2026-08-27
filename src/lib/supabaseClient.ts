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
  if (isMemoryStoreMode()) return false;
  return Boolean(getClientUrl() && getPublicKey());
}

export type SupabaseStoreMode = 'memory' | 'server' | 'auto';

/**
 * Mode de liaison des stores serveur.
 *
 * Historiquement, la présence de `SUPABASE_URL` + d'une clé secrète suffisait à
 * basculer tous les stores sur la base réelle. Les tests unitaires n'avaient
 * donc pas un comportement stable : ils passaient en local sans variables
 * d'environnement et échouaient dès qu'un projet Supabase était configuré, sur
 * des identifiants de fixture non UUID et des contraintes de clé étrangère.
 *
 * `KURLA_STORE_MODE` rend ce choix explicite :
 * - `memory` : repli mémoire forcé, quelle que soit la configuration présente ;
 * - `server` : base réelle exigée (voir `describeStoreBinding`) ;
 * - `auto` (défaut) : comportement historique, base réelle si configurée.
 */
export function getSupabaseStoreMode(): SupabaseStoreMode {
  const raw = (readNodeEnv('KURLA_STORE_MODE') || '').trim().toLowerCase();
  if (raw === 'memory') return 'memory';
  if (raw === 'server') return 'server';
  return 'auto';
}

function hasSupabaseServerCredentials(): boolean {
  return Boolean(getServerUrl() && getServerSecret());
}

export function isSupabaseServerConfigured(): boolean {
  if (isMemoryStoreMode()) return false;
  return hasSupabaseServerCredentials();
}

/**
 * Vrai quand `KURLA_STORE_MODE=memory` désactive toute liaison Supabase.
 *
 * Le mode mémoire couvre aussi le client public : un banc unitaire qui
 * construirait un client Supabase initialiserait un transport realtime, ce qui
 * échoue sur Node 20 (WebSocket natif absent) et rendrait la suite dépendante de
 * la version de Node alors qu'elle ne touche aucune base.
 */
function isMemoryStoreMode(): boolean {
  return getSupabaseStoreMode() === 'memory';
}

/**
 * Décrit la liaison effective des stores. Utilisé par les bancs de test pour
 * annoncer ce qu'ils mesurent vraiment, et pour refuser de faire passer un run
 * « base réelle » qui tournerait en silence sur le repli mémoire.
 */
export function describeStoreBinding(): {
  mode: SupabaseStoreMode;
  binding: 'supabase' | 'memory';
  credentialsPresent: boolean;
  unsatisfied: boolean;
} {
  const mode = getSupabaseStoreMode();
  const credentialsPresent = hasSupabaseServerCredentials();
  return {
    mode,
    binding: mode === 'memory' || !credentialsPresent ? 'memory' : 'supabase',
    credentialsPresent,
    unsatisfied: mode === 'server' && !credentialsPresent,
  };
}

// Client-side Supabase client (public anon/publishable key only)
let clientInstance: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient | null {
  if (isMemoryStoreMode()) return null;
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
