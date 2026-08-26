import React, { useState } from 'react';
import { X, Sparkles, Mail, Lock, User, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}) => {
  const { signIn, signUp, resetPassword, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Status messages
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSwitchMode = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    setLocalError(null);
    setSuccessMsg(null);
    clearError();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setLocalError('Veuillez remplir tous les champs.');
      return;
    }

    const res = await signIn({ email, password });
    if (res.success) {
      setSuccessMsg('Connexion réussie ! Bienvenue sur KURLA Beauty.');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 800);
    } else {
      setLocalError(res.error || 'Erreur lors de la connexion.');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);

    if (!email || !password || !firstName || !lastName) {
      setLocalError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!termsAccepted) {
      setLocalError('Veuillez accepter les conditions d’utilisation de KURLA.');
      return;
    }

    const res = await signUp({
      email,
      password,
      firstName,
      lastName
    });

    if (res.success) {
      setSuccessMsg('Compte créé avec succès ! Votre profil public.profiles est actif.');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1000);
    } else {
      setLocalError(res.error || 'Erreur lors de l’inscription.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);

    if (!email) {
      setLocalError('Veuillez saisir votre adresse email.');
      return;
    }

    const res = await resetPassword(email);
    if (res.success) {
      setSuccessMsg(res.message || 'Un lien de réinitialisation vous a été envoyé.');
    } else {
      setLocalError(res.error || 'Erreur lors de l’envoi du message de réinitialisation.');
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050403]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#1A0F0A] rounded-3xl border border-[#C8753D]/30 shadow-2xl overflow-hidden p-6 sm:p-8 text-[#FFF7EF]">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#FFF7EF]/60 hover:text-white hover:bg-[#FFF7EF]/10 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#3A2218] via-[#C8753D] to-[#D49A63] flex items-center justify-center text-white font-serif-title font-bold text-xl mx-auto mb-3 shadow-lg shadow-[#C8753D]/30">
            K
          </div>
          <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">
            {mode === 'login' && 'Connexion à votre espace'}
            {mode === 'signup' && 'Créer votre compte KURLA'}
            {mode === 'forgot' && 'Mot de passe oublié'}
          </h2>
          <p className="text-xs text-[#FFF7EF]/60 mt-1">
            {mode === 'login' && 'Accédez à vos diagnostics, routines et commandes.'}
            {mode === 'signup' && 'Rejoignez le premier univers Afro & Melanin Beauty-Tech.'}
            {mode === 'forgot' && 'Entrez votre email pour recevoir les instructions.'}
          </p>
        </div>

        {/* Error Alert Banner */}
        {displayError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{displayError}</div>
          </div>
        )}

        {/* Success Confirmation Banner */}
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* Form rendering */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#FFF7EF]/80 mb-1.5">Adresse Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#FFF7EF]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#FFF7EF]/80">Mot de passe</label>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('forgot')}
                  className="text-[11px] text-[#C8753D] hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#FFF7EF]/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all shadow-lg shadow-[#C8753D]/25 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-3 border-t border-[#FFF7EF]/10">
              <span className="text-xs text-[#FFF7EF]/60">Pas encore de compte ? </span>
              <button
                type="button"
                onClick={() => handleSwitchMode('signup')}
                className="text-xs font-bold text-[#C8753D] hover:underline"
              >
                S’inscrire gratuitement
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#FFF7EF]/80 mb-1">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Aminata"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#FFF7EF]/80 mb-1">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Traoré"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#FFF7EF]/80 mb-1">Adresse Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#FFF7EF]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aminata@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#FFF7EF]/80 mb-1">Mot de passe (min. 6 caractères)</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#FFF7EF]/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#FFF7EF]/80 mb-1">Confirmer le mot de passe</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-[#FFF7EF]/40" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 rounded bg-[#050403] border-[#FFF7EF]/20 text-[#C8753D] focus:ring-[#C8753D]"
              />
              <label htmlFor="terms" className="text-[11px] text-[#FFF7EF]/70 leading-tight cursor-pointer">
                J’accepte les conditions générales et la politique de confidentialité KURLA. Rôle attribué : <strong className="text-[#C8753D]">Customer</strong>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all shadow-lg shadow-[#C8753D]/25 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Inscription en cours...
                </>
              ) : (
                <>
                  Créer mon compte <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2 border-t border-[#FFF7EF]/10">
              <span className="text-xs text-[#FFF7EF]/60">Déjà inscrit ? </span>
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-xs font-bold text-[#C8753D] hover:underline"
              >
                Se connecter
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#FFF7EF]/80 mb-1.5">Adresse Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#FFF7EF]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all shadow-lg shadow-[#C8753D]/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...
                </>
              ) : (
                'Envoyer le lien de réinitialisation'
              )}
            </button>

            <div className="text-center pt-3 border-t border-[#FFF7EF]/10">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-xs font-bold text-[#C8753D] hover:underline"
              >
                ← Retour à la connexion
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
