/**
 * Promesse d'expédition en précommande — source unique.
 *
 * A4 — Année 1 sans stock : la promesse légale à 30j est remplacée par le
 * modèle flux tendu 3–5j (batch lun+jeu + tampon 75u chez 3PL). Les 12 outils
 * best-sellers sont en dropship 24–48h depuis partenaire UE (sans CPNP).
 *
 * Ce module reste la source unique affichée en 12+ endroits — fiche produit,
 * panier, boutique, suivi, emails, CGV. Une seule modif ici met à jour tout.
 */

// ── Import du modèle A4 (liste des 12 outils en 24–48h) ──
import { DROPSHIP_TOOLS_IMMEDIATE, isDropshipToolId } from './fulfillment';

/**
 * Date d'expédition annoncée, au format ISO `AAAA-MM-JJ`.
 * `null` = la date n'est pas encore connue. Conservé pour compatibilité
 * (si une date ponctuelle est fixée, elle prime).
 */
export const ANNOUNCED_AT: string | null = null;

/**
 * Délai maximum annoncé, en jours à compter de la commande.
 * A4 : 5 = "Expédié sous 3–5 jours — petite production hebdomadaire"
 * (batch lun+jeu 18h, tampon 3PL). `null` retombe sur le délai légal 30j.
 */
export const ANNOUNCED_MAX_DAYS: number | null = 5;

/**
 * Délai légal de livraison à défaut de date convenue (jours).
 * Article L216-1 du code de la consommation.
 */
export const LEGAL_MAX_DAYS = 30;

export type DispatchPromiseKind = 'dated' | 'delayed' | 'legal';

export interface DispatchPromise {
  kind: DispatchPromiseKind;
  short: string;
  sentence: string;
  legal: string;
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatDispatchDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return dateFormatter.format(parsed);
}

export function isValidDispatchDate(iso: unknown): iso is string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso;
}

// ── Promesse 24–48h pour les 12 outils dropship (A4) ──
export const TOOL_DISPATCH_SHORT = 'En stock partenaire — expédié en 24–48h';
export const TOOL_DISPATCH_SENTENCE =
  'Outils et accessoires expédiés en 24–48h depuis notre partenaire UE. Si votre panier contient aussi des soins, tout est regroupé en un seul colis via notre 3PL (délai global 3–5 jours).';

export function isDropshipProduct(product: { id: string } | null | undefined): boolean {
  return isDropshipToolId(product?.id || '');
}

export function getProductDispatchPromise(product: { id: string } | null | undefined): DispatchPromise {
  if (isDropshipProduct(product)) {
    return {
      kind: 'delayed',
      short: TOOL_DISPATCH_SHORT,
      sentence: TOOL_DISPATCH_SENTENCE,
      legal: `Délai légal ${LEGAL_MAX_DAYS}j (L216-1) à défaut de date convenue.`,
    };
  }
  return preorderDispatchPromise();
}

export function getProductDispatchShort(product: { id: string } | null | undefined): string {
  return isDropshipProduct(product) ? TOOL_DISPATCH_SHORT : DISPATCH_SHORT;
}

/**
 * La promesse cosmétique / kits (3–5j), calculée une seule fois.
 */
export function preorderDispatchPromise(): DispatchPromise {
  const legal =
    `À défaut de date annoncée, la livraison intervient au plus tard ${LEGAL_MAX_DAYS} jours après ` +
    `votre commande. Passé ce délai, vous pouvez annuler et être remboursée.`;

  if (isValidDispatchDate(ANNOUNCED_AT)) {
    const pretty = formatDispatchDate(ANNOUNCED_AT);
    return {
      kind: 'dated',
      short: `Expédition annoncée le ${pretty}`,
      sentence:
        `Vos soins sont réservés et expédiés le ${pretty}. Vous recevez un e-mail avec le numéro ` +
        `de suivi dès la remise au transporteur.`,
      legal
    };
  }

  if (typeof ANNOUNCED_MAX_DAYS === 'number' && ANNOUNCED_MAX_DAYS > 0) {
    // A4 : 5 jours = formulation "3–5 jours — petite production hebdomadaire"
    if (ANNOUNCED_MAX_DAYS === 5) {
      return {
        kind: 'delayed',
        short: 'Expédié sous 3–5 jours — petite production hebdomadaire',
        sentence:
          'Vos soins sont réservés et expédiés sous 3 à 5 jours (petite production hebdomadaire : batch lundi & jeudi 18h, via 3PL IDF). Vous recevez un e-mail avec le numéro de suivi dès la remise au transporteur.',
        legal
      };
    }
    return {
      kind: 'delayed',
      short: `Expédié sous ${ANNOUNCED_MAX_DAYS} jours`,
      sentence:
        `Vos soins sont réservés et expédiés dans les ${ANNOUNCED_MAX_DAYS} jours suivant votre ` +
        `commande. Vous recevez un e-mail avec le numéro de suivi dès la remise au transporteur.`,
      legal
    };
  }

  return {
    kind: 'legal',
    short: `Expédié sous ${LEGAL_MAX_DAYS} jours maximum (délai légal)`,
    sentence:
      `Vos soins sont réservés et expédiés à la réception du premier lot de production. Aucune date ` +
      `n'étant encore annoncée, la livraison intervient au plus tard ${LEGAL_MAX_DAYS} jours après ` +
      `votre commande.`,
    legal
  };
}

/** Raccourcis pour les emplacements qui n'affichent qu'une ligne. */
export const DISPATCH_SHORT = preorderDispatchPromise().short;
export const DISPATCH_SENTENCE = preorderDispatchPromise().sentence;
export const DISPATCH_LEGAL = preorderDispatchPromise().legal;

/**
 * Préfixe apposé à la description produit.
 */
export const PREORDER_DESCRIPTION_PREFIX = `[PRÉCOMMANDE — ${DISPATCH_SHORT.toLowerCase()}]`;

/** Ancien préfixe, conservé pour la reprise des descriptions déjà publiées. */
export const LEGACY_DESCRIPTION_PREFIX = '[PRÉCOMMANDE — expédition à la réception du premier lot]';

/**
 * Message panier mixte : outils 24–48h + soins 3–5j
 */
export function getCartDispatchSummary(items: Array<{ product: { id: string } }>): string {
  const hasDropship = items.some(i => isDropshipProduct(i.product));
  const hasPreorder = items.some(i => !isDropshipProduct(i.product));
  if (hasDropship && hasPreorder) {
    return 'Panier mixte : outils 24–48h + soins 3–5j — regroupés en 1 seul colis via notre 3PL (délai global 3–5 jours).';
  }
  if (hasDropship) return TOOL_DISPATCH_SENTENCE;
  return DISPATCH_SENTENCE;
}

export function preorderCgvNotice(): string {
  return (
    `• Les produits en précommande sont signalés par un badge « Précommande — 3–5 jours » sur leur fiche, ` +
    `dans le panier et sur le récapitulatif avant paiement, acompte compris. Les 12 outils et accessoires (peigne afro, bonnet satin, etc.) sont signalés « En stock partenaire — 24–48h » et expédiés depuis notre partenaire UE.`
  );
}

export function preorderCgvDelay(): string {
  const promise = preorderDispatchPromise();
  const delay =
    promise.kind === 'dated'
      ? `• Délai de précommande : ${promise.sentence}`
      : promise.kind === 'delayed'
        ? `• Délai soins & kits : ${promise.sentence} Les outils/accessoires (liste des 12) sont expédiés sous 24–48h ; panier mixte = 1 colis, délai global 3–5 jours.`
        : `• Délai de précommande : ${promise.sentence} Aucun délai indicatif n'est affiché sur les ` +
          `fiches produit tant que la date de réception du lot n'est pas connue : plutôt que d'avancer ` +
          `un ordre de grandeur qui n'engagerait à rien et ne protégerait personne, le délai légal ` +
          `s'applique et est rappelé ci-dessous.`;

  return (
    `${delay}\n\n` +
    `• Délai maximal : ${promise.legal} Il s'agit de l'application de l'article L. 216-1 du Code de ` +
    `la consommation, qui fixe l'échéance à trente jours après la conclusion du contrat lorsqu'aucune ` +
    `date de livraison n'a été indiquée à la cliente.\n\n` +
    `• Information à l'expédition : KURLA Beauty informe la cliente par e-mail de l'expédition, avec ` +
    `le numéro de suivi du transporteur.`
  );
}

// Réexport pour compatibilité (anciens imports)
export { DROPSHIP_TOOLS_IMMEDIATE };
