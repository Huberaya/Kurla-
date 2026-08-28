import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { getPublishedArticles } from './adminStore';
import { intelligenceStore } from '../intelligenceStore';
import { professionalStore } from '../professionalStore';
import {
  canPublishCreator,
  canTransitionCreator,
  computeCreatorPayout,
  computeCreatorStanding,
  isAttributionEvent
} from '../creatorProgram';

import type { CreatorAttribution, CreatorPayout, CreatorStanding, CreatorStandingInput, CreatorStatus } from '../creatorProgram';
import type { SupabaseServerStore } from '../serverDb';
import type { CreatorApplication } from './types';

/**
 * CHANTIER 8.6c1 — persistance du programme experts/créateurs (features 39 et 40).
 *
 * Trois principes de conception, tous vérifiés par `tests/creator_program.test.ts` :
 *
 *  1. **Aucune entrée de visibilité n'est déclarative.** Les trois compteurs qui
 *     nourrissent `computeCreatorStanding` sont comptés sur des faits déjà
 *     enregistrés par la plateforme (articles publiés sous le nom du créateur,
 *     co-signatures de professionnels vérifiés, résultats déclarés par les
 *     membres). Un créateur ne peut pas augmenter sa visibilité en remplissant
 *     un champ, et KURLA n'écrit aucun compteur à la main.
 *
 *  2. **Un profil sans contribution vérifiée n'apparaît pas.** `getPublicCreatorDirectory`
 *     ne renvoie que les profils au statut `published`, et `published` n'est
 *     atteignable que depuis `verified`.
 *
 *  3. **Le versement ne dépend que des résultats déclarés.** `recordCreatorAttribution`
 *     accepte les clics et les achats — ils sont enregistrés, ils sont comptés,
 *     ils valent zéro. Rien n'est effacé : l'absence de valeur est un choix
 *     affiché, pas un trou dans les données.
 */

const ATTRIBUTION_LIMIT = 2_000;

function mapCreatorRow(row: any): CreatorApplication {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    kind: row.kind,
    specialty: row.specialty || '',
    biography: row.biography || '',
    portfolioUrl: row.portfolio_url || null,
    professionalProfileId: row.professional_profile_id || null,
    status: row.status,
    appliedAt: row.applied_at,
    verifiedAt: row.verified_at || null,
    publishedAt: row.published_at || null,
    adminComment: row.admin_comment || null
  };
}

function toCreatorColumns(application: CreatorApplication) {
  return {
    id: application.id,
    user_id: application.userId,
    display_name: application.displayName,
    kind: application.kind,
    specialty: application.specialty,
    biography: application.biography,
    portfolio_url: application.portfolioUrl,
    professional_profile_id: application.professionalProfileId,
    status: application.status,
    applied_at: application.appliedAt,
    verified_at: application.verifiedAt,
    published_at: application.publishedAt,
    admin_comment: application.adminComment
  };
}

export interface CreateCreatorApplicationInput {
  userId: string;
  displayName: string;
  kind: CreatorApplication['kind'];
  specialty: string;
  biography: string;
  portfolioUrl?: string | null;
}

/**
 * Dépose une candidature. Le statut initial est imposé (`applied`) : il ne vient
 * jamais du corps de la requête.
 */
export async function createCreatorApplication(
  store: SupabaseServerStore,
  input: CreateCreatorApplicationInput
): Promise<CreatorApplication> {
  const now = new Date().toISOString();

  // Lien automatique avec un profil professionnel déjà vérifié du même compte.
  // Sans ce lien, les appuis et contradictions restent à zéro — ils ne sont pas
  // devinés.
  let professionalProfileId: string | null = null;
  try {
    const professionals = await professionalStore.getPublicProfessionals();
    professionalProfileId = professionals.find(profile => profile.userId === input.userId)?.id ?? null;
  } catch {
    professionalProfileId = null;
  }

  const application: CreatorApplication = {
    id: randomUUID(),
    userId: input.userId,
    displayName: input.displayName,
    kind: input.kind,
    specialty: input.specialty,
    biography: input.biography,
    portfolioUrl: input.portfolioUrl ?? null,
    professionalProfileId,
    status: 'applied',
    appliedAt: now,
    verifiedAt: null,
    publishedAt: null,
    adminComment: null
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('creator_applications').insert(toCreatorColumns(application));
    ensureDatabaseSuccess('dépôt de la candidature créateur', error);
  }

  store.inMemoryCreatorApplications.unshift(application);
  return application;
}

export async function getCreatorApplications(store: SupabaseServerStore): Promise<CreatorApplication[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('creator_applications')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(500);
    ensureDatabaseSuccess('lecture des candidatures créateur', error);
    return (data || []).map(mapCreatorRow);
  }
  return [...store.inMemoryCreatorApplications];
}

export async function getCreatorApplication(
  store: SupabaseServerStore,
  id: string
): Promise<CreatorApplication | undefined> {
  const applications = await getCreatorApplications(store);
  return applications.find(application => application.id === id);
}

export async function getCreatorApplicationByUser(
  store: SupabaseServerStore,
  userId: string
): Promise<CreatorApplication | undefined> {
  const applications = await getCreatorApplications(store);
  return applications.find(application => application.userId === userId);
}

/**
 * Fait passer une candidature d'un statut à un autre.
 *
 * Les transitions illégales lèvent : passer directement de `applied` à
 * `published` contournerait la vérification d'identité, et c'est exactement ce
 * que `canTransitionCreator` interdit.
 */
export async function reviewCreatorApplication(
  store: SupabaseServerStore,
  id: string,
  status: CreatorStatus,
  adminComment?: string
): Promise<CreatorApplication> {
  const current = await getCreatorApplication(store, id);
  if (!current) throw new Error('Candidature introuvable.');
  if (!canTransitionCreator(current.status, status)) {
    throw new Error(`Transition refusée : ${current.status} → ${status}.`);
  }
  if (status === 'published' && !canPublishCreator(current.status)) {
    throw new Error('Un profil doit être vérifié avant d’être publié.');
  }

  const now = new Date().toISOString();
  const updated: CreatorApplication = {
    ...current,
    status,
    verifiedAt: status === 'verified' ? current.verifiedAt ?? now : current.verifiedAt,
    publishedAt: status === 'published' ? now : current.publishedAt,
    adminComment: adminComment?.trim() ? adminComment.trim() : current.adminComment
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    // La transition est rejouée par la base : `review_creator_application`
    // applique les mêmes règles que `canTransitionCreator`. Le contrôle
    // TypeScript ci-dessus sert à refuser tôt et à donner un message clair, pas
    // à remplacer la contrainte.
    const { data, error } = await supabase.rpc('review_creator_application', {
      p_id: id,
      p_status: status,
      p_admin_comment: adminComment?.trim() || null
    });
    ensureDatabaseSuccess('revue de la candidature créateur', error);
    if (!data) throw new Error('Candidature introuvable.');
    return mapCreatorRow(data);
  }

  const index = store.inMemoryCreatorApplications.findIndex(application => application.id === id);
  if (index >= 0) store.inMemoryCreatorApplications[index] = updated;
  return updated;
}

export interface RecordCreatorAttributionInput {
  creatorId: string;
  event: CreatorAttribution['event'];
  productId?: string | null;
  outcomeSignal?: string | null;
  /** Clé d'idempotence : deux appels avec le même id n'écrivent qu'une ligne. */
  id?: string;
  occurredAt?: string;
}

/**
 * Enregistre une attribution. Les clics, ajouts à l'étagère et achats sont
 * acceptés et conservés — leur valeur monétaire est nulle, et c'est
 * `computeCreatorPayout` qui l'applique, pas cette fonction. On garde ainsi la
 * trace de ce qui s'est passé sans en faire un droit à paiement.
 */
export async function recordCreatorAttribution(
  store: SupabaseServerStore,
  input: RecordCreatorAttributionInput
): Promise<CreatorAttribution> {
  if (!input.creatorId.trim()) throw new Error('Le créateur concerné est obligatoire.');
  if (!isAttributionEvent(input.event)) throw new Error('Événement d’attribution inconnu.');

  const id = input.id?.trim() || randomUUID();
  const existing = await getCreatorAttributions(store, input.creatorId);
  const duplicate = existing.find(attribution => attribution.id === id);
  if (duplicate) return duplicate;

  const attribution: CreatorAttribution = {
    id,
    creatorId: input.creatorId,
    productId: input.productId?.trim() ? input.productId.trim() : null,
    event: input.event,
    outcomeSignal: input.outcomeSignal?.trim() ? input.outcomeSignal.trim() : null,
    occurredAt: input.occurredAt || new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('creator_attributions').insert({
      id: attribution.id,
      creator_id: attribution.creatorId,
      product_id: attribution.productId,
      event: attribution.event,
      outcome_signal: attribution.outcomeSignal,
      occurred_at: attribution.occurredAt
    });
    ensureDatabaseSuccess('enregistrement de l’attribution créateur', error);
  }

  const list = store.inMemoryCreatorAttributions.get(attribution.creatorId) || [];
  store.inMemoryCreatorAttributions.set(attribution.creatorId, [...list, attribution].slice(-ATTRIBUTION_LIMIT));
  return attribution;
}

export async function getCreatorAttributions(
  store: SupabaseServerStore,
  creatorId: string
): Promise<CreatorAttribution[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('creator_attributions')
      .select('*')
      .eq('creator_id', creatorId)
      .order('occurred_at', { ascending: true })
      .limit(ATTRIBUTION_LIMIT);
    ensureDatabaseSuccess('lecture des attributions créateur', error);
    return (data || []).map(row => ({
      id: row.id,
      creatorId: row.creator_id,
      productId: row.product_id || null,
      event: row.event,
      outcomeSignal: row.outcome_signal || null,
      occurredAt: row.occurred_at
    }));
  }
  return [...(store.inMemoryCreatorAttributions.get(creatorId) || [])];
}

/**
 * Compte les entrées de visibilité sur des faits existants.
 *
 *  - contributions : contenus éducatifs publiés signés du nom affiché du créateur ;
 *  - appuis et contradictions : co-signatures de professionnels vérifiés liées au
 *    profil professionnel du créateur (`approved`/`amended` = appui,
 *    `contradicted` = contradiction) ;
 *  - résultats déclarés : attributions `outcome_declared`.
 *
 * Aucun de ces compteurs n'est saisissable. Sans fait enregistré, tout vaut
 * zéro — et un score de zéro n'est pas masqué.
 */
export async function countCreatorStandingInputs(
  store: SupabaseServerStore,
  creatorId: string
): Promise<CreatorStandingInput> {
  const application = await getCreatorApplication(store, creatorId);
  if (!application) {
    return { contributions: 0, endorsements: 0, contradictions: 0, outcomeReports: 0 };
  }

  const [articles, endorsements, attributions] = await Promise.all([
    getPublishedArticles(store).catch(() => [] as any[]),
    application.professionalProfileId
      ? intelligenceStore.getEndorsements({ professionalId: application.professionalProfileId }).catch(() => [])
      : Promise.resolve([]),
    getCreatorAttributions(store, creatorId)
  ]);

  const signature = application.displayName.trim().toLowerCase();
  const contributions = signature
    ? articles.filter(article => String(article?.author ?? '').trim().toLowerCase() === signature).length
    : 0;

  return {
    contributions,
    endorsements: endorsements.filter(item => item.stance === 'approved' || item.stance === 'amended').length,
    contradictions: endorsements.filter(item => item.stance === 'contradicted').length,
    outcomeReports: attributions.filter(attribution => attribution.event === 'outcome_declared').length
  };
}

export interface CreatorStandingResult {
  creatorId: string;
  status: CreatorStatus;
  /** Un profil non publié n'a pas de visibilité publique à afficher. */
  isListed: boolean;
  standing: CreatorStanding;
}

export async function getCreatorStanding(
  store: SupabaseServerStore,
  creatorId: string
): Promise<CreatorStandingResult> {
  const application = await getCreatorApplication(store, creatorId);
  if (!application) throw new Error('Créateur introuvable.');
  const inputs = await countCreatorStandingInputs(store, creatorId);
  return {
    creatorId,
    status: application.status,
    isListed: application.status === 'published',
    standing: computeCreatorStanding(inputs)
  };
}

export interface CreatorPayoutResult {
  payout: CreatorPayout;
  attributions: CreatorAttribution[];
}

export async function getCreatorPayout(
  store: SupabaseServerStore,
  creatorId: string
): Promise<CreatorPayoutResult> {
  const attributions = await getCreatorAttributions(store, creatorId);
  return {
    attributions,
    payout: computeCreatorPayout(creatorId, attributions)
  };
}

export interface PublicCreatorEntry {
  id: string;
  displayName: string;
  kind: CreatorApplication['kind'];
  specialty: string;
  biography: string;
  portfolioUrl: string | null;
  visibilityScore: number;
  contributions: number;
  endorsements: number;
  outcomeReports: number;
  publishedAt: string | null;
}

/**
 * Annuaire public des créateurs.
 *
 * Classé par score de visibilité décroissant — c'est-à-dire par contributions
 * vérifiées. Aucune donnée de contact n'est exposée, et aucun paramètre ne
 * permet de remonter un profil : il n'existe pas d'option de mise en avant.
 */
export async function getPublicCreatorDirectory(store: SupabaseServerStore): Promise<PublicCreatorEntry[]> {
  const applications = (await getCreatorApplications(store)).filter(application => application.status === 'published');
  const entries = await Promise.all(
    applications.map(async application => {
      const inputs = await countCreatorStandingInputs(store, application.id);
      const standing = computeCreatorStanding(inputs);
      const entry: PublicCreatorEntry = {
        id: application.id,
        displayName: application.displayName,
        kind: application.kind,
        specialty: application.specialty,
        biography: application.biography,
        portfolioUrl: application.portfolioUrl,
        visibilityScore: standing.visibilityScore,
        contributions: standing.contributions,
        endorsements: standing.endorsements,
        outcomeReports: standing.outcomeReports,
        publishedAt: application.publishedAt
      };
      return entry;
    })
  );
  return entries.sort((a, b) => b.visibilityScore - a.visibilityScore || a.displayName.localeCompare(b.displayName));
}
