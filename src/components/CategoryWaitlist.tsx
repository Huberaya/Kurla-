import React, { useState } from 'react';
import { Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { analytics } from '../lib/analytics';

/**
 * Alerte « préviens-moi » pour un rayon annoncé mais encore vide.
 *
 * Trois audiences sont mises en avant par la home et par une page marketing
 * complète — peau, hommes, enfants — sans qu'aucun produit ne soit publié.
 * Avant, ces pages renvoyaient vers une boutique filtrée qui n'affichait
 * rien, ou vers `/boutique?category=skincare`, un paramètre que la page ne lit
 * pas : la visiteuse atterrissait sur les 64 produits sans comprendre.
 *
 * Ce composant transforme ce cul-de-sac en intention enregistrée : une adresse
 * capturée vaut mieux qu'une page vide. Le message annonce la couleur — on ne
 * promet ni date ni produit, on propose de prévenir.
 *
 * La `source` transmise au serveur identifie le rayon, pour que la relance
 * future ne s'adresse qu'aux personnes concernées.
 */

type Props = {
  /** Identifiant du rayon, tel qu'accepté par `/api/waitlist`. */
  source: string;
  /**
   * Groupe nominal SANS article : « soins visage », « produits grooming ».
   * La phrase fournit l'article — le passer ici le doublerait.
   */
  label: string;
  tone?: 'light' | 'dark';
  className?: string;
};

export const CategoryWaitlist: React.FC<Props> = ({ source, label, tone = 'light', className = '' }) => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  const dark = tone === 'dark';
  const border = dark ? 'border-[#FFF7EF]/15' : 'border-[#E8E1DA]';
  const inputBg = dark ? 'bg-[#FFF7EF]/5 text-[#FFF7EF]' : 'bg-white text-[#111111]';
  const muted = dark ? 'text-[#FFF7EF]/60' : 'text-[#111111]/60';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || state === 'loading') return;
    setState('loading');
    setError('');
    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          profileType: 'client',
          country: 'FR',
          source,
          utmSource: params.get('utm_source') || undefined,
          utmMedium: params.get('utm_medium') || undefined,
          utmCampaign: params.get('utm_campaign') || undefined
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Inscription impossible pour le moment.');
      }
      try { analytics.waitlistJoin('client'); } catch { /* l'analytique ne doit jamais bloquer */ }
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <div className={`flex items-start gap-2.5 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className={`text-xs leading-relaxed ${dark ? 'text-[#FFF7EF]/85' : 'text-[#111111]/80'}`}>
          C’est noté. Tu recevras un e-mail dès que les <strong className="font-semibold">{label}</strong> seront disponibles — pas avant, pas de newsletter déguisée.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor={`waitlist-${source}`}>Adresse e-mail</label>
        <input
          id={`waitlist-${source}`}
          type="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="ton@email.fr"
          className={`flex-1 px-4 py-2.5 rounded-full border ${border} ${inputBg} text-xs outline-none focus:border-[#C8753D] placeholder:opacity-50`}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="px-5 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
        >
          {state === 'loading'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Bell className="w-3.5 h-3.5" />}
          Préviens-moi
        </button>
      </div>
      {error
        ? <p className="mt-2 text-[11px] text-red-400">{error}</p>
        : <p className={`mt-2 text-[11px] ${muted}`}>
            Un seul e-mail, quand les <strong className="font-semibold">{label}</strong> arriveront en boutique. Désinscription en un clic.
          </p>}
    </form>
  );
};
