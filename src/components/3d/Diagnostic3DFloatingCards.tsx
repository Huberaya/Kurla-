import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

interface CardStep {
  id: number;
  label: string;
  title: string;
  badge: string;
  detail: string;
  icon: string;
}

const STEPS: CardStep[] = [
  { id: 1, label: 'Étape 1', title: 'Texture & Style', badge: 'Cheveux 4C / Protective', detail: 'Analyse du type de spire et des habitudes de coiffage.', icon: '✨' },
  { id: 2, label: 'Étape 2', title: 'Besoin Principal', badge: 'Sécheresse & Casse', detail: 'Identification du blocage d’hydratation ou cuir chevelu.', icon: '💧' },
  { id: 3, label: 'Étape 3', title: 'Routine & Soins', badge: 'Starter LCO + Bonnet', detail: 'Recommandation supervisée avec ordre d’application.', icon: '🌿' },
  { id: 4, label: 'Étape 4', title: 'Suivi & Pros', badge: 'Pro Certifié KURLA', detail: 'Accès aux conseils et professionnels spécialisés.', icon: '👑' },
];

export const Diagnostic3DFloatingCards: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-lg h-[420px] mx-auto flex flex-col items-center justify-center select-none cursor-pointer"
      style={{ perspective: '1000px' }}
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-radial from-[#C8753D]/15 via-transparent to-transparent blur-3xl rounded-full animate-pulse-glow pointer-events-none" />

      {/* 3D Container with Mouse Tilt */}
      <div
        className="relative w-full h-full transition-transform duration-300 ease-out transform-gpu flex items-center justify-center"
        style={{
          transform: `rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {STEPS.map((step, idx) => {
          const isActive = idx === activeStep;
          const offset = idx - activeStep;
          const zOffset = -Math.abs(offset) * 60 + (isActive ? 40 : 0);
          const yOffset = offset * 45;
          const scale = 1 - Math.abs(offset) * 0.08;
          const opacity = isActive ? 1 : 0.45;

          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`absolute w-[90%] sm:w-[380px] p-6 rounded-2xl border transition-all duration-500 ease-out backdrop-blur-md shadow-xl ${
                isActive
                  ? 'bg-[#FFFDF9] border-[#C8753D] shadow-[0_20px_40px_rgba(200,117,61,0.2)] ring-1 ring-[#C8753D]/30 text-[#111111]'
                  : 'bg-[#F8F2EC]/90 border-[#E8E1DA] hover:border-[#C8753D]/40 text-[#111111]/80'
              }`}
              style={{
                transform: `translate3d(0, ${yOffset}px, ${zOffset}px) scale(${scale})`,
                opacity,
                zIndex: 10 - Math.abs(offset),
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold flex items-center gap-1.5">
                  <span className="text-sm">{step.icon}</span> {step.label}
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] border border-[#C8753D]/20 font-semibold">
                  {step.badge}
                </span>
              </div>

              <h4 className="text-lg font-serif-title text-[#111111] font-bold mb-1 flex items-center justify-between">
                {step.title}
                {isActive && <CheckCircle2 className="w-5 h-5 text-[#C8753D]" />}
              </h4>

              <p className="text-sm text-[#111111]/75 leading-relaxed mb-4">
                {step.detail}
              </p>

              <div className="flex items-center justify-between text-xs text-[#C8753D]">
                <span className="flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5" /> IA Supervisée
                </span>
                <span className="flex items-center gap-1 hover:text-[#111111] font-semibold">
                  Cliquer pour explorer <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step dots navigation */}
      <div className="absolute -bottom-6 flex items-center gap-2 z-20">
        {STEPS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveStep(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              activeStep === idx ? 'w-8 bg-[#C8753D]' : 'w-2 bg-[#E8E1DA] hover:bg-[#C8753D]/40'
            }`}
            aria-label={`Aller à l'étape ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
