import React, { useState } from 'react';
import { TEXTURE_GALLERY } from '../data/images';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Reveal } from './motion/Reveal';

interface TextureItem {
  id: string;
  title: string;
  tag: string;
  cat: string;
  href: string;
  image: string;
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Toutes les textures' },
  { id: '4c', label: 'Cheveux 4C' },
  { id: 'boucles', label: 'Boucles 3B/3C' },
  { id: 'braids', label: 'Tresses & locks' },
  { id: 'skin', label: 'Peau mélaninée' },
  { id: 'kids', label: 'Enfants' },
  { id: 'hommes', label: 'Hommes' },
];

const CTA_BY_CAT: Record<string, string> = {
  '4c': 'Voir ma routine 4C',
  boucles: 'Voir ma routine boucles',
  braids: 'Entretenir mes tresses',
  skin: 'Découvrir le soin peau',
  kids: 'Explorer l’espace kids',
  hommes: 'Explorer l’espace hommes',
  pro: 'Trouver un pro près de chez moi',
};

export const TextureGallerySection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const items: TextureItem[] = TEXTURE_GALLERY as TextureItem[];
  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((item) => item.cat === selectedCategory || (selectedCategory === 'braids' && item.cat === 'braids'));

  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] relative overflow-hidden border-t border-[#E8E1DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <Reveal>
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> Inspiration textures &amp; carnations
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] mb-4">
            Reconnaissez vos cheveux, trouvez votre routine.
          </h2>
          <p className="text-sm sm:text-base text-[#111111]/75 max-w-xl mx-auto font-light leading-relaxed">
            Du 3B au 4C, des tresses aux locks, de la peau mélaninée aux cheveux des enfants : repérez ce qui vous ressemble et accédez directement aux conseils adaptés.
          </p>
        </Reveal>

        {/* Filtres */}
        <Reveal delay={0.15}>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#C8753D] text-white shadow-md'
                    : 'bg-[#F8F2EC] text-[#111111]/80 hover:bg-[#E8E1DA] border border-[#E8E1DA]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Grille */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item, idx) => (
            <Reveal key={item.id} delay={0.05 * idx}>
              <a
                href={item.href}
                className="group relative h-96 rounded-3xl overflow-hidden border border-[#E8E1DA] shadow-xs hover:shadow-xl hover:border-[#C8753D] transition-all duration-500 flex flex-col justify-end block"
              >
                <img loading="lazy" decoding="async"
                  src={item.image}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050403]/85 via-[#050403]/30 to-transparent" />

                <div className="relative z-10 p-5 text-white">
                  <span className="text-[10px] uppercase tracking-wider text-[#D49A63] font-semibold block mb-1">
                    {item.tag}
                  </span>
                  <h3 className="text-lg font-serif-title font-bold text-white mb-3">{item.title}</h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D49A63] group-hover:text-white group-hover:gap-2.5 transition-all">
                    {CTA_BY_CAT[item.cat] || 'En savoir plus'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
