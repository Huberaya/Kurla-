/**
 * TIMELINE DE COIFFURE PROTECTRICE
 *
 * Aucune plateforme ne suit l'âge d'une coiffure. Or l'alopécie de traction
 * est cumulative, prévisible et largement évitable : elle vient de la durée et
 * de la tension, pas de la coiffure elle-même.
 *
 * KURLA ne critique jamais une pratique capillaire. Elle informe sur la durée
 * et la tension, et alerte avant que la perte ne s'installe.
 */

export type ProtectiveStyle = 'braids' | 'knotless_braids' | 'twists' | 'locs' | 'wig' | 'weave' | 'cornrows' | 'buns' | 'other';

export type TensionLevel = 'loose' | 'normal' | 'firm' | 'tight';

export type ProtectiveSignal =
  | 'pain'
  | 'itching'
  | 'bumps'
  | 'crusts'
  | 'redness'
  | 'breakage_at_roots'
  | 'hairline_thinning'
  | 'headache';

export const PROTECTIVE_SIGNALS: ProtectiveSignal[] = [
  'pain', 'itching', 'bumps', 'crusts', 'redness', 'breakage_at_roots', 'hairline_thinning', 'headache'
];

export const PROTECTIVE_SIGNAL_LABELS: Record<ProtectiveSignal, string> = {
  pain: 'Douleur au cuir chevelu',
  itching: 'Démangeaisons',
  bumps: 'Boutons',
  crusts: 'Croûtes',
  redness: 'Rougeurs',
  breakage_at_roots: 'Casse à la racine',
  hairline_thinning: 'Lisières qui s’éclaircissent',
  headache: 'Maux de tête'
};

/**
 * Signaux qui justifient une orientation professionnelle immédiate, et non un
 * simple conseil d'entretien. La douleur et les croûtes ne sont pas des
 * désagréments : ce sont des signes d'inflammation.
 */
export const ESCALATION_SIGNALS: ProtectiveSignal[] = ['pain', 'crusts', 'breakage_at_roots', 'hairline_thinning'];

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

export interface ProtectiveStyleEpisode {
  id: string;
  userId: string;
  style: ProtectiveStyle;
  tension: TensionLevel;
  installedAt: string;
  plannedRemovalAt?: string;
  removedAt?: string;
  removalReason?: string;
  maxWearDays: number;
  signals: ProtectiveSignal[];
  lastSignalAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Durée de port maximale recommandée, en jours. Ce sont des ordres de grandeur prudents, pas des seuils cliniques. */
export const DEFAULT_MAX_WEAR_DAYS: Record<ProtectiveStyle, number> = {
  braids: 56,
  knotless_braids: 56,
  twists: 28,
  locs: 84,
  wig: 14,
  weave: 56,
  cornrows: 21,
  buns: 7,
  other: 42
};

/** La tension multiplie le risque indépendamment de la durée. */
const TENSION_WEIGHT: Record<TensionLevel, number> = { loose: 0.7, normal: 1, firm: 1.4, tight: 2 };

export function isProtectiveSignal(value: unknown): value is ProtectiveSignal {
  return typeof value === 'string' && (PROTECTIVE_SIGNALS as string[]).includes(value);
}

export function isTensionLevel(value: unknown): value is TensionLevel {
  return typeof value === 'string' && (['loose', 'normal', 'firm', 'tight'] as string[]).includes(value);
}

export function defaultMaxWearDays(style: ProtectiveStyle): number {
  return DEFAULT_MAX_WEAR_DAYS[style] ?? 42;
}

export interface TractionRiskAssessment {
  episodeId: string;
  wearDays: number;
  maxWearDays: number;
  wearRatio: number;
  tensionFactor: number;
  riskLevel: RiskLevel;
  signals: ProtectiveSignal[];
  escalationRequired: boolean;
  recommendation: string;
  /** Ce que KURLA ne sait pas, dit explicitement. */
  limitations: string[];
}

export function assessTractionRisk(episode: ProtectiveStyleEpisode, now = new Date()): TractionRiskAssessment {
  const installedAt = new Date(episode.installedAt);
  const endAt = episode.removedAt ? new Date(episode.removedAt) : now;
  const wearDays = Math.max(0, Math.floor((endAt.getTime() - installedAt.getTime()) / 86_400_000));
  const maxWearDays = episode.maxWearDays > 0 ? episode.maxWearDays : defaultMaxWearDays(episode.style);
  const tensionFactor = TENSION_WEIGHT[episode.tension] ?? 1;

  // Durée pondérée par la tension : une coiffure serrée « vieillit » plus vite.
  const effectiveRatio = (wearDays * tensionFactor) / maxWearDays;

  const hasEscalationSignal = episode.signals.some(signal => ESCALATION_SIGNALS.includes(signal));
  const hasMinorSignal = episode.signals.some(signal => !ESCALATION_SIGNALS.includes(signal));

  let riskLevel: RiskLevel;
  if (hasEscalationSignal || effectiveRatio >= 1.2) riskLevel = 'high';
  else if (effectiveRatio >= 1 || (hasMinorSignal && effectiveRatio >= 0.7)) riskLevel = 'elevated';
  else if (effectiveRatio >= 0.7 || hasMinorSignal) riskLevel = 'moderate';
  else riskLevel = 'low';

  const escalationRequired = hasEscalationSignal;

  const limitations: string[] = [];
  if (episode.signals.length === 0) {
    limitations.push('Aucun ressenti renseigné : l’évaluation repose uniquement sur la durée et la tension déclarées, pas sur l’état réel du cuir chevelu.');
  }

  let recommendation: string;
  if (escalationRequired) {
    recommendation = `Signaux d’alerte (${episode.signals.filter(s => ESCALATION_SIGNALS.includes(s)).map(s => PROTECTIVE_SIGNAL_LABELS[s].toLowerCase()).join(', ')}) : desserrez ou retirez la coiffure rapidement et consultez un professionnel. La douleur, les croûtes ou une lisière qui s’éclaircit ne sont pas des désagréments à tolérer.`;
  } else if (riskLevel === 'high') {
    recommendation = `Portée ${wearDays} jours pour un maximum indicatif de ${maxWearDays}, avec une tension ${episode.tension} : retirez la coiffure et laissez le cuir chevelu récupérer avant la prochaine pose.`;
  } else if (riskLevel === 'elevated') {
    recommendation = `Vous approchez de la limite (${wearDays}/${maxWearDays} jours, tension ${episode.tension}). Planifiez la dépose et surveillez les lisières.`;
  } else if (riskLevel === 'moderate') {
    recommendation = `Port normal à ce stade (${wearDays}/${maxWearDays} jours). Massez le cuir chevelu sans tirer et surveillez l’apparition de douleur.`;
  } else {
    recommendation = `Début de port (${wearDays}/${maxWearDays} jours). Une coiffure protectrice ne doit jamais faire mal : si elle serre, faites-la desserrer.`;
  }

  return {
    episodeId: episode.id,
    wearDays,
    maxWearDays,
    wearRatio: Number(effectiveRatio.toFixed(2)),
    tensionFactor,
    riskLevel,
    signals: episode.signals,
    escalationRequired,
    recommendation,
    limitations
  };
}

/**
 * Historique de traction. L'alopécie de traction est cumulative : c'est la
 * répétition, pas un épisode isolé, qui crée le risque durable.
 */
export interface TractionHistory {
  episodeCount: number;
  totalWearDays: number;
  shareWithElevatedRisk: number;
  recurringSignals: { signal: ProtectiveSignal; label: string; count: number }[];
  pattern: string;
}

export function summarizeTractionHistory(episodes: Iterable<ProtectiveStyleEpisode>, now = new Date()): TractionHistory {
  const list = Array.from(episodes);
  if (list.length === 0) {
    return {
      episodeCount: 0,
      totalWearDays: 0,
      shareWithElevatedRisk: 0,
      recurringSignals: [],
      pattern: 'Aucune coiffure protectrice enregistrée. KURLA ne déduit rien d’un historique vide.'
    };
  }

  const assessments = list.map(episode => assessTractionRisk(episode, now));
  const totalWearDays = assessments.reduce((sum, item) => sum + item.wearDays, 0);
  const elevated = assessments.filter(item => item.riskLevel === 'elevated' || item.riskLevel === 'high');

  const signalCounts = new Map<ProtectiveSignal, number>();
  for (const episode of list) {
    for (const signal of episode.signals) signalCounts.set(signal, (signalCounts.get(signal) || 0) + 1);
  }
  const recurringSignals = Array.from(signalCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([signal, count]) => ({ signal, label: PROTECTIVE_SIGNAL_LABELS[signal], count }))
    .sort((a, b) => b.count - a.count);

  let pattern: string;
  if (elevated.length === 0 && recurringSignals.length === 0) {
    pattern = `${list.length} coiffure(s) portée(s) pour ${totalWearDays} jours au total, sans signal d’alerte répété.`;
  } else if (recurringSignals.some(item => ESCALATION_SIGNALS.includes(item.signal))) {
    pattern = `Signal d’alerte récurrent (${recurringSignals.find(item => ESCALATION_SIGNALS.includes(item.signal))!.label.toLowerCase()}) sur plusieurs poses. C’est le motif le plus associé à une traction excessive répétée : un avis professionnel est recommandé, d’autant qu’une perte liée à la traction peut devenir définitive si elle s’installe.`;
  } else {
    pattern = `${elevated.length} pose(s) sur ${list.length} ont atteint un niveau de risque élevé. Allonger l’intervalle entre deux poses ou réduire la tension réduit le risque cumulé.`;
  }

  return {
    episodeCount: list.length,
    totalWearDays,
    shareWithElevatedRisk: Number((elevated.length / list.length).toFixed(2)),
    recurringSignals,
    pattern
  };
}

/**
 * Protocole de récupération entre deux poses. KURLA ne promet aucune repousse :
 * elle décrit ce qui réduit la contrainte sur le follicule.
 */
export function buildRecoveryProtocol(assessment: TractionRiskAssessment): { label: string; reason: string }[] {
  if (assessment.riskLevel === 'low') return [];
  const steps = [
    {
      label: 'Coiffure libre, sans tension, pendant au moins deux semaines',
      reason: 'Le follicule a besoin d’une période sans contrainte mécanique. Aucune repousse ne peut être promise, mais la contrainte doit cesser.'
    },
    {
      label: 'Massage doux du cuir chevelu, sans traction',
      reason: 'Stimule la circulation locale sans solliciter le follicule.'
    },
    {
      label: 'Ne pas reposer une coiffure serrée avant disparition complète des signaux',
      reason: 'Reposer sur un cuir chevelu encore inflammé aggrave la traction au lieu de la répartir.'
    }
  ];
  if (assessment.escalationRequired) {
    steps.push({
      label: 'Consulter un professionnel de santé ou un spécialiste du cuir chevelu',
      reason: 'Une perte de cheveux associée à une inflammation peut être cicatricielle, auquel cas elle est irréversible. Seul un examen peut le déterminer.'
    });
  }
  return steps;
}
