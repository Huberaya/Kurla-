import type { HairAdvisoryContext } from './hairAdvisory';
import { buildHairAdvisoryRoutine, buildHairAdvisorySummary } from './hairAdvisory';

/**
 * D2 — LA BOUCLE QUI BOUCLE (programme « solidification du diagnostic »,
 * docs/CHANTIERS_DIAGNOSTIC_SOLIDIFICATION.md).
 *
 * Constat acté (19/09) : le journal (signaux + notes 1–5) alimentait le
 * calendrier des tâches, JAMAIS le moteur segmenté — les étapes ne
 * changeaient jamais ; et le nudge L4 promettait des « recommandations
 * recalées » vers un simple éditeur de profil.
 *
 * Ce module est le maillon manquant, pur et déterministe :
 *  1. une TABLE DE CONVERSION signaux → réponses du diagnostic, chaque règle
 *     nommant sa justification (jamais un changement sans cause citée) ;
 *  2. le PROFIL ÉVOLUÉ (mêmes champs que le moteur segmenté — l'évolution ne
 *     réinvente pas de langage, elle nourrit l'existant) ;
 *  3. le RAPPORT avant/après : les étapes qui changent, chacune rattachée au
 *     signal qui la cause ; les confirmations (ce qui ne change PAS et
 *     pourquoi — un signal qui contredit une valeur déclarée ne l'écrase
 *     jamais en silence).
 *
 * Règle d'or RGPD/honnêteté : seules des réponses issues du formulaire
 * (énumérations connues) sont ajustées ; les notes libres ne remontent
 * jamais dans le profil. Un champ déclaré fort (ex. porosité moyenne) n'est
 * JAMAIS écrasé par une inférence : il produit une confirmation, pas une
 * mutation.
 */

export type JournalSignal =
  | 'more_flexible'
  | 'more_breakage'
  | 'product_heavy'
  | 'reaction'
  | 'spots_improving'
  | 'spots_not_improving'
  | 'skin_tight'
  | 'scalp_itchy'
  | 'routine_too_long';

export const JOURNAL_SIGNAL_LABELS: Record<JournalSignal, string> = {
  more_flexible: 'Plus de souplesse',
  more_breakage: 'Davantage de casse',
  product_heavy: 'Produit alourdissant',
  reaction: 'Réaction à un produit',
  spots_improving: 'Taches en amélioration (peau)',
  spots_not_improving: 'Taches sans amélioration (peau)',
  skin_tight: 'Peau qui tire (peau)',
  scalp_itchy: 'Cuir chevelu qui démange',
  routine_too_long: 'Routine trop longue',
};

export interface JournalEntryInput {
  /** Date de l'observation (YYYY-MM-DD) — pas la date d'enregistrement. */
  entryDate: string;
  signals?: readonly string[];
  hydrationScore?: number;
  breakageScore?: number;
  comfortScore?: number;
  detanglingScore?: number;
}

export type EvolutionField = 'priority' | 'scalp' | 'porosity' | 'shorten';

interface ConversionRule {
  readonly signal: JournalSignal | null;
  /** Métrique de jauge (1–5) qui déclenche la règle en l'absence du signal. */
  readonly metric?: 'breakageScore' | 'hydrationScore' | 'comfortScore' | 'detanglingScore';
  /** Sens de la jauge : 'at_or_below' = alerte (moyenne ≤ seuil) ;
   * 'at_or_above' = confirmation (moyenne ≥ seuil). */
  readonly metricMode?: 'at_or_below' | 'at_or_above';
  readonly threshold?: number;
  readonly field: EvolutionField;
  readonly value: string | boolean;
  /** Pourquoi, en langage client — la cause est citée (exigence d'acceptation). */
  readonly reason: string;
  /** Valeur déclarée qui PROTÈGE le champ : si le profil la porte, pas d'écrasement. */
  readonly protectedValues?: readonly string[];
  /** Le champ porte déjà cette valeur → confirmation, pas changement. */
  readonly noChangeValue?: string | boolean;
  readonly confirmReason?: string;
}

/**
 * Table de conversion signaux → réponses. Ordonnée : la première règle qui
 * frappe pour un champ gagne ; les suivantes deviennent confirmations.
 * Les signaux marqués scope-peau sont listés volontairement : un signal sans
 * réponse serait un cul-de-sac — ici chacun a une issue nommée (D6 reprend
 * les trois peau avec le moteur peau).
 */
export const SIGNAL_CONVERSION_RULES: readonly ConversionRule[] = [
  {
    signal: 'reaction',
    field: 'scalp',
    value: 'irritation',
    reason: 'Une réaction observée après un produit : le cuir chevelu passe en mode apaisement — rinçage long, produits espacés, rien de nouveau tant que ça ne s’est pas calmé.',
    noChangeValue: 'irritation',
    confirmReason: 'Le cuir chevelu est déjà traité en mode apaisement dans votre routine.',
  },
  {
    signal: 'scalp_itchy',
    field: 'scalp',
    value: 'demangeaisons',
    reason: 'Le journal dit « cuir chevelu qui démange » : la routine lui consacre son soin dédié, séparé des longueurs.',
    noChangeValue: 'demangeaisons',
    confirmReason: 'Le cuir chevelu démange déjà pris en charge : le soin dédié est dans la routine.',
  },
  {
    signal: 'more_breakage',
    metric: 'breakageScore',
    metricMode: 'at_or_below',
    threshold: 2,
    field: 'priority',
    value: 'casse',
    reason: 'Davantage de casse dans le journal : le besoin prioritaire devient la casse — le moteur repose le démêlage et la force de la fibre au centre.',
    noChangeValue: 'casse',
    confirmReason: 'La casse est déjà votre priorité déclarée : rien à déplacer, la routine la sert déjà.',
  },
  {
    signal: 'more_breakage',
    metric: 'detanglingScore',
    metricMode: 'at_or_below',
    threshold: 2,
    field: 'priority',
    value: 'casse',
    reason: 'Démêlage noté difficile : c’est le même dossier que la casse — la priorité bascule sur le geste qui protège la fibre.',
  },
  {
    signal: 'more_flexible',
    metric: 'hydrationScore',
    metricMode: 'at_or_above',
    threshold: 4,
    field: 'porosity',
    value: 'noop',
    reason: 'La souplesse progresse : l’hydratation et le scellement actuels marchent — la routine ne change pas, c’est la confirmation qu’elle est bien réglée.',
  },
  {
    signal: 'product_heavy',
    field: 'porosity',
    value: 'faible',
    reason: 'Le produit alourdit sans pénétrer : le cheveu se comporte comme une cuticule fermée — la routine passe aux textures légères, en moins plutôt qu’en plus.',
    protectedValues: ['forte', 'faible', 'moyenne'],
    confirmReason: 'Vous avez déclaré votre porosité : un produit qui alourdit se règle par le dosage et le rinçage, pas en changeant votre porosité déclarée.',
  },
  {
    signal: 'routine_too_long',
    field: 'shorten',
    value: true,
    reason: 'La routine est trop longue à tenir : les ajouts de confort passent en réserve — le socle (lavage, entretien entre deux lavages, votre préoccupation) reste, c’est lui qui protège.',
    noChangeValue: true,
    confirmReason: 'La version resserrée est déjà la vôtre : rien à retirer de plus.',
  },
  // — signaux peau : réponse portée, pas d'angle mort (le moteur peau les
  // consommera au chantier D6 ; ici ils sont explicitement hors périmètre
  // cheveux et le rapport le dit). —
  { signal: 'spots_improving', field: 'porosity', value: 'noop', reason: 'Signal peau : suivi par le parcours peau, pas par la routine cheveux.' },
  { signal: 'spots_not_improving', field: 'porosity', value: 'noop', reason: 'Signal peau : suivi par le parcours peau, pas par la routine cheveux.' },
  { signal: 'skin_tight', field: 'scalp', value: 'noop', reason: 'Signal peau : le confort de la peau se suit dans le journal peau.' },
];

export interface EvolutionChange {
  readonly field: EvolutionField;
  readonly from: string;
  readonly to: string;
  readonly reason: string;
  /** Le signal (ou la jauge) qui cause ce changement — cité, jamais implicite. */
  readonly causedBy: string;
}

export interface EvolutionConfirmation {
  readonly signal: string;
  readonly reason: string;
}

export interface HairEvolutionReport {
  readonly available: boolean;
  readonly whyUnavailable?: string;
  readonly diagnosticAt?: string;
  readonly before: { summary: string; morning: string[]; evening: string[]; weekly: string[] };
  readonly after: { summary: string; morning: string[]; evening: string[]; weekly: string[] };
  readonly nextContext: HairAdvisoryContext;
  readonly changes: EvolutionChange[];
  readonly confirmations: EvolutionConfirmation[];
  readonly entriesUsed: number;
  readonly entriesIgnored: number;
  /** Étapes apparues / disparues entre J+0 et la version recalée. */
  readonly added: string[];
  readonly removed: string[];
  /** Étapes restées mais dont le pourquoi ou l'attente a changé (causal). */
  readonly changed: string[];
}

function entryDateValue(entry: JournalEntryInput): number {
  const ms = new Date(`${entry.entryDate}T12:00:00`).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

function avgMetric(entries: JournalEntryInput[], key: 'hydrationScore' | 'breakageScore' | 'comfortScore' | 'detanglingScore'): number | null {
  const values = entries.map(entry => entry[key]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const FIELD_LABEL: Record<EvolutionField, string> = {
  priority: 'Besoin prioritaire',
  scalp: 'Cuir chevelu',
  porosity: 'Porosité',
  shorten: 'Longueur de la routine',
};
export const EVOLUTION_FIELD_LABELS = FIELD_LABEL;

const VALUE_LABEL: Record<string, string> = {
  casse: 'Démêler sans casse',
  hydratation: 'Stopper la sécheresse',
  definition: 'Définir les boucles',
  pousse: 'Longueurs et racines en santé',
  cuir_chevelu: 'Apaiser le cuir chevelu',
  demangeaisons: 'Démangeaisons',
  irritation: 'Irritation',
  sec: 'Sec',
  pellicules: 'Pellicules',
  normal: 'Normal',
  faible: 'Faible',
  forte: 'Forte',
  moyenne: 'Moyenne',
  inconnue: 'À tester',
  '': 'Non renseigné',
  true: 'Resserrée à l’essentiel',
  false: 'Complète',
};

function labelFor(field: EvolutionField, raw: string | boolean | undefined): string {
  const key = typeof raw === 'boolean' ? String(raw) : String(raw ?? '');
  return VALUE_LABEL[key] ?? (key === 'noop' ? 'inchangé' : key);
}

function actionsOf(ctx: HairAdvisoryContext) {
  const routine = buildHairAdvisoryRoutine(ctx);
  const all = [...routine.morning, ...routine.evening, ...routine.weekly];
  // Une étape, ce n'est pas qu'un verbe : si le pourquoi ou l'attente change,
  // l'étape est recalée. Le rapport compare donc le texte complet.
  const serialized = (step: { action: string; why: string; expect: string }) => `${step.action}~~~${step.why}~~~${step.expect}`;
  return {
    morning: routine.morning.map(s => s.action),
    evening: routine.evening.map(s => s.action),
    weekly: routine.weekly.map(s => s.action),
    all: all.map(s => s.action),
    full: all.map(serialized),
    actionsByFull: new Map(all.map(s => [serialized(s), s.action] as const)),
  };
}

/**
 * Calcule le profil évolué et le rapport avant/après. Pur : mêmes entrées,
 * même rapport (le banc l'exige).
 */
export function buildHairEvolutionReport(
  baseCtx: HairAdvisoryContext | null,
  entries: readonly JournalEntryInput[],
  diagnosticAt: string | null | undefined
): HairEvolutionReport {
  if (!baseCtx) {
    return {
      available: false,
      whyUnavailable: 'Aucun diagnostic enregistré n’est rattaché à ce compte : la routine ne peut pas être recalée sans point de départ. Refaites un diagnostic (3 minutes) pour activer la boucle.',
      before: { summary: '', morning: [], evening: [], weekly: [] },
      after: { summary: '', morning: [], evening: [], weekly: [] },
      nextContext: {},
      changes: [],
      confirmations: [],
      entriesUsed: 0,
      entriesIgnored: entries.length,
      added: [],
      removed: [],
      changed: [],
    };
  }

  const diagnosticMs = diagnosticAt ? new Date(diagnosticAt).getTime() : 0;
  const usable: JournalEntryInput[] = [];
  let ignored = 0;
  for (const entry of entries) {
    const ms = entryDateValue(entry);
    if (!Number.isFinite(ms)) { ignored += 1; continue; }
    if (diagnosticMs && ms < diagnosticMs) { ignored += 1; continue; } // avant le point de départ : ne compte pas
    const today = Date.now();
    if (ms > today + 24 * 3600 * 1000) { ignored += 1; continue; }      // date future : jamais devinée
    usable.push(entry);
  }

  const seenSignals = new Set<string>();
  for (const entry of usable) for (const signal of entry.signals ?? []) seenSignals.add(signal);

  const next: Record<string, string | boolean> = { ...baseCtx } as Record<string, string | boolean>;
  const applied = new Set<EvolutionField>();
  const changes: EvolutionChange[] = [];
  const confirmations: EvolutionConfirmation[] = [];

  for (const rule of SIGNAL_CONVERSION_RULES) {
    const signalHit = rule.signal !== null && seenSignals.has(rule.signal);
    let metricFired = false;
    if (rule.metric !== undefined && rule.threshold !== undefined && usable.length) {
      const avg = avgMetric(usable, rule.metric);
      if (avg !== null) {
        metricFired = rule.metricMode === 'at_or_above' ? avg >= rule.threshold : avg <= rule.threshold;
      }
    }
    if (!signalHit && !metricFired) continue;
    const cause = signalHit ? JOURNAL_SIGNAL_LABELS[rule.signal as JournalSignal] : `jauge ${rule.metric} ≤ ${rule.threshold}`;

    const current = String(next[rule.field] ?? '');
    if (rule.value === 'noop') {
      confirmations.push({ signal: cause, reason: rule.reason });
      continue;
    }
    // Valeur déclarée protégée → confirmation, jamais écrasement silencieux.
    if (rule.protectedValues && current && rule.protectedValues.includes(current) && rule.noChangeValue !== current) {
      confirmations.push({ signal: cause, reason: rule.confirmReason ?? 'Votre déclaration est antérieure et plus fiable qu’une inférence : rien n’est écrasé.' });
      continue;
    }
    if (rule.noChangeValue !== undefined && String(rule.noChangeValue) === current) {
      confirmations.push({ signal: cause, reason: rule.confirmReason ?? 'Déjà en place dans votre routine.' });
      continue;
    }
    if (applied.has(rule.field)) {
      confirmations.push({ signal: cause, reason: `Le champ « ${FIELD_LABEL[rule.field]} » a déjà été ajusté par un signal plus direct.` });
      continue;
    }
    applied.add(rule.field);
    changes.push({
      field: rule.field,
      from: labelFor(rule.field, current),
      to: labelFor(rule.field, rule.value),
      reason: rule.reason,
      causedBy: cause,
    });
    if (rule.field === 'shorten') next.shorten = true;
    else next[rule.field] = String(rule.value);
  }

  const before = actionsOf(baseCtx);
  const after = actionsOf(next as HairAdvisoryContext);
  const beforeSet = new Set(before.all);
  const afterSet = new Set(after.all);
  const added = after.all.filter(a => !beforeSet.has(a));
  const removed = before.all.filter(a => !afterSet.has(a));
  const beforeFull = new Set(before.full);
  const afterFull = new Set(after.full);
  const changed = Array.from(new Set(
    after.full
      .filter(f => !beforeFull.has(f))
      .map(f => after.actionsByFull.get(f) ?? '')
      .filter(a => beforeSet.has(a))
  ));

  return {
    available: true,
    diagnosticAt: diagnosticAt ?? undefined,
    before: { summary: buildHairAdvisorySummary(baseCtx), morning: before.morning, evening: before.evening, weekly: before.weekly },
    after: { summary: buildHairAdvisorySummary(next as HairAdvisoryContext), morning: after.morning, evening: after.evening, weekly: after.weekly },
    nextContext: next as HairAdvisoryContext,
    changes,
    confirmations,
    entriesUsed: usable.length,
    entriesIgnored: ignored,
    added,
    removed,
    changed,
  };
}
