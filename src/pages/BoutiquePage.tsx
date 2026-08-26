import React, { useState, useMemo } from 'react';
import { 
  Sparkles, ShoppingBag, Star, Filter, CheckCircle2, Award, X, 
  ChevronRight, Globe, Tag, Droplets, Sun, Moon, Shield, Heart, 
  Layers, Zap, Search, RefreshCw, ArrowRight, Loader2, AlertTriangle, Database
} from 'lucide-react';
import { MOCK_ROUTINES } from '../data/mockData';
import { Product, RoutineBundle } from '../types';
import { useProducts } from '../services/productService';
import { useAuth } from '../context/AuthContext';

interface BoutiquePageProps {
  onAddToCart: (product: Product) => void;
  selectedCategory?: string;
}

// Definition of Hair and Skin Needs
interface NeedOption {
  id: string;
  label: string;
  domain: 'cheveux' | 'peau';
  icon: string;
  description: string;
}

const HAIR_NEEDS: NeedOption[] = [
  { id: 'hydrater_cheveux', label: 'Hydrater mes cheveux', domain: 'cheveux', icon: '💧', description: 'Formules pénétrantes riches en eau & aloe pour éradiquer la sécheresse.' },
  { id: 'reduire_casse', label: 'Réduire la casse', domain: 'cheveux', icon: '🛡️', description: 'Soins fortifiants et masques protéines pour consolider la fibre capillaire.' },
  { id: 'demeler_cheveux', label: 'Démêler mes cheveux', domain: 'cheveux', icon: '🪮', description: 'Crèmes de démêlage ultra glissantes & brosses flex anti-traction.' },
  { id: 'cuir_chevelu', label: 'Prendre soin du cuir chevelu', domain: 'cheveux', icon: '🌱', description: 'Huiles légères et sprays apaisants contre démangeaisons et pellicules.' },
  { id: 'entretenir_tresses', label: 'Entretenir tresses / knotless', domain: 'cheveux', icon: '✨', description: 'Sprays rafraîchissants anti-tensions et produits de soin spécial coiffures protectrices.' },
  { id: 'entretenir_locks', label: 'Entretenir mes locks', domain: 'cheveux', icon: '🔒', description: 'Bains d’huile légers, sprays mentholés et bonnets satin de protection.' },
  { id: 'entretenir_perruque', label: 'Entretenir perruque / wig', domain: 'cheveux', icon: '👑', description: 'Accessoires de maintien, taies satin et soins préserve-fibre.' },
  { id: 'definir_boucles', label: 'Définir mes boucles', domain: 'cheveux', icon: '🌀', description: 'Crèmes et gels sculptants sans effet carton pour twist-outs et wash-and-go.' },
  { id: 'proteger_nuit', label: 'Protéger mes cheveux la nuit', domain: 'cheveux', icon: '🌙', description: 'Bonnets satin ajustables XL et taies d’oreiller 100% soie de mûrier.' },
  { id: 'prendre_soin_barbe', label: 'Soigner ma barbe / grooming', domain: 'cheveux', icon: '🧔🏻‍♂️', description: 'Baumes apaisants et huiles adoucissantes pour poils drus et peau sous-jacente.' },
];

const SKIN_NEEDS: NeedOption[] = [
  { id: 'hydrater_peau', label: 'Hydrater ma peau', domain: 'peau', icon: '💦', description: 'Sérums et crèmes légères pour restaurer la barrière cutanée.' },
  { id: 'peau_sensible', label: 'Soigner une peau sensible', domain: 'peau', icon: '🌸', description: 'Formules haute tolérance apaisantes et anti-rougeurs.' },
  { id: 'taches_hyperpigmentation', label: 'Réduire les taches (hyperpigmentation)', domain: 'peau', icon: '✨', description: 'Sérums ciblés à la niacinamide et acide tranexamique pour uniformiser le teint.' },
  { id: 'imperfections_acne', label: 'Traiter imperfections & acné', domain: 'peau', icon: '🍃', description: 'Actifs purifiants doux non asséchants pour peaux mélaninées.' },
  { id: 'poils_incarnes', label: 'Éviter les poils incarnés / boutons de rasage', domain: 'peau', icon: '🪒', description: 'Baumes anti-pseudofolliculite et exfoliants doux post-rasage.' },
  { id: 'protection_solaire', label: 'Protéger ma peau du soleil (SPF 50+)', domain: 'peau', icon: '☀️', description: 'Protecteurs solaires 100% invisibles zéro reflet gris sur peaux foncées.' },
  { id: 'soin_corps', label: 'Prendre soin de mon corps', domain: 'peau', icon: '🧴', description: 'Beurres et baumes corporels scellants pour peaux très sèches.' },
  { id: 'teinte_maquillage', label: 'Trouver sa nuance de maquillage', domain: 'peau', icon: '🎨', description: 'Nuanciers et soins préparateurs pour carnations mates à très foncées.' },
];

export const BoutiquePage: React.FC<BoutiquePageProps> = ({ onAddToCart, selectedCategory = 'tous' }) => {
  const { products, brands: supabaseBrands, source, count, loading, error, refetch } = useProducts();
  const { profile } = useAuth();
  const hasKurlaProfile = Boolean(profile && (profile.hair_type || profile.skin_type || profile.concerns?.length));

  const isProductCompatible = (product: Product): boolean => {
    if (!hasKurlaProfile) return false;
    const profileConcerns = profile?.concerns || [];
    if (profileConcerns.length > 0 && product.needs?.some(need => profileConcerns.includes(need))) {
      return true;
    }
    const isSkinProduct = product.category === 'peau';
    return isSkinProduct ? Boolean(profile?.skin_type) : Boolean(profile?.hair_type || profile?.texture);
  };

  const [activeCategory, setActiveCategory] = useState<string>(selectedCategory);
  const [activeSubCategory, setActiveSubCategory] = useState<string>('tous');
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [needsDomainTab, setNeedsDomainTab] = useState<'cheveux' | 'peau'>('cheveux');
  const [selectedBrand, setSelectedBrand] = useState<string>('tous');
  const [onlyAfroCommunity, setOnlyAfroCommunity] = useState<boolean>(false);
  const [onlyCompatible, setOnlyCompatible] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'fit' | 'price-asc' | 'price-desc' | 'rating'>('fit');

  const mainCategories = [
    { id: 'tous', name: 'Tous les soins', badge: null },
    { id: 'besoins', name: '🎯 Trouver par besoin', badge: 'Recommandé' },
    { id: 'cheveux', name: 'Cheveux & Boucles', badge: null },
    { id: 'peau', name: 'Visage & Peau', badge: null },
    { id: 'accessoires', name: 'Accessoires & Outils', badge: null },
    { id: 'kits', name: 'Kits & Routines', badge: 'Offres' },
    { id: 'hommes', name: 'Hommes Grooming', badge: null },
    { id: 'enfants', name: 'Kids Haircare', badge: null },
    { id: 'nouveautes', name: '✨ Nouveautés', badge: 'New' },
    { id: 'promotions', name: '🏷️ Promotions', badge: 'Solde' },
  ];

  const subCategoriesMap: Record<string, { id: string; name: string }[]> = {
    cheveux: [
      { id: 'tous', name: 'Toutes les catégories' },
      { id: 'hydratation', name: 'Crèmes & Leave-in' },
      { id: 'cuir_chevelu', name: 'Nettoyage & Cuir chevelu' },
      { id: 'casse', name: 'Masques & Réparation' },
      { id: 'tresses', name: 'Protective Styles & Braids' },
      { id: 'definition', name: 'Coiffage & Définition' },
    ],
    peau: [
      { id: 'tous', name: 'Tous les soins visage' },
      { id: 'protection_solaire', name: 'Protection Solaire Invisible' },
      { id: 'taches', name: 'Anti-Taches & Hyperpigmentation' },
    ],
    accessoires: [
      { id: 'tous', name: 'Tous les accessoires' },
      { id: 'bonnets_foulards', name: 'Bonnets Satin' },
      { id: 'taies_oreiller', name: 'Taies d’Oreiller Soie' },
      { id: 'peignes_brosses', name: 'Brosses & Démêlants' },
    ],
    hommes: [
      { id: 'tous', name: 'Tout le grooming' },
      { id: 'rasage', name: 'Rasage & Anti-Boutons' },
    ]
  };

  const availableBrands = useMemo(() => {
    if (supabaseBrands && supabaseBrands.length > 0) {
      return supabaseBrands.map(b => b.name);
    }
    const brandSet = new Set<string>();
    products.forEach(p => brandSet.add(p.brand));
    return Array.from(brandSet);
  }, [products, supabaseBrands]);

  // Filter Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Main Category Filter
      if (activeCategory === 'cheveux' && p.category !== 'cheveux') return false;
      if (activeCategory === 'peau' && p.category !== 'peau') return false;
      if (activeCategory === 'accessoires' && p.category !== 'accessoires') return false;
      if (activeCategory === 'hommes' && p.category !== 'hommes') return false;
      if (activeCategory === 'enfants' && p.category !== 'enfants') return false;
      if (activeCategory === 'kits' && p.category !== 'kits' && !p.subCategory?.toLowerCase().includes('kit')) return false;
      if (activeCategory === 'nouveautes' && !p.isNew) return false;
      if (activeCategory === 'promotions' && !p.isPromo && !p.originalPrice) return false;

      // Subcategory Tag Filter
      if (activeSubCategory !== 'tous' && (p as any).subCategoryTag !== activeSubCategory) return false;

      // Need Filter
      if (selectedNeedId && (!p.needs || !p.needs.includes(selectedNeedId))) return false;

      // Brand Filter
      if (selectedBrand !== 'tous' && p.brand !== selectedBrand) return false;

      // Afro Community Brand Filter
      if (onlyAfroCommunity && !p.communityBrand) return false;

      // KURLA ID compatibility is only shown when it can be derived from a
      // real profile. Never label every item with an invented score.
      if (onlyCompatible && !isProductCompatible(p)) return false;

      // Country Filter
      if (selectedCountry !== 'tous' && p.countryAvailability && !p.countryAvailability.includes(selectedCountry)) return false;

      // Search Query Filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesBrand = p.brand.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesIngredient = p.keyIngredients?.some(i => i.toLowerCase().includes(q));
        if (!matchesName && !matchesBrand && !matchesDesc && !matchesIngredient) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // default KURLA fit order
    });
  }, [
    products, activeCategory, activeSubCategory, selectedNeedId, selectedBrand, 
    onlyAfroCommunity, onlyCompatible, selectedCountry, searchQuery, sortBy,
    profile, hasKurlaProfile
  ]);

  const activeNeedObj = useMemo(() => {
    if (!selectedNeedId) return null;
    return [...HAIR_NEEDS, ...SKIN_NEEDS].find(n => n.id === selectedNeedId) || null;
  }, [selectedNeedId]);

  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#FFFDF9] text-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Audit Header Banner */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-bold uppercase tracking-widest mb-3 border border-[#C8753D]/20">
            <Sparkles className="w-3.5 h-3.5" /> Catalogue Supabase KURLA
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111] mb-4 tracking-tight">
            La Boutique Conseillère d'Achat.
          </h1>
          <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed max-w-2xl mx-auto">
            Trouvez des soins fiables pour vos cheveux texturés et peaux riches en mélanine. 
            Filtrage scientifique par besoin, composition INCI sans résidus et compatibilité avec votre profil.
          </p>

          {/* Data source is transparent during beta and never exposes an
              internal database name as a consumer-facing quality claim. */}
          <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border shadow-xs ${
            source === 'fallback'
              ? 'bg-amber-50 text-amber-900 border-amber-200/80'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
          }`}>
            <Database className={`w-4 h-4 ${source === 'fallback' ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span>
              {source === 'fallback'
                ? <>Mode démonstration — <strong>{count} produit(s) illustratif(s)</strong>. Le paiement réel est indisponible.</>
                : <>Catalogue KURLA disponible — <strong className="text-emerald-700">{count} produit(s)</strong></>}
            </span>
          </div>
        </div>

        {/* SECTION 1: QUE RECHERCHEZ-VOUS ? / TROUVER PAR BESOIN */}
        <div id="trouver-par-besoin" className="mb-12 bg-gradient-to-br from-[#F8F2EC] via-[#FFFDF9] to-[#F3EBE3] p-6 sm:p-8 rounded-3xl border border-[#E8E1DA] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-[#C8753D] block mb-1">
                Espace Guidance Intuitive
              </span>
              <h2 className="text-2xl font-serif-title font-bold text-[#111111] flex items-center gap-2">
                Que recherchez-vous ?
              </h2>
              <p className="text-xs text-[#111111]/70 font-light mt-1">
                Cliquez sur votre objectif prioritaire pour afficher directement les produits conseillés.
              </p>
            </div>

            {/* Need Domain Switcher */}
            <div className="flex items-center bg-[#FFFDF9] p-1 rounded-2xl border border-[#E8E1DA] shrink-0">
              <button
                onClick={() => setNeedsDomainTab('cheveux')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  needsDomainTab === 'cheveux'
                    ? 'bg-[#C8753D] text-white shadow-xs'
                    : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                <span>💇🏽‍♀️ Pour les Cheveux</span>
              </button>
              <button
                onClick={() => setNeedsDomainTab('peau')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  needsDomainTab === 'peau'
                    ? 'bg-[#C8753D] text-white shadow-xs'
                    : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                <span>✨ Pour la Peau</span>
              </button>
            </div>
          </div>

          {/* Need Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(needsDomainTab === 'cheveux' ? HAIR_NEEDS : SKIN_NEEDS).map(need => {
              const isSelected = selectedNeedId === need.id;
              return (
                <button
                  key={need.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedNeedId(null);
                    } else {
                      setSelectedNeedId(need.id);
                      setActiveCategory('besoins');
                    }
                  }}
                  className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between group relative ${
                    isSelected
                      ? 'bg-[#111111] border-[#111111] text-white shadow-md'
                      : 'bg-[#FFFDF9] border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] hover:bg-[#FFF]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{need.icon}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#C8753D]" />
                    )}
                  </div>
                  <span className={`text-xs font-bold leading-tight block ${isSelected ? 'text-white' : 'text-[#111111]'}`}>
                    {need.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Need Explanation Banner */}
          {activeNeedObj && (
            <div className="mt-6 p-4 rounded-2xl bg-[#111111] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C8753D] flex items-center justify-center text-xl shrink-0">
                  {activeNeedObj.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold text-[#D49A63] tracking-wider">Besoin actif :</span>
                    <h3 className="text-sm font-bold text-white">{activeNeedObj.label}</h3>
                  </div>
                  <p className="text-xs text-white/80 font-light mt-0.5">
                    {activeNeedObj.description} — <strong className="text-[#D49A63]">{filteredProducts.length} produit(s) sélectionné(s)</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedNeedId(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" /> Effacer ce besoin
              </button>
            </div>
          )}
        </div>

        {/* MAIN CATEGORIES NAVIGATION BAR */}
        <div className="bg-[#F8F2EC] p-4 sm:p-6 rounded-3xl border border-[#E8E1DA] mb-8 shadow-xs space-y-4">
          
          {/* Top Row: Categories Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {mainCategories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setActiveSubCategory('tous');
                    if (cat.id !== 'besoins') setSelectedNeedId(null);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#C8753D] text-white shadow-sm'
                      : 'bg-[#FFFDF9] text-[#111111] hover:bg-[#E8E1DA] border border-[#E8E1DA]'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-[#C8753D]' : 'bg-[#C8753D]/15 text-[#C8753D]'
                    }`}>
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subcategory Pills Row (if present for category) */}
          {subCategoriesMap[activeCategory] && (
            <div className="pt-3 border-t border-[#E8E1DA] flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
              <span className="font-bold text-[#111111] shrink-0 text-xs">Sous-catégories :</span>
              {subCategoriesMap[activeCategory].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubCategory(sub.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                    activeSubCategory === sub.id
                      ? 'bg-[#111111] text-white font-bold'
                      : 'bg-[#FFFDF9] text-[#111111]/80 hover:bg-[#E8E1DA] border border-[#E8E1DA]'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}

          {/* Filters Bar: Search, Brand, Afro Community, Country & Diagnostic */}
          <div className="pt-3 border-t border-[#E8E1DA] grid grid-cols-1 md:grid-cols-4 gap-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111]/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher produit, actif (Niacinamide, Mangue)..."
                className="w-full pl-9 pr-3 py-2 bg-[#FFFDF9] border border-[#E8E1DA] rounded-xl text-xs focus:outline-none focus:border-[#C8753D]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#111111]/40 hover:text-[#111111]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Brand Filter */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-2 bg-[#FFFDF9] border border-[#E8E1DA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#C8753D]"
            >
              <option value="tous">Toutes les marques ({availableBrands.length})</option>
              {availableBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Country Availability Filter */}
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-3 py-2 bg-[#FFFDF9] border border-[#E8E1DA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#C8753D]"
            >
              <option value="tous">🌍 Livraison : Tous pays</option>
              <option value="FR">🇫🇷 France Métropolitaine</option>
              <option value="BE">🇧🇪 Belgique & UE</option>
              <option value="DOM">🌴 DOM-TOM (Guadeloupe, Martinique, Guyane, Réunion...)</option>
              <option value="AFR">🇸🇳 Afrique (Sénégal, Côte d'Ivoire, Cameroun...)</option>
              <option value="INT">🌎 International</option>
            </select>

            {/* Sort By Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-[#FFFDF9] border border-[#E8E1DA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#C8753D]"
            >
              <option value="fit">✨ Tri : Sélection KURLA</option>
              <option value="rating">⭐ Meilleurs avis</option>
              <option value="price-asc">€ Prix croissant</option>
              <option value="price-desc">€ Prix décroissant</option>
            </select>
          </div>

          {/* Afro Community Brand & KURLA ID Toggles */}
          <div className="pt-3 border-t border-[#E8E1DA] flex items-center justify-between flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyAfroCommunity}
                  onChange={(e) => setOnlyAfroCommunity(e.target.checked)}
                  className="rounded text-[#C8753D] focus:ring-[#C8753D] w-4 h-4"
                />
                <span className="font-semibold text-[#111111]">
                  🏿 Créateurs & Marques Afro-descendantes uniquement
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyCompatible}
                  onChange={(e) => setOnlyCompatible(e.target.checked)}
                  className="rounded text-[#C8753D] focus:ring-[#C8753D] w-4 h-4"
                />
                <span className="font-semibold text-[#111111] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> Compatible avec mon KURLA ID
                </span>
              </label>
            </div>
            {onlyCompatible && !hasKurlaProfile && (
              <p className="w-full text-[11px] text-[#9a5b2d]">
                Complète ton KURLA ID pour activer une compatibilité personnalisée.
              </p>
            )}

            {/* Active Filters Summary Reset */}
            {(selectedNeedId || selectedBrand !== 'tous' || onlyAfroCommunity || onlyCompatible || selectedCountry !== 'tous' || searchQuery || activeSubCategory !== 'tous') && (
              <button
                onClick={() => {
                  setSelectedNeedId(null);
                  setSelectedBrand('tous');
                  setOnlyAfroCommunity(false);
                  setSelectedCountry('tous');
                  setSearchQuery('');
                  setOnlyCompatible(false);
                  setActiveSubCategory('tous');
                }}
                className="text-[#C8753D] hover:underline text-xs font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Réinitialiser tous les filtres
              </button>
            )}
          </div>
        </div>

        {/* RESULTS COUNT & HEADER */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-[#111111]/70 font-medium">
            Affichage de <strong className="text-[#111111]">{filteredProducts.length}</strong> soin(s) certifié(s)
          </p>
        </div>

        {/* KITS & ROUTINES BUNDLES CAROUSEL (If viewing Kits category or no specific search) */}
        {(activeCategory === 'kits' || activeCategory === 'tous') && !selectedNeedId && searchQuery === '' && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-[#C8753D] uppercase tracking-wider block">Économies & Efficacité Synergique</span>
                <h2 className="text-xl font-serif-title font-bold text-[#111111]">Kits & Routines Complètes 3-4 Étapes</h2>
              </div>
              <a href="/routines" className="text-xs font-bold text-[#C8753D] hover:underline flex items-center gap-1">
                Voir toutes les routines <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MOCK_ROUTINES.map(routine => (
                <div key={routine.id} className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-5 flex flex-col sm:flex-row gap-5 hover:border-[#C8753D] transition-all group">
                  <div className="w-full sm:w-44 h-44 rounded-2xl overflow-hidden shrink-0 bg-white">
                    <img src={routine.image} alt={routine.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex flex-col justify-between flex-1">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#C8753D] text-white text-[10px] font-bold">
                        {routine.badge}
                      </span>
                      <h3 className="text-base font-serif-title font-bold text-[#111111] mt-2">{routine.title}</h3>
                      <p className="text-xs text-[#111111]/70 font-light mt-1 line-clamp-2">{routine.subtitle}</p>
                    </div>

                    <div className="pt-3 border-t border-[#E8E1DA] flex items-center justify-between mt-3">
                      <div>
                        <span className="text-lg font-bold text-[#111111]">{routine.price.toFixed(2)} €</span>
                        {routine.originalPrice && (
                          <span className="text-xs text-[#111111]/40 line-through block">{routine.originalPrice.toFixed(2)} €</span>
                        )}
                      </div>
                      <a
                        href={`/routines/${routine.slug}`}
                        className="px-4 py-2 rounded-full bg-[#111111] hover:bg-[#C8753D] text-white text-xs font-semibold transition-colors"
                      >
                        Découvrir la routine
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS GRID STATE HANDLING */}
        {loading ? (
          <div className="text-center py-24 bg-[#F8F2EC] rounded-3xl border border-[#E8E1DA] p-8">
            <Loader2 className="w-10 h-10 text-[#C8753D] mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-serif-title font-bold text-[#111111] mb-2">Chargement du catalogue Supabase...</h3>
            <p className="text-xs text-[#111111]/70 max-w-md mx-auto">
              Connexion en cours à la table public.products et ses tables associées.
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-red-50 rounded-3xl border border-red-200 p-8">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-serif-title font-bold text-red-900 mb-2">Erreur de connexion Supabase</h3>
            <p className="text-xs text-red-700 max-w-md mx-auto mb-6">
              {error.message || "Impossible de récupérer les produits depuis Supabase."}
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-full bg-red-600 text-white text-xs font-semibold shadow-xs hover:bg-red-700 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Réessayer la connexion
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-[#F8F2EC] rounded-3xl border border-[#E8E1DA] p-8">
            <Filter className="w-10 h-10 text-[#C8753D] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-serif-title font-bold text-[#111111] mb-2">Aucun produit trouvé</h3>
            <p className="text-xs text-[#111111]/70 max-w-md mx-auto mb-6">
              Aucun produit ne correspond à vos filtres actuels dans la base Supabase.
            </p>
            <button
              onClick={() => {
                setSelectedNeedId(null);
                setSelectedBrand('tous');
                setOnlyAfroCommunity(false);
                setSelectedCountry('tous');
                setSearchQuery('');
                setOnlyCompatible(false);
                setActiveCategory('tous');
                setActiveSubCategory('tous');
              }}
              className="px-5 py-2.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold shadow-xs hover:bg-[#b06330]"
            >
              Voir tout le catalogue ({count} produits)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const compatibleWithProfile = hasKurlaProfile && isProductCompatible(product);

              return (
                <div
                  key={product.id}
                  className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md group relative"
                >
                  <div>
                    <div className="relative h-56 rounded-2xl overflow-hidden mb-4 bg-[#F8F2EC]">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      
                      {/* Compatibility is displayed only when it is derived from
                          the signed-in user's profile. */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#111111]/85 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
                        <Award className="w-3 h-3 text-[#D49A63]" />
                        {compatibleWithProfile ? 'Compatible avec ton profil' : 'Sélection KURLA'}
                      </div>

                      {/* Community Badge */}
                      {product.communityBrand && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-900/80 backdrop-blur-md text-amber-200 text-[9px] font-bold border border-amber-500/30">
                          Afro-Founded
                        </div>
                      )}

                      {/* Promo or Custom Badge */}
                      {product.badges[0] && (
                        <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-[#C8753D] text-white text-[10px] font-semibold">
                          {product.badges[0]}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#C8753D] font-bold">
                        {product.brand}
                      </span>
                      {product.countryAvailability && (
                        <span className="text-[10px] text-[#111111]/50 font-medium">
                          🇫🇷 🇧🇪 🌴 🇸🇳 Available
                        </span>
                      )}
                    </div>

                    <a href={`/produit/${product.slug}`} className="hover:underline">
                      <h3 className="text-base font-serif-title font-bold text-[#111111] mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                    </a>

                    <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-2">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-[#111111]">{product.rating}</span>
                      <span className="text-[#111111]/40">({product.reviewsCount})</span>
                    </div>

                    <p className="text-xs text-[#111111]/70 font-light line-clamp-2 mb-3">
                      {product.description}
                    </p>

                    {/* Key Ingredients tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {product.keyIngredients.slice(0, 2).map((ing, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-md bg-[#F8F2EC] text-[#111111]/80 font-medium border border-[#E8E1DA]">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E8E1DA] flex items-center justify-between gap-2">
                    <div>
                      <span className="text-lg font-bold text-[#111111]">{product.price.toFixed(2)} €</span>
                      {product.originalPrice && (
                        <span className="text-xs text-[#111111]/40 line-through block">{product.originalPrice.toFixed(2)} €</span>
                      )}
                    </div>

                    <button
                      onClick={() => onAddToCart(product)}
                      className="px-4 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

