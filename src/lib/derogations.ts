/**
 * CHANTIER C5 (15/09/2026) — DÉROGATIONS DATÉES.
 *
 * Une fiche hors critères maintenue en boutique n'est plus un badge ambigu :
 * c'est une dérogation explicite (motif, décideur) qui EXPIRE. Trois états :
 *  - `active` : protège la fiche des propositions de retrait de la porte ;
 *  - `expiring_soon` (≤ 7 jours) : signalée en orange pour renouvellement ;
 *  - `expired` : la protection tombe — la porte (C4) peut proposer le retrait.
 */

export type DerogationState = 'active' | 'expiring_soon' | 'expired';

export type DerogationRow = {
  productId: string;
  reason: string;
  decidedBy: string | null;
  expiresAt: string; // ISO
};

export type DerogationSummary = {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
};

const SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function classifyDerogation(expiresAt: string | Date, now: Date = new Date()): DerogationState {
  const expiry = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry)) return 'expired'; // date illisible = protection refusée, pas inventée
  if (expiry <= now.getTime()) return 'expired';
  return expiry - now.getTime() <= SOON_WINDOW_MS ? 'expiring_soon' : 'active';
}

export function isProtectedByDerogation(
  productId: string,
  derogations: DerogationRow[] | null | undefined,
  now: Date = new Date(),
): boolean {
  const row = (derogations || []).find(d => d.productId === productId);
  if (!row) return false;
  const state = classifyDerogation(row.expiresAt, now);
  return state === 'active' || state === 'expiring_soon';
}

export function summarizeDerogations(derogations: DerogationRow[], now: Date = new Date()): DerogationSummary {
  const summary: DerogationSummary = { total: derogations.length, active: 0, expiringSoon: 0, expired: 0 };
  for (const row of derogations) {
    const state = classifyDerogation(row.expiresAt, now);
    if (state === 'active') summary.active += 1;
    else if (state === 'expiring_soon') summary.expiringSoon += 1;
    else summary.expired += 1;
  }
  return summary;
}

/** Corps du récapitulatif hebdomadaire — données réelles uniquement. */
export function buildDerogationAlertText(rows: Array<DerogationRow & { name?: string }>, now: Date = new Date()): string {
  const summary = summarizeDerogations(rows, now);
  const lines: string[] = [];
  lines.push('Récapitulatif des dérogations catalogue (fiches hors critères maintenues en vitrine) :');
  lines.push(`- actives : ${summary.active}`);
  lines.push(`- expirent sous 7 jours : ${summary.expiringSoon}`);
  lines.push(`- expirées (la porte peut proposer le retrait) : ${summary.expired}`);
  const urgent = rows.filter(r => classifyDerogation(r.expiresAt, now) !== 'active');
  if (urgent.length > 0) {
    lines.push('');
    lines.push('À traiter :');
    for (const row of urgent) {
      lines.push(`- ${row.name || row.productId} — ${classifyDerogation(row.expiresAt, now) === 'expired' ? 'EXPIRÉE' : 'expire'} le ${new Date(row.expiresAt).toLocaleDateString('fr-FR')} — motif : ${row.reason}`);
    }
  }
  return lines.join('\n');
}
