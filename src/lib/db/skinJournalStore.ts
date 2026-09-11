import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import type { SupabaseServerStore } from '../serverDb';

export type SkinJournalMilestone = 'J+0' | 'J+7' | 'J+30' | 'hebdo';

export interface SkinJournalEntry {
  id: string;
  userId: string;
  date: string;
  feelingScore: number;
  concerns: string[];
  notes?: string;
  milestone?: SkinJournalMilestone;
  photoId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkinObservanceDay {
  userId: string;
  day: string;
  matin: boolean;
  soir: boolean;
  updatedAt: string;
}

function mapJournalRow(row: any): SkinJournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.entry_date,
    feelingScore: Number(row.feeling_score),
    concerns: Array.isArray(row.concerns) ? row.concerns : [],
    notes: row.notes || undefined,
    milestone: ['J+0', 'J+7', 'J+30', 'hebdo'].includes(row.milestone) ? row.milestone : undefined,
    photoId: row.photo_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapObservanceRow(row: any): SkinObservanceDay {
  return {
    userId: row.user_id,
    day: row.day,
    matin: row.morning_done === true,
    soir: row.evening_done === true,
    updatedAt: row.updated_at
  };
}

function validDate(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function cleanConcerns(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim().slice(0, 80)))).slice(0, 3);
}

export async function getSkinJournalEntries(store: SupabaseServerStore, userId: string): Promise<SkinJournalEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('skin_journal_entries')
      .select('*').eq('user_id', userId)
      .order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(50);
    ensureDatabaseSuccess('lecture du journal peau', error);
    const entries = (data || []).map(mapJournalRow);
    store.inMemorySkinJournal.set(userId, entries);
    return entries;
  }
  return [...(store.inMemorySkinJournal.get(userId) || [])];
}

export async function createSkinJournalEntry(
  store: SupabaseServerStore,
  userId: string,
  input: { date?: unknown; feelingScore?: unknown; concerns?: unknown; notes?: unknown; milestone?: unknown; photoId?: unknown }
): Promise<SkinJournalEntry> {
  const date = validDate(input.date) || new Date().toISOString().slice(0, 10);
  const feelingScore = Number(input.feelingScore);
  if (!Number.isInteger(feelingScore) || feelingScore < 1 || feelingScore > 5) {
    throw new Error('Le ressenti doit être un entier compris entre 1 et 5.');
  }
  const concerns = cleanConcerns(input.concerns);
  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0, 400) || undefined : undefined;
  const milestone = ['J+0', 'J+7', 'J+30', 'hebdo'].includes(input.milestone as string)
    ? input.milestone as SkinJournalMilestone
    : undefined;
  const photoId = typeof input.photoId === 'string' && input.photoId.trim() ? input.photoId.trim() : undefined;
  const now = new Date().toISOString();
  const entry: SkinJournalEntry = {
    id: randomUUID(), userId, date, feelingScore, concerns, notes, milestone, photoId,
    createdAt: now, updatedAt: now
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    if (photoId) {
      const { data: photo, error: photoError } = await supabase.from('beauty_profile_photos')
        .select('id').eq('id', photoId).eq('user_id', userId).maybeSingle();
      ensureDatabaseSuccess('vérification de la photo du journal', photoError);
      if (!photo) throw new Error('Photo du journal introuvable ou non autorisée.');
    }
    const { error } = await supabase.from('skin_journal_entries').insert({
      id: entry.id,
      user_id: userId,
      entry_date: entry.date,
      feeling_score: entry.feelingScore,
      concerns: entry.concerns,
      notes: entry.notes || null,
      milestone: entry.milestone || null,
      photo_id: entry.photoId || null,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt
    });
    ensureDatabaseSuccess('enregistrement du journal peau', error);
  }
  const list = store.inMemorySkinJournal.get(userId) || [];
  store.inMemorySkinJournal.set(userId, [entry, ...list].slice(0, 50));
  return entry;
}

export async function deleteSkinJournalEntry(store: SupabaseServerStore, userId: string, entryId: string): Promise<SkinJournalEntry | undefined> {
  const current = (await getSkinJournalEntries(store, userId)).find(entry => entry.id === entryId);
  if (!current) return undefined;
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('skin_journal_entries').delete().eq('id', entryId).eq('user_id', userId);
    ensureDatabaseSuccess('suppression de l’entrée du journal peau', error);
  }
  store.inMemorySkinJournal.set(userId, (store.inMemorySkinJournal.get(userId) || []).filter(entry => entry.id !== entryId));
  return current;
}

export async function getSkinObservance(
  store: SupabaseServerStore,
  userId: string,
  from?: string,
  to?: string
): Promise<SkinObservanceDay[]> {
  const end = validDate(to) || new Date().toISOString().slice(0, 10);
  const start = validDate(from) || (() => { const date = new Date(`${end}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - 89); return date.toISOString().slice(0, 10); })();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('skin_observance_days').select('*')
      .eq('user_id', userId).gte('day', start).lte('day', end).order('day', { ascending: true });
    ensureDatabaseSuccess('lecture de l’observance peau', error);
    const days = (data || []).map(mapObservanceRow);
    store.inMemorySkinObservance.set(userId, days);
    return days;
  }
  return (store.inMemorySkinObservance.get(userId) || []).filter(day => day.day >= start && day.day <= end);
}

export async function setSkinObservance(
  store: SupabaseServerStore,
  userId: string,
  day: string,
  input: { matin?: unknown; soir?: unknown }
): Promise<SkinObservanceDay> {
  if (!validDate(day)) throw new Error('Jour d’observance invalide.');
  const current = (await getSkinObservance(store, userId, day, day))[0];
  const next: SkinObservanceDay = {
    userId,
    day,
    matin: typeof input.matin === 'boolean' ? input.matin : current?.matin === true,
    soir: typeof input.soir === 'boolean' ? input.soir : current?.soir === true,
    updatedAt: new Date().toISOString()
  };
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('skin_observance_days').upsert({
      user_id: userId,
      day,
      morning_done: next.matin,
      evening_done: next.soir,
      updated_at: next.updatedAt
    }, { onConflict: 'user_id,day' }).select('*').single();
    ensureDatabaseSuccess('enregistrement de l’observance peau', error);
    const mapped = mapObservanceRow(data);
    const list = (store.inMemorySkinObservance.get(userId) || []).filter(item => item.day !== day);
    store.inMemorySkinObservance.set(userId, [...list, mapped].sort((a, b) => a.day.localeCompare(b.day)));
    return mapped;
  }
  const list = (store.inMemorySkinObservance.get(userId) || []).filter(item => item.day !== day);
  store.inMemorySkinObservance.set(userId, [...list, next].sort((a, b) => a.day.localeCompare(b.day)));
  return next;
}

export async function deleteSkinJournalData(store: SupabaseServerStore, userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    for (const table of ['skin_journal_entries', 'skin_observance_days']) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      ensureDatabaseSuccess(`suppression des données peau (${table})`, error);
    }
  }
  store.inMemorySkinJournal.delete(userId);
  store.inMemorySkinObservance.delete(userId);
}
