/**
 * CHANTIER 8.7 — APPLICATION MOBILE (feature 42).
 *
 * La stratégie justifie cette feature par une phrase : **« le scan et le suivi
 * sont mobiles »**. Ce module ne construit donc pas un magasin d'applications :
 * il construit ce qu'un téléphone exige du produit — une seule requête pour
 * savoir quoi faire aujourd'hui, et une file d'attente qui survive à une
 * coupure de réseau sans jamais rejouer deux fois la même action.
 *
 * ---------------------------------------------------------------------------
 * CE QUI EST NON NÉGOCIABLE
 * ---------------------------------------------------------------------------
 * 1. **Rien n'est inventé.** Sans préférence de lavage, pas d'item lavage. Sans
 *    compte de fidélité, pas d'item fidélité. Une donnée absente produit une
 *    absence, jamais un bouche-trou.
 * 2. **Le brief est une liste courte, pas un backlog.** Cinq items au maximum,
 *    deux invitations à déclarer un résultat au maximum — et le nombre
 *    d'invitations retenues est renvoyé, pas dissimulé.
 * 3. **Aucun item promotionnel.** Les types d'items sont une union fermée : il
 *    n'existe pas de type « promotion », « offre » ou « suggestion d'achat ».
 * 4. **Une action hors ligne se rejoue exactement une fois.** La clé
 *    d'idempotence vient du client, la décision d'application vient du serveur.
 */

// ---------------------------------------------------------------------------
// Brief quotidien
// ---------------------------------------------------------------------------

/**
 * Union fermée. Ajouter un type d'item est une décision de produit, pas un
 * paramètre : c'est volontairement une liste écrite, pas une chaîne libre.
 */
export type BriefingItemKind = 'wash_day' | 'routine_step' | 'outcome_declaration' | 'loyalty_progress';

export const BRIEFING_ITEM_KINDS: BriefingItemKind[] = [
  'wash_day',
  'routine_step',
  'outcome_declaration',
  'loyalty_progress'
];

export interface BriefingItem {
  kind: BriefingItemKind;
  title: string;
  /** Pourquoi cet item est là. Jamais une promesse, toujours un fait déclaré. */
  reason: string;
  href: string;
  priority: number;
}

export interface DailyBriefingInput {
  now: string;
  /** `null` : aucune préférence de lavage enregistrée. */
  washDay: { intervalDays: number; lastWashDayAt?: string | null } | null;
  routineTasks: Array<{ id: string; title: string; scheduledFor: string; status: string }>;
  shelf: Array<{ id: string; label: string; addedAt: string; status: string; hasDeclaredOutcome: boolean }>;
  /** `null` : pas de compte de fidélité. `pointsMissing: null` : niveau maximal. */
  loyalty: { levelLabel: string; pointsMissing: number | null } | null;
}

export interface DailyBriefing {
  items: BriefingItem[];
  generatedAt: string;
  /** Ce qui a été retenu, et pourquoi — le silence n'est pas un oubli. */
  held: { outcomePrompts: number; reason: string | null };
}

export const BRIEFING_MAX_ITEMS = 5;
export const MAX_OUTCOME_PROMPTS = 2;
/**
 * Avant 14 jours d'usage, un résultat déclaré ne veut pas dire grand-chose :
 * demander trop tôt produirait du bruit, pas de l'information.
 */
export const MIN_DAYS_BEFORE_OUTCOME = 14;

const DAY_MS = 86_400_000;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function buildDailyBriefing(input: DailyBriefingInput): DailyBriefing {
  const items: BriefingItem[] = [];
  const nowMs = Date.parse(input.now);

  // --- Jour de lavage ------------------------------------------------------
  if (input.washDay && input.washDay.intervalDays > 0 && input.washDay.lastWashDayAt) {
    const last = Date.parse(input.washDay.lastWashDayAt);
    if (Number.isFinite(last) && Number.isFinite(nowMs)) {
      const dueAt = last + input.washDay.intervalDays * DAY_MS;
      if (dueAt <= nowMs) {
        const overdueDays = Math.floor((nowMs - dueAt) / DAY_MS);
        items.push({
          kind: 'wash_day',
          title: 'Jour de lavage',
          reason:
            overdueDays > 0
              ? `Votre cycle de ${input.washDay.intervalDays} jours est dépassé de ${overdueDays} jour${overdueDays > 1 ? 's' : ''}.`
              : `Votre cycle de ${input.washDay.intervalDays} jours arrive à échéance aujourd’hui.`,
          href: '/wash-day',
          priority: 1
        });
      }
    }
  }

  // --- Étapes de routine du jour -------------------------------------------
  const today = dayKey(input.now);
  const dueTasks = input.routineTasks.filter(
    task => task.status === 'pending' && dayKey(task.scheduledFor) === today
  );
  if (dueTasks.length > 0) {
    items.push({
      kind: 'routine_step',
      title: dueTasks.length === 1 ? dueTasks[0].title : `${dueTasks.length} étapes de routine aujourd’hui`,
      reason: dueTasks.length === 1 ? 'Étape planifiée aujourd’hui, non faite.' : 'Étapes planifiées aujourd’hui, non faites.',
      href: '/routine',
      priority: 2
    });
  }

  // --- Résultats à déclarer ------------------------------------------------
  const awaitingOutcome = input.shelf
    .filter(item => item.status === 'in_use' && !item.hasDeclaredOutcome)
    .filter(item => {
      const added = Date.parse(item.addedAt);
      return Number.isFinite(added) && nowMs - added >= MIN_DAYS_BEFORE_OUTCOME * DAY_MS;
    })
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));

  for (const item of awaitingOutcome.slice(0, MAX_OUTCOME_PROMPTS)) {
    const days = Math.floor((nowMs - Date.parse(item.addedAt)) / DAY_MS);
    items.push({
      kind: 'outcome_declaration',
      title: `Que constatez-vous avec ${item.label} ?`,
      reason: `${days} jours d’usage déclarés, aucun résultat enregistré. Un résultat négatif a la même valeur qu’un positif.`,
      href: '/account/shelf',
      priority: 3
    });
  }

  // --- Progression ---------------------------------------------------------
  if (input.loyalty && input.loyalty.pointsMissing !== null && input.loyalty.pointsMissing > 0) {
    items.push({
      kind: 'loyalty_progress',
      title: `Niveau ${input.loyalty.levelLabel}`,
      reason: `${input.loyalty.pointsMissing} point${input.loyalty.pointsMissing > 1 ? 's' : ''} avant le niveau suivant. Aucun achat n’est nécessaire pour progresser.`,
      href: '/account/loyalty',
      priority: 4
    });
  }

  const held = awaitingOutcome.length - Math.min(awaitingOutcome.length, MAX_OUTCOME_PROMPTS);
  const sorted = items
    .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
    .slice(0, BRIEFING_MAX_ITEMS);

  return {
    items: sorted,
    generatedAt: input.now,
    held: {
      outcomePrompts: held,
      reason: held > 0 ? `Limité à ${MAX_OUTCOME_PROMPTS} invitations pour ne pas transformer le suivi en relance.` : null
    }
  };
}

// ---------------------------------------------------------------------------
// File d'attente hors ligne
// ---------------------------------------------------------------------------

/**
 * Les deux actions du quotidien mobile. Un type non reconnu est **refusé**, pas
 * ignoré : une action silencieusement perdue est une donnée que l'utilisateur
 * croit avoir enregistrée.
 */
export const OFFLINE_ACTION_KINDS = ['scan', 'outcome_declared'] as const;
export type OfflineActionKind = (typeof OFFLINE_ACTION_KINDS)[number];

export const isOfflineActionKind = (value: unknown): value is OfflineActionKind =>
  OFFLINE_ACTION_KINDS.includes(value as OfflineActionKind);

export const OFFLINE_QUEUE_MAX = 200;
export const OFFLINE_ACTION_TTL_DAYS = 30;

export interface OfflineAction {
  /** Clé d'idempotence produite par le client. */
  clientActionId: string;
  kind: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

export interface OfflineQueueDrain {
  /** À rejouer, dans l'ordre de mise en file. */
  ready: OfflineAction[];
  /** Déjà appliquées : le serveur les a reconnues. */
  duplicates: string[];
  /** Trop anciennes : elles ne seront jamais rejouées. */
  expired: OfflineAction[];
  /** Hors limite de taille : les plus anciennes d'abord. */
  evicted: OfflineAction[];
  /** Type d'action inconnu : refusé, jamais ignoré. */
  refused: OfflineAction[];
}

export interface DrainOfflineQueueOptions {
  now: string;
  /** Identifiants clients déjà reconnus par le serveur. */
  ackedClientActionIds?: string[];
  maxSize?: number;
  ttlDays?: number;
}

/**
 * Prépare le rejeu d'une file hors ligne.
 *
 * Ordre de traitement : refus (type inconnu) → doublons (déjà reconnus ou
 * présents deux fois dans la file) → expirés → eviction par la taille → rejeu.
 * Chaque catégorie est renvoyée : rien ne disparaît sans trace.
 */
export function drainOfflineQueue(actions: OfflineAction[], options: DrainOfflineQueueOptions): OfflineQueueDrain {
  const maxSize = options.maxSize ?? OFFLINE_QUEUE_MAX;
  const ttlDays = options.ttlDays ?? OFFLINE_ACTION_TTL_DAYS;
  const nowMs = Date.parse(options.now);
  const acked = new Set(options.ackedClientActionIds ?? []);

  const drain: OfflineQueueDrain = { ready: [], duplicates: [], expired: [], evicted: [], refused: [] };
  const seen = new Set<string>();

  const ordered = [...actions].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));

  for (const action of ordered) {
    if (!isOfflineActionKind(action.kind)) {
      drain.refused.push(action);
      continue;
    }
    if (!action.clientActionId || seen.has(action.clientActionId) || acked.has(action.clientActionId)) {
      drain.duplicates.push(action.clientActionId);
      seen.add(action.clientActionId);
      continue;
    }
    seen.add(action.clientActionId);

    const queuedAt = Date.parse(action.queuedAt);
    if (!Number.isFinite(queuedAt) || nowMs - queuedAt > ttlDays * DAY_MS) {
      drain.expired.push(action);
      continue;
    }
    drain.ready.push(action);
  }

  // La taille se juge sur ce qui reste à rejouer : on évince les plus anciennes.
  if (drain.ready.length > maxSize) {
    const overflow = drain.ready.length - maxSize;
    drain.evicted = drain.ready.slice(0, overflow);
    drain.ready = drain.ready.slice(overflow);
  }

  return drain;
}

/**
 * Ce qu'une application mobile doit afficher quand le réseau manque. Un texte
 * qui promet une synchronisation à venir serait une promesse ; celui-ci constate.
 */
export const OFFLINE_NOTICE =
  'Hors ligne. Vos actions sont conservées sur cet appareil et seront envoyées au retour du réseau, une seule fois chacune.';
