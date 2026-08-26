import React from 'react';
import { ArrowRight, ShoppingBag, Sparkles, Package, Layers, Scissors, Sun, UserCheck, Baby, Wrench } from 'lucide-react';
import { Reveal } from '../motion/Reveal';

interface CategoryCard {
  title: string;
  category: string;
  count: string;
  image: string;
  icon: any;
  href: string;
}

const CATEGORIES: CategoryCard[] = [
  {
    title: 'Soins Cheveux Texturés',
    category: 'Cheveux 3A à 4C',
    count: '48 produits',
    image: 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80',
    icon: Scissors,
    href: '/boutique?cat=cheveux'
  },
  {
    title: 'Skincare Peaux Mélaninées',
    category: 'Visage & SPF',
    count: '32 soins',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    icon: Sun,
    href: '/boutique?cat=peau'
  },
  {
    title: 'Grooming Hommes',
    category: 'Barbe & Rasage',
    count: '16 soins',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    icon: UserCheck,
    href: '/hommes'
  },
  {
    title: 'KURLA Kids 3+',
    category: 'Sans Larmes',
    count: '14 produits',
    image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80',
    icon: Baby,
    href: '/kids'
  },
  {
    title: 'Accessoires & Bonnets Satin',
    category: 'Protection Nuit',
    count: '24 articles',
    image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80',
    icon: Package,
    href: '/outils'
  },
  {
    title: 'Matériel & Casques Vapeur',
    category: 'Outillage Pro',
    count: '12 références',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    icon: Wrench,
    href: '/outils'
  },
  {
    title: 'Kits & Routines Complètes',
    category: 'Coffrets Clé en main',
    count: '18 kits',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    icon: Layers,
    href: '/routines'
  },
  {
    title: 'Marques de la Communauté',
    category: 'Créateurs Indépendants',
    count: '25 marques',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    icon: Sparkles,
    href: '/community'
  }
];

export const BoutiquePreviewSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#050403] text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <Reveal>
            <div className="max-w-[560px]">
              <span className="text-xs uppercase tracking-widest text-[#D49A63] font-bold block mb-2">
                Le Catalogue KURLA Beauty
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-white mb-3">
                Explorez la boutique par univers.
              </h2>
              <p className="text-sm sm:text-base text-[#FFF7EF]/75 font-light leading-relaxed">
                Des formulations saines sans ingrédients controversés, soigneusement sélectionnées pour l'excellence de votre rituel de beauté.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <a
              href="/boutique"
              className="px-8 py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm tracking-wide shadow-xl shadow-[#C8753D]/30 transition-all flex items-center gap-2 shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explorer toute la boutique</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </Reveal>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Reveal key={idx} delay={0.05 * idx}>
                <a
                  href={cat.href}
                  className="group relative rounded-3xl overflow-hidden bg-[#1A0F0A] border border-white/10 hover:border-[#C8753D] transition-all duration-500 shadow-xl flex flex-col justify-between h-[320px]"
                >
                  {/* Image Background */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={cat.image}
                      alt={cat.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050403]/90 via-[#050403]/40 to-transparent" />
                  </div>

                  {/* Top Badge */}
                  <div className="relative z-10 p-5 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-[#050403]/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[#D49A63] border border-[#C8753D]/30">
                      {cat.category}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#D49A63]" />
                    </div>
                  </div>

                  {/* Bottom Text */}
                  <div className="relative z-10 p-6 flex flex-col justify-end text-white">
                    <span className="text-[11px] text-[#FFF7EF]/70 font-medium block mb-1">
                      {cat.count}
                    </span>
                    <h3 className="text-lg font-serif-title font-bold text-white group-hover:text-[#D49A63] transition-colors flex items-center justify-between">
                      {cat.title}
                      <ArrowRight className="w-4 h-4 text-[#C8753D] group-hover:translate-x-1 transition-transform" />
                    </h3>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>

      </div>
    </section>
  );
};
