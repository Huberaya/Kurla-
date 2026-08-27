import { AdaptiveRoutinePlan, RoutineFeedback, RoutineJournalEntry, RoutinePreferences, RoutineTask, RoutineWeatherContext } from '../lib/adaptiveRoutine';
import { apiErrorMessage } from '../lib/apiDiagnostics';

export interface AdaptiveRoutineState {
  plan: AdaptiveRoutinePlan | null;
  tasks: RoutineTask[];
  feedback: RoutineFeedback[];
  journal: RoutineJournalEntry[];
  persistence: 'supabase' | 'server_fallback';
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage(response, data, 'La demande n’a pas pu aboutir.'));
  return data as T;
}

export async function getAdaptiveRoutine(token: string): Promise<AdaptiveRoutineState> {
  return request<AdaptiveRoutineState>('/api/routine', token);
}

export async function saveAdaptiveRoutine(token: string, preferences: RoutinePreferences | Partial<RoutinePreferences>, weather?: RoutineWeatherContext): Promise<AdaptiveRoutineState> {
  return request<AdaptiveRoutineState>('/api/routine', token, {
    method: 'PUT',
    body: JSON.stringify({ preferences, weather })
  });
}

export async function updateRoutineTask(token: string, taskId: string, status: RoutineTask['status']): Promise<RoutineTask> {
  const data = await request<{ task: RoutineTask }>(`/api/routine/tasks/${encodeURIComponent(taskId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  return data.task;
}

export async function recordRoutineFeedback(token: string, input: { signal: RoutineFeedback['signal']; note?: string; productLabel?: string; observedAt?: string }): Promise<AdaptiveRoutineState> {
  return request<AdaptiveRoutineState>('/api/routine/feedback', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function getProgressJournal(token: string): Promise<Pick<AdaptiveRoutineState, 'journal' | 'persistence'>> {
  return request<Pick<AdaptiveRoutineState, 'journal' | 'persistence'>>('/api/routine/journal', token);
}

export async function addProgressJournalEntry(token: string, input: {
  entryDate: string;
  note?: string;
  signals: RoutineJournalEntry['signals'];
  metrics: Record<string, number>;
  productsUsed: string[];
}): Promise<AdaptiveRoutineState> {
  return request<AdaptiveRoutineState>('/api/routine/journal', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function getRoutineWeather(token: string, latitude: number, longitude: number): Promise<RoutineWeatherContext> {
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
  const data = await request<{ weather: RoutineWeatherContext }>(`/api/routine/weather?${query.toString()}`, token);
  return data.weather;
}
