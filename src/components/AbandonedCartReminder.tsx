import React, { useEffect, useState } from 'react';
import { ShoppingBag, X, Tag, ArrowRight } from 'lucide-react';
import { DISPATCH_LEGAL, DISPATCH_SENTENCE, DISPATCH_SHORT } from '../lib/preorderPromise';

interface Props {
  count: number;
  onOpenCart: () => void;
}

const DISMISS_KEY = 'kurla_cart_reminder_dismissed_at';
const LAST_VISIT_KEY = 'kurla_last_visit_at';

/**
 * Relance panier abandonné — version 100 % client (aucun email n'est connu pour
 * un visiteur anonyme avant Stripe). S'affiche UNIQUEMENT en retour de visite
 * (absence ≥ 24 h), si le panier contient des articles et si l'utilisateur ne
 * l'a pas déjà écarté depuis 7 jours. Non bloquant, un seul code promo affiché.
 */
export const AbandonedCartReminder: React.FC<Props> = ({ count, onOpenCart }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const now = Date.now();
      const lastVisit = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      // On marque la visite courante pour la comparaison suivante.
      localStorage.setItem(LAST_VISIT_KEY, String(now));

      const day = 24 * 60 * 60 * 1000;
      const awayLongEnough = lastVisit && now - lastVisit >= day;
      const notDismissedRecently = !dismissedAt || now - dismissedAt >= 7 * day;

      if (count > 0 && awayLongEnough && notDismissedRecently) {
        const t = setTimeout(() => setVisible(true), 1500); // laisse la page s'installer
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage indisponible : pas de relance */
    }
  }, [count]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setVisible(false);
  };

  if (!visible || count === 0) return null;

  return (
    <div
      role="dialog"
      aria-label="Votre panier vous attend"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-40 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="rounded-2xl bg-[#1A0F0A] border border-[#C8753D]/30 shadow-2xl shadow-black/40 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[#D49A63]">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm font-bold text-[#FFF7EF]">Votre panier vous attend</span>
          </div>
          <button onClick={dismiss} aria-label="Fermer" className="text-[#FFF7EF]/50 hover:text-[#FFF7EF]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#FFF7EF]/70 leading-relaxed">
          Vous avez <strong className="text-[#FFF7EF]">{count} article{count > 1 ? 's' : ''}</strong> en attente dans votre panier.
          {DISPATCH_SENTENCE}
        </p>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2">
          <Tag className="w-4 h-4 text-emerald-300 shrink-0" />
          <p className="text-[11px] text-emerald-200">
            Code <strong className="font-mono">BIENVENUE15</strong> : −15 % sur votre première commande.
          </p>
        </div>
        <button
          onClick={() => { dismiss(); onOpenCart(); }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] hover:from-[#b06330] px-4 py-3 text-xs font-semibold text-white transition-all"
        >
          Reprendre ma commande <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
