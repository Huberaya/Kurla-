import React, { createContext, useContext, useState, useEffect } from 'react';
import { translateAuthError } from '../lib/authErrors';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserProfile, UserRole } from '../types';

interface SignUpParams {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface SignInParams {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  /**
   * `needsConfirmation` distingue « compte créé, session ouverte » de
   * « compte créé, email de confirmation envoyé ». Sans cette distinction le
   * modal annonçait un compte actif alors qu'aucune session n'existait.
   */
  signUp: (params: SignUpParams) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signIn: (params: SignInParams) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  /**
   * Supabase émet `PASSWORD_RECOVERY` quand l'URL porte un jeton de
   * réinitialisation. Sans ce drapeau, l'utilisateur arrivait avec une session
   * de récupération et **aucun moyen de définir un nouveau mot de passe** :
   * `updateUser` n'était appelé nulle part dans le dépôt.
   */
  isPasswordRecovery: boolean;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  refetchProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local fallback state key for offline / dev preview persistence
const LOCAL_STORAGE_USER_KEY = 'kurla_local_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  /** Vrai entre l'arrivée du lien de réinitialisation et la saisie du nouveau mot de passe. */
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  const supabase = getSupabaseClient();

  // Helper to fetch profile from public.profiles
  const fetchProfile = async (userId: string, email: string) => {
    if (!supabase) return null;
    try {
      const { data, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (pError || !data) {
        console.warn('[AuthContext] Profile not found or error, creating default profile row:', pError);
        const newProfilePayload = {
          id: userId,
          email,
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || '',
          /**
           * `role` est volontairement ABSENT de ce payload.
           *
           * L'upsert est fait sur `onConflict: 'id'` : PostgREST ne met à jour
           * que les colonnes fournies. Écrire `role: 'customer'` ici signifiait
           * qu'une simple lecture de profil en échec **rétrogradait un compte
           * existant** — y compris le seul superadmin. Et la rétrogradation est
           * à sens unique : la politique RLS autorise l'écriture via
           * `OR public.is_admin()`, donc l'admin peut écraser son propre rôle,
           * après quoi `is_admin()` devient faux et l'accès est perdu.
           *
           * Sans la colonne, un profil neuf reçoit le défaut de la base
           * (`role TEXT NOT NULL DEFAULT 'customer'`) et un profil existant
           * conserve le sien. Le rôle ne s'écrit jamais depuis le client.
           */
          country: 'FR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert(newProfilePayload, { onConflict: 'id' })
          .select()
          .single();

        if (created) return created as UserProfile;
        return {
          id: userId,
          email,
          role: 'customer' as UserRole,
        };
      }
      return data as UserProfile;
    } catch (err) {
      console.error('[AuthContext] Profile fetch error:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!supabase) {
        // Fallback local memory session
        const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (mounted) {
              setProfile(parsed.profile);
              setUser({ id: parsed.profile.id, email: parsed.profile.email } as any);
            }
          } catch (e) {
            localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
          }
        }
        if (mounted) setLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession?.user && mounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          const p = await fetchProfile(initialSession.user.id, initialSession.user.email || '');
          if (mounted) setProfile(p);
        }
      } catch (err: any) {
        console.error('[AuthContext] Session init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user || null);

        /**
         * `PASSWORD_RECOVERY` : l'URL porte un jeton de réinitialisation. La
         * session est ouverte mais le mot de passe n'est pas encore changé —
         * sans ce drapeau, rien dans l'interface ne proposait de le faire.
         */
        if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);

        if (currentSession?.user) {
          const p = await fetchProfile(currentSession.user.id, currentSession.user.email || '');
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signUp = async ({ email, password, firstName, lastName }: SignUpParams) => {
    setError(null);
    setLoading(true);

    /**
     * Pas de repli simulé ici non plus — c'était le second exemplaire du même
     * piège. Il fabriquait un identifiant aléatoire `usr_xxxxxx`, un profil
     * `role: 'customer'`, l'écrivait dans `localStorage` et renvoyait
     * `success: true`. Le visiteur se croyait inscrit ; aucun compte n'existait,
     * et le faux profil survivait au rechargement de la page.
     */
    if (!supabase) {
      const msg = 'Inscription indisponible : la configuration du service est incomplète.';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }

    try {
      const { data, error: sError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/account` : 'http://localhost:3000/account',
          data: {
            first_name: firstName || '',
            last_name: lastName || '',
            prenom: firstName || '',
            nom: lastName || '',
          }
        }
      });

      if (sError) {
        const msg = translateAuthError(sError.message);
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      /**
       * `mailer_autoconfirm` est à `false` sur ce projet : `signUp` renvoie un
       * `user` mais **`session = null`** tant que l'email n'est pas confirmé.
       *
       * L'ancien code appelait setUser puis setSession dans tous les cas. Il
       * installait donc un utilisateur **sans session** — une demi-connexion
       * qui ne survit pas au rechargement — puis annonçait « Compte créé avec
       * succès ». C'est très exactement le symptôme « la plateforme ne retient
       * pas mes identifiants » : rien n'était faux côté Supabase, tout était
       * faux côté interface.
       */
      if (data.user && !data.session) {
        setLoading(false);
        return { success: true, needsConfirmation: true };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);

        // Explicitly create profile entry
        const profilePayload: Partial<UserProfile> = {
          id: data.user.id,
          email: data.user.email || email,
          first_name: firstName || '',
          last_name: lastName || '',
          /**
           * `role` absent, comme dans fetchProfile : l'upsert porte sur
           * `onConflict: 'id'`, donc écrire `role` ici écraserait le rôle d'un
           * compte existant. La colonne porte NOT NULL DEFAULT 'customer'.
           */
          country: 'FR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: pData, error: pErr } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' })
          .select()
          .single();

        if (!pErr && pData) {
          setProfile(pData as UserProfile);
        } else {
          /**
           * L'écriture a échoué (RLS, réseau) : on n'installe pas un profil
           * local en laissant croire qu'il est en base. `null` laisse les
           * écrans afficher leur état « non authentifié », qui est la vérité.
           */
          console.warn('[AuthContext] profil non écrit à l’inscription :', pErr);
          setProfile(null);
        }
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = translateAuthError(err.message);
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  const signIn = async ({ email, password }: SignInParams) => {
    setError(null);
    setLoading(true);

    /**
     * Il n'y a plus de repli simulé. L'ancien code fabriquait, quand le client
     * Supabase était absent, un faux profil `role: 'customer'` et renvoyait
     * `success: true` : l'écran affichait une connexion réussie qui n'existait
     * nulle part, et un administrateur se retrouvait sans accès sans aucune
     * erreur. Une authentification qui ne peut pas être vérifiée doit échouer.
     */
    if (!supabase) {
      const msg = 'Authentification indisponible : la configuration du service est incomplète.';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }

    try {
      const { data, error: sError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (sError) {
        const msg = translateAuthError(sError.message);
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const p = await fetchProfile(data.user.id, data.user.email || email);
        setProfile(p);
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = translateAuthError(err.message);
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    setLoading(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    if (!email) {
      return { success: false, error: 'Veuillez saisir votre adresse email.' };
    }

    if (!supabase) {
      return {
        success: true,
        message: 'Un lien de réinitialisation vous a été envoyé (mode démo).'
      };
    }

    try {
      const { error: rErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/account?reset_password=true`
      });

      if (rErr) {
        return { success: false, error: rErr.message };
      }

      return {
        success: true,
        message: 'Un lien de réinitialisation du mot de passe a été envoyé à votre adresse email.'
      };
    } catch (err: any) {
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  /**
   * Écrit le nouveau mot de passe sur la session courante.
   *
   * C'est la seule voie après un lien de réinitialisation : la session de
   * récupération ne permet que cela. `updateUser` n'était appelé nulle part
   * dans le dépôt — la réinitialisation aboutissait donc à une session ouverte
   * sans aucun moyen de changer le mot de passe.
   */
  const updatePassword = async (newPassword: string) => {
    setError(null);
    if (!supabase) {
      return { success: false, error: 'Authentification Supabase indisponible.' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères.' };
    }

    try {
      const { data, error: uErr } = await supabase.auth.updateUser({ password: newPassword });
      if (uErr) {
        const msg = uErr.message.includes('New password should be different')
          ? 'Le nouveau mot de passe doit être différent de l’actuel.'
          : uErr.message.includes('Password should be at least')
            ? 'Le mot de passe doit contenir au moins 6 caractères.'
            : uErr.message;
        setError(msg);
        return { success: false, error: msg };
      }
      /**
       * `updateUser` ne renvoie que `{ user }` dans cette version de
       * supabase-js : la session de récupération reste valable après le
       * changement de mot de passe, il n'y a donc rien à remplacer ici.
       */
      if (data?.user) setUser(data.user);
      setIsPasswordRecovery(false);
      return { success: true };
    } catch (err: any) {
      const msg = translateAuthError(err.message);
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const updateProfile = async (updated: Partial<UserProfile>) => {
    if (!user && !profile) {
      return { success: false, error: 'Vous devez être connecté pour modifier votre profil.' };
    }

    // SECURITY GUARANTEE: Never allow user to modify their own role from the frontend!
    const { role, id, created_at, email, ...allowedUpdates } = updated;
    const targetUserId = user?.id || profile?.id;

    if (supabase && targetUserId) {
      try {
        const { data, error: uErr } = await supabase
          .from('profiles')
          .update({
            ...allowedUpdates,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetUserId)
          .select()
          .single();

        if (uErr) {
          console.error('[AuthContext] Update profile error:', uErr);
          return { success: false, error: translateAuthError(uErr.message) };
        }

        if (data) {
          setProfile(data as UserProfile);
        }
      } catch (err: any) {
        return { success: false, error: translateAuthError(err.message) };
      }
    } else {
      // Local fallback state
      const newProf = { ...profile, ...allowedUpdates } as UserProfile;
      setProfile(newProf);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify({ profile: newProf }));
    }

    return { success: true };
  };

  const refetchProfile = async () => {
    const targetUserId = user?.id || profile?.id;
    const targetEmail = user?.email || profile?.email || '';
    if (targetUserId) {
      const p = await fetchProfile(targetUserId, targetEmail);
      if (p) setProfile(p);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        error,
        isPasswordRecovery,
        updatePassword,
        isConfigured: isSupabaseConfigured(),
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
        refetchProfile,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé au sein d’un AuthProvider');
  }
  return context;
};
