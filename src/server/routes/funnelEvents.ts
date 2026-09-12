import type { Express, Response } from 'express';

import { randomUUID } from 'node:crypto';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit } from '../http';
import type { AuthenticatedRequest } from '../types';

const EVENT_NAMES = new Set([
  'page_view', 'view_item', 'view_item_list', 'diagnostic_start',
  'diagnostic_complete', 'select_promotion', 'add_to_cart', 'begin_checkout',
  'purchase', 'generate_lead', 'sign_up', 'search', 'ai_assistant_message'
]);

const PROP_KEYS = new Set([
  'currency', 'value', 'item_id', 'item_name', 'item_category', 'quantity', 'source',
  'diagnostic_type', 'promotion_name', 'content_name', 'content_type', 'search_term'
]);

function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : null;
}

function safeProps(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!PROP_KEYS.has(key)) continue;
    if (typeof raw === 'boolean') output[key] = raw;
    else if (typeof raw === 'number' && Number.isFinite(raw)) output[key] = Math.max(-1_000_000, Math.min(1_000_000, raw));
    else if (typeof raw === 'string') output[key] = raw.slice(0, 160);
  }
  return output;
}

export function registerFunnelEventRoutes(app: Express): void {
  app.post('/api/events/funnel', rateLimit('public-funnel-event', 180, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const eventName = boundedString(body.eventName, 40);
    const eventId = boundedString(body.eventId, 128) || randomUUID();
    const sessionId = boundedString(body.sessionId, 128);
    const path = boundedString(body.path, 240) || '/';
    if (!eventName || !EVENT_NAMES.has(eventName)) return res.status(400).json({ error: 'Événement funnel invalide.' });
    if (!sessionId || !/^[A-Za-z0-9_-]{8,128}$/.test(sessionId)) return res.status(400).json({ error: 'Session funnel invalide.' });
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(eventId)) return res.status(400).json({ error: 'Identifiant événement invalide.' });
    try {
      await serverDb.recordGrowthFunnelEvent({
        id: eventId,
        eventName: eventName as any,
        sessionId,
        path,
        props: safeProps(body.props),
        occurredAt: new Date().toISOString()
      });
      return res.status(204).send();
    } catch {
      // Le tracking ne doit jamais bloquer la navigation ou le checkout.
      return res.status(204).send();
    }
  }));
}
