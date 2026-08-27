/**
 * WASH DAY OS — la routine comme cycle, pas comme matin/soir.
 *
 * Tout le marché de la personnalisation (Proven, Revieve, SkinSort) est peau
 * d'abord, donc bâti sur une logique quotidienne AM/PM. Le cheveu texturé ne
 * fonctionne pas ainsi : il fonctionne par cycles — wash day tous les 7 à 21
 * jours, coiffure protectrice portée 4 à 8 semaines, masque toutes les 1 à 4
 * semaines. Appliquer un modèle AM/PM au 4C est structurellement faux.
 *
 * Modèle retenu : Routine = Cycle(wash day) × Événements × Quotidien(léger).
 */

export type TaskFrequency = 'daily' | 'wash_day' | 'weekly' | 'biweekly' | 'monthly' | 'once';

export type WashDayStepKey =
  | 'pre_poo'
  | 'cleanse'
  | 'deep_condition'
  | 'protein_treatment'
  | 'detangle'
  | 'leave_in'
  | 'seal'
  | 'style';

export interface WashDayCycle {
  /** Intervalle entre deux wash days, en jours. 7 à 21 est la plage réaliste. */
  intervalDays: number;
  lastWashDayAt?: string;
  /** Le masque ne se fait pas à chaque wash day : sa propre fréquence prime. */
  deepConditionEveryNWashDays: number;
  /** Le soin protéiné est le seul pas qui peut abîmer s'il est trop fréquent. */
  proteinEveryNWashDays: number | null;
}

export interface WashDayEvent {
  kind: 'protective_style' | 'heat_styling' | 'chemical_treatment' | 'swimming' | 'heavy_sweat' | 'hard_water';
  occurredAt: string;
  note?: string;
}

export interface WashDayTask {
  id: string;
  step: WashDayStepKey;
  label: string;
  frequency: TaskFrequency;
  scheduledFor: string | null;
  /** Chaque tâche doit pouvoir dire pourquoi elle est là. */
  reason: string;
  productLabel?: string;
  durationMinutes: number;
  optional: boolean;
}

export const WASH_DAY_STEP_ORDER: WashDayStepKey[] = [
  'pre_poo', 'cleanse', 'deep_condition', 'protein_treatment', 'detangle', 'leave_in', 'seal', 'style'
];

export const WASH_DAY_STEP_LABELS: Record<WashDayStepKey, string> = {
  pre_poo: 'Bain d’huile avant shampooing',
  cleanse: 'Shampooing',
  deep_condition: 'Masque / soin profond',
  protein_treatment: 'Soin protéiné',
  detangle: 'Démêlage',
  leave_in: 'Leave-in',
  seal: 'Scellement',
  style: 'Coiffage'
};

const STEP_DURATIONS: Record<WashDayStepKey, number> = {
  pre_poo: 20,
  cleanse: 10,
  deep_condition: 25,
  protein_treatment: 20,
  detangle: 15,
  leave_in: 5,
  seal: 5,
  style: 15
};

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export interface WashDayPlan {
  cycle: WashDayCycle;
  tasks: WashDayTask[];
  /** Le wash day suivant, en ISO. `null` si la dernière date n'est pas connue. */
  nextWashDayAt: string | null;
  daysSinceLastWashDay: number | null;
  isOverdue: boolean;
  adaptationNotes: string[];
}

export interface WashDayContext {
  cycle: WashDayCycle;
  events?: WashDayEvent[];
  humidityPercent?: number | null;
  hardWater?: boolean;
  ownedProductLabels?: string[];
  now?: Date;
}

/**
 * Le pré-poo n'est recommandé que si un besoin le justifie. Sans condition,
 * on ajouterait une étape à toutes les routines, ce qui réduit l'observance.
 */
function shouldPrePoo(humidityPercent: number | null | undefined, events: WashDayEvent[]): { include: boolean; reason: string } {
  if (events.some(event => event.kind === 'chemical_treatment')) {
    return { include: true, reason: 'Un traitement chimique récent justifie de protéger la fibre avant le shampooing.' };
  }
  if (typeof humidityPercent === 'number' && humidityPercent < 35) {
    return { include: true, reason: `Humidité à ${humidityPercent} % : l’air sec déshydrate la fibre, un bain d’huile limite la perte d’eau au lavage.` };
  }
  return { include: false, reason: 'Aucun signal ne justifie un pré-poo ce cycle.' };
}

function shouldProtein(cycle: WashDayCycle, washDayIndex: number, events: WashDayEvent[]): { include: boolean; reason: string } {
  if (cycle.proteinEveryNWashDays === null) {
    return { include: false, reason: 'Soin protéiné désactivé : la fibre n’a pas de besoin de reconstruction déclaré.' };
  }
  if (events.some(event => event.kind === 'chemical_treatment' || event.kind === 'heat_styling')) {
    return { include: true, reason: 'Chaleur ou chimie récente : la kératine est altérée, un apport protéiné aide à la reconstruction.' };
  }
  const every = Math.max(1, cycle.proteinEveryNWashDays);
  if (washDayIndex % every === 0) {
    return { include: true, reason: `Soin protéiné prévu tous les ${every} wash days ; c’est le tour de celui-ci.` };
  }
  return { include: false, reason: `Soin protéiné tous les ${every} wash days : pas ce cycle. Un excès de protéines rigidifie la fibre.` };
}

/**
 * Construit le plan du wash day courant. Chaque tâche porte sa raison : une
 * routine qu'on ne peut pas expliquer est une routine qu'on n'applique pas.
 */
export function buildWashDayPlan(context: WashDayContext): WashDayPlan {
  const now = context.now || new Date();
  const events = context.events || [];
  const humidityPercent = context.humidityPercent ?? null;
  const owned = context.ownedProductLabels || [];

  const lastWashDayAt = context.cycle.lastWashDayAt && !Number.isNaN(new Date(context.cycle.lastWashDayAt).getTime())
    ? new Date(context.cycle.lastWashDayAt)
    : null;
  const daysSinceLastWashDay = lastWashDayAt ? daysBetween(lastWashDayAt, now) : null;
  const intervalDays = Math.max(1, Math.round(context.cycle.intervalDays || 7));
  const nextWashDayAt = lastWashDayAt ? addDays(lastWashDayAt, intervalDays) : null;
  const isOverdue = daysSinceLastWashDay !== null && daysSinceLastWashDay >= intervalDays;

  // Index du wash day dans le cycle, pour les fréquences « tous les N wash days ».
  const washDayIndex = daysSinceLastWashDay === null ? 1 : Math.floor(daysSinceLastWashDay / intervalDays) + 1;

  const adaptationNotes: string[] = [];
  const tasks: WashDayTask[] = [];

  const prePoo = shouldPrePoo(humidityPercent, events);
  if (prePoo.include) adaptationNotes.push(prePoo.reason);

  const protein = shouldProtein(context.cycle, washDayIndex, events);
  if (protein.include) adaptationNotes.push(protein.reason);

  const deepConditionEvery = Math.max(1, Math.round(context.cycle.deepConditionEveryNWashDays || 1));
  const deepConditionThisCycle = washDayIndex % deepConditionEvery === 0;

  const pickProduct = (keyword: string): string | undefined =>
    owned.find(label => label.toLowerCase().includes(keyword));

  const push = (step: WashDayStepKey, frequency: TaskFrequency, reason: string, productKeyword?: string, optional = false) => {
    tasks.push({
      id: `${step}-${washDayIndex}`,
      step,
      label: WASH_DAY_STEP_LABELS[step],
      frequency,
      scheduledFor: nextWashDayAt ? nextWashDayAt.toISOString() : null,
      reason,
      productLabel: productKeyword ? pickProduct(productKeyword) : undefined,
      durationMinutes: STEP_DURATIONS[step],
      optional
    });
  };

  if (prePoo.include) push('pre_poo', 'wash_day', prePoo.reason, 'huile', true);

  push(
    'cleanse',
    'wash_day',
    isOverdue
      ? `Dernier lavage il y a ${daysSinceLastWashDay} jour(s) pour un intervalle de ${intervalDays} : le cuir chevelu a accumulé sébum et résidus.`
      : `Lavage tous les ${intervalDays} jours selon votre rythme déclaré.`,
    'shampooing'
  );

  if (deepConditionThisCycle) {
    push('deep_condition', deepConditionEvery === 1 ? 'wash_day' : 'biweekly', `Masque prévu tous les ${deepConditionEvery} wash day(s) : c’est le tour de celui-ci.`, 'masque');
  }

  if (protein.include) push('protein_treatment', 'monthly', protein.reason, 'proteine');

  push('detangle', 'wash_day', 'Démêlage sur cheveux mouillés et conditionnés : c’est le moment où la fibre casse le moins.', 'apres-shampooing');
  push('leave_in', 'wash_day', 'Hydratation apportée sur fibre humide, avant évaporation.', 'leave');
  push('seal', 'wash_day', 'Scellement après hydratation : une huile seule sur fibre sèche ne fait qu’enrober sans hydrater.', 'huile');
  push('style', 'wash_day', 'Coiffage : la définition se joue sur cheveux encore humides, pas secs.', 'defin');

  if (typeof humidityPercent === 'number' && humidityPercent >= 70) {
    adaptationNotes.push(`Humidité à ${humidityPercent} % : les définitions tiennent moins longtemps, privilégiez un coiffage protecteur plutôt qu’un wash-and-go.`);
  }
  if (context.hardWater) {
    adaptationNotes.push('Eau dure : les dépôts minéraux s’accumulent sur la fibre. Un shampooing clarifiant ponctuel est utile, mais pas à chaque lavage.');
  }
  if (events.some(event => event.kind === 'heavy_sweat')) {
    adaptationNotes.push('Transpiration importante récente : un rinçage à l’eau entre deux wash days suffit, un shampooing complet n’est pas nécessaire.');
  }
  if (isOverdue && daysSinceLastWashDay !== null) {
    adaptationNotes.push(`Wash day dépassé de ${daysSinceLastWashDay - intervalDays} jour(s). Ce n’est pas une faute : un intervalle plus long réduit la casse mécanique, à condition que le cuir chevelu reste sain.`);
  }

  tasks.sort((a, b) => WASH_DAY_STEP_ORDER.indexOf(a.step) - WASH_DAY_STEP_ORDER.indexOf(b.step));

  return {
    cycle: context.cycle,
    tasks,
    nextWashDayAt: nextWashDayAt ? nextWashDayAt.toISOString() : null,
    daysSinceLastWashDay,
    isOverdue,
    adaptationNotes
  };
}

/**
 * Les tâches quotidiennes sont volontairement minimales. Un cheveu texturé se
 * manipule peu : une routine quotidienne chargée augmente la casse mécanique.
 */
export interface DailyTask {
  id: string;
  label: string;
  reason: string;
  durationMinutes: number;
}

export function buildDailyTasks(context: { nightProtection?: string; protectiveStyleActive?: boolean }): DailyTask[] {
  const tasks: DailyTask[] = [];
  if (context.protectiveStyleActive) {
    tasks.push({
      id: 'daily-edges',
      label: 'Hydratation légère des lisières',
      reason: 'Sous coiffure protectrice, les lisières sont la zone la plus exposée à la traction. Une hydratation légère quotidienne limite la casse.',
      durationMinutes: 3
    });
    return tasks;
  }
  tasks.push({
    id: 'daily-refresh',
    label: 'Rafraîchissement des longueurs',
    reason: 'Un apport léger d’eau puis de scellant, sans manipulation complète : rafraîchir ne veut pas dire recoiffer.',
    durationMinutes: 5
  });
  if (context.nightProtection && context.nightProtection !== 'none') {
    tasks.push({
      id: 'daily-night',
      label: 'Protection nocturne',
      reason: 'Le frottement contre le coton déshydrate et casse. Bonnet ou taie satinée réduit la friction.',
      durationMinutes: 2
    });
  }
  return tasks;
}
