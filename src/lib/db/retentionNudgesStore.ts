import { notificationExists, sendNotification } from './notificationsStore';
import { intelligenceStore } from '../intelligenceStore';

import type { SupabaseServerStore } from '../serverDb';
import {
  NudgeInput,
  computeNudges,
} from '../retentionNudges';

/**
 * BOUCLE DE DONNÉES — orchestrateur de relances.
 *
 * Parcourt les utilisateurs actifs (ceux qui au moins une donnée de boucle :
 * étagère, cycle de lavage, coiffure protectrice), calcule les nuds de
 * rétention (retour J+14, wash day dû, coiffure protectrice à retirer) et les
 * matérialise en notifications in-app dédoublonnées. La clé stable de chaque
 * nud sert de `dedupe_key`, donc un nud n'est jamais créé deux fois, ni par
 * deux passages quotidiens — le run est idempotent.
 *
 * Ce module n'envoie pas d'email : ce sont des nudges in-app. Le
 * déclenchement se fait par une route admin protégée (appelée par le cron).
 *
 * Toutes les lectures passent par `intelligenceStore`, qui gère Supabase ET le
 * repli mémoire : une seule voie de code, testable sans base.
 */

export interface RetentionRunResult {
  usersScanned: number;
  nudgesCreated: number;
  nudgesByKind: Record<string, number>;
  perUser: Array<{ userId: string; created: number }>;
}

function inc(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

/** Construit l'entrée du calcul à partir des données du store (déjà mappées). */
function buildInput(userId: string, data: {
  shelf: any[];
  washCycle: any;
  episodes: any[];
  observations: any[];
}): NudgeInput {
  // Un cycle par défaut (jamais de lavage enregistré) n'est pas exploitable :
  // on ne doit pas déclencher de nud « wash day dû » sans historique.
  const hasWashHistory = Boolean(data.washCycle?.lastWashDayAt);
  return {
    userId,
    shelf: data.shelf.map((item) => ({
      id: String(item.id),
      freeLabel: item.freeLabel,
      productId: item.productId,
      status: item.status,
      createdAt: item.createdAt,
    })),
    washCycle: hasWashHistory
      ? {
          intervalDays: Number(data.washCycle.intervalDays) || 7,
          lastWashDayAt: data.washCycle.lastWashDayAt ?? null,
        }
      : null,
    protectiveEpisodes: data.episodes.map((ep) => ({
      id: String(ep.id),
      style: ep.style,
      tension: ep.tension,
      installedAt: ep.installedAt,
      plannedRemovalAt: ep.plannedRemovalAt ?? null,
      removedAt: ep.removedAt ?? null,
      maxWearDays: ep.maxWearDays ? Number(ep.maxWearDays) : undefined,
      signals: Array.isArray(ep.signals) ? ep.signals : [],
    })),
    observations: data.observations.map((obs) => ({
      shelfItemId: obs.shelfItemId,
      productId: obs.productId,
    })),
  };
}

export async function runRetentionNudges(
  store: SupabaseServerStore,
  options: { now?: Date; limitUsers?: number } = {}
): Promise<RetentionRunResult> {
  const now = options.now ?? new Date();
  const result: RetentionRunResult = { usersScanned: 0, nudgesCreated: 0, nudgesByKind: {}, perUser: [] };

  const userIds = await intelligenceStore.listActiveLoopUserIds(options.limitUsers ?? 5000);

  for (const userId of userIds) {
    result.usersScanned += 1;

    let data;
    try {
      const [shelf, washCycle, episodes, observations] = await Promise.all([
        intelligenceStore.getShelf(userId),
        intelligenceStore.getWashDayCycle(userId),
        intelligenceStore.getProtectiveStyles(userId),
        intelligenceStore.getOutcomes(userId),
      ]);
      data = { shelf, washCycle, episodes, observations };
    } catch (err) {
      // Un utilisateur illisible ne doit pas faire échouer tout le run.
      console.error(`[Retention] lecture impossible pour ${userId}:`, (err as Error)?.message);
      result.perUser.push({ userId, created: 0 });
      continue;
    }

    const input = buildInput(userId, data);

    let created = 0;
    for (const nudge of computeNudges(input, now)) {
      try {
        // Idempotence : si la clé stable existe déjà (run précédent le même
        // jour), on ne recrée ni ne compte la notification.
        if (await notificationExists(store, nudge.dedupeKey)) continue;
        await sendNotification(
          store,
          userId,
          nudge.kind,
          nudge.title,
          nudge.message,
          nudge.link,
          undefined,
          nudge.dedupeKey
        );
        created += 1;
        inc(result.nudgesByKind, nudge.kind);
      } catch (err) {
        console.error(`[Retention] notification ${nudge.kind} pour ${userId}:`, (err as Error)?.message);
      }
    }
    result.nudgesCreated += created;
    result.perUser.push({ userId, created });
  }

  return result;
}
