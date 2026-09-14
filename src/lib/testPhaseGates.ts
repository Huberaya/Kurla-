/**
 * Phase de test (14/09/2026) — les 4 gardes-fous demandés par l'exploitant.
 *
 * Pour chaque fiche de la phase de test (fiches sourcing `src-*` et fiches
 * test `peau-test-*`), l'administration doit voir nommément :
 *
 * ① Autorisation fournisseur écrite   → supplier_authorization_status
 * ② INCI complète vérifiée             → ingredient_verification_status + contenu
 * ③ CPNP + personne responsable UE     → cosmeticCompliance (CPSR + CPNP + PR)
 * ④ Visuel autorisé                    → image_ownership_status + images_validation_status
 *
 * Fonction PURE (aucun accès base) : le contexte CPNP (documents tenus/expirés,
 * vérification fournisseur) est injecté par `getTestPhaseGatesReport`
 * (catalogStore), et le banc `kurla_test_phase_gates` verrouille les contrats.
 *
 * Ces 4 gardes-fous sont la VUE simplifiée de la porte de publication réelle
 * (`evaluateCatalogPublicationReadiness` + conformité cosmétique + readiness
 * de sourcing). Ils répondent à « cette fiche peut-elle devenir une
 * publication réelle ? » ; la porte de publication reste la seule source de
 * vérité à l'écriture (`updateCatalogStatus` refuse tant qu'elle n'est pas
 * prête) — les 4 gardes verts n'autorisent jamais à eux seuls la publication.
 */

import { COSMETIC_DOC_LABELS, evaluateCosmeticCompliance, requiresCpnp } from './cosmeticCompliance';

export type TestPhaseGateId = 'supplier_authorization' | 'inci' | 'cpnp' | 'visual';

export type TestPhaseGate = {
  id: TestPhaseGateId;
  label: string;
  ok: boolean;
  detail: string;
};

export type TestPhaseGates = {
  productId: string;
  gates: TestPhaseGate[];
  /** Les 4 gardes-fous au vert. N'implique PAS « publiable » (voir en-tête). */
  ready: boolean;
  missingGates: TestPhaseGateId[];
};

const AUTHORIZATION_LABELS: Record<string, string> = {
  not_contacted: 'fournisseur non contacté',
  contacted: 'contacté — autorisation écrite attendue',
  pending: 'demande en cours — pas de réponse',
  authorized: 'autorisé',
  refused: 'refusé',
};

function readBoth(product: any, snakeKey: string): unknown {
  const camelKey = snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  if (product?.[camelKey] !== undefined) return product[camelKey];
  return product?.[snakeKey];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function evaluateTestPhaseGates(
  product: any,
  context: {
    heldTypes?: string[];
    expiredTypes?: string[];
    supplierVerificationStatus?: string;
  } = {}
): TestPhaseGates {
  const productId = String(product?.id ?? product?.productId ?? '');

  // ① Autorisation fournisseur écrite — « authorized » ET date (la contrainte
  // de cohérence produits_authorization_date_coherence exige la date).
  const authorization = text(readBoth(product, 'supplier_authorization_status'));
  const authorizationDate = readBoth(product, 'supplier_authorization_date');
  const hasDate = typeof authorizationDate === 'string'
    ? authorizationDate.trim() !== ''
    : authorizationDate != null;
  const supplierOk = authorization === 'authorized' && hasDate;
  const supplierGate: TestPhaseGate = {
    id: 'supplier_authorization',
    label: 'Autorisation fournisseur écrite',
    ok: supplierOk,
    detail: supplierOk
      ? `autorisée — date ${String(authorizationDate).slice(0, 10)}`
      : AUTHORIZATION_LABELS[authorization] ?? `statut « ${authorization || 'absent'} »`,
  };

  // ② INCI complète vérifiée — statut « verified » ET composition non vide.
  const inciStatus = text(readBoth(product, 'ingredient_verification_status'));
  const hasComposition =
    text(readBoth(product, 'inci')).length > 0
    || (Array.isArray(product?.ingredients) && product.ingredients.length > 0)
    || (Array.isArray(product?.keyIngredients) && product.keyIngredients.length > 0);
  const inciOk = inciStatus === 'verified' && hasComposition;
  const inciGate: TestPhaseGate = {
    id: 'inci',
    label: 'INCI complète vérifiée',
    ok: inciOk,
    detail: !hasComposition
      ? 'INCI non reçue'
      : inciStatus === 'verified'
        ? 'INCI complète et vérifiée'
        : `statut de vérification « ${inciStatus || 'absent'} »`,
  };

  // ③ CPNP + personne responsable UE — la conformité cosmétique existe déjà
  // (CPSR + notification CPNP + Personne Responsable, avec pièces datées).
  //
  // Règle FAIL-CLOSED du garde-fou : une fiche cosmétique dont la composition
  // n'est pas encore reçue n'est PAS exemptée — l'absence d'INCI est
  // précisément la raison du garde. L'heuristique `requiresCpnp` traite un
  // produit SANS composition connue comme non cosmétique (accessoire) ;
  // ici, toute catégorie non accessoire/kit (peau, cheveux, …) est donc
  // traitée comme cosmétique tant que le contraire n'est pas prouvé.
  // Accessoires et kits : non applicable (leurs composants portent la
  // conformité, jamais bloquants ici).
  const category = text(readBoth(product, 'category')) || text(product?.department);
  const isAccessoryOrKit = ['accessoire', 'accessoires', 'kit', 'kits'].includes(category);
  const needsCpnp = !isAccessoryOrKit && (requiresCpnp(product) || !hasComposition);
  const evalCpnp = needsCpnp
    ? evaluateCosmeticCompliance(
      product,
      context.heldTypes ?? [],
      context.expiredTypes ?? [],
      context.supplierVerificationStatus
    )
    : null;
  // `evaluateCosmeticCompliance` re-juge « non cosmétique » (composition
  // inconnue) et renverrait `compliant: true` par défaut — ce verdit
  // d'absence de preuve est refusé ici : le CPNP est requis et le dossier
  // n'est pas au complet.
  const verdictSansPreuve = evalCpnp !== null && evalCpnp.requiresCpnp === false;
  const cpnpOk = !needsCpnp || (evalCpnp !== null && !verdictSansPreuve && evalCpnp.compliant);
  const missingDocs = (evalCpnp?.missing ?? [])
    .map(item => COSMETIC_DOC_LABELS[item.field.replace('supplier_document:', '')] || item.label)
    .filter((value, index, all) => all.indexOf(value) === index);
  const cpnpGate: TestPhaseGate = {
    id: 'cpnp',
    label: 'CPNP + personne responsable UE',
    ok: cpnpOk,
    detail: !needsCpnp
      ? 'non applicable — accessoire ou kit'
      : verdictSansPreuve
        ? 'composition non reçue — dossier CPNP non opposable (documents absents)'
        : evalCpnp?.compliant
          ? 'CPSR + notification CPNP + personne responsable au dossier'
          : `manquant : ${missingDocs.join(', ')}`,
  };

  // ④ Visuel autorisé — propriété établie (brand_provided/licensed) ET
  // validation « verified ». C'est le maillon que l'accord écrit du point 9
  // des emails fournisseurs viendra fermer.
  const ownership = text(readBoth(product, 'image_ownership_status'));
  const validation = text(readBoth(product, 'images_validation_status'));
  const visualOk = ['brand_provided', 'licensed'].includes(ownership) && validation === 'verified';
  const visualGate: TestPhaseGate = {
    id: 'visual',
    label: 'Visuel autorisé',
    ok: visualOk,
    detail: visualOk
      ? 'visuel autorisé (propriété + validation)'
      : ownership === 'unverified'
        ? 'visuel repéré sur la plateforme marque — autorisation écrite attendue'
        : `propriété « ${ownership || 'absent'} » · validation « ${validation || 'absent'} »`,
  };

  const gates = [supplierGate, inciGate, cpnpGate, visualGate];
  const missingGates = gates.filter(gate => !gate.ok).map(gate => gate.id);
  return { productId, gates, ready: missingGates.length === 0, missingGates };
}
