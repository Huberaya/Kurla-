import React from 'react';
import { Award, MapPin, ArrowRight, Sparkles, Store, Users } from 'lucide-react';
import { Reveal } from '../motion/Reveal';

interface CommunityBrand {
  id: string;
  name: string;
  country: string;
  category: string;
  tagline: string;
}

const BRANDS_LIST: CommunityBrand[] = [
  {
    id: 'b1',
    name: 'Eadem',
    country: 'International',
    category: 'Skincare mélané',
    tagline: 'Des soins visage pensés pour les carnations mates à foncées, notamment contre les taches.',
  },
  {
    id: 'b2',
    name: 'Black Girl Sunscreen',
    country: 'International',
    category: 'Solaire invisible',
    tagline: 'Une protection solaire sans trace blanche ni fini gris, spécialement formulée pour les peaux noires.',
  },
  {
    id: 'b3',
    name: 'Les Secrets de Loly',
    country: 'France',
    category: 'Cheveux bouclés à crépus',
    tagline: 'Des soins capillaires naturels et gourmands, très aimés de la communauté curly française.',
  },
  {
    id: 'b4',
    name: 'In’Oya',
    country: 'France & DOM-TOM',
    category: 'Peaux noires & mates',
    tagline: 'Un laboratoire français spécialisé dans le soin des peaux mélaninées (taches, éclat).',
  },
  {
    id: 'b5',
    name: 'Bevel Grooming',
    country: 'International',
    category: 'Barbe & rasage homme',
    tagline: 'Des gammes de rasage conçues pour limiter les poils incarnés et les irritations.',
  },
  {
    id: 'b6',
    name: 'Kalia Nature',
    country: 'Martinique / France',
    category: 'Rituels capillaires bio',
    tagline: 'Un savoir-faire caribéen autour du karité pur, de l’hibiscus et de l’huile de ricin.',
  },
];

export const CommunitySection: React.FC = () => {
  return (
    <section className="py-24 bg-[#FFF7EF] text-[#111111] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <Reveal>
            <div className="max-w-[600px]">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold block mb-2">
                Marques &amp; créateurs
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] mb-3">
                Bientôt, les pépites de la communauté réunies ici.
              </h2>
              <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
                Nous repérons des marques indépendantes — fondées par et pour des peaux et cheveux texturés — pour les rassembler sur KURLA. Voici les marques que nous aimons et qui arrivent dans la boutique. <span className="font-medium text-[#111111]">Vous voulez vendre votre marque sur KURLA ?</span>
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex flex-wrap gap-3">
              <a
                href="/marques"
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold tracking-wide transition-all flex items-center gap-2 shadow-md shrink-0"
              >
                <Store className="w-4 h-4" /> Devenir marque partenaire
              </a>
              <a
                href="/community"
                className="px-6 py-3.5 rounded-full bg-white border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-semibold tracking-wide transition-all flex items-center gap-2 shrink-0"
              >
                <Users className="w-4 h-4" /> La communauté
              </a>
            </div>
          </Reveal>
        </div>

        {/* Grille marques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BRANDS_LIST.map((b, idx) => (
            <Reveal key={b.id} delay={0.08 * idx}>
              <div className="group rounded-3xl bg-white border border-[#E8E1DA] hover:border-[#C8753D] p-6 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xl font-serif-title font-bold text-[#111111] group-hover:text-[#C8753D] transition-colors">
                      {b.name}
                    </h3>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#111111]/60">
                      <MapPin className="w-3 h-3" /> {b.country}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F8F2EC] text-[10px] font-semibold text-[#C8753D] border border-[#C8753D]/20 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" /> À venir
                  </span>
                </div>

                <span className="self-start text-[11px] font-semibold text-[#C8753D] bg-[#F8F2EC] px-2.5 py-1 rounded-full mb-3">
                  {b.category}
                </span>

                <p className="text-xs text-[#111111]/75 font-light leading-relaxed flex-1">
                  {b.tagline}
                </p>

                <div className="pt-4 mt-4 border-t border-[#E8E1DA] flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                    <Award className="w-3.5 h-3.5" /> Repérée &amp; sélectionnée par KURLA
                  </span>
                  <a
                    href="/community"
                    className="text-xs font-bold text-[#C8753D] hover:text-[#b06330] flex items-center gap-1"
                  >
                    Suivre <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
};
