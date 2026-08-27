/**
 * INTELLIGENCE DES RETOURS
 *
 * Un retour est une donnée négative, donc plus informative qu'un avis : les
 * avis viennent des acheteurs satisfaits, les retours viennent des déçus.
 * Aucun détaillant beauté n'exploite cette donnée. KURLA la possède déjà dans
 * `returns`, elle ne l'exploitait pas.
 */

import { AbandonmentReason, ABANDONMENT_LABELS, isAbandonmentReason } from './shelf';

export type ReturnInsightReason =
  | 'texture_mismatch'
  | 'too_heavy'
  | 'too_light'
  | 'fragrance'
  | 'reaction'
  | 'ineffective'
  | 'too_expensive'
  | 'changed_mind'
  | 'damaged'
  | 'other';

export const RETURN_INSIGHT_REASONS: ReturnInsightReason[] = [
  'texture_mismatch', 'too_heavy', 'too_light', 'fragrance', 'reaction',
  'ineffective', 'too_expensive', 'changed_mind', 'damaged', 'other'
];

/**
 * Raisons qui portent une information produit exploitable. Un colis endommagé
 * ou un changement d'avis n'apprennent rien sur la formulation.
 */
export const FORMULATION_INFORMATIVE_REASONS: ReturnInsightReason[] = [
  'texture_mismatch', 'too_heavy', 'too_light', 'fragrance', 'reaction', 'ineffective'
];

export function isReturnInsightReason(value: unknown): value is ReturnInsightReason {
  return typeof value === 'string' && (RETURN_INSIGHT_REASONS as string[]).includes(value);
}

/** Un motif de retour et un motif d'abandon partagent le même vocabulaire : une seule taxonomie, pas deux. */
export function toAbandonmentReason(reason: ReturnInsightReason): AbandonmentReason {
  return isAbandonmentReason(reason) ? reason : 'other';
}

export interface ReturnInsightRecord {
  returnId: string;
  orderId: string;
  productId?: string;
  ingredientSuspected?: string;
  archetypeId?: string;
  reason: ReturnInsightReason;
  textureMismatch: boolean;
  isShared: boolean;
  createdAt: string;
}

export interface ReturnInsightSummary {
  productId: string;
  totalReturns: number;
  informativeReturns: number;
  topReasons: { reason: ReturnInsightReason; label: string; count: number; share: number }[];
  /** Signalement destiné à l'équipe catalogue, pas à l'utilisateur. */
  catalogAlert?: string;
  archetypeHotspots: { archetypeId: string; count: number; dominantReason: ReturnInsightReason }[];
  limitations: string[];
}

/**
 * Résume les retours d'un produit. Deux garde-fous :
 *  - un taux de retour n'a de sens que rapporté au volume vendu, donc il n'est
 *    jamais affiché seul ;
 *  - une raison dominante sur trois retours n'est pas un signal.
 */
export function summarizeReturnInsights(
  productId: string,
  records: Iterable<ReturnInsightRecord>,
  options: { minimumInformative?: number; soldQuantity?: number } = {}
): ReturnInsightSummary {
  const minimumInformative = options.minimumInformative ?? 5;
  const list = Array.from(records).filter(record => record.productId === productId);
  const informative = list.filter(record => FORMULATION_INFORMATIVE_REASONS.includes(record.reason));

  const counts = new Map<ReturnInsightReason, number>();
  for (const record of informative) counts.set(record.reason, (counts.get(record.reason) || 0) + 1);

  const topReasons = Array.from(counts.entries())
    .map(([reason, count]) => ({
      reason,
      label: ABANDONMENT_LABELS[toAbandonmentReason(reason)],
      count,
      share: Number((count / informative.length).toFixed(2))
    }))
    .sort((a, b) => b.count - a.count);

  const byArchetype = new Map<string, { count: number; reasons: Map<ReturnInsightReason, number> }>();
  for (const record of informative) {
    if (!record.archetypeId) continue;
    const entry = byArchetype.get(record.archetypeId) || { count: 0, reasons: new Map<ReturnInsightReason, number>() };
    entry.count += 1;
    entry.reasons.set(record.reason, (entry.reasons.get(record.reason) || 0) + 1);
    byArchetype.set(record.archetypeId, entry);
  }
  const archetypeHotspots = Array.from(byArchetype.entries())
    .filter(([, entry]) => entry.count >= minimumInformative)
    .map(([archetypeId, entry]) => ({
      archetypeId,
      count: entry.count,
      dominantReason: Array.from(entry.reasons.entries()).sort((a, b) => b[1] - a[1])[0][0]
    }))
    .sort((a, b) => b.count - a.count);

  const limitations: string[] = [];
  if (informative.length < minimumInformative) {
    limitations.push(`${informative.length} retour(s) informatif(s), sous le seuil de ${minimumInformative} : aucune conclusion produit n’est tirée.`);
  }
  if (options.soldQuantity === undefined) {
    limitations.push('Volume vendu non fourni : un nombre de retours n’a pas de signification sans base de comparaison.');
  }

  let catalogAlert: string | undefined;
  const dominant = topReasons[0];
  if (dominant && informative.length >= minimumInformative && dominant.share >= 0.5) {
    catalogAlert = `Motif dominant « ${dominant.label.toLowerCase()} » sur ${Math.round(dominant.share * 100)} % des ${informative.length} retours informatifs. La fiche produit devrait expliciter ce point avant achat.`;
  }
  if (archetypeHotspots.length > 0) {
    const hotspot = archetypeHotspots[0];
    catalogAlert = `${catalogAlert ? catalogAlert + ' ' : ''}Concentration de retours sur l’archétype ${hotspot.archetypeId} (${hotspot.count} cas, motif dominant « ${ABANDONMENT_LABELS[toAbandonmentReason(hotspot.dominantReason)].toLowerCase()} ») : la mention « pour qui » de la fiche est probablement trop large.`;
  }

  return {
    productId,
    totalReturns: list.length,
    informativeReturns: informative.length,
    topReasons,
    catalogAlert,
    archetypeHotspots,
    limitations
  };
}

/**
 * Ce que l'utilisateur voit quand il déclare un retour. La question doit être
 * courte : un formulaire long produit des « autre » et détruit la donnée.
 */
export function returnInsightPrompt(): { question: string; options: { value: ReturnInsightReason; label: string }[] } {
  return {
    question: 'Pourquoi ce produit ne vous a pas convenu ? Une réponse suffit, elle nous aide à ne plus le recommander à tort.',
    options: RETURN_INSIGHT_REASONS.map(reason => ({
      value: reason,
      label: reason === 'other' ? 'Autre' : ABANDONMENT_LABELS[toAbandonmentReason(reason)]
    }))
  };
}
