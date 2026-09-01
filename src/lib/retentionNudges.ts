/**
 * BOUCLE DE DONNÉES — calcul des relances (nudges) de rétention.
 *
 * Trois déclencheurs qui allument la boucle PROFILE → RECOMMEND → USE →
 * FEEDBACK → RESULT → LEARN :
 *
 *  1. **Feedback J+14** : un produit ajouté à l'étagère (en cours) depuis au
 *     moins 14 jours n'a pas encore de retour. On demande « ça se passe
 *     comment ? ». C'est la collecte d'`outcome_observations`, le carburant du
 *     moteur.
 *  2. **Wash day dû** : le dernier lavage remonte à au moins l'intervalle
 *     déclaré par l'utilisateur. Le rappel colle au cycle réel, pas à un matin
 *     générique.
 *  3. **Coiffure protectrice à retirer** : une coiffure ouverte approche ou
 *     dépasse sa durée maximale de port (et/ou signale une tension forte).
 *     C'est le levier anti-alopécie de traction.
 *
 * Ce module est **pur** : il prend des données et une date « maintenant », il
 * renvoie des nuds. Il n'envoie rien, n'écrit rien. L'orchestrateur (route) se
 * charge de les matérialiser en notifications, avec dédoublonnage. Aucune
 * donnée n'est inventée : un signal absent ne produit pas de nud.
 */

export type NudgeKind =
  | 'outcome_feedback'
  | 'wash_day_due'
  | 'protective_style_removal'
  | 'review_request'
  | 'reorder_reminder';

export interface NudgeShelfItem {
  id: string;
  freeLabel?: string;
  productId?: string;
  status?: string;
  createdAt?: string;
}

export interface NudgeWashCycle {
  intervalDays: number;
  lastWashDayAt?: string | null;
}

export interface NudgeProtectiveEpisode {
  id: string;
  style?: string;
  tension?: string;
  installedAt: string;
  plannedRemovalAt?: string | null;
  removedAt?: string | null;
  maxWearDays?: number;
  lastSignalAt?: string | null;
  signals?: string[];
}

export interface NudgeObservation {
  shelfItemId?: string;
  productId?: string;
}

/**
 * Commande payée, aplatie pour le calcul. On n'expose ici que les champs
 * nécessaires à la relance : identifiants produits, dates et statut.
 */
export interface NudgeOrder {
  id: string;
  /** Statut de commande ; seuls les statuts payés ouvrent une relance. */
  status?: string;
  /** Date ISO de la commande (ou de sa mise à jour). */
  createdAt?: string;
  updatedAt?: string;
  /** Articles achetés (produits, hors kits détaillés à la main si besoin). */
  items: Array<{
    productId?: string;
    name?: string;
    slug?: string;
    quantity?: number;
    /** Les soins consommables (shampoing, leave-in…) sont à racheter. */
    repurchase?: boolean;
  }>;
}

/** Avis produits déjà déposés par l'utilisateur (pour ne pas re-demander). */
export interface NudgeReview {
  productId?: string;
}

export interface NudgeInput {
  userId: string;
  shelf: NudgeShelfItem[];
  washCycle?: NudgeWashCycle | null;
  protectiveEpisodes?: NudgeProtectiveEpisode[];
  /** Observations déjà collectées : on ne redemande pas un retour déjà fait. */
  observations?: NudgeObservation[];
  /** Commandes payées : relances commerciales (avis + réassort). */
  orders?: NudgeOrder[];
  /** Avis produits déjà rédigés : ne pas redemander un avis sur ce produit. */
  productReviews?: NudgeReview[];
  /** Décalage en jours avant la date max de port pour commencer à alerter. */
  protectiveWarnBeforeDays?: number;
}

export interface Nudge {
  kind: NudgeKind;
  /** Clé de dédoublonnage stable : un même nud n'est créé qu'une fois. */
  dedupeKey: string;
  title: string;
  message: string;
  link: string;
  /** Donnée associée (produit, épisode…) pour l'écran de destination. */
  refId?: string;
}

/** Délai avant de demander un retour sur un produit utilisé. */
export const OUTCOME_FEEDBACK_AFTER_DAYS = 14;
/** On ne redemande pas un retour sur le même produit avant ce délai. */
export const OUTCOME_FEEDBACK_REPEAT_DAYS = 28;
/**
 * RELANCES COMMERCIALES (clients connectés ayant commandé).
 * Délai après commande/statut de livraison avant de demander un avis produit.
 */
export const REVIEW_REQUEST_AFTER_DAYS = 7;
/** À partir de combien de jours un soin consommable est considéré à racheter. */
export const REORDER_MIN_DAYS = 45;
/** Jusqu'à combien de jours on propose le réassort (après, c'est une perte sèche). */
export const REORDER_MAX_DAYS = 110;

/** Statuts représentant une commande effectivement payée. */
const PAID_STATUSES = new Set(['paid', 'processing', 'packed', 'shipped', 'delivered']);

function dateOf(order: NudgeOrder): string | undefined {
  // La mise à jour de statut (livraison) est un meilleur point de départ que
  // la création, mais on retombe sur la création si elle est absente.
  return order.updatedAt || order.createdAt;
}

function orderLineOf(order: NudgeOrder, productId: string) {
  return order.items.find((it) => it.productId === productId);
}

/**
 * Relances commerciales : demande d'avis (J+7) et réassort (J+45..110) pour
 * les clients connectés. Pur et déterministe : mêmes données à même date →
 * mêmes nudges. Une ligne déjà commandée à nouveau (réachat) coupe la relance.
 */
function pushCommercialNudges(input: NudgeInput, now: Date, nudges: Nudge[]): void {
  // Seules les commandes payées ouvrent une relance (jamais un panier ou un
  // paiement échoué). Le statut est porté par le store (champ `status`).
  const orders = (input.orders ?? []).filter((o) => dateOf(o) && PAID_STATUSES.has((o as any).status || 'paid'));
  if (orders.length === 0) return;

  const reviewedProducts = new Set((input.productReviews ?? []).map((r) => r.productId).filter(Boolean));

  // Lignes achetées (commandes payées) avec la date de la commande porteuse.
  type Line = { productId: string; name: string; slug?: string; repurchase: boolean; date: string };
  const lines: Line[] = [];
  for (const order of orders) {
    const iso = dateOf(order);
    if (!iso) continue;
    for (const item of order.items ?? []) {
      if (!item.productId) continue;
      lines.push({
        productId: item.productId,
        name: item.name || 'votre soin',
        slug: item.slug,
        repurchase: item.repurchase === true,
        date: iso,
      });
    }
  }
  if (lines.length === 0) return;

  // Date de la commande la plus RÉCENTE par produit : si le client a racheté
  // après, on relance à partir de la nouvelle date (pas l'ancienne).
  const lastByProduct = new Map<string, Line>();
  for (const line of lines) {
    const current = lastByProduct.get(line.productId);
    if (!current || new Date(line.date).getTime() > new Date(current.date).getTime()) {
      lastByProduct.set(line.productId, line);
    }
  }

  for (const [productId, line] of lastByProduct.entries()) {
    const ageDays = daysBetween(line.date, now);
    const productLink = line.slug ? `/produit/${line.slug}#avis` : '/mon-compte/commandes';
    const shopLink = line.slug ? `/produit/${line.slug}` : '/boutique';

    // 1) Demande d'avis J+7 si jamais rédigé (fenêtre d'un mois).
    if (!reviewedProducts.has(productId) && ageDays >= REVIEW_REQUEST_AFTER_DAYS && ageDays <= REVIEW_REQUEST_AFTER_DAYS + 30) {
      nudges.push({
        kind: 'review_request',
        dedupeKey: `nudge:review:${input.userId}:${productId}`,
        title: 'Votre avis compte',
        message: `Vous utilisez « ${line.name} » depuis plus d'une semaine. Quelques mots honnêtes sur votre expérience ? Votre avis vérifié aide d'autres cheveux texturés à se lancer en confiance.`,
        link: productLink,
        refId: productId,
      });
    }

    // 2) Réassort des soins consommables (fenêtre J+45 à J+110).
    if (line.repurchase && ageDays >= REORDER_MIN_DAYS && ageDays <= REORDER_MAX_DAYS) {
      nudges.push({
        kind: 'reorder_reminder',
        dedupeKey: `nudge:reorder:${input.userId}:${productId}:${Math.floor(ageDays / 30)}`,
        title: 'Bientôt le moment de refaire le plein ?',
        message: `Selon votre rythme d'utilisation, « ${line.name} » pourrait bientôt arriver à épuisement. En précommande, réservez-le pour l'expédier dès réception du prochain lot.`,
        link: shopLink,
        refId: productId,
      });
    }
  }
}

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(fromIso);
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

function labelOf(item: NudgeShelfItem): string {
  return item.freeLabel?.trim() || 'ce produit';
}

/**
 * Calcule les nuds actifs à une date donnée. Prévisible : la même entrée à la
 * même date renvoie exactement le même résultat.
 */
export function computeNudges(input: NudgeInput, now: Date = new Date()): Nudge[] {
  const nudges: Nudge[] = [];
  const warnBefore = input.protectiveWarnBeforeDays ?? 7;

  // 1) Feedback J+14 sur les produits en cours d'usage.
  const active = input.shelf.filter(
    (item) => (item.status ?? 'in_use') === 'in_use' && item.createdAt
  );
  const observedShelf = new Set(
    (input.observations ?? []).map((o) => o.shelfItemId).filter(Boolean)
  );

  for (const item of active) {
    if (!item.createdAt) continue;
    if (item.id && observedShelf.has(item.id)) continue;
    const age = daysBetween(item.createdAt, now);
    if (age < OUTCOME_FEEDBACK_AFTER_DAYS) continue;
    nudges.push({
      kind: 'outcome_feedback',
      dedupeKey: `nudge:outcome:${input.userId}:${item.id}:${Math.floor(age / OUTCOME_FEEDBACK_REPEAT_DAYS)}`,
      title: 'Comment se passe ta routine ?',
      message: `Cela fait plus de ${OUTCOME_FEEDBACK_AFTER_DAYS} jours que tu utilises « ${labelOf(item)} ». Ton retour aide KURLA à mieux te recommander — et les profils comme toi.`,
      link: '/account/shelf',
      refId: item.id,
    });
  }

  // 2) Wash day dû : dernier lavage + intervalle dépassé.
  if (input.washCycle && input.washCycle.intervalDays > 0) {
    const cycle = input.washCycle;
    if (cycle.lastWashDayAt) {
      const sinceWash = daysBetween(cycle.lastWashDayAt, now);
      if (sinceWash >= cycle.intervalDays) {
        const overdueDays = Math.floor(sinceWash - cycle.intervalDays);
        nudges.push({
          kind: 'wash_day_due',
          dedupeKey: `nudge:washday:${input.userId}:${cycle.lastWashDayAt.slice(0, 10)}`,
          title: 'C’est peut-être le jour du wash day',
          message:
            overdueDays <= 0
              ? `Ton intervalle de lavage (${cycle.intervalDays} jours) est atteint. Prête à planifier ton wash day ?`
              : `Ton dernier wash day remonte à ${Math.floor(sinceWash)} jours (${overdueDays} jour${overdueDays > 1 ? 's' : ''} après ton intervalle de ${cycle.intervalDays}).`,
          link: '/wash-day',
        });
      }
    }
  }

  // 3) Coiffure protectrice à retirer (approche ou dépassement de durée).
  for (const episode of input.protectiveEpisodes ?? []) {
    if (episode.removedAt) continue;
    const ageDays = daysBetween(episode.installedAt, now);
    const maxDays = episode.maxWearDays && episode.maxWearDays > 0 ? episode.maxWearDays : 56;

    const signals = episode.signals ?? [];
    const tightTension = episode.tension === 'tight' || episode.tension === 'firm';
    const painSignal = signals.some((s) => /pain|douleur|traction|tension|bouton|demange|itch/i.test(s));
    const dueByAge = ageDays >= maxDays - warnBefore;
    const overdue = ageDays >= maxDays;

    if (dueByAge || tightTension || painSignal) {
      const reason = overdue
        ? `Ta coiffure « ${episode.style || 'protectrice'} » a dépassé sa durée de port recommandée (${maxDays} jours).`
        : painSignal
          ? `Tu as signalé de la tension ou des démangeaisons sur ta coiffure « ${episode.style || 'protectrice'} ».`
          : tightTension
            ? `Ta coiffure « ${episode.style || 'protectrice'} » est tendue et approche de sa durée max : la tension prolongée fragilise les tempes.`
            : `Ta coiffure « ${episode.style || 'protectrice'} » approche de sa durée de port maximale (${maxDays} jours).`;

      nudges.push({
        kind: 'protective_style_removal',
        dedupeKey: `nudge:protectivestyle:${input.userId}:${episode.id}:${Math.floor(ageDays / 7)}`,
        title: overdue ? 'Il est temps de retirer ta coiffure' : 'Pense à planifier le retrait',
        message: `${reason} Planifie le retrait et un soin de récupération pour protéger tes bords.`,
        link: '/protective-timeline',
        refId: episode.id,
      });
    }
  }

  // Relances commerciales (clients ayant commandé) : avis J+7 et réassort.
  pushCommercialNudges(input, now, nudges);

  return nudges;
}
