import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Loader2, PackageOpen } from 'lucide-react';
import { RoutineBundle } from '../types';

/** Home-page routine module backed by the published routine API. */
export const RoutineCarouselSection: React.FC = () => {
  const [routines, setRoutines] = useState<RoutineBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/routines')
      .then(response => response.ok ? response.json() : { routines: [] })
      .then(data => setRoutines(Array.isArray(data.routines) ? data.routines : []))
      .catch(() => setRoutines([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && routines.length === 0) return null;

  return <section className="py-20 bg-[#FFFDF9] text-[#111111] border-t border-[#E8E1DA]"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"><div><span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold">Routines publiées</span><h2 className="text-3xl font-serif-title font-bold mt-2">Des étapes claires pour commencer.</h2><p className="text-sm text-[#111111]/65 mt-2">Uniquement des routines dont les produits et les informations ont été contrôlés.</p></div><a href="/routines" className="text-xs font-semibold text-[#C8753D] inline-flex items-center gap-1">Voir toutes les routines <ArrowRight className="w-3.5 h-3.5" /></a></div>{loading ? <div className="py-10 text-center"><Loader2 className="w-7 h-7 text-[#C8753D] animate-spin mx-auto" /></div> : <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{routines.slice(0, 3).map(routine => <article key={routine.id} className="rounded-3xl border border-[#E8E1DA] bg-[#F8F2EC] p-5"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#C8753D] font-semibold mb-2"><PackageOpen className="w-3.5 h-3.5" /> {routine.badge || 'Routine publiée'}</div><h3 className="text-xl font-serif-title font-bold">{routine.title}</h3><p className="text-xs text-[#111111]/65 mt-2 line-clamp-2">{routine.subtitle || 'Description non renseignée'}</p><div className="mt-4 space-y-2">{routine.steps.slice(0, 3).map(step => <p key={`${routine.id}-${step.number}`} className="text-xs text-[#111111]/75 flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#C8753D] shrink-0" /> {step.title}</p>)}{routine.duration && <p className="text-xs text-[#111111]/55 flex gap-2"><Clock className="w-3.5 h-3.5" /> {routine.duration}</p>}</div><a href={`/routines/${routine.slug}`} className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#C8753D]">Voir le détail <ArrowRight className="w-3.5 h-3.5" /></a></article>)}</div>}</div></section>;
};
