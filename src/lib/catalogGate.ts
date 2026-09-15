/**
 * CHANTIER C4 (15/09/2026) — PORTE DE PUBLICATION.
 *
 * « Une porte, pas un avis » (étude pipeline §2) : la conformité ne se
 * contente pas de s'afficher, elle propose une décision — publier une fiche
 * prête, retirer une fiche devenue non conforme.
 *
 * Deux règles de sûreté non négociables :
 *  1. **Mode proposition par défaut** : `evaluateGateProposals` ne calcule
 *     rien d'autre que des propositions ; l'application est un acte admin
 *     séparé et journalisé.
 *  2. **Jamais de retrait automatique sur une fiche test** : les 42 fiches
 *     `is_test_listing` sont des dérogations assumées par l'exploitant
 *     (gouvernées en C5). Les retirer ici détruirait un choix délibéré —
 *     la porte les ignore en retrait et ne les publie jamais non plus
 *     (elles ne sont de toute façon pas achetables).
 */

import { evaluateKurlaReady } from './kurlaReadyScore';

export type GateAction = 'publish' | 'withdraw';

export type GateProposal = {
  productId: string;
  name: string;
  action: GateAction;
  score: number;
  /** Raison lisible et tracée : ce qui motive la décision. */
  reason: string;
};

function readField(product: any, key: string): any {
  return product?.[key] ?? product?.[key.replace(/([A-Z])/g, '_$1').toLowerCase()];
}

export function isTestListingFlag(product: any): boolean {
  return product?.truth?.isTestListing === true
    || product?.isTestListing === true
    || product?.is_test_listing === true;
}

export function evaluateGateProposals(products: any[]): GateProposal[] {
  const proposals: GateProposal[] = [];
  for (const product of products || []) {
    const id = String(product?.id || '');
    if (!id) continue;
    const status = String(readField(product, 'catalogStatus') || 'draft');
    if (status === 'unavailable') continue; // retirée volontairement : la porte n'y touche pas
    const testListing = isTestListingFlag(product);
    const ready = evaluateKurlaReady(product);

    if (status === 'published' && ready.state === 'blocked' && !testListing) {
      proposals.push({
        productId: id,
        name: String(product?.name || id),
        action: 'withdraw',
        score: ready.score,
        reason: `non conforme : ${ready.hardBlockers.join(' · ')}`,
      });
      continue;
    }
    if (status !== 'published' && ready.state === 'ready' && !testListing) {
      proposals.push({
        productId: id,
        name: String(product?.name || id),
        action: 'publish',
        score: ready.score,
        reason: `prête à publier (score ${ready.score}/100, aucun blocage)`,
      });
    }
  }
  return proposals;
}

export function findProposal(proposals: GateProposal[], productId: string, action: GateAction): GateProposal | null {
  return proposals.find(p => p.productId === productId && p.action === action) || null;
}
