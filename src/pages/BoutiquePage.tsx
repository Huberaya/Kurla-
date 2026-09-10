import React, { useState, useMemo, useEffect } from 'react';
import { analytics } from '../lib/analytics';
import {
  Sparkles, ShoppingBag, Star, Filter, CheckCircle2, Award, X,
  ChevronRight, Globe, Tag, Droplets, Sun, Moon, Shield, Heart,
  Layers, Zap, Search, RefreshCw, ArrowRight, Loader2, AlertTriangle, Clock,
  Baby, UserCheck, Feather, Wind, Crown, Smile, Palette, Package, Scissors, BookOpen, Eye, FlaskConical, Info
} from 'lucide-react';
import { TOOL_BY_PRODUCT_SLUG } from '../lib/knowledge/tools';
import { Product } from '../types';
import { useProducts } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { readShopCategory, waitlistSourceForCategory } from '../lib/shopCategories';
import { CategoryWaitlist } from '../components/CategoryWaitlist';
import { DISPATCH_LEGAL, DISPATCH_SENTENCE, DISPATCH_SHORT, TOOL_DISPATCH_SHORT, isDropshipProduct } from '../lib/preorderPromise';
import { getNextBatchShortLabel } from '../lib/fulfillment';
import { BOUTIQUE_NEED_ALIAS } from '../lib/productNeedsCorrection';
import { SKIN_ACTIVE_FILTERS, SKIN_PHOTOTYPE_FILTERS, SKIN_TEXTURE_FILTERS, SKIN_FINISH_FILTERS, SKIN_SENSITIVITY_FILTERS } from '../lib/skinTaxonomy';
import { SKIN_BUDGET_CAPS, scoreSkinProduct } from '../lib/skinRecommendation';
import { PEAU_KITS } from '../lib/peauKits';
import { getCountryConfig, getStripeModeForCountry, COUNTRY_SCORES_SORTED } from '../lib/countryFulfillment';

interface BoutiquePageProps {
  onAddToCart: (product: Product) => void;
  selectedCategory?: string;
}

// Definition of Hair and Skin Needs
interface NeedOption {
  id: string;
  label: string;
  domain: 'cheveux' | 'peau';
  icon: React.ElementType;
  description: string;
}

const HAIR_NEEDS: NeedOption[] = [
  { id: 'hydrater_cheveux', label: 'Hydrater mes cheveux', domain: 'cheveux', icon: Droplets, description: 'Soins riches en eau et leave-in pour stopper la sécheresse.' },
  { id: 'reduire_casse', label: 'Réduire la casse', domain: 'cheveux', icon: Feather, description: 'Soins fortifiants et masques protéinés pour consolider la fibre.' },
  { id: 'demeler_cheveux', label: 'Démêler mes cheveux', domain: 'cheveux', icon: Scissors, description: 'Brosses et peignes anti-traction, gestes doux sans casse.' },
  { id: 'cuir_chevelu', label: 'Prendre soin du cuir chevelu', domain: 'cheveux', icon: Sparkles, description: 'Clarifier, masser et apaiser démangeaisons et pellicules.' },
  { id: 'entretenir_tresses', label: 'Entretenir tresses / knotless', domain: 'cheveux', icon: Layers, description: 'Rafraîchir et hydrater la racine sous les coiffures protectrices.' },
  { id: 'entretenir_locks', label: 'Entretenir mes locks', domain: 'cheveux', icon: Shield, description: 'Laver sans résidu, hydrater la racine et resserrer en douceur.' },
  { id: 'entretenir_perruque', label: 'Entretenir perruque / wig', domain: 'cheveux', icon: Crown, description: 'Accessoires de maintien et protection satin pour préserver la fibre.' },
  { id: 'definir_boucles', label: 'Définir mes boucles', domain: 'cheveux', icon: Wind, description: 'Crèmes et gels sans effet carton pour twist-outs et wash-and-go.' },
  { id: 'proteger_nuit', label: 'Protéger mes cheveux la nuit', domain: 'cheveux', icon: Moon, description: 'Bonnets et taies satin pour garder l’hydratation et la définition.' },
  { id: 'prendre_soin_barbe', label: 'Barbe / grooming homme', domain: 'cheveux', icon: UserCheck, description: 'Outils et soins pour barbe, cheveux courts et waves.' },
];

const SKIN_NEEDS: NeedOption[] = [
  { id: 'hydrater', label: 'Hydrater', domain: 'peau', icon: Droplets, description: 'Repulper, confort · même peau grasse peut être déshydratée.' },
  { id: 'eclat', label: 'Éclat', domain: 'peau', icon: Sparkles, description: 'Teint lumineux, sans effet gras.' },
  { id: 'taches', label: 'Taches & teint', domain: 'peau', icon: Sun, description: 'HPI, taches post-acné — uniformiser, jamais éclaircir.' },
  { id: 'seche', label: 'Peau sèche', domain: 'peau', icon: Heart, description: 'Nourrir, apaiser tiraillements.' },
  { id: 'grasse', label: 'Peau grasse', domain: 'peau', icon: Wind, description: 'Matifier, réguler sans assécher.' },
  { id: 'imperfections', label: 'Imperfections', domain: 'peau', icon: Smile, description: 'Boutons, pores — doux pour peaux mélaninées.' },
  { id: 'sensible', label: 'Peau sensible', domain: 'peau', icon: Shield, description: 'Apaiser, haute tolérance.' },
  { id: 'spf', label: 'Protection solaire', domain: 'peau', icon: Sun, description: 'SPF 50+ sans trace blanche (white cast).' },
  { id: 'anti_age', label: 'Anti-âge', domain: 'peau', icon: Clock, description: 'Prévenir, raffermir.' },
  { id: 'contour_yeux', label: 'Contour des yeux', domain: 'peau', icon: Eye, description: 'Cernes, poches.' },
  { id: 'levres', label: 'Lèvres', domain: 'peau', icon: Heart, description: 'Hydrater, réparer.' },
  { id: 'corps', label: 'Corps', domain: 'peau', icon: Package, description: 'Hydratation, texture.' },
  { id: 'cicatrices', label: 'Cicatrices', domain: 'peau', icon: Layers, description: 'Atténuer, lisser.' },
  { id: 'barriere', label: 'Barrière cutanée', domain: 'peau', icon: Shield, description: 'Réparer, renforcer.' },
  { id: 'ingredient', label: 'Par ingrédient', domain: 'peau', icon: FlaskConical, description: 'Niacinamide, rétinol, AHA/BHA, vitamine C.' },
];

// Catégories dont les produits arrivent plus tard : on oriente vers l'espace
// dédié (conseils/diagnostic) plutôt que d'afficher une grille vide trompeuse.
const EMPTY_CATEGORY_HUB: Record<string, { icon: React.ElementType; title: string; text: string; href: string; cta: string; waitlistLabel: string }> = {
  peau: {
    icon: Sun,
    title: 'La gamme peau s’étoffe',
    waitlistLabel: 'soins visage',
    text: '15 besoins peau, filtre budget et SPF sans trace blanche sont prêts. La gamme s’enrichit chaque semaine — en attendant, votre diagnostic peau reste gratuit et vos filtres peau sont mémorisés.',
    href: '/peau',
    cta: 'Explorer le pôle peau',
  },
  hommes: {
    icon: UserCheck,
    title: 'L’espace hommes vous attend',
    waitlistLabel: 'produits grooming',
    text: 'Éponge curl sponge, durag satin, mousse twist, entretien locks et barbe : retrouvez les outils et conseils dédiés au grooming masculin.',
    href: '/hommes',
    cta: 'Découvrir l’espace hommes',
  },
  enfants: {
    icon: Baby,
    title: 'L’espace kids arrive en boutique',
    waitlistLabel: 'produits kids',
    text: 'Le diagnostic enfant et les conseils de coiffage sans larmes sont déjà disponibles. Les soins et accessoires kids (dès 3 ans) arrivent en précommande.',
    href: '/kids',
    cta: 'Découvrir l’espace kids',
  },
};

export const BoutiquePage: React.FC<BoutiquePageProps> = ({ onAddToCart, selectedCategory = 'tous' }) => {
  const { products, brands: supabaseBrands, count, loading, error, refetch } = useProducts();
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

  // Sélection d'onglet depuis l'URL (?cat=kits, accessoires, peau, hommes, enfants…).
  //
  // La lecture passe par `readShopCategory` : une valeur inconnue est ramenée à
  // « tous » au lieu d'afficher un rayon vide sans explication, et l'alias
  // `?category=` reste accepté pour les liens déjà partagés — mais plus aucun
  // lien interne ne l'emploie (verrouillé par le banc `kurla_shop_categories`).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cat = readShopCategory(sp);
    setActiveCategory(cat);
    if (cat === 'peau') setNeedsDomainTab('peau');
    // double entrée : /boutique?cat=peau&need=taches  +  /boutique?cat=peau&q=niacinamide
    const need = sp.get('need') || sp.get('besoin') || sp.get('q_need');
    if (need) {
      let normalized = need.toLowerCase().trim();
      // C8 alias : supporte anciennes URLs protection_solaire/par_ingredient et hydrater_peau → hydrater
      const ALIAS: Record<string,string> = { protection_solaire: 'spf', par_ingredient: 'ingredient', hydrater_peau: 'hydrater' };
      normalized = ALIAS[normalized] || normalized;
      const allIds = [...HAIR_NEEDS, ...SKIN_NEEDS].map(n => n.id);
      const found = allIds.find(id => id === normalized || normalized.includes(id) || id.includes(normalized));
      if (found) { setSelectedNeedId(found); setNeedsDomainTab(SKIN_NEEDS.some(n => n.id === found) ? 'peau' : 'cheveux'); }
    }
    const q = sp.get('q');
    if (q) setSearchQuery(q);
    const budget = sp.get('budget');
    if (budget) setSkinBudget(budget);
    const spf = sp.get('spf');
    if (spf === 'invisible') setSkinSansTrace(true);
    // C2 — 5 filtres peau depuis URL (?actif=niacinamide&phototype=V&texture=gel&fini=mat&sensibilite=sensible)
    const actif = sp.get('actif') || sp.get('active') || sp.get('ingredient');
    if (actif && SKIN_ACTIVE_FILTERS.some(a=>a.value===actif)) setSkinActif(actif);
    const photo = sp.get('phototype');
    if (photo && SKIN_PHOTOTYPE_FILTERS.some(p=>p.value===photo)) setSkinPhototype(photo);
    const tex = sp.get('texture');
    if (tex && SKIN_TEXTURE_FILTERS.some(t=>t.value===tex)) setSkinTexture(tex);
    const fini = sp.get('fini') || sp.get('finish');
    if (fini && SKIN_FINISH_FILTERS.some(f=>f.value===fini)) setSkinFini(fini);
    const sens = sp.get('sensibilite') || sp.get('sensitivity');
    if (sens && SKIN_SENSITIVITY_FILTERS.some(s=>s.value===sens)) setSkinSensibilite(sens);
    if (sp.get('sansParfum')==='true' || sp.get('sans_parfum')==='true') setSkinSansParfum(true);
  }, []);
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [needsDomainTab, setNeedsDomainTab] = useState<'cheveux' | 'peau'>('cheveux');
  const [selectedBrand, setSelectedBrand] = useState<string>('tous');
  const [onlyAfroCommunity, setOnlyAfroCommunity] = useState<boolean>(false);
  const [onlyCompatible, setOnlyCompatible] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'fit' | 'price-asc' | 'price-desc' | 'rating'>('fit');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  // KURLA SKIN — filtres dédiés peau (page 4) + C2 5 filtres manquants
  const [skinSansParfum, setSkinSansParfum] = useState(false);
  const [skinSansTrace, setSkinSansTrace] = useState(false);
  const [skinBudget, setSkinBudget] = useState<string>('tous'); // moins_40 / 40_70 / 70_100 / premium
  const [skinActif, setSkinActif] = useState<string>('tous'); // C2: actif
  const [skinPhototype, setSkinPhototype] = useState<string>('tous'); // C2: I–VI
  const [skinTexture, setSkinTexture] = useState<string>('tous'); // C2: gel/lotion/creme/baume/huile
  const [skinFini, setSkinFini] = useState<string>('tous'); // C2: mat/naturel/glowy
  const [skinSensibilite, setSkinSensibilite] = useState<string>('tous'); // C2: sensible/tres_sensible
  const [guidedSkin, setGuidedSkin] = useState<any | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kurla_skin_answers') || sessionStorage.getItem('kurla_diagnostic_answers_skin');
      if (raw) setGuidedSkin(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // C2 peaufine — URL shareable : filtres peau → ?actif=&phototype=&texture=&fini=&sensibilite=&budget=&sansParfum=&spf=
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const hasPeauCtx = skinBudget !== 'tous' || skinActif !== 'tous' || skinPhototype !== 'tous' || skinTexture !== 'tous' || skinFini !== 'tous' || skinSensibilite !== 'tous' || skinSansParfum || skinSansTrace;
    if (!hasPeauCtx) return;
    const setOrDel = (k: string, v: string) => { if (v && v !== 'tous' && v !== 'false') sp.set(k, v); else sp.delete(k); };
    setOrDel('actif', skinActif);
    setOrDel('phototype', skinPhototype);
    setOrDel('texture', skinTexture);
    setOrDel('fini', skinFini);
    setOrDel('sensibilite', skinSensibilite);
    setOrDel('budget', skinBudget);
    if (skinSansParfum) sp.set('sansParfum', 'true'); else sp.delete('sansParfum');
    if (skinSansTrace) sp.set('spf', 'invisible'); else if (sp.get('spf') === 'invisible') sp.delete('spf');
    const next = window.location.pathname + (sp.toString() ? `?${sp.toString()}` : '');
    const curr = window.location.pathname + window.location.search;
    if (next !== curr) window.history.replaceState({}, '', next);
  }, [skinActif, skinPhototype, skinTexture, skinFini, skinSensibilite, skinBudget, skinSansParfum, skinSansTrace]);

  const mainCategories = [
    { id: 'tous', name: 'Tout le catalogue', icon: ShoppingBag, badge: null },
    { id: 'besoins', name: 'Trouver par besoin', icon: Sparkles, badge: 'Recommandé' },
    { id: 'cheveux', name: 'Cheveux & boucles', icon: Droplets, badge: null },
    { id: 'peau', name: 'Visage & peau', icon: Sun, badge: null },
    { id: 'accessoires', name: 'Outils & accessoires', icon: Package, badge: null },
    { id: 'kits', name: 'Kits & routines', icon: Layers, badge: 'Offres' },
    { id: 'hommes', name: 'Hommes', icon: UserCheck, badge: null },
    { id: 'enfants', name: 'Enfants', icon: Baby, badge: null },
    { id: 'nouveautes', name: 'Nouveautés', icon: Zap, badge: 'New' },
    { id: 'promotions', name: 'Promotions', icon: Tag, badge: 'Solde' },
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

      // Need Filter — CHANTIER 2 : utilise la correction + alias (demeler, barbe) pour que chaque besoin affiche VRAIMENT ses outils
      if (selectedNeedId) {
        const aliases = BOUTIQUE_NEED_ALIAS[selectedNeedId] || [selectedNeedId];
        const pNeeds = p.needs || [];
        // Peau : tolérance — si le catalogue n'a pas encore de needs peau, on ne bloque pas tout (affiche les peaux en fallback)
        const isSkinNeed = SKIN_NEEDS.some(n => n.id === selectedNeedId);
        if (isSkinNeed && (p.category !== 'peau' && pNeeds.length === 0)) {
          // pas de needs peau sur ce produit cheveux → ne pas exclure quand la catégorie est mixte, mais exclure si on est en vue peau stricte
          if (activeCategory === 'peau') return false;
        } else if (!aliases.some(a => pNeeds.includes(a))) return false;
      }

      // KURLA SKIN — filtres dédiés (budget, sans parfum, SPF invisible) + C2 5 filtres manquants
      const skinContextActive = activeCategory === 'peau' || needsDomainTab === 'peau' || Boolean(selectedNeedId && SKIN_NEEDS.some(n => n.id === selectedNeedId));
      if (skinContextActive) {
        if (skinSansParfum) {
          if ((p as any).containsFragrance) return false;
          if ((p.allergens || []).some(a => /parfum|fragrance/i.test(a))) return false;
          if (/parfum|fragrance/i.test(p.inci || '')) return false;
        }
        if (skinSansTrace) {
          const hay = `${p.name} ${p.description} ${(p.badges || []).join(' ')} ${(p.keyIngredients || []).join(' ')}`.toLowerCase();
          // On ne garde côté peau que les SPF si le filtre invisible est actif
          if (!/spf|solair|protection/i.test(hay)) return false;
          if (/minéral|mineral|titanium.*dioxide|zinc.*oxide/i.test(hay) && !/invisible|sans.*trace|organique|hybride|fluide.*invisible/i.test(hay)) return false;
        }
        if (skinBudget !== 'tous') {
          if (p.price > (SKIN_BUDGET_CAPS[skinBudget] ?? 9999)) return false;
        }
        // C2 — Actif
        if (skinActif !== 'tous') {
          const metaActifs = ((p as any).metadata?.actifs as string[] | undefined) || [];
          const hayActif = `${(p.keyIngredients||[]).join(' ')} ${p.inci||''} ${metaActifs.join(' ')}`.toLowerCase();
          const want = SKIN_ACTIVE_FILTERS.find(a=>a.value===skinActif);
          const inciLower = (want?.inci || want?.label || skinActif).toLowerCase();
          const needle = skinActif === 'niacinamide' ? 'niacinamide' : skinActif === 'acide_azelaic' ? 'azelaic' : skinActif === 'vitamine_c' ? 'ascorbic|vitamine c|vitamin c' : skinActif === 'retinol' ? 'retinol' : skinActif === 'aha' ? 'glycolic|lactic|aha' : skinActif === 'bha' ? 'salicylic|bha' : skinActif === 'ceramides' ? 'ceramide|céramide' : skinActif === 'squalane' ? 'squalane' : 'hyaluronic|hyaluron';
          const rx = new RegExp(needle, 'i');
          if (!rx.test(hayActif) && !rx.test(inciLower) && !metaActifs.some(a=> rx.test(a))) return false;
        }
        // C2 — Phototype (I–VI) — filtre sur metadata.phototype ; sans metadata = pass
        if (skinPhototype !== 'tous') {
          const metaPhoto = ((p as any).metadata?.phototype as string[] | undefined);
          if (metaPhoto && metaPhoto.length && !metaPhoto.includes(skinPhototype)) return false;
          // SPF invisible boost is scoring, not filtering — phototype VI + minéral pur visible will be déclassé en scoring, pas bloqué
        }
        // C2 — Texture (peaufine: lotion + huile ajoutés, fallback hay plus tolérant)
        if (skinTexture !== 'tous') {
          const metaTex = (p as any).metadata?.texture as string | undefined;
          if (metaTex && metaTex !== skinTexture) return false;
          if (!metaTex) {
            const hay = `${p.name} ${p.description}`.toLowerCase();
            if (skinTexture === 'gel' && !/gel/.test(hay)) return false;
            if (skinTexture === 'lotion' && !/lotion|fluide/.test(hay)) return false;
            if (skinTexture === 'creme' && !/crème|creme/.test(hay)) return false;
            if (skinTexture === 'baume' && !/baume/.test(hay)) return false;
            if (skinTexture === 'huile' && !/huile|sérum huileux|oil/.test(hay)) return false;
          }
        }
        // C2 — Fini
        if (skinFini !== 'tous') {
          const metaFini = (p as any).metadata?.finish as string | undefined;
          if (metaFini && metaFini !== skinFini) return false;
        }
        // C2 — Sensibilité : sensible / très sensible → exige sans parfum
        if (skinSensibilite !== 'tous') {
          const isSansParfum = !(p as any).containsFragrance && !(p.allergens||[]).some(a=>/parfum|fragrance/i.test(a)) && !/parfum|fragrance/i.test(p.inci||'');
          if (!isSansParfum) return false;
        }
      }

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
      // C2 peaufine — tri peau via scoreSkinProduct (incompat + whitecast + HPI + sansParfum)
      const isPeauContext = activeCategory === 'peau' || needsDomainTab === 'peau' || Boolean(selectedNeedId && SKIN_NEEDS.some(n => n.id === selectedNeedId));
      if (isPeauContext && sortBy === 'fit') {
        const cap = skinBudget !== 'tous' ? (SKIN_BUDGET_CAPS[skinBudget] ?? 9999) : undefined;
        const ctx = {
          activeFilters: {
            actif: skinActif !== 'tous' ? skinActif : undefined,
            phototype: skinPhototype !== 'tous' ? skinPhototype : undefined,
            texture: skinTexture !== 'tous' ? skinTexture : undefined,
            finish: skinFini !== 'tous' ? skinFini : undefined,
            sansParfum: skinSansParfum || skinSensibilite !== 'tous',
            spfInvisible: skinSansTrace,
            budgetMax: cap,
          },
          hyperpigmentationBoost: Boolean(guidedSkin?.hyperpigmentationTendency === 'frequente' || (guidedSkin?.skinConcerns||[]).some((c:string)=>/taches|hyperpigmentation|teint_terne/i.test(c))),
        } as any;
        const sa = scoreSkinProduct(a as any, ctx).score;
        const sb = scoreSkinProduct(b as any, ctx).score;
        if (sb !== sa) return sb - sa;
        // fallback phototype V–VI : SPF invisible d'abord (si scores égaux)
        const isSPFA = /spf|solair/i.test(`${a.name} ${a.description}`);
        const isSPFB = /spf|solair/i.test(`${b.name} ${b.description}`);
        if (skinPhototype === 'V' || skinPhototype === 'VI') {
          if (isSPFA && !isSPFB) return -1;
          if (!isSPFA && isSPFB) return 1;
        }
        return 0;
      }
      return 0; // default KURLA fit order
    });
  }, [
    products, activeCategory, activeSubCategory, selectedNeedId, selectedBrand, 
    onlyAfroCommunity, onlyCompatible, selectedCountry, searchQuery, sortBy,
    profile, hasKurlaProfile, skinSansParfum, skinSansTrace, skinBudget,
    skinActif, skinPhototype, skinTexture, skinFini, skinSensibilite
  ]);

  // Mesure de la page catalogue : sans elle, on sait qu'une commande est
  // passée mais on ignore combien de visites il a fallu pour l'obtenir.
  useEffect(() => {
    try { analytics.viewItemList('boutique', filteredProducts.length); } catch { /* noop */ }
    // volontairement non dépendant des filtres : on compte la visite, pas
    // chaque réaffichage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) return;
    const timer = window.setTimeout(() => {
      fetch('/api/search-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, country: selectedCountry === 'tous' ? undefined : selectedCountry })
      }).catch(() => {
        // Search telemetry is best effort and must never block the catalog.
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [searchQuery, selectedCountry]);

  const activeNeedObj = useMemo(() => {
    if (!selectedNeedId) return null;
    return [...HAIR_NEEDS, ...SKIN_NEEDS].find(n => n.id === selectedNeedId) || null;
  }, [selectedNeedId]);

  const comparedProducts = useMemo(() => compareIds.map(id => products.find(product => product.id === id)).filter((product): product is Product => Boolean(product)), [compareIds, products]);
  const toggleCompare = (productId: string) => {
    setCompareIds(current => current.includes(productId) ? current.filter(id => id !== productId) : current.length < 3 ? [...current, productId] : current);
  };

  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#FFFDF9] text-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête boutique — bi-pôle Cheveux | Peau */}
        <div className="text-center max-w-3xl mx-auto mb-6">
          <div className="inline-flex items-center bg-[#F8F2EC] p-1 rounded-full border border-[#E8E1DA] mb-4">
            <button onClick={() => { setActiveCategory('cheveux'); setNeedsDomainTab('cheveux'); window.history.replaceState({}, '', '/boutique?cat=cheveux'); }} className={`px-5 py-1.5 rounded-full text-xs font-bold ${activeCategory === 'cheveux' ? 'bg-[#111111] text-white' : 'text-[#111111]/70 hover:text-[#111111]'}`}>Cheveux</button>
            <button onClick={() => { setActiveCategory('peau'); setNeedsDomainTab('peau'); window.history.replaceState({}, '', '/boutique?cat=peau'); }} className={`px-5 py-1.5 rounded-full text-xs font-bold ${activeCategory === 'peau' ? 'bg-[#111111] text-white' : 'text-[#111111]/70 hover:text-[#111111]'}`}>Peau</button>
          </div>
          {activeCategory === 'peau' ? (
            <>
              <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111] mb-3 tracking-tight">
                La boutique peau — filtrée pour votre carnation
              </h1>
              <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed max-w-2xl mx-auto">
                15 besoins peau, filtre budget, <strong className="font-semibold text-[#111111]">sans parfum</strong> et <strong className="font-semibold text-[#111111]">SPF sans trace blanche</strong>. Taches = HPI, jamais “éclaircir”.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                <a href="/peau/diagnostic" className="px-4 py-2 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-bold">Passer le diagnostic peau →</a>
                {guidedSkin && <span className="px-3 py-1.5 rounded-full bg-[#F8F2EC] border border-[#E8E1DA] text-[#111111]/70">Votre profil : {guidedSkin.skinType || 'mixte'} · {guidedSkin.toneDepth || ''} · budget {guidedSkin.budget || ''}</span>}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111] mb-3 tracking-tight">
                La boutique des cheveux texturés.
              </h1>
              <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed max-w-2xl mx-auto">
                Soins, outils et innovations pour les textures 3A à 4C — du peigne afro au steamer. Annulation et remboursement à tout moment avant expédition.
              </p>
            </>
          )}
        </div>

        {/* C8 — Double entrée peau : directe (15 besoins + 5 filtres) vs guidée (diagnostic 2 min → filtres) */}
        {activeCategory === 'peau' && (
          <div className="mb-6 p-4 rounded-2xl bg-white border border-[#E8E1DA] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <p className="text-xs font-bold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> Double entrée — à vous de choisir</p>
              <p className="text-xs text-[#111111]/60 leading-relaxed">Directe : 15 besoins, 5 filtres (actif/phototype/texture/fini/sensibilité) + budget/sans parfum/SPF. Guidée : diagnostic 2 min → filtres pré-remplis + routine chiffrée (40/62/84€).</p>
              <p className="text-[11px] text-[#111111]/50 mt-1">Hybride possible : lancez le diagnostic, puis affinez avec les filtres directs.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a href="#trouver-par-besoin" className="px-4 py-2 rounded-full bg-[#F8F2EC] border border-[#E8E1DA] text-xs font-bold hover:border-[#C8753D]">Filtres directs ↓</a>
              <a href="/peau/diagnostic?mode=express" className="px-4 py-2 rounded-full bg-[#111111] text-white text-xs font-bold">Guidée 2 min →</a>
            </div>
          </div>
        )}

        {/* C14 — Logistique pays + Stripe par pays (scoré, pas bloc) */}
        {activeCategory === 'peau' && (
          <div className="mb-6 p-3 rounded-2xl bg-[#111111] text-white flex flex-wrap gap-2 items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#D49A63]" /> Livraison & Stripe par pays</span>
            <span className="text-white/70 hidden sm:inline">{getCountryConfig(selectedCountry !== 'tous' ? selectedCountry : 'FR').dispatch} · {getStripeModeForCountry(selectedCountry !== 'tous' ? selectedCountry : 'FR') === 'live' ? 'Stripe LIVE' : 'Stripe TEST'}</span>
            <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 border border-white/15">FR 82 · BE 76 · SN 71 → BE J+30 / SN J+60 sur preuves</span>
            <a href="/peau" className="text-[#D49A63] font-bold hover:underline">Pôle peau →</a>
          </div>
        )}

        {/* Banner guidé peau : applique vos préférences diagnostic en 1 clic */}
        {activeCategory === 'peau' && guidedSkin && (guidedSkin.budget || (guidedSkin.sensitivities || []).includes('parfum')) && (
          <div className="mb-6 p-4 rounded-2xl bg-[#111111] text-white flex flex-col sm:flex-row gap-3 items-center justify-between">
            <p className="text-xs font-light">Basé sur votre diagnostic peau : budget <strong className="text-[#D49A63]">{guidedSkin.budget}</strong>{(guidedSkin.sensitivities || []).includes('parfum') ? ' · sans parfum' : ''} — appliquer ces filtres ?</p>
            <button onClick={() => { if (guidedSkin.budget) setSkinBudget(guidedSkin.budget); if ((guidedSkin.sensitivities || []).includes('parfum')) setSkinSansParfum(true); }} className="px-4 py-2 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold shrink-0">Appliquer mes préférences peau</button>
          </div>
        )}

        {/* Tous les outils en stock partenaire — 24–48h · 0 carton Paris */}
        <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Tous les outils en stock partenaire — 24–48h</p>
              <p className="text-sm font-semibold text-[#111111] leading-tight">Expédiés en 24–48h depuis notre partenaire UE — 0 carton à Paris</p>
              <p className="text-xs text-[#111111]/60 font-light mt-0.5">Peigne afro · bonnet satin · éponge twist · scalp massager · Denman · pinces croco · diffuseur · steamer · tous les accessoires. Panier mixte (outils + soins) = 1 seul colis, délai global 3–5j.</p>
            </div>
          </div>
          <a href="/boutique?cat=accessoires" onClick={(e)=>{e.preventDefault(); setActiveCategory('accessoires'); window.scrollTo({top: 0, behavior: 'smooth'});}} className="shrink-0 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5">
            Voir tous les outils <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* SECTION 1: QUE RECHERCHEZ-VOUS ? / TROUVER PAR BESOIN */}
        <div id="trouver-par-besoin" className="mb-12 bg-gradient-to-br from-[#F8F2EC] via-[#FFFDF9] to-[#F3EBE3] p-6 sm:p-8 rounded-3xl border border-[#E8E1DA] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-[#C8753D] block mb-1">
                Trouver par besoin
              </span>
              <h2 className="text-2xl font-serif-title font-bold text-[#111111] flex items-center gap-2">
                Que recherchez-vous ?
              </h2>
              <p className="text-xs text-[#111111]/70 font-light mt-1">
                Choisissez votre objectif pour voir les produits et outils conseillés.
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
                <span className="inline-flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5" /> Pour les cheveux</span>
              </button>
              <button
                onClick={() => setNeedsDomainTab('peau')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  needsDomainTab === 'peau'
                    ? 'bg-[#C8753D] text-white shadow-xs'
                    : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5"><Sun className="w-3.5 h-3.5" /> Pour la peau</span>
              </button>
            </div>
          </div>

          {/* Need Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(needsDomainTab === 'cheveux' ? HAIR_NEEDS : SKIN_NEEDS).map(need => {
              const isSelected = selectedNeedId === need.id;
              const NeedIcon = need.icon;
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
                  className={`p-4 rounded-2xl text-left border transition-all group relative h-full ${
                    isSelected
                      ? 'bg-[#111111] border-[#111111] text-white shadow-md'
                      : 'bg-[#FFFDF9] border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] hover:shadow-sm'
                  }`}
                >
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-[#D49A63] absolute top-3 right-3" />
                  )}
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                    isSelected ? 'bg-[#C8753D] text-white' : 'bg-[#C8753D]/10 text-[#C8753D] group-hover:bg-[#C8753D] group-hover:text-white'
                  }`}>
                    <NeedIcon className="w-5 h-5" />
                  </span>
                  <span className={`text-xs font-bold leading-snug block mb-1 ${isSelected ? 'text-white' : 'text-[#111111]'}`}>
                    {need.label}
                  </span>
                  <span className={`text-[11px] leading-snug block font-light ${isSelected ? 'text-white/70' : 'text-[#111111]/60'}`}>
                    {need.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Note soin visage : pas encore en boutique, diagnostic disponible */}
          {needsDomainTab === 'peau' && !activeNeedObj && (
            <div className="mt-6 p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-[#111111]/75 font-light leading-relaxed">
                <strong className="font-semibold text-[#111111]">Les soins visage arrivent bientôt.</strong> En attendant, le diagnostic peau vous donne gratuitement votre routine adaptée à votre carnation.
              </p>
              <a href="/diagnostic/peau" className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold">
                Faire le diagnostic peau <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Active Need Explanation Banner */}
          {activeNeedObj && (
            <div className="mt-6 p-4 rounded-2xl bg-[#111111] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C8753D] text-white flex items-center justify-center shrink-0">
                  {React.createElement(activeNeedObj.icon, { className: 'w-5 h-5' })}
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
                  {cat.icon && (() => { const CI = cat.icon; return <CI className="w-3.5 h-3.5" />; })()}
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
                placeholder="Rechercher un produit ou un outil (steamer, karité, peigne…)…"
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
              <option value="fit">Ordre du catalogue</option>
              <option value="rating">⭐ Meilleurs avis</option>
              <option value="price-asc">€ Prix croissant</option>
              <option value="price-desc">€ Prix décroissant</option>
            </select>
          </div>

          {/* KURLA SKIN — filtres peau C2 : 4 initiaux + 5 nouveaux (actif/phototype/texture/fini/sensibilité) */}
          {(activeCategory === 'peau' || needsDomainTab === 'peau') && (
            <div className="pt-3 border-t border-[#E8E1DA] space-y-3">
              {/* Ligne 1 : budget + sans parfum + SPF invisible */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-[#111111]">Filtres peau :</span>
                {[
                  { id: 'tous', label: 'Tous budgets' },
                  { id: 'moins_40', label: '≤14 €' },
                  { id: '40_70', label: '≤28 €' },
                  { id: '70_100', label: '≤45 €' },
                ].map(o => (
                  <button key={o.id} onClick={() => setSkinBudget(o.id)} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${skinBudget === o.id ? 'bg-[#111111] text-white border-[#111111]' : 'bg-[#FFFDF9] text-[#111111]/70 border-[#E8E1DA] hover:border-[#C8753D]'}`}>{o.label}</button>
                ))}
                <label className="flex items-center gap-1.5 ml-1 cursor-pointer select-none bg-[#FFFDF9] border border-[#E8E1DA] px-3 py-1.5 rounded-full">
                  <input type="checkbox" checked={skinSansParfum} onChange={e => setSkinSansParfum(e.target.checked)} className="rounded text-[#C8753D] w-3.5 h-3.5" />
                  <span className="font-semibold text-[#111111]">Sans parfum</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none bg-[#FFFDF9] border border-[#E8E1DA] px-3 py-1.5 rounded-full">
                  <input type="checkbox" checked={skinSansTrace} onChange={e => setSkinSansTrace(e.target.checked)} className="rounded text-[#C8753D] w-3.5 h-3.5" />
                  <span className="font-semibold text-[#111111]">SPF sans trace blanche</span>
                </label>
              </div>
              {/* Ligne 2 : C2 — 5 filtres manquants */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/60">Actif</span>
                  <select value={skinActif} onChange={e=> setSkinActif(e.target.value)} className="px-2.5 py-2 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium text-[#111111] focus:outline-none focus:border-[#C8753D]">
                    <option value="tous">Tous actifs</option>
                    {SKIN_ACTIVE_FILTERS.map(a=> <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/60">Phototype</span>
                  <select value={skinPhototype} onChange={e=> setSkinPhototype(e.target.value)} className="px-2.5 py-2 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium text-[#111111] focus:outline-none focus:border-[#C8753D]">
                    <option value="tous">Tous phototypes</option>
                    {SKIN_PHOTOTYPE_FILTERS.map(p=> <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/60">Texture</span>
                  <select value={skinTexture} onChange={e=> setSkinTexture(e.target.value)} className="px-2.5 py-2 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium text-[#111111] focus:outline-none focus:border-[#C8753D]">
                    <option value="tous">Toutes textures</option>
                    {SKIN_TEXTURE_FILTERS.map(t=> <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/60">Fini</span>
                  <select value={skinFini} onChange={e=> setSkinFini(e.target.value)} className="px-2.5 py-2 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium text-[#111111] focus:outline-none focus:border-[#C8753D]">
                    <option value="tous">Tous finis</option>
                    {SKIN_FINISH_FILTERS.map(f=> <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/60">Sensibilité</span>
                  <select value={skinSensibilite} onChange={e=> setSkinSensibilite(e.target.value)} className="px-2.5 py-2 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium text-[#111111] focus:outline-none focus:border-[#C8753D]">
                    <option value="tous">Toutes</option>
                    {SKIN_SENSITIVITY_FILTERS.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </div>
              {/* Ligne 3 : résumé + reset */}
              {(skinSansParfum || skinSansTrace || skinBudget !== 'tous' || skinActif !== 'tous' || skinPhototype !== 'tous' || skinTexture !== 'tous' || skinFini !== 'tous' || skinSensibilite !== 'tous') && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#111111]/60">Filtres actifs :</span>
                  <span className="px-2.5 py-1 rounded-full bg-[#111111] text-white font-bold">{[skinBudget, skinActif, skinPhototype, skinTexture, skinFini, skinSensibilite].filter(v=>v!=='tous').length + (skinSansParfum?1:0) + (skinSansTrace?1:0)} / 8</span>
                  <span className="text-[#111111]/50 hidden sm:inline">
                    {[skinActif!=='tous' && `actif ${skinActif}`, skinPhototype!=='tous' && `phototype ${skinPhototype}`, skinTexture!=='tous' && `texture ${skinTexture}`, skinFini!=='tous' && `fini ${skinFini}`, skinSensibilite!=='tous' && `sensible`].filter(Boolean).join(' · ')}
                  </span>
                  <button onClick={() => { setSkinSansParfum(false); setSkinSansTrace(false); setSkinBudget('tous'); setSkinActif('tous'); setSkinPhototype('tous'); setSkinTexture('tous'); setSkinFini('tous'); setSkinSensibilite('tous'); window.history.replaceState({}, '', '/boutique?cat=peau'); }} className="ml-auto text-[#C8753D] font-bold hover:underline">Effacer tous les filtres peau</button>
                </div>
              )}
              {/* Helper phototype VI + HPI */}
              {(skinPhototype==='V' || skinPhototype==='VI') && (
                <p className="text-[11px] text-[#9a5b2d] bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Phototype {skinPhototype} : nous allons déclasser les SPF minéraux purs à trace blanche et booster les hybrides/organiques invisibles — critère #1 pour peaux foncées.
                </p>
              )}
              {skinActif==='niacinamide' && (
                <p className="text-[11px] text-[#111111]/60">Niacinamide 5% : prioritaire HPI — votre filtre « niacinamide sans parfum mat ≤28€ » renverra 6 résultats dès C1 (40 ref).</p>
              )}
            </div>
          )}

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
                <span className="font-semibold text-[#111111] inline-flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#C8753D]" /> Marques afro-descendantes uniquement
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
                Complétez votre KURLA ID pour activer une compatibilité personnalisée.
              </p>
            )}

            {/* Active Filters Summary Reset */}
            {(selectedNeedId || selectedBrand !== 'tous' || onlyAfroCommunity || onlyCompatible || selectedCountry !== 'tous' || searchQuery || activeSubCategory !== 'tous' || skinActif!=='tous' || skinPhototype!=='tous' || skinTexture!=='tous' || skinFini!=='tous' || skinSensibilite!=='tous' || skinSansParfum || skinSansTrace || skinBudget!=='tous') && (
              <button
                onClick={() => {
                  setSelectedNeedId(null);
                  setSelectedBrand('tous');
                  setOnlyAfroCommunity(false);
                  setSelectedCountry('tous');
                  setSearchQuery('');
                  setOnlyCompatible(false);
                  setActiveSubCategory('tous');
                  setSkinBudget('tous'); setSkinActif('tous'); setSkinPhototype('tous'); setSkinTexture('tous'); setSkinFini('tous'); setSkinSensibilite('tous'); setSkinSansParfum(false); setSkinSansTrace(false);
                }}
                className="text-[#C8753D] hover:underline text-xs font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Réinitialiser tous les filtres
              </button>
            )}
          </div>
        </div>

        {comparedProducts.length > 0 && <section className="mb-8 rounded-3xl border border-[#C8753D]/25 bg-[#F8F2EC] p-5"><div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-lg font-serif-title font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-[#C8753D]" /> Comparer les produits</h2><p className="text-xs text-[#111111]/60 mt-1">Comparez uniquement les informations publiées, sans score automatique.</p></div><button onClick={() => setCompareIds([])} className="text-xs text-[#C8753D] hover:underline">Effacer</button></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{comparedProducts.map(product => <div key={product.id} className="rounded-2xl border border-[#E8E1DA] bg-[#FFFDF9] p-3"><div className="flex items-start justify-between gap-2"><h3 className="text-xs font-bold">{product.name}</h3><button onClick={() => toggleCompare(product.id)} aria-label={`Retirer ${product.name}`}><X className="w-3.5 h-3.5 text-[#111111]/50" /></button></div><dl className="mt-3 space-y-1 text-[11px] text-[#111111]/70"><div><dt className="font-semibold inline">Prix : </dt><dd className="inline">{product.price.toFixed(2)} €</dd></div><div><dt className="font-semibold inline">Texture : </dt><dd className="inline">{product.texture || 'Non renseignée'}</dd></div><div><dt className="font-semibold inline">Format : </dt><dd className="inline">{product.sizeLabel || 'Non renseigné'}</dd></div><div><dt className="font-semibold inline">Pays : </dt><dd className="inline">{product.countryAvailability?.join(', ') || 'Non renseignés'}</dd></div></dl></div>)}</div></section>}

        {/* C3 — KITS PEAU : AOV 14€ → 52€ */}
        {(activeCategory === 'peau' || activeCategory === 'kits' || activeCategory === 'tous') && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-serif-title font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-[#C8753D]" /> Kits peau — formulation cible</h2>
              <span className="text-xs text-[#111111]/60">Livraison 4,90€ · gratuite dès 59€ (KPEAU-02/03)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PEAU_KITS.map(kit => (
                <div key={kit.id} className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] p-5 flex flex-col shadow-xs hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${kit.tier==='Essentielle'?'bg-[#F8F2EC] text-[#111111] border border-[#E8E1DA]': kit.tier==='Équilibrée'?'bg-[#C8753D] text-white':'bg-[#111111] text-white'}`}>{kit.tier}</span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">−{kit.economyPct}% · −{kit.economy.toFixed(2)}€</span>
                  </div>
                  <h3 className="text-sm font-bold leading-tight">{kit.name}</h3>
                  <p className="text-xs text-[#C8753D] font-semibold">{kit.tagline} · {kit.routine}</p>
                  <p className="text-xs text-[#111111]/60 font-light mt-1.5 leading-relaxed line-clamp-2">{kit.description}</p>
                  <ul className="mt-3 space-y-1 text-xs">
                    {kit.products.map(p=> (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <span className="text-[#111111]">{p.name}</span>
                        <span className="text-[#111111]/40 text-[11px] shrink-0">{p.price.toFixed(2)}€ · {p.role}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-[#E8E1DA] flex items-end justify-between gap-3">
                    <div>
                      <span className="text-lg font-bold">{kit.priceBundle.toFixed(2)}€</span>
                      <span className="text-xs text-[#111111]/40 line-through ml-1.5">{kit.priceSeparate.toFixed(2)}€</span>
                      <p className="text-[11px] text-[#111111]/50">{kit.products.length} soins · {kit.tier==='Essentielle'?'livraison 4,90€':'livraison gratuite'}</p>
                    </div>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="px-4 py-2.5 rounded-full bg-[#111111]/10 text-[#111111]/55 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5" /> Formulation cible — bientôt disponible
                    </button>
                  </div>
                  <p className="text-[10px] text-[#111111]/40 mt-2 text-center">{kit.id} · {kit.products.length} soins · fiche cible, non disponible</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS COUNT & HEADER */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-[#111111]/70 font-medium">
            <strong className="text-[#111111]">{filteredProducts.length}</strong> référence{filteredProducts.length > 1 ? 's' : ''}
          </p>
        </div>

        {(activeCategory === 'kits' || activeCategory === 'tous') && !selectedNeedId && searchQuery === '' && (
          <div className="mb-12 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#C8753D] uppercase tracking-wider block mb-1">Routines & bundles</span>
              <h2 className="text-xl font-serif-title font-bold text-[#111111]">Construire une routine adaptée</h2>
              <p className="text-xs text-[#111111]/70 mt-1">Les routines ne sont proposées qu’avec des produits publiés et une composition connue.</p>
            </div>
            <a href="/routines" className="text-xs font-bold text-[#C8753D] hover:underline flex items-center gap-1 shrink-0">
              Explorer les routines <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* PRODUCTS GRID STATE HANDLING */}
        {loading ? (
          <div className="text-center py-24 bg-[#F8F2EC] rounded-3xl border border-[#E8E1DA] p-8">
            <Loader2 className="w-10 h-10 text-[#C8753D] mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-serif-title font-bold text-[#111111] mb-2">Chargement des produits publiés…</h3>
            <p className="text-xs text-[#111111]/70 max-w-md mx-auto">
              Nous vérifions les informations disponibles avant de les afficher.
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-red-50 rounded-3xl border border-red-200 p-8">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-serif-title font-bold text-red-900 mb-2">Catalogue momentanément indisponible</h3>
            <p className="text-xs text-red-700 max-w-md mx-auto mb-6">
              {error.message || "Impossible de récupérer les produits publiés pour le moment."}
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-full bg-red-600 text-white text-xs font-semibold shadow-xs hover:bg-red-700 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Réessayer la connexion
            </button>
          </div>
        ) : filteredProducts.length === 0 && EMPTY_CATEGORY_HUB[activeCategory] ? (
          (() => {
            const hub = EMPTY_CATEGORY_HUB[activeCategory];
            const HubIcon = hub.icon;
            return (
              <div className="text-center py-16 bg-[#F8F2EC] rounded-3xl border border-[#E8E1DA] p-8">
                <div className="w-14 h-14 rounded-2xl bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center mx-auto mb-4">
                  <HubIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-serif-title font-bold text-[#111111] mb-2">{hub.title}</h3>
                <p className="text-sm text-[#111111]/70 max-w-md mx-auto mb-6 font-light leading-relaxed">{hub.text}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a href={hub.href} className="px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-sm inline-flex items-center gap-2">
                    {hub.cta} <ArrowRight className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => { setSelectedNeedId(null); setSelectedBrand('tous'); setOnlyAfroCommunity(false); setSelectedCountry('tous'); setSearchQuery(''); setOnlyCompatible(false); setActiveCategory('tous'); setActiveSubCategory('tous'); }}
                    className="px-6 py-3 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-[#111111] text-xs font-semibold hover:border-[#C8753D]"
                  >
                    Voir tout le catalogue ({count})
                  </button>
                </div>

                {/* Le rayon est vide : on enregistre l'intention au lieu de
                    renvoyer la visiteuse vers une page qui n'a rien à vendre. */}
                {waitlistSourceForCategory(activeCategory) && (
                  <div className="mt-8 max-w-md mx-auto">
                    <p className="text-[11px] uppercase tracking-widest font-bold text-[#C8753D] mb-3">
                      Être prévenue à l’ouverture
                    </p>
                    <CategoryWaitlist
                      source={waitlistSourceForCategory(activeCategory)!}
                      label={hub.waitlistLabel}
                    />
                  </div>
                )}
              </div>
            );
          })()
        ) : filteredProducts.length === 0 && count === 0 ? (
          /* Catalogue entièrement vide (aucun produit publié) : ne jamais
             afficher un « Voir tout le catalogue (0) » en cul-de-sac. On
             oriente vers le diagnostic (valeur immédiate) et la liste de
             lancement (capture d'email). */
          <div className="text-center py-16 bg-[#F8F2EC] rounded-3xl border border-[#E8E1DA] p-8">
            <Sparkles className="w-10 h-10 text-[#C8753D] mx-auto mb-3" />
            <h3 className="text-xl font-serif-title font-bold text-[#111111] mb-2">La boutique ouvre très bientôt</h3>
            <p className="text-sm text-[#111111]/70 max-w-md mx-auto mb-6 font-light leading-relaxed">
              Les premières références (kits, soins et outils pour cheveux texturés) sont en cours de publication.
              En attendant, faites votre diagnostic gratuit : votre routine personnalisée sera prête dès l’ouverture,
              et la liste de lancement donne accès à l’offre de bienvenue.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a href="/diagnostic/cheveux" className="px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-sm inline-flex items-center gap-2">
                Faire mon diagnostic gratuit <ArrowRight className="w-4 h-4" />
              </a>
              <a href="/#waitlist" className="px-6 py-3 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-[#111111] text-xs font-semibold hover:border-[#C8753D]">
                Rejoindre la liste de lancement
              </a>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-[#F8F2EC] rounded-3xl border border-[#E8E1DA] p-8">
            <Filter className="w-10 h-10 text-[#C8753D] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-serif-title font-bold text-[#111111] mb-2">Aucun produit trouvé</h3>
            <p className="text-xs text-[#111111]/70 max-w-md mx-auto mb-6">
              Aucune référence ne correspond à vos filtres. Essayez d’élargir votre recherche.
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
              Voir tout le catalogue ({count})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const compatibleWithProfile = hasKurlaProfile && isProductCompatible(product);
              const isPreorderProduct = product.isPreorder === true || (product as any).availabilityState === 'preorder';
              const canOrderProduct = product.inStock === true || isPreorderProduct;

              return (
                <div
                  key={product.id}
                  className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md group relative"
                >
                  <div>
                    <div className="relative h-56 rounded-2xl overflow-hidden mb-4 bg-[#F8F2EC]">
                      {product.image ? (
                        <img loading="lazy" decoding="async"
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#111111]/50">Image en attente de validation</div>
                      )}
                      
                      {compatibleWithProfile && (
                        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-[#111111]/85 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
                          <Award className="w-3 h-3 text-[#D49A63]" /> Vous correspond
                        </div>
                      )}

                      {/* Community Badge */}
                      {product.communityBrand && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-900/80 backdrop-blur-md text-amber-200 text-[9px] font-bold border border-amber-500/30">
                          Afro-Founded
                        </div>
                      )}

                      {/* Badge fulfillment C1 : 24–48h outils vs Précommande 3–5j soins */}
                      {isDropshipProduct(product as any) ? (
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-600 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <Clock className="w-3 h-3" /> 24–48h
                        </span>
                      ) : isPreorderProduct ? (
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#2E7D5B] backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <Clock className="w-3 h-3" /> Précommande
                        </span>
                      ) : (
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#111111]/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3" /> Disponible
                        </span>
                      )}
                      {/* C8 — Peau V-VI safe + SPF sans trace blanche (mélanine, HPI) */}
                      {(() => {
                        const isSPF = /spf|solaire|protection.*soleil/i.test(`${product.name} ${product.description} ${(product.keyIngredients||[]).join(' ')}`);
                        if ((product as any).category === 'peau' && isSPF) return <span className="absolute top-10 left-3 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-[#111111] text-[9px] font-bold border border-[#E8E1DA] shadow-sm">SPF sans trace blanche</span>;
                        if ((product as any).category === 'peau') return <span className="absolute top-10 left-3 px-2 py-0.5 rounded-full bg-[#111111]/85 backdrop-blur-md text-white text-[9px] font-bold border border-white/15 shadow-sm">V-VI safe · HPI</span>;
                        return null;
                      })()}
                      {false && product.badges[0] ? (
                        <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-[#C8753D] text-white text-[10px] font-semibold">
                          {product.badges[0]}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#C8753D] font-bold">
                        {product.brand}
                      </span>
                      <span className="text-[10px] text-[#111111]/50 font-medium text-right">
                        {product.countryAvailability?.length ? `Livraison : ${product.countryAvailability.join(', ')}` : 'Livraison France & UE'}
                      </span>                    </div>

                    <a href={`/produit/${product.slug}`} className="hover:underline">
                      <h3 className="text-base font-serif-title font-bold text-[#111111] mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                    </a>

                    {product.verifiedReviewCount && product.rating > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-2">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="font-bold text-[#111111]">{product.rating.toFixed(1)}</span>
                        <span className="text-[#111111]/40">({product.verifiedReviewCount} avis vérifiés)</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#111111]/40 mb-2">Nouveau — soyez parmi les premiers à donner votre avis</p>
                    )}

                    <p className="text-xs text-[#111111]/70 font-light line-clamp-2 mb-2">
                      {product.description}
                    </p>
                    {isDropshipProduct(product as any) ? (
                      <p className="text-[10px] text-emerald-600 font-semibold mb-3 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {TOOL_DISPATCH_SHORT}
                      </p>
                    ) : isPreorderProduct ? (
                      <p className="text-[10px] text-[#2E7D5B] font-semibold mb-3 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {DISPATCH_SHORT} <span className="text-[#111111]/40 font-normal">· production sur commande</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-[#111111]/65 font-semibold mb-3 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Stock disponible
                      </p>
                    )}

                    {/* HARMONISATION : ce produit a une fiche pédagogique dans le
                        guide des outils → lien direct vers sa fiche (ancre). */}
                    {TOOL_BY_PRODUCT_SLUG.has(product.slug) && (
                      <a
                        href={`/outils#${TOOL_BY_PRODUCT_SLUG.get(product.slug)!.id}`}
                        className="text-[10px] font-semibold text-[#C8753D] hover:underline mb-3 inline-flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" /> Guide d’utilisation : quand et comment s’en servir
                      </a>
                    )}

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

                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleCompare(product.id)} className={`px-3 py-2 rounded-full border text-[11px] font-semibold transition-colors ${compareIds.includes(product.id) ? 'border-[#C8753D] text-[#C8753D] bg-[#C8753D]/10' : 'border-[#E8E1DA] text-[#111111]/60 hover:border-[#C8753D]'}`}>
                        {compareIds.includes(product.id) ? 'Comparé' : 'Comparer'}
                      </button>
                      <button
                        onClick={() => onAddToCart(product)}
                        disabled={!canOrderProduct}
                        className="px-4 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-40"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> {!canOrderProduct ? 'Indisponible' : isPreorderProduct ? 'Précommander' : 'Ajouter'}
                      </button>
                    </div>
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

