import React from 'react';
import { User, Sparkles, CheckCircle, ShieldCheck, ArrowRight, Heart, ShoppingBag, Edit3, Award } from 'lucide-react';

export const KurlaIdPage: React.FC = () => {
  // Mock active user KURLA ID profile
  const profile = {
    name: 'Awa Diallo',
    email: 'awa.diallo@example.com',
    memberSince: 'Mars 2026',
    hairId: {
      texture: '4C (Crépus très resserré)',
      porosity: 'Forte porosité',
      density: 'Forte',
      thickness: 'Épaisse',
      currentStyle: 'Knotless Braids moyennes',
      scalp: 'Sujet aux démangeaisons légères'
    },
    skinId: {
      type: 'Peau Mélaninée Mixte',
      sensitivity: 'Moyenne',
      priority: 'Taches post-imperfections & SPF sans trace',
      spfUsage: 'Quotidienne'
    },
    routineId: {
      level: 'Débutante Rétablie',
      frequency: 'Wash Day le dimanche',
      lastUpdate: 'Il y a 3 jours',
      activeProductsCount: 4
    },
    productFitScore: 94
  };

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Profile Header */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-6 sm:p-8 mb-10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-[#C8753D] text-white flex items-center justify-center font-serif-title font-bold text-3xl shadow-md border-2 border-white">
              {profile.name.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D] flex items-center gap-1 block mb-1">
                <Award className="w-3.5 h-3.5" /> Profil Propriétaire KURLA ID Verified
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#111111]">
                {profile.name}
              </h1>
              <p className="text-xs text-[#111111]/60 font-light">
                {profile.email} • Membre depuis {profile.memberSince}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] text-center shadow-xs">
              <span className="text-[10px] uppercase text-[#111111]/60 font-medium block">KURLA Fit Average</span>
              <span className="text-xl font-bold text-[#C8753D]">{profile.productFitScore}%</span>
            </div>
          </div>
        </div>

        {/* 3 Main KURLA IDs Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          {/* 1. KURLA Hair ID */}
          <div className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] p-6 shadow-xs hover:border-[#C8753D] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E1DA]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C8753D]" />
                  <h2 className="text-lg font-serif-title font-bold text-[#111111]">KURLA Hair ID</h2>
                </div>
                <a href="/account/hair-id" className="p-1.5 rounded-full hover:bg-[#F8F2EC] text-[#111111]/60 hover:text-[#C8753D]">
                  <Edit3 className="w-4 h-4" />
                </a>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#111111]/50 block font-medium">Texture Principale</span>
                  <span className="font-bold text-[#111111]">{profile.hairId.texture}</span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block font-medium">Porosité</span>
                  <span className="font-semibold text-[#C8753D]">{profile.hairId.porosity}</span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block font-medium">Densité & Épaisseur</span>
                  <span className="font-medium text-[#111111]">{profile.hairId.density} • {profile.hairId.thickness}</span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block font-medium">Style Actuel</span>
                  <span className="font-medium text-[#111111]">{profile.hairId.currentStyle}</span>
                </div>
              </div>
            </div>

            <a
              href="/account/hair-id"
              className="mt-6 w-full py-2.5 rounded-xl bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
            >
              Gérer mon Hair ID <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 2. KURLA Skin ID */}
          <div className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] p-6 shadow-xs hover:border-[#C8753D] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E1DA]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#C8753D]" />
                  <h2 className="text-lg font-serif-title font-bold text-[#111111]">KURLA Skin ID</h2>
                </div>
                <a href="/account/skin-id" className="p-1.5 rounded-full hover:bg-[#F8F2EC] text-[#111111]/60 hover:text-[#C8753D]">
                  <Edit3 className="w-4 h-4" />
                </a>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#111111]/50 block font-medium">Type de Peau</span>
                  <span className="font-bold text-[#111111]">{profile.skinId.type}</span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block font-medium">Priorité Beauté</span>
                  <span className="font-semibold text-[#C8753D]">{profile.skinId.priority}</span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block font-medium">Sensibilité & SPF</span>
                  <span className="font-medium text-[#111111]">{profile.skinId.sensitivity} • SPF {profile.skinId.spfUsage}</span>
                </div>
              </div>
            </div>

            <a
              href="/account/skin-id"
              className="mt-6 w-full py-2.5 rounded-xl bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
            >
              Gérer mon Skin ID <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 3. KURLA Routine ID */}
          <div className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] p-6 shadow-xs hover:border-[#C8753D] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E1DA]">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#C8753D]" />
                  <h2 className="text-lg font-serif-title font-bold text-[#111111]">KURLA Routine ID</h2>
                </div>
                <a href="/account/routine-id" className="p-1.5 rounded-full hover:bg-[#F8F2EC] text-[#111111]/60 hover:text-[#C8753D]">
                  <Edit3 className="w-4 h-4" />
                </a>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#111111]/50 block font-medium">Niveau d'Expérience</span>
                  <span className="font-bold text-[#111111]">{profile.routineId.level}</span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block font-medium">Fréquence de Soin</span>
                  <span className="font-semibold text-[#C8753D]">{profile.routineId.frequency}</span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block font-medium">Produits Actifs Suivis</span>
                  <span className="font-medium text-[#111111]">{profile.routineId.activeProductsCount} soins dans ma routine</span>
                </div>
              </div>
            </div>

            <a
              href="/account/routine-id"
              className="mt-6 w-full py-2.5 rounded-xl bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
            >
              Gérer ma Routine ID <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/account/routine-tracker"
            className="p-5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] hover:border-[#C8753D] transition-all flex items-center gap-3"
          >
            <CheckCircle className="w-6 h-6 text-[#C8753D]" />
            <div>
              <span className="font-bold text-xs text-[#111111] block">Routine Tracker</span>
              <span className="text-[10px] text-[#111111]/60">Wash day & rappels</span>
            </div>
          </a>

          <a
            href="/account/progress"
            className="p-5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] hover:border-[#C8753D] transition-all flex items-center gap-3"
          >
            <Heart className="w-6 h-6 text-[#C8753D]" />
            <div>
              <span className="font-bold text-xs text-[#111111] block">Journal de Progression</span>
              <span className="text-[10px] text-[#111111]/60">Challenge 30 jours</span>
            </div>
          </a>

          <a
            href="/account/saved"
            className="p-5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] hover:border-[#C8753D] transition-all flex items-center gap-3"
          >
            <ShoppingBag className="w-6 h-6 text-[#C8753D]" />
            <div>
              <span className="font-bold text-xs text-[#111111] block">Mes Favoris & Soins</span>
              <span className="text-[10px] text-[#111111]/60">Articles & produits sauvés</span>
            </div>
          </a>

          <a
            href="/assistant-beaute"
            className="p-5 rounded-2xl bg-[#C8753D] text-white hover:bg-[#b06330] transition-all flex items-center gap-3 shadow-md"
          >
            <Sparkles className="w-6 h-6 text-white" />
            <div>
              <span className="font-bold text-xs block">Assistant IA Beauté</span>
              <span className="text-[10px] text-white/80">Poser une question</span>
            </div>
          </a>
        </div>

      </div>
    </div>
  );
};
