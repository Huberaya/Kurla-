import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { intelligenceStore } from '../../lib/intelligenceStore';
import {
  BRIEFING_MAX_ITEMS,
  MAX_OUTCOME_PROMPTS,
  MIN_DAYS_BEFORE_OUTCOME,
  OFFLINE_ACTION_KINDS,
  OFFLINE_ACTION_TTL_DAYS,
  OFFLINE_NOTICE,
  OFFLINE_QUEUE_MAX,
  buildDailyBriefing,
  drainOfflineQueue,
  isOfflineActionKind
} from '../../lib/mobileShell';
import { isOutcomeSignal } from '../../lib/outcomeEvidence';
import { asyncRoute, rateLimit } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 8.7 — surface mobile.
 *
 * Deux endpoints, parce que deux choses seulement sont difficiles sur un
 * téléphone : **savoir quoi faire** en une requête, et **ne rien perdre ni rien
 * doubler** quand le réseau coupe.
 *
 * Ordre de la synchronisation : valider → réserver (l'identifiant client est
 * enregistré) → appliquer. Réserver avant d'appliquer signifie qu'une coupure
 * entre les deux laisse une action réservée et non appliquée — la réponse le
 * dit, et l'action n'est jamais appliquée deux fois. L'inverse (appliquer puis
 * réserver) produirait des doublons invisibles.
 */
export function registerMobileRoutes(app: Express): void {
  /** Le contrat mobile : ce qui se met en file, et dans quelles limites. */
  app.get('/api/mobile/capabilities', rateLimit('mobile-capabilities', 60, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      offline: {
        actionKinds: OFFLINE_ACTION_KINDS,
        queueMax: OFFLINE_QUEUE_MAX,
        ttlDays: OFFLINE_ACTION_TTL_DAYS,
        notice: OFFLINE_NOTICE,
        rule: 'Une action est identifiée par le client et appliquée une seule fois par le serveur.'
      },
      briefing: {
        maxItems: BRIEFING_MAX_ITEMS,
        maxOutcomePrompts: MAX_OUTCOME_PROMPTS,
        minDaysBeforeOutcome: MIN_DAYS_BEFORE_OUTCOME,
        // Union fermée : il n'existe pas d'item promotionnel.
        itemKinds: ['wash_day', 'routine_step', 'outcome_declaration', 'loyalty_progress']
      },
      installable: {
        manifest: '/manifest.webmanifest',
        serviceWorker: '/sw.js'
      }
    });
  }));

  /** Ce qu'il y a à faire aujourd'hui, en une requête. */
  app.get('/api/mobile/briefing', rateLimit('mobile-briefing', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const now = new Date().toISOString();

    const [washDay, routineState, shelf, outcomes, loyalty, record] = await Promise.all([
      intelligenceStore.getWashDayCycle(user.id).catch(() => null),
      serverDb.getAdaptiveRoutineState(user.id).catch(() => null),
      intelligenceStore.getShelf(user.id).catch(() => []),
      intelligenceStore.getOutcomes(user.id).catch(() => []),
      serverDb.getLoyaltyOverview(user.id).catch(() => null),
      serverDb.getBeautyProfile(user.id).catch(() => undefined)
    ]);

    // Un résultat déclaré sur un produit de l'étagère ferme l'invitation.
    const declaredKeys = new Set(
      outcomes.map(observation => `${observation.productId ?? ''}|${observation.shelfItemId ?? ''}`)
    );

    const briefing = buildDailyBriefing({
      now,
      washDay: washDay && washDay.intervalDays > 0 ? { intervalDays: washDay.intervalDays, lastWashDayAt: washDay.lastWashDayAt ?? null } : null,
      routineTasks: (routineState?.tasks ?? []).map(task => ({
        id: task.id,
        title: task.title,
        scheduledFor: task.scheduledFor,
        status: task.status
      })),
      shelf: (shelf ?? []).map(item => ({
        id: item.id,
        label: item.freeLabel?.trim() || item.productId || 'Produit de l’étagère',
        addedAt: item.openedAt || item.createdAt,
        status: item.status,
        hasDeclaredOutcome: declaredKeys.has(`${item.productId ?? ''}|${item.id}`)
      })),
      loyalty: loyalty
        ? {
            levelLabel: loyalty.currentLevel?.label ?? String(loyalty.currentLevel?.level ?? ''),
            pointsMissing: loyalty.nextLevel ? loyalty.nextLevel.pointsMissing : null
          }
        : null
    });

    res.json({
      ...briefing,
      profileRecorded: Boolean(record),
      offlineNotice: OFFLINE_NOTICE
    });
  }));

  /**
   * Rejeu de la file hors ligne. Chaque action reçoit un statut propre : une
   * file de 12 actions dont 2 sont refusées ne doit pas échouer en bloc.
   */
  app.post('/api/mobile/sync', rateLimit('mobile-sync', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const actions = Array.isArray(req.body?.actions) ? req.body.actions : null;
    if (!actions) {
      res.status(400).json({ error: 'Une liste d’actions est attendue.' });
      return;
    }
    if (actions.length > OFFLINE_QUEUE_MAX) {
      res.status(400).json({ error: `Au maximum ${OFFLINE_QUEUE_MAX} actions par synchronisation.` });
      return;
    }

    // Validation avant toute écriture : une action malformée ne réserve rien.
    const validationErrors: Array<{ index: number; clientActionId: string; error: string }> = [];
    actions.forEach((raw: any, index: number) => {
      const clientActionId = typeof raw?.clientActionId === 'string' ? raw.clientActionId.trim() : '';
      if (!clientActionId) {
        validationErrors.push({ index, clientActionId: '', error: 'clientActionId obligatoire.' });
        return;
      }
      if (!isOfflineActionKind(raw?.kind)) {
        validationErrors.push({ index, clientActionId, error: `Action inconnue : ${String(raw?.kind)}.` });
        return;
      }
      if (raw.kind === 'scan') {
        const reference = typeof raw.payload?.reference === 'string' ? raw.payload.reference.trim() : '';
        if (!reference) validationErrors.push({ index, clientActionId, error: 'Un scan exige une référence.' });
      }
      if (raw.kind === 'outcome_declared') {
        if (!isOutcomeSignal(raw.payload?.signal)) {
          validationErrors.push({ index, clientActionId, error: 'Signal de résultat inconnu.' });
        } else if (!raw.payload?.productId && !raw.payload?.ingredientId) {
          validationErrors.push({ index, clientActionId, error: 'Un résultat porte sur un produit ou un ingrédient.' });
        }
      }
    });
    if (validationErrors.length > 0) {
      res.status(400).json({ error: 'Des actions sont malformées : rien n’a été appliqué.', validationErrors });
      return;
    }

    const acked = await serverDb.getAckedClientActionIds(user.id);
    const drain = drainOfflineQueue(actions as never, { now: new Date().toISOString(), ackedClientActionIds: acked });

    const results: Array<{ clientActionId: string; status: string; detail?: string }> = [];
    for (const clientActionId of drain.duplicates) {
      results.push({ clientActionId, status: 'deja_appliquee' });
    }
    for (const action of drain.refused) {
      results.push({ clientActionId: action.clientActionId, status: 'refusee', detail: 'Type d’action inconnu.' });
    }
    for (const action of drain.expired) {
      results.push({ clientActionId: action.clientActionId, status: 'expiree', detail: `Au-delà de ${OFFLINE_ACTION_TTL_DAYS} jours.` });
    }
    for (const action of drain.evicted) {
      results.push({ clientActionId: action.clientActionId, status: 'ecartee', detail: 'File trop longue.' });
    }

    const profile = await serverDb.getBeautyProfile(user.id).catch(() => undefined);

    for (const action of drain.ready) {
      // Réserver d'abord : c'est ce qui rend le rejeu idempotent.
      const claimed = await serverDb.recordMobileSyncAction({
        userId: user.id,
        clientActionId: action.clientActionId,
        kind: action.kind as never,
        payload: action.payload
      });
      if (claimed.duplicate) {
        results.push({ clientActionId: action.clientActionId, status: 'deja_appliquee' });
        continue;
      }

      try {
        if (action.kind === 'scan') {
          const reference = String(action.payload.reference ?? '').trim();
          // La clé d'idempotence de la progression porte l'identifiant client :
          // même si le journal de synchronisation était perdu, le fait ne
          // compterait qu'une fois.
          const outcome = await serverDb.applyLoyaltyEvent(
            user.id,
            'scan_performed',
            reference,
            `scan_performed:${user.id}:${action.clientActionId}`
          );
          results.push({
            clientActionId: action.clientActionId,
            status: outcome.duplicated ? 'deja_comptee' : 'appliquee',
            detail: `${outcome.awardedPoints} point${outcome.awardedPoints > 1 ? 's' : ''}`
          });
        } else {
          await intelligenceStore.recordOutcome(user.id, action.payload as never, profile?.profile as never);
          results.push({ clientActionId: action.clientActionId, status: 'appliquee' });
        }
      } catch (error) {
        // L'action est réservée et non appliquée : on le dit, on ne la rejoue
        // pas en silence.
        results.push({
          clientActionId: action.clientActionId,
          status: 'reservee_non_appliquee',
          detail: error instanceof Error ? error.message : 'Échec inconnu.'
        });
      }
    }

    res.json({
      results,
      counts: {
        total: actions.length,
        applied: results.filter(item => item.status === 'appliquee').length,
        duplicates: results.filter(item => item.status === 'deja_appliquee' || item.status === 'deja_comptee').length,
        refused: results.filter(item => item.status === 'refusee' || item.status === 'expiree' || item.status === 'ecartee').length
      },
      notice: OFFLINE_NOTICE
    });
  }));
}
