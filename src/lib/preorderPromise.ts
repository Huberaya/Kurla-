/**
 * Promesse d'expédition en précommande — source unique.
 *
 * Pourquoi ce fichier : la même phrase était recopiée, avec des variantes, dans
 * une douzaine d'endroits — fiche produit, panier, boutique, suivi de commande,
 * relance de panier abandonné, e-mails et CGV. Deux conséquences concrètes :
 *
 *  1. **Le texte ne pouvait pas être corrigé.** Changer la promesse supposait
 *     de retrouver les douze occurrences à la main ; une seule oubliée, et le
 *     site se contredit lui-même.
 *  2. **Les CGV promettaient quelque chose que le site ne fait pas.** Elles
 *     annoncent « un délai indicatif figure sur chaque fiche produit » — aucune
 *     fiche produit n'affiche de délai, indicatif ou non. Une clause des CGV
 *     qui décrit une fonctionnalité absente n'est pas un détail de rédaction.
 *
 * Ce module ne contient **aucune date inventée**. Tant que `ANNOUNCED_AT`
 * reste `null`, le texte affiché énonce le droit de la cliente — le délai
 * légal — au lieu d'annoncer une échéance que KURLA ne maîtrise pas. Une date
 * annoncée serait un engagement : elle ne se met qu'ici, et seulement quand
 * elle est réelle.
 */

/**
 * Date d'expédition annoncée, au format ISO `AAAA-MM-JJ`.
 *
 * `null` = la date n'est pas encore connue. C'est la situation actuelle, et
 * elle est assumée : mieux vaut énoncer le délai légal que promettre une
 * échéance qu'on ne tiendra pas. Renseigner cette date suffit à mettre à jour
 * les douze emplacements.
 */
export const ANNOUNCED_AT: string | null = null;

/**
 * Délai maximum annoncé, en jours à compter de la commande.
 * `null` = aucun délai annoncé ; le droit commun s'applique.
 */
export const ANNOUNCED_MAX_DAYS: number | null = null;

/**
 * Délai légal de livraison à défaut de date convenue (jours).
 *
 * Article L216-1 du code de la consommation : le professionnel livre dans les
 * trente jours suivant la conclusion du contrat lorsqu'aucune date n'a été
 * convenue. Cette obligation existe déjà, que le site l'écrive ou non —
 * l'énoncer n'engage à rien de plus, et informe la cliente d'un droit qu'elle
 * a de toute façon.
 */
export const LEGAL_MAX_DAYS = 30;

export type DispatchPromiseKind = 'dated' | 'delayed' | 'legal';

export interface DispatchPromise {
  kind: DispatchPromiseKind;
  /** Formulation courte, pour un badge ou une ligne de panier. */
  short: string;
  /** Phrase complète, pour un encart d'information précontractuelle. */
  sentence: string;
  /** Rappel du droit applicable. Toujours affiché : c'est le plancher. */
  legal: string;
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatDispatchDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return dateFormatter.format(parsed);
}

/** Vrai si la chaîne est une date ISO `AAAA-MM-JJ` réellement existante. */
export function isValidDispatchDate(iso: unknown): iso is string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso;
}

/**
 * La promesse, calculée une seule fois.
 *
 * `legal` est toujours renvoyé et doit toujours être affiché : c'est le
 * plancher, indépendant de ce que KURLA annonce par ailleurs.
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
 * Clause CGV « signalement de la précommande ».
 *
 * L'ancienne version citait la mention « Expédié à la réception du premier
 * lot » mot pour mot : le jour où la formulation change, les CGV se mettent à
 * décrire un texte qui n'existe plus. La clause est désormais générée.
 */
export function preorderCgvNotice(): string {
  return (
    `• Les produits en précommande sont signalés par un badge « Précommande » sur leur fiche, ` +
    `dans le panier et sur le récapitulatif avant paiement, acompte compris.`
  );
}

/**
 * Clause CGV « délai de précommande ».
 *
 * Deux défauts corrigés ici :
 *
 *  1. L'ancienne clause annonçait « un délai indicatif figure sur chaque fiche
 *     produit ». Aucune fiche produit n'affiche de délai : les CGV décrivaient
 *     une fonctionnalité absente.
 *  2. Elle fixait l'échéance à « 30 jours suivant la date de disponibilité
 *     annoncée ». Or aucune date n'est annoncée : le compteur ne démarrait
 *     jamais, et la cliente n'avait en réalité aucune échéance opposable.
 *     L'article L. 216-1 du code de la consommation dit précisément l'inverse —
 *     à défaut de date indiquée, le bien est livré au plus tard trente jours
 *     après la conclusion du contrat. C'est cette règle qui est énoncée.
 */
export function preorderCgvDelay(): string {
  const promise = preorderDispatchPromise();
  const delay =
    promise.kind === 'dated'
      ? `• Délai de précommande : ${promise.sentence}`
      : promise.kind === 'delayed'
        ? `• Délai de précommande : ${promise.sentence}`
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
