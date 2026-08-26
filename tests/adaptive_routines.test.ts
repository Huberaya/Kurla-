import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { serverDb } from '../src/lib/serverDb';
import { buildAdaptiveRoutine, normalizeRoutinePreferences } from '../src/lib/adaptiveRoutine';
import { createEmptyBeautyProfile } from '../src/lib/beautyProfile';
import { isSupabaseServerConfigured } from '../src/lib/supabaseClient';

async function runAdaptiveRoutineTests() {
  const trackerSource = await readFile(new URL('../src/pages/RoutineTrackerPage.tsx', import.meta.url), 'utf8');
  const journalSource = await readFile(new URL('../src/pages/ProgressJournalPage.tsx', import.meta.url), 'utf8');
  const migrationSource = await readFile(new URL('../supabase/migrations/20260836000000_adaptive_routines.sql', import.meta.url), 'utf8');
  const serverSource = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.ok(!trackerSource.includes('localStorage'), 'Le tracker ne doit pas stocker ses tâches localement.');
  assert.ok(!journalSource.includes('localStorage'), 'Le journal ne doit pas stocker ses notes localement.');
  assert.ok(serverSource.includes("app.post('/api/routine/feedback'"), 'La boucle de feedback doit être exposée par le serveur.');
  assert.ok(serverSource.includes("app.post('/api/routine/journal'"), 'Le journal doit être écrit par le serveur.');
  assert.ok(migrationSource.includes('routine_plans') && migrationSource.includes('progress_journal_entries'), 'La migration doit contenir le plan et le journal persistants.');
  assert.ok(migrationSource.includes('user_id = auth.uid()'), 'Les données de routine doivent être liées à l’identité Supabase.');

  if (isSupabaseServerConfigured()) {
    console.log('[SKIP] Adaptive routine fallback tests: a real Supabase server is configured.');
    return;
  }

  const now = new Date('2026-08-27T09:00:00.000Z');
  const preferences = normalizeRoutinePreferences({
    morningEnabled: true,
    eveningEnabled: true,
    washDayIntervalDays: 7,
    maskFrequency: 'weekly',
    nightProtection: 'bonnet',
    protectiveStyle: 'locks',
    protectiveStyleStartedAt: '2026-08-01T12:00:00.000Z',
    locksMaintenanceEveryDays: 28,
    availableMinutesPerDay: 30,
    availableMinutesWashDay: 60,
    ownedProducts: ['Mon leave-in']
  });
  const built = buildAdaptiveRoutine({
    userId: 'adaptive-routine-test-user',
    planId: 'plan-test',
    preferences,
    beautyProfile: createEmptyBeautyProfile(),
    feedback: [],
    journal: [],
    weather: { temperatureC: 30, humidityPercent: 78, source: 'test' },
    now
  });

  assert.ok(built.tasks.some(task => task.kind === 'morning'), 'Le matin doit être planifiable.');
  assert.ok(built.tasks.some(task => task.kind === 'evening'), 'Le soir doit être planifiable.');
  assert.ok(built.tasks.some(task => task.kind === 'wash_day'), 'Le wash day doit être planifié.');
  assert.ok(built.tasks.some(task => task.kind === 'mask'), 'La fréquence des masques doit être prise en compte.');
  assert.ok(built.tasks.some(task => task.kind === 'protective'), 'La dépose d’un style protecteur doit générer un rappel.');
  assert.ok(built.tasks.some(task => task.kind === 'locks'), 'L’entretien des locks doit être planifiable.');
  assert.ok(built.adaptationNotes.some(note => note.includes('Humidité actuelle')), 'La météo doit produire une explication explicable.');
  assert.ok(built.tasks.some(task => task.productLabels.includes('Mon leave-in')), 'Les produits déjà possédés doivent être réutilisables sans invention.');

  const userId = 'adaptive-routine-persistence-test-user';
  const saved = await serverDb.saveAdaptiveRoutine(userId, preferences, { humidityPercent: 35, temperatureC: 4, source: 'test' });
  assert.equal(saved.preferences.protectiveStyle, 'locks');
  assert.ok(saved.tasks.length > 0, 'Une routine enregistrée doit avoir des tâches.');

  const completed = await serverDb.updateAdaptiveRoutineTask(userId, saved.tasks[0].id, 'completed');
  assert.equal(completed?.status, 'completed');

  const feedbackResult = await serverDb.recordRoutineFeedback(userId, { signal: 'more_breakage', note: 'Casse observée au démêlage.' });
  assert.ok(feedbackResult.plan.adaptationNotes.some(note => note.includes('Casse signalée')));
  assert.equal((await serverDb.getAdaptiveRoutineState(userId)).feedback.length, 1);

  const journalResult = await serverDb.createProgressJournalEntry(userId, {
    entryDate: '2026-08-27',
    note: 'Le cuir chevelu démange après le dernier soin.',
    signals: ['scalp_itchy'],
    metrics: { comfortScore: 2 },
    productsUsed: ['Mon leave-in']
  });
  assert.equal(journalResult.entry.signals[0], 'scalp_itchy');
  const state = await serverDb.getAdaptiveRoutineState(userId);
  assert.equal(state.journal.length, 1);
  assert.ok(state.plan?.adaptationNotes.some(note => note.includes('Démangeaisons')));
  assert.equal(state.tasks.find(task => task.id === saved.tasks[0].id)?.status, 'completed', 'La régénération doit conserver les tâches déjà réalisées.');

  await serverDb.deleteAdaptiveRoutineData(userId);
  const deleted = await serverDb.getAdaptiveRoutineState(userId);
  assert.equal(deleted.plan, undefined);
  assert.equal(deleted.journal.length, 0);
  assert.equal(deleted.feedback.length, 0);

  console.log('[PASS] Adaptive routines: calendrier multi-fréquences, météo, feedback, journal persistant et conservation des tâches validés.');
}

runAdaptiveRoutineTests().catch(error => {
  console.error('[FAIL] Adaptive routines:', error);
  process.exitCode = 1;
});
