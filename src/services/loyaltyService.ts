import { apiErrorMessage } from '../lib/apiDiagnostics';
import type { LoyaltyAxisRule, LoyaltyBadge, LoyaltyEventRule, LoyaltyLevel, LoyaltyReward } from '../lib/loyaltyRules';

/**
 * CHANTIER 8.3 — KURLA PROGRESSION : accès client.
 *
 * Le barème est lu depuis le serveur, pas recopié ici : si l'administration
 * ajuste un plafond, l'écran affiche la réalité.
 */

export interface LoyaltyAxisView extends LoyaltyAxisRule {
  score: number;
  remaining: number;
}

export interface LoyaltyOverview {
  account: {
    userId: string;
    level: number;
    progressionScore: number;
    axisScores: Record<string, number>;
    badges: string[];
    firstActivityAt: string;
    lastActivityAt: string | null;
  };
  currentLevel: LoyaltyLevel;
  nextLevel: (LoyaltyLevel & { pointsMissing: number }) | null;
  axes: LoyaltyAxisView[];
  maxScore: number;
  maxScoreWithoutPurchase: number;
  levels: LoyaltyLevel[];
  rules: LoyaltyEventRule[];
  badges: Array<LoyaltyBadge & { earned: boolean }>;
  rewards: Array<LoyaltyReward & { unlocked: boolean }>;
  recentEvents: Array<{ id: string; kind: string; axis: string; points: number; label: string; occurredAt: string }>;
}

export interface LoyaltyRulesPayload {
  levels: LoyaltyLevel[];
  axes: LoyaltyAxisRule[];
  eventRules: LoyaltyEventRule[];
  rewards: LoyaltyReward[];
  badges: LoyaltyBadge[];
  purchaseCapPoints: number;
  totalPoints: number;
}

async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage(response, data, 'La demande n’a pas pu aboutir.'));
  return data as T;
}

export function getLoyaltyRules(): Promise<LoyaltyRulesPayload> {
  return request<LoyaltyRulesPayload>('/api/loyalty/rules');
}

export function getLoyaltyOverview(token: string): Promise<LoyaltyOverview> {
  return request<LoyaltyOverview>('/api/loyalty', token);
}

export function recordScan(token: string, payload: { barcode?: string; ingredient?: string; product?: string }) {
  return request<{ scanned: string; level: number; progressionScore: number; awardedPoints: number; duplicated: boolean }>(
    '/api/loyalty/scan',
    token,
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

export function requestReward(token: string, code: string) {
  return request<{ id: string; status: string; rewardCode: string }>(`/api/loyalty/rewards/${code}/request`, token, {
    method: 'POST'
  });
}
