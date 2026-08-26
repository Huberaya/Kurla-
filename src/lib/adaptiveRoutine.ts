import { BeautyProfile, UNKNOWN } from './beautyProfile';

export type RoutineMaskFrequency = 'weekly' | 'biweekly' | 'monthly' | 'none';
export type RoutineNightProtection = 'bonnet' | 'satin_pillowcase' | 'protective_style' | 'none';
export type RoutineProtectiveStyle = 'none' | 'braids' | 'twists' | 'locks' | 'wig' | 'other';
export type RoutineSeasonMode = 'auto' | 'fixed';

export interface RoutinePreferences {
  version: 1;
  morningEnabled: boolean;
  eveningEnabled: boolean;
  washDayIntervalDays: number;
  maskFrequency: RoutineMaskFrequency;
  nightProtection: RoutineNightProtection;
  protectiveStyle: RoutineProtectiveStyle;
  protectiveStyleStartedAt?: string;
  protectiveStyleRemovalAfterDays: number;
  locksMaintenanceEveryDays: number;
  seasonMode: RoutineSeasonMode;
  fixedSeason?: string;
  availableMinutesPerDay: number;
  availableMinutesWashDay: number;
  ownedProducts: string[];
  monthlyBudgetCents?: number;
}

export type RoutineFeedbackSignal =
  | 'more_flexible'
  | 'more_breakage'
  | 'product_heavy'
  | 'reaction'
  | 'spots_improving'
  | 'spots_not_improving'
  | 'skin_tight'
  | 'scalp_itchy'
  | 'routine_too_long';

export interface RoutineFeedback {
  id: string;
  signal: RoutineFeedbackSignal;
  note?: string;
  productLabel?: string;
  observedAt: string;
  createdAt: string;
}

export interface RoutineJournalEntry {
  id: string;
  entryDate: string;
  note?: string;
  signals: RoutineFeedbackSignal[];
  hydrationScore?: number;
  breakageScore?: number;
  comfortScore?: number;
  detanglingScore?: number;
  productsUsed: string[];
  createdAt: string;
}

export interface RoutineWeatherContext {
  temperatureC?: number;
  humidityPercent?: number;
  precipitationMm?: number;
  source?: string;
  observedAt?: string;
}

export interface RoutineTask {
  id: string;
  planId: string;
  title: string;
  description: string;
  kind: 'morning' | 'evening' | 'wash_day' | 'weekly' | 'mask' | 'protective' | 'locks' | 'weather' | 'check_in';
  scheduledFor: string;
  timeOfDay?: 'morning' | 'evening' | 'anytime';
  durationMinutes: number;
  completedAt?: string;
  status: 'pending' | 'completed' | 'skipped';
  productLabels: string[];
}

export interface AdaptiveRoutinePlan {
  id: string;
  userId: string;
  preferences: RoutinePreferences;
  weather?: RoutineWeatherContext;
  adaptationNotes: string[];
  createdAt: string;
  updatedAt: string;
  generatedThrough: string;
  tasks: RoutineTask[];
}

export interface RoutinePlannerInput {
  userId: string;
  planId: string;
  preferences: RoutinePreferences;
  beautyProfile?: BeautyProfile;
  feedback: RoutineFeedback[];
  journal: RoutineJournalEntry[];
  weather?: RoutineWeatherContext;
  now?: Date;
}

const SIGNALS: RoutineFeedbackSignal[] = [
  'more_flexible',
  'more_breakage',
  'product_heavy',
  'reaction',
  'spots_improving',
  'spots_not_improving',
  'skin_tight',
  'scalp_itchy',
  'routine_too_long'
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function stringList(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim().slice(0, 120)))).slice(0, max);
}

function optionalDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function normalizeRoutinePreferences(input: unknown): RoutinePreferences {
  const value = input && typeof input === 'object' ? input as Record<string, any> : {};
  const allowedMask: RoutineMaskFrequency[] = ['weekly', 'biweekly', 'monthly', 'none'];
  const allowedProtection: RoutineNightProtection[] = ['bonnet', 'satin_pillowcase', 'protective_style', 'none'];
  const allowedStyles: RoutineProtectiveStyle[] = ['none', 'braids', 'twists', 'locks', 'wig', 'other'];
  const allowedSeasonModes: RoutineSeasonMode[] = ['auto', 'fixed'];
  const rawBudget = Number(value.monthlyBudgetCents);

  return {
    version: 1,
    morningEnabled: value.morningEnabled !== false,
    eveningEnabled: value.eveningEnabled !== false,
    washDayIntervalDays: clamp(Number.isInteger(value.washDayIntervalDays) ? value.washDayIntervalDays : 7, 3, 42),
    maskFrequency: allowedMask.includes(value.maskFrequency) ? value.maskFrequency : 'weekly',
    nightProtection: allowedProtection.includes(value.nightProtection) ? value.nightProtection : 'bonnet',
    protectiveStyle: allowedStyles.includes(value.protectiveStyle) ? value.protectiveStyle : 'none',
    protectiveStyleStartedAt: optionalDate(value.protectiveStyleStartedAt),
    protectiveStyleRemovalAfterDays: clamp(Number.isInteger(value.protectiveStyleRemovalAfterDays) ? value.protectiveStyleRemovalAfterDays : 42, 7, 120),
    locksMaintenanceEveryDays: clamp(Number.isInteger(value.locksMaintenanceEveryDays) ? value.locksMaintenanceEveryDays : 28, 7, 90),
    seasonMode: allowedSeasonModes.includes(value.seasonMode) ? value.seasonMode : 'auto',
    fixedSeason: typeof value.fixedSeason === 'string' && value.fixedSeason.trim() ? value.fixedSeason.trim().slice(0, 40) : undefined,
    availableMinutesPerDay: clamp(Number.isInteger(value.availableMinutesPerDay) ? value.availableMinutesPerDay : 15, 5, 120),
    availableMinutesWashDay: clamp(Number.isInteger(value.availableMinutesWashDay) ? value.availableMinutesWashDay : 60, 15, 240),
    ownedProducts: stringList(value.ownedProducts),
    monthlyBudgetCents: Number.isFinite(rawBudget) && rawBudget >= 0 ? Math.round(rawBudget) : undefined
  };
}

export function normalizeRoutineFeedbackSignal(value: unknown): RoutineFeedbackSignal | undefined {
  return typeof value === 'string' && SIGNALS.includes(value as RoutineFeedbackSignal) ? value as RoutineFeedbackSignal : undefined;
}

export function normalizeWeatherContext(input: unknown): RoutineWeatherContext | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const value = input as Record<string, any>;
  const numeric = (candidate: unknown, min: number, max: number): number | undefined => {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
  };
  const context: RoutineWeatherContext = {
    temperatureC: numeric(value.temperatureC, -80, 70),
    humidityPercent: numeric(value.humidityPercent, 0, 100),
    precipitationMm: numeric(value.precipitationMm, 0, 500),
    source: typeof value.source === 'string' ? value.source.trim().slice(0, 120) : undefined,
    observedAt: optionalDate(value.observedAt)
  };
  return Object.values(context).some(Boolean) ? context : undefined;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateAfter(now: Date, days: number): Date {
  const result = new Date(now);
  result.setDate(result.getDate() + days);
  return result;
}

function latestSignals(feedback: RoutineFeedback[], journal: RoutineJournalEntry[]): Set<RoutineFeedbackSignal> {
  const all = [
    ...feedback.map(item => ({ signal: item.signal, createdAt: item.createdAt })),
    ...journal.flatMap(item => item.signals.map(signal => ({ signal, createdAt: item.createdAt })))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Keep the most recent observation for each signal. Signals remain useful
  // until the user records a contrary result in a later journal entry.
  return new Set(all.slice(0, 30).map(item => item.signal));
}

function profileHas(profile: BeautyProfile | undefined, path: string, expected: string[]): boolean {
  const value = path.split('.').reduce((current: any, key) => current?.[key], profile as any);
  return typeof value === 'string' ? expected.includes(value) : Array.isArray(value) && expected.some(item => value.includes(item));
}

function labelsForOwnedProducts(preferences: RoutinePreferences, max = 2): string[] {
  return preferences.ownedProducts.slice(0, max);
}

function buildAdaptationNotes(input: RoutinePlannerInput, signals: Set<RoutineFeedbackSignal>): string[] {
  const notes: string[] = [];
  const humidity = input.weather?.humidityPercent;
  const profileHumidity = input.beautyProfile?.environment.humidity;
  const dryAir = humidity !== undefined ? humidity < 40 : profileHumidity === 'faible' || profileHumidity === 'froid_sec';
  const humidAir = humidity !== undefined ? humidity >= 70 : profileHumidity === 'forte' || profileHumidity === 'chaud_humide';

  if (signals.has('more_flexible')) notes.push('Souplesse signalée : conserver la fréquence actuelle et ne pas multiplier les changements.');
  if (signals.has('more_breakage')) notes.push('Casse signalée : réduire les manipulations, démêler par sections et privilégier les gestes doux.');
  if (signals.has('product_heavy')) notes.push('Produit alourdissant signalé : diminuer la quantité et éviter de superposer plusieurs textures riches.');
  if (signals.has('reaction')) notes.push('Réaction signalée : mettre en pause le produit concerné et ne pas introduire de nouveau produit avant observation.');
  if (signals.has('spots_improving')) notes.push('Marques en amélioration signalées : conserver une routine stable et documenter l’évolution.');
  if (signals.has('spots_not_improving')) notes.push('Marques sans amélioration signalées : ne pas augmenter automatiquement les actifs ; réévaluer la tolérance et demander un avis professionnel si besoin.');
  if (signals.has('skin_tight')) notes.push('Tiraillement cutané signalé : simplifier les étapes et privilégier le confort.');
  if (signals.has('scalp_itchy')) notes.push('Démangeaisons du cuir chevelu signalées : éviter les produits irritants et demander un avis professionnel si elles persistent.');
  if (signals.has('routine_too_long')) notes.push('Routine jugée trop longue : les étapes secondaires sont retirées des jours courts.');
  if (humidAir) notes.push(input.weather?.humidityPercent !== undefined ? `Humidité actuelle renseignée à ${Math.round(input.weather.humidityPercent)} % : alléger les couches si la fibre gonfle ou perd sa définition.` : 'Humidité élevée renseignée dans le profil : alléger les couches si la fibre gonfle ou perd sa définition.');
  if (dryAir) notes.push(input.weather?.humidityPercent !== undefined ? `Air sec actuellement renseigné à ${Math.round(input.weather.humidityPercent)} % : surveiller le confort et fractionner l’hydratation.` : 'Air sec renseigné dans le profil : surveiller le confort et fractionner l’hydratation.');
  if (input.weather?.temperatureC !== undefined) notes.push(`Température observée : ${Math.round(input.weather.temperatureC)} °C. Cette donnée sert à ajuster le confort, pas à établir un diagnostic.`);
  if (input.beautyProfile?.environment.season && input.beautyProfile.environment.season !== UNKNOWN) notes.push(`Saison prise en compte : ${input.beautyProfile.environment.season}.`);
  if (input.preferences.seasonMode === 'fixed' && input.preferences.fixedSeason) notes.push(`Saison repère choisie : ${input.preferences.fixedSeason}.`);
  return Array.from(new Set(notes)).slice(0, 12);
}

export function buildAdaptiveRoutine(input: RoutinePlannerInput): { tasks: RoutineTask[]; adaptationNotes: string[] } {
  const preferences = normalizeRoutinePreferences(input.preferences);
  const now = input.now || new Date();
  const signals = latestSignals(input.feedback, input.journal);
  const notes = buildAdaptationNotes({ ...input, preferences }, signals);
  const tasks: RoutineTask[] = [];
  const owned = labelsForOwnedProducts(preferences);
  const planId = input.planId;
  const dailyMinutes = preferences.availableMinutesPerDay;
  const washMinutes = preferences.availableMinutesWashDay;
  const shortened = dailyMinutes <= 15 || signals.has('routine_too_long');
  const selectedSeason = preferences.seasonMode === 'fixed'
    ? preferences.fixedSeason
    : input.beautyProfile?.environment.season;
  const seasonalAdjustment = selectedSeason === 'hiver' || selectedSeason === 'froid_sec'
    ? ' En saison froide ou sèche, fractionner l’hydratation et surveiller le tiraillement.'
    : selectedSeason === 'ete' || selectedSeason === 'chaud_humide'
      ? ' En saison chaude ou humide, alléger les couches si la fibre gonfle ou si le cuir chevelu devient inconfortable.'
      : '';
  const skinPriority = profileHas(input.beautyProfile, 'skin.spfUsage', ['quotidien', 'parfois']) || signals.has('spots_improving') || signals.has('spots_not_improving');
  const add = (task: Omit<RoutineTask, 'id' | 'planId' | 'status'>) => {
    if (tasks.length >= 80) return;
    tasks.push({ ...task, id: `${planId}:${task.scheduledFor}:${task.kind}:${tasks.length}`, planId, status: 'pending' });
  };

  for (let offset = 0; offset <= 21; offset += 1) {
    const date = dateAfter(now, offset);
    const scheduledFor = isoDate(date);
    if (preferences.morningEnabled && (offset < 14 || !shortened)) {
      add({
        title: skinPriority ? 'Matin · geste essentiel et SPF si prévu' : 'Matin · geste essentiel',
        description: signals.has('product_heavy') ? 'Utiliser une petite quantité et éviter les superpositions riches.' : `Hydrater ou rafraîchir uniquement si le confort le demande${skinPriority ? ', puis appliquer le SPF déjà prévu dans le profil si vous en utilisez un' : ''}. Un produit déjà possédé peut être utilisé.${seasonalAdjustment}`,
        kind: 'morning', timeOfDay: 'morning', scheduledFor, durationMinutes: shortened ? 5 : 8, productLabels: owned
      });
    }
    if (preferences.eveningEnabled && (offset < 14 || !shortened)) {
      const protection = preferences.nightProtection === 'bonnet' ? 'Bonnet satin' : preferences.nightProtection === 'satin_pillowcase' ? 'Taie satin' : preferences.nightProtection === 'protective_style' ? 'Protection du style' : 'Geste du soir';
      add({
        title: `Soir · ${protection}`,
        description: signals.has('more_breakage') ? 'Protéger sans serrer et limiter les manipulations avant le coucher.' : 'Préparer la protection nocturne choisie, sans ajouter d’étape si le cuir chevelu est inconfortable.' + seasonalAdjustment,
        kind: 'evening', timeOfDay: 'evening', scheduledFor, durationMinutes: shortened ? 3 : 5, productLabels: []
      });
    }
    if (offset % preferences.washDayIntervalDays === 0 && washMinutes >= 20) {
      add({
        title: 'Wash day · lavage et soin',
        description: signals.has('more_breakage') ? 'Laver sans frotter les longueurs et démêler par sections, avec le moins de tension possible.' : 'Laver, démêler progressivement puis rincer. Ajuster la quantité aux besoins observés.' + seasonalAdjustment,
        kind: 'wash_day', timeOfDay: 'anytime', scheduledFor, durationMinutes: Math.min(washMinutes, 90), productLabels: owned
      });
    }
    const maskEvery = preferences.maskFrequency === 'weekly' ? 7 : preferences.maskFrequency === 'biweekly' ? 14 : preferences.maskFrequency === 'monthly' ? 28 : 0;
    if (maskEvery > 0 && offset % maskEvery === 0 && washMinutes >= 30 && !signals.has('routine_too_long')) {
      add({
        title: 'Soin hebdomadaire · masque',
        description: signals.has('product_heavy') ? 'Appliquer une quantité mesurée, puis rincer soigneusement pour éviter l’effet lourd.' : 'Laisser poser le masque selon son étiquette. Noter le confort et le toucher après rinçage.',
        kind: 'mask', timeOfDay: 'anytime', scheduledFor, durationMinutes: Math.min(30, washMinutes), productLabels: owned
      });
    }
    if (offset % 7 === 0 && !shortened) {
      add({
        title: 'Bilan hebdomadaire · toucher et confort',
        description: 'Noter ce qui a changé depuis la semaine précédente avant de modifier la fréquence ou d’ajouter un produit.',
        kind: 'weekly', timeOfDay: 'anytime', scheduledFor, durationMinutes: 5, productLabels: []
      });
    }
    if (offset === 0 && (signals.has('reaction') || signals.has('scalp_itchy'))) {
      add({
        title: 'Point sécurité · observation',
        description: 'Ne pas ajouter de nouveau produit. En cas de réaction importante ou persistante, demander un avis médical ou pharmaceutique.',
        kind: 'check_in', timeOfDay: 'anytime', scheduledFor, durationMinutes: 2, productLabels: []
      });
    }
  }

  if (preferences.protectiveStyle !== 'none' && preferences.protectiveStyleStartedAt) {
    const removalDate = new Date(preferences.protectiveStyleStartedAt);
    removalDate.setDate(removalDate.getDate() + preferences.protectiveStyleRemovalAfterDays);
    if (removalDate >= now) {
      add({
        title: `Rappel · déposer le style (${preferences.protectiveStyle})`,
        description: 'Prévoir la dépose et un lavage doux. La date est basée sur celle que vous avez déclarée, pas sur une estimation automatique.',
        kind: 'protective', timeOfDay: 'anytime', scheduledFor: isoDate(removalDate), durationMinutes: 10, productLabels: []
      });
    }
    if (preferences.protectiveStyle === 'locks') {
      const maintenanceDate = new Date(preferences.protectiveStyleStartedAt);
      maintenanceDate.setDate(maintenanceDate.getDate() + preferences.locksMaintenanceEveryDays);
      if (maintenanceDate >= now) {
        add({
          title: 'Entretien des locks · prochaine échéance déclarée',
          description: 'Planifier l’entretien avec votre professionnel ou votre geste habituel, sans serrer les racines.',
          kind: 'locks', timeOfDay: 'anytime', scheduledFor: isoDate(maintenanceDate), durationMinutes: 30, productLabels: []
        });
      }
    }
  }

  if (notes.some(note => note.includes('Humidité') || note.includes('Air sec') || note.includes('Température'))) {
    add({
      title: 'Adaptation météo · vérifier le confort',
      description: 'Comparer le toucher, le volume et le confort aux jours précédents avant d’ajouter ou de retirer un produit.',
      kind: 'weather', timeOfDay: 'anytime', scheduledFor: isoDate(now), durationMinutes: 2, productLabels: []
    });
  }

  const profile = input.beautyProfile;
  if (profileHas(profile, 'hair.protectiveStyles', ['tresses', 'twists', 'locks', 'perruque']) && preferences.protectiveStyle === 'none') {
    notes.push('Un style protecteur est renseigné dans le KURLA ID, mais aucune date de dépose n’est enregistrée : le rappel reste en attente.');
  }
  return { tasks: tasks.slice(0, 80), adaptationNotes: Array.from(new Set(notes)).slice(0, 12) };
}

export function createRoutinePlan(userId: string, planId: string, preferences: RoutinePreferences, input: Omit<RoutinePlannerInput, 'userId' | 'planId' | 'preferences'>): AdaptiveRoutinePlan {
  const normalized = normalizeRoutinePreferences(preferences);
  const createdAt = (input.now || new Date()).toISOString();
  const result = buildAdaptiveRoutine({ ...input, userId, planId, preferences: normalized });
  return {
    id: planId,
    userId,
    preferences: normalized,
    weather: normalizeWeatherContext(input.weather),
    adaptationNotes: result.adaptationNotes,
    createdAt,
    updatedAt: createdAt,
    generatedThrough: 'KURLA routine planner: profil, préférences, observations et contexte météo renseignés',
    tasks: result.tasks
  };
}
