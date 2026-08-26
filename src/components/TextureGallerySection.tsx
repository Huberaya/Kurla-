import React, { useState } from 'react';
import { TEXTURE_GALLERY } from '../data/mockData';
import { Sparkles, ArrowRight } from 'lucide-react';

export const TextureGallerySection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Toutes les textures' },
    { id: '4c', label: 'Cheveux 4C' },
    { id: 'boucles', label: 'Boucles 3B/3C' },
    { id: 'braids', label: 'Knotless & Locks' },
    { id: 'skin', label: 'Peau Mélaninée' },
    { id: 'kids', label: 'Enfants' },
  ];

  const filteredItems = selectedCategory === 'all'
    ? TEXTURE_GALLERY
    : TEXTURE_GALLERY.filter((item) => {
        if (selectedCategory === '4c') return item.title.includes('4C');
        if (selectedCategory === 'boucles') return item.title.includes('3B') || item.title.includes('Boucles');
        if (selectedCategory === 'braids') return item.title.includes('Braids') || item.title.includes('Locks');
        if (selectedCategory === 'skin') return item.title.includes('Peau');
        if (selectedCategory === 'kids') return item.title.includes('Enfant');
        return true;
      });

  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] relative overflow-hidden border-t border-[#E8E1DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
        <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> Galerie de Textures & Carnations Real-Life
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-[#111111] mb-4">
          Chaque texture à l’honneur.
        </h2>
        <p className="text-sm sm:text-base text-[#111111]/75 max-w-xl mx-auto font-light">
          Découvre des résultats réels sur cheveux 4A-4C, tresses, locks, peaux mélaninées et soins enfants.
        </p>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          {categories.map((cat) => (
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
      </div>

      {/* Grid of Texture Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative h-96 rounded-3xl overflow-hidden border border-[#E8E1DA] shadow-xs hover:shadow-xl transition-all duration-500 flex flex-col justify-end"
            >
              <img
                src={item.image}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050403]/85 via-[#050403]/30 to-transparent" />

              <div className="relative z-10 p-5 text-white">
                <span className="text-[10px] uppercase tracking-wider text-[#D49A63] font-semibold block mb-1">
                  {item.tag}
                </span>
                <h3 className="text-lg font-serif-title font-bold text-white mb-3">
                  {item.title}
                </h3>
                <a
                  href="/diagnostic/cheveux"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D49A63] group-hover:text-white transition-colors"
                >
                  Diagnostic adapté <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
