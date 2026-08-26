import React from 'react';
import { Video, Calendar, ShieldCheck, Sparkles, Star, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { CONSULTATION_TYPES } from './ConsultationBookingModal';

interface VirtualConsultationSectionProps {
  onOpenBookingModal: (proId?: string) => void;
}

export const VirtualConsultationSection: React.FC<VirtualConsultationSectionProps> = ({
  onOpenBookingModal
}) => {
  return (
    <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-[#1A0F0A] via-[#2A1810] to-[#050403] border border-[#C8753D]/40 text-[#FFF7EF] shadow-2xl relative overflow-hidden mb-12">
      
      {/* Background Decorative Blur */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#C8753D]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        
        {/* Left Intro Text */}
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8753D]/20 text-[#C8753D] text-xs font-bold uppercase tracking-wider border border-[#C8753D]/30">
            <Video className="w-3.5 h-3.5 animate-pulse" />
            Nouveau : Consultation Vidéo Privée
          </div>

          <h2 className="text-2xl sm:text-4xl font-serif-title font-bold text-[#FFF7EF]">
            Réserve une séance visio avec un expert capillaire ou skincare.
          </h2>

          <p className="text-xs sm:text-sm text-[#FFF7EF]/80 font-light leading-relaxed">
            Tu ne peux pas te déplacer en salon ? Nos experts certifiés KURLA t'analysent en vidéo direct, évaluent tes produits actuels et construisent ton plan d'action personnalisé en 30 minutes.
          </p>

          {/* Benefits Bullet Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-[#FFF7EF]/90">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C8753D]" />
              <span>Analyse vidéo en direct de la fibre & porosité</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C8753D]" />
              <span>Revue complète de tes produits cosmétiques</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C8753D]" />
              <span>Plan de routine PDF envoyé sous 24h</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C8753D]" />
              <span>Lien Google Meet sécurisé immédiat</span>
            </div>
          </div>
        </div>

        {/* Right CTA Box / Cards */}
        <div className="w-full lg:w-auto shrink-0 bg-[#050403]/80 p-6 rounded-2xl border border-[#FFF7EF]/15 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-[#FFF7EF]/10 pb-3">
            <div>
              <div className="text-xs font-bold text-[#FFF7EF]">Diagnostic Visio 30 min</div>
              <div className="text-[10px] text-[#D49A63]">35 € • Satisfait ou réorienté</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>4.9 / 5</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[#FFF7EF]/70">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#C8753D]" />
              <span>Créneaux aujourd'hui et cette semaine</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#C8753D]" />
              <span>Session individuelle & personnalisée</span>
            </div>
          </div>

          <button
            onClick={() => onOpenBookingModal()}
            className="w-full py-3.5 px-6 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer group"
          >
            <span>Ouvrir le Calendrier de Réservation</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>

    </div>
  );
};
