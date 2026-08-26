import React from 'react';
import { Sparkles, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight, HeartHandshake } from 'lucide-react';
import { PROTECTIVE_IMAGE } from '../data/mockData';

export const ProtectiveStylesPage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero Header */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-8 sm:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Protective Styles & Braids Care
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111]">
              Knotless, Braids, Locks & Wigs : Protéger Sans Abîmer
            </h1>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              Tout le savoir-faire pour réussir sa pose, garder un cuir chevelu frais et sain, et réussir la dépose sans casse de la ligne de pousse.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/diagnostic/protective-style"
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Diagnostic Protective Style (2 min)
              </a>
              <a
                href="/professionnels"
                className="px-6 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-semibold flex items-center gap-2"
              >
                <HeartHandshake className="w-4 h-4 text-[#C8753D]" /> Trouver une braider / loctician certifiée
              </a>
            </div>
          </div>

          <div className="w-full md:w-80 aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shrink-0 shadow-md">
            <img src={PROTECTIVE_IMAGE} alt="Braids protective style" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Guide "Mes tresses sont-elles trop serrées ?" */}
        <div className="p-8 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] mb-12 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif-title font-bold text-[#111111]">
                Guide d’Alerte : "Mes tresses sont-elles trop serrées ?"
              </h2>
              <p className="text-xs text-[#111111]/60 font-light">
                Signes de traction excessive nécessitant une action immédiate pour prévenir l'alopécie.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-950">
              <span className="font-bold block mb-1">🚨 Signes d'alarme :</span>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Douleur vive persistante plus de 12 heures après la pose.</li>
                <li>Petits boutons blancs ou rouges le long des tempes ou de la nuque.</li>
                <li>Impossibilité de poser la tête à plat pour dormir sans antalgique.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
              <span className="font-bold block mb-1">✅ Que faire immédiatement :</span>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Vaporiser la lotion apaisante menthe & aloe vera sur les racines.</li>
                <li>Défaire impérativement les tresses de bordure si des boutons apparaissent.</li>
                <li>Ne jamais attacher les braids en chignon lourd pendant les 3 premiers jours.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 3 Phases Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]">
            <span className="text-[10px] uppercase font-bold text-[#C8753D] block mb-1">Phase 1</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Avant la Pose</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Faire un soin clarifiant léger puis un masque protéiné fortifiant. Sécher les cheveux aux doigts et au sérum thermo-protecteur.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]">
            <span className="text-[10px] uppercase font-bold text-[#C8753D] block mb-1">Phase 2</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Pendant la Pose</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Appliquer la lotion embout applicateur 2x par semaine. Dormir impérativement avec le bonnet satin XL pour braids.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]">
            <span className="text-[10px] uppercase font-bold text-[#C8753D] block mb-1">Phase 3</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Après la Dépose</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Démêler au doigt avec une huile de baobab AVANT de mouiller pour retirer les poussières et cheveux morts tombés naturellement.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
