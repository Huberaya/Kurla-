import { randomUUID } from 'node:crypto';

import {
  AdaptiveRoutinePlan,
  RoutineFeedback,
  RoutineFeedbackSignal,
  RoutineJournalEntry,
  RoutineTask,
  createRoutinePlan,
  normalizeRoutineFeedbackSignal,
  normalizeRoutinePreferences,
  normalizeWeatherContext,
} from '../adaptiveRoutine';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
// Appel inter-domaine : le plan de routine se nourrit du profil beauté.
import { getBeautyProfile } from './beautyProfileStore';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.2b — routines adaptatives, journal de progression et retours
 * d'expérience, sortis de `serverDb.ts`.
 */
export function mapRoutineTaskRow(store: SupabaseServerStore, row: any): RoutineTask {
    return {
      id: row.id,
      planId: row.plan_id,
      title: row.title,
      description: row.description || '',
      kind: row.kind,
      scheduledFor: row.scheduled_for,
      timeOfDay: row.time_of_day || undefined,
      durationMinutes: Number(row.duration_minutes || 0),
      completedAt: row.completed_at || undefined,
      status: row.status,
      productLabels: Array.isArray(row.product_labels) ? row.product_labels : []
    };
  }

export function mapRoutineFeedbackRow(store: SupabaseServerStore, row: any): RoutineFeedback | undefined {
    const signal = normalizeRoutineFeedbackSignal(row.signal);
    if (!signal) return undefined;
    return {
      id: row.id,
      signal,
      note: row.note || undefined,
      productLabel: row.product_label || undefined,
      observedAt: row.observed_at || row.created_at,
      createdAt: row.created_at
    };
  }

export function mapRoutineJournalRow(store: SupabaseServerStore, row: any): RoutineJournalEntry {
    const metrics = row.metrics && typeof row.metrics === 'object' ? row.metrics : {};
    return {
      id: row.id,
      entryDate: row.entry_date,
      note: row.note || undefined,
      signals: Array.isArray(row.signals)
        ? row.signals.map(normalizeRoutineFeedbackSignal).filter((signal: RoutineFeedbackSignal | undefined): signal is RoutineFeedbackSignal => !!signal)
        : [],
      hydrationScore: Number.isInteger(metrics.hydrationScore) ? metrics.hydrationScore : undefined,
      breakageScore: Number.isInteger(metrics.breakageScore) ? metrics.breakageScore : undefined,
      comfortScore: Number.isInteger(metrics.comfortScore) ? metrics.comfortScore : undefined,
      detanglingScore: Number.isInteger(metrics.detanglingScore) ? metrics.detanglingScore : undefined,
      productsUsed: Array.isArray(row.products_used) ? row.products_used : [],
      createdAt: row.created_at
    };
  }

export async function getAdaptiveRoutineState(store: SupabaseServerStore, userId: string): Promise<{
    plan?: AdaptiveRoutinePlan;
    tasks: RoutineTask[];
    feedback: RoutineFeedback[];
    journal: RoutineJournalEntry[];
    persistence: 'supabase' | 'server_fallback';
  }> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: planRow, error: planError } = await supabase
        .from('routine_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      ensureDatabaseSuccess('lecture de la routine adaptative', planError);

      const plan = planRow ? {
        id: planRow.id,
        userId: planRow.user_id,
        preferences: normalizeRoutinePreferences(planRow.preferences),
        weather: normalizeWeatherContext(planRow.weather_context),
        adaptationNotes: Array.isArray(planRow.adaptation_notes) ? planRow.adaptation_notes : [],
        createdAt: planRow.created_at,
        updatedAt: planRow.updated_at,
        generatedThrough: planRow.generated_through || 'KURLA routine planner',
        tasks: []
      } satisfies AdaptiveRoutinePlan : undefined;

      const [tasksResult, feedbackResult, journalResult] = await Promise.all([
        plan
          ? supabase.from('routine_tasks').select('*').eq('user_id', userId).eq('plan_id', plan.id).order('scheduled_for', { ascending: true }).order('created_at', { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
        supabase.from('routine_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        supabase.from('progress_journal_entries').select('*').eq('user_id', userId).order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(100)
      ]);
      ensureDatabaseSuccess('lecture des tâches de routine', tasksResult.error);
      ensureDatabaseSuccess('lecture des observations de routine', feedbackResult.error);
      ensureDatabaseSuccess('lecture du journal de progression', journalResult.error);

      const tasks = (tasksResult.data || []).map((row: any) => mapRoutineTaskRow(store, row));
      const feedback = (feedbackResult.data || []).map((row: any) => mapRoutineFeedbackRow(store, row)).filter((item: RoutineFeedback | undefined): item is RoutineFeedback => !!item);
      const journal = (journalResult.data || []).map((row: any) => mapRoutineJournalRow(store, row));
      if (plan) plan.tasks = tasks;
      return { plan, tasks, feedback, journal, persistence: 'supabase' };
    }

    const plan = store.inMemoryRoutinePlans.get(userId);
    return {
      plan,
      tasks: plan?.tasks || [],
      feedback: [...(store.inMemoryRoutineFeedback.get(userId) || [])],
      journal: [...(store.inMemoryRoutineJournal.get(userId) || [])],
      persistence: 'server_fallback'
    };
  }

export async function persistAdaptiveRoutine(store: SupabaseServerStore, plan: AdaptiveRoutinePlan, previousTasks: RoutineTask[]): Promise<AdaptiveRoutinePlan> {
    const completionById = new Map(previousTasks.map(task => [task.id, { status: task.status, completedAt: task.completedAt }]));
    const tasks = plan.tasks.map(task => ({
      ...task,
      status: completionById.get(task.id)?.status || task.status,
      completedAt: completionById.get(task.id)?.completedAt
    }));
    const nextPlan = { ...plan, tasks };
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error: planError } = await supabase.from('routine_plans').upsert({
        id: nextPlan.id,
        user_id: nextPlan.userId,
        status: 'active',
        preferences: nextPlan.preferences,
        weather_context: nextPlan.weather || null,
        adaptation_notes: nextPlan.adaptationNotes,
        generated_through: nextPlan.generatedThrough,
        created_at: nextPlan.createdAt,
        updated_at: nextPlan.updatedAt
      }, { onConflict: 'id' });
      ensureDatabaseSuccess('enregistrement de la routine adaptative', planError);

      const { error: deleteError } = await supabase.from('routine_tasks').delete().eq('user_id', nextPlan.userId).eq('plan_id', nextPlan.id);
      ensureDatabaseSuccess('remplacement des tâches de routine', deleteError);
      if (tasks.length > 0) {
        const { error: taskError } = await supabase.from('routine_tasks').insert(tasks.map(task => ({
          id: task.id,
          plan_id: nextPlan.id,
          user_id: nextPlan.userId,
          title: task.title,
          description: task.description,
          kind: task.kind,
          scheduled_for: task.scheduledFor,
          time_of_day: task.timeOfDay || null,
          duration_minutes: task.durationMinutes,
          completed_at: task.completedAt || null,
          status: task.status,
          product_labels: task.productLabels,
          created_at: nextPlan.createdAt,
          updated_at: nextPlan.updatedAt
        })));
        ensureDatabaseSuccess('création des tâches de routine', taskError);
      }
    }

    store.inMemoryRoutinePlans.set(nextPlan.userId, nextPlan);
    return nextPlan;
  }

export async function saveAdaptiveRoutine(store: SupabaseServerStore, userId: string, input: unknown, weatherInput?: unknown): Promise<AdaptiveRoutinePlan> {
    const preferences = normalizeRoutinePreferences(input);
    const current = await getAdaptiveRoutineState(store, userId);
    const planId = current.plan?.id || randomUUID();
    const beautyProfile = (await store.getBeautyProfile(userId))?.profile;
    const weather = normalizeWeatherContext(weatherInput) || current.plan?.weather;
    const now = new Date();
    const plan = createRoutinePlan(userId, planId, preferences, {
      beautyProfile,
      feedback: current.feedback,
      journal: current.journal,
      weather,
      now
    });
    return persistAdaptiveRoutine(store, plan, current.tasks);
  }

export async function updateAdaptiveRoutineTask(store: SupabaseServerStore, userId: string, taskId: string, status: 'pending' | 'completed' | 'skipped'): Promise<RoutineTask | undefined> {
    const state = await getAdaptiveRoutineState(store, userId);
    const task = state.tasks.find(item => item.id === taskId);
    if (!task) return undefined;
    const completedAt = status === 'completed' ? new Date().toISOString() : undefined;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('routine_tasks').update({
        status,
        completed_at: completedAt || null,
        updated_at: new Date().toISOString()
      }).eq('id', taskId).eq('user_id', userId).select('*').maybeSingle();
      ensureDatabaseSuccess('mise à jour de la tâche de routine', error);
      if (!data) return undefined;
      const updated = mapRoutineTaskRow(store, data);
      if (state.plan) {
        state.plan.tasks = state.tasks.map(item => item.id === taskId ? updated : item);
        store.inMemoryRoutinePlans.set(userId, state.plan);
      }
      return updated;
    }
    const updated = { ...task, status, completedAt };
    const plan = store.inMemoryRoutinePlans.get(userId);
    if (plan) {
      plan.tasks = plan.tasks.map(item => item.id === taskId ? updated : item);
      store.inMemoryRoutinePlans.set(userId, plan);
    }
    return updated;
  }

export async function recordRoutineFeedback(store: SupabaseServerStore, userId: string, input: { signal: unknown; note?: unknown; productLabel?: unknown; observedAt?: unknown }): Promise<{ feedback: RoutineFeedback; plan: AdaptiveRoutinePlan }> {
    const signal = normalizeRoutineFeedbackSignal(input.signal);
    if (!signal) throw new Error('Observation de routine inconnue.');
    const current = await getAdaptiveRoutineState(store, userId);
    const plan = current.plan || await saveAdaptiveRoutine(store, userId, {});
    const now = new Date().toISOString();
    const feedback: RoutineFeedback = {
      id: randomUUID(),
      signal,
      note: typeof input.note === 'string' ? input.note.trim().slice(0, 1000) || undefined : undefined,
      productLabel: typeof input.productLabel === 'string' ? input.productLabel.trim().slice(0, 160) || undefined : undefined,
      observedAt: typeof input.observedAt === 'string' && !Number.isNaN(new Date(input.observedAt).getTime()) ? new Date(input.observedAt).toISOString() : now,
      createdAt: now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('routine_feedback').insert({
        id: feedback.id,
        user_id: userId,
        routine_plan_id: plan.id,
        signal: feedback.signal,
        note: feedback.note || null,
        product_label: feedback.productLabel || null,
        observed_at: feedback.observedAt,
        created_at: feedback.createdAt
      });
      ensureDatabaseSuccess('enregistrement de l’observation de routine', error);
    }
    const feedbackList = [feedback, ...current.feedback];
    store.inMemoryRoutineFeedback.set(userId, feedbackList.slice(0, 100));
    const nextPlan = await saveAdaptiveRoutine(store, userId, plan.preferences, plan.weather);
    return { feedback, plan: nextPlan };
  }

export function validateRoutineMetrics(store: SupabaseServerStore, metrics: unknown): Record<string, number> {
    if (!metrics || typeof metrics !== 'object') return {};
    const source = metrics as Record<string, unknown>;
    const output: Record<string, number> = {};
    for (const key of ['hydrationScore', 'breakageScore', 'comfortScore', 'detanglingScore']) {
      if (source[key] === undefined) continue;
      const value = Number(source[key]);
      if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error('Chaque indicateur du journal doit être compris entre 1 et 5.');
      output[key] = value;
    }
    return output;
  }

export async function createProgressJournalEntry(store: SupabaseServerStore, userId: string, input: { entryDate?: unknown; note?: unknown; signals?: unknown; metrics?: unknown; productsUsed?: unknown }): Promise<{ entry: RoutineJournalEntry; plan: AdaptiveRoutinePlan }> {
    const current = await getAdaptiveRoutineState(store, userId);
    const plan = current.plan || await saveAdaptiveRoutine(store, userId, {});
    const entryDate = typeof input.entryDate === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(input.entryDate) ? input.entryDate : new Date().toISOString().slice(0, 10);
    const signals = Array.isArray(input.signals)
      ? input.signals.map(normalizeRoutineFeedbackSignal).filter((signal: RoutineFeedbackSignal | undefined): signal is RoutineFeedbackSignal => !!signal).slice(0, 9)
      : [];
    const metrics = validateRoutineMetrics(store, input.metrics);
    const now = new Date().toISOString();
    const entry: RoutineJournalEntry = {
      id: randomUUID(),
      entryDate,
      note: typeof input.note === 'string' ? input.note.trim().slice(0, 3000) || undefined : undefined,
      signals,
      hydrationScore: metrics.hydrationScore,
      breakageScore: metrics.breakageScore,
      comfortScore: metrics.comfortScore,
      detanglingScore: metrics.detanglingScore,
      productsUsed: Array.isArray(input.productsUsed) ? input.productsUsed.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 160)).filter(Boolean).slice(0, 20) : [],
      createdAt: now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('progress_journal_entries').insert({
        id: entry.id,
        user_id: userId,
        routine_plan_id: plan.id,
        entry_date: entry.entryDate,
        note: entry.note || null,
        signals: entry.signals,
        metrics,
        products_used: entry.productsUsed,
        created_at: now,
        updated_at: now
      });
      ensureDatabaseSuccess('enregistrement du journal de progression', error);
    }
    const journal = [entry, ...current.journal];
    store.inMemoryRoutineJournal.set(userId, journal.slice(0, 100));
    const nextPlan = await saveAdaptiveRoutine(store, userId, plan.preferences, plan.weather);
    return { entry, plan: nextPlan };
  }

export async function deleteAdaptiveRoutineData(store: SupabaseServerStore, userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error: journalError } = await supabase.from('progress_journal_entries').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression du journal de progression', journalError);
      const { error: feedbackError } = await supabase.from('routine_feedback').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression des observations de routine', feedbackError);
      const { error: taskError } = await supabase.from('routine_tasks').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression des tâches de routine', taskError);
      const { error: planError } = await supabase.from('routine_plans').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression de la routine adaptative', planError);
    }
    store.inMemoryRoutinePlans.delete(userId);
    store.inMemoryRoutineFeedback.delete(userId);
    store.inMemoryRoutineJournal.delete(userId);
  }
