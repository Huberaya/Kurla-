import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { isOfflineActionKind } from '../mobileShell';

import type { MobileSyncAction, SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.7 — journal des actions synchronisées depuis un mobile.
 *
 * Une seule responsabilité, et elle est critique : **une action envoyée deux
 * fois ne s'applique qu'une fois**. La clé est `(user_id, client_action_id)`,
 * unique en base, et la vérification est faite avant l'application — pas après.
 */

function mapRow(row: any): MobileSyncAction {
  return {
    id: row.id,
    userId: row.user_id,
    clientActionId: row.client_action_id,
    kind: row.kind,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    result: row.result ? (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) : null,
    appliedAt: row.applied_at
  };
}

export async function getMobileSyncActions(store: SupabaseServerStore, userId: string): Promise<MobileSyncAction[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('mobile_sync_actions')
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false })
      .limit(1_000);
    ensureDatabaseSuccess('lecture des actions synchronisées', error);
    return (data || []).map(mapRow);
  }
  return store.inMemoryMobileSyncActions.filter(action => action.userId === userId);
}

/** Identifiants clients déjà reconnus : c'est ce qui empêche un second rejeu. */
export async function getAckedClientActionIds(store: SupabaseServerStore, userId: string): Promise<string[]> {
  const actions = await getMobileSyncActions(store, userId);
  return actions.map(action => action.clientActionId);
}

export interface RecordMobileSyncActionInput {
  userId: string;
  clientActionId: string;
  kind: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
}

/**
 * Enregistre qu'une action a été appliquée.
 *
 * Renvoie `duplicate: true` si l'identifiant client est déjà connu : l'appelant
 * ne doit alors rien appliquer. La décision précède l'effet.
 */
export async function recordMobileSyncAction(
  store: SupabaseServerStore,
  input: RecordMobileSyncActionInput
): Promise<{ action: MobileSyncAction; duplicate: boolean }> {
  // Un type inconnu est refusé ici aussi : la route valide, le store ne fait
  // pas confiance à la route.
  if (!isOfflineActionKind(input.kind)) throw new Error(`Action hors ligne inconnue : ${String(input.kind)}`);

  const existing = (await getMobileSyncActions(store, input.userId)).find(
    action => action.clientActionId === input.clientActionId
  );
  if (existing) return { action: existing, duplicate: true };

  const action: MobileSyncAction = {
    id: randomUUID(),
    userId: input.userId,
    clientActionId: input.clientActionId,
    kind: input.kind,
    payload: input.payload,
    result: input.result ?? null,
    appliedAt: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('mobile_sync_actions').insert({
      id: action.id,
      user_id: action.userId,
      client_action_id: action.clientActionId,
      kind: action.kind,
      payload: action.payload,
      result: action.result,
      applied_at: action.appliedAt
    });
    // 23505 : contrainte d'unicité violée. Un envoi concurrent est un doublon,
    // pas une erreur — mais il ne doit pas être appliqué deux fois.
    if (error && String((error as any).code) !== '23505') {
      ensureDatabaseSuccess('enregistrement de l’action synchronisée', error);
    }
    if (error) return { action, duplicate: true };
  }

  store.inMemoryMobileSyncActions.push(action);
  return { action, duplicate: false };
}
