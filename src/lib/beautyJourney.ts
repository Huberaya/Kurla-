import type { BeautyProfileHistoryEntry, BeautyProfilePhoto } from './beautyProfile';
import type { RoutineFeedback, RoutineJournalEntry } from './adaptiveRoutine';

/**
 * CHANTIER 8.4 — BEAUTY JOURNEY : narration de l'évolution.
 *
 * Le constat de départ (stratégie, §« ce qui existe déjà ») : `progress_journal`,
 * `beauty_profile_photos` et `beauty_profile_history` contiennent la matière, mais
 * rien ne la raconte. Ce module est la couche de narration — **aucune donnée
 * nouvelle n'est collectée** : il relit ce que la personne a déjà déclaré et le
 * lui rend lisible.
 *
 * Trois règles de fond, non négociables :
 *   1. **Attribution.** Chaque valeur est une déclaration de la personne, jamais
 *      une mesure. Les phrases le disent (« déclaré », « renseigné par vous »).
 *   2. **Pas de tendance inventée.** Sous trois mesures, ou si l'écart reste dans
 *      le bruit, la tendance est `indetermine` — et le texte l'écrit.
 *   3. **Aucune promesse de résultat, aucun diagnostic.** Une baisse du score de
 *      casse est une baisse déclarée, pas une amélioration constatée.
 *
 * Le module est pur : mêmes entrées, même récit. C'est ce qui le rend testable
 * sans base ni réseau.
 */

export type JourneyMetricKey = 'hydrationScore' | 'breakageScore' | 'comfortScore' | 'detanglingScore';

export interface JourneyLoyaltyEvent {
  kind: string;
  axis: string;
  points: number;
  occurredAt: string;
}

export interface JourneySources {
  journal: RoutineJournalEntry[];
  photos: BeautyProfilePhoto[];
  profileHistory: BeautyProfileHistoryEntry[];
  feedback: RoutineFeedback[];
  loyaltyEvents: JourneyLoyaltyEvent[];
  level: number;
}

export interface JourneyEvent {
  date: string;
  kind: string;
  label: string;
  detail?: string;
}

export interface JourneyMilestone {
  code: string;
  label: string;
  description: string;
  reached: boolean;
  reachedAt: string | null;
}

export interface JourneyMetricPoint {
  date: string;
  value: number;
}

export interface JourneyMetricEvolution {
  metric: JourneyMetricKey;
  label: string;
  points: JourneyMetricPoint[];
  first: JourneyMetricPoint | null;
  last: JourneyMetricPoint | null;
  delta: number | null;
  trend: 'hausse' | 'baisse' | 'stable' | 'indetermine';
  readable: boolean;
}

export interface JourneyComparison {
  before: { id: string; date: string };
  after: { id: string; date: string };
  daysApart: number;
}

export interface BeautyJourney {
  spanDays: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  eventCount: number;
  timeline: JourneyEvent[];
  milestones: JourneyMilestone[];
  evolution: JourneyMetricEvolution[];
  comparison: JourneyComparison | null;
  /**
   * Toutes les paires de photos séparées d'au moins 14 jours, écart décroissant.
   * `comparisons[0]` est donc exactement `comparison` : restreindre cette liste à
   * son premier élément redonne le parcours tel qu'il était avant KURLA+, sans
   * rien enlever.
   */
  comparisons: JourneyComparison[];
  narrative: string[];
  gaps: string[];
  disclaimers: string[];
}

const METRIC_LABELS: Record<JourneyMetricKey, string> = {
  hydrationScore: 'Hydratation',
  breakageScore: 'Casse',
  comfortScore: 'Confort du cuir chevelu',
  detanglingScore: 'Facilité de démêlage'
};

/**
 * Échelle réelle des indicateurs du journal : 1 à 5 — c'est ce que valide
 * `validateRoutineMetrics` côté store. Le récit ne doit pas annoncer une autre
 * échelle que celle des données qu'il décrit.
 */
export const JOURNEY_METRIC_SCALE = 5;

/** En dessous de cet écart (échelle 1-5), on parle de stabilité, pas de tendance. */
const TREND_NOISE_THRESHOLD = 1;
/** En dessous de ce nombre de mesures, aucune tendance n'est calculée. */
const MIN_POINTS_FOR_TREND = 3;
/** Écart minimal, en jours, pour qu'une comparaison de photos ait un sens. */
const MIN_COMPARISON_GAP_DAYS = 14;

export const JOURNEY_DISCLAIMERS = [
  'Ces valeurs sont vos déclarations, pas des mesures cliniques.',
  'Ce parcours n’est pas un avis médical : en cas de chute de cheveux, de douleur ou de lésion du cuir chevelu, consultez un professionnel de santé.'
];

const DAY_MS = 86_400_000;

function dayIndex(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.floor(time / DAY_MS) : 0;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(dayIndex(b) - dayIndex(a));
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : value;
}

function plural(count: number, singular: string, pluralForm?: string): string {
  return count > 1 ? `${count} ${pluralForm ?? `${singular}s`}` : `${count} ${singular}`;
}

const LOYALTY_FACT_LABELS: Record<string, string> = {
  profile_completed: 'Profil beauté complété',
  archetype_known: 'Archétype capillaire identifié',
  routine_preferences: 'Préférences de routine enregistrées',
  routine_task_done: 'Tâche de routine accomplie',
  journal_entry: 'Entrée de journal',
  wash_day_completed: 'Cycle wash day terminé',
  outcome_observed: 'Résultat observé',
  review_verified: 'Avis vérifié publié',
  review_unverified: 'Avis publié',
  question_asked: 'Question posée',
  routine_feedback: 'Retour d’expérience',
  ai_feedback: 'Retour sur l’assistant',
  scan_performed: 'Scan d’un produit ou d’un ingrédient',
  order_paid: 'Commande réglée'
};

/** Chronologie unique, toutes sources confondues, du plus ancien au plus récent. */
function buildTimeline(sources: JourneySources): JourneyEvent[] {
  const events: JourneyEvent[] = [];

  for (const entry of sources.journal) {
    const scores = (Object.keys(METRIC_LABELS) as JourneyMetricKey[])
      .filter(metric => typeof entry[metric] === 'number')
      .map(metric => `${METRIC_LABELS[metric].toLowerCase()} ${entry[metric]}/${JOURNEY_METRIC_SCALE}`);
    events.push({
      date: entry.entryDate,
      kind: 'journal',
      label: 'Observation renseignée',
      detail: scores.length ? scores.join(' · ') : entry.note?.slice(0, 120) || undefined
    });
  }

  for (const photo of sources.photos) {
    events.push({ date: photo.createdAt, kind: 'photo', label: 'Photo ajoutée' });
  }

  for (const entry of sources.profileHistory) {
    events.push({
      date: entry.createdAt,
      kind: 'profil',
      label: 'Profil mis à jour',
      detail: `champs connus : ${entry.confidence.knownFields}/${entry.confidence.totalFields}`
    });
  }

  for (const item of sources.feedback) {
    events.push({
      date: item.observedAt,
      kind: 'retour',
      label: 'Retour d’expérience',
      detail: [item.signal, item.productLabel].filter(Boolean).join(' · ') || undefined
    });
  }

  for (const event of sources.loyaltyEvents) {
    events.push({
      date: event.occurredAt,
      kind: `fait:${event.kind}`,
      label: LOYALTY_FACT_LABELS[event.kind] ?? event.kind
    });
  }

  return events.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

function buildEvolution(journal: RoutineJournalEntry[]): JourneyMetricEvolution[] {
  return (Object.keys(METRIC_LABELS) as JourneyMetricKey[]).map(metric => {
    const points = journal
      .filter(entry => typeof entry[metric] === 'number')
      .map(entry => ({ date: entry.entryDate, value: Number(entry[metric]) }))
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

    const first = points[0] ?? null;
    const last = points.at(-1) ?? null;
    const readable = points.length >= MIN_POINTS_FOR_TREND && !!first && !!last;
    const delta = readable && first && last ? last.value - first.value : null;

    let trend: JourneyMetricEvolution['trend'] = 'indetermine';
    if (delta !== null) {
      if (Math.abs(delta) <= TREND_NOISE_THRESHOLD) trend = 'stable';
      else trend = delta > 0 ? 'hausse' : 'baisse';
    }

    return { metric, label: METRIC_LABELS[metric], points, first, last, delta, trend, readable };
  });
}

function buildComparison(photos: BeautyProfilePhoto[]): JourneyComparison | null {
  if (photos.length < 2) return null;
  const sorted = [...photos].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const before = sorted[0];
  const after = sorted.at(-1)!;
  const daysApart = daysBetween(before.createdAt, after.createdAt);
  if (daysApart < MIN_COMPARISON_GAP_DAYS) return null;
  return {
    before: { id: before.id, date: before.createdAt },
    after: { id: after.id, date: after.createdAt },
    daysApart
  };
}

function buildComparisons(photos: BeautyProfilePhoto[]): JourneyComparison[] {
  if (photos.length < 2) return [];
  const sorted = [...photos].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const pairs: JourneyComparison[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const daysApart = daysBetween(sorted[i].createdAt, sorted[j].createdAt);
      if (daysApart < MIN_COMPARISON_GAP_DAYS) continue;
      pairs.push({
        before: { id: sorted[i].id, date: sorted[i].createdAt },
        after: { id: sorted[j].id, date: sorted[j].createdAt },
        daysApart
      });
    }
  }
  // Écart décroissant : la paire la plus écartée — celle que `buildComparison`
  // retient — arrive en premier.
  return pairs.sort((a, b) => b.daysApart - a.daysApart);
}

function buildMilestones(sources: JourneySources, timeline: JourneyEvent[], comparison: JourneyComparison | null): JourneyMilestone[] {
  const firstEvent = timeline[0];
  const lastEvent = timeline.at(-1);
  const spanDays = firstEvent && lastEvent ? daysBetween(firstEvent.date, lastEvent.date) : 0;

  const firstOf = (predicate: (event: JourneyEvent) => boolean) =>
    timeline.find(predicate)?.date ?? null;

  const tasksDone = sources.loyaltyEvents.filter(event => event.kind === 'routine_task_done').length;
  const observations = sources.journal.length;
  const latestProfile = sources.profileHistory.at(-1);
  const activeDays = new Set(timeline.map(event => event.date.slice(0, 10))).size;

  return [
    {
      code: 'premier_pas',
      label: 'Premier pas',
      description: 'Une première activité enregistrée.',
      reached: !!firstEvent,
      reachedAt: firstEvent?.date ?? null
    },
    {
      code: 'premiere_observation',
      label: 'Première observation',
      description: 'Un premier état des cheveux ou du cuir chevelu renseigné.',
      reached: observations > 0,
      reachedAt: firstOf(event => event.kind === 'journal')
    },
    {
      code: 'premiere_semaine',
      label: 'Première semaine',
      description: 'Au moins trois faits sur sept jours : le départ est réel.',
      reached: !!firstEvent && activeDays >= 3 && spanDays >= 7,
      reachedAt: firstEvent ? firstEvent.date : null
    },
    {
      code: 'trente_jours',
      label: 'Trente jours',
      description: 'Un mois de suivi : assez long pour que l’évolution soit lisible.',
      reached: spanDays >= 30,
      reachedAt: lastEvent?.date ?? null
    },
    {
      code: 'comparaison_possible',
      label: 'Comparaison possible',
      description: `Deux photos à au moins ${MIN_COMPARISON_GAP_DAYS} jours d’écart.`,
      reached: !!comparison,
      reachedAt: comparison?.after.date ?? null
    },
    {
      code: 'profil_complet',
      label: 'Profil complet',
      description: 'Au moins 60 % des champs connus : la personnalisation devient fiable.',
      reached: (latestProfile?.confidence.overall ?? 0) >= 60,
      reachedAt: latestProfile && latestProfile.confidence.overall >= 60 ? latestProfile.createdAt : null
    },
    {
      code: 'routine_tenue',
      label: 'Routine tenue',
      description: 'Douze tâches de routine accomplies.',
      reached: tasksDone >= 12,
      reachedAt: tasksDone >= 12 ? lastEvent?.date ?? null : null
    },
    {
      code: 'niveau_3',
      label: 'Régularité',
      description: 'Niveau 3 de progression atteint.',
      reached: sources.level >= 3,
      reachedAt: sources.level >= 3 ? lastEvent?.date ?? null : null
    }
  ];
}

function buildNarrative(
  sources: JourneySources,
  timeline: JourneyEvent[],
  evolution: JourneyMetricEvolution[],
  comparison: JourneyComparison | null,
  milestones: JourneyMilestone[]
): string[] {
  const sentences: string[] = [];
  const first = timeline[0];
  const last = timeline.at(-1);

  if (!first || !last) {
    sentences.push('Aucune activité enregistrée pour l’instant : le parcours commence au premier diagnostic, à la première photo ou à la première observation.');
    return sentences;
  }

  const span = daysBetween(first.date, last.date);
  sentences.push(
    span === 0
      ? `Votre parcours a commencé aujourd’hui, avec ${plural(timeline.length, 'fait')} enregistré${timeline.length > 1 ? 's' : ''}.`
      : `Votre parcours couvre ${plural(span, 'jour')}, du ${formatDate(first.date)} au ${formatDate(last.date)}.`
  );

  const photos = sources.photos.length;
  const scans = sources.loyaltyEvents.filter(event => event.kind === 'scan_performed').length;
  sentences.push(
    `${plural(timeline.length, 'fait')} au total : ${plural(sources.journal.length, 'observation')}, ` +
      `${plural(photos, 'photo')}, ${plural(sources.feedback.length, 'retour')} et ${plural(scans, 'scan')}.`
  );

  for (const metric of evolution) {
    if (!metric.readable || !metric.first || !metric.last || metric.delta === null) continue;
    const direction =
      metric.trend === 'stable'
        ? 'reste stable'
        : metric.trend === 'hausse'
          ? 'a été déclaré en hausse'
          : 'a été déclaré en baisse';
    sentences.push(
      `${metric.label} : ${direction}, de ${metric.first.value}/${JOURNEY_METRIC_SCALE} à ${metric.last.value}/${JOURNEY_METRIC_SCALE} ` +
        `sur ${plural(metric.points.length, 'mesure')} (${metric.delta > 0 ? '+' : ''}${metric.delta}).`
    );
  }

  const notReadable = evolution.filter(metric => metric.points.length > 0 && !metric.readable);
  if (notReadable.length) {
    sentences.push(
      `Pas encore de tendance pour ${notReadable.map(metric => metric.label.toLowerCase()).join(', ')} : ` +
        `moins de ${MIN_POINTS_FOR_TREND} mesures. Un chiffre isolé ne dit rien.`
    );
  }

  if (comparison) {
    sentences.push(
      `Deux photos permettent une comparaison à ${plural(comparison.daysApart, 'jour')} d’écart ` +
        `(${formatDate(comparison.before.date)} et ${formatDate(comparison.after.date)}).`
    );
  }

  const reached = milestones.filter(milestone => milestone.reached);
  if (reached.length) {
    sentences.push(`Jalons atteints : ${reached.map(milestone => milestone.label.toLowerCase()).join(', ')}.`);
  }

  return sentences;
}

function buildGaps(sources: JourneySources, comparison: JourneyComparison | null, evolution: JourneyMetricEvolution[]): string[] {
  const gaps: string[] = [];
  if (sources.photos.length === 0) gaps.push('Aucune photo : la comparaison visuelle n’est pas possible.');
  else if (!comparison) gaps.push(`Deux photos à au moins ${MIN_COMPARISON_GAP_DAYS} jours d’écart rendraient la comparaison visuelle possible.`);
  if (sources.journal.length === 0) gaps.push('Aucune observation : rien à mettre en évolution pour l’instant.');
  else if (sources.journal.length < MIN_POINTS_FOR_TREND) {
    gaps.push(`${plural(sources.journal.length, 'observation')} seulement : au moins ${MIN_POINTS_FOR_TREND} sont nécessaires pour parler de tendance.`);
  }
  const unreadable = evolution.filter(metric => metric.points.length > 0 && !metric.readable);
  if (unreadable.length) {
    gaps.push(`Mesures incomplètes pour ${unreadable.map(metric => metric.label.toLowerCase()).join(', ')}.`);
  }
  if (sources.profileHistory.length === 0) gaps.push('Aucun profil beauté : les recommandations restent génériques.');
  return gaps;
}

/** Construit le parcours complet à partir de sources déjà collectées. Fonction pure. */
export function buildBeautyJourney(sources: JourneySources): BeautyJourney {
  const timeline = buildTimeline(sources);
  const evolution = buildEvolution(sources.journal);
  const comparison = buildComparison(sources.photos);
  const milestones = buildMilestones(sources, timeline, comparison);
  const narrative = buildNarrative(sources, timeline, evolution, comparison, milestones);

  return {
    spanDays: timeline.length ? daysBetween(timeline[0].date, timeline.at(-1)!.date) : 0,
    firstActivityAt: timeline[0]?.date ?? null,
    lastActivityAt: timeline.at(-1)?.date ?? null,
    eventCount: timeline.length,
    timeline: [...timeline].reverse(),
    milestones,
    evolution,
    comparison,
    comparisons: buildComparisons(sources.photos),
    narrative,
    gaps: buildGaps(sources, comparison, evolution),
    disclaimers: JOURNEY_DISCLAIMERS
  };
}


// ---------------------------------------------------------------------------
// CHANTIER 8.5 — synthèse écrite du parcours (droit KURLA+)
// ---------------------------------------------------------------------------

export interface JourneySynthesisMetric {
  label: string;
  from: number | null;
  to: number | null;
  trend: JourneyMetricEvolution['trend'];
  /** `false` quand le nombre de mesures est insuffisant : la tendance n'est pas affirmée. */
  readable: boolean;
}

export interface JourneySynthesis {
  generatedAt: string;
  periodLabel: string;
  paragraphs: string[];
  metrics: JourneySynthesisMetric[];
  caveats: string[];
}

const TREND_PHRASE: Record<JourneyMetricEvolution['trend'], string> = {
  hausse: 'a été déclaré en hausse',
  baisse: 'a été déclaré en baisse',
  stable: 'est déclaré stable',
  indetermine: 'ne permet pas de dégager de tendance'
};

/**
 * Un texte qui résume ce que le membre a déclaré, et ce qui a bougé — avec ses
 * limites. Chaque valeur y est une déclaration : le verbe le dit (« a été déclaré
 * en hausse »), et une tendance n'est jamais affirmée sous trois mesures.
 *
 * Aucune promesse de résultat, aucun vocabulaire médical : la garde éditoriale de
 * `tests/beauty_journey.test.ts` s'applique aussi à ce texte.
 */
export function buildJourneySynthesis(journey: BeautyJourney, now: Date = new Date()): JourneySynthesis {
  const paragraphs: string[] = [];
  const months = Math.max(1, Math.round(journey.spanDays / 30));

  const counts = journey.timeline.reduce<Record<string, number>>((accumulator, event) => {
    const key = event.kind.startsWith('fait:') ? 'fait' : event.kind;
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
  const readableCounts = Object.entries(counts)
    .map(([kind, count]) => `${count} ${plural(count, kindLabel(kind))}`)
    .join(', ');

  paragraphs.push(
    journey.eventCount === 0
      ? 'Aucune déclaration enregistrée pour l’instant : il n’y a rien à résumer.'
      : `Sur ${plural(months, 'mois')} d’historique, vous avez déclaré ${journey.eventCount} ${plural(journey.eventCount, 'élément')} : ${readableCounts}.`
  );

  const metrics: JourneySynthesisMetric[] = journey.evolution.map(entry => ({
    label: entry.label,
    from: entry.first?.value ?? null,
    to: entry.last?.value ?? null,
    trend: entry.trend,
    readable: entry.readable
  }));

  const readable = journey.evolution.filter(entry => entry.readable && entry.delta !== null);
  if (readable.length === 0) {
    paragraphs.push(
      'Aucune tendance n’est affirmée : il faut au moins trois mesures sur une même métrique, et un écart supérieur à 1 point sur 5.'
    );
  } else {
    const sentences = readable.map(entry => {
      const from = entry.first?.value;
      const to = entry.last?.value;
      const values = from !== undefined && to !== undefined ? `, de ${from} à ${to} sur ${JOURNEY_METRIC_SCALE}` : '';
      return `${entry.label} ${TREND_PHRASE[entry.trend]}${values}`;
    });
    paragraphs.push(`${sentences.join(' ; ')}. Ce sont vos déclarations, comparées entre elles.`);
  }

  const reached = journey.milestones.filter(milestone => milestone.reached);
  paragraphs.push(
    reached.length === 0
      ? 'Aucun jalon atteint pour l’instant.'
      : `Jalons atteints : ${reached.map(milestone => milestone.label).join(', ')}.`
  );

  if (journey.comparison) {
    paragraphs.push(
      `La comparaison visuelle la plus écartée porte sur ${plural(journey.comparison.daysApart, 'jour')}, entre le ${formatDate(journey.comparison.before.date)} et le ${formatDate(journey.comparison.after.date)}.`
    );
  }

  if (journey.gaps.length > 0) {
    paragraphs.push(`Ce qui manque encore : ${journey.gaps.join(' ')}`);
  }

  return {
    generatedAt: now.toISOString(),
    periodLabel: `${plural(months, 'mois')} d’historique`,
    paragraphs,
    metrics,
    caveats: [
      ...JOURNEY_DISCLAIMERS,
      'Cette synthèse décrit ce que vous avez déclaré. Elle ne constate aucun résultat et ne remplace pas un avis professionnel.'
    ]
  };
}

function kindLabel(kind: string): string {
  if (kind === 'journal') return 'entrée de journal';
  if (kind === 'photo') return 'photo';
  if (kind === 'profil') return 'mise à jour de profil';
  if (kind === 'retour') return 'retour d’expérience';
  if (kind === 'fait') return 'fait de progression';
  return kind;
}
