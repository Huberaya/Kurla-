/**
 * C14 — Logistique pays + Stripe LIVE par pays (scoring pays_scoring.md)
 * FR pilote LIVE, BE J+30, SN J+60 si MOQ <100 — ne pas traiter Europe/Afrique en bloc.
 * Source scoring : docs/sourcing/pays_scoring.md (FR 82/BE 76/SN 71/CI 68/MA 64/CH 58/CM 52)
 */

export type CountryCode = 'FR' | 'BE' | 'CH' | 'SN' | 'CI' | 'CM' | 'MA' | 'INT';

export interface CountryFulfillment {
  code: CountryCode;
  name: string;
  flag: string;
  score: number; // 0-100 pays_scoring.md
  dispatch: string; // promesse affichée
  dispatchDays: string; // "24–48h" | "3–5j" | "5–7j"
  hub: string;
  stripeLive: boolean; // TEST jusqu'à preuve, LIVE sur FR/BE seulement si STRIPE_SECRET_KEY live
  currency: 'EUR' | 'XOF' | 'CHF';
  vatRate: number; // %
  model: string;
  condition: string;
}

export const COUNTRY_FULFILLMENT: Record<CountryCode, CountryFulfillment> = {
  FR: { code: 'FR', name: 'France', flag: '🇫🇷', score: 82, dispatch: 'Expédié sous 3–5 jours — tampon 3PL IDF 60% en 24–48h', dispatchDays: '3–5j', hub: 'IDF (95) Etx Logistique', stripeLive: true, currency: 'EUR', vatRate: 20, model: 'D2C précommande + tampon 75', condition: 'Pilote ouvert (Stripe LIVE si sk_live)' },
  BE: { code: 'BE', name: 'Belgique', flag: '🇧🇪', score: 76, dispatch: 'Expédié sous 3–5 jours via FR (48–72h)', dispatchDays: '48–72h', hub: 'FR → BE', stripeLive: true, currency: 'EUR', vatRate: 21, model: 'D2C FR→BE même stock', condition: 'Ouvre si FR >30% réponse J+7' },
  CH: { code: 'CH', name: 'Suisse', flag: '🇨🇭', score: 58, dispatch: 'Expédié sous 4–6 jours + douane 7,7% TVA', dispatchDays: '72–96h', hub: 'CH douane incluse +12%', stripeLive: false, currency: 'CHF', vatRate: 7.7, model: 'D2C + douane', condition: 'Attendre BE >50 cmd/mois' },
  SN: { code: 'SN', name: 'Sénégal', flag: '🇸🇳', score: 71, dispatch: 'Expédié sous 5–7 jours via hub Dakar (Wave)', dispatchDays: '5–7j', hub: 'Dakar hub tampon 50 kits', stripeLive: false, currency: 'XOF', vatRate: 18, model: 'Précommande hub Dakar + Wave', condition: 'Ouvre si 1 fournisseur Afrique MOQ <100' },
  CI: { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', score: 68, dispatch: 'Expédié sous 5–7 jours via Abidjan', dispatchDays: '5–7j', hub: 'Abidjan hub', stripeLive: false, currency: 'XOF', vatRate: 18, model: 'Hub Abidjan', condition: 'Ouvre si SN >30 kits/mois' },
  MA: { code: 'MA', name: 'Maroc', flag: '🇲🇦', score: 64, dispatch: 'Expédié sous 4–5 jours via ES', dispatchDays: '4–5j', hub: 'ES→MA', stripeLive: false, currency: 'EUR', vatRate: 20, model: 'D2C ES→MA', condition: 'Ouvre si FR 95% 3–5j tenu J+30' },
  CM: { code: 'CM', name: 'Cameroun', flag: '🇨🇲', score: 52, dispatch: 'Expédié sous 7–10 jours (douane volatile)', dispatchDays: '7–10j', hub: 'CI relais', stripeLive: false, currency: 'XOF', vatRate: 19.25, model: 'Test via CI', condition: 'Attendre CI >50 kits/mois' },
  INT: { code: 'INT', name: 'International', flag: '🌍', score: 0, dispatch: 'Expédié sous 5–7 jours — à confirmer', dispatchDays: '5–7j', hub: 'FR', stripeLive: false, currency: 'EUR', vatRate: 20, model: 'D2C', condition: 'Sur demande' },
};

export function getCountryConfig(code: string): CountryFulfillment {
  const upper = code.toUpperCase() as CountryCode;
  return COUNTRY_FULFILLMENT[upper] || COUNTRY_FULFILLMENT.INT;
}

export function getStripeModeForCountry(code: string, stripeSecretKey?: string): 'live' | 'test' | 'unknown' {
  const cfg = getCountryConfig(code);
  const key = stripeSecretKey || (typeof process !== 'undefined' ? (process.env as any)?.STRIPE_SECRET_KEY : '') || '';
  const envLive = (key as string).startsWith('sk_live_');
  // FR/BE : live seulement si clé live ET pays scoré >65 et ouvert
  if (cfg.stripeLive && envLive && cfg.score > 65) return 'live';
  // Autres pays : toujours test jusqu'à preuve (MOQ + whitecast + hub)
  if ((key as string).startsWith('sk_test_')) return 'test';
  return cfg.stripeLive ? (envLive ? 'live' : 'test') : 'test';
}

export function getDispatchForCountry(code: string): string {
  return getCountryConfig(code).dispatch;
}

export const COUNTRY_SCORES_SORTED = Object.values(COUNTRY_FULFILLMENT)
  .filter(c => c.code !== 'INT')
  .sort((a, b) => b.score - a.score);
