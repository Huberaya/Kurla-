import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import { SkinDiagnosticAnswers } from '../types';
import { navigate } from '../lib/router';
import { analytics } from '../lib/analytics';

export const DiagnosticSkinPage: React.FC = () => {
  const [step, setStep] = useState(1);
  React.useEffect(() => { try { analytics.diagnosticStart('skin'); } catch { /* noop */ } }, []);
  const [loading, setLoading] = useState(false);

  const [answers, setAnswers] = useState<SkinDiagnosticAnswers>({
    skinType: 'mixte',
    priority: 'taches',
    spfUsage: 'recherche',
    sensitivity: 'moyenne',
    routine: 'simple',
    budget: '40_70',
    email: ''
  });

  const handleNext = () => {
    if (step < 7) {
      setStep(step + 1);
    } else {
      submitDiagnostic();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitDiagnostic = async () => {
    // Funnel : diagnostic complété (KPI diagRate du plan de lancement).
    try { analytics.diagnosticComplete('skin'); } catch { /* noop */ }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/routine-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosticType: 'skin',
          answers
        })
      });
      const data = await res.json();
      sessionStorage.setItem('kurla_diagnostic_result', JSON.stringify(data));
      navigate('/diagnostic/resultat/skin-latest');
    } catch (e) {
      console.error(e);
      navigate('/diagnostic/resultat/skin-latest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-gradient-to-b from-[#050403] via-[#1A0F0A] to-[#050403] text-[#FFF7EF]">
      <div className="max-w-3xl mx-auto px-4">

        {/* En-tête */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C8753D]/15 border border-[#C8753D]/30 text-[#D49A63] text-xs font-semibold tracking-wider uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Diagnostic gratuit · 3 minutes · sans abonnement
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mb-2">Trouvez votre routine peau</h1>
          <p className="text-sm text-[#FFF7EF]/70 font-light max-w-md mx-auto">Répondez à 7 questions simples : hydratation, taches et protection solaire adaptées à votre carnation.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-10 space-y-2">
          <div className="flex justify-between text-xs text-[#D49A63] font-semibold uppercase tracking-wider">
            <span>Diagnostic peau — Question {step} / 7</span>
            <span>{Math.round((step / 7) * 100)}% complété</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] transition-all duration-300"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Diagnostic Form Box */}
        <div className="p-8 sm:p-12 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/15 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8753D]/10 rounded-full blur-3xl pointer-events-none" />

          {step === 1 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">1. Type de Peau</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment qualifiez-vous votre type de peau ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'mixte', title: 'Mixte (Zone T brillante, joues normales ou sèches)' },
                  { id: 'seche', title: 'Sèche (Tiraillements, inconfort)' },
                  { id: 'grasse', title: 'Grasse (Brillance globale, pores visibles)' },
                  { id: 'sensible', title: 'Sensible / Réactive (Rougeurs, échauffements)' },
                  { id: 'inconnue', title: 'Je ne sais pas' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, skinType: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.skinType === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">2. Priorité soin visage</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel est votre objectif principal ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'taches', title: 'Atténuer les marques post-imperfections' },
                  { id: 'teint_irregulier', title: 'Harmoniser le teint & apporter de l’éclat' },
                  { id: 'spf', title: 'Trouver un SPF 50+ 100% invisible' },
                  { id: 'hydratation', title: 'Hydratation profonde & barrière cutanée' },
                  { id: 'acne_legere', title: 'Gérer les petits boutons occasionnels' },
                  { id: 'sensibilite', title: 'Apaiser les irritations' },
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

          {step === 3 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">3. Protection Solaire</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quelle est votre habitude de protection solaire ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'recherche', title: 'Je cherche activement un SPF sans traces blanches' },
                  { id: 'jamais', title: 'Jamais (Je ne trouve pas de texture adaptée)' },
                  { id: 'parfois', title: 'En été ou au soleil uniquement' },
                  { id: 'quotidien', title: 'Tous les jours en fin de routine' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, spfUsage: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.spfUsage === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
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
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">4. Sensibilité Cutanée</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment votre peau réagit-elle aux nouveaux produits ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { id: 'faible', title: 'Faible', desc: 'Supporte la plupart des actifs' },
                  { id: 'moyenne', title: 'Moyenne', desc: 'Requis des textures douces' },
                  { id: 'elevee', title: 'Élevée', desc: 'Formules haute tolérance uniquement' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, sensitivity: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      answers.sensitivity === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{opt.title}</div>
                    <div className="text-xs text-[#FFF7EF]/60">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">5. Routine Actuelle</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Combien d’étapes comporte votre routine visage ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'aucune', title: 'Aucune (Eau du robinet uniquement)' },
                  { id: 'simple', title: 'Simple (Nettoyant + Crème)' },
                  { id: 'complete', title: 'Complète (Sérums + Hydratant + SPF)' },
                  { id: 'inconnue', title: 'Variable' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAnswers({ ...answers, routine: opt.id as any }); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all ${
                      answers.routine === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
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
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">6. Budget soin visage</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel budget souhaitez-vous ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'moins_40', title: 'Moins de 40 €' },
                  { id: '40_70', title: '40 € à 70 € (Sérum + SPF 50+)' },
                  { id: '70_100', title: '70 € à 100 € (Routine complète)' },
                  { id: 'premium', title: 'Premium' },
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

          {step === 7 && (
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">7. Confirmation</span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Voulez-vous recevoir votre fiche par e-mail ?</h2>
              <p className="text-sm text-[#FFF7EF]/70 font-light">Votre résultat s’affiche immédiatement à l’écran. L’e-mail est facultatif.</p>
              <input
                type="email"
                value={answers.email}
                onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
                placeholder="Votre adresse e-mail (facultatif)"
                className="w-full p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/20 text-[#FFF7EF] placeholder-[#FFF7EF]/40 text-base focus:outline-none focus:border-[#C8753D]"
              />

              <div className="p-4 rounded-xl bg-[#050403]/80 border border-[#FFF7EF]/10 flex items-start gap-3 text-xs text-[#FFF7EF]/60">
                <ShieldAlert className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" />
                <span>
                  <strong>Bon à savoir :</strong> ces conseils beauté sont personnalisés et ne remplacent pas un avis médical. En cas de problème persistant de peau, consultez un dermatologue.
                </span>
              </div>
            </div>
          )}

          {/* Controls */}
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
                <span>Génération IA...</span>
              ) : step === 7 ? (
                <>Générer mon analyse <Sparkles className="w-4 h-4" /></>
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
