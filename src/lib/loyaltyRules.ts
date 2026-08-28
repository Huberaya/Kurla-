/**
 * CHANTIER 8.3 — KURLA PROGRESSION : barème partagé.
 *
 * La source de vérité est la base : `supabase/migrations/20260862000000_loyalty_progression.sql`
 * sème `loyalty_levels`, `loyalty_axes`, `loyalty_event_rules`, `loyalty_rewards`
 * et `loyalty_badges`, et la RPC `apply_loyalty_event` calcule tout.
 *
 * Ce module recopie les mêmes nombres pour deux usages précis :
 *   1. le repli mémoire (base indisponible) ;
 *   2. le premier rendu de l'écran, avant la réponse du serveur.
 *
 * `tests/loyalty_progression.test.ts` vérifie que chaque nombre ci-dessous est
 * bien celui de la migration : si l'un bouge sans l'autre, le banc échoue.
 */

export type LoyaltyAxis = 'connaissance' | 'pratique' | 'contribution' | 'exploration' | 'achat';

export type LoyaltyEventKind =
  | 'profile_completed'
  | 'archetype_known'
  | 'routine_preferences'
  | 'routine_task_done'
  | 'journal_entry'
  | 'wash_day_completed'
  | 'outcome_observed'
  | 'review_verified'
  | 'review_unverified'
  | 'question_asked'
  | 'routine_feedback'
  | 'ai_feedback'
  | 'scan_performed'
  | 'order_paid';

export interface LoyaltyLevel {
  level: number;
  code: string;
  label: string;
  minScore: number;
  benefit?: string;
}

export interface LoyaltyAxisRule {
  axis: LoyaltyAxis;
  label: string;
  maxPoints: number;
  rationale: string;
}

export interface LoyaltyEventRule {
  kind: LoyaltyEventKind;
  axis: LoyaltyAxis;
  points: number;
  dailyCap: number | null;
  onceOnly: boolean;
  label: string;
}

export interface LoyaltyReward {
  code: string;
  label: string;
  description: string;
  levelRequired: number;
  kind: string;
  isActive: boolean;
}

export interface LoyaltyBadge {
  code: string;
  label: string;
  description: string;
  criterion: Record<string, unknown>;
}

export const LOYALTY_LEVELS: LoyaltyLevel[] = [
  { level: 1, code: 'decouverte', label: 'Découverte', minScore: 0, benefit: 'Accès au diagnostic et au suivi de routine' },
  { level: 2, code: 'routine', label: 'Routine', minScore: 60, benefit: 'Accès anticipé aux nouveautés du catalogue' },
  { level: 3, code: 'regularite', label: 'Régularité', minScore: 140, benefit: 'Diagnostic approfondi offert avec un professionnel' },
  { level: 4, code: 'maitrise', label: 'Maîtrise', minScore: 240, benefit: 'Atelier en ligne réservé aux membres' },
  { level: 5, code: 'expertise', label: 'Expertise', minScore: 340, benefit: 'Séance de conseil individuelle avec un professionnel vérifié' }
];

export const LOYALTY_AXES: LoyaltyAxisRule[] = [
  { axis: 'connaissance', label: 'Connaissance de soi', maxPoints: 100, rationale: 'Profil, archétype et préférences : sans eux, rien n’est personnalisé' },
  { axis: 'pratique', label: 'Pratique', maxPoints: 120, rationale: 'Routine tenue, cycles, journal, résultats observés' },
  { axis: 'contribution', label: 'Contribution', maxPoints: 100, rationale: 'Avis, questions et retours qui servent aux autres membres' },
  { axis: 'exploration', label: 'Exploration', maxPoints: 60, rationale: 'Scans et découvertes d’ingrédients' },
  { axis: 'achat', label: 'Achat', maxPoints: 80, rationale: 'Plafonné : acheter ne peut pas, seul, faire progresser d’un niveau' }
];

export const LOYALTY_EVENT_RULES: LoyaltyEventRule[] = [
  { kind: 'profile_completed', axis: 'connaissance', points: 40, dailyCap: null, onceOnly: true, label: 'Profil beauté complété' },
  { kind: 'archetype_known', axis: 'connaissance', points: 20, dailyCap: null, onceOnly: true, label: 'Archétype capillaire identifié' },
  { kind: 'routine_preferences', axis: 'connaissance', points: 20, dailyCap: null, onceOnly: true, label: 'Préférences de routine enregistrées' },
  { kind: 'routine_task_done', axis: 'pratique', points: 4, dailyCap: 12, onceOnly: false, label: 'Tâche de routine accomplie' },
  { kind: 'journal_entry', axis: 'pratique', points: 6, dailyCap: 12, onceOnly: false, label: 'Entrée de journal de progression' },
  { kind: 'wash_day_completed', axis: 'pratique', points: 15, dailyCap: 15, onceOnly: false, label: 'Cycle wash day terminé' },
  { kind: 'outcome_observed', axis: 'pratique', points: 12, dailyCap: 24, onceOnly: false, label: 'Résultat observé et renseigné' },
  { kind: 'review_verified', axis: 'contribution', points: 20, dailyCap: 20, onceOnly: false, label: 'Avis vérifié publié (achat réglé)' },
  { kind: 'review_unverified', axis: 'contribution', points: 5, dailyCap: 10, onceOnly: false, label: 'Avis publié' },
  { kind: 'question_asked', axis: 'contribution', points: 5, dailyCap: 10, onceOnly: false, label: 'Question posée sur un produit' },
  { kind: 'routine_feedback', axis: 'contribution', points: 10, dailyCap: 20, onceOnly: false, label: 'Retour d’expérience sur une routine' },
  { kind: 'ai_feedback', axis: 'contribution', points: 5, dailyCap: 10, onceOnly: false, label: 'Retour sur une réponse de l’assistant' },
  { kind: 'scan_performed', axis: 'exploration', points: 5, dailyCap: 15, onceOnly: false, label: 'Scan d’un produit ou d’un ingrédient' },
  { kind: 'order_paid', axis: 'achat', points: 20, dailyCap: null, onceOnly: false, label: 'Commande réglée' }
];

export const LOYALTY_REWARDS: LoyaltyReward[] = [
  { code: 'early_access', label: 'Accès anticipé', description: 'Voir et réserver les nouveautés avant leur ouverture publique.', levelRequired: 2, kind: 'acces', isActive: true },
  { code: 'diagnostic_approfondi', label: 'Diagnostic approfondi', description: 'Analyse complète du profil et de la routine avec un professionnel partenaire.', levelRequired: 3, kind: 'service', isActive: true },
  { code: 'atelier_membre', label: 'Atelier en ligne', description: 'Atelier réservé aux membres : routine, cuir chevelu, coiffures protectrices.', levelRequired: 4, kind: 'atelier', isActive: true },
  { code: 'conseil_pro_offert', label: 'Conseil individuel', description: 'Séance de conseil individuelle avec un professionnel vérifié.', levelRequired: 5, kind: 'service', isActive: true }
];

export const LOYALTY_BADGES: LoyaltyBadge[] = [
  { code: 'premier_scan', label: 'Premier scan', description: 'Un produit ou un ingrédient scanné.', criterion: { kind: 'scan_performed', count: 1 } },
  { code: 'explorateur', label: 'Explorateur', description: 'Douze scans : la curiosité paie.', criterion: { kind: 'scan_performed', count: 12 } },
  { code: 'critique_verifiee', label: 'Critique vérifiée', description: 'Un avis publié après un achat réglé.', criterion: { kind: 'review_verified', count: 1 } },
  { code: 'contributeur', label: 'Contributeur', description: 'Cinq retours qui servent aux autres membres.', criterion: { axis: 'contribution', count: 5 } },
  { code: 'trente_jours', label: 'Trente jours', description: 'Trente jours d’activité : la régularité est le vrai levier.', criterion: { distinct_days: 30 } },
  { code: 'sans_achat', label: 'Progression libre', description: 'Niveau 3 atteint sans aucune commande.', criterion: { level: 3, without_kind: 'order_paid' } }
];

export const LOYALTY_MAX_SCORE = LOYALTY_AXES.reduce((total, axis) => total + axis.maxPoints, 0);

/** Somme maximale atteignable sans aucune commande : le plafond de l'axe achat retiré. */
export const LOYALTY_MAX_SCORE_WITHOUT_PURCHASE =
  LOYALTY_AXES.filter(axis => axis.axis !== 'achat').reduce((total, axis) => total + axis.maxPoints, 0);

export const LOYALTY_RULE_BY_KIND = new Map<LoyaltyEventKind, LoyaltyEventRule>(
  LOYALTY_EVENT_RULES.map(rule => [rule.kind, rule])
);

export function isLoyaltyEventKind(value: unknown): value is LoyaltyEventKind {
  return typeof value === 'string' && LOYALTY_RULE_BY_KIND.has(value as LoyaltyEventKind);
}

export function levelForScore(score: number): LoyaltyLevel {
  return (
    [...LOYALTY_LEVELS].reverse().find(level => score >= level.minScore) ?? LOYALTY_LEVELS[0]
  );
}

export function nextLevelFor(score: number): LoyaltyLevel | undefined {
  return LOYALTY_LEVELS.find(level => level.minScore > score);
}
