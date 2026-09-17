/**
 * POLITIQUE DE PUBLICATION — mode strict de la boutique (chantier C3, lot 1).
 *
 * Une SEULE ligne en base (`public.publication_policy`, DDL idempotent dans
 * `supabase/migrations/20261003000000_publication_policy.sql`) porte l'état
 * du mode strict : OFF par défaut, armé par un acte explicite, daté et nommé,
 * journalisé dans `audit_logs`. Un interrupteur sans journal n'est pas un
 * interrupteur.
 *
 * Discipline de la plateforme, appliquée ici :
 *   - la table ABSENTE (DDL non appliqué) est un état Nommé, pas une erreur :
 *     `available: false` + raison, et le mode strict reste OFF (fail-closed) ;
 *   - aucune date d'armement inventée : `activatedAt` est NULL tant que le
 *     mode n'a jamais été armé, et ne date que le passage à true ;
 *   - l'écriture ne lève jamais vers l'UI : elle répond ok:false + raison.
 */
import { AUTO_PUBLISH_STAGES, type AutoPublishStage } from '../autoPublication';
import { getSupabaseServerClient } from '../supabaseClient';
import type { SupabaseServerStore } from '../serverDb';

export interface PublicationPolicyState {
  /** La table existe ET a pu être lue. Sinon : repli OFF, raison nommée. */
  available: boolean;
  /** false par construction quand available est false. */
  strictMode: boolean;
  /** Date du dernier passage à true. NULL = jamais armé. */
  activatedAt: string | null;
  activatedBy: string | null;
  note: string | null;
  updatedAt: string | null;
  /** Présent quand available est false : la raison honnête. */
  reason?: string;
  // ---- Auto-publication (chantier E) : la machine, dans la même ligne ----
  /** Les colonnes du chantier E existent (migration appliquée). Sinon la machine est 'off' et le panneau le dit. */
  autoPublishAvailable: boolean;
  autoPublishStage: AutoPublishStage;
  autoPublishPausedAt: string | null;
  autoPublishPausedBy: string | null;
  autoPublishLastBatch: { batchId: string; at: string | null; productIds: string[] } | null;
}

export interface AutoPublishBatchRecord {
  batchId: string;
  at: string;
  productIds: string[];
}

export interface PolicyActor {
  id?: string | null;
  email?: string | null;
}

/**
 * État « table absente » : le message dit précisément ce qui manque, pour
 * que l'écran admin puisse le montrer tel quel (le DDL est dans le repo).
 */
export const POLICY_TABLE_MISSING_REASON =
  'table publication_policy absente de la base (DDL à appliquer : supabase/migrations/20261003000000_publication_policy.sql)';

/**
 * Chantier E — état auto-publication porté par tout repli « politique non
 * mesurable » : machine OFF, nommée, jamais inventée.
 */
const AUTO_PUBLISH_UNAVAILABLE = {
  autoPublishAvailable: false,
  autoPublishStage: 'off' as AutoPublishStage,
  autoPublishPausedAt: null as string | null,
  autoPublishPausedBy: null as string | null,
  autoPublishLastBatch: null as { batchId: string; at: string | null; productIds: string[] } | null
};

function fromRow(row: any): PublicationPolicyState {
  // Migration chantier E absente (colonnes inexistantes) = état nommé, pas
  // une erreur : la machine est 'off' et le panneau le dit explicitement.
  const autoPublishAvailable = Object.prototype.hasOwnProperty.call(row, 'auto_publish_stage');
  const rawStage = autoPublishAvailable ? row.auto_publish_stage : undefined;
  const autoPublishStage: AutoPublishStage = AUTO_PUBLISH_STAGES.includes(rawStage) ? rawStage : 'off';
  const lastBatchIds = row.auto_publish_last_batch_product_ids;
  return {
    available: true,
    strictMode: !!row.strict_mode,
    activatedAt: row.activated_at ? String(row.activated_at) : null,
    activatedBy: row.activated_by ? String(row.activated_by) : null,
    note: row.note ? String(row.note) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    autoPublishAvailable,
    autoPublishStage: autoPublishStage,
    autoPublishPausedAt: row.auto_publish_paused_at ? String(row.auto_publish_paused_at) : null,
    autoPublishPausedBy: row.auto_publish_paused_by ? String(row.auto_publish_paused_by) : null,
    autoPublishLastBatch:
      row.auto_publish_last_batch_id
        ? {
            batchId: String(row.auto_publish_last_batch_id),
            at: row.auto_publish_last_batch_at ? String(row.auto_publish_last_batch_at) : null,
            productIds: Array.isArray(lastBatchIds) ? lastBatchIds.map(String) : []
          }
        : null
  };
}

/**
 * Lecture de la politique. Branches :
 *   - base Supabase : lecture de la ligne unique (service role). Table absente
 *     (PGRST205) → `available: false` + raison. Erreur d'autre nature → même
 *     repli OFF, raison nommée : une politique illisible ne doit jamais faire
 *     passer le mode strict au vert.
 *   - mémoire (bancs / local sans base) : la ligne portée par le store ;
 *     `null` modélise la table non appliquée.
 */
export async function readPublicationPolicy(store: SupabaseServerStore): Promise<PublicationPolicyState> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    const row = store.inMemoryPublicationPolicy;
    if (!row) return { available: false, strictMode: false, activatedAt: null, activatedBy: null, note: null, updatedAt: null, reason: POLICY_TABLE_MISSING_REASON, ...AUTO_PUBLISH_UNAVAILABLE };
    return fromRow(row);
  }
  const { data, error } = await supabase.from('publication_policy').select('*').eq('id', 1).maybeSingle();
  if (error) {
    const missing = error.code === 'PGRST205' || /Could not find the table/i.test(String(error.message || ''));
    return {
      available: false, strictMode: false, activatedAt: null, activatedBy: null, note: null, updatedAt: null,
      reason: missing ? POLICY_TABLE_MISSING_REASON : `lecture de publication_policy impossible (${error.code || 'erreur'}) — repli mode strict OFF`,
      ...AUTO_PUBLISH_UNAVAILABLE
    };
  }
  if (!data) {
    return { available: false, strictMode: false, activatedAt: null, activatedBy: null, note: null, updatedAt: null, reason: 'table publication_policy sans ligne (DDL incomplet — rejouer le fichier de migration)', ...AUTO_PUBLISH_UNAVAILABLE };
  }
  return fromRow(data);
}

/**
 * Armement / désarmement du mode strict.
 *   - `activated_at`/`activated_by` ne se posent que sur le passage à TRUE
 *     (l'historique du dernier armement survit au désarmement) ;
 *   - chaque écriture réussie est consignée dans `audit_logs`
 *     (action `publication_policy_change`) : avant/après, note, acteur, date.
 *     La consignation ne fait jamais échouer l'armement (le journal est
 *     l'addition, pas le prérequis) — mais son échec est retourné.
 */
export async function setPublicationPolicy(
  store: SupabaseServerStore,
  patch: { strictMode: boolean; note?: string },
  actor: PolicyActor
): Promise<{ ok: boolean; state: PublicationPolicyState; reason?: string; audit: { ecrit: boolean; raison?: string } }> {
  const prev = await readPublicationPolicy(store);
  // Défense en profondeur : la route garantit déjà un booléen (400 sinon),
  // mais le store ne doit pas pouvoir être armé par une valeur de travers —
  // un « oui » de travers qui armerait le mode strict serait une régression.
  if (typeof patch.strictMode !== 'boolean') {
    return { ok: false, state: prev, reason: 'strictMode doit être un booléen', audit: { ecrit: false, raison: 'type_invalide' } };
  }
  if (!prev.available) {
    return { ok: false, state: prev, reason: prev.reason || 'politique non mesurable', audit: { ecrit: false, raison: 'politique_non_mesurable' } };
  }
  const now = new Date().toISOString();
  const actorLabel = actor.email || actor.id || 'admin inconnu';
  const row = {
    id: 1,
    strict_mode: patch.strictMode,
    activated_at: patch.strictMode ? now : (prev.activatedAt ? new Date(prev.activatedAt).toISOString() : null),
    activated_by: patch.strictMode ? actorLabel : (prev.activatedBy || null),
    note: patch.note ?? prev.note,
    updated_at: now
  };

  const supabase = getSupabaseServerClient();
  let written: any = row;
  if (supabase) {
    const { data, error } = await supabase.from('publication_policy').upsert(row, { onConflict: 'id' });
    if (error) {
      return { ok: false, state: prev, reason: `écriture impossible (${error.code || error.message}) — état inchangé`, audit: { ecrit: false, raison: 'ecriture_refusee' } };
    }
    written = (data ? (Array.isArray(data) ? data[0] : data) : null) || row;
  } else {
    store.inMemoryPublicationPolicy = written;
  }

  // Journal d'audit — ne lève jamais.
  let audit: { ecrit: boolean; raison?: string } = { ecrit: false, raison: 'base_non_configuree' };
  if (supabase) {
    try {
      const { error: auditError } = await supabase.from('audit_logs').insert({
        action: 'publication_policy_change',
        user_id: actor.id || null,
        details: {
          avant: { strictMode: prev.strictMode, activatedAt: prev.activatedAt, activatedBy: prev.activatedBy },
          apres: { strictMode: patch.strictMode, activatedAt: row.activated_at, activatedBy: row.activated_by },
          note: row.note,
          par: actorLabel,
          survenuLe: now
        }
      });
      audit = auditError ? { ecrit: false, raison: auditError.message } : { ecrit: true };
    } catch {
      audit = { ecrit: false, raison: 'consignation en échec' };
    }
  }

  return { ok: true, state: fromRow(written), audit };
}

/**
 * Écriture générique d'une ligne de politique + consignation.
 * L'état complet (mode strict COMPTENU) est relu avant réécriture : la
 * politique est une ligne, on ne patche pas des colonnes à l'aveugle.
 * La consignation ne lève jamais (journal = l'addition, pas le prérequis),
 * mais son échec est retourné.
 */
async function writePolicyRow(
  store: SupabaseServerStore,
  row: any,
  auditEntry: { action: string; details: any },
  actor: PolicyActor
): Promise<{ ok: boolean; state: PublicationPolicyState; reason?: string; audit: { ecrit: boolean; raison?: string } }> {
  const supabase = getSupabaseServerClient();
  let written: any = row;
  if (supabase) {
    const { data, error } = await supabase.from('publication_policy').upsert(row, { onConflict: 'id' });
    if (error) {
      return { ok: false, state: fromRow(row), reason: `écriture impossible (${error.code || error.message}) — état inchangé`, audit: { ecrit: false, raison: 'ecriture_refusee' } };
    }
    written = (data ? (Array.isArray(data) ? data[0] : data) : null) || row;
  } else {
    store.inMemoryPublicationPolicy = written as any;
  }
  let audit: { ecrit: boolean; raison?: string } = { ecrit: false, raison: 'base_non_configuree' };
  if (supabase) {
    try {
      const { error: auditError } = await supabase.from('audit_logs').insert({
        action: auditEntry.action,
        user_id: actor.id || null,
        details: auditEntry.details
      });
      audit = auditError ? { ecrit: false, raison: auditError.message } : { ecrit: true };
    } catch {
      audit = { ecrit: false, raison: 'consignation en échec' };
    }
  }
  return { ok: true, state: fromRow(written), audit };
}

function requireAutoPublishColumns(prev: PublicationPolicyState): { ok: boolean; reason?: string } {
  if (prev.available && prev.autoPublishAvailable) return { ok: true };
  return { ok: false, reason: prev.available
    ? 'colonnes auto-publication absentes (migration à appliquer : supabase/migrations/20261004000000_auto_publication.sql) — machine off'
    : (prev.reason || 'politique non mesurable — machine off') };
}

function policyRowFromState(prev: PublicationPolicyState, now: string, extra: Record<string, any>): any {
  return {
    id: 1,
    strict_mode: prev.strictMode,
    activated_at: prev.activatedAt,
    activated_by: prev.activatedBy,
    note: prev.note,
    updated_at: now,
    auto_publish_stage: prev.autoPublishStage,
    auto_publish_paused_at: prev.autoPublishPausedAt,
    auto_publish_paused_by: prev.autoPublishPausedBy,
    auto_publish_last_batch_id: prev.autoPublishLastBatch ? prev.autoPublishLastBatch.batchId : null,
    auto_publish_last_batch_at: prev.autoPublishLastBatch ? prev.autoPublishLastBatch.at : null,
    auto_publish_last_batch_product_ids: prev.autoPublishLastBatch ? prev.autoPublishLastBatch.productIds : null,
    ...extra
  };
}

/**
 * Réarmement de la machine (chantier E). Stage ∈ off / watch / active.
 * Chaque changement est journalisé (`auto_publish_stage_change`) : avant,
 * après, note, acteur, date. Un stage invalide est refusé — la machine ne
 * s'arme pas par une valeur de travers.
 */
export async function setAutoPublishStage(
  store: SupabaseServerStore,
  patch: { stage: AutoPublishStage; note?: string },
  actor: PolicyActor
): Promise<{ ok: boolean; state: PublicationPolicyState; reason?: string; audit: { ecrit: boolean; raison?: string } }> {
  const prev = await readPublicationPolicy(store);
  if (typeof patch.stage !== 'string' || !AUTO_PUBLISH_STAGES.includes(patch.stage)) {
    return { ok: false, state: prev, reason: `stage invalide (attendu : ${AUTO_PUBLISH_STAGES.join(' | ')})`, audit: { ecrit: false, raison: 'stage_invalide' } };
  }
  const gate = requireAutoPublishColumns(prev);
  if (!gate.ok) return { ok: false, state: prev, reason: gate.reason, audit: { ecrit: false, raison: 'colonnes_absentes' } };
  const now = new Date().toISOString();
  const actorLabel = actor.email || actor.id || 'admin inconnu';
  const row = policyRowFromState(prev, now, {
    auto_publish_stage: patch.stage,
    note: patch.note ?? prev.note
  });
  return writePolicyRow(store, row, {
    action: 'auto_publish_stage_change',
    details: {
      avant: { stage: prev.autoPublishStage, pausedAt: prev.autoPublishPausedAt },
      apres: { stage: patch.stage, pausedAt: prev.autoPublishPausedAt },
      note: row.note,
      par: actorLabel,
      survenuLe: now
    }
  }, actor);
}

/**
 * Pause / reprise en un clic (chantier E). La pause EST un interrupteur :
 * datée, nommée, journalisée (`auto_publish_pause`) — sans journal elle
 * n'existerait pas. Le stage n'est pas modifié : reprendre, c'est effacer
 * la pause, pas réarmer la machine.
 */
export async function setAutoPublishPaused(
  store: SupabaseServerStore,
  patch: { paused: boolean; note?: string },
  actor: PolicyActor
): Promise<{ ok: boolean; state: PublicationPolicyState; reason?: string; audit: { ecrit: boolean; raison?: string } }> {
  const prev = await readPublicationPolicy(store);
  if (typeof patch.paused !== 'boolean') {
    return { ok: false, state: prev, reason: 'paused doit être un booléen', audit: { ecrit: false, raison: 'type_invalide' } };
  }
  const gate = requireAutoPublishColumns(prev);
  if (!gate.ok) return { ok: false, state: prev, reason: gate.reason, audit: { ecrit: false, raison: 'colonnes_absentes' } };
  const now = new Date().toISOString();
  const actorLabel = actor.email || actor.id || 'admin inconnu';
  const row = policyRowFromState(prev, now, {
    auto_publish_paused_at: patch.paused ? now : null,
    auto_publish_paused_by: patch.paused ? actorLabel : null
  });
  return writePolicyRow(store, row, {
    action: 'auto_publish_pause',
    details: {
      avant: { pausedAt: prev.autoPublishPausedAt, pausedBy: prev.autoPublishPausedBy },
      apres: { pausedAt: row.auto_publish_paused_at, pausedBy: row.auto_publish_paused_by },
      note: patch.note ?? null,
      par: actorLabel,
      survenuLe: now
    }
  }, actor);
}

/**
 * Consigne la dernière vague EXÉCUTÉE (mode active uniquement) : c'est cette
 * vague que le rollback rejoue à l'envers. Le watch ne consigne pas de vague :
 * il n'a rien écrit.
 */
export async function recordAutoPublishBatch(
  store: SupabaseServerStore,
  batch: AutoPublishBatchRecord
): Promise<{ ok: boolean; state: PublicationPolicyState; reason?: string }> {
  const prev = await readPublicationPolicy(store);
  if (!prev.available) return { ok: false, state: prev, reason: prev.reason || 'politique non mesurable' };
  if (!prev.autoPublishAvailable) return { ok: false, state: prev, reason: 'colonnes auto-publication absentes — vague non consignée (machine off)' };
  const now = new Date().toISOString();
  const row = policyRowFromState(prev, now, {
    auto_publish_last_batch_id: batch.batchId,
    auto_publish_last_batch_at: batch.at,
    auto_publish_last_batch_product_ids: batch.productIds
  });
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('publication_policy').upsert(row, { onConflict: 'id' });
    if (error) return { ok: false, state: prev, reason: `consigne de la vague impossible (${error.code || error.message})` };
    return { ok: true, state: fromRow((data ? (Array.isArray(data) ? data[0] : data) : null) || row) };
  }
  store.inMemoryPublicationPolicy = row as any;
  return { ok: true, state: fromRow(row) };
}
