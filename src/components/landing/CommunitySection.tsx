import React, { useState } from 'react';
import { ShieldCheck, Award, MapPin, ExternalLink, ArrowRight, Sparkles, CheckCircle2, Building2, Store } from 'lucide-react';
import { Reveal } from '../motion/Reveal';

interface CommunityBrand {
  id: string;
  name: string;
  country: string;
  category: string;
  tagline: string;
  verified: boolean;
  communityCreator: boolean;
  image: string;
}

const BRANDS_LIST: CommunityBrand[] = [
  {
    id: 'b1',
    name: 'Eadem',
    country: 'International',
    category: 'Skincare Mélané & Anti-Taches',
    tagline: 'Formulations exclusives Smart Melanin™ pour estomper les taches d’hyperpigmentation.',
    verified: true,
    communityCreator: true,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'b2',
    name: 'Black Girl Sunscreen',
    country: 'International',
    category: 'Photoprotection Solaire Invisible',
    tagline: 'Protections solaires riches en jojoba et dattes, sans résidu ni reflet gris.',
    verified: true,
    communityCreator: true,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'b3',
    name: 'Les Secrets de Loly',
    country: 'France',
    category: 'Soins Cheveux Bouclés & Crépus',
    tagline: 'Routines gourmandes certifiées naturelles aux actifs végétaux ultra-hydratants.',
    verified: true,
    communityCreator: true,
    image: 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'b4',
    name: 'In’Oya',
    country: 'France & DOM-TOM',
    category: 'Dermatologie Peaux Noires & Mâtes',
    tagline: 'Recherche dermatologique brevetée anti-taches & matifiante pour peaux mélaninées.',
    verified: true,
    communityCreator: false,
    image: 'https://images.unsplash.com/photo-1512290900678-ebaa85d56b00?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'b5',
    name: 'Bevel Grooming',
    country: 'International',
    category: 'Barbe & Rasage Masculin',
    tagline: 'Systèmes de rasage et soins conçus spécifiquement pour empêcher les poils incarnés.',
    verified: true,
    communityCreator: true,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'b6',
    name: 'Kalia Nature',
    country: 'Martinique / France',
    category: 'Rituels Capillaires Bio Karité',
    tagline: 'Savoir-faire caribéen aux beurre de karité pur, huile d’hibiscus et ricin.',
    verified: true,
    communityCreator: true,
    image: 'https://images.unsplash.com/photo-1608248540480-17637841852d?auto=format&fit=crop&w=800&q=80',
  },
];

export const CommunitySection: React.FC = () => {
  return (
    <section className="py-24 bg-[#FFF7EF] text-[#111111] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <Reveal>
            <div className="max-w-[560px]">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold block mb-2">
                Marques & Créateurs de la Communauté
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] mb-3">
                Des formulations pensées par et pour notre communauté.
              </h2>
              <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
                Découvrez des marques indépendantes et dermatologiques rigoureusement sélectionnées pour la qualité de leurs ingrédients et leur efficacité prouvée.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <a
              href="/community"
              className="px-6 py-3.5 rounded-full bg-[#111111] hover:bg-[#C8753D] text-white text-xs font-semibold tracking-wide transition-all flex items-center gap-2 shadow-md shrink-0"
            >
              <span>Découvrir tous les créateurs</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </Reveal>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BRANDS_LIST.map((b, idx) => (
            <Reveal key={b.id} delay={0.1 * idx}>
              <div className="group rounded-3xl bg-white border border-[#E8E1DA] hover:border-[#C8753D] p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between h-full">
                
                <div>
                  {/* Top Image & Badge */}
                  <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-5 bg-[#1A0F0A]">
                    <img
                      src={b.image}
                      alt={b.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {b.verified && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md text-[10px] font-semibold text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Marque Vérifiée
                        </span>
                      )}
                      {b.communityCreator && (
                        <span className="px-2.5 py-1 rounded-full bg-[#C8753D]/90 backdrop-blur-md text-[10px] font-semibold text-white border border-[#C8753D] flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-300" /> Créateur Communauté
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
                      <span className="flex items-center gap-1 text-[#D49A63]">
                        <MapPin className="w-3.5 h-3.5" /> {b.country}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-serif-title font-bold text-[#111111] group-hover:text-[#C8753D] transition-colors">
                        {b.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-[#C8753D] bg-[#F8F2EC] px-2.5 py-1 rounded-full">
                        {b.category}
                      </span>
                    </div>

                    <p className="text-xs text-[#111111]/75 font-light leading-relaxed">
                      {b.tagline}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8E1DA] flex items-center justify-between">
                  <a
                    href={`/boutique?brand=${encodeURIComponent(b.name)}`}
                    className="text-xs font-bold text-[#C8753D] hover:text-[#b06330] flex items-center gap-1.5"
                  >
                    Voir les produits de la marque <ArrowRight className="w-3.5 h-3.5" />
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
