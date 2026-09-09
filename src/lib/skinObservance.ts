/**
 * KURLA SKIN — Observance matin / soir V1 (C4.3)
 * Toggle quotidien matin fait / soir fait → streak 7j → badge.
 * Stockage localStorage + sync future Supabase (clé unique peau).
 * Aucun tracking intrusif — l'utilisateur déclare, KURLA compte.
 */

const KEY = 'kurla_skin_observance_v1';

export type SkinMoment = 'matin' | 'soir';
export type ObservanceDay = { matin: boolean; soir: boolean };
export type ObservanceMap = Record<string, ObservanceDay>; // YYYY-MM-DD → {matin, soir}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadObservance(): ObservanceMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

export function saveObservance(map: ObservanceMap): void {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* quota */ }
}

export function getTodayState(): ObservanceDay {
  const map = loadObservance();
  return map[todayISO()] || { matin: false, soir: false };
}

export function toggleToday(moment: SkinMoment): ObservanceMap {
  const map = loadObservance();
  const day = todayISO();
  const current = map[day] || { matin: false, soir: false };
  const next: ObservanceDay = { ...current, [moment]: !current[moment] };
  const updated = { ...map, [day]: next };
  saveObservance(updated);
  return updated;
}

export function setToday(moment: SkinMoment, value: boolean): ObservanceMap {
  const map = loadObservance();
  const day = todayISO();
  const current = map[day] || { matin: false, soir: false };
  const updated = { ...map, [day]: { ...current, [moment]: value } };
  saveObservance(updated);
  return updated;
}

/** Streak : nombre de jours consécutifs (aujourd'hui inclus si fait, sinon depuis hier) où le moment a été coché. */
export function getStreak(moment: SkinMoment): number {
  const map = loadObservance();
  let streak = 0;
  const d = new Date();
  // Si aujourd'hui non coché, on ne compte pas aujourd'hui mais on regarde hier
  const todayKey = d.toISOString().slice(0, 10);
  const todayDone = map[todayKey]?.[moment] === true;
  if (!todayDone) {
    d.setDate(d.getDate() - 1);
  }
  for (let i = 0; i < 90; i++) {
    const key = d.toISOString().slice(0, 10);
    if (map[key]?.[moment]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function getWeekHistory(days = 7): Array<{ date: string; dayLabel: string; matin: boolean; soir: boolean }> {
  const map = loadObservance();
  const out: Array<{ date: string; dayLabel: string; matin: boolean; soir: boolean }> = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const v = map[key] || { matin: false, soir: false };
    out.push({
      date: key,
      dayLabel: d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }),
      matin: v.matin,
      soir: v.soir,
    });
  }
  return out;
}

export const OBSERVANCE_KEY = KEY;
