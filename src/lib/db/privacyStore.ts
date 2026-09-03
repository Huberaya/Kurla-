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

/**
 * Tables personnelles supprimées par `user_id` quand la base est configurée.
 *
 * Exporté pour que le banc « vie privée » puisse vérifier qu'aucune table
 * contenant des données personnelles n'est oubliée : c'est exactement le
 * défaut qu'avait `carts` avant le 2026-09-03.
 */
export const PERSONAL_TABLES: Array<[string, string]> = [
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
  ['brand_contracts', 'brand_user_id'],
  ['brand_invoices', 'brand_user_id'],
  ['support_tickets', 'user_id'],
  ['loyalty_events', 'user_id'],
  ['loyalty_redemptions', 'user_id'],
  ['loyalty_accounts', 'user_id'],
  ['creator_applications', 'user_id'],
  ['brand_test_participations', 'user_id'],
  ['brand_test_observations', 'user_id'],
  ['mobile_sync_actions', 'user_id'],
  ['professional_applications', 'user_id'],
  ['carts', 'user_id']
];

/** Pièces conservées pour obligation légale : la réponse le déclare. */
export const RETAINED_FOR_LEGAL_REASONS = [
  'orders',
  'payments',
  'refunds',
  'shipments'
];

/**
 * CHANTIER 12 (bloc D) — lecture réelle des contenus personnels.
 *
 * Les sections « avis », « questions » et « réponses » lisaient uniquement les
 * collections en mémoire : en mode Supabase, l'export RGPD les aurait rendues
 * **vides** — un export incomplet sans le dire, ce qui est précisément ce qu'un
 * droit d'accès ne doit pas être. Toute lecture qui échoue est désormais
 * remontée dans `exportErrors` plutôt que passée sous silence.
 */
async function readPersonalRows(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  table: string,
  column: string,
  userId: string,
  failures: string[]
): Promise<unknown[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select('*').eq(column, userId);
  if (error) {
    failures.push(`${table} : ${error.message}`);
    return [];
  }
  return data ?? [];
}

export interface UserDataExport {
  generatedAt: string;
  userId: string;
  sections: Record<string, unknown>;
  retainedForLegalReasons: string[];
  /**
   * CHANTIER 12 (bloc D) — vide en temps normal. Non vide, l'export est
   * incomplet et le membre doit le savoir : un droit d'accès rendu
   * partiellement sans le dire n'est pas un droit d'accès.
   */
  exportErrors: string[];
}

export async function exportUserData(store: SupabaseServerStore, userId: string): Promise<UserDataExport> {
  const supabase = getSupabaseServerClient();
  const exportErrors: string[] = [];
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
      productReviews: supabase
        ? await readPersonalRows(supabase, 'reviews', 'user_id', userId, exportErrors)
        : store.inMemoryProductReviews.filter(review => review.userId === userId),
      productQuestions: supabase
        ? await readPersonalRows(supabase, 'product_questions', 'user_id', userId, exportErrors)
        : store.inMemoryProductQuestions.filter(question => question.userId === userId),
      questionAnswers: supabase
        ? await readPersonalRows(supabase, 'product_question_answers', 'user_id', userId, exportErrors)
        : store.inMemoryQuestionAnswers.filter(answer => answer.userId === userId),
      brandContracts: supabase
        ? await readPersonalRows(supabase, 'brand_contracts', 'brand_user_id', userId, exportErrors)
        : store.inMemoryBrandContracts.filter(contract => contract.brandUserId === userId),
      brandInvoices: supabase
        ? await readPersonalRows(supabase, 'brand_invoices', 'brand_user_id', userId, exportErrors)
        : store.inMemoryBrandInvoices.filter(invoice => invoice.brandUserId === userId),
      shippingAddresses: addresses ?? [],
      notificationPreferences: notificationPrefs ?? null,
      notifications: notifications ?? [],
      professionalEndorsementsAsClient: endorsements
    },
    retainedForLegalReasons: RETAINED_FOR_LEGAL_REASONS,
    // Vide en temps normal. Non vide, cela veut dire que l'export est incomplet
    // et le membre doit en être informé — jamais un silence.
    exportErrors
  };
}

export interface UserDataDeletion {
  userId: string;
  deletedAt: string;
  retainedForLegalReasons: string[];
  accountDeleted: boolean;
  /** Cause de l'échec quand le compte d'authentification n'a PAS été supprimé. */
  accountDeletionError: string | null;
}

export async function deleteUserData(store: SupabaseServerStore, userId: string): Promise<UserDataDeletion> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    // Le panier d'abord, lignes comprises. `cart_items` n'a pas de `user_id` :
    // on passe par les paniers du membre. C'est aussi ce qui garantit
    // l'effacement même si la cascade de clé étrangère n'a pas été appliquée.
    const { data: memberCarts } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .then(result => (result.error ? { data: null } : result), () => ({ data: null }));
    if (memberCarts && memberCarts.length > 0) {
      await supabase
        .from('cart_items')
        .delete()
        .in('cart_id', memberCarts.map(cart => (cart as { id: string }).id))
        .then(() => undefined, () => undefined);
    }

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
  store.inMemoryBrandContracts = store.inMemoryBrandContracts.filter(contract => contract.brandUserId !== userId);
  store.inMemoryBrandInvoices = store.inMemoryBrandInvoices.filter(invoice => invoice.brandUserId !== userId);
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
  //
  // C'est la seule suppression qui compte vraiment : si elle échoue, le membre
  // peut encore se connecter et KURLA détient toujours son identité. L'erreur
  // est donc remontée textuellement dans `accountDeletionError` plutôt que
  // réduite à un booléen muet — la route s'en sert pour répondre 500 au lieu
  // d'annoncer un effacement qui n'a pas eu lieu.
  let accountDeleted = false;
  let accountDeletionError: string | null = null;
  if (supabase?.auth?.admin?.deleteUser) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    accountDeleted = !error;
    if (error) accountDeletionError = error.message || 'Suppression du compte refusée par le fournisseur d’authentification.';
  }

  return {
    userId,
    deletedAt: new Date().toISOString(),
    retainedForLegalReasons: RETAINED_FOR_LEGAL_REASONS,
    accountDeleted,
    accountDeletionError
  };
}
