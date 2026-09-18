import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import { HairDiagnosticAnswers } from '../types';
import { navigate } from '../lib/router';
import { markLatestDiagnostic, mergeStoredAnswers, readStoredPrefill, storeHairAnswers } from '../lib/diagnosticSession';
import { analytics } from '../lib/analytics';
import { DiagnosticVisual } from '../components/diagnostic/DiagnosticVisuals';
import { getHairDiagnosticSegment } from '../lib/diagnosticSegments';

/** Défauts du formulaire cheveux — source des réponses avant tout diagnostic. */
const HAIR_DEFAULTS: HairDiagnosticAnswers = {
  texture: 'crepue',
  style: 'naturel',
  focus: '',
  priority: 'hydratation',
  porosity: 'forte',
  scalp: 'sec',
  frequency: '1x_semaine',
  budget: '40_70',
  email: ''
};
import { useAuth } from '../context/AuthContext';

export const DiagnosticHairPage: React.FC = () => {
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  React.useEffect(() => { try { analytics.diagnosticStart('hair'); } catch { /* noop */ } }, []);
  const [loading, setLoading] = useState(false);

  // Pré-remplissage : les réponses du dernier diagnostic cheveux (miroir du parcours peau).
  const [answers, setAnswers] = useState<HairDiagnosticAnswers>(() => mergeStoredAnswers(HAIR_DEFAULTS, readStoredPrefill('hair')));

  // Question adaptative (chantier diagnostic) : après la texture (Q1) et le
  // coiffage (Q2), un segment de profil peut exister — s'il existe, une
  // question dédiée à CE profil (ses besoins et problèmes) s'insère en Q3,
  // EN PLUS des questions existantes (qui restent intactes).
  const segment = getHairDiagnosticSegment(answers.texture, answers.style);
  const stepIds: string[] = ['texture', 'style', ...(segment ? ['focus'] : []), 'priority', 'porosity', 'scalp', 'frequency', 'budget', 'email'];
  const current = stepIds[Math.min(step, stepIds.length) - 1] || 'texture';
  const totalSteps = stepIds.length;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      submitDiagnostic();
    }
  };

  // Choisir texture ou coiffage : si le segment change, l'ancienne réponse
  // adaptative est réinitialisée (elle ne concernait plus le nouveau profil).
  const pickWithSegmentReset = (patch: Partial<HairDiagnosticAnswers>) => {
    const next = { ...answers, ...patch };
    const nextSegment = getHairDiagnosticSegment(next.texture, next.style);
    setAnswers(nextSegment?.id !== segment?.id ? { ...next, focus: '' } : next);
    handleNext();
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitDiagnostic = async () => {
    // Funnel : diagnostic complété (KPI diagRate du plan de lancement).
    try { analytics.diagnosticComplete('hair'); } catch { /* noop */ }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/routine-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          diagnosticType: 'hair',
          answers
        })
      });
      const data = await res.json();
      // On conserve le contexte du diagnostic (texture/priorité) pour que la
      // page résultat puisse recommander LE kit le plus pertinent en tête.
      try {
        sessionStorage.setItem('kurla_diagnostic_answers', JSON.stringify(answers));
      } catch { /* sessionStorage indisponible */ }
      sessionStorage.setItem('kurla_diagnostic_result', JSON.stringify(data));
      storeHairAnswers(answers);
      markLatestDiagnostic('hair');
      navigate('/diagnostic/resultat/hair-latest');
    } catch (e) {
      console.error(e);
      navigate('/diagnostic/resultat/hair-latest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-gradient-to-b from-kurla-ink via-kurla-espresso to-kurla-ink text-kurla-cream">
      <div className="max-w-3xl mx-auto px-4">

        {/* En-tête */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-amber text-xs font-semibold tracking-wider uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Diagnostic gratuit · 3 minutes · sans abonnement
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mb-2">Trouvez votre routine cheveux</h1>
          <p className="text-sm text-kurla-cream/70 font-light max-w-md mx-auto">Répondez à {totalSteps} questions simples : vous obtenez une routine sur-mesure, des gestes adaptés et les produits correspondants.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-10 space-y-2">
          <div className="flex justify-between text-xs text-kurla-amber font-semibold uppercase tracking-wider">
            <span>Question {step} / {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% complété</span>
          </div>
          <div className="w-full h-2 rounded-full bg-kurla-espresso border border-kurla-cream/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-kurla-copper to-kurla-amber transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Diagnostic Form Container */}
        <div className="p-8 sm:p-12 rounded-3xl bg-kurla-espresso border border-kurla-cream/15 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-kurla-copper/10 rounded-full blur-3xl pointer-events-none" />

          {current === 'texture' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Texture Principale</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quelle est la texture dominante de vos cheveux ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'crepue', title: 'Crépue (4A–4C)', desc: 'Très serrée, rétrécissement important à sec.' },
                  { id: 'frisee', title: 'Frisée / Bouclée (3B-3C)', desc: 'Boucles en S bien définies ou ressorts.' },
                  { id: 'locksee', title: 'Locks / Microlocks', desc: 'Cheveux ancrés en locks ou twist locks.' },
                  { id: 'protective', title: 'Coiffure protectrice', desc: 'En braids, twists ou tissage.' },
                  { id: 'defrisee', title: 'Défrisée / En transition', desc: 'Textures mixtes ou sensibilisées.' },
                  { id: 'inconnue', title: 'Je ne sais pas exactement', desc: 'Laissez KURLA analyser vos réponses.' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => pickWithSegmentReset({ texture: opt.id as any })}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      answers.texture === opt.id
                        ? 'bg-kurla-copper/20 border-kurla-copper ring-1 ring-kurla-copper'
                        : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    <div className="w-24 shrink-0"><DiagnosticVisual step={1} optionId={opt.id} /></div>
                    <div className="min-w-0">
                      <div className="font-serif-title font-bold text-base text-kurla-cream mb-1">{opt.title}</div>
                      <div className="text-xs text-kurla-cream/60 font-light">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'style' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Coiffage Actuel</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment portez-vous vos cheveux en ce moment ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'naturel', title: 'Au naturel (afro, puff, wash & go)' },
                  { id: 'braids', title: 'Tresses / Knotless Braids' },
                  { id: 'twists', title: 'Vanilles / Passion Twists' },
                  { id: 'locks', title: 'Locks / Microlocks' },
                  { id: 'wig', title: 'Perruque / Tissage / Pose' },
                  { id: 'enfant', title: 'Coiffure enfant (Douceur)' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => pickWithSegmentReset({ style: opt.id as any })}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.style === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'focus' && segment && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. {segment.label} — votre préoccupation</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">{segment.question}</h2>
              <p className="text-sm text-kurla-cream/65 font-light leading-relaxed">
                En plus des questions à venir, KURLA concentre votre routine sur ce point précis de votre profil —
                les besoins et les problèmes qui comptent pour {segment.label.toLowerCase()}.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {segment.options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, focus: opt.id }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      answers.focus === opt.id ? 'bg-kurla-copper/20 border-kurla-copper ring-1 ring-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{opt.title}</div>
                    <div className="text-xs text-kurla-cream/60 leading-relaxed">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'priority' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Priorité Beauté</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quelle est votre priorité ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'hydratation', title: 'Stopper la sécheresse intense' },
                  { id: 'casse', title: 'Éviter la casse au démêlage' },
                  { id: 'definition', title: 'Définir les boucles sans cartonner' },
                  { id: 'pousse', title: 'Favoriser la santé des longueurs & racines' },
                  { id: 'cuir_chevelu', title: 'Apaiser les démangeaisons cuir chevelu' },
                  { id: 'demelage_enfant', title: 'Faciliter le démêlage enfant sans larmes' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, priority: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.priority === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'porosity' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Niveau de Porosité</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment vos cheveux réagissent-ils à l’eau ?</h2>

              {/* Aide : test du verre d'eau */}
              <div className="rounded-2xl bg-kurla-ink border border-kurla-amber/30 p-4 flex gap-3">
                <Info className="w-5 h-5 text-kurla-amber shrink-0 mt-0.5" />
                <div className="text-xs text-kurla-cream/75 leading-relaxed">
                  <strong className="text-kurla-cream block mb-1">Le test du verre d’eau (30 secondes)</strong>
                  Déposez un cheveu propre et sec dans un verre d’eau claire.
                  <span className="block mt-1">• Il <strong>coule au fond</strong> → porosité <strong>forte</strong> (écailles ouvertes, boit l’eau puis la perd vite).</span>
                  <span className="block">• Il <strong>flotte en surface</strong> → porosité <strong>faible</strong> (écailles serrées, l’eau peine à entrer).</span>
                  <span className="block">• Il <strong>reste au milieu</strong> → porosité <strong>moyenne</strong>, l’idéal équilibré.</span>
                  <span className="block mt-1 text-kurla-cream/50">Pas le temps ? Choisissez « Je ne sais pas », KURLA s’adapte.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {[
                  { id: 'forte', title: 'Porosité forte : absorbe l’eau en 1 sec mais sèche ultra vite.', desc: 'Besoin de beurres et huiles riches pour sceller l’humidité.' },
                  { id: 'faible', title: 'Porosité faible : l’eau glisse dessus, très longs à mouiller.', desc: 'Besoin de soins légers et de chaleur douce.' },
                  { id: 'moyenne', title: 'Porosité moyenne : équilibrée.', desc: 'L’eau pénètre normalement.' },
                  { id: 'inconnue', title: 'Je ne sais pas.', desc: 'KURLA détermine les produits adaptés à vos réponses.' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, porosity: opt.id as any }); handleNext(); }}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                      answers.porosity === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    <div className="w-28 shrink-0"><DiagnosticVisual step={4} optionId={opt.id} /></div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm mb-1">{opt.title}</div>
                      <div className="text-xs text-kurla-cream/60">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'scalp' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Cuir Chevelu</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel est l’état de votre cuir chevelu ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'normal', title: 'Normal & confortable' },
                  { id: 'sec', title: 'Sec & tiraillements' },
                  { id: 'demangeaisons', title: 'Démangeaisons sous tresses' },
                  { id: 'pellicules', title: 'Pellicules de sécheresse' },
                  { id: 'irritation', title: 'Sensible / Irrité' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, scalp: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.scalp === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'frequency' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Fréquence Routine</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">À quelle fréquence lavez-vous vos cheveux ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'debutante', title: 'Je débute (pas encore de routine fixe)' },
                  { id: '1x_semaine', title: '1 fois par semaine (Wash Day fixe)' },
                  { id: '2x_semaine', title: '2 fois par semaine' },
                  { id: 'irreguliere', title: 'Variable / Selon le temps' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, frequency: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.frequency === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'budget' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Budget Routine</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel budget souhaitez-vous pour votre routine ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'moins_40', title: 'Moins de 40 € (Essential Kit)' },
                  { id: '40_70', title: '40 € à 70 € (Routine Recommandée)' },
                  { id: '70_100', title: '70 € à 100 € (Kit Complet + Accessoires)' },
                  { id: 'premium', title: 'Premium (Prestations Pros incluses)' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, budget: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.budget === opt.id ? 'bg-kurla-copper/20 border-kurla-copper' : 'bg-kurla-ink border-kurla-cream/10 hover:border-kurla-copper/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'email' && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">{step}. Finalisation</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Voulez-vous recevoir votre routine par e-mail ?</h2>
              <p className="text-sm text-kurla-cream/70 font-light">
                Votre routine s’affiche immédiatement à l’écran. L’e-mail est facultatif : il sert uniquement à vous la renvoyer et à la sauvegarder.
              </p>
              <input
                type="email"
                value={answers.email}
                onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
                placeholder="Votre adresse e-mail (facultatif)"
                className="w-full p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/20 text-kurla-cream placeholder-kurla-cream/40 text-base focus:outline-none focus:border-kurla-copper"
              />

              <div className="p-4 rounded-xl bg-kurla-ink/80 border border-kurla-cream/10 flex items-start gap-3 text-xs text-kurla-cream/60">
                <ShieldAlert className="w-4 h-4 text-kurla-amber shrink-0 mt-0.5" />
                <span>
                  <strong>Bon à savoir :</strong> Ces conseils beauté sont personnalisés et ne remplacent pas un avis médical. En cas de problème persistant du cuir chevelu, consultez un professionnel de santé.
                </span>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-8 border-t border-kurla-cream/10 mt-8">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className={`px-5 py-2.5 rounded-full border border-kurla-cream/20 text-xs font-semibold flex items-center gap-2 ${
                step === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-kurla-cream/10'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-kurla-copper to-kurla-amber text-white text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? (
                <span>Génération KURLA en cours…</span>
              ) : current === 'email' ? (
                <>Voir ma routine <Sparkles className="w-4 h-4" /></>
              ) : (
                <>Continuer <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
