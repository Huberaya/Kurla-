import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import { HairDiagnosticAnswers } from '../types';
import { navigate } from '../lib/router';
import { DiagnosticVisual } from '../components/diagnostic/DiagnosticVisuals';
import { useAuth } from '../context/AuthContext';

export const DiagnosticHairPage: React.FC = () => {
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [answers, setAnswers] = useState<HairDiagnosticAnswers>({
    texture: 'crepue',
    style: 'naturel',
    priority: 'hydratation',
    porosity: 'forte',
    scalp: 'sec',
    frequency: '1x_semaine',
    budget: '40_70',
    email: ''
  });

  const handleNext = () => {
    if (step < 8) {
      setStep(step + 1);
    } else {
      submitDiagnostic();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitDiagnostic = async () => {
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
      sessionStorage.setItem('kurla_diagnostic_result', JSON.stringify(data));
      navigate('/diagnostic/resultat/hair-latest');
    } catch (e) {
      console.error(e);
      navigate('/diagnostic/resultat/hair-latest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-gradient-to-b from-[#050403] via-[#1A0F0A] to-[#050403] text-[#FFF7EF]">
      <div className="max-w-3xl mx-auto px-4">

        {/* Progress Bar */}
        <div className="mb-10 space-y-2">
          <div className="flex justify-between text-xs text-[#D49A63] font-semibold uppercase tracking-wider">
            <span>Question {step} / 8</span>
            <span>{Math.round((step / 8) * 100)}% complété</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] transition-all duration-300"
              style={{ width: `${(step / 8) * 100}%` }}
            />
          </div>
        </div>

        {/* Diagnostic Form Container */}
        <div className="p-8 sm:p-12 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/15 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8753D]/10 rounded-full blur-3xl pointer-events-none" />

          {step === 1 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">1. Texture Principale</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quelle est la texture dominante de tes cheveux ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'crepue', title: 'Crépue (Spire 4A-4C)', desc: 'Très serrée, rétrécissement important à sec.' },
                  { id: 'frisee', title: 'Frisée / Bouclée (3B-3C)', desc: 'Boucles en S bien définies ou ressorts.' },
                  { id: 'locksee', title: 'Locks / Microlocks', desc: 'Cheveux ancrés en locks ou twist locks.' },
                  { id: 'protective', title: 'Protective Style Actif', desc: 'En braids, twists ou tissage.' },
                  { id: 'defrisee', title: 'Défrisée / En transition', desc: 'Textures mixtes ou sensibilisées.' },
                  { id: 'inconnue', title: 'Je ne sais pas exactement', desc: 'Laisse KURLA analyser tes réponses.' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, texture: opt.id as any }); handleNext(); }}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      answers.texture === opt.id
                        ? 'bg-[#C8753D]/20 border-[#C8753D] ring-1 ring-[#C8753D]'
                        : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
                    }`}
                  >
                    <div className="w-24 shrink-0"><DiagnosticVisual step={1} optionId={opt.id} /></div>
                    <div className="min-w-0">
                      <div className="font-serif-title font-bold text-base text-[#FFF7EF] mb-1">{opt.title}</div>
                      <div className="text-xs text-[#FFF7EF]/60 font-light">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">2. Coiffage Actuel</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment portes-tu tes cheveux en ce moment ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'naturel', title: 'Au naturel (Afro, Puff, Wash & Go)' },
                  { id: 'braids', title: 'Tresses / Knotless Braids' },
                  { id: 'twists', title: 'Vanilles / Passion Twists' },
                  { id: 'locks', title: 'Locks / Microlocks' },
                  { id: 'wig', title: 'Wig / Tissage / Pose' },
                  { id: 'enfant', title: 'Coiffure enfant (Douceur)' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, style: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.style === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">3. Priorité Beauté</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quelle est ta priorité numéro 1 ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'hydratation', title: 'Stopper la sécheresse intense' },
                  { id: 'casse', title: 'Éviter la casse au démêlage' },
                  { id: 'definition', title: 'Définir les boucles sans cartonner' },
                  { id: 'pousse', title: 'Stimuler la pousse & densité' },
                  { id: 'cuir_chevelu', title: 'Apaiser les démangeaisons cuir chevelu' },
                  { id: 'demelage_enfant', title: 'Faciliter le démêlage enfant sans larmes' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, priority: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.priority === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">4. Niveau de Porosité</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment tes cheveux réagissent-ils à l'eau ?</h2>

              {/* Aide : test du verre d'eau */}
              <div className="rounded-2xl bg-[#050403] border border-[#D49A63]/30 p-4 flex gap-3">
                <Info className="w-5 h-5 text-[#D49A63] shrink-0 mt-0.5" />
                <div className="text-xs text-[#FFF7EF]/75 leading-relaxed">
                  <strong className="text-[#FFF7EF] block mb-1">Le test du verre d’eau (30 secondes)</strong>
                  Dépose un cheveu propre et sec dans un verre d’eau claire.
                  <span className="block mt-1">• Il <strong>coule au fond</strong> → porosité <strong>forte</strong> (écailles ouvertes, boit l’eau puis la perd vite).</span>
                  <span className="block">• Il <strong>flotte en surface</strong> → porosité <strong>faible</strong> (écailles serrées, l’eau peine à entrer).</span>
                  <span className="block">• Il <strong>reste au milieu</strong> → porosité <strong>moyenne</strong>, l’idéal équilibré.</span>
                  <span className="block mt-1 text-[#FFF7EF]/50">Pas le temps ? Choisis « Je ne sais pas », KURLA s’adapte.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {[
                  { id: 'forte', title: 'Porosité forte : absorbe l’eau en 1 sec mais sèche ultra vite.', desc: 'Besoin de beurres et huiles riches pour sceller l’humidité.' },
                  { id: 'faible', title: 'Porosité faible : l’eau glisse dessus, très longs à mouiller.', desc: 'Besoin de soins légers et de chaleur douce.' },
                  { id: 'moyenne', title: 'Porosité moyenne : équilibrée.', desc: 'L’eau pénètre normalement.' },
                  { id: 'inconnue', title: 'Je ne sais pas.', desc: 'KURLA déterminera les textures idéales.' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, porosity: opt.id as any }); handleNext(); }}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                      answers.porosity === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
                    }`}
                  >
                    <div className="w-28 shrink-0"><DiagnosticVisual step={4} optionId={opt.id} /></div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm mb-1">{opt.title}</div>
                      <div className="text-xs text-[#FFF7EF]/60">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">5. Cuir Chevelu</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel est l’état de ton cuir chevelu ?</h2>
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
                      answers.scalp === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">6. Fréquence Routine</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">À quelle fréquence fais-tu ton shampoing / soin ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'debutante', title: 'Débutante (Je n’ai pas de routine fixe)' },
                  { id: '1x_semaine', title: '1 fois par semaine (Wash Day fixe)' },
                  { id: '2x_semaine', title: '2 fois par semaine' },
                  { id: 'irreguliere', title: 'Variable / Selon le temps' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, frequency: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.frequency === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">7. Budget Routine</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel est ton budget idéal pour un kit complet ?</h2>
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
                      answers.budget === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">8. Finalisation</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Où devons-nous t’envoyer ta routine personnalisée ?</h2>
              <p className="text-sm text-[#FFF7EF]/70 font-light">
                Ton analyse IA supervisée sera immédiatement affichée à l’écran et sauvegardée.
              </p>
              <input
                type="email"
                value={answers.email}
                onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
                placeholder="Ton adresse email"
                required
                className="w-full p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/20 text-[#FFF7EF] placeholder-[#FFF7EF]/40 text-base focus:outline-none focus:border-[#C8753D]"
              />

              <div className="p-4 rounded-xl bg-[#050403]/80 border border-[#FFF7EF]/10 flex items-start gap-3 text-xs text-[#FFF7EF]/60">
                <ShieldAlert className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" />
                <span>
                  <strong>Disclaimer :</strong> Les recommandations KURLA sont des conseils beauté non médicaux.
                </span>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-8 border-t border-[#FFF7EF]/10 mt-8">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className={`px-5 py-2.5 rounded-full border border-[#FFF7EF]/20 text-xs font-semibold flex items-center gap-2 ${
                step === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#FFF7EF]/10'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? (
                <span>Génération IA en cours...</span>
              ) : step === 8 ? (
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
