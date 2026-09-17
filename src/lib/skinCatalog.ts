/**
 * CHANTIER 8 — Catalogue Skin : drafts dans `products`, hors boutique.
 *
 * Conversion identifié → fiche = la route existante
 * `POST /api/admin/sourcing/candidates/:id/create-fiche` (C3).
 * Ce module la **scelle** : `catalog_status = draft`, `is_active = false`,
 * jamais listable. 0 publication accidentelle.
 *
 * Skin = `products.category === 'peau'` (C1). Hair inchangé.
 * `source_supplier` n’est pas un nom de fournisseur (marqueur formulation) :
 * une fiche Skin n’y recopie pas le prospect.
 */

import { isCatalogPubliclyListable } from './catalogTruth';
import { SKIN_CATALOG_CATEGORY, WRITE_TARGET_BY_INTENT, type UnifiedRecord } from './productLifecycle';
import { buildFicheFromCandidate } from './sourcingFicheLink';
import { estProduitPeau, isSkinNeed, type SkinNeed } from './skinTaxonomy';

export const SKIN_CATALOG_WRITE_TARGET = WRITE_TARGET_BY_INTENT.enter_catalog;

const SKIN_CATEGORY_ALIASES = new Set(['peau', 'skin', 'skincare', 'soins_visage', 'teint']);

export function isSkinCatalogCandidate(candidate: { category?: unknown; needs?: unknown; concerns?: unknown }): boolean {
  const category = typeof candidate?.category === 'string' ? candidate.category.trim().toLowerCase() : '';
  if (SKIN_CATEGORY_ALIASES.has(category)) return true;
  return estProduitPeau({
    category,
    needs: Array.isArray(candidate?.needs) ? candidate.needs as string[] : [],
    concerns: Array.isArray(candidate?.concerns) ? candidate.concerns as string[] : [],
  });
}

function realPrice(payload: Record<string, unknown>): number | null {
  const n = Number(payload.price);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Force draft inactive. N’invente ni prix, ni INCI, ni visuel. */
export function sealCatalogDraft(payload: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...payload };
  next.catalog_status = 'draft';
  next.catalogStatus = 'draft';
  next.is_active = false;
  next.isActive = false;
  const id = typeof next.id === 'string' ? next.id : '';
  // Ne pas atterrir dans « bientôt disponible » (`src-`) ni collisionner Hair (`p*`).
  if (id.startsWith('src-') || /^p\d/.test(id) || id.startsWith('launch-p')) delete next.id;
  return next;
}

function skinNeedFromCandidate(candidate: Record<string, unknown>): SkinNeed | null {
  const tagged = [
    ...(Array.isArray(candidate.needs) ? candidate.needs : []),
    ...(Array.isArray(candidate.concerns) ? candidate.concerns : []),
    candidate.skinNeed,
    candidate.skin_need,
  ]
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
  const found = tagged.find(isSkinNeed);
  return found ?? null;
}

/** Champs Skin uniquement. Ne touche pas un candidat Hair. */
export function applySkinCatalogFields(
  payload: Record<string, unknown>,
  candidate: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...payload, category: SKIN_CATALOG_CATEGORY };
  delete next.sourceSupplier;
  delete next.source_supplier;
  const need = skinNeedFromCandidate(candidate);
  if (need) {
    next.needs = [need];
    next.concerns = [need];
  }
  return next;
}

export function catalogDraftIsPublic(product: Record<string, unknown> | null | undefined): boolean {
  if (!product) return false;
  return isCatalogPubliclyListable(product);
}

export function assertCatalogDraftNotPublic(payload: Record<string, unknown>): void {
  if (String(payload.catalog_status || payload.catalogStatus) !== 'draft') {
    throw new Error('Une fiche née du sourcing doit rester draft — 0 publication accidentelle.');
  }
  if (payload.is_active === true || payload.isActive === true) {
    throw new Error('Une fiche née du sourcing naît inactive — 0 publication accidentelle.');
  }
  if (catalogDraftIsPublic(payload)) {
    throw new Error('Cette fiche serait listable en boutique — création refusée.');
  }
}

export function assertCatalogDraftHasRealPrice(payload: Record<string, unknown>): void {
  if (realPrice(payload) == null) {
    throw new Error('Prix public à obtenir — pas de fiche catalogue sans prix réel.');
  }
}

/**
 * Payload d’entrée catalogue depuis un candidat. Toujours draft, hors boutique.
 * Skin : catégorie `peau`, pas de `source_supplier` recopié du prospect.
 */
export function enterCatalogFromCandidate(candidate: any, prospect: any | null): Record<string, unknown> {
  const raw = buildFicheFromCandidate(candidate, prospect);
  const sealed = sealCatalogDraft(raw);
  const payload = isSkinCatalogCandidate(candidate)
    ? applySkinCatalogFields(sealed, candidate && typeof candidate === 'object' ? candidate : {})
    : sealed;
  assertCatalogDraftHasRealPrice(payload);
  assertCatalogDraftNotPublic(payload);
  return payload;
}

export function candidateIdFromIdentified(record: Pick<UnifiedRecord, 'kind' | 'uid'>): string | null {
  if (record.kind !== 'candidate') return null;
  if (!record.uid.startsWith('candidate:')) return null;
  const id = record.uid.slice('candidate:'.length).trim();
  return id || null;
}

export type CatalogEntryEligibility = { ok: boolean; reason: string };

export function catalogEntryEligibility(record: UnifiedRecord): CatalogEntryEligibility {
  if (record.kind === 'fond_position') {
    return { ok: false, reason: 'Les positions de fond restent identifiées. La fiche catalogue se crée depuis un candidat.' };
  }
  if (record.kind !== 'candidate') {
    return { ok: false, reason: 'Pas un identifié candidat.' };
  }
  if (record.linkedProductId) {
    return { ok: false, reason: `Déjà en catalogue (${record.linkedProductId}).` };
  }
  if (record.lifecycle.isPublic) {
    return { ok: false, reason: 'Déjà public — hors C8.' };
  }
  if (record.priceEur == null) {
    return { ok: false, reason: 'Prix public à obtenir — pas de fiche sans prix réel.' };
  }
  return { ok: true, reason: 'Créer la fiche catalogue (draft, hors boutique).' };
}

export function isSkinCatalogDraft(product: any): boolean {
  const category = String(product?.category || product?.department || '').trim().toLowerCase();
  const peau = category === SKIN_CATALOG_CATEGORY || estProduitPeau(product || {});
  if (!peau) return false;
  if (catalogDraftIsPublic(product)) return false;
  const status = String(product?.catalogStatus ?? product?.catalog_status ?? 'draft').toLowerCase();
  return status === 'draft' || status === 'pending_review';
}

export function selectSkinCatalogDrafts(products: any[]): any[] {
  return (products || []).filter(isSkinCatalogDraft);
}
