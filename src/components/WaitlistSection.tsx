import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Tag, Loader2 } from 'lucide-react';
import { analytics } from '../lib/analytics';

export const WaitlistSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [profileType, setProfileType] = useState<'client' | 'pro'>('client');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams(window.location.search);
      const utm = {
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined
      };
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), profileType, country: 'FR', ...utm })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Inscription impossible pour le moment.');
      }
      try { analytics.waitlistJoin(profileType); } catch { /* noop */ }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="waitlist" className="py-24 bg-kurla-sand text-kurla-carbon relative border-t border-kurla-stone overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,117,61,0.1),transparent_70%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-kurla-ivory border border-kurla-stone text-kurla-copper text-xs font-semibold tracking-wider uppercase mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-kurla-copper" /> Lancement fermé — 300 testeurs
        </div>

        <h2 className="text-3xl sm:text-5xl font-serif-title font-bold text-kurla-carbon mb-4 leading-tight">
          Soyez parmi les premiers servis.
        </h2>

        <p className="text-base sm:text-lg text-kurla-carbon/80 font-light max-w-xl mx-auto mb-8 leading-relaxed">
          Laissez votre e-mail pour rejoindre la liste d’attente du pilote fermé. Les premières personnes sélectionnées recevront un accès prioritaire au diagnostic, à la Shelf et au suivi de routine.
        </p>

        {/* Profile Selector (Client vs Pro) */}
        <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-kurla-ivory border border-kurla-stone mb-8 shadow-xs">
          <button
            type="button"
            onClick={() => setProfileType('client')}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
              profileType === 'client'
                ? 'bg-kurla-copper text-white shadow-xs'
                : 'text-kurla-carbon/70 hover:text-kurla-carbon'
            }`}
          >
            Je cherche mes soins
          </button>
          <button
            type="button"
            onClick={() => setProfileType('pro')}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
              profileType === 'pro'
                ? 'bg-kurla-copper text-white shadow-xs'
                : 'text-kurla-carbon/70 hover:text-kurla-carbon'
            }`}
          >
            Je suis coiffeur / expert
          </button>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl bg-kurla-ivory border border-emerald-500/40 text-emerald-700 font-semibold text-base inline-flex items-center gap-3 shadow-md animate-in fade-in duration-300">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            Merci ! Votre demande d’accès au pilote est enregistrée pour {email}.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={profileType === 'client' ? "Votre adresse e-mail" : "E-mail professionnel ou salon"}
              required
              className="flex-1 px-5 py-4 rounded-full bg-kurla-ivory border border-kurla-stone text-kurla-carbon placeholder-kurla-carbon/40 text-sm focus:outline-none focus:border-kurla-copper shadow-xs transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 rounded-full bg-kurla-copper hover:bg-kurla-cocoa disabled:opacity-60 text-white text-sm font-semibold tracking-wide shadow-md shadow-kurla-copper/20 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Inscription…</> : <>Rejoindre <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {error && !submitted && (
          <p className="mt-3 text-sm text-rose-600 font-medium">{error}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-kurla-carbon/60">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-kurla-copper" /> Sélection progressive jusqu’à 300 testeurs
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-kurla-copper" /> Pas de spam, désinscription en 1 clic
          </span>
        </div>

      </div>
    </section>
  );
};
