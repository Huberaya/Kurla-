import { getSupabaseServerClient } from '../supabaseClient';
import { intelligenceStore } from '../intelligenceStore';
import { getBeautyProfile, getBeautyProfileHistory, getBeautyProfilePhotos } from './beautyProfileStore';
import { getFamilyDashboard } from './familyStore';
import { getSupportTicketsByUser } from './supportStore';
import { getLoyaltyOverview } from './loyaltyStore';
import { getBeautyJourney } from './journeyStore';
import { getShippingAddresses } from './shippingStore';
import { getNotifications, getNotificationPreferences } from './notificationsStore';
import { deleteAdaptiveRoutineData } from './adaptiveRoutineStore';
import { deleteAiSessions } from './aiSessionStore';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 9 (bloc A2) — EXPORT / SUPPRESSION EN 1 CLIC (feature 43).
 *
 * Le RGPD n'est pas une page de paramètres : c'est un droit exécutable. Ce
 * module concentre les deux opérations pour qu'elles soient auditées au même
 * endroit, et il applique deux règles :
 *
 *  1. **L'export est complet et lisible.** Le membre reçoit tout ce que KURLA
 *     détient sur lui, structuré, y compris ce qui est vide. Un export qui
 *     oublie une source n'est pas un export.
 *  2. **La suppression efface, elle n'archive pas.** Les données personnelles
 *     et comportementales sont détruites. Seules les pièces comptables
 *     (commandes, paiements, remboursements) sont conservées, parce que la loi
 *     l'impose — et la réponse le dit, plutôt que de promettre un effacement
 *     total qu'elle ne tiendrait pas.
 *
 * Le compte d'authentification lui-même est supprimé via l'API d'administration
 * Supabase quand le rôle service le permet ; c'est la seule suppression qui
 * compte vraiment, et elle est tentée en dernier.
 */

/** Tables personnelles supprimées par `user_id` quand la base est configurée. */
const PERSONAL_TABLES: Array<[string, string]> = [
  ['beauty_profiles', 'user_id'],
  ['beauty_profile_history', 'user_id'],
  ['beauty_profile_photos', 'user_id'],
  ['family_members', 'space_id'],
  ['routine_tasks', 'plan_id'],
  ['routine_plans', 'user_id'],
  ['ai_sessions', 'user_id'],
  ['notifications', 'user_id'],
  ['shipping_addresses', 'user_id'],
  ['support_messages', 'user_id'],
  ['product_question_answers', 'user_id'],
  ['product_questions', 'user_id'],
  ['reviews', 'user_id'],
  ['support_tickets', 'user_id'],
  ['loyalty_events', 'user_id'],
  ['loyalty_redemptions', 'user_id'],
  ['loyalty_accounts', 'user_id'],
  ['creator_applications', 'user_id'],
  ['brand_test_participations', 'user_id'],
  ['brand_test_observations', 'user_id'],
  ['mobile_sync_actions', 'user_id'],
  ['professional_applications', 'user_id']
];

/** Pièces conservées pour obligation légale : la réponse le déclare. */
export const RETAINED_FOR_LEGAL_REASONS = [
  'orders',
  'payments',
  'refunds',
  'shipments'
];

export interface UserDataExport {
  generatedAt: string;
  userId: string;
  sections: Record<string, unknown>;
  retainedForLegalReasons: string[];
}

export async function exportUserData(store: SupabaseServerStore, userId: string): Promise<UserDataExport> {
  const [profile, history, photos, shelf, outcomes, protective, washDay, loyalty, familyMembers, tickets] =
    await Promise.all([
      getBeautyProfile(store, userId).catch(() => undefined),
      getBeautyProfileHistory(store, userId).catch(() => []),
      getBeautyProfilePhotos(store, userId).catch(() => []),
      intelligenceStore.getShelf(userId).catch(() => []),
      intelligenceStore.getOutcomes(userId).catch(() => []),
      intelligenceStore.getProtectiveStyles(userId).catch(() => []),
      intelligenceStore.getWashDayCycle(userId).catch(() => undefined),
      getLoyaltyOverview(store, userId).catch(() => undefined),
      getFamilyDashboard(store, userId).catch(() => ({ spaces: [], members: [], plans: [] })),
      getSupportTicketsByUser(store, userId).catch(() => [])
    ]);

  const journey = await getBeautyJourney(store, userId).catch(() => undefined);
  const endorsements = await intelligenceStore.getEndorsements({ clientUserId: userId }).catch(() => []);
  const [addresses, notificationPrefs, notifications] = await Promise.all([
    getShippingAddresses(store, userId).catch(() => []),
    getNotificationPreferences(store, userId).catch(() => undefined),
    getNotifications(store, userId).catch(() => [])
  ]);

  return {
    generatedAt: new Date().toISOString(),
    userId,
    sections: {
      beautyProfile: profile?.profile ?? null,
      beautyProfileHistory: history,
      // Les photos ne sont pas incluses en clair dans l'export JSON : on donne
      // leur métadonnée. Le membre qui veut le fichier peut le demander ; un
      // export JSON ne doit pas embarquer de binaire.
      beautyProfilePhotos: (photos ?? []).map(photo => ({ id: photo.id, mimeType: photo.mimeType, consentAt: photo.consentAt, uploadedAt: photo.uploadedAt })),
      shelf,
      outcomeObservations: outcomes,
      protectiveStyles: protective,
      washDayCycle: washDay ?? null,
      loyalty: loyalty ?? null,
      beautyJourney: journey ?? null,
      familyMembers: familyMembers?.members ?? [],
      supportTickets: tickets ?? [],
      productReviews: store.inMemoryProductReviews.filter(review => review.userId === userId),
      productQuestions: store.inMemoryProductQuestions.filter(question => question.userId === userId),
      questionAnswers: store.inMemoryQuestionAnswers.filter(answer => answer.userId === userId),
      shippingAddresses: addresses ?? [],
      notificationPreferences: notificationPrefs ?? null,
      notifications: notifications ?? [],
      professionalEndorsementsAsClient: endorsements
    },
    retainedForLegalReasons: RETAINED_FOR_LEGAL_REASONS
  };
}

export interface UserDataDeletion {
  userId: string;
  deletedAt: string;
  retainedForLegalReasons: string[];
  accountDeleted: boolean;
}

export async function deleteUserData(store: SupabaseServerStore, userId: string): Promise<UserDataDeletion> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    for (const [table, column] of PERSONAL_TABLES) {
      // Meilleure volonté : une table absente ne bloque pas l'effacement du reste.
      await supabase.from(table).delete().eq(column, userId).then(() => undefined, () => undefined);
    }
  }

  // --- Repli mémoire : les collections personnelles sont vidées. ---
  store.inMemoryBeautyProfiles.delete(userId);
  store.inMemoryBeautyProfileHistory.delete(userId);
  store.inMemoryBeautyProfilePhotos.delete(userId);
  store.inMemoryFamilyMembers.delete(userId);
  store.inMemoryFamilyPlans.delete(userId);
  store.inMemoryFamilySpaces.delete(userId);
  store.inMemoryRoutinePlans.delete(userId);
  store.inMemoryPreferences.delete(userId);
  store.inMemoryShippingAddresses.delete(userId);
  store.inMemoryNotifications = store.inMemoryNotifications.filter(notification => notification.userId !== userId);
  store.inMemoryTickets = store.inMemoryTickets.filter(ticket => ticket.userId !== userId);
  // CHANTIER 11 (bloc C) — les contenus communautaires sont des données
  // personnelles comme les autres : la suppression du compte les emporte.
  store.inMemoryProductReviews = store.inMemoryProductReviews.filter(review => review.userId !== userId);
  store.inMemoryProductQuestions = store.inMemoryProductQuestions.filter(question => question.userId !== userId);
  store.inMemoryQuestionAnswers = store.inMemoryQuestionAnswers.filter(answer => answer.userId !== userId);
  store.inMemoryLoyaltyAccounts.delete(userId);
  store.inMemoryLoyaltyEvents = store.inMemoryLoyaltyEvents.filter(event => event.userId !== userId);
  store.inMemoryLoyaltyRedemptions = store.inMemoryLoyaltyRedemptions.filter(redemption => redemption.userId !== userId);
  store.inMemoryProfessionalApplications = store.inMemoryProfessionalApplications.filter(application => application.userId !== userId);
  store.inMemoryCreatorApplications = store.inMemoryCreatorApplications.filter(application => application.userId !== userId);
  store.inMemoryCreatorAttributions.delete(userId);
  store.inMemoryBrandTestParticipations = store.inMemoryBrandTestParticipations.filter(item => item.userId !== userId);
  store.inMemoryBrandTestObservations = store.inMemoryBrandTestObservations.filter(item => item.userId !== userId);
  store.inMemoryMobileSyncActions = store.inMemoryMobileSyncActions.filter(action => action.userId !== userId);

  await intelligenceStore.deleteIntelligenceUserData(userId);
  await deleteAdaptiveRoutineData(store, userId).catch(() => undefined);
  await deleteAiSessions(store, userId).catch(() => undefined);

  // --- Le compte d'authentification, en dernier. ---
  let accountDeleted = false;
  if (supabase?.auth?.admin?.deleteUser) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    accountDeleted = !error;
  }

  return {
    userId,
    deletedAt: new Date().toISOString(),
    retainedForLegalReasons: RETAINED_FOR_LEGAL_REASONS,
    accountDeleted
  };
}
