/**
 * AUTO-PUBLICATION — moteur (chantier E, lot 3, « Pipeline de mise en vente »).
 *
 * La machine qui publie seule les fiches prêtes — et rien d'autre.
 *
 * Principe de sécurité (fail-closed, discipline de la plateforme) :
 *   - le plan est une fonction PURE : aucun accès base, aucune écriture.
 *     Ce que le banc fige ici est la loi de la machine ;
 *   - AUCUNE fiche non conforme ne figure jamais dans `eligible` —
 *     une readiness illisible (fiche absente du rapport) est exclue, pas servie ;
 *   - chaque exclusion porte une RAISON NOMMÉE : jamais d'écartement silencieux ;
 *   - le mode `watch` ne publie rien : il dit ce qui deviendrait publié ;
 *   - le rollback ne repart en draft que ce qui est TOUJOURS publié
 *     (un admin a eu le temps de toucher la fiche → elle n'est pas écrasée).
 *
 * Les exclusions (consigne du chantier) :
 *   - fiches de test (`is_test_listing` — le mode ?test=1 de la phase de test),
 *   - kits (fiches « launch-k… » ou catégorie kit : leur publication se pilote
 *     avec le kitting 3PL, pas automatiquement),
 *   - drapeau « publication manuelle » par produit (`manual_publish_only`).
 */
import { SALES_CRITERIA_VERSION } from './salesCriteria';

export type AutoPublishStage = 'off' | 'watch' | 'active';
export const AUTO_PUBLISH_STAGES: AutoPublishStage[] = ['off', 'watch', 'active'];

export const AUTO_PUBLISH_STAGE_LABELS: Record<AutoPublishStage, string> = {
  off: 'éteinte',
  watch: 'surveillance (rien n’est écrit)',
  active: 'active (publie les fiches prêtes)'
};

/** Une ligne du rapport de publication-readiness (formes servies par la route). */
export interface AutoPublishReadinessRow {
  productId: string;
  title: string;
  catalogStatus: string;
  ready: boolean;
  missing: string[];
}

export type AutoPublishExclusionReason =
  | 'fiche_test'
  | 'kit'
  | 'publication_manuelle'
  | 'deja_publiee'
  | 'non_conforme';

export const AUTO_PUBLISH_EXCLUSION_LABELS: Record<AutoPublishExclusionReason, string> = {
  fiche_test: 'fiche de test',
  kit: 'kit',
  publication_manuelle: 'publication manuelle',
  deja_publiee: 'déjà publiée',
  non_conforme: 'non conforme'
};

export interface AutoPublishExclusion {
  productId: string;
  title: string;
  reason: AutoPublishExclusionReason;
  detail: string;
}

export interface AutoPublishEligible {
  productId: string;
  title: string;
}

/**
 * Plan d'une évaluation. C'est l'objet que la route journalise (watch) ou
 * exécute (active) — et que l'admin voit avant de laisser la machine écrire.
 */
export interface AutoPublishPlan {
  batchId: string;
  /** Version de la carte des critères (chantier A) — inscrite à chaque décision. */
  criteriaVersion: string;
  /** Ce qui a déclenché l'évaluation : 'manuel', 'import_csv', … */
  trigger: string;
  evaluatedAt: string;
  eligible: AutoPublishEligible[];
  excluded: AutoPublishExclusion[];
}

/**
 * Kit = fiche de kit (ids « launch-k… ») ou catégorie kit. Même convention que
 * le reste de la plateforme (panier : `id.includes('launch-k') || category === 'kits'`).
 */
export function isKitProduct(product: any): boolean {
  const id = String(product?.id ?? '').toLowerCase();
  const category = String(product?.category || product?.department || '').toLowerCase();
  return id.includes('launch-k') || category === 'kit' || category === 'kits';
}

/** Fiche de test (phase de test : visibles, non vendables) — jamais auto-publiée. */
export function isTestListingProduct(product: any): boolean {
  return product?.is_test_listing === true || product?.isTestListing === true;
}

/** Drapeau par produit « publication manuelle » — l'humain garde la main. */
export function isManualPublishOnly(product: any): boolean {
  return product?.manual_publish_only === true || product?.manualPublishOnly === true;
}

export function autoPublishBatchId(evaluatedAt: string): string {
  return `ap-${evaluatedAt.replace(/[:.]/g, '-')}`;
}

/**
 * Plan d'évaluation. Fonction PURE (aucune base, aucune écriture).
 *
 * Loi de la machine, dans l'ordre (la première raison gagne, toujours nommée) :
 *   1. fiche de test            → exclue,
 *   2. kit                       → exclu,
 *   3. publication manuelle      → exclu,
 *   4. déjà publiée              → non concernée (la machine ne republie pas),
 *   5. non conforme / illisible  → exclue (fail-closed),
 *   6. draft ET tous critères au vert → ÉLIGIBLE.
 */
export function planAutoPublication(
  products: any[],
  readiness: AutoPublishReadinessRow[],
  opts: { trigger: string; evaluatedAt?: string; batchId?: string }
): AutoPublishPlan {
  const evaluatedAt = opts.evaluatedAt || new Date().toISOString();
  const readinessById = new Map(readiness.map(row => [row.productId, row]));
  const eligible: AutoPublishEligible[] = [];
  const excluded: AutoPublishExclusion[] = [];

  for (const product of products) {
    const productId = String(product?.id ?? '');
    if (!productId) continue;
    const title = String(product?.title || product?.name || productId);
    const row = readinessById.get(productId);
    const status = row?.catalogStatus || String(product?.catalog_status || product?.catalogStatus || 'draft');

    if (isTestListingProduct(product)) {
      excluded.push({ productId, title, reason: 'fiche_test', detail: 'fiche de test — jamais publiée automatiquement' });
      continue;
    }
    if (isKitProduct(product)) {
      excluded.push({ productId, title, reason: 'kit', detail: 'kit — publication pilotée avec le kitting, jamais automatique' });
      continue;
    }
    if (isManualPublishOnly(product)) {
      excluded.push({ productId, title, reason: 'publication_manuelle', detail: 'drapeau « publication manuelle » posé sur la fiche' });
      continue;
    }
    if (status === 'published') {
      excluded.push({ productId, title, reason: 'deja_publiee', detail: 'déjà publiée — la machine ne republie pas' });
      continue;
    }
    const missing = row?.missing || [];
    const ready = !!row?.ready && missing.length === 0;
    if (!ready) {
      const detail = missing.length > 0
        ? missing.slice(0, 3).join(' · ') + (missing.length > 3 ? ` · +${missing.length - 3} autre${missing.length - 3 > 1 ? 's' : ''}` : '')
        : 'état de readiness illisible — non publié (fail-closed)';
      excluded.push({ productId, title, reason: 'non_conforme', detail });
      continue;
    }
    eligible.push({ productId, title });
  }

  return {
    batchId: opts.batchId || autoPublishBatchId(evaluatedAt),
    criteriaVersion: SALES_CRITERIA_VERSION,
    trigger: opts.trigger,
    evaluatedAt,
    eligible,
    excluded
  };
}

export interface AutoPublishGateInput {
  /** La politique a pu être lue (table présente). */
  available: boolean;
  /** Les colonnes du chantier E existent (migration appliquée). */
  autoPublishAvailable: boolean;
  stage: AutoPublishStage;
  pausedAt: string | null;
  reason?: string;
}

export interface AutoPublishGateDecision {
  allowed: boolean;
  httpStatus: 200 | 409;
  error?: string;
  detail?: string;
}

/**
 * Porte d'entrée de l'évaluation : la machine refuse de tourner (avec un
 * motif nommé, jamais silencieux) quand la politique est illisible, que la
 * migration est absente, qu'elle est en pause, ou qu'elle est éteinte.
 * Fonction pure — la route la consomme, le banc la fige.
 */
export function evaluateAutoPublishGate(input: AutoPublishGateInput): AutoPublishGateDecision {
  if (!input.available) {
    return { allowed: false, httpStatus: 409, error: 'Politique de publication non lisible — machine non évaluée.', detail: input.reason };
  }
  if (!input.autoPublishAvailable) {
    return { allowed: false, httpStatus: 409, error: 'Colonnes auto-publication absentes — machine off.', detail: 'migration à appliquer : supabase/migrations/20261004000000_auto_publication.sql' };
  }
  if (input.pausedAt) {
    return { allowed: false, httpStatus: 409, error: 'Machine en pause — évaluation refusée.', detail: `pause posée le ${input.pausedAt}` };
  }
  if (input.stage === 'off') {
    return { allowed: false, httpStatus: 409, error: 'Machine éteinte (stage off) — aucune évaluation.' };
  }
  return { allowed: true, httpStatus: 200 };
}

export interface AutoPublishRollbackAction {
  productId: string;
  title: string;
  from: string;
  to: string;
}

/**
 * Plan de rollback d'une vague. Seules les fiches TOUJOURS publiées repartent
 * en draft : ce qu'un admin a dépublié ou republié depuis n'est pas touché,
 * et une vague déjà roulée en arrière n'est pas appliquée deux fois.
 */
export function planAutoPublishRollback(
  products: any[],
  batchProductIds: string[]
): AutoPublishRollbackAction[] {
  const ids = new Set(batchProductIds.map(String).filter(Boolean));
  const actions: AutoPublishRollbackAction[] = [];
  for (const product of products) {
    const productId = String(product?.id ?? '');
    if (!ids.has(productId)) continue;
    const status = String(product?.catalog_status || product?.catalogStatus || '');
    if (status !== 'published') continue;
    actions.push({
      productId,
      title: String(product?.title || product?.name || productId),
      from: 'published',
      to: 'draft'
    });
  }
  return actions;
}
