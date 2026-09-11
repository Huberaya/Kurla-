import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { translateAuthError } from '../lib/authErrors';
import { analytics } from '../lib/analytics';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types';

interface SignUpParams { email: string; password: string; firstName?: string; lastName?: string; }
interface SignInParams { email: string; password: string; }

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signUp: (params: SignUpParams) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signIn: (params: SignInParams) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  isPasswordRecovery: boolean;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  refetchProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOCAL_STORAGE_USER_KEY = 'kurla_local_user_session';

// Helper différé : le chunk supabase (214 kB) n'est téléchargé qu'après le paint
// ou à la première action qui l'exige (connexion/inscription).
async function loadSupabase(): Promise<{ client: SupabaseClient | null; isConfigured: boolean }> {
  const mod = await import('../lib/supabaseClient');
  return { client: mod.getSupabaseClient(), isConfigured: mod.isSupabaseConfigured() };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // `false` au premier paint : on n'affiche pas de spinner bloquant le hero.
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const isConfiguredRef = useRef<boolean>(false);

  const fetchProfile = async (client: SupabaseClient | null, userId: string, email: string, metaFirstName?: string) => {
    if (!client) return null;
    try {
      const { data, error: pError } = await client.from('profiles').select('*').eq('id', userId).single();
      if (pError || !data) {
        const newProfilePayload: any = {
          id: userId, email,
          first_name: metaFirstName || '',
          last_name: '',
          country: 'FR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const { data: created } = await client.from('profiles').upsert(newProfilePayload, { onConflict: 'id' }).select().single();
        if (created) return created as UserProfile;
        return { id: userId, email, role: 'customer' as UserRole } as UserProfile;
      }
      return data as UserProfile;
    } catch { return null; }
  };

  const linkLaunchInvitation = async (currentSession: Session | null) => {
    const accessToken = currentSession?.access_token;
    if (!accessToken) return;
    try {
      await fetch('/api/launch/invitation/accept', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch {
      // Le rattachement est opportuniste : une migration absente ne doit pas
      // empêcher une connexion ou l'ouverture du compte.
    }
  };

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const schedule = (cb: () => void) => {
      if ('requestIdleCallback' in window) (window as any).requestIdleCallback(cb, { timeout: 2000 });
      else setTimeout(cb, 800);
    };

    schedule(async () => {
      try {
        const { client, isConfigured: cfg } = await loadSupabase();
        if (!mounted) return;
        supabaseRef.current = client;
        isConfiguredRef.current = cfg;
        setIsConfigured(cfg);

        if (!client) {
          const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (mounted) {
                setProfile(parsed.profile);
                setUser({ id: parsed.profile.id, email: parsed.profile.email } as any);
              }
            } catch { localStorage.removeItem(LOCAL_STORAGE_USER_KEY); }
          }
          return;
        }

        setLoading(true);
        try {
          const { data: { session: initialSession } } = await client.auth.getSession();
          if (initialSession?.user && mounted) {
            setSession(initialSession);
            setUser(initialSession.user);
            const p = await fetchProfile(client, initialSession.user.id, initialSession.user.email || '', initialSession.user.user_metadata?.first_name);
            if (mounted) setProfile(p);
            void linkLaunchInvitation(initialSession);
          }
        } catch (err) { console.error('[AuthContext] Session init error:', err); }
        finally { if (mounted) setLoading(false); }

        const { data: { subscription } } = client.auth.onAuthStateChange(async (event, currentSession) => {
          if (!mounted) return;
          setSession(currentSession);
          setUser(currentSession?.user || null);
          if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
          if (currentSession?.user) {
            const p = await fetchProfile(client, currentSession.user.id, currentSession.user.email || '', currentSession.user.user_metadata?.first_name);
            if (mounted) setProfile(p);
            void linkLaunchInvitation(currentSession);
          } else setProfile(null);
          setLoading(false);
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch (e) {
        console.error('[AuthContext] deferred init failed', e);
        if (mounted) setLoading(false);
      }
    });

    return () => { mounted = false; if (unsubscribe) unsubscribe(); };
  }, []);

  // Ensure client is loaded before any auth mutation
  const ensureClient = async (): Promise<SupabaseClient | null> => {
    if (supabaseRef.current !== null || isConfiguredRef.current) return supabaseRef.current;
    const { client, isConfigured: cfg } = await loadSupabase();
    supabaseRef.current = client;
    isConfiguredRef.current = cfg;
    setIsConfigured(cfg);
    return client;
  };

  const signUp = async ({ email, password, firstName, lastName }: SignUpParams) => {
    setError(null); setLoading(true);
    const client = await ensureClient();
    if (!client) { const msg = 'Inscription indisponible : la configuration du service est incomplète.'; setError(msg); setLoading(false); return { success: false, error: msg }; }
    try {
      const { data, error: sError } = await client.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/account` : 'http://localhost:3000/account',
          data: { first_name: firstName || '', last_name: lastName || '', prenom: firstName || '', nom: lastName || '' }
        }
      });
      if (sError) { const msg = translateAuthError(sError.message); setError(msg); setLoading(false); return { success: false, error: msg }; }
      try { analytics.signUp(); } catch {}
      if (data.user && !data.session) { setLoading(false); return { success: true, needsConfirmation: true }; }
      if (data.user) {
        setUser(data.user); setSession(data.session);
        const profilePayload: any = { id: data.user.id, email: data.user.email || email, first_name: firstName || '', last_name: lastName || '', country: 'FR', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        const { data: pData, error: pErr } = await client.from('profiles').upsert(profilePayload, { onConflict: 'id' }).select().single();
        if (!pErr && pData) setProfile(pData as UserProfile); else { console.warn('[AuthContext] profil non écrit à l’inscription :', pErr); setProfile(null); }
      }
      setLoading(false); return { success: true };
    } catch (err: any) { const msg = translateAuthError(err.message); setError(msg); setLoading(false); return { success: false, error: msg }; }
  };

  const signIn = async ({ email, password }: SignInParams) => {
    setError(null); setLoading(true);
    const client = await ensureClient();
    if (!client) { const msg = 'Authentification indisponible : la configuration du service est incomplète.'; setError(msg); setLoading(false); return { success: false, error: msg }; }
    try {
      const { data, error: sError } = await client.auth.signInWithPassword({ email, password });
      if (sError) { const msg = translateAuthError(sError.message); setError(msg); setLoading(false); return { success: false, error: msg }; }
      if (data.user) { setUser(data.user); setSession(data.session); const p = await fetchProfile(client, data.user.id, data.user.email || email); setProfile(p); }
      setLoading(false); return { success: true };
    } catch (err: any) { const msg = translateAuthError(err.message); setError(msg); setLoading(false); return { success: false, error: msg }; }
  };

  const signOut = async () => {
    setLoading(true);
    const client = supabaseRef.current || (await ensureClient());
    if (client) await client.auth.signOut();
    setUser(null); setSession(null); setProfile(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    if (!email) return { success: false, error: 'Veuillez saisir votre adresse email.' };
    const client = await ensureClient();
    if (!client) return { success: true, message: 'Un lien de réinitialisation vous a été envoyé (mode démo).' };
    try {
      const { error: rErr } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account?reset_password=true` });
      if (rErr) return { success: false, error: rErr.message };
      return { success: true, message: 'Un lien de réinitialisation du mot de passe a été envoyé à votre adresse email.' };
    } catch (err: any) { return { success: false, error: translateAuthError(err.message) }; }
  };

  const resendConfirmation = async (emailToConfirm: string) => {
    setError(null);
    const target = (emailToConfirm || '').trim();
    if (!target) return { success: false, error: 'Veuillez saisir votre adresse email.' };
    const client = await ensureClient();
    if (!client) return { success: false, error: 'Authentification indisponible : la configuration du service est incomplète.' };
    try {
      const { error: rcErr } = await client.auth.resend({ type: 'signup', email: target, options: { emailRedirectTo: `${window.location.origin}/account` } });
      if (rcErr) return { success: false, error: translateAuthError(rcErr.message) };
      return { success: true, message: 'Email de confirmation renvoyé. Vérifie ta boîte de réception (et les indésirables).' };
    } catch (err: any) { return { success: false, error: translateAuthError(err.message) }; }
  };

  const updatePassword = async (newPassword: string) => {
    setError(null);
    const client = await ensureClient();
    if (!client) return { success: false, error: 'Authentification Supabase indisponible.' };
    if (newPassword.length < 6) return { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères.' };
    try {
      const { data, error: uErr } = await client.auth.updateUser({ password: newPassword });
      if (uErr) {
        const msg = uErr.message.includes('New password should be different') ? 'Le nouveau mot de passe doit être différent de l’actuel.' : uErr.message.includes('Password should be at least') ? 'Le mot de passe doit contenir au moins 6 caractères.' : uErr.message;
        setError(msg); return { success: false, error: msg };
      }
      if (data?.user) setUser(data.user);
      setIsPasswordRecovery(false);
      return { success: true };
    } catch (err: any) { const msg = translateAuthError(err.message); setError(msg); return { success: false, error: msg }; }
  };

  const updateProfile = async (updated: Partial<UserProfile>) => {
    if (!user && !profile) return { success: false, error: 'Vous devez être connecté pour modifier votre profil.' };
    const { role, id, created_at, email, ...allowedUpdates } = updated as any;
    const targetUserId = user?.id || profile?.id;
    const client = supabaseRef.current || (await ensureClient());
    if (client && targetUserId) {
      try {
        const { data, error: uErr } = await client.from('profiles').update({ ...allowedUpdates, updated_at: new Date().toISOString() }).eq('id', targetUserId).select().single();
        if (uErr) { console.error('[AuthContext] Update profile error:', uErr); return { success: false, error: translateAuthError(uErr.message) }; }
        if (data) setProfile(data as UserProfile);
      } catch (err: any) { return { success: false, error: translateAuthError(err.message) }; }
    } else {
      const newProf = { ...profile, ...allowedUpdates } as UserProfile;
      setProfile(newProf);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify({ profile: newProf }));
    }
    return { success: true };
  };

  const refetchProfile = async () => {
    const targetUserId = user?.id || profile?.id;
    const targetEmail = user?.email || profile?.email || '';
    const client = supabaseRef.current || (await ensureClient());
    if (targetUserId && client) { const p = await fetchProfile(client, targetUserId, targetEmail); if (p) setProfile(p); }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, error, isPasswordRecovery, updatePassword, isConfigured, signUp, signIn, signOut, resetPassword, resendConfirmation, updateProfile, refetchProfile, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé au sein d’un AuthProvider');
  return context;
};
