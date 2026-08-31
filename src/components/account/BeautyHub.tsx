import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Droplets, Wind, CloudRain, Scissors, RefreshCw, Heart, Calendar, ShoppingBag, ChevronRight, MessageCircle } from 'lucide-react';

/**
 * Hub beauté de l'espace personnel : tableau de bord d'accueil centré sur la
 * personne (et non plus seulement sur les commandes). Lit le profil beauté KURLA
 * ID persistant (rempli par le diagnostic) et la dernière routine en session.
 */

type Props = {
  headers: HeadersInit;
  ordersCount: number;
  onNavigateTab: (tab: 'commandes' | 'profil') => void;
};

const UNKNOWN = 'inconnue';

function isKnown(v: unknown): boolean {
  return typeof v === 'string' && v.trim() !== '' && v !== UNKNOWN;
}

const HairChip: React.FC<{ icon: React.ReactNode; label: string; value?: string; missing?: boolean }> = ({ icon, label, value, missing }) => (
  <div className={`rounded-2xl border p-4 ${missing ? 'bg-[#050403] border-dashed border-[#FFF7EF]/15' : 'bg-[#050403] border-[#FFF7EF]/10'}`}>
    <div className="flex items-center gap-2 text-[#C8753D]">{icon}<span className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">{label}</span></div>
    {missing ? (
      <p className="text-[11px] text-[#FFF7EF]/40 mt-2 italic">À renseigner</p>
    ) : (
      <p className="text-sm font-bold text-[#FFF7EF] mt-2 capitalize">{value}</p>
    )}
  </div>
);

export const BeautyHub: React.FC<Props> = ({ headers, ordersCount, onNavigateTab }) => {
  const [profile, setProfile] = useState<any>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestRoutine, setLatestRoutine] = useState<any>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/beauty-profile', { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!active || !data) return;
        setProfile(data.record?.profile ?? null);
        setConfidence(typeof data.record?.confidence?.overall === 'number' ? Math.round(data.record.confidence.overall * 100) : null);
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    try {
      const raw = sessionStorage.getItem('kurla_diagnostic_result');
      if (raw) setLatestRoutine(JSON.parse(raw));
    } catch { /* ignore */ }
    return () => { active = false; };
  }, [headers]);

  const hair = profile?.hair ?? {};
  const texture = Array.isArray(hair.texturePatterns) ? hair.texturePatterns.find(isKnown) : undefined;
  const porosity = isKnown(hair.porosity) ? hair.porosity : undefined;
  const scalp = isKnown(hair.scalpCondition) ? hair.scalpCondition : undefined;
  const wash = isKnown(hair.washFrequency) ? hair.washFrequency : undefined;
  const budget = isKnown(hair.budget) ? hair.budget : undefined;
  const filledCount = [texture, porosity, scalp, wash, budget].filter(Boolean).length;
  const hasProfile = filledCount > 0;

  const quickLink = (href: string, icon: React.ReactNode, title: string, sub: string, primary?: boolean) => (
    <a
      href={href}
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group ${
        primary ? 'bg-gradient-to-r from-[#C8753D] to-[#D49A63] border-transparent text-white' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
      }`}
    >
      <span className={primary ? 'text-white' : 'text-[#C8753D]'}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${primary ? 'text-white' : 'text-[#FFF7EF]'}`}>{title}</p>
        <p className={`text-[11px] ${primary ? 'text-white/80' : 'text-[#FFF7EF]/55'}`}>{sub}</p>
      </div>
      <ChevronRight className={`w-4 h-4 ${primary ? 'text-white' : 'text-[#FFF7EF]/30 group-hover:text-[#C8753D]'}`} />
    </a>
  );

  return (
    <div className="space-y-6">
      {/* Bannière d'accueil */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1A0F0A] to-[#3A2218]/60 border border-[#C8753D]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-[#C8753D]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-widest text-[#D49A63] font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4" /> Ton espace beauté</p>
          {loading ? (
            <p className="text-sm text-[#FFF7EF]/50 mt-2">Chargement de ton profil…</p>
          ) : hasProfile ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF] mt-2">Voici ton portrait cheveux</h2>
              <p className="text-sm text-[#FFF7EF]/70 mt-2 max-w-xl">
                Tes conseils et tes recommandations produits s'appuient sur ce profil. Plus il est complet, plus KURLA est précise.
                {confidence !== null && <span className="block mt-2 text-[#D49A63] text-xs font-semibold">Profil complété à {confidence} %</span>}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF] mt-2">On commence par ton diagnostic ?</h2>
              <p className="text-sm text-[#FFF7EF]/70 mt-2 max-w-xl">
                5 questions guidées (avec des visuels) pour identifier ta texture, ta porosité et obtenir ta routine personnalisée.
              </p>
              <a href="/diagnostic/cheveux" className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#3A2218] text-sm font-bold shadow-lg hover:shadow-xl transition-all">
                Faire le diagnostic <ArrowRight className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </div>

      {/* Portrait cheveux */}
      {hasProfile && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-3 flex items-center gap-2"><Scissors className="w-4 h-4" /> Ton profil capillaire</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <HairChip icon={<Wind className="w-4 h-4" />} label="Texture" value={texture} missing={!texture} />
            <HairChip icon={<Droplets className="w-4 h-4" />} label="Porosité" value={porosity} missing={!porosity} />
            <HairChip icon={<CloudRain className="w-4 h-4" />} label="Cuir chevelu" value={scalp} missing={!scalp} />
            <HairChip icon={<RefreshCw className="w-4 h-4" />} label="Fréquence de soin" value={wash} missing={!wash} />
            <HairChip icon={<ShoppingBag className="w-4 h-4" />} label="Budget routine" value={budget} missing={!budget} />
            <a href="/account/kurla-id" className="rounded-2xl border border-dashed border-[#C8753D]/40 p-4 flex flex-col justify-center items-center text-center hover:bg-[#C8753D]/8 transition-all">
              <p className="text-xs font-bold text-[#D49A63]">Affiner mon profil</p>
              <p className="text-[10px] text-[#FFF7EF]/50 mt-1">Densité, longueur, préférences…</p>
            </a>
          </div>
        </div>
      )}

      {/* Dernière routine */}
      {latestRoutine && (
        <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
          <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Ta dernière routine</h3>
          {latestRoutine.recommendedRoutine && <p className="text-sm font-bold text-[#FFF7EF]">{latestRoutine.recommendedRoutine}</p>}
          {latestRoutine.summary && <p className="text-xs text-[#FFF7EF]/65 mt-1 leading-relaxed">{latestRoutine.summary}</p>}
          {Array.isArray(latestRoutine.steps) && latestRoutine.steps.length > 0 && (
            <ol className="mt-3 space-y-1.5">
              {latestRoutine.steps.slice(0, 6).map((step: string, i: number) => (
                <li key={i} className="text-[12px] text-[#FFF7EF]/75 flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#C8753D]/20 text-[#C8753D] text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/diagnostic/cheveux" className="px-4 py-2 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-xs font-semibold text-[#FFF7EF] hover:border-[#C8753D]/50 inline-flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Refaire le diagnostic</a>
            <a href="/boutique" className="px-4 py-2 rounded-full bg-[#C8753D] text-white text-xs font-bold inline-flex items-center gap-2"><ShoppingBag className="w-3.5 h-3.5" /> Voir les produits de ma routine</a>
          </div>
        </div>
      )}

      {/* Raccourcis */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-3">Accès rapide</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {quickLink('/assistant-beaute', <MessageCircle className="w-5 h-5" />, 'Demander à KURLA AI', 'Conseils cheveux & peau, routines, ingrédients', true)}
          {quickLink('/diagnostic/cheveux', <Sparkles className="w-5 h-5" />, hasProfile ? 'Refaire mon diagnostic' : 'Faire mon diagnostic', '5 questions guidées avec visuels')}
          {quickLink('/account/kurla-id', <Heart className="w-5 h-5" />, 'Mon KURLA ID', 'Profil beauté détaillé & confidentialité')}
          <button onClick={() => onNavigateTab('commandes')} className="text-left">
            <span className="flex items-center gap-3 p-4 rounded-2xl border bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50 transition-all w-full">
              <ShoppingBag className="w-5 h-5 text-[#C8753D]" />
              <span className="flex-1">
                <span className="text-sm font-bold text-[#FFF7EF] block">Mes commandes</span>
                <span className="text-[11px] text-[#FFF7EF]/55">{ordersCount} commande(s)</span>
              </span>
              <ChevronRight className="w-4 h-4 text-[#FFF7EF]/30" />
            </span>
          </button>
          {quickLink('/account/shelf', <Droplets className="w-5 h-5" />, 'Mon étagère & routine', 'Tes produits et ton suivi')}
        </div>
      </div>
    </div>
  );
};

export default BeautyHub;
