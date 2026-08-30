import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Changement de mot de passe pour un utilisateur déjà connecté.
 *
 * Nécessaire à l'exigence « je dois pouvoir accéder à ce compte à tout moment » :
 * `updatePassword` existait dans le contexte mais n'était atteignable que par le
 * panneau de récupération. Sans écran dédié, un mot de passe posé par
 * l'administrateur ne pouvait plus être remplacé par l'utilisateur lui-même.
 */
export const ChangePasswordForm: React.FC = () => {
  const { user, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setDone(false);

    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);

    if (res.success) {
      setPassword('');
      setConfirm('');
      setDone(true);
    } else {
      setLocalError(res.error || 'Impossible de mettre à jour le mot de passe.');
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4">
      <div className="flex items-center gap-3">
        <KeyRound className="w-5 h-5 text-[#C8753D]" />
        <h2 className="text-lg font-serif-title font-bold text-[#FFF7EF]">Changer mon mot de passe</h2>
      </div>
      <p className="text-xs text-[#FFF7EF]/60">
        Le nouveau mot de passe prend effet immédiatement sur tous vos appareils.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-[#FFF7EF]/80 mb-1">
            Nouveau mot de passe (min. 6 caractères)
          </label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={show}
              className="absolute right-3 top-2.5 text-[#FFF7EF]/40 hover:text-[#C8753D] transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#FFF7EF]/80 mb-1">Confirmer le mot de passe</label>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="w-full px-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] placeholder-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]"
          />
        </div>

        {localError && (
          <p className="flex items-start gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {localError}
          </p>
        )}
        {done && (
          <p className="flex items-start gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Mot de passe mis à jour.
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C8753D] text-white text-xs font-bold disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {busy ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
        </button>
      </form>
    </div>
  );
};
