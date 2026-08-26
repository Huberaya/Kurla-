import React from 'react';
import { Trophy, Share2, Heart, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { UgcWallSection } from '../components/UgcWallSection';

export const CommunityPage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold mb-3">
            <Heart className="w-4 h-4" /> La Communauté KURLA Beauty
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111] mb-4">
            Transmission, Entraide & Expériences Partagées
          </h1>
          <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
            Rejoins des milliers de personnes qui partagent leurs routines, leurs résultats de diagnostics et leurs retours d'expérience bienveillants.
          </p>
        </div>

        {/* 30 Day Challenge Highlight */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#111111] via-[#3A2218] to-[#C8753D] text-white mb-16 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#D49A63]">
              Événement Communautaire Actif
            </span>
            <h2 className="text-2xl font-serif-title font-bold text-white">
              Challenge 30 Jours "Comprendre Ma Routine 4C & Melanin"
            </h2>
            <p className="text-xs text-white/80 font-light max-w-xl">
              Un mois pour documenter ton hydratation, ton cuir chevelu et recevoir les retours d'experts KURLA Pro.
            </p>
          </div>

          <a
            href="/account/progress"
            className="px-6 py-3.5 rounded-full bg-white text-[#111111] hover:bg-[#D49A63] hover:text-white text-xs font-semibold shrink-0 transition-colors shadow-md flex items-center gap-2"
          >
            Rejoindre le Challenge <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* UGC Wall Component Embed */}
        <div className="mb-12">
          <UgcWallSection />
        </div>

      </div>
    </div>
  );
};
