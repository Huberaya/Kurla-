import { BeautyJourney, buildBeautyJourney, JourneySources } from '../beautyJourney';
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
