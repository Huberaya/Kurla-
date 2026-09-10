import React, { useEffect, useState } from 'react';
import { Sparkles, ShieldCheck, CheckCircle2, ArrowRight, ShoppingBag, AlertTriangle, Loader2, Boxes, Clock, Percent, Sun, Droplets, Layers, Heart, Shield, Zap, ArrowLeft, BookOpen, FlaskConical, Info } from 'lucide-react';
import { AIRecommendationResult, Product, SkinDiagnosticAnswers } from '../types';
import { useProducts } from '../services/productService';
import { recommendKit } from '../lib/launchCatalog';
import { pickSkinKnowledgeProfile } from '../lib/knowledge/skin';

type SkinRecap = SkinDiagnosticAnswers & { diagnosticType?: string };

/** Libellés pour la synthèse peau — évite d'afficher les slugs crus. */
const SKIN_LABELS: Record<string, string> = {
  normale: 'Normale', seche: 'Sèche', tres_seche: 'Très sèche', grasse: 'Grasse', mixte: 'Mixte · zone T grasse / joues sèches', sensible: 'Sensible', deshydratee: 'Déshydratée', mature: 'Mature',
  confortable: 'Confortable', deshydratee_h: 'Déshydratée', brillante: 'Brillante',
  clair: 'Clair', intermediaire: 'Intermédiaire', fonce: 'Foncé', tres_fonce: 'Très foncé', inconnue: 'Non classée', inconnu: '—',
  chaud: 'Chaud · doré', froid: 'Froid · rosé', neutre: 'Neutre', olive: 'Olive',
  rare: 'Rare', occasionnelle: 'Parfois', frequente: 'Fréquente',
  // `intermediaire` sert deux axes (profondeur de teint et niveau de routine) :
  // les deux donnent 'Intermédiaire', une seule entrée suffit — la clé était
  // dupliquée, ce qui est une erreur TypeScript (TS1117).
  aucune: 'Aucune', basique: 'Basique', complete: 'Complète',
  gel: 'Gel', lotion: 'Lotion', creme: 'Crème', baume: 'Baume',
  mat: 'Mat', naturel: 'Naturel', glowy: 'Glowy',
  moins_40: 'Moins de 40 €', '40_70': '40–70 €', '70_100': '70–100 €', premium: 'Premium',
  taches: 'Taches / HPI', teint_terne: 'Teint terne', protection_solaire: 'Protection solaire', teint_non_uniforme: 'Teint non uniforme', imperfections: 'Imperfections',
  hydrater: 'Hydrater', eclat: 'Éclat', uniformiser: 'Uniformiser', attenuer_taches: 'Atténuer taches', proteger_spf: 'Protéger SPF',
};

function label(v: string | undefined) { if (!v || v === 'inconnu' || v === 'inconnue') return '—'; return SKIN_LABELS[v] || v.replaceAll('_', ' '); }

export const DiagnosticResultPage: React.FC = () => {
  const { products, loading } = useProducts();
  const [result, setResult] = useState<AIRecommendationResult | null>(null);
  const [diagContext, setDiagContext] = useState<any | null>(null);
  const [skinAnswers, setSkinAnswers] = useState<SkinRecap | null>(null);
  const [isSkin, setIsSkin] = useState(false);

  useEffect(() => {
    try {
      const skinRaw = sessionStorage.getItem('kurla_diagnostic_answers_skin') || localStorage.getItem('kurla_skin_answers');
      if (skinRaw) {
        const parsed = JSON.parse(skinRaw);
        // Heuristique : peau si skinType / skinConcerns / toneDepth présents
        const isSkinDiag = !!(parsed.skinType || parsed.skinConcerns || parsed.toneDepth || parsed.skinConcerns || parsed.skinObjectives || parsed.hydrationLevel);
        if (isSkinDiag) { setSkinAnswers(parsed); setIsSkin(true); }
        else setDiagContext(parsed);
      }
    } catch { /* ignore */ }
    try {
      const legacy = sessionStorage.getItem('kurla_diagnostic_answers');
      if (legacy && !isSkin) setDiagContext(JSON.parse(legacy));
    } catch { /* ignore */ }
    const cached = sessionStorage.getItem('kurla_diagnostic_result');
    if (cached) {
      try { setResult(JSON.parse(cached)); } catch { /* ignore */ }
    }
    if (!cached) {
      setResult({
        summary: "Aucun résultat de diagnostic n’est disponible dans cette session. Relancez le diagnostic pour obtenir une routine calculée.",
        recommendedRoutine: "Diagnostic à recommencer",
        reason: "KURLA n’a pas trouvé de résultat en mémoire de session — c’est normal après un rafraîchissement.",
        steps: ["Relancer le diagnostic peau (2 ou 5 min).", "Vérifier votre contexte et votre budget.", "Demander un avis pro si irritation persistante."],
        warnings: ["Les recommandations KURLA sont des conseils beauté non médicaux."],
        productHandles: [],
        requiresHumanReview: false
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center">
        <div className="text-center p-8"><Loader2 className="w-10 h-10 text-[#C8753D] animate-spin mx-auto mb-4" /><p className="text-sm text-[#FFF7EF]/70">Analyse du catalogue peau…</p></div>
      </div>
    );
  }
  if (!result) return null;

  // ── Branche PEAU ────────────────────────────────────────────────────────
  if (isSkin && skinAnswers) {
    const sa = skinAnswers;
    const concerns = (sa.skinConcerns || []).filter(v => v !== 'inconnu' && v !== 'inconnue').slice(0, 3);
    const objectives = (sa.skinObjectives || []).filter(v => v !== 'inconnu').slice(0, 3);
    const tone = sa.toneDepth || 'inconnue';
    const skinType = sa.skinType || 'inconnu';
    const budget = sa.budget || '40_70';
    const sansParfum = (sa.sensitivities || []).includes('parfum');
    const hpiLevel = sa.hyperpigmentationTendency || 'inconnue';
    // C-02 — la base de connaissance peau était écrite, sourcée… et lue par
    // personne. Elle est affichée ici, au moment où le diagnostic vient
    // d'être posé. Sans signal dans les réponses, elle ne s'affiche pas.
    const skinProfile = pickSkinKnowledgeProfile(sa);

    // Routine par défaut si l'API n'a rien renvoyé de spécifique peau
    const fallbackSteps = {
      matin: [
        'Nettoyant doux sans sulfates — sur peau humide, matin & soir',
        objectives.includes('uniformiser') || concerns.includes('taches') ? 'Sérum niacinamide 5% — 3 à 4 gouttes sur visage encore humide' : 'Sérum hydratant acide hyaluronique — 2–3 gouttes',
        'Hydratant céramides / squalane — texture ' + label(sa.texturePreference) + ' · fini ' + label(sa.finishPreference),
        'SPF 50+ invisible (filtres organiques/hybrides) — 2 doigts, dernier geste du matin. Privilégier sans trace blanche pour phototype ' + label(tone),
      ],
      soir: [
        'Démaquillage / double nettoyage si SPF ou maquillage',
        'Nettoyant doux',
        concerns.includes('imperfections') ? 'Tonique BHA doux 2×/semaine (pas le même soir que rétinol)' : 'Tonique hydratant',
        concerns.includes('taches') || hpiLevel === 'frequente' ? 'Sérum atténuateur taches (niacinamide / azélaïque) — le soir' : 'Sérum éclat vitamine C douce',
        'Crème barrière céramides — scelle l’hydratation',
        'Baume lèvres / contour yeux si besoin',
      ],
      hebdo: ['Masque hydratant 1×/semaine', 'Exfoliant AHA/BHA doux 1–2×/semaine (hors rétinol le même soir)', 'Vérifier SPF quotidien — clé pour limiter HPI'],
    };
    const stepsToShow = result.steps && result.steps.length > 2 ? result.steps : [...fallbackSteps.matin, ...fallbackSteps.soir.slice(0, 2), 'Hebdo : ' + fallbackSteps.hebdo[0]];

    // Produits peau : filtre catégorie peau, puis sans parfum si demandé, puis budget
    const skinProducts = products.filter(p => (p.category === 'peau' || (p.needs || []).some(n => /peau|tache|spf|hydrater|uniform/i.test(n))));
    const filteredByParfum = sansParfum ? skinProducts.filter(p => p.containsFragrance !== true && !(p.allergens || []).some(a => /parfum|fragrance/i.test(a))) : skinProducts;
    const maxPriceForBudget: Record<string, number> = { moins_40: 14, '40_70': 26, '70_100': 40, premium: 999 };
    const budgetCap = maxPriceForBudget[budget] ?? 26;
    const budgetProducts = filteredByParfum.filter(p => p.price <= budgetCap).slice(0, 6);
    const displaySkinProducts = (budgetProducts.length ? budgetProducts : filteredByParfum.slice(0, 6));
    const spfProducts = filteredByParfum.filter(p => /spf|solair|protection|invisible|trace/i.test(`${p.name} ${p.badges?.join(' ')} ${p.description}`)).slice(0, 3);

    // Kit peau : on utilise le kit existant mais on le présente en version peau (prix total estimé)
    const reco = recommendKit({ texture: skinType, priority: concerns[0] || objectives[0] || 'hydratation', protective: false });
    const recommendedKit: Product | undefined = products.find(p => p.id === `launch-${reco.kitId}` || p.id === reco.kitId || p.slug?.includes(reco.kitId));

    const saveToMaPeau = () => {
      try {
        localStorage.setItem('kurla_skin_answers', JSON.stringify(sa));
        localStorage.setItem('kurla_ma_peau_saved_at', new Date().toISOString());
      } catch { /* ignore */ }
      window.location.href = '/account/skin-id';
    };

    return (
      <div className="min-h-screen pt-28 pb-24 bg-[#050403] text-[#FFF7EF]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header peau */}
          <div className="text-center space-y-4 mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3A2218] text-[#D49A63] border border-[#C8753D]/30 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#C8753D]" /> Diagnostic peau · {Object.keys(sa).length > 7 ? '12 étapes (complet)' : 'express'} · KURLA SKIN
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif-title font-bold">Votre profil peau — compris, pas diagnostiqué</h1>
            <p className="text-sm text-[#FFF7EF]/70 max-w-2xl mx-auto font-light leading-relaxed">
              {label(skinType)} · Phototype {label(tone)} · {hpiLevel !== 'inconnue' ? `HPI ${label(hpiLevel)}` : 'HPI non renseignée'} · Budget {label(budget)}{sansParfum ? ' · sans parfum' : ''}
            </p>
          </div>

          {/* Recap chips */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="lg:col-span-2 p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4">
              <h3 className="text-xs uppercase tracking-widest font-bold text-[#C8753D]">Ce que vous nous avez dit</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-xs font-semibold">Type · {label(skinType)}</span>
                <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-xs font-semibold">Hydratation · {label(sa.hydrationLevel)}</span>
                <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#C8753D]/30 text-xs font-semibold">Carnation · {label(tone)}</span>
                <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-xs font-semibold">Sous-ton · {label(sa.undertone)}</span>
                <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-xs font-semibold">Sensibilité · {label(sa.sensitivity)}</span>
                <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-xs font-semibold">SPF · {label(sa.spfUsage)}</span>
                <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-xs font-semibold">Routine · {label(sa.currentRoutine || sa.routine)}</span>
                <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-xs font-semibold">Âge · {label(sa.ageRange)}</span>
              </div>
              {concerns.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#D49A63] mb-2">Préoccupations (max 3)</p>
                  <div className="flex flex-wrap gap-2">{concerns.map(c => <span key={c} className="px-3 py-1.5 rounded-full bg-[#C8753D]/15 border border-[#C8753D]/30 text-xs font-semibold">{label(c)}</span>)}</div>
                </div>
              )}
              {objectives.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#D49A63] mb-2">Objectifs</p>
                  <div className="flex flex-wrap gap-2">{objectives.map(o => <span key={o} className="px-3 py-1.5 rounded-full bg-[#FFF7EF]/5 border border-[#FFF7EF]/10 text-xs font-semibold">{label(o)}</span>)}</div>
                </div>
              )}
              {(sa.sensitivities || []).filter(v => v !== 'inconnu').length > 0 && (
                <p className="text-xs text-[#FFF7EF]/60">À éviter : {(sa.sensitivities || []).filter(v => v !== 'inconnu').map(label).join(', ')}</p>
              )}
              <div className="flex gap-2 pt-2">
                <a href="/peau/diagnostic" className="text-xs font-semibold text-[#D49A63] hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Modifier le diagnostic</a>
                <span className="text-[#FFF7EF]/20">·</span>
                <a href="/boutique?cat=peau" className="text-xs font-semibold text-[#D49A63] hover:underline inline-flex items-center gap-1">Boutique peau <ArrowRight className="w-3 h-3" /></a>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#C8753D]/30 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#C8753D] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Gardes Mélanine</p>
              <ul className="text-xs text-[#FFF7EF]/80 leading-relaxed space-y-2">
                <li><strong className="text-[#FFF7EF]">Uniformiser ≠ éclaircir.</strong> KURLA atténue les irrégularités, respecte la carnation.</li>
                <li><strong className="text-[#FFF7EF]">HPI :</strong> taches sombres post-bouton fréquentes sur peaux mates/foncées — SPF quotidien + éviter trituration sont clés.</li>
                <li><strong className="text-[#FFF7EF]">Trace blanche :</strong> SPF minéral 100% laisse un voile sur phototypes foncés → privilégier filtres organiques/hybrides invisibles.</li>
              </ul>
              <div className="pt-3 border-t border-[#FFF7EF]/10 flex gap-2">
                <button onClick={saveToMaPeau} className="flex-1 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold">Enregistrer dans Ma peau →</button>
              </div>
            </div>
          </div>

          {/* C-02 — le profil de connaissance peau. Choisi à partir des réponses :
              sans signal, aucun bloc, plutôt qu'un profil inventé par défaut. */}
          {skinProfile && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-8 shadow-xl">
              <p className="text-[11px] uppercase tracking-widest font-bold text-[#C8753D] mb-1.5">Ce que ta peau mélaninée exige</p>
              <h3 className="text-xl font-serif-title font-bold text-[#FFF7EF] mb-2">{skinProfile.name}</h3>
              <p className="text-sm text-[#FFF7EF]/70 leading-relaxed mb-5 max-w-3xl">{skinProfile.description}</p>
              <div className="grid md:grid-cols-3 gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[#FFF7EF]/50 mb-2">Les règles qui comptent</p>
                  <ul className="space-y-2 text-xs text-[#FFF7EF]/85 leading-relaxed">
                    {skinProfile.melaninKeyPoints.map((point, i) => (
                      <li key={i} className="flex gap-2"><span className="text-[#C8753D] shrink-0">•</span><span>{point}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[#FFF7EF]/50 mb-2">Actifs utiles</p>
                  <ul className="space-y-1.5 text-xs text-emerald-200/90 leading-relaxed">
                    {skinProfile.recommendedIngredients.map((ing, i) => (
                      <li key={i} className="flex gap-2"><span className="text-emerald-400 shrink-0">+</span><span>{ing}</span></li>
                    ))}
                  </ul>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[#FFF7EF]/50 mt-4 mb-2">À éviter</p>
                  <ul className="space-y-1.5 text-xs text-rose-200/90 leading-relaxed">
                    {skinProfile.ingredientsToAvoid.map((ing, i) => (
                      <li key={i} className="flex gap-2"><span className="text-rose-400 shrink-0">−</span><span>{ing}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[#FFF7EF]/50 mb-2">Dans le catalogue KURLA</p>
                  <ul className="space-y-1.5 text-xs text-[#FFF7EF]/85 leading-relaxed">
                    {skinProfile.keyProducts.map((produit, i) => (
                      <li key={i} className="flex gap-2"><span className="text-[#D49A63] shrink-0">·</span><span>{produit}</span></li>
                    ))}
                  </ul>
                  <a href="/boutique?cat=peau" className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-[#D49A63] hover:underline">Voir les produits peau <ArrowRight className="w-3.5 h-3.5" /></a>
                </div>
              </div>
            </div>
          )}

          {/* Routines tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { name: 'Essentielle', price: '49,70 €', t: '3 soins · −5%', desc: 'Barrière + SPF invisible · 2 min', steps: fallbackSteps.matin.slice(0, 3) },
              { name: 'Équilibrée', price: '62 €', t: '5 soins · −13%', desc: 'HPI + hydratation · Recommandée', steps: fallbackSteps.matin },
              { name: 'Experte', price: '84,90 €', t: '7 soins · −15% · liv. gratuite', desc: 'Grain & taches · complète', steps: [...fallbackSteps.matin, ...fallbackSteps.soir.slice(0, 3)] },
            ].map(tier => (
              <div key={tier.name} className={`rounded-3xl border p-6 flex flex-col ${tier.name === 'Complète' ? 'bg-[#FFF7EF] text-[#111111] border-[#C8753D] shadow-xl scale-[1.02]' : 'bg-[#1A0F0A] border-[#FFF7EF]/10 text-[#FFF7EF]'}`}>
                <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold">{tier.name}</h4><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${tier.name === 'Complète' ? 'bg-[#C8753D] text-white' : 'bg-[#FFF7EF]/10 text-[#D49A63] border border-[#FFF7EF]/10'}`}>{tier.price}</span></div>
                <p className="text-xs font-semibold opacity-70">{tier.t} · {tier.desc}</p>
                <ul className="text-[11px] leading-relaxed mt-3 space-y-1 flex-1">{tier.steps.slice(0, 4).map((s, i) => <li key={i} className="flex gap-1.5"><span className="text-[#C8753D]">•</span><span>{s}</span></li>)}</ul>
                <a href="/peau/routine" className={`mt-4 py-2.5 rounded-full text-xs font-bold text-center ${tier.name === 'Complète' ? 'bg-[#111111] text-white hover:bg-black' : 'bg-[#FFF7EF]/10 hover:bg-[#FFF7EF]/15 text-[#FFF7EF] border border-[#FFF7EF]/15'}`}>Voir la routine {tier.name.toLowerCase()}</a>
              </div>
            ))}
          </div>

          {/* Steps détaillés */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-8 shadow-xl space-y-6">
            <h3 className="text-xl font-serif-title font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#C8753D]" /> Votre routine recommandée — matin, soir, hebdo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#C8753D] mb-2 flex items-center gap-1.5"><Sun className="w-4 h-4" /> Matin · protéger</p>
                <ol className="space-y-2">{fallbackSteps.matin.map((s, i) => <li key={i} className="flex gap-3 p-3 rounded-2xl bg-[#050403]/80 border border-[#FFF7EF]/5"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span><span className="text-xs text-[#FFF7EF]/90 leading-relaxed">{s}</span></li>)}</ol>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#C8753D] mb-2 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Soir · réparer</p>
                <ol className="space-y-2">{fallbackSteps.soir.map((s, i) => <li key={i} className="flex gap-3 p-3 rounded-2xl bg-[#050403]/80 border border-[#FFF7EF]/5"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span><span className="text-xs text-[#FFF7EF]/90 leading-relaxed">{s}</span></li>)}</ol>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#050403] border border-[#D49A63]/30 flex gap-2 text-xs text-[#FFF7EF]/70"><Info className="w-4 h-4 text-[#D49A63] shrink-0" /> Budget Fatou (moyen, sans parfum) : la sélection ci-dessous est filtrée prix ≤ {budgetCap} € et sans fragrance. Incompatibilités signalées (ex: rétinol + AHA le même soir).</div>
            {/* Steps génériques de l'IA si présents */}
            {result.steps && result.steps.length > 0 && (
              <details className="pt-2"><summary className="text-xs font-bold text-[#D49A63] cursor-pointer">Voir les étapes calculées par l’IA</summary><ol className="mt-3 space-y-2">{result.steps.map((s, i) => <li key={i} className="text-xs text-[#FFF7EF]/70">• {s}</li>)}</ol></details>
            )}
          </div>

          {/* Produits adaptés */}
          <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif-title font-bold">Produits filtrés pour vous</h3>
              <span className="text-xs text-[#D49A63] font-semibold">Budget {label(budget)} · {sansParfum ? 'sans parfum' : 'toutes textures'}</span>
            </div>
            {displaySkinProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {displaySkinProducts.map(p => (
                  <div key={p.id} className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5 flex flex-col shadow-lg">
                    <img loading="lazy" src={p.image} alt={p.name} className="w-full h-44 object-cover rounded-2xl mb-4" />
                    <span className="text-[10px] uppercase font-semibold text-[#D49A63]">{p.brand}</span>
                    <h4 className="text-sm font-bold mb-1">{p.name}</h4>
                    <p className="text-xs text-[#FFF7EF]/60 line-clamp-2 mb-3">{p.description}</p>
                    {p.containsFragrance && sansParfum && <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 self-start mb-2">Contient parfum — alternative sans parfum disponible</span>}
                    <div className="mt-auto pt-3 border-t border-[#FFF7EF]/10 flex items-center justify-between">
                      <span className="text-lg font-bold">{p.price.toFixed(2)} €</span>
                      <a href={`/produit/${p.slug}`} className="px-4 py-2 rounded-full bg-[#C8753D] text-white text-xs font-semibold hover:bg-[#b06330]">Voir la fiche</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-sm text-[#FFF7EF]/70">Aucun produit peau dans le catalogue de démo ne correspond exactement au filtre actuel — le catalogue sera enrichi en Phase 4. <a href="/boutique?cat=peau" className="text-[#D49A63] underline">Voir tout le catalogue peau</a></div>
            )}
            {spfProducts.length > 0 && (
              <div className="p-5 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
                <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5"><Sun className="w-4 h-4 text-[#D49A63]" /> SPF sans trace blanche — sélection</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {spfProducts.map(p => (
                    <a key={p.id} href={`/produit/${p.slug}`} className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 hover:border-[#C8753D]/50 flex gap-3 items-center">
                      <img src={p.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      <span className="text-xs font-semibold leading-tight">{p.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kit peau */}
          {recommendedKit && (
            <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-[#1A0F0A] to-[#050403] border border-[#C8753D]/30 shadow-xl flex flex-col md:flex-row gap-6 items-center">
              <img src={recommendedKit.image} alt={recommendedKit.name} className="w-40 h-40 rounded-2xl object-cover" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold">Kit recommandé pour votre diagnostic</p>
                <h4 className="text-xl font-bold mt-1">{recommendedKit.name}</h4>
                <p className="text-xs text-[#FFF7EF]/70 mt-1">{reco.reason}</p>
                <div className="flex items-baseline gap-2 mt-3"><span className="text-2xl font-bold">{recommendedKit.price.toFixed(2)} €</span>{recommendedKit.originalPrice && <span className="text-sm line-through text-[#FFF7EF]/40">{recommendedKit.originalPrice.toFixed(2)} €</span>}</div>
              </div>
              <a href={`/produit/${recommendedKit.slug}`} className="px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold shrink-0">Précommander ce kit</a>
            </div>
          )}

          {/* Journal teaser */}
          <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold flex items-center gap-2"><Heart className="w-5 h-5 text-[#C8753D]" /> Journal peau V1 — suivi jour après jour</h3>
              <a href="/account/skin-id" className="text-xs font-bold text-[#D49A63] hover:underline">Ouvrir Ma peau →</a>
            </div>
            <p className="text-xs text-[#FFF7EF]/60 leading-relaxed">Notez votre ressenti, vos préoccupations du jour et une courte note. KURLA mémorise sans diagnostic médical et ajuste les conseils quand un motif revient.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {[
                { f: '😊 Bien', d: 'Peau confortable, routine tenue' },
                { f: '😐 Moyen', d: 'Légers tiraillements / brillance' },
                { f: '😣 Inconfort', d: 'Picotements, rougeurs' },
              ].map(c => (
                <div key={c.f} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
                  <span className="text-lg">{c.f}</span><p className="text-xs text-[#FFF7EF]/60 mt-1">{c.d}</p>
                </div>
              ))}
            </div>
            <a href="/account/skin-id" className="mt-4 inline-flex px-5 py-2.5 rounded-full bg-[#FFF7EF] text-[#111111] text-xs font-bold">Aller au journal</a>
          </div>

          {/* Warnings */}
          {(result.warnings || []).map((w, i) => (
            <div key={i} className="p-4 rounded-xl bg-[#1A0F0A]/60 border border-[#FFF7EF]/10 text-xs text-[#FFF7EF]/50 mb-4"><strong>Note :</strong> {w} — ceci n’est pas un avis médical.</div>
          ))}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={saveToMaPeau} className="px-8 py-4 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white font-semibold text-sm text-center shadow-xl">Enregistrer dans Ma peau</button>
            <a href="/peau/diagnostic" className="px-8 py-4 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/20 text-[#FFF7EF] font-medium text-sm text-center">Recommencer le diagnostic</a>
            <a href="/boutique?cat=peau" className="px-8 py-4 rounded-full bg-[#FFF7EF] text-[#111111] font-semibold text-sm text-center">Explorer le catalogue peau</a>
          </div>
        </div>
      </div>
    );
  }

  // ── Branche CHEVEUX (fallback historique) ──────────────────────────────
  const matchedProducts: Product[] = products.filter(p => result.productHandles.includes(p.slug) || result.productHandles.includes(p.id));
  const reco = recommendKit({ texture: diagContext?.texture, priority: diagContext?.priority, protective: diagContext?.style === 'protectrice' || /protect|tresse|lock|twist/i.test(String(diagContext?.priority || '')), });
  const recommendedKit: Product | undefined = products.find(p => p.id === `launch-${reco.kitId}` || p.id === reco.kitId || p.slug?.includes(reco.kitId));
  const altKit: Product | undefined = reco.alternative ? products.find(p => p.id === `launch-${reco.alternative}` || p.id === reco.alternative) : undefined;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3A2218] text-[#D49A63] border border-[#C8753D]/30 text-xs font-semibold uppercase tracking-wider"><Sparkles className="w-4 h-4 text-[#C8753D]" /> Analyse KURLA supervisée</div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF]">{result.recommendedRoutine}</h1>
          <p className="text-base text-[#FFF7EF]/80 max-w-xl mx-auto font-light leading-relaxed">{result.summary}</p>
        </div>
        {result.requiresHumanReview && (
          <div className="p-6 rounded-2xl bg-[#3A2218]/90 border border-amber-500/50 mb-8 flex items-start gap-4 text-amber-200">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1"><h4 className="font-bold text-sm">Avis spécialisé recommandé</h4><p className="text-xs font-light leading-relaxed">Vos réponses indiquent des signes de tiraillement ou d’irritation. Nous vous suggérons de consulter un dermatologue.</p></div>
          </div>
        )}
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-8 shadow-xl space-y-4"><h3 className="text-lg font-serif-title font-bold text-[#D49A63]">Pourquoi cette routine ?</h3><p className="text-sm text-[#FFF7EF]/80 leading-relaxed font-light">{result.reason}</p></div>
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-10 shadow-xl space-y-6">
          <h3 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#C8753D]" /> Ordre d'application recommandé</h3>
          <div className="space-y-4">{result.steps.map((stepText, idx) => (<div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-[#050403]/80 border border-[#FFF7EF]/5"><span className="w-8 h-8 rounded-full bg-[#C8753D] text-white font-bold text-xs flex items-center justify-center shrink-0">{idx + 1}</span><p className="text-sm text-[#FFF7EF]/90 font-light leading-relaxed mt-1">{stepText}</p></div>))}</div>
        </div>
        {recommendedKit && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4"><Boxes className="w-5 h-5 text-[#C8753D]" /><h3 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Votre routine en un kit</h3></div>
            <div className="relative overflow-hidden rounded-3xl border border-[#C8753D]/40 bg-gradient-to-br from-[#1A0F0A] to-[#050403] shadow-2xl">
              <div className="grid md:grid-cols-[260px_1fr] gap-0">
                <div className="relative h-56 md:h-full bg-[#3A2218]/40"><img loading="lazy" src={recommendedKit.image} alt={recommendedKit.name} className="absolute inset-0 w-full h-full object-cover" /><span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#2E7D5B] text-white text-[10px] font-bold flex items-center gap-1 shadow"><Clock className="w-3 h-3" /> Précommande</span></div>
                <div className="p-6 md:p-8 flex flex-col"><span className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold mb-1">Recommandé pour votre diagnostic</span><h4 className="text-xl md:text-2xl font-serif-title font-bold text-[#FFF7EF] mb-2">{recommendedKit.name}</h4><p className="text-sm text-[#FFF7EF]/75 font-light leading-relaxed mb-4">{reco.reason}</p><ul className="space-y-1.5 mb-5">{['Tout ce qu’il faut pour une routine complète', 'Économique par rapport aux produits à l’unité', 'Satisfait ou remboursé 30 jours'].map(t => (<li key={t} className="flex items-start gap-2 text-xs text-[#FFF7EF]/70"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> {t}</li>))}</ul><div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#FFF7EF]/10"><div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-[#FFF7EF]">{recommendedKit.price.toFixed(2)} €</span>{recommendedKit.originalPrice && recommendedKit.originalPrice > recommendedKit.price && (<span className="text-sm text-[#FFF7EF]/40 line-through flex items-center gap-1"><Percent className="w-3 h-3" />{recommendedKit.originalPrice.toFixed(2)} €</span>)}</div><div className="flex gap-2"><a href={`/produit/${recommendedKit.slug}`} className="px-6 py-3 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white text-sm font-semibold shadow-lg hover:opacity-95 transition flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Précommander ce kit</a></div></div>{altKit && (<a href={`/produit/${altKit.slug}`} className="mt-3 text-[11px] text-[#D49A63] hover:underline self-start">Alternative : {altKit.name.replace(/^Kit\s*—\s*/i, '')} →</a>)}</div>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between"><h3 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Produits indispensables recommandés</h3><span className="text-xs text-[#D49A63] font-semibold">Formules concentrées</span></div>
          {matchedProducts.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{matchedProducts.map(p => (<div key={p.id} className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5 flex flex-col justify-between shadow-lg"><div><img loading="lazy" src={p.image} alt={p.name} className="w-full h-44 object-cover rounded-2xl mb-4" /><span className="text-[10px] uppercase font-semibold text-[#D49A63] block mb-1">{p.brand}</span><h4 className="text-base font-serif-title font-bold text-[#FFF7EF] mb-2">{p.name}</h4><p className="text-xs text-[#FFF7EF]/70 line-clamp-2 font-light mb-4">{p.description}</p></div><div className="pt-4 border-t border-[#FFF7EF]/10 flex items-center justify-between"><span className="text-lg font-bold text-[#FFF7EF]">{p.price.toFixed(2)} €</span><a href={`/produit/${p.slug}`} className="px-4 py-2 rounded-full bg-[#C8753D] text-white text-xs font-semibold hover:bg-[#b06330]">Voir le soin</a></div></div>))}</div> : <div className="p-6 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-sm text-[#FFF7EF]/70">Aucun produit n’est affiché : catalogue vide pour ce diagnostic.</div>}
        </div>
        {result.warnings.map((w, i) => (<div key={i} className="p-4 rounded-xl bg-[#1A0F0A]/60 border border-[#FFF7EF]/10 text-xs text-[#FFF7EF]/50 mb-8"><strong>Disclaimer :</strong> {w}</div>))}
        <div className="flex flex-col sm:flex-row gap-4 justify-center"><a href={recommendedKit ? `/produit/${recommendedKit.slug}` : '/boutique'} className="px-8 py-4 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white font-semibold text-sm text-center shadow-xl">{recommendedKit ? `Commander « ${recommendedKit.name.replace(/^Kit\s*—\s*/i, '')} »` : 'Commander le kit recommandé'}</a><a href="/boutique" className="px-8 py-4 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/20 text-[#FFF7EF] font-medium text-sm text-center">Voir tout le catalogue</a></div>
      </div>
    </div>
  );
};
