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

function fromRow(row: any): PublicationPolicyState {
  return {
    available: true,
    strictMode: !!row.strict_mode,
    activatedAt: row.activated_at ? String(row.activated_at) : null,
    activatedBy: row.activated_by ? String(row.activated_by) : null,
    note: row.note ? String(row.note) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null
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
    if (!row) return { available: false, strictMode: false, activatedAt: null, activatedBy: null, note: null, updatedAt: null, reason: POLICY_TABLE_MISSING_REASON };
    return fromRow(row);
  }
  const { data, error } = await supabase.from('publication_policy').select('*').eq('id', 1).maybeSingle();
  if (error) {
    const missing = error.code === 'PGRST205' || /Could not find the table/i.test(String(error.message || ''));
    return {
      available: false, strictMode: false, activatedAt: null, activatedBy: null, note: null, updatedAt: null,
      reason: missing ? POLICY_TABLE_MISSING_REASON : `lecture de publication_policy impossible (${error.code || 'erreur'}) — repli mode strict OFF`
    };
  }
  if (!data) {
    return { available: false, strictMode: false, activatedAt: null, activatedBy: null, note: null, updatedAt: null, reason: 'table publication_policy sans ligne (DDL incomplet — rejouer le fichier de migration)' };
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
