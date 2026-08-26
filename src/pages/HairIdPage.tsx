import React, { useState } from 'react';
import { Sparkles, Save, CheckCircle2, ArrowLeft } from 'lucide-react';
import { HAIR_KNOWLEDGE } from '../lib/knowledge/hair';

export const HairIdPage: React.FC = () => {
  const [texture, setTexture] = useState('4C');
  const [porosity, setPorosity] = useState('high');
  const [density, setDensity] = useState('forte');
  const [thickness, setThickness] = useState('epaisse');
  const [scalp, setScalp] = useState('sensible');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const currentInfo = HAIR_KNOWLEDGE['4c'];

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        <a href="/account/kurla-id" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à mon KURLA ID
        </a>

        <div className="mb-8">
          <span className="text-xs font-semibold text-[#C8753D] uppercase tracking-widest block mb-1">
            Fiche Technique Individuelle
          </span>
          <h1 className="text-3xl font-serif-title font-bold text-[#111111]">
            Mon KURLA Hair ID
          </h1>
          <p className="text-sm text-[#111111]/75 font-light mt-1">
            Configure tes caractéristiques capillaires précises pour recalculer automatiquement ton score KURLA Fit sur l’ensemble du catalogue.
          </p>
        </div>

        {saved && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Ton KURLA Hair ID a été mis à jour avec succès !
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 bg-[#F8F2EC] p-6 sm:p-8 rounded-3xl border border-[#E8E1DA] shadow-xs">
          {/* Texture */}
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              1. Texture Principale
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['4C', '4A/4B', '3B/3C', 'Locks / Sisterlocks'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTexture(t)}
                  className={`p-3 rounded-xl text-xs font-semibold border transition-all ${
                    texture === t
                      ? 'bg-[#C8753D] text-white border-[#C8753D] shadow-xs'
                      : 'bg-[#FFFDF9] text-[#111111] border-[#E8E1DA] hover:border-[#C8753D]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Porosité */}
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              2. Porosité
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'low', label: 'Faible (Lente à imbiber)' },
                { id: 'medium', label: 'Moyenne (Équilibrée)' },
                { id: 'high', label: 'Forte (Absorbe & sèche vite)' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPorosity(p.id)}
                  className={`p-3 rounded-xl text-xs font-semibold border transition-all ${
                    porosity === p.id
                      ? 'bg-[#C8753D] text-white border-[#C8753D] shadow-xs'
                      : 'bg-[#FFFDF9] text-[#111111] border-[#E8E1DA] hover:border-[#C8753D]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Densité & Épaisseur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
                3. Densité
              </label>
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium focus:outline-none focus:border-[#C8753D]"
              >
                <option value="faible">Faible (Cuir chevelu très visible)</option>
                <option value="moyenne">Moyenne</option>
                <option value="forte">Forte (Beaucoup de volume)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
                4. Épaisseur du brin
              </label>
              <select
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium focus:outline-none focus:border-[#C8753D]"
              >
                <option value="fine">Fine (S’emmêle facilement)</option>
                <option value="moyenne">Moyenne</option>
                <option value="epaisse">Épaisse (Matière dense et résistante)</option>
              </select>
            </div>
          </div>

          {/* Cuir Chevelu */}
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              5. État du Cuir Chevelu
            </label>
            <select
              value={scalp}
              onChange={(e) => setScalp(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium focus:outline-none focus:border-[#C8753D]"
            >
              <option value="normal">Sain / Équilibré</option>
              <option value="sec">Sec / Démangeaisons</option>
              <option value="gras">Gras / Sébum important</option>
              <option value="sensible">Sensible aux protective styles</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Enregistrer mes paramètres Hair ID
          </button>
        </form>

        {/* Dynamic Advice Based on Profile */}
        <div className="mt-8 p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] space-y-4">
          <span className="text-xs uppercase tracking-widest font-bold text-[#C8753D] flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> Analyse KURLA pour {texture} • Porosité {porosity === 'high' ? 'Forte' : 'Normale'}
          </span>
          <p className="text-xs text-[#111111]/80 font-light leading-relaxed">
            {currentInfo.porosityAdvice.high}
          </p>
        </div>

      </div>
    </div>
  );
};
