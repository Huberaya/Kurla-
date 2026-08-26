import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { MOCK_ROUTINES } from '../data/mockData';
import { Routine3DProductStage } from './3d/Routine3DProductStage';

export const RoutineCarouselSection: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = direction === 'left' ? -380 : 380;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] relative overflow-hidden border-t border-[#E8E1DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-[520px]">
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold flex items-center gap-1.5 block mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> Menus Beauté Ciblés
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-[#111111] mb-3">
              Les routines de départ.
            </h2>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              Quatre routines fondamentales pour commencer sereinement sans te perdre dans 10 étapes inutiles.
            </p>
          </div>

          {/* Carousel Control Arrows */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleScroll('left')}
              className="w-12 h-12 rounded-full bg-[#F8F2EC] hover:bg-[#E8E1DA] border border-[#E8E1DA] text-[#111111] flex items-center justify-center transition-all shadow-xs active:scale-95"
              aria-label="Previous routines"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-12 h-12 rounded-full bg-[#F8F2EC] hover:bg-[#E8E1DA] border border-[#E8E1DA] text-[#111111] flex items-center justify-center transition-all shadow-xs active:scale-95"
              aria-label="Next routines"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3D Product Stage Banner Accent */}
        <div className="mb-12 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 shadow-sm">
          <div className="lg:col-span-7 space-y-3">
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold">Podium Formulation KURLA</span>
            <h3 className="text-2xl font-serif-title font-bold text-[#111111]">Des soins d'exception réunis en kits harmonieux</h3>
            <p className="text-xs sm:text-sm text-[#111111]/75 font-light max-w-lg leading-relaxed">
              Chaque produit d'une routine KURLA interagit en synergie : de la clarification douce jusqu'au scellage nocturne au bonnet satin.
            </p>
          </div>
          <div className="lg:col-span-5 flex justify-center">
            <Routine3DProductStage />
          </div>
        </div>

        {/* Menu Cards Horizontal Scroll Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-none scroll-smooth"
        >
          {MOCK_ROUTINES.map((routine) => (
            <div
              key={routine.id}
              className="flex-none w-[320px] sm:w-[360px] snap-start rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-xl group"
            >
              {/* Image Header */}
              <div className="relative h-52 overflow-hidden">
                <img
                  src={routine.image}
                  alt={routine.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#FFFDF9] via-transparent to-transparent opacity-80" />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#FFFDF9]/90 backdrop-blur-md text-[11px] font-semibold text-[#111111] border border-[#E8E1DA] shadow-xs">
                  {routine.badge}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xl font-serif-title font-bold text-[#111111] mb-2 group-hover:text-[#C8753D] transition-colors">
                    {routine.title}
                  </h3>
                  <p className="text-xs text-[#111111]/75 font-light leading-relaxed mb-4">
                    {routine.subtitle}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-[#E8E1DA]">
                    <div className="flex items-center gap-2 text-xs text-[#111111]/90 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#C8753D]" />
                      <span>{routine.benefit}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#111111]/70">
                      <Clock className="w-4 h-4 text-[#C8753D]" />
                      <span>{routine.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Price & CTA */}
                <div className="pt-4 border-t border-[#E8E1DA] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-[#111111]/60 font-semibold block">Kit Complet</span>
                    <span className="text-xl font-bold text-[#111111]">{routine.price.toFixed(2)} €</span>
                    {routine.originalPrice && (
                      <span className="text-xs text-[#111111]/40 line-through ml-2">{routine.originalPrice.toFixed(2)} €</span>
                    )}
                  </div>
                  <a
                    href={`/routines/${routine.slug}`}
                    className="px-4 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold tracking-wide transition-colors shadow-xs"
                  >
                    Découvrir la routine
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
