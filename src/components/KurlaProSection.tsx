import React from 'react';
import { ShieldCheck, Star, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import { MOCK_PROS } from '../data/mockData';
import { KURLAPro3DMap } from './3d/KURLAPro3DMap';

export const KurlaProSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] relative border-t border-[#E8E1DA] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16">
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C8753D]" /> Charte Qualité Certifiée KURLA Pro
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] leading-tight">
              Des pros qui comprennent vraiment ta texture.
            </h2>
            <p className="text-base text-[#111111]/75 font-light max-w-[520px] leading-relaxed">
              Braiders, locticians, coiffeurs afro et expertes skincare peaux mélaninées sélectionnés selon une charte d'hygiène, d'écoute et de maîtrise de la fibre texturée.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-wrap gap-4 lg:justify-end">
            <a
              href="/professionnels"
              className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm transition-all shadow-md shadow-[#C8753D]/20 flex items-center gap-2"
            >
              Trouver un pro <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/professionnels/rejoindre"
              className="px-6 py-3.5 rounded-full bg-[#F8F2EC] hover:bg-[#E8E1DA] border border-[#E8E1DA] text-[#111111] font-medium text-sm transition-all"
            >
              Devenir pro KURLA
            </a>
          </div>
        </div>

        {/* 3D City Map Component */}
        <div className="mb-16">
          <KURLAPro3DMap />
        </div>

        {/* Pros Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MOCK_PROS.map((pro) => (
            <div
              key={pro.id}
              className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] transition-all p-6 flex flex-col justify-between shadow-xs hover:shadow-xl group"
            >
              <div>
                {/* Avatar & Badges */}
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={pro.avatar}
                    alt={pro.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#C8753D]/40 shadow-sm"
                  />
                  <div>
                    <h3 className="text-lg font-serif-title font-bold text-[#111111] flex items-center gap-1.5">
                      {pro.name}
                      {pro.certified && (
                        <CheckCircle2 className="w-4 h-4 text-[#C8753D]" title="KURLA Certified" />
                      )}
                    </h3>
                    <p className="text-xs text-[#C8753D] font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {pro.city}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-amber-500 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-[#111111]">{pro.rating}</span>
                      <span className="text-[#111111]/40">({pro.reviewCount})</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#111111]/75 font-light line-clamp-3 mb-4">
                  {pro.bio}
                </p>

                {/* Specialties Chips */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {pro.specialties.slice(0, 3).map((spec, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#F8F2EC] text-[#111111]/80 border border-[#E8E1DA]"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <a
                href={`/professionnels/profil/${pro.slug}`}
                className="w-full py-2.5 rounded-xl bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white border border-[#E8E1DA] text-xs font-semibold text-center transition-all"
              >
                Voir le profil & prestations
              </a>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
