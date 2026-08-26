import React from 'react';
import { Heart, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import { KIDS_CARE_IMAGE } from '../data/mockData';

export const KidsModulePage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero Section */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-8 sm:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
              <Heart className="w-4 h-4" /> KURLA Kids • Soins Cheveux Enfants
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111]">
              Comprendre & Soigner les Cheveux de Son Enfant Sans Douleur
            </h1>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              Un espace bienveillant et déculpabilisant dédié aux parents : routines en 20 minutes, démêlage magique sans larmes et coiffures protectrices respectueuses du cuir chevelu des tout-petits.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/diagnostic/enfant"
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Faire le Diagnostic Enfant (2 min)
              </a>
              <a
                href="/assistant-beaute"
                className="px-6 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-semibold flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#C8753D]" /> Poser une question à l'IA Kids
              </a>
            </div>
          </div>

          <div className="w-full md:w-80 aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shrink-0 shadow-md">
            <img src={KIDS_CARE_IMAGE} alt="Mom and daughter textured hair moment" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* 4 Pillars Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center font-bold mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif-title font-bold text-[#111111] mb-2">
              Routine Express 20 Min
            </h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Pas besoin d'y passer l'après-midi. Séparer en 4 grosses vanilles, vaporiser la brume magique, appliquer le baume fondant et démêler doucement de bas en haut.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center font-bold mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif-title font-bold text-[#111111] mb-2">
              Formules Hypoallergéniques
            </h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Sans huiles essentielles irritantes, sans phtalates ni sulfates agressifs. Conçues pour le cuir chevelu sensible des enfants à partir de 3 ans.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center font-bold mb-4">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif-title font-bold text-[#111111] mb-2">
              Démêlage Sans Larmes
            </h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Utiliser exclusivement la brosse flex ergonomique sur cheveux gorgés de baume. Jamais de peigne fin sur cheveux secs.
            </p>
          </div>

        </div>

        {/* Parent FAQs Section */}
        <div className="p-8 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] mb-12">
          <h2 className="text-xl font-serif-title font-bold text-[#111111] mb-6">
            Questions Fréquentes des Parents :
          </h2>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
              <span className="font-bold text-[#111111] block mb-1">
                Mon enfant pleure dès que je sors la brosse, que faire ?
              </span>
              <p className="text-[#111111]/70 font-light leading-relaxed">
                Ne jamais démêler à sec. Transforme le moment en rituels : lecture d'un conte, miroir personnel, ou vaporisateur rigolo. Laisse-le participer en tenant sa brosse.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
              <span className="font-bold text-[#111111] block mb-1">
                À quelle fréquence laver ses cheveux ?
              </span>
              <p className="text-[#111111]/70 font-light leading-relaxed">
                Tous les 7 à 10 jours avec un shampooing doux spécial enfants. En milieu de semaine, une simple ré-humidification au vaporisateur suffit.
              </p>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Note de Sécurité Enfants :</span>
            <p className="font-light leading-relaxed">
              Éviter les tresses très serrées ou rajouts artificiels lourds chez les jeunes enfants pour préserver leurs follicules pileux en pleine croissance.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
