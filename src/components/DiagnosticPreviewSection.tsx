import React from 'react';
import { Sparkles, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import { Diagnostic3DFloatingCards } from './3d/Diagnostic3DFloatingCards';

export const DiagnosticPreviewSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#F8F2EC] text-[#111111] relative border-t border-[#E8E1DA] overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#C8753D]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Column: Text & Features */}
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C8753D]" /> Diagnostic personnalisé &amp; gratuit
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] leading-tight">
              Votre diagnostic en 3 minutes, sans frais.
            </h2>

            <p className="text-base text-[#111111]/80 max-w-[520px] font-light leading-relaxed">
              Répondez à quelques questions ciblées : KURLA établit une routine claire et personnalisée selon la texture de vos cheveux et les besoins de votre peau. Gratuit, sans abonnement ni carte bancaire.
            </p>

            {/* Checklist of what user gets */}
            <div className="space-y-3 pt-2">
              {[
                'Votre texture identifiée (3A à 4C, boucles, locks, tresses)',
                'Votre porosité et l’état de votre cuir chevelu évalués',
                'Une routine étape par étape, claire et sans superflu',
                'Des produits du catalogue et des pros près de chez vous'
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-[#111111]/90 font-medium">
                  <div className="w-5 h-5 rounded-full bg-[#C8753D]/15 text-[#C8753D] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <a
                href="/diagnostic/cheveux"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-base shadow-lg shadow-[#C8753D]/20 transition-all transform hover:-translate-y-0.5"
              >
                Démarrer mon diagnostic gratuit
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>

            {/* Non-medical Disclaimer */}
            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] flex items-start gap-3 text-xs text-[#111111]/70 max-w-[520px] shadow-xs">
              <ShieldAlert className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" />
              <span>
                <strong>Bon à savoir :</strong> le diagnostic donne des conseils beauté personnalisés, pas un avis médical. En cas de problème persistant du cuir chevelu ou de la peau, tournez-vous vers un professionnel de santé.
              </span>
            </div>
          </div>

          {/* Right Column: 3D Interactive Quiz Stage */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <Diagnostic3DFloatingCards />
          </div>

        </div>
      </div>
    </section>
  );
};
