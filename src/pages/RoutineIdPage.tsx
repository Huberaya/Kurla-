import React, { useState } from 'react';
import { CheckCircle, Save, CheckCircle2, ArrowLeft, Calendar } from 'lucide-react';

export const RoutineIdPage: React.FC = () => {
  const [level, setLevel] = useState('debutante');
  const [frequency, setFrequency] = useState('7-jours');
  const [budget, setBudget] = useState('accessible');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        <a href="/account/kurla-id" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à mon KURLA ID
        </a>

        <div className="mb-8">
          <span className="text-xs font-semibold text-[#C8753D] uppercase tracking-widest block mb-1">
            Organisation Capillaire
          </span>
          <h1 className="text-3xl font-serif-title font-bold text-[#111111]">
            Mon KURLA Routine ID
          </h1>
          <p className="text-sm text-[#111111]/75 font-light mt-1">
            Définit la fréquence de tes Wash Days, ton niveau de disponibilité et tes objectifs pour générer un calendrier personnalisé.
          </p>
        </div>

        {saved && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Ton KURLA Routine ID a été mis à jour avec succès !
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 bg-[#F8F2EC] p-6 sm:p-8 rounded-3xl border border-[#E8E1DA] shadow-xs">
          {/* Niveau */}
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              1. Niveau d’Expérience & Disponibilité
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'debutante', label: 'Débutante (Max 20 min/semaine)' },
                { id: 'intermediaire', label: 'Régulière (Routine complète)' },
                { id: 'passionnee', label: 'Expert / Passionnée' }
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLevel(l.id)}
                  className={`p-3 rounded-xl text-xs font-semibold border transition-all ${
                    level === l.id
                      ? 'bg-[#C8753D] text-white border-[#C8753D] shadow-xs'
                      : 'bg-[#FFFDF9] text-[#111111] border-[#E8E1DA] hover:border-[#C8753D]'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fréquence Wash Day */}
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              2. Fréquence du Wash Day
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium focus:outline-none focus:border-[#C8753D]"
            >
              <option value="7-jours">Tous les 7 jours (1x par semaine)</option>
              <option value="10-jours">Tous les 10 à 14 jours</option>
              <option value="3-semaines">Toutes les 3 semaines (Protective styles)</option>
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              3. Profil Budget Produit
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'accessible', label: 'Essentiels & Budget Maîtrisé' },
                { id: 'premium', label: 'Gamme Botanique Grand Cru' }
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudget(b.id)}
                  className={`p-3 rounded-xl text-xs font-semibold border transition-all ${
                    budget === b.id
                      ? 'bg-[#C8753D] text-white border-[#C8753D] shadow-xs'
                      : 'bg-[#FFFDF9] text-[#111111] border-[#E8E1DA] hover:border-[#C8753D]'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Enregistrer mes paramètres Routine ID
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/account/routine-tracker"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-[#C8753D] transition-colors"
          >
            <Calendar className="w-4 h-4" /> Ouvrir mon Routine Tracker & Calendrier Wash Day
          </a>
        </div>

      </div>
    </div>
  );
};
