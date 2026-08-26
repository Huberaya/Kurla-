import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Loader2, PackageOpen, RefreshCw } from 'lucide-react';
import { RoutineBundle } from '../types';

export const RoutinesPage: React.FC = () => {
  const [routines, setRoutines] = useState<RoutineBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoutines = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/routines');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Les routines ne sont pas disponibles pour le moment.');
      setRoutines(Array.isArray(data.routines) ? data.routines : []);
    } catch (failure: any) {
      setError(failure?.message || 'Les routines ne sont pas disponibles pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoutines(); }, []);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">Routines & bundles</span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mb-3">Des étapes lisibles, sans promesse artificielle.</h1>
          <p className="text-sm text-[#FFF7EF]/70 font-light leading-relaxed">Chaque routine publiée doit réunir des produits publiés, des étapes documentées et un prix vérifiable. Si une information manque, la routine reste hors catalogue.</p>
        </div>

        {loading ? <div className="text-center py-20"><Loader2 className="w-9 h-9 text-[#C8753D] animate-spin mx-auto mb-4" /><p className="text-sm text-[#FFF7EF]/60">Chargement des routines publiées…</p></div> : error ? <div className="max-w-md mx-auto rounded-3xl border border-rose-400/20 bg-[#1A0F0A] p-8 text-center"><PackageOpen className="w-10 h-10 text-rose-300 mx-auto mb-3" /><p className="text-sm text-[#FFF7EF]/75 mb-5">{error}</p><button onClick={loadRoutines} className="px-5 py-2.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold inline-flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Réessayer</button></div> : routines.length === 0 ? <div className="max-w-xl mx-auto rounded-3xl border border-[#FFF7EF]/10 bg-[#1A0F0A] p-10 text-center"><PackageOpen className="w-10 h-10 text-[#D49A63] mx-auto mb-4" /><h2 className="text-xl font-serif-title font-bold mb-2">Aucune routine publiée</h2><p className="text-sm text-[#FFF7EF]/65">Les routines seront visibles ici après validation de leurs produits et de leurs étapes.</p><a href="/boutique" className="mt-6 inline-flex items-center gap-2 text-xs text-[#D49A63] hover:underline">Voir les produits publiés <ArrowRight className="w-3.5 h-3.5" /></a></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{routines.map(routine => <article key={routine.id} className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 overflow-hidden p-6 flex flex-col justify-between"><div>{routine.image ? <img src={routine.image} alt={routine.title} className="w-full h-56 rounded-2xl object-cover mb-6" /> : <div className="w-full h-56 rounded-2xl bg-black/20 flex items-center justify-center text-xs text-[#FFF7EF]/50 mb-6">Image non renseignée</div>}<span className="text-[10px] uppercase tracking-widest text-[#D49A63]">{routine.badge || 'Routine publiée'}</span><h2 className="text-2xl font-serif-title font-bold mt-2">{routine.title}</h2><p className="text-sm text-[#FFF7EF]/70 mt-2 leading-relaxed">{routine.subtitle || 'Description non renseignée'}</p><div className="space-y-2 mt-5 pt-4 border-t border-[#FFF7EF]/10">{routine.steps.map(step => <div key={`${routine.id}-${step.number}`} className="flex gap-2 text-xs text-[#FFF7EF]/75"><CheckCircle2 className="w-4 h-4 text-[#C8753D] shrink-0" /><span><strong className="text-[#FFF7EF]">{step.number}. {step.title}</strong>{step.description ? ` · ${step.description}` : ''}</span></div>)}{routine.duration && <div className="flex gap-2 text-xs text-[#FFF7EF]/55"><Clock className="w-4 h-4 text-[#D49A63]" />{routine.duration}{routine.frequency ? ` · ${routine.frequency}` : ''}</div>}</div></div><div className="pt-6 mt-6 border-t border-[#FFF7EF]/10 flex items-center justify-between gap-3"><span className="text-2xl font-bold">{routine.products.reduce((total, product) => total + product.price, 0).toFixed(2)} €</span><a href={`/routines/${routine.slug}`} className="px-5 py-2.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold inline-flex items-center gap-2">Voir le détail <ArrowRight className="w-3.5 h-3.5" /></a></div></article>)}</div>}
      </div>
    </div>
  );
};
