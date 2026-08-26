import React, { useState } from 'react';
import { ShieldCheck, Save, CheckCircle2, ArrowLeft, Sun } from 'lucide-react';

export const SkinIdPage: React.FC = () => {
  const [skinType, setSkinType] = useState('mixte');
  const [priority, setPriority] = useState('taches');
  const [spfUsage, setSpfUsage] = useState('quotidien');
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
            Fiche Skincare Mélanine
          </span>
          <h1 className="text-3xl font-serif-title font-bold text-[#111111]">
            Mon KURLA Skin ID
          </h1>
          <p className="text-sm text-[#111111]/75 font-light mt-1">
            Personnalise tes besoins pour les peaux riches en mélanine : prévention des taches, hydratation et solaires sans voile blanc.
          </p>
        </div>

        {saved && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Ton KURLA Skin ID a été mis à jour avec succès !
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 bg-[#F8F2EC] p-6 sm:p-8 rounded-3xl border border-[#E8E1DA] shadow-xs">
          {/* Type de Peau */}
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              1. Type de Peau
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'seche', label: 'Sèche' },
                { id: 'mixte', label: 'Mixte' },
                { id: 'grasse', label: 'Grasse' },
                { id: 'sensible', label: 'Sensible' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSkinType(s.id)}
                  className={`p-3 rounded-xl text-xs font-semibold border transition-all ${
                    skinType === s.id
                      ? 'bg-[#C8753D] text-white border-[#C8753D] shadow-xs'
                      : 'bg-[#FFFDF9] text-[#111111] border-[#E8E1DA] hover:border-[#C8753D]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priorité */}
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              2. Priorité Cosmétique Principale
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'taches', label: 'Taches d’Acné & Teint' },
                { id: 'hydratation', label: 'Hydratation & Teint Terne' },
                { id: 'imperfections', label: 'Boutons & Excès de Sébum' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`p-3 rounded-xl text-xs font-semibold border transition-all ${
                    priority === p.id
                      ? 'bg-[#C8753D] text-white border-[#C8753D] shadow-xs'
                      : 'bg-[#FFFDF9] text-[#111111] border-[#E8E1DA] hover:border-[#C8753D]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Usage SPF */}
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              3. Fréquence d’Application Solaire SPF
            </label>
            <select
              value={spfUsage}
              onChange={(e) => setSpfUsage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium focus:outline-none focus:border-[#C8753D]"
            >
              <option value="quotidien">Tous les matins (Recommandé KURLA)</option>
              <option value="soleil">Uniquement s’il fait très beau</option>
              <option value="jamais">Presque jamais (Recherche un soin incolore)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Enregistrer mes paramètres Skin ID
          </button>
        </form>

        {/* Recommandation Spéciale */}
        <div className="mt-8 p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] flex items-start gap-3">
          <Sun className="w-6 h-6 text-[#C8753D] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-[#111111] block">Conseil Mélanine KURLA :</span>
            <p className="text-[#111111]/75 font-light leading-relaxed">
              Pour prévenir l’hyperpigmentation post-inflammatoire, la Niacinamide 5% combinée au Fluide Solaire SPF 50 Incolore constitue le duo le plus efficace pour maintenir un teint uniforme sans décapage.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
