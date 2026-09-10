/**
 * KURLA PEAU — 3 KITS PEAU (C3)
 * Objectif : faire passer AOV peau 14€ → 52€.
 * Pricing bundle : Essentielle −5% / Équilibrée −13% / Experte −15% vs achat à l'unité.
 * Livraison : 4,90€, gratuite >59€ (KPEAU-02/03 gratuits, KPEAU-01 4,90€ sauf si +1 produit).
 * Source kits : `docs/PLAN_P0_KURLA_PEAU_2026-09-11.md` C3.
 */

export type PeauKitId = 'KPEAU-01' | 'KPEAU-02' | 'KPEAU-03';

export type PeauKit = {
  id: PeauKitId;
  sku: string; // category=kits
  name: string;
  tier: 'Essentielle' | 'Équilibrée' | 'Experte';
  tagline: string;
  products: { id: string; name: string; price: number; role: string }[];
  priceBundle: number;
  priceSeparate: number;
  economy: number; // €
  economyPct: number;
  targetSkinType: string[];
  description: string;
  routine: string; // matin 6 / soir 8 / hebdo 3 placement
};

function pct(economy: number, separate: number): number {
  return Math.round((economy / separate) * 100);
}

// Produits existants (3) + placeholders C1 (4) — placeholder price = cible C1
const P_NETTOYANT = { id: 'peau-ess-001', name: 'Nettoyant doux sans parfum', price: 12.90, role: 'Nettoyant matin & soir' };
const P_CREME = { id: 'peau-ess-002', name: 'Crème céramides + squalane', price: 16.90, role: 'Crème barrière' };
const P_SPF = { id: 'peau-ess-003', name: 'SPF 50 invisible fluide', price: 19.90, role: 'SPF matin (phototype V–VI safe)' };
const P_SERUM_NIA = { id: 'peau-serum-niacinamide-001', name: 'Sérum niacinamide 5%', price: 18.90, role: 'Sérum HPI (matin)', placeholder: true };
const P_GEL_HA = { id: 'peau-gel-hyaluronique-001', name: 'Gel acide hyaluronique', price: 16.90, role: 'Hydratation profonde' };
const P_EXFOLIANT = { id: 'peau-exfoliant-aha-bha-001', name: 'Exfoliant AHA/BHA 1×/sem', price: 19.90, role: 'Hebdo — grain & taches', hebdo: true };
const P_BAUME = { id: 'peau-baume-levres-001', name: 'Baume lèvres céramides', price: 8.90, role: 'Lèvres sèches' };

export const PEAU_KITS: PeauKit[] = [
  {
    id: 'KPEAU-01',
    sku: 'kit-peau-ess-001',
    name: 'Kit Peau Essentielle',
    tier: 'Essentielle',
    tagline: '3 soins — la base qui marche',
    products: [P_NETTOYANT, P_CREME, P_SPF],
    priceBundle: 49.70,
    priceSeparate: 49.70 + 2.90, // 52.60
    economy: 2.90,
    economyPct: 5,
    targetSkinType: ['normale', 'mixte', 'grasse', 'sensible'],
    description: 'Nettoyant doux + crème céramides + SPF invisible. Le 80/20 peau : barrière intacte + protection sans trace blanche.',
    routine: 'Matin 3 → Soir 2 → Hebdo 0',
  },
  {
    id: 'KPEAU-02',
    sku: 'kit-peau-eq-001',
    name: 'Kit Peau Équilibrée',
    tier: 'Équilibrée',
    tagline: '5 soins — HPI + hydratation',
    products: [P_NETTOYANT, P_CREME, P_SPF, P_SERUM_NIA, P_GEL_HA],
    priceBundle: 62.00,
    priceSeparate: 71.40,
    economy: 9.40,
    economyPct: 13,
    targetSkinType: ['mixte', 'grasse', 'sensible', 'taches'],
    description: 'Essentielle + sérum niacinamide 5% + gel HA. Le cœur HPI peaux mélaninées : uniformiser sans dessécher.',
    routine: 'Matin 4 → Soir 4 → Hebdo 0',
  },
  {
    id: 'KPEAU-03',
    sku: 'kit-peau-exp-001',
    name: 'Kit Peau Experte',
    tier: 'Experte',
    tagline: '7 soins — routine complète hebdo',
    products: [P_NETTOYANT, P_CREME, P_SPF, P_SERUM_NIA, P_GEL_HA, P_EXFOLIANT, P_BAUME],
    priceBundle: 84.90,
    priceSeparate: 99.80,
    economy: 14.90,
    economyPct: 15,
    targetSkinType: ['mixte', 'sensible', 'mature', 'taches'],
    description: 'Équilibrée + exfoliant AHA/BHA 1×/sem + baume lèvres. La routine hebdo qui affine le grain sans agresser.',
    routine: 'Matin 4 → Soir 5 → Hebdo 1',
  },
];

// Ajusté : on calcule l'économie exacte depuis les prix bundle vs séparé initiaux
PEAU_KITS.forEach(k => {
  const sep = k.products.reduce((s,p)=>s+p.price,0);
  k.priceSeparate = Math.round(sep*100)/100;
  k.economy = Math.round((k.priceSeparate - k.priceBundle)*100)/100;
  k.economyPct = pct(k.economy, k.priceSeparate);
});

export const PEAU_KIT_BY_ID = new Map(PEAU_KITS.map(k=>[k.id,k]));
export const PEAU_KIT_BY_SKU = new Map(PEAU_KITS.map(k=>[k.sku,k]));

export function peauKitForBudget(budget: string | undefined): PeauKit {
  if (budget === 'premium' || budget === 'confortable') return PEAU_KITS[2];
  if (budget === 'moyen') return PEAU_KITS[1];
  return PEAU_KITS[0]; // petit
}

export function peauKitForSkinType(skinType: string | undefined): PeauKit {
  if (skinType === 'mature' || skinType === 'tres_seche') return PEAU_KITS[2];
  if (skinType === 'mixte' || skinType === 'grasse') return PEAU_KITS[1];
  return PEAU_KITS[0];
}

// Helper boutique : kits comme pseudo-produits pour grille ?cat=peau&kits
export type PeauKitProduct = {
  id: string; sku: string; slug: string; name: string; brand: string;
  price: number; originalPrice: number; category: 'kits'; subCategory: string;
  description: string; image: string; inStock: boolean; isPreorder: boolean;
  kitId: PeauKitId; kit: PeauKit; badges: string[];
  /** Etat explicite : ces kits sont des plans de gamme, pas des SKU vendables. */
  availabilityState: 'formulation_target';
};

export function peauKitsAsProducts(): PeauKitProduct[] {
  return PEAU_KITS.map(k => ({
    id: k.sku,
    sku: k.sku,
    slug: k.sku,
    name: k.name,
    brand: 'KURLA',
    price: k.priceBundle,
    originalPrice: k.priceSeparate,
    category: 'kits' as const,
    subCategory: 'peau',
    description: `${k.tagline} · ${k.products.map(p=>p.name).join(' + ')} · ${k.routine} · Économie ${k.economy.toFixed(2)}€ (−${k.economyPct}%)`,
    image: '', // aucun packshot : kit non fabriqué
    inStock: false,
    isPreorder: false,
    kitId: k.id,
    kit: k,
    availabilityState: 'formulation_target' as const,
    badges: [k.tier, `−${k.economyPct}%`, k.products.length + ' soins', 'formulation-target'],
  }));
}

// Livraison
export const PEAU_KIT_SHIPPING = { flat: 4.90, freeFrom: 59, freeFor: ['KPEAU-02','KPEAU-03'] as PeauKitId[] };
export function kitShippingCost(kitId: PeauKitId): number {
  return PEAU_KIT_SHIPPING.freeFor.includes(kitId) ? 0 : PEAU_KIT_SHIPPING.flat;
}
