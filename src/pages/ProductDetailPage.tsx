import React, { useState } from 'react';
import { Star, ShoppingBag, CheckCircle2, AlertCircle, ShieldAlert, Camera, Sparkles, Image as ImageIcon, Info, Maximize2, Loader2, Database, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Product } from '../types';
import { getEnrichedProductGallery } from '../services/productImageService';
import { useProduct } from '../services/productService';

interface ProductDetailPageProps {
  slug: string;
  onAddToCart: (product: Product) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug, onAddToCart }) => {
  const { product, source, loading, error, refetch } = useProduct(slug);
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <Loader2 className="w-10 h-10 text-[#C8753D] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] mb-2">Chargement du produit Supabase...</h2>
          <p className="text-xs text-[#FFF7EF]/60">Récupération des informations produit depuis la table public.products</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center">
        <div className="text-center p-8 max-w-md bg-[#1A0F0A] rounded-3xl border border-[#FFF7EF]/10">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] mb-2">Produit Introuvable</h2>
          <p className="text-xs text-[#FFF7EF]/60 mb-6">
            {error ? error.message : `Aucun produit correspondant au slug ou ID "${slug}" n'a été trouvé dans la base Supabase.`}
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="/boutique"
              className="px-5 py-2.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold hover:bg-[#b06330] inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Retour à la boutique
            </a>
          </div>
        </div>
      </div>
    );
  }

  const gallery = getEnrichedProductGallery(product);
  const currentImg = gallery[activeImageIndex] || gallery[0];

  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">

          {/* Left Column: Hybrid Realistic Gallery */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Main Stage Image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden border border-[#FFF7EF]/10 bg-[#1A0F0A] shadow-2xl group">
              <img
                src={currentImg.url}
                alt={`${product.name} - ${currentImg.label}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Badges on Top Left */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                {product.badges.map((b, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-[#050403]/85 backdrop-blur-md text-xs font-semibold text-[#D49A63] border border-[#C8753D]/30 shadow-md">
                    {b}
                  </span>
                ))}
              </div>

              {/* Image Type Badge (Hybrid System Status) */}
              <div className="absolute top-4 right-4 z-10">
                {source === 'fallback' ? (
                  <span className="px-3 py-1 rounded-full bg-amber-950/90 backdrop-blur-md text-[11px] font-semibold text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-md">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    Visuel de démonstration
                  </span>
                ) : currentImg.isOfficial ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md text-[11px] font-semibold text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    Photo Officielle
                  </span>
                ) : product.isIllustrativeVisual ? (
                  <span className="px-3 py-1 rounded-full bg-amber-950/90 backdrop-blur-md text-[11px] font-semibold text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-md">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    Visuel illustratif — photo officielle à fournir
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-[#1A0F0A]/90 backdrop-blur-md text-[11px] font-semibold text-[#D49A63] border border-[#C8753D]/40 flex items-center gap-1.5 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-[#D49A63]" />
                    Mise en scène réaliste
                  </span>
                )}
              </div>

              {/* Active Image Label Overlay at Bottom */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#050403] via-[#050403]/70 to-transparent flex items-center justify-between">
                <span className="text-xs font-medium text-[#FFF7EF]/90 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#D49A63]" />
                  {currentImg.label}
                </span>
                <button
                  onClick={() => setIsZoomOpen(true)}
                  className="p-2 rounded-full bg-[#1A0F0A]/80 border border-[#FFF7EF]/20 text-[#FFF7EF] hover:bg-[#C8753D] transition-colors"
                  title="Agrandir l'image"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Thumbnail Navigation Bar */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D49A63] block">
                Vues & Mises en situation ({gallery.length} vues HD) :
              </span>

              <div className="grid grid-cols-5 gap-2.5">
                {gallery.map((img, idx) => {
                  const isActive = activeImageIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative aspect-square rounded-xl overflow-hidden border text-left transition-all ${
                        isActive
                          ? 'border-[#C8753D] ring-2 ring-[#C8753D]/40 scale-105'
                          : 'border-[#FFF7EF]/10 opacity-70 hover:opacity-100 hover:border-[#FFF7EF]/30'
                      }`}
                    >
                      <img src={img.url} alt={img.label} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      {img.isOfficial && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black" title="Photo officielle" />
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/75 p-1 text-[9px] text-[#FFF7EF] font-medium truncate text-center">
                        {img.type === 'hero' ? 'Hero' : img.type === 'detail' ? 'Détail' : img.type === 'lifestyle' ? 'Décor' : img.type === 'use' ? 'Usage' : img.type === 'kit' ? 'Kit' : 'Format'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* System Visual Guarantee Disclaimer */}
            <div className="p-3.5 rounded-2xl bg-[#1A0F0A]/60 border border-[#FFF7EF]/10 text-xs text-[#FFF7EF]/70 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-[#FFF7EF] block">Charte Éthique des Visuels Produits :</span>
                <p className="text-[11px] font-light leading-relaxed">
                  L’image principale reflète le conditionnement officiel. Les visuels complémentaires sont des photos en situation réelle garantissant la fidélité de texture et d’utilisation.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Details & Order Box */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold block mb-1">
                {product.brand} • {product.routineStep}
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif-title font-bold text-[#FFF7EF] mb-3">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold text-[#FFF7EF]">{product.rating}</span>
                </div>
                <span className="text-[#FFF7EF]/40">({product.reviewsCount} avis vérifiés)</span>
                <span className={`font-medium text-xs border px-2.5 py-0.5 rounded-full ${
                  product.inStock
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                }`}>
                  {product.inStock ? 'En stock' : 'Rupture de stock'}
                </span>
              </div>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-[#FFF7EF]">{product.price.toFixed(2)} €</span>
                {product.originalPrice && (
                  <span className="text-sm text-[#FFF7EF]/40 line-through ml-2">{product.originalPrice.toFixed(2)} €</span>
                )}
                <span className="text-[11px] text-[#FFF7EF]/50 block">TVA incluse • Livraison Europe</span>
              </div>

              <button
                onClick={handleAdd}
                disabled={!product.inStock}
                className={`px-8 py-3.5 rounded-full font-semibold text-sm flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white hover:from-[#b06330]'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                {added ? 'Ajouté au panier !' : product.inStock ? 'Ajouter au panier' : 'Indisponible'}
              </button>
            </div>

            <p className="text-sm text-[#FFF7EF]/80 font-light leading-relaxed">
              {product.description}
            </p>

            {/* For Who / Not Ideal If Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-1">
                <h4 className="text-xs uppercase font-bold text-[#D49A63] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pour qui ?
                </h4>
                <p className="text-xs text-[#FFF7EF]/80 font-light leading-relaxed">{product.forWho}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-1">
                <h4 className="text-xs uppercase font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Pas idéal si...
                </h4>
                <p className="text-xs text-[#FFF7EF]/80 font-light leading-relaxed">{product.notIdealIf}</p>
              </div>
            </div>

            {/* How to use */}
            <div className="p-5 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2">
              <h4 className="text-sm font-serif-title font-bold text-[#FFF7EF]">Comment l'utiliser dans ta routine ?</h4>
              <p className="text-xs text-[#FFF7EF]/80 font-light leading-relaxed">{product.howToUse}</p>
            </div>

            {/* Key ingredients */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold">Ingrédients Clés</h4>
              <div className="flex flex-wrap gap-2">
                {product.keyIngredients.map((ing, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-[#1A0F0A] text-xs text-[#FFF7EF] border border-[#FFF7EF]/10">
                    🌿 {ing}
                  </span>
                ))}
              </div>
            </div>

            {/* INCI List */}
            <div className="p-4 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 space-y-1">
              <span className="text-[11px] font-bold text-[#FFF7EF]/50 uppercase">Formulation INCI intégrale :</span>
              <p className="text-[11px] text-[#FFF7EF]/60 font-mono leading-relaxed">{product.inci}</p>
            </div>

            {/* Disclaimer if present */}
            {product.disclaimer && (
              <div className="p-4 rounded-xl bg-[#3A2218]/80 border border-[#C8753D]/30 flex items-start gap-3 text-xs text-[#FFF7EF]/70">
                <ShieldAlert className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" />
                <span>{product.disclaimer}</span>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Modal Zoom Fullscreen Viewer */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4" onClick={() => setIsZoomOpen(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center space-y-4" onClick={e => e.stopPropagation()}>
            <img src={currentImg.url} alt={currentImg.label} referrerPolicy="no-referrer" className="max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10" />
            <div className="text-center space-y-1">
              <h3 className="text-lg font-serif-title text-[#FFF7EF]">{product.name}</h3>
              <p className="text-xs text-[#D49A63] font-medium">{currentImg.label}</p>
            </div>
            <button
              onClick={() => setIsZoomOpen(false)}
              className="px-6 py-2 rounded-full bg-[#C8753D] text-white text-xs font-semibold hover:bg-[#b06330]"
            >
              Fermer la vue grand angle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
