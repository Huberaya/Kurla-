/**
 * KURLA SKIN — Moteur de recommandation peau V1 (C2)
 * Règles peau pures : incompatibilités actifs, whitecast phototype, boost HPI, sensibilité.
 * Utilisé par BoutiquePage (tri `fit` peau) et future Routine adaptative (C3).
 * Aucun diagnostic médical — ranking cosmétique explicable.
 */

import { BeautyProfile, UNKNOWN } from './beautyProfile';
import { whitecastRisk, isSPFProduct } from './skinAlternatives';
import { Product } from '../types';

// ── Incompatibilités actifs peau (même routine soir) ───────────────────────
// Chaque règle = paire d'actifs à ne pas superposer le même soir.
// Le moteur bloque + explique + propose alternance (ex: soir A / soir B).
export type SkinIncompatibility = { pair: [string, string]; reason: string; severity: 'bloquant' | 'deconseille' };

export const SKIN_INCOMPATIBILITIES: SkinIncompatibility[] = [
  { pair: ['retinol', 'aha'], reason: 'Rétinol + AHA le même soir = irritation forte. Alternez : soir A (rétinol), soir B (AHA).', severity: 'bloquant' },
  { pair: ['retinol', 'bha'], reason: 'Rétinol + BHA le même soir = barrière fragilisée. Alternez.', severity: 'bloquant' },
  { pair: ['retinol', 'vitamine_c'], reason: 'Rétinol + vitamine C même routine = picotements. Vit C le matin, rétinol le soir.', severity: 'deconseille' },
  { pair: ['aha', 'bha'], reason: 'AHA + BHA même soir = double exfoliation. 1 seul par soir si peau sensible.', severity: 'deconseille' },
];

function normalizeActif(a: string): string { return a.toLowerCase().trim().replace(/\s+/g, '_'); }

function actifsFromProduct(p: Product, extraActifs?: string[]): string[] {
  const hay = `${(p.keyIngredients||[]).join(' ')} ${(p as any).inci||''} ${(p as any).metadata?.actifs?.join(' ')||''} ${(extraActifs||[]).join(' ')}`.toLowerCase();
  const found: string[] = [];
  const map: Record<string,string[]> = {
    retinol: ['retinol', 'retinal', 'retinoate'],
    aha: ['glycolic', 'lactic acid', 'aha', 'acide glycolique'],
    bha: ['salicylic', 'bha', 'acide salicylique'],
    vitamine_c: ['ascorbic', 'vitamine c', 'vitamin c', 'ascorbyl'],
    niacinamide: ['niacinamide'],
    ceramides: ['ceramide', 'céramide'],
    acide_azelaic: ['azelaic', 'azélaïque'],
    acide_hyaluronique: ['hyaluronic', 'hyaluronate'],
    squalane: ['squalane'],
  };
  for (const [norm, needles] of Object.entries(map)) {
    if (needles.some(n => hay.includes(n))) found.push(norm);
  }
  // aussi depuis metadata.actifs normalisés
  const meta = (p as any).metadata?.actifs as string[] | undefined;
  if (meta) for (const m of meta) { const n = normalizeActif(m); if (!found.includes(n)) found.push(n); }
  return found;
}

export function incompatibleActives(actifsA: string[], actifsB: string[]): SkinIncompatibility[] {
  const out: SkinIncompatibility[] = [];
  for (const rule of SKIN_INCOMPATIBILITIES) {
    const [a,b] = rule.pair;
    const hasA = actifsA.includes(a) && actifsB.includes(b);
    const hasB = actifsA.includes(b) && actifsB.includes(a);
    const withinSame = actifsA.includes(a) && actifsA.includes(b); // même produit contient les deux (rare)
    if (hasA || hasB || withinSame) out.push(rule);
  }
  return out;
}

export function isSkinIncompatible(p1: Product, p2: Product): SkinIncompatibility[] {
  return incompatibleActives(actifsFromProduct(p1), actifsFromProduct(p2));
}

// ── Scoring peau ──────────────────────────────────────────────────────────

export interface SkinScoringContext {
  profile?: BeautyProfile;
  activeFilters?: {
    actif?: string; // SKIN_ACTIVE_FILTERS.value
    phototype?: string; // I–VI
    texture?: string;
    finish?: string;
    sensitivity?: string;
    sansParfum?: boolean;
    spfInvisible?: boolean;
    budgetMax?: number;
  };
  hyperpigmentationBoost?: boolean;
}

function isKnown(v: string | undefined): boolean {
  return !!v && v !== UNKNOWN && v !== '' && v !== 'inconnu';
}

export function scoreSkinProduct(product: Product, ctx: SkinScoringContext = {}): { score: number; reasons: string[]; incompatibilities: SkinIncompatibility[] } {
  let score = 50; // base neutre
  const reasons: string[] = [];
  const incompatibilities: SkinIncompatibility[] = [];

  const p = product as any;
  const meta = p.metadata as { phototype?: string[]; texture?: string; finish?: string; actifs?: string[]; whitecastRisk?: string; sansParfum?: boolean } | undefined;
  const hay = `${product.name} ${product.description} ${(product.badges||[]).join(' ')} ${(product.keyIngredients||[]).join(' ')}`.toLowerCase();

  // 1. Filtre actif demandé → boost si présent, malus si absent
  if (ctx.activeFilters?.actif) {
    const want = normalizeActif(ctx.activeFilters.actif);
    const acts = actifsFromProduct(product, ctx.activeFilters?.actif ? [ctx.activeFilters.actif] : undefined);
    if (acts.includes(want)) { score += 22; reasons.push(`Contient ${ctx.activeFilters.actif} recherché`); }
    else { score -= 18; reasons.push(`Sans ${ctx.activeFilters.actif}`); }
  }

  // 2. Phototype V–VI → whitecast critique
  if (ctx.activeFilters?.phototype && ['V','VI'].includes(ctx.activeFilters.phototype)) {
    const risk = (meta?.whitecastRisk as string) || whitecastRisk(product);
    if (isSPFProduct(product)) {
      if (risk === 'eleve') { score -= 25; reasons.push('SPF minéral pur — trace blanche probable sur phototype V–VI → déclassé'); }
      else if (risk === 'faible') { score += 18; reasons.push('SPF invisible — adapté phototype foncé'); }
    }
    // phototype tag matching
    if (meta?.phototype && meta.phototype.includes(ctx.activeFilters.phototype)) { score += 8; reasons.push(`Adapté phototype ${ctx.activeFilters.phototype}`); }
  }

  // 3. HPI fréquente → boost niacinamide / azélaïque / vit C
  const profileHPI = ctx.profile?.skin.hyperpigmentationTendency;
  const needsTaches = (ctx.profile?.skin.skinConcerns||[]).some(c => /taches|hyperpigmentation|teint_terne/i.test(c));
  const isHPI = profileHPI === 'frequente' || needsTaches || ctx.hyperpigmentationBoost;
  if (isHPI) {
    const acts = actifsFromProduct(product);
    if (acts.includes('niacinamide')) { score += 20; reasons.push('Prioritaire HPI : niacinamide 5%'); }
    else if (acts.includes('acide_azelaic')) { score += 16; reasons.push('Prioritaire HPI : acide azélaïque'); }
    else if (acts.includes('vitamine_c')) { score += 14; reasons.push('Éclat : vitamine C'); }
  }

  // 4. Sensibilité élevée ou sansParfum demandé → boost sans parfum
  const sensitive = ctx.profile?.skin.sensitivity === 'elevee' || ctx.profile?.skin.sensitivities?.includes('parfum') || ctx.activeFilters?.sansParfum;
  const isSansParfum = meta?.sansParfum === true || (!p.containsFragrance && !/parfum|fragrance/i.test(p.inci||'') && !(product.allergens||[]).some(a=>/parfum|fragrance/i.test(a)));
  if (sensitive) {
    if (isSansParfum) { score += 16; reasons.push('Sans parfum — adapté peau sensible'); }
    else { score -= 14; reasons.push('Contient parfum — déconseillé sensible'); }
  } else if (isSansParfum) { score += 4; reasons.push('Sans parfum'); }

  // 5. Texture / fini demandés
  if (ctx.activeFilters?.texture && meta?.texture === ctx.activeFilters.texture) { score += 10; reasons.push(`Texture ${meta.texture} souhaitée`); }
  if (ctx.activeFilters?.finish && meta?.finish === ctx.activeFilters.finish) { score += 8; reasons.push(`Fini ${meta.finish}`); }

  // 6. Budget
  if (ctx.activeFilters?.budgetMax !== undefined) {
    if (product.price <= ctx.activeFilters.budgetMax) { score += 6; reasons.push(`Dans budget ≤${ctx.activeFilters.budgetMax}€`); }
    else { score -= 20; reasons.push(`Hors budget (${product.price}€ > ${ctx.activeFilters.budgetMax}€)`); }
  }

  // 7. Incompatibilité intrarum (produit seul qui mélange rétinol+AHA)
  const acts = actifsFromProduct(product);
  const internal = incompatibleActives(acts, acts);
  if (internal.length) { incompatibilities.push(...internal); score -= 12; reasons.push(internal[0].reason); }

  // 8. SPF invisible demandé explicitement
  if (ctx.activeFilters?.spfInvisible && isSPFProduct(product)) {
    const r = (meta?.whitecastRisk as string) || whitecastRisk(product);
    if (r === 'faible') { score += 12; reasons.push('SPF sans trace blanche'); }
    else { score -= 10; reasons.push('SPF trace blanche possible'); }
  }

  // 9. Rating bonus léger
  score += Math.min(6, (product.rating||0) * 1.2);

  // 10. Stock indisponible → exclu (géré en amont, mais on pénalise)
  if (!product.inStock) { score -= 40; reasons.push('Indisponible'); }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons: reasons.slice(0,4), incompatibilities };
}

// Trie un catalogue peau selon le score peau — stable, explicable
export function rankSkinProducts(products: Product[], ctx: SkinScoringContext): Array<Product & { _skinScore: number; _skinReasons: string[] }> {
  return products
    .map(p => {
      const { score, reasons } = scoreSkinProduct(p, ctx);
      return { ...p, _skinScore: score, _skinReasons: reasons };
    })
    .sort((a,b) => b._skinScore - a._skinScore);
}

export const SKIN_BUDGET_CAPS: Record<string, number> = { moins_40: 14, '40_70': 28, '70_100': 45, premium: 9999 };
