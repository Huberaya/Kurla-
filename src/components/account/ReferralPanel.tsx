import React, { useEffect, useState, useCallback } from 'react';
import { Gift, Copy, Check, Share2, Users, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type ReferralStatus = {
  code: string;
  link: string;
  rewardEur: number;
  friendMinOrderEur: number;
  rewardedFriends: number;
};

/**
 * Panneau de parrainage 10/10 €.
 * - Lecture du statut (GET /api/referral)
 * - Activation qui crée le coupon filleul (POST /api/referral/activate)
 * - Partage (Web Share / copie) du lien et du code.
 */
export const ReferralPanel: React.FC = () => {
  const { session } = useAuth();
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) { setLoading(false); return; }
    try {
      const res = await fetch('/api/referral', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setStatus(await res.json());
    } catch {
      setError('Impossible de charger le parrainage pour le moment.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const activate = async () => {
    if (!session?.access_token || activating) return;
    setActivating(true);
    setError(null);
    try {
      const res = await fetch('/api/referral/activate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || 'Activation impossible.'); return; }
      setStatus(data);
    } catch {
      setError('Impossible d’activer le parrainage pour le moment.');
    } finally {
      setActivating(false);
    }
  };

  const copy = async (what: 'link' | 'code') => {
    if (!status) return;
    const text = what === 'link' ? status.link : status.code;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  };

  const share = async () => {
    if (!status) return;
    const shareText = `10 € offerts sur ta première commande KURLA avec mon code ${status.code} 🎁 ${status.link}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'KURLA — 10 € offerts', text: shareText, url: status.link }); return; } catch { /* annulation */ }
    }
    copy('link');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-[#FFF7EF]/60"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement du parrainage…</div>;
  }
  if (!session?.user) {
    return <div className="p-6 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-sm text-[#FFF7EF]/70">Connectez-vous à votre compte pour parrainer vos proches.</div>;
  }

  const reward = status?.rewardEur ?? 10;
  const minOrder = status?.friendMinOrderEur ?? 49;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-[#D49A63]" />
        <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF]">Parrainage — {reward} € pour vous, {reward} € pour vos proches</h2>
      </div>

      <div className="rounded-3xl border border-[#C8753D]/30 bg-gradient-to-br from-[#1A0F0A] to-[#050403] p-6 shadow-xl">
        <p className="text-sm text-[#FFF7EF]/75 leading-relaxed">
          Partagez votre code : vos proches reçoivent <b className="text-[#D49A63]">{reward} €</b> sur leur première commande
          (dès {minOrder} € d’achat). Dès qu’elles paient, <b className="text-[#D49A63]">vous recevez {reward} €</b> de réduction
          sur votre prochaine commande, sans minimum.
        </p>

        {!status ? (
          <button
            onClick={activate}
            disabled={activating}
            className="mt-5 px-6 py-3 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white text-sm font-semibold shadow-lg flex items-center gap-2 disabled:opacity-60"
          >
            {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Activer mon parrainage
          </button>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Code */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#FFF7EF]/50 font-bold mb-1.5">Votre code</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 rounded-xl bg-[#3A2218] border border-dashed border-[#C8753D]/60 text-center">
                  <span className="text-lg font-bold tracking-[2px] text-[#FFF7EF]">{status.code}</span>
                </div>
                <button onClick={() => copy('code')} className="px-4 py-3 rounded-xl bg-[#FFF7EF]/10 hover:bg-[#FFF7EF]/15 text-[#FFF7EF] flex items-center gap-1.5 text-sm font-semibold" aria-label="Copier le code">
                  {copied === 'code' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied === 'code' ? 'Copié' : 'Copier'}
                </button>
              </div>
            </div>

            {/* Lien */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#FFF7EF]/50 font-bold mb-1.5">Votre lien de parrainage</p>
              <div className="flex items-center gap-2">
                <input readOnly value={status.link} onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 px-3 py-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/80" />
                <button onClick={() => copy('link')} className="px-3 py-3 rounded-xl bg-[#FFF7EF]/10 hover:bg-[#FFF7EF]/15 text-[#FFF7EF] flex items-center gap-1.5 text-sm font-semibold shrink-0" aria-label="Copier le lien">
                  {copied === 'link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={share} className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white flex items-center gap-1.5 text-sm font-semibold shrink-0" aria-label="Partager">
                  <Share2 className="w-4 h-4" /> Partager
                </button>
              </div>
            </div>

            {/* Compteur filleuls */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#FFF7EF]/10 text-sm">
              <Users className="w-4 h-4 text-[#D49A63]" />
              <span className="text-[#FFF7EF]/75">
                <b className="text-[#FFF7EF]">{status.rewardedFriends}</b> filleul{status.rewardedFriends > 1 ? 's' : ''} récompensé{status.rewardedFriends > 1 ? 's' : ''}
                {' '}— soit <b className="text-emerald-300">{status.rewardedFriends * reward} €</b> de réduction gagnés
              </span>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-xs text-rose-300">{error}</p>}

        <p className="mt-4 text-[11px] text-[#FFF7EF]/45 leading-relaxed">
          La récompense est déclenchée à la première commande payée d’un filleul (hors remboursement). Elle prend la forme
          d’un code de réduction unique envoyé par email, utilisable une fois. Le parrainage n’est pas cumulable avec un
          autre code promo sur une même commande.
        </p>
      </div>
    </div>
  );
};
