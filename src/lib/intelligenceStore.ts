/**
 * KURLA INTELLIGENCE STORE — persistance de la couche d'intelligence.
 *
 * Volontairement séparé de `serverDb.ts` (6 124 lignes) : ajouter la couche
 * d'intelligence dans le monolithe existant irait à l'encontre de l'action de
 * découpage. Ce store suit le même contrat : Supabase quand il est configuré,
 * mémoire explicite sinon — jamais un mode à moitié autorisé.
 */

import { randomUUID } from 'node:crypto';
import { getSupabaseServerClient } from './supabaseClient';
import {
  ArchetypeDerivation,
  ArchetypeKey,
  DEFAULT_K_ANONYMITY_THRESHOLD,
  deriveArchetype,
  archetypeIdOf,
  archetypeLabel
} from './archetype';
import {
  aggregateOutcomes,
  isOutcomeSignal,
  OutcomeAggregate,
  OutcomeObservation,
  OutcomeSignal,
  valenceOf
} from './outcomeEvidence';
import {
  AbandonmentReason,
  evaluateReplenishment,
  isAbandonmentReason,
  isRoutineStep,
  ReplenishmentSignal,
  RoutineStep,
  ShelfItem,
  ShelfStatus
} from './shelf';
import {
  checkJurisdiction,
  JurisdictionFinding,
  JurisdictionRestriction
} from './ingredientGraph';
import {
  ArchetypeRating,
  computeArchetypeRating
} from './outcomeEvidence';
import {
  isReturnInsightReason,
  ReturnInsightRecord,
  ReturnInsightReason,
  ReturnInsightSummary,
  summarizeReturnInsights
} from './returnInsight';
import {
  canDisplayEndorsement,
  endorsementDisclaimer,
  EndorsementAmendment,
  EndorsementImpact,
  EndorsementStance,
  handleContradiction,
  isEndorsementStance,
  ProfessionalEndorsement,
  summarizeEndorsements
} from './proEndorsement';
import {
  defaultMaxWearDays,
  isProtectiveSignal,
  isTensionLevel,
  ProtectiveSignal,
  ProtectiveStyleEpisode,
  TensionLevel
} from './protectiveStyle';
import { BeautyProfile } from './beautyProfile';

export interface WashDayCyclePrefs {
  intervalDays: number;
  lastWashDayAt?: string;
  deepConditionEveryNWashDays: number;
  /** `null` signifie « soin protéiné désactivé », pas « fréquence inconnue ». */
  proteinEveryNWashDays: number | null;
  nightProtection: 'none' | 'bonnet' | 'satin_pillowcase' | 'scarf';
  availableMinutesPerDay: number;
  hardWater: boolean;
}

export type WashDayCycleInput = Partial<Record<keyof WashDayCyclePrefs, unknown>>;

function ensureSuccess(operation: string, error: { message?: string } | null | undefined): void {
  if (error) throw new Error(`[Supabase] ${operation}: ${error.message || 'opération refusée'}`);
}

function iso(value: unknown): string | undefined {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toISOString() : undefined;
}

// ---------------------------------------------------------------------------
// SHELF
// ---------------------------------------------------------------------------

const SHELF_STATUSES: ShelfStatus[] = ['owned', 'in_use', 'paused', 'finished', 'abandoned'];

function mapShelfRow(row: any): ShelfItem {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id || undefined,
    freeLabel: row.free_label || undefined,
    status: row.status,
    category: row.category || undefined,
    routineStep: row.routine_step || undefined,
    ingredientIds: row.ingredient_ids || [],
    openedAt: row.opened_at || undefined,
    finishedAt: row.finished_at || undefined,
    estimatedRemainingPercent: row.estimated_remaining_percent ?? null,
    purchasePrice: row.purchase_price !== null && row.purchase_price !== undefined ? Number(row.purchase_price) : null,
    abandonmentReason: row.abandonment_reason || undefined,
    abandonmentNote: row.abandonment_note || undefined,
    barcode: row.barcode || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface ShelfInput {
  productId?: unknown;
  freeLabel?: unknown;
  status?: unknown;
  category?: unknown;
  routineStep?: unknown;
  ingredientIds?: unknown;
  openedAt?: unknown;
  finishedAt?: unknown;
  estimatedRemainingPercent?: unknown;
  purchasePrice?: unknown;
  abandonmentReason?: unknown;
  abandonmentNote?: unknown;
  barcode?: unknown;
}

// ---------------------------------------------------------------------------
// OUTCOME OBSERVATIONS
// ---------------------------------------------------------------------------

function mapOutcomeRow(row: any): OutcomeObservation {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id || undefined,
    ingredientId: row.ingredient_id || undefined,
    archetypeId: row.archetype_id || undefined,
    shelfItemId: row.shelf_item_id || undefined,
    signal: row.signal,
    valence: row.valence,
    observedAfterDays: row.observed_after_days ?? null,
    climateContext: row.climate_context || undefined,
    note: row.note || undefined,
    isConsentShared: row.is_consent_shared === true,
    observedAt: row.observed_at,
    createdAt: row.created_at
  };
}

// ---------------------------------------------------------------------------
// STORE
// ---------------------------------------------------------------------------

class KurlaIntelligenceStore {
  private shelf = new Map<string, ShelfItem[]>();
  private outcomes = new Map<string, OutcomeObservation[]>();
  private episodes = new Map<string, ProtectiveStyleEpisode[]>();
  private archetypes = new Map<string, { key: ArchetypeKey; labelFr: string; memberCount: number }>();
  private userArchetype = new Map<string, ArchetypeDerivation>();
  private washDayCycles = new Map<string, WashDayCyclePrefs>();
  // Replis mémoire explicites (chantier A). Jamais un mode à moitié autorisé.
  private reviews = new Map<string, { userId: string; rating: number; status: string }[]>();
  private jurisdictionRestrictions: JurisdictionRestriction[] = [];
  private returnInsights: ReturnInsightRecord[] = [];
  private endorsements: ProfessionalEndorsement[] = [];

  // -------------------------------------------------------------------------
  // Archétype
  // -------------------------------------------------------------------------

  public async syncUserArchetype(userId: string, profile: BeautyProfile | undefined): Promise<ArchetypeDerivation> {
    const derivation = deriveArchetype(profile);
    this.userArchetype.set(userId, derivation);
    const entry = this.archetypes.get(derivation.id) || { key: derivation.key, labelFr: derivation.labelFr, memberCount: 0 };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: existing } = await supabase.from('user_archetypes').select('archetype_id').eq('user_id', userId).maybeSingle();
      if (existing?.archetype_id !== derivation.id) {
        await supabase.from('archetypes').upsert({
          id: derivation.id,
          hair_texture_band: derivation.key.hairTextureBand,
          porosity_band: derivation.key.porosityBand,
          density_band: derivation.key.densityBand,
          tone_depth_band: derivation.key.toneDepthBand,
          sensitivity_band: derivation.key.sensitivityBand,
          climate_band: derivation.key.climateBand,
          label_fr: derivation.labelFr,
          k_anonymity_threshold: DEFAULT_K_ANONYMITY_THRESHOLD,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        await supabase.from('user_archetypes').upsert({
          user_id: userId,
          archetype_id: derivation.id,
          confidence: derivation.confidence,
          known_fields: derivation.knownDimensions,
          derived_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        // Le comptage passe par la base, source de vérité, pas par le cache local.
        // `user_archetypes` n'a pas de colonne `id` : la table est clee par
        // `user_id` (l'upsert ci-dessus utilise deja onConflict: 'user_id').
        // Compter les `user_id` compte donc les membres, une fois chacun.
        const { count } = await supabase.from('user_archetypes').select('user_id', { count: 'exact', head: true }).eq('archetype_id', derivation.id);
        const memberCount = count || 0;
        await supabase.from('archetypes').update({
          member_count: memberCount,
          is_publishable: memberCount >= DEFAULT_K_ANONYMITY_THRESHOLD,
          updated_at: new Date().toISOString()
        }).eq('id', derivation.id);
        this.archetypes.set(derivation.id, { key: derivation.key, labelFr: derivation.labelFr, memberCount });
      }
      return derivation;
    }
    entry.memberCount += this.userArchetype.get(userId)?.id === derivation.id ? 0 : 1;
    this.archetypes.set(derivation.id, entry);
    return derivation;
  }

  public getUserArchetype(userId: string): ArchetypeDerivation | undefined {
    return this.userArchetype.get(userId);
  }

  public getArchetypeMemberCount(archetypeId: string): number {
    return this.archetypes.get(archetypeId)?.memberCount ?? 0;
  }

  // -------------------------------------------------------------------------
  // KURLA Shelf
  // -------------------------------------------------------------------------

  public normalizeShelfInput(input: ShelfInput): Omit<ShelfItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
    const status = typeof input.status === 'string' && (SHELF_STATUSES as string[]).includes(input.status)
      ? input.status as ShelfStatus
      : 'owned';
    const productId = typeof input.productId === 'string' && input.productId.trim() ? input.productId.trim().slice(0, 120) : undefined;
    const freeLabel = typeof input.freeLabel === 'string' && input.freeLabel.trim() ? input.freeLabel.trim().slice(0, 200) : undefined;
    if (!productId && !freeLabel) throw new Error('Un article de l’étagère doit référencer un produit du catalogue ou porter un libellé.');

    const routineStep = isRoutineStep(input.routineStep) ? input.routineStep : undefined;
    const abandonmentReason = isAbandonmentReason(input.abandonmentReason) ? input.abandonmentReason : undefined;
    // Un abandon sans motif est une donnée perdue : le motif est la partie utile.
    if (status === 'abandoned' && !abandonmentReason) {
      throw new Error('Un produit abandonné doit porter un motif : c’est la seule information exploitable du retour.');
    }

    const remaining = typeof input.estimatedRemainingPercent === 'number' && Number.isFinite(input.estimatedRemainingPercent)
      ? Math.max(0, Math.min(100, Math.round(input.estimatedRemainingPercent)))
      : null;
    const price = typeof input.purchasePrice === 'number' && Number.isFinite(input.purchasePrice) && input.purchasePrice >= 0
      ? input.purchasePrice
      : null;

    return {
      productId,
      freeLabel,
      status,
      category: typeof input.category === 'string' ? input.category.trim().slice(0, 120) || undefined : undefined,
      routineStep,
      ingredientIds: Array.isArray(input.ingredientIds)
        ? input.ingredientIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '').slice(0, 100)
        : [],
      openedAt: iso(input.openedAt),
      finishedAt: iso(input.finishedAt),
      estimatedRemainingPercent: remaining,
      purchasePrice: price,
      abandonmentReason,
      abandonmentNote: typeof input.abandonmentNote === 'string' ? input.abandonmentNote.trim().slice(0, 500) || undefined : undefined,
      barcode: typeof input.barcode === 'string' ? input.barcode.trim().slice(0, 40) || undefined : undefined
    };
  }

  public async addShelfItem(userId: string, input: ShelfInput): Promise<ShelfItem> {
    const normalized = this.normalizeShelfInput(input);
    const now = new Date().toISOString();
    const item: ShelfItem = { id: randomUUID(), userId, ...normalized, createdAt: now, updatedAt: now };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('user_products').insert({
        id: item.id,
        user_id: userId,
        product_id: item.productId || null,
        free_label: item.freeLabel || null,
        status: item.status,
        category: item.category || null,
        routine_step: item.routineStep || null,
        opened_at: item.openedAt || null,
        finished_at: item.finishedAt || null,
        estimated_remaining_percent: item.estimatedRemainingPercent,
        purchase_price: item.purchasePrice,
        abandonment_reason: item.abandonmentReason || null,
        abandonment_note: item.abandonmentNote || null,
        barcode: item.barcode || null,
        created_at: item.createdAt,
        updated_at: item.updatedAt
      });
      ensureSuccess('ajout à l’étagère', error);
    }
    const list = this.shelf.get(userId) || [];
    this.shelf.set(userId, [item, ...list]);
    return item;
  }

  public async updateShelfItem(userId: string, itemId: string, input: ShelfInput): Promise<ShelfItem | undefined> {
    const current = (await this.getShelf(userId)).find(item => item.id === itemId);
    if (!current) return undefined;
    const patch = this.normalizeShelfInput({ ...current, ...input });
    const updated: ShelfItem = { ...current, ...patch, updatedAt: new Date().toISOString() };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('user_products').update({
        status: updated.status,
        routine_step: updated.routineStep || null,
        opened_at: updated.openedAt || null,
        finished_at: updated.finishedAt || null,
        estimated_remaining_percent: updated.estimatedRemainingPercent,
        abandonment_reason: updated.abandonmentReason || null,
        abandonment_note: updated.abandonmentNote || null,
        updated_at: updated.updatedAt
      }).eq('id', itemId).eq('user_id', userId);
      ensureSuccess('mise à jour de l’étagère', error);
    }
    this.shelf.set(userId, (this.shelf.get(userId) || []).map(item => (item.id === itemId ? updated : item)));
    return updated;
  }

  public async getShelf(userId: string): Promise<ShelfItem[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('user_products').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
      ensureSuccess('lecture de l’étagère', error);
      const items = (data || []).map(mapShelfRow);
      this.shelf.set(userId, items);
      return items;
    }
    return this.shelf.get(userId) || [];
  }

  public async deleteShelfItem(userId: string, itemId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('user_products').delete().eq('id', itemId).eq('user_id', userId);
      ensureSuccess('suppression de l’article', error);
    }
    const list = this.shelf.get(userId) || [];
    const next = list.filter(item => item.id !== itemId);
    this.shelf.set(userId, next);
    return next.length !== list.length;
  }

  // -------------------------------------------------------------------------
  // Outcome observations — la boucle d'apprentissage
  // -------------------------------------------------------------------------

  public async recordOutcome(
    userId: string,
    input: {
      signal: unknown;
      productId?: unknown;
      ingredientId?: unknown;
      shelfItemId?: unknown;
      observedAfterDays?: unknown;
      climateContext?: unknown;
      note?: unknown;
      isConsentShared?: unknown;
    },
    profile?: BeautyProfile
  ): Promise<OutcomeObservation> {
    if (!isOutcomeSignal(input.signal)) throw new Error('Observation de résultat inconnue.');
    const productId = typeof input.productId === 'string' && input.productId.trim() ? input.productId.trim() : undefined;
    const ingredientId = typeof input.ingredientId === 'string' && input.ingredientId.trim() ? input.ingredientId.trim() : undefined;
    if (!productId && !ingredientId) throw new Error('Une observation doit porter sur un produit ou sur un ingrédient.');

    const signal = input.signal as OutcomeSignal;
    // Le consentement est opt-in et granulaire : par défaut, l'observation
    // n'améliore que le profil de son auteur.
    const isConsentShared = input.isConsentShared === true;
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) || undefined : undefined;
    // Une observation partagée ne conserve pas de note libre : l'agrégat ne
    // doit pas pouvoir être relié à une personne.
    if (isConsentShared && note) throw new Error('Une observation partagée ne peut pas conserver de note libre.');

    const archetypeId = (await this.syncUserArchetype(userId, profile)).id;
    const now = new Date().toISOString();
    const observation: OutcomeObservation = {
      id: randomUUID(),
      userId,
      productId,
      ingredientId,
      archetypeId,
      shelfItemId: typeof input.shelfItemId === 'string' ? input.shelfItemId : undefined,
      signal,
      valence: valenceOf(signal),
      observedAfterDays: typeof input.observedAfterDays === 'number' && Number.isFinite(input.observedAfterDays) && input.observedAfterDays >= 0
        ? Math.round(input.observedAfterDays)
        : null,
      climateContext: typeof input.climateContext === 'string' ? input.climateContext.trim().slice(0, 40) || undefined : undefined,
      note,
      isConsentShared,
      observedAt: now,
      createdAt: now
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('outcome_observations').insert({
        id: observation.id,
        user_id: userId,
        product_id: observation.productId || null,
        ingredient_id: observation.ingredientId || null,
        archetype_id: observation.archetypeId,
        shelf_item_id: observation.shelfItemId || null,
        signal: observation.signal,
        valence: observation.valence,
        observed_after_days: observation.observedAfterDays,
        climate_context: observation.climateContext || null,
        note: observation.note || null,
        is_consent_shared: observation.isConsentShared,
        observed_at: observation.observedAt,
        created_at: observation.createdAt
      });
      ensureSuccess('enregistrement de l’observation de résultat', error);
    }
    const list = this.outcomes.get(userId) || [];
    this.outcomes.set(userId, [observation, ...list].slice(0, 500));
    return observation;
  }

  public async getOutcomes(userId: string): Promise<OutcomeObservation[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('outcome_observations').select('*').eq('user_id', userId).order('observed_at', { ascending: false }).limit(500);
      ensureSuccess('lecture des observations', error);
      const observations = (data || []).map(mapOutcomeRow);
      this.outcomes.set(userId, observations);
      return observations;
    }
    return this.outcomes.get(userId) || [];
  }

  /**
   * Agrégat publié pour un ingrédient et l'archétype courant. Seules les
   * observations consenties contribuent ; sous le seuil k, rien n'est publié.
   */
  public async getIngredientOutcomeEvidence(
    userId: string,
    ingredientId: string,
    options: { climateContext?: string } = {}
  ): Promise<{ aggregate: OutcomeAggregate | undefined; memberCount: number }> {
    const derivation = this.userArchetype.get(userId) || (await this.syncUserArchetype(userId, undefined));
    const climateContext = options.climateContext || 'any';

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('ingredient_archetype_outcomes')
        .select('*')
        .eq('ingredient_id', ingredientId)
        .eq('archetype_id', derivation.id)
        .eq('climate_context', climateContext)
        .eq('is_publishable', true)
        .maybeSingle();
      ensureSuccess('lecture de l’agrégat publié', error);
      const aggregate = data ? {
        ingredientId: data.ingredient_id,
        archetypeId: data.archetype_id,
        climateContext: data.climate_context,
        observationCount: data.observation_count,
        positiveCount: data.positive_count,
        neutralCount: data.neutral_count,
        negativeCount: data.negative_count,
        medianDaysToResult: data.median_days_to_result ?? null,
        kAnonymityThreshold: data.k_anonymity_threshold,
        isPublishable: data.is_publishable,
        computedAt: data.computed_at
      } as OutcomeAggregate : undefined;
      return { aggregate, memberCount: this.getArchetypeMemberCount(derivation.id) };
    }

    // Mode mémoire : l'agrégat est recalculé à partir des observations locales.
    const pooled: OutcomeObservation[] = [];
    for (const observations of this.outcomes.values()) pooled.push(...observations);
    const relevant = pooled.filter(observation =>
      observation.ingredientId === ingredientId
      && observation.archetypeId === derivation.id
      && (observation.climateContext || 'any') === climateContext
    );
    const aggregate = aggregateOutcomes(relevant)[0];
    return { aggregate, memberCount: this.getArchetypeMemberCount(derivation.id) };
  }

  // -------------------------------------------------------------------------
  // Timeline de coiffure protectrice
  // -------------------------------------------------------------------------

  public async startProtectiveStyle(
    userId: string,
    input: { style: unknown; tension?: unknown; installedAt?: unknown; plannedRemovalAt?: unknown; maxWearDays?: unknown }
  ): Promise<ProtectiveStyleEpisode> {
    const style = typeof input.style === 'string' ? input.style.trim().toLowerCase() : '';
    if (!style) throw new Error('Le type de coiffure est obligatoire.');
    const tension: TensionLevel = isTensionLevel(input.tension) ? input.tension : 'normal';
    const installedAt = iso(input.installedAt) || new Date().toISOString();
    const maxWearDays = typeof input.maxWearDays === 'number' && input.maxWearDays > 0
      ? Math.round(input.maxWearDays)
      : defaultMaxWearDays(style as any);

    const now = new Date().toISOString();
    const episodeItem: ProtectiveStyleEpisode = {
      id: randomUUID(),
      userId,
      style: style as ProtectiveStyleEpisode['style'],
      tension,
      installedAt,
      plannedRemovalAt: iso(input.plannedRemovalAt),
      maxWearDays,
      signals: [],
      createdAt: now,
      updatedAt: now
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('protective_style_episodes').insert({
        id: episodeItem.id,
        user_id: userId,
        style: episodeItem.style,
        tension: episodeItem.tension,
        installed_at: episodeItem.installedAt,
        planned_removal_at: episodeItem.plannedRemovalAt || null,
        max_wear_days: episodeItem.maxWearDays,
        signals: [],
        created_at: episodeItem.createdAt,
        updated_at: episodeItem.updatedAt
      });
      ensureSuccess('ouverture d’un épisode de coiffure protectrice', error);
    }
    const list = this.episodes.get(userId) || [];
    this.episodes.set(userId, [episodeItem, ...list]);
    return episodeItem;
  }

  public async addProtectiveStyleSignal(userId: string, episodeId: string, signal: unknown): Promise<ProtectiveStyleEpisode | undefined> {
    if (!isProtectiveSignal(signal)) throw new Error('Signal inconnu.');
    const current = (await this.getProtectiveStyles(userId)).find(item => item.id === episodeId);
    if (!current) return undefined;
    if (current.signals.includes(signal)) return current;

    const updated: ProtectiveStyleEpisode = {
      ...current,
      signals: [...current.signals, signal as ProtectiveSignal],
      lastSignalAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('protective_style_episodes').update({
        signals: updated.signals,
        last_signal_at: updated.lastSignalAt,
        updated_at: updated.updatedAt
      }).eq('id', episodeId).eq('user_id', userId);
      ensureSuccess('ajout d’un signal de coiffure protectrice', error);
    }
    this.episodes.set(userId, (this.episodes.get(userId) || []).map(item => (item.id === episodeId ? updated : item)));
    return updated;
  }

  public async closeProtectiveStyle(userId: string, episodeId: string, removalReason?: string): Promise<ProtectiveStyleEpisode | undefined> {
    const current = (await this.getProtectiveStyles(userId)).find(item => item.id === episodeId);
    if (!current) return undefined;
    const updated: ProtectiveStyleEpisode = {
      ...current,
      removedAt: new Date().toISOString(),
      removalReason: typeof removalReason === 'string' ? removalReason.trim().slice(0, 300) || undefined : undefined,
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('protective_style_episodes').update({
        removed_at: updated.removedAt,
        removal_reason: updated.removalReason || null,
        updated_at: updated.updatedAt
      }).eq('id', episodeId).eq('user_id', userId);
      ensureSuccess('clôture d’un épisode de coiffure protectrice', error);
    }
    this.episodes.set(userId, (this.episodes.get(userId) || []).map(item => (item.id === episodeId ? updated : item)));
    return updated;
  }

  public async getProtectiveStyles(userId: string): Promise<ProtectiveStyleEpisode[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('protective_style_episodes').select('*').eq('user_id', userId).order('installed_at', { ascending: false });
      ensureSuccess('lecture des épisodes de coiffure protectrice', error);
      const episodes = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        style: row.style,
        tension: row.tension,
        installedAt: row.installed_at,
        plannedRemovalAt: row.planned_removal_at || undefined,
        removedAt: row.removed_at || undefined,
        removalReason: row.removal_reason || undefined,
        maxWearDays: row.max_wear_days,
        signals: row.signals || [],
        lastSignalAt: row.last_signal_at || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as ProtectiveStyleEpisode));
      this.episodes.set(userId, episodes);
      return episodes;
    }
    return this.episodes.get(userId) || [];
  }

  // -------------------------------------------------------------------------
  // Wash Day OS — cycle de lavage
  // -------------------------------------------------------------------------

  public normalizeWashDayCycle(input: WashDayCycleInput): WashDayCyclePrefs {
    const intervalDays = typeof input.intervalDays === 'number' && Number.isFinite(input.intervalDays)
      ? Math.max(1, Math.min(42, Math.round(input.intervalDays)))
      : 7;
    const deepCondition = typeof input.deepConditionEveryNWashDays === 'number' && Number.isFinite(input.deepConditionEveryNWashDays)
      ? Math.max(1, Math.min(12, Math.round(input.deepConditionEveryNWashDays)))
      : 1;
    // null signifie « désactivé », pas « inconnu » : un soin protéiné non
    // désiré ne doit jamais être planifié par défaut.
    const protein = input.proteinEveryNWashDays === null
      ? null
      : typeof input.proteinEveryNWashDays === 'number' && Number.isFinite(input.proteinEveryNWashDays)
        ? Math.max(1, Math.min(12, Math.round(input.proteinEveryNWashDays)))
        : null;
    const nightProtection = typeof input.nightProtection === 'string'
      && (['none', 'bonnet', 'satin_pillowcase', 'scarf'] as string[]).includes(input.nightProtection)
      ? input.nightProtection as WashDayCyclePrefs['nightProtection']
      : 'none';

    return {
      intervalDays,
      lastWashDayAt: iso(input.lastWashDayAt),
      deepConditionEveryNWashDays: deepCondition,
      proteinEveryNWashDays: protein,
      nightProtection,
      availableMinutesPerDay: typeof input.availableMinutesPerDay === 'number' && Number.isFinite(input.availableMinutesPerDay)
        ? Math.max(0, Math.min(240, Math.round(input.availableMinutesPerDay)))
        : 15,
      hardWater: input.hardWater === true
    };
  }

  public async getWashDayCycle(userId: string): Promise<WashDayCyclePrefs> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('wash_day_cycles').select('*').eq('user_id', userId).maybeSingle();
      ensureSuccess('lecture du cycle de lavage', error);
      if (data) {
        return {
          intervalDays: data.interval_days,
          lastWashDayAt: data.last_wash_day_at || undefined,
          deepConditionEveryNWashDays: data.deep_condition_every_n_wash_days,
          proteinEveryNWashDays: data.protein_every_n_wash_days,
          nightProtection: data.night_protection,
          availableMinutesPerDay: data.available_minutes_per_day,
          hardWater: data.hard_water === true
        };
      }
      return this.normalizeWashDayCycle({});
    }
    return this.washDayCycles.get(userId) || this.normalizeWashDayCycle({});
  }

  public async saveWashDayCycle(userId: string, input: WashDayCycleInput): Promise<WashDayCyclePrefs> {
    const current = await this.getWashDayCycle(userId);
    const next = this.normalizeWashDayCycle({ ...current, ...input });
    const now = new Date().toISOString();

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('wash_day_cycles').upsert({
        user_id: userId,
        interval_days: next.intervalDays,
        last_wash_day_at: next.lastWashDayAt || null,
        deep_condition_every_n_wash_days: next.deepConditionEveryNWashDays,
        protein_every_n_wash_days: next.proteinEveryNWashDays,
        night_protection: next.nightProtection,
        available_minutes_per_day: next.availableMinutesPerDay,
        hard_water: next.hardWater,
        updated_at: now
      }, { onConflict: 'user_id' });
      ensureSuccess('enregistrement du cycle de lavage', error);
    }
    this.washDayCycles.set(userId, next);
    return next;
  }

  public async markWashDayDone(userId: string, at?: string): Promise<WashDayCyclePrefs> {
    return this.saveWashDayCycle(userId, { lastWashDayAt: iso(at) || new Date().toISOString() });
  }

  // -------------------------------------------------------------------------
  // RGPD : suppression en cascade de la couche d'intelligence
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // CHANTIER A — BRANCHEMENTS
  // Ces méthodes existent pour mettre fin à l'état « logique seule » : chaque
  // fonction pure doit être atteignable depuis une route.
  // -------------------------------------------------------------------------

  /** Restrictions réglementaires d'une juridiction. Table publique en lecture. */
  public async getJurisdictionRestrictions(jurisdiction: string): Promise<JurisdictionRestriction[]> {
    const code = String(jurisdiction || '').trim().toUpperCase().slice(0, 8);
    if (!code) return [];
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('ingredient_jurisdiction_restrictions')
        .select('ingredient_id, jurisdiction, status, limit_percent, reference')
        .eq('jurisdiction', code);
      ensureSuccess('lecture des restrictions réglementaires', error);
      return (data || []).map((row: any) => ({
        ingredientId: row.ingredient_id,
        jurisdiction: row.jurisdiction,
        status: row.status,
        limitPercent: row.limit_percent !== null && row.limit_percent !== undefined ? Number(row.limit_percent) : null,
        reference: row.reference || undefined
      }));
    }
    return this.jurisdictionRestrictions.filter(restriction => restriction.jurisdiction.toUpperCase() === code);
  }

  /**
   * Note par archétype : la fin de la note globale. Deux garde-fous hérités de
   * `computeArchetypeRating` — sous le seuil k, la note n'est pas publiée.
   * La source est `reviews` jointe à `user_archetypes` : aucun nouveau champ
   * n'est demandé à l'utilisateur.
   */
  public async getArchetypeRatingsForProduct(productId: string): Promise<ArchetypeRating[]> {
    const id = String(productId || '').trim();
    if (!id) return [];
    const supabase = getSupabaseServerClient();
    const buckets = new Map<string, { label: string; ratings: number[] }>();

    if (supabase) {
      // `reviews` n'a aucune cle etrangere vers `user_archetypes` : les deux
      // pointent vers `profiles`. L'imbrication directe etait refusee par
      // PostgREST (PGRST200, aucune relation de cle etrangere trouvee), donc la
      // note par archetype echouait des qu'un avis approuve existait. Le chemin
      // reel est reviews -> profiles -> user_archetypes.
      const { data, error } = await supabase
        .from('reviews')
        .select('rating, profiles(user_archetypes(archetype_id, archetypes(label_fr)))')
        .eq('product_id', id)
        .eq('status', 'approved');
      ensureSuccess('lecture des avis par archétype', error);
      for (const raw of data || []) {
        // Les selects imbriqués Supabase sont typés comme des unions tableau/objet
        // selon la cardinalité inférée. Le reste du store traite déjà les lignes
        // en `any` pour cette raison ; on reste cohérent.
        const row = raw as any;
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const link = Array.isArray(profile?.user_archetypes) ? profile.user_archetypes[0] : profile?.user_archetypes;
        const archetypeId = link?.archetype_id;
        if (!archetypeId) continue;
        const archetypeRow = Array.isArray(link?.archetypes) ? link.archetypes[0] : link?.archetypes;
        const entry = buckets.get(archetypeId) || { label: archetypeRow?.label_fr || archetypeId, ratings: [] };
        entry.ratings.push(Number(row.rating));
        buckets.set(archetypeId, entry);
      }
    } else {
      for (const review of this.reviews.get(id) || []) {
        if (review.status !== 'approved') continue;
        const derivation = this.userArchetype.get(review.userId);
        if (!derivation) continue;
        const entry = buckets.get(derivation.id) || { label: derivation.labelFr, ratings: [] };
        entry.ratings.push(review.rating);
        buckets.set(derivation.id, entry);
      }
    }

    return Array.from(buckets.entries()).map(([archetypeId, entry]) =>
      computeArchetypeRating(id, archetypeId, entry.label, entry.ratings)
    );
  }

  /** Alimente la note par archétype en test local. Sans objet réel : avis de test. */
  public seedReviewForTest(productId: string, userId: string, rating: number, status = 'approved'): void {
    const list = this.reviews.get(productId) || [];
    list.push({ userId, rating, status });
    this.reviews.set(productId, list);
  }

  /**
   * Réassort prédictif. Ne devine rien : sans consommation déclarée, le signal
   * dit explicitement qu'il ne peut pas estimer.
   */
  public async evaluateShelfReplenishment(
    userId: string,
    weeklyUsagePercent: number
  ): Promise<{ signals: ReplenishmentSignal[]; due: ReplenishmentSignal[] }> {
    const usage = Number(weeklyUsagePercent);
    const items = await this.getShelf(userId);
    const signals = items
      .filter(item => item.status === 'owned' || item.status === 'in_use')
      .map(item => evaluateReplenishment(item, { weeklyUsagePercent: Number.isFinite(usage) && usage > 0 ? usage : 0 }));
    return { signals, due: signals.filter(signal => signal.shouldNotify) };
  }

  /**
   * Intelligence des retours. Un retour est plus informatif qu'un avis : les
   * avis viennent des acheteurs satisfaits, les retours des autres.
   */
  public async recordReturnInsight(
    userId: string,
    returnId: string,
    input: { orderId?: unknown; productId?: unknown; reason?: unknown; textureMismatch?: unknown; ingredientSuspected?: unknown; shared?: unknown }
  ): Promise<ReturnInsightRecord> {
    const reason = isReturnInsightReason(input.reason) ? input.reason as ReturnInsightReason : undefined;
    if (!reason) throw new Error('Motif de retour invalide : un retour non motivé n’est pas exploitable.');
    const derivation = this.userArchetype.get(userId);
    const record: ReturnInsightRecord = {
      returnId,
      orderId: typeof input.orderId === 'string' ? input.orderId : '',
      productId: typeof input.productId === 'string' && input.productId.trim() ? input.productId.trim() : undefined,
      ingredientSuspected: typeof input.ingredientSuspected === 'string' && input.ingredientSuspected.trim()
        ? input.ingredientSuspected.trim().slice(0, 120)
        : undefined,
      archetypeId: derivation?.id,
      reason,
      textureMismatch: input.textureMismatch === true,
      // Le partage est un consentement explicite, jamais une case pré-cochée.
      isShared: input.shared === true,
      createdAt: new Date().toISOString()
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('returns').update({
        insight_reason: record.reason,
        insight_texture_mismatch: record.textureMismatch,
        insight_ingredient_suspected: record.ingredientSuspected ?? null,
        insight_shared: record.isShared
      }).eq('id', returnId).eq('user_id', userId);
      ensureSuccess('enregistrement du motif de retour', error);
    } else {
      this.returnInsights.push(record);
    }
    return record;
  }

  public async getReturnInsightRecords(productId?: string): Promise<ReturnInsightRecord[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      // `returns` ne porte aucune colonne produit : le panier retourne est dans
      // `items` (jsonb), chaque ligne portant `productId` ou `product_id`. Filtrer
      // sur une colonne `product_id` faisait echouer la requete en 42703. Un retour
      // multi-produits est eclate en un enregistrement par produit, faute de quoi
      // il serait attribue a un seul d'entre eux et fausserait le decompte.
      const { data, error } = await supabase
        .from('returns')
        .select('id, order_id, items, insight_reason, insight_texture_mismatch, insight_ingredient_suspected, insight_shared, created_at, profiles(user_archetypes(archetype_id))')
        .not('insight_reason', 'is', null);
      ensureSuccess('lecture des retours motivés', error);

      const records: ReturnInsightRecord[] = [];
      for (const row of (data || []) as any[]) {
        const link = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const archetype = Array.isArray(link?.user_archetypes) ? link.user_archetypes[0] : link?.user_archetypes;
        const ids = (Array.isArray(row.items) ? row.items : [])
          .map((item: any) => item?.productId ?? item?.product_id)
          .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);
        const productIds = Array.from(new Set<string>(ids));
        // Un retour sans produit identifiable reste compte, sans attribution.
        for (const id of (productIds.length > 0 ? productIds : [undefined])) {
          if (productId && id !== productId) continue;
          records.push({
            returnId: row.id,
            orderId: row.order_id || '',
            productId: id,
            ingredientSuspected: row.insight_ingredient_suspected || undefined,
            archetypeId: archetype?.archetype_id || undefined,
            reason: row.insight_reason,
            textureMismatch: row.insight_texture_mismatch === true,
            isShared: row.insight_shared === true,
            createdAt: row.created_at
          });
        }
      }
      return records;
    }
    return this.returnInsights.filter(record => !productId || record.productId === productId);
  }

  public async summarizeProductReturns(productId: string, soldQuantity?: number): Promise<ReturnInsightSummary> {
    const records = await this.getReturnInsightRecords(productId);
    return summarizeReturnInsights(productId, records, { soldQuantity });
  }

  /**
   * Co-signature professionnelle. Un professionnel non vérifié ne peut pas
   * co-signer publiquement, sinon l'espace devient publicitaire.
   */
  public async createEndorsement(input: {
    professionalId: string;
    professionalName: string;
    professionalSpecialty?: string;
    professionalVerified: boolean;
    clientUserId: string;
    routinePlanId?: string;
    productId?: string;
    stance: EndorsementStance;
    rationale: string;
    amendments?: EndorsementAmendment[];
    isDisplayable?: boolean;
    clientConsentAt?: string;
  }): Promise<ProfessionalEndorsement> {
    if (!isEndorsementStance(input.stance)) throw new Error('Position invalide.');
    if (!input.rationale.trim()) throw new Error('Une co-signature sans justification n’a aucune valeur.');
    const endorsement: ProfessionalEndorsement = {
      id: randomUUID(),
      professionalId: input.professionalId,
      professionalName: input.professionalName,
      professionalSpecialty: input.professionalSpecialty,
      professionalVerified: input.professionalVerified === true,
      clientUserId: input.clientUserId,
      routinePlanId: input.routinePlanId,
      productId: input.productId,
      stance: input.stance,
      rationale: input.rationale.trim(),
      amendments: Array.isArray(input.amendments) ? input.amendments : [],
      isDisplayable: input.isDisplayable === true,
      clientConsentAt: iso(input.clientConsentAt),
      createdAt: new Date().toISOString()
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('professional_endorsements').insert({
        id: endorsement.id,
        professional_id: endorsement.professionalId,
        client_user_id: endorsement.clientUserId,
        routine_plan_id: endorsement.routinePlanId ?? null,
        product_id: endorsement.productId ?? null,
        stance: endorsement.stance,
        rationale: endorsement.rationale,
        amendments: endorsement.amendments,
        is_displayable: endorsement.isDisplayable,
        client_consent_at: endorsement.clientConsentAt ?? null
      });
      ensureSuccess('enregistrement de la co-signature', error);
    } else {
      this.endorsements.push(endorsement);
    }
    return endorsement;
  }

  public async getEndorsements(filter: { professionalId?: string; clientUserId?: string; productId?: string } = {}): Promise<ProfessionalEndorsement[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let query = supabase.from('professional_endorsements').select('*');
      if (filter.professionalId) query = query.eq('professional_id', filter.professionalId);
      if (filter.clientUserId) query = query.eq('client_user_id', filter.clientUserId);
      if (filter.productId) query = query.eq('product_id', filter.productId);
      const { data, error } = await query;
      ensureSuccess('lecture des co-signatures', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        professionalId: row.professional_id,
        professionalName: row.professional_name || 'Professionnel',
        professionalSpecialty: row.professional_specialty || undefined,
        professionalVerified: row.professional_verified === true,
        clientUserId: row.client_user_id,
        routinePlanId: row.routine_plan_id || undefined,
        productId: row.product_id || undefined,
        stance: row.stance,
        rationale: row.rationale,
        amendments: row.amendments || [],
        isDisplayable: row.is_displayable === true,
        clientConsentAt: row.client_consent_at || undefined,
        createdAt: row.created_at
      }));
    }
    return this.endorsements.filter(item =>
      (!filter.professionalId || item.professionalId === filter.professionalId) &&
      (!filter.clientUserId || item.clientUserId === filter.clientUserId) &&
      (!filter.productId || item.productId === filter.productId)
    );
  }

  public getProfessionalImpact(professionalId: string, endorsements: ProfessionalEndorsement[]): EndorsementImpact {
    return summarizeEndorsements(professionalId, endorsements);
  }

  public resolveEndorsementDisplay(endorsement: ProfessionalEndorsement) {
    const gate = canDisplayEndorsement(endorsement);
    return { ...gate, disclaimer: gate.allowed ? endorsementDisclaimer(endorsement) : undefined };
  }

  /**
   * Ce que l'IA doit faire face à une contradiction professionnelle : s'aligner
   * pour cet utilisateur et signaler le désaccord. Jamais ignorer.
   */
  public applyProfessionalJudgement(endorsement: ProfessionalEndorsement) {
    return handleContradiction(endorsement);
  }

  /** Filtrage réglementaire d'un panier ou d'une fiche produit pour un marché. */
  public async assessJurisdiction(ingredientIds: string[], jurisdiction: string): Promise<JurisdictionFinding[]> {
    const restrictions = await this.getJurisdictionRestrictions(jurisdiction);
    return checkJurisdiction(ingredientIds, restrictions, jurisdiction);
  }

  public seedJurisdictionRestrictionForTest(restriction: JurisdictionRestriction): void {
    this.jurisdictionRestrictions.push(restriction);
  }

  public async deleteIntelligenceData(userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      for (const table of ['outcome_observations', 'user_products', 'protective_style_episodes', 'wash_day_cycles', 'user_archetypes']) {
        const { error } = await supabase.from(table).delete().eq('user_id', userId);
        ensureSuccess(`suppression des données d’intelligence (${table})`, error);
      }
    }
    this.shelf.delete(userId);
    this.outcomes.delete(userId);
    this.episodes.delete(userId);
    this.washDayCycles.delete(userId);
    this.userArchetype.delete(userId);
  }
}

export const intelligenceStore = new KurlaIntelligenceStore();
export { archetypeIdOf, archetypeLabel, DEFAULT_K_ANONYMITY_THRESHOLD };
export type { AbandonmentReason, RoutineStep };
