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
import { classifyDerogation, type DerogationRow } from './derogations';

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

export function evaluateGateProposals(products: any[], derogations?: DerogationRow[] | null, now: Date = new Date()): GateProposal[] {
  const proposals: GateProposal[] = [];
  const byProduct = new Map((derogations || []).map(d => [String(d.productId), d]));
  for (const product of products || []) {
    const id = String(product?.id || '');
    if (!id) continue;
    const status = String(readField(product, 'catalogStatus') || 'draft');
    if (status === 'unavailable') continue; // retirée volontairement : la porte n'y touche pas
    const testListing = isTestListingFlag(product);
    const ready = evaluateKurlaReady(product);
    const derogation = byProduct.get(id);
    const derogationState = derogation ? classifyDerogation(derogation.expiresAt, now) : null;
    // Une dérogation ACTIVE (ou bientôt expirée) protège la fiche du retrait :
    // c'est un choix d'exploitant daté. Expirée, la protection tombe.
    const protectedByDerogation = derogationState === 'active' || derogationState === 'expiring_soon';

    if (status === 'published' && ready.state === 'blocked' && !protectedByDerogation) {
      const expiry = derogationState === 'expired' ? ` (dérogation expirée le ${new Date(derogation!.expiresAt).toLocaleDateString('fr-FR')})` : '';
      proposals.push({
        productId: id,
        name: String(product?.name || id),
        action: 'withdraw',
        score: ready.score,
        reason: `non conforme${expiry} : ${ready.hardBlockers.join(' · ')}`,
      });
      continue;
    }
    // Ne jamais publier d'office une fiche sous dérogation : elle est en
    // vitrine par choix, pas parce qu'elle satisfait les critères.
    if (status !== 'published' && ready.state === 'ready' && !testListing && !derogation) {
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
