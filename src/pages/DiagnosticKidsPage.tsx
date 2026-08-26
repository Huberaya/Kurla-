import React, { useState } from 'react';
import { Heart, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export const DiagnosticKidsPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [age, setAge] = useState('3-6');
  const [painLevel, setPainLevel] = useState('pleure');
  const [timeAvailable, setTimeAvailable] = useState('20min');

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      window.location.href = '/diagnostic/resultat/kids-latest';
    }
  };

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Progress */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs text-[#C8753D] font-bold uppercase tracking-wider">
            <span>Diagnostic Enfant KURLA Kids • Étape {step} / 3</span>
            <span>{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E8E1DA] overflow-hidden">
            <div className="h-full bg-[#C8753D] transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] shadow-sm">
          {step === 1 && (
            <div className="space-y-6">
              <span className="text-xs uppercase font-bold text-[#C8753D] block">1. Âge de l'Enfant</span>
              <h2 className="text-2xl font-serif-title font-bold text-[#111111]">
                Quel est l'âge de votre enfant ?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: '0-2', title: 'Bébé (0 - 2 ans)', desc: 'Cuir chevelu très fin & duvet' },
                  { id: '3-6', title: 'Enfant (3 - 6 ans)', desc: 'Premières coiffures & école' },
                  { id: '7-12', title: 'Junior (7 - 12 ans)', desc: 'Autonomie progressive' }
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setAge(a.id); setStep(2); }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      age === a.id ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] text-[#111111]'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{a.title}</div>
                    <div className="text-xs opacity-80">{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <span className="text-xs uppercase font-bold text-[#C8753D] block">2. Comportement au Démêlage</span>
              <h2 className="text-2xl font-serif-title font-bold text-[#111111]">
                Comment se passe le moment du démêlage actuellement ?
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'pleure', title: 'Très difficile : Pleurs, cris & douleur', desc: 'Le peigne accroche les nœuds' },
                  { id: 'moyen', title: 'Moyen : Impatient(e), bouge beaucoup', desc: 'Besoin d’aller plus vite' },
                  { id: 'facile', title: 'Facile : Moment agréable', desc: 'Recherche juste une routine d’entretien' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPainLevel(p.id); setStep(3); }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      painLevel === p.id ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] text-[#111111]'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{p.title}</div>
                    <div className="text-xs opacity-80">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <span className="text-xs uppercase font-bold text-[#C8753D] block">3. Temps Disponible</span>
              <h2 className="text-2xl font-serif-title font-bold text-[#111111]">
                Combien de temps souhaitez-vous consacrer au soin par semaine ?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: '20min', title: '20 minutes max (Routine Express)', desc: 'Idéal pour le rythme des enfants' },
                  { id: '40min', title: '40 minutes (Soin complet du dimanche)', desc: 'Masque + vanilles protectrices' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTimeAvailable(t.id); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      timeAvailable === t.id ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] text-[#111111]'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{t.title}</div>
                    <div className="text-xs opacity-80">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
