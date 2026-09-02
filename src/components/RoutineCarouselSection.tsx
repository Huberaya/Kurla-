import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Loader2, Repeat, CalendarClock } from 'lucide-react';
import { RoutineBundle } from '../types';
import { Reveal } from './motion/Reveal';

const CAT_LABEL: Record<string, string> = {
  cheveux: 'Cheveux',
  peau: 'Peau',
  enfants: 'Enfants',
  protective: 'Coiffure protectrice',
};

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

  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] border-t border-[#E8E1DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <Reveal>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold">Routines prêtes à suivre</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold mt-2">
                Des étapes claires, dans le bon ordre.
              </h2>
              <p className="text-sm text-[#111111]/70 mt-3 max-w-[520px] font-light leading-relaxed">
                Chaque routine associe les gestes et les produits adaptés à votre besoin. Suivez-la pas à pas — ou laissez le diagnostic vous orienter.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <a href="/routines" className="text-xs font-semibold text-[#C8753D] hover:text-[#b06330] inline-flex items-center gap-1.5 shrink-0">
              Voir toutes les routines <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </Reveal>
        </div>

        {loading ? (
          <div className="py-16 text-center"><Loader2 className="w-7 h-7 text-[#C8753D] animate-spin mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {routines.slice(0, 3).map((routine, idx) => (
              <Reveal key={routine.id} delay={0.08 * idx}>
                <a
                  href={`/routines/${routine.slug}`}
                  className="group block rounded-3xl border border-[#E8E1DA] bg-[#F8F2EC] overflow-hidden hover:border-[#C8753D] hover:shadow-xl transition-all h-full flex flex-col"
                >
                  {/* Image */}
                  {routine.image ? (
                    <div className="relative h-44 bg-[#1A0F0A] overflow-hidden">
                      <img
                        src={routine.image}
                        alt={routine.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050403]/70 to-transparent" />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#FFFDF9]/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-[#C8753D] border border-white/30">
                        {CAT_LABEL[routine.category] || routine.badge || 'Routine'}
                      </span>
                    </div>
                  ) : (
                    <div className="px-5 pt-5">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-[#FFFDF9] text-[10px] font-bold uppercase tracking-wider text-[#C8753D] border border-[#E8E1DA]">
                        {CAT_LABEL[routine.category] || routine.badge || 'Routine'}
                      </span>
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-serif-title font-bold group-hover:text-[#C8753D] transition-colors">{routine.title}</h3>
                    {(routine.benefit || routine.subtitle) && (
                      <p className="text-xs text-[#111111]/70 mt-2 line-clamp-2 font-light leading-relaxed">
                        {routine.benefit || routine.subtitle}
                      </p>
                    )}

                    <div className="mt-4 space-y-2">
                      {routine.steps.slice(0, 3).map(step => (
                        <p key={`${routine.id}-${step.number}`} className="text-xs text-[#111111]/80 flex gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C8753D] shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{step.title}</span>
                        </p>
                      ))}
                    </div>

                    {/* Meta */}
                    <div className="mt-4 pt-4 border-t border-[#E8E1DA] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#111111]/60">
                      {routine.duration && (
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#C8753D]" /> {routine.duration}</span>
                      )}
                      {routine.frequency && (
                        <span className="flex items-center gap-1"><Repeat className="w-3.5 h-3.5 text-[#C8753D]" /> {routine.frequency}</span>
                      )}
                      {typeof routine.price === 'number' && routine.price > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-[#111111]">
                          <CalendarClock className="w-3.5 h-3.5 text-[#C8753D]" />
                          {routine.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      )}
                    </div>

                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#C8753D] group-hover:gap-2.5 transition-all">
                      Voir la routine <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
