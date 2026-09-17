/**
 * CHANTIER 6 — Workflow sourcing : un vocabulaire, 8 étapes, entonnoir unique.
 *
 * Deux portes, jamais fusionnées dans une colonne magique :
 *   - porte ACHAT  = `sourcing_workflow_events` (8 étapes + refus)
 *   - porte BOUTIQUE = `catalog_status` + `isPublishableProduct` (C1 / C4)
 *
 * Les clés DB ne bougent pas. L'offre et la validation restent des *faits*
 * (C1), pas un 5ᵉ enum. Aucune transition n'écrit `catalog_status`.
 */
import {
  BUSINESS_STAGES,
  BUSINESS_STAGE_LABELS,
  countByStage,
  publiclyListableCount,
  type BusinessStage,
  type UnifiedRecord,
} from './productLifecycle';
import {
  SUPPLY_WORKFLOW_LABELS,
  SUPPLY_WORKFLOW_STATES,
  isSupplyWorkflowState,
  type SupplyWorkflowState,
} from './supplyModel';

/** 8 étapes numérotées. `refused` est à part (reconsidérable). */
export const PURCHASE_STEPS = [
  'identified',
  'supplier_identified',
  'evaluation',
  'validated',
  'approved',
  'ready_to_publish',
  'published',
  'active',
] as const satisfies readonly SupplyWorkflowState[];

export type PurchaseStep = (typeof PURCHASE_STEPS)[number];

export const BOUTIQUE_GATE = 'catalog_status + isPublishableProduct';
export const PURCHASE_GATE = 'sourcing_workflow_events';

export const FUNNEL_VOCABULARY = BUSINESS_STAGE_LABELS;

export function purchaseStepLabel(state: SupplyWorkflowState): string {
  return SUPPLY_WORKFLOW_LABELS[state];
}

/**
 * Un clic « publié » / « actif » sur la porte achat n'ouvre JAMAIS la boutique.
 * La publication réelle reste C4 / catalogGate / isPublishableProduct.
 */
export function workflowPublishesToBoutique(_state?: SupplyWorkflowState | null): false {
  return false;
}

/**
 * Si on n'a QUE l'étape d'achat (pas de fiche), le stade métier C1.
 * `published`/`active` sans ligne `products` restent hors boutique.
 */
export function purchaseHintStage(state: SupplyWorkflowState): BusinessStage {
  if (state === 'refused') return 'refused';
  if (state === 'identified') return 'identified';
  return 'sourcing';
}

export function emptyPurchaseCounts(): Record<SupplyWorkflowState, number> {
  return Object.fromEntries(SUPPLY_WORKFLOW_STATES.map(state => [state, 0])) as Record<SupplyWorkflowState, number>;
}

/**
 * État courant = dernier événement tracé. Sans trace : `identified`, jamais
 * une étape devinée (même règle que le panneau existant).
 */
export function latestPurchaseState(
  events: Array<{ entityId?: string; entity_id?: string; entityType?: string; entity_type?: string; toState?: string; to_state?: string; createdAt?: string; created_at?: string }>,
  entityId: string,
  entityType = 'candidate',
): SupplyWorkflowState {
  const id = String(entityId || '');
  let latest: { at: string; state: string } | null = null;
  for (const event of events) {
    const eventId = String(event.entityId ?? event.entity_id ?? '');
    const type = String(event.entityType ?? event.entity_type ?? entityType);
    if (eventId !== id || type !== entityType) continue;
    const state = String(event.toState ?? event.to_state ?? '');
    const at = String(event.createdAt ?? event.created_at ?? '');
    if (!latest || at > latest.at) latest = { at, state };
  }
  return isSupplyWorkflowState(latest?.state) ? latest.state : 'identified';
}

export type UniqueFunnel = {
  stages: Record<BusinessStage, number>;
  withOffer: number;
  validated: number;
  publicCount: number;
  purchase: Record<SupplyWorkflowState, number>;
  total: number;
};

/**
 * Entonnoir unique = stades C1 (identifié → publié / refusé) + faits offre /
 * validé + sous-piste des 8 étapes d'achat (candidats seulement).
 */
export function buildUniqueFunnel(records: UnifiedRecord[]): UniqueFunnel {
  const list = Array.isArray(records) ? records : [];
  const purchase = emptyPurchaseCounts();
  for (const record of list) {
    if (record.kind !== 'candidate') continue;
    const step = isSupplyWorkflowState(record.purchaseStep) ? record.purchaseStep : 'identified';
    purchase[step] += 1;
  }
  return {
    stages: countByStage(list),
    withOffer: list.filter(record => record.lifecycle.hasOffer).length,
    validated: list.filter(record => record.lifecycle.validated).length,
    publicCount: publiclyListableCount(list),
    purchase,
    total: list.length,
  };
}

export { BUSINESS_STAGES, BUSINESS_STAGE_LABELS, SUPPLY_WORKFLOW_LABELS, SUPPLY_WORKFLOW_STATES };
