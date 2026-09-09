/**
 * KURLA SKIN — Shelf peau V1 (C4.1)
 * Helpers pour /account/shelf?cat=peau — % restant, jauge, alerte réassort J-7.
 * Basé sur ShelfItem (estimatedRemainingPercent, openedAt, status).
 * Aucun diagnostic médical — estimation cosmétique de consommation.
 */

import type { ShelfItem } from './shelf';

export const SKIN_STEPS = ['skin_cleanser', 'skin_treatment', 'skin_moisturizer', 'skin_spf'] as const;

export function isSkinShelfItem(item: ShelfItem): boolean {
  return (item.routineStep || '').startsWith('skin_') || item.category === 'peau' || (item.productId || '').startsWith('peau-') || (item.productId || '').startsWith('kit-peau');
}

/** Jours moyens pour vider 100% selon étape peau (ordre de grandeur, pas mesure). */
function fullDaysForStep(step?: string): number {
  if (!step) return 45;
  if (step === 'skin_cleanser') return 40; // 150ml
  if (step === 'skin_spf') return 35; // 40ml usage quotidien
  if (step === 'skin_treatment') return 50; // sérum 30ml
  if (step === 'skin_moisturizer') return 45;
  return 45;
}

export function estimateDaysLeft(item: ShelfItem): number | null {
  if (item.estimatedRemainingPercent == null || Number.isNaN(item.estimatedRemainingPercent)) return null;
  if (item.status === 'finished' || item.status === 'abandoned') return 0;
  const full = fullDaysForStep(item.routineStep);
  return Math.max(0, Math.round((item.estimatedRemainingPercent / 100) * full));
}

export function isRestockAlert(item: ShelfItem): boolean {
  const days = estimateDaysLeft(item);
  if (days == null) return false;
  return days <= 7 && days >= 0 && (item.status === 'in_use' || item.status === 'owned');
}

export function openedLabel(item: ShelfItem): string {
  if (!item.openedAt) return '—';
  try {
    return new Date(item.openedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return item.openedAt; }
}

export function progressColor(percent: number | null | undefined): string {
  if (percent == null) return 'bg-[#111111]/10';
  if (percent <= 25) return 'bg-rose-500';
  if (percent <= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function restockMessage(item: ShelfItem): string | null {
  if (!isRestockAlert(item)) return null;
  const days = estimateDaysLeft(item);
  const label = item.freeLabel || item.productId || 'ce soin';
  return `${label} · ${days} jour${(days||0)>1?'s':''} estimé(s) restant(s) — pensez réassort.`;
}

/** Kit KPEAU → 3/5/7 items d’étagère pré-remplis (CTA “Ajouter mes soins”). */
export const KPEAU_SHELF_TEMPLATES: Record<string, Array<{ label: string; step: string }>> = {
  'KPEAU-01': [
    { label: 'Nettoyant doux sans parfum', step: 'skin_cleanser' },
    { label: 'Crème céramides + squalane', step: 'skin_moisturizer' },
    { label: 'SPF 50 invisible fluide', step: 'skin_spf' },
  ],
  'KPEAU-02': [
    { label: 'Nettoyant doux sans parfum', step: 'skin_cleanser' },
    { label: 'Crème céramides + squalane', step: 'skin_moisturizer' },
    { label: 'SPF 50 invisible fluide', step: 'skin_spf' },
    { label: 'Sérum niacinamide 5%', step: 'skin_treatment' },
    { label: 'Gel acide hyaluronique', step: 'skin_treatment' },
  ],
  'KPEAU-03': [
    { label: 'Nettoyant doux sans parfum', step: 'skin_cleanser' },
    { label: 'Crème céramides + squalane', step: 'skin_moisturizer' },
    { label: 'SPF 50 invisible fluide', step: 'skin_spf' },
    { label: 'Sérum niacinamide 5%', step: 'skin_treatment' },
    { label: 'Gel acide hyaluronique', step: 'skin_treatment' },
    { label: 'Exfoliant AHA/BHA 1×/sem', step: 'skin_treatment' },
    { label: 'Baume lèvres céramides', step: 'other' },
  ],
};
