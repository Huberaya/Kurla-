import assert from 'node:assert/strict';

import {
  KPEAU_SHELF_TEMPLATES,
  estimateDaysLeft,
  isRestockAlert,
  isSkinShelfItem,
  openedLabel,
  skinShelfStepForRole,
} from '../src/lib/skinShelf';
import {
  getStreak,
  getTodayState,
  localISODate,
  loadObservance,
  setToday,
  toggleToday,
} from '../src/lib/skinObservance';
import type { ShelfItem } from '../src/lib/shelf';

let checks = 0;
const ok = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`✓ ${label}`);
};

const memory = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
};

const skinItem = (patch: Partial<ShelfItem> = {}): ShelfItem => ({
  id: 'skin-1',
  userId: 'user-1',
  freeLabel: 'SPF 50 invisible',
  status: 'in_use',
  category: 'peau',
  routineStep: 'skin_spf',
  ingredientIds: [],
  openedAt: '2026-09-01T10:00:00.000Z',
  estimatedRemainingPercent: 20,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  ...patch,
});

console.log('\n=== C4 — Shelf peau / journal / observance ===\n');

ok('la date d’observance reste la date civile locale', () => {
  const date = new Date(2026, 8, 11, 23, 45, 0);
  assert.equal(localISODate(date), '2026-09-11');
});

ok('le filtre reconnaît les produits peau par étape, catégorie ou identifiant', () => {
  assert.equal(isSkinShelfItem(skinItem()), true);
  assert.equal(isSkinShelfItem(skinItem({ category: 'hair', routineStep: 'leave_in', productId: 'peau-ess-001' })), true);
  assert.equal(isSkinShelfItem(skinItem({ category: 'hair', routineStep: 'leave_in', productId: 'hair-001' })), false);
});

ok('la jauge convertit le pourcentage restant en jours et déclenche J-7', () => {
  assert.equal(estimateDaysLeft(skinItem({ estimatedRemainingPercent: 20 })), 7);
  assert.equal(isRestockAlert(skinItem({ estimatedRemainingPercent: 20 })), true);
  assert.equal(isRestockAlert(skinItem({ estimatedRemainingPercent: 50 })), false);
  assert.equal(estimateDaysLeft(skinItem({ status: 'finished', estimatedRemainingPercent: 50 })), 0);
  assert.equal(openedLabel(skinItem()), '01 sept. 2026');
});

ok('les trois kits ont les composants attendus pour l’ajout rapide Shelf', () => {
  assert.equal(KPEAU_SHELF_TEMPLATES['KPEAU-01'].length, 3);
  assert.equal(KPEAU_SHELF_TEMPLATES['KPEAU-02'].length, 5);
  assert.equal(KPEAU_SHELF_TEMPLATES['KPEAU-03'].length, 7);
  assert.ok(KPEAU_SHELF_TEMPLATES['KPEAU-01'].every(item => item.step.startsWith('skin_')));
  assert.equal(skinShelfStepForRole('Nettoyant matin & soir'), 'skin_cleanser');
  assert.equal(skinShelfStepForRole('Crème barrière'), 'skin_moisturizer');
  assert.equal(skinShelfStepForRole('SPF matin'), 'skin_spf');
  assert.equal(skinShelfStepForRole('Sérum HPI'), 'skin_treatment');
  assert.equal(skinShelfStepForRole('Lèvres sèches'), 'other');
});

ok('l’observance persiste le matin et le soir sans tracking automatique', () => {
  assert.deepEqual(loadObservance(), {});
  setToday('matin', true);
  assert.equal(getTodayState().matin, true);
  assert.equal(getTodayState().soir, false);
  toggleToday('soir');
  assert.deepEqual(getTodayState(), { matin: true, soir: true });
  assert.equal(getStreak('matin'), 1);
  assert.equal(getStreak('soir'), 1);
  toggleToday('soir');
  assert.equal(getTodayState().soir, false);
});

console.log(`\n${checks} checks C4 validés.`);
