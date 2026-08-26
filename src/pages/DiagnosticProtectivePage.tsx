import React, { useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

export const DiagnosticProtectivePage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [styleType, setStyleType] = useState('knotless');
  const [weeksActive, setWeeksActive] = useState('2-4');

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      window.location.href = '/diagnostic/resultat/protective-latest';
    }
  };

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Progress */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs text-[#C8753D] font-bold uppercase tracking-wider">
            <span>Diagnostic Protective Style • Étape {step} / 2</span>
            <span>{Math.round((step / 2) * 100)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E8E1DA] overflow-hidden">
            <div className="h-full bg-[#C8753D] transition-all duration-300" style={{ width: `${(step / 2) * 100}%` }} />
          </div>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] shadow-sm">
          {step === 1 && (
            <div className="space-y-6">
              <span className="text-xs uppercase font-bold text-[#C8753D] block">1. Style Porté</span>
              <h2 className="text-2xl font-serif-title font-bold text-[#111111]">
                Quel est votre coiffure protectrice actuelle ou projetée ?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'knotless', title: 'Knotless / Box Braids', desc: 'Tresses individuelles' },
                  { id: 'locks', title: 'Sisterlocks / Microlocks', desc: 'Ancrage en locks' },
                  { id: 'twists', title: 'Passion Twists / Vanilles', desc: 'Torsades légères' },
                  { id: 'wig', title: 'Perruque / Tissage', desc: 'Tresses plaquées sous bonnet' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setStyleType(s.id); setStep(2); }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      styleType === s.id ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] text-[#111111]'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{s.title}</div>
                    <div className="text-xs opacity-80">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <span className="text-xs uppercase font-bold text-[#C8753D] block">2. Durée de la Pose</span>
              <h2 className="text-2xl font-serif-title font-bold text-[#111111]">
                Depuis combien de temps portez-vous cette coiffure ?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'moins-2', title: 'Moins de 2 semaines', desc: 'Pose récente' },
                  { id: '2-4', title: '2 à 4 semaines', desc: 'Entretien de croisière' },
                  { id: 'plus-6', title: 'Plus de 6 semaines', desc: 'Préparer la dépose' }
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => { setWeeksActive(w.id); handleNext(); }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      weeksActive === w.id ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] text-[#111111]'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{w.title}</div>
                    <div className="text-xs opacity-80">{w.desc}</div>
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
