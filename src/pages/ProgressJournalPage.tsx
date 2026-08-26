import React, { useState } from 'react';
import { Heart, Plus, Calendar, ArrowLeft, Trophy } from 'lucide-react';
import { HERO_IMAGE, PROTECTIVE_IMAGE } from '../data/mockData';

export const ProgressJournalPage: React.FC = () => {
  const [hydrationScore, setHydrationScore] = useState(4);
  const [breakageScore, setBreakageScore] = useState(2); // 1 = faible casse (bien), 5 = forte casse
  const [detangleScore, setDetangleScore] = useState(4);

  const [entries, setEntries] = useState([
    {
      date: '01 Août 2026',
      hydration: 'Excellente (4/5)',
      casse: 'Trés faible',
      note: 'Moins de cheveux sur la brosse flex pendant le démêlage. La technique par sections porte ses fruits.',
      photo: HERO_IMAGE
    },
    {
      date: '20 Juillet 2026',
      hydration: 'Moyenne',
      casse: 'Modérée',
      note: 'Semaine de froid calcaire à Paris, besoin de doubler la dose de leave-in aloe vera.',
      photo: PROTECTIVE_IMAGE
    }
  ]);

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <a href="/account/kurla-id" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à mon KURLA ID
        </a>

        {/* 30-Day Challenge Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#111111] to-[#3A2218] text-white mb-10 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8753D] text-white text-[10px] uppercase font-bold tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5" /> Challenge KURLA 30 Jours
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-white">
              "30 Jours Pour Comprendre Ma Routine"
            </h1>
            <p className="text-xs text-white/80 font-light mt-1 max-w-xl">
              Suis l'évolution de la rétention de longueur, de l'hydratation et du confort de ton cuir chevelu au quotidien.
            </p>
          </div>

          <div className="text-center bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 shrink-0">
            <span className="text-[10px] uppercase text-white/70 block font-medium">Progression</span>
            <span className="text-2xl font-serif-title font-bold text-[#D49A63]">Jour 12 / 30</span>
          </div>
        </div>

        {/* Add Entry Box */}
        <div className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] mb-10 shadow-xs space-y-6">
          <h2 className="text-base font-serif-title font-bold text-[#111111] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#C8753D]" /> Ajouter une note au journal
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#111111] mb-1">Niveau d'hydratation (1-5)</label>
              <select
                value={hydrationScore}
                onChange={(e) => setHydrationScore(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA]"
              >
                <option value={1}>1 - Très sec</option>
                <option value={2}>2 - Sec</option>
                <option value={3}>3 - Équilibré</option>
                <option value={4}>4 - Bien hydraté</option>
                <option value={5}>5 - Maintien parfait</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#111111] mb-1">Casse constatée</label>
              <select
                value={breakageScore}
                onChange={(e) => setBreakageScore(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA]"
              >
                <option value={1}>1 - Nulle / Zéro casse</option>
                <option value={2}>2 - Très faible</option>
                <option value={3}>3 - Normale</option>
                <option value={4}>4 - Importante</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#111111] mb-1">Facilité de démêlage</label>
              <select
                value={detangleScore}
                onChange={(e) => setDetangleScore(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA]"
              >
                <option value={5}>5 - Glisse parfaite sans douleur</option>
                <option value={4}>4 - Facile</option>
                <option value={2}>2 - Nœuds fréquents</option>
              </select>
            </div>
          </div>

          <button className="w-full py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-xs">
            Enregistrer ma note de progression
          </button>
        </div>

        {/* Timeline of Entries */}
        <div className="space-y-6">
          <h2 className="text-lg font-serif-title font-bold text-[#111111] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#C8753D]" /> Historique des Notes
          </h2>

          <div className="space-y-4">
            {entries.map((entry, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs flex flex-col sm:flex-row gap-5 items-start">
                <img src={entry.photo} alt="Progression" className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-[#E8E1DA]" />
                <div className="space-y-2 flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#111111]">{entry.date}</span>
                    <span className="px-2.5 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] font-semibold">
                      Hydratation : {entry.hydration}
                    </span>
                  </div>
                  <p className="text-[#111111]/80 font-light leading-relaxed">
                    "{entry.note}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
