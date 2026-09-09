/**
 * KURLA SKIN — Taxonomie unifiée peau (C0 INFRA)
 * Source unique pour Boutique, Diagnostic, Routine, Moteur et SEO.
 * Figée P0 : 15 needs + 5 filtres manquants (actif, phototype, texture, fini, sensibilité)
 * Toute évolution P1 doit passer par ce fichier — pas de duplication.
 */

// ── 15 besoins peau (Boutique ?need=) ──────────────────────────────────────
// Couvre l'audit peau vs cheveux : 15 familles peau vs 10 cheveux.
// Chaque need mappe 1 page Boutique + 1 fiche guide + 1 étape routine.
export const SKIN_NEEDS = [
  { value: 'hydrater', label: 'Hydrater', shortLabel: 'Hydratation', icon: 'Droplets' },
  { value: 'eclat', label: 'Éclat & teint terne', shortLabel: 'Éclat', icon: 'Sparkles' },
  { value: 'taches', label: 'Taches / HPI', shortLabel: 'Taches', icon: 'Target' },
  { value: 'seche', label: 'Peau sèche / très sèche', shortLabel: 'Sèche', icon: 'Wind' },
  { value: 'grasse', label: 'Peau grasse / brillance', shortLabel: 'Grasse', icon: 'Sun' },
  { value: 'imperfections', label: 'Imperfections / boutons', shortLabel: 'Imperfections', icon: 'ShieldAlert' },
  { value: 'sensible', label: 'Peau sensible / réactive', shortLabel: 'Sensible', icon: 'Heart' },
  { value: 'spf', label: 'SPF sans trace blanche', shortLabel: 'SPF invisible', icon: 'SunSnow' },
  { value: 'anti_age', label: 'Rides / fermeté', shortLabel: 'Anti-âge', icon: 'Hourglass' },
  { value: 'contour_yeux', label: 'Contour des yeux', shortLabel: 'Yeux', icon: 'Eye' },
  { value: 'levres', label: 'Lèvres sèches', shortLabel: 'Lèvres', icon: 'Smile' },
  { value: 'corps', label: 'Peau du corps', shortLabel: 'Corps', icon: 'User' },
  { value: 'cicatrices', label: 'Cicatrices post-acné', shortLabel: 'Cicatrices', icon: 'Bandage' },
  { value: 'barriere', label: 'Barrière cutanée', shortLabel: 'Barrière', icon: 'Shield' },
  { value: 'par_ingredient', label: 'Par ingrédient', shortLabel: 'Ingrédient', icon: 'Beaker' },
] as const;

export type SkinNeed = typeof SKIN_NEEDS[number]['value'];

// ── Filtres peau — 5 manquants P0 (audit §4) ───────────────────────────────

export const SKIN_ACTIVE_FILTERS = [
  { value: 'niacinamide', label: 'Niacinamide 5%', inci: 'Niacinamide' },
  { value: 'acide_azelaic', label: 'Acide azélaïque', inci: 'Azelaic Acid' },
  { value: 'vitamine_c', label: 'Vitamine C', inci: 'Ascorbic Acid / Sodium Ascorbyl Phosphate' },
  { value: 'retinol', label: 'Rétinol', inci: 'Retinol' },
  { value: 'aha', label: 'AHA', inci: 'Glycolic Acid / Lactic Acid' },
  { value: 'bha', label: 'BHA / Salicylique', inci: 'Salicylic Acid' },
  { value: 'ceramides', label: 'Céramides NP', inci: 'Ceramide NP' },
  { value: 'squalane', label: 'Squalane', inci: 'Squalane' },
  { value: 'acide_hyaluronique', label: 'Acide hyaluronique', inci: 'Hyaluronic Acid / Sodium Hyaluronate' },
] as const;

export const SKIN_PHOTOTYPE_FILTERS = [
  { value: 'I', label: 'I · très clair', helper: 'Brûle toujours' },
  { value: 'II', label: 'II · clair', helper: 'Brûle facilement' },
  { value: 'III', label: 'III · intermédiaire', helper: 'Brûle modérément' },
  { value: 'IV', label: 'IV · mat', helper: 'Brûle peu' },
  { value: 'V', label: 'V · foncé', helper: 'Brûle rarement — HPI fréquente' },
  { value: 'VI', label: 'VI · très foncé', helper: 'Ne brûle pas — whitecast critique' },
] as const;

export const SKIN_TEXTURE_FILTERS = [
  { value: 'gel', label: 'Gel léger' },
  { value: 'lotion', label: 'Lotion fluide' },
  { value: 'creme', label: 'Crème' },
  { value: 'baume', label: 'Baume riche' },
  { value: 'huile', label: 'Huile / sérum huileux' },
] as const;

export const SKIN_FINISH_FILTERS = [
  { value: 'mat', label: 'Mat' },
  { value: 'naturel', label: 'Naturel' },
  { value: 'glowy', label: 'Glowy / lumineux' },
] as const;

export const SKIN_SENSITIVITY_FILTERS = [
  { value: 'sensible', label: 'Sensible' },
  { value: 'tres_sensible', label: 'Très sensible' },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────

export const SKIN_NEED_VALUES = SKIN_NEEDS.map(n => n.value) as string[];
export const SKIN_ACTIVE_VALUES = SKIN_ACTIVE_FILTERS.map(a => a.value) as string[];

export function isSkinNeed(value: string): value is SkinNeed {
  return SKIN_NEED_VALUES.includes(value);
}

export function skinNeedLabel(value: string): string {
  return SKIN_NEEDS.find(n => n.value === value)?.label ?? value;
}

export function activeLabel(value: string): string {
  return SKIN_ACTIVE_FILTERS.find(a => a.value === value)?.label ?? value;
}

// Mapping alias boutique (BOUTIQUE_NEED_ALIAS) déjà existant —
// ce fichier en est la source canonique P0. `par_ingredient` reste
// un alias vers recherche générique `q` (comportement conservé).
export const SKIN_NEED_ALIAS: Record<string, string> = {
  taches: 'hyperpigmentation',
  spf: 'protection_solaire',
  barriere: 'renforcer_barriere',
  par_ingredient: '', // recherche libre `q`
};

// ── Metadata produit peau — clés normalisées pour filtres C2 ──────────────
// `products.metadata` (JSONB) portera ces clés dès C1 ingestion :
// phototype: string[] (I–VI), texture: string, finish: string, actifs: string[] (inci lower)
export type SkinProductMetadata = {
  phototype?: string[]; // ex: ['V','VI']
  texture?: typeof SKIN_TEXTURE_FILTERS[number]['value'];
  finish?: typeof SKIN_FINISH_FILTERS[number]['value'];
  actifs?: string[]; // valeurs SKIN_ACTIVE_FILTERS.value
  whitecastRisk?: 'faible' | 'modere' | 'eleve';
  sansParfum?: boolean;
};
