import { BeautyJourney, JourneySynthesis, buildBeautyJourney, buildJourneySynthesis, JourneySources } from '../beautyJourney';
import { MembershipPlanCode, hasCapability } from '../membership';
import { getSupabaseServerClient } from '../supabaseClient';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.4 — BEAUTY JOURNEY : assemblage des sources.
 *
 * Ce module ne collecte rien : il relit ce que les domaines existants ont déjà
 * enregistré (journal de progression, photos, historique de profil, retours
 * d'expérience, faits de progression) et confie la narration à
 * `buildBeautyJourney`, qui est une fonction pure.
 *
 * Les appels inter-domaines passent par la surface composée déclarée sur la
 * classe : aucun import croisé entre modules de domaine.
 */

/** Nombre de faits relus pour la chronologie. Borné : le parcours ne doit pas
 * devenir une requête sans fin pour un membre ancien. */
const JOURNEY_EVENT_LIMIT = 500;

export async function getBeautyJourney(store: SupabaseServerStore, userId: string): Promise<BeautyJourney> {
  const [routineState, photos, profileHistory, loyaltyEvents, loyaltyAccount] = await Promise.all([
    store.getAdaptiveRoutineState(userId),
    store.getBeautyProfilePhotos(userId),
    store.getBeautyProfileHistory(userId),
    store.getLoyaltyEvents(userId, JOURNEY_EVENT_LIMIT),
    store.getLoyaltyAccount(userId)
  ]);

  const sources: JourneySources = {
    journal: routineState?.journal ?? [],
    photos: photos ?? [],
    profileHistory: profileHistory ?? [],
    feedback: routineState?.feedback ?? [],
    loyaltyEvents: (loyaltyEvents ?? []).map(event => ({
      kind: event.kind,
      axis: event.axis,
      points: event.points,
      occurredAt: event.occurredAt
    })),
    level: loyaltyAccount?.level ?? 1
  };

  return buildBeautyJourney(sources);
}

/**
 * Indique d'où viennent les données du parcours. Sans Supabase, le parcours est
 * construit sur le repli mémoire : l'écran le dit plutôt que de laisser croire à
 * une synchronisation.
 */
export async function getBeautyJourneyPersistence(): Promise<'supabase' | 'server_fallback'> {
  return getSupabaseServerClient() ? 'supabase' : 'server_fallback';
}


// ---------------------------------------------------------------------------
// CHANTIER 8.5 — ce que KURLA+ ajoute au parcours
// ---------------------------------------------------------------------------

export interface BeautyJourneyView {
  journey: BeautyJourney;
  /** `null` pour un membre sans KURLA+ : la raison est donnée, pas devinée. */
  synthesis: JourneySynthesis | null;
  synthesisUnavailableReason: string | null;
  /**
   * KURLA+ ne coupe aucune fenêtre : l'historique reste entier pour tout le
   * monde. Ce qui est réservé, c'est le nombre de paires de photos comparées —
   * `allowed: 1` redonne exactement le parcours d'avant l'abonnement.
   */
  comparisonLimit: { allowed: number; total: number; limitedByPlan: boolean };
}

export async function getBeautyJourneyView(
  store: SupabaseServerStore,
  userId: string,
  plan: MembershipPlanCode
): Promise<BeautyJourneyView> {
  const full = await getBeautyJourney(store, userId);
  const deepComparison = hasCapability(plan, 'journey_deep_comparison');
  const synthesisUnlocked = hasCapability(plan, 'journey_synthesis');

  const total = full.comparisons.length;
  const allowed = deepComparison ? total : Math.min(1, total);
  const journey: BeautyJourney = deepComparison
    ? full
    : { ...full, comparisons: full.comparisons.slice(0, 1) };

  return {
    journey,
    synthesis: synthesisUnlocked ? buildJourneySynthesis(full) : null,
    synthesisUnavailableReason: synthesisUnlocked
      ? null
      : 'La synthèse écrite du parcours fait partie de KURLA+. Le parcours lui-même reste entier et gratuit.',
    comparisonLimit: { allowed, total, limitedByPlan: !deepComparison && total > 1 }
  };
}
