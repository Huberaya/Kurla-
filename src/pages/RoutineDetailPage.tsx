import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ShoppingBag, Clock, Calendar, ShieldAlert, Loader2 } from 'lucide-react';
import { MOCK_ROUTINES } from '../data/mockData';
import { Product } from '../types';
import { useProducts } from '../services/productService';
import { NotFoundPage } from './NotFoundPage';

interface RoutineDetailPageProps {
  slug: string;
  onAddToCart: (product: Product) => void;
}

export const RoutineDetailPage: React.FC<RoutineDetailPageProps> = ({ slug, onAddToCart }) => {
  const { products, loading } = useProducts();
  const [added, setAdded] = useState(false);

  const routine = MOCK_ROUTINES.find(r => r.slug === slug);
  if (!routine) return <NotFoundPage />;

  const bundleProducts = products.length > 0 ? products.slice(0, 3) : [];

  const handleAddBundle = () => {
    bundleProducts.forEach(p => onAddToCart(p));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center">
        <div className="text-center p-8">
          <Loader2 className="w-10 h-10 text-[#C8753D] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#FFF7EF]/70">Chargement de la routine depuis Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-block px-3 py-1 rounded-full bg-[#3A2218] text-[#D49A63] border border-[#C8753D]/30 text-xs font-semibold uppercase tracking-wider">
              {routine.badge}
            </span>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF]">
              {routine.title}
            </h1>
            <p className="text-base text-[#FFF7EF]/80 font-light leading-relaxed">
              {routine.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-xs text-[#FFF7EF]/70 pt-2 border-t border-[#FFF7EF]/10">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C8753D]" /> {routine.benefit}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D49A63]" /> {routine.duration}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C8753D]" /> Fréquence recommandée : 1x/semaine
              </span>
            </div>

            {/* Price & Order CTA */}
            <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 flex items-center justify-between gap-4 shadow-xl">
              <div>
                <span className="text-xs text-[#D49A63] font-semibold block">Prix du Kit Complet :</span>
                <span className="text-3xl font-bold text-[#FFF7EF]">{routine.price.toFixed(2)} €</span>
                {routine.originalPrice && (
                  <span className="text-xs text-[#FFF7EF]/40 line-through ml-2">{routine.originalPrice.toFixed(2)} €</span>
                )}
              </div>

              <button
                onClick={handleAddBundle}
                className={`px-8 py-4 rounded-full font-semibold text-sm flex items-center gap-2 shadow-xl transition-all ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white hover:from-[#b06330]'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                {added ? 'Kit complet ajouté !' : 'Ajouter la routine au panier'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-[#FFF7EF]/15 shadow-2xl">
              <img
                src={routine.image}
                alt={routine.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Steps Breakdown */}
        <div className="mb-16 space-y-6">
          <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">
            Les étapes chronologiques du soin
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Clarifier & Laver', desc: 'Appliquer le shampoing doux sur cuir chevelu humide sans frotter les longueurs.' },
              { num: '02', title: 'Nourrir en profondeur', desc: 'Poser le masque soin 20 min sous bonnet autoréchauffant pour ouvrir les cuticules.' },
              { num: '03', title: 'Hydrater (Leave-In)', desc: 'Démêler aux doigts et appliquer la crème Cacao section par section.' },
              { num: '04', title: 'Sceller (Huile/Beurre)', desc: 'Appliquer quelques gouttes d\'élixir pour emprisonner l\'eau jusqu\'au prochain soin.' },
            ].map((step, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-3">
                <span className="text-2xl font-serif-title font-bold text-[#C8753D]">{step.num}</span>
                <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF]">{step.title}</h3>
                <p className="text-xs text-[#FFF7EF]/70 font-light leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Included Products List */}
        <div className="mb-16 space-y-6">
          <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">
            Produits inclus dans ce bundle
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {bundleProducts.map(p => (
              <div key={p.id} className="p-4 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 flex items-center gap-4">
                <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div>
                  <h4 className="text-xs font-serif-title font-bold text-[#FFF7EF]">{p.name}</h4>
                  <p className="text-[11px] text-[#D49A63] font-medium">{p.price.toFixed(2)} €</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Non-medical Disclaimer */}
        <div className="p-4 rounded-xl bg-[#1A0F0A]/60 border border-[#FFF7EF]/10 flex items-start gap-3 text-xs text-[#FFF7EF]/60">
          <ShieldAlert className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" />
          <span>
            <strong>Disclaimer :</strong> Les recommandations KURLA sont des conseils beauté non médicaux.
          </span>
        </div>

      </div>
    </div>
  );
};
