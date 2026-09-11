import assert from 'node:assert/strict';

import { PEAU_KITS } from '../src/lib/peauKits';
import { intelligenceStore } from '../src/lib/intelligenceStore';
import { buildShelfVerdict } from '../src/lib/shelf';
import { isRestockAlert, isSkinShelfItem, skinShelfStepForRole } from '../src/lib/skinShelf';

const USER_ID = 'c4-skin-journey-user';

async function main(): Promise<void> {
  console.log('\n=== C4 — parcours Shelf peau complet ===\n');
  await intelligenceStore.deleteIntelligenceData(USER_ID);

  const kit = PEAU_KITS.find(item => item.id === 'KPEAU-02')!;
  const openedAt = '2026-09-11T10:00:00.000Z';

  for (const product of kit.products) {
    await intelligenceStore.addShelfItem(USER_ID, {
      freeLabel: product.name,
      category: 'peau',
      routineStep: skinShelfStepForRole(product.role),
      status: 'in_use',
      openedAt,
      estimatedRemainingPercent: 80,
    });
  }

  let shelf = await intelligenceStore.getShelf(USER_ID);
  assert.equal(shelf.length, 5, 'KPEAU-02 doit créer 5 lignes Shelf, pas seulement 3.');
  assert.ok(shelf.every(isSkinShelfItem), 'Chaque composant du kit doit être filtré comme produit peau.');
  assert.ok(shelf.every(item => item.openedAt === openedAt), 'Chaque composant doit conserver sa date d’ouverture.');

  let verdict = buildShelfVerdict(shelf, ['skin_cleanser', 'skin_moisturizer', 'skin_spf']);
  assert.equal(verdict.needsPurchase, false, 'Le kit couvre les trois étapes critiques de base.');
  assert.equal(verdict.gaps.length, 0, 'Aucune lacune critique ne doit être signalée.');

  const spf = shelf.find(item => item.routineStep === 'skin_spf')!;
  const updated = await intelligenceStore.updateShelfItem(USER_ID, spf.id, {
    freeLabel: spf.freeLabel,
    category: 'peau',
    routineStep: spf.routineStep,
    status: 'in_use',
    openedAt: spf.openedAt,
    estimatedRemainingPercent: 20,
  });
  assert.equal(updated?.estimatedRemainingPercent, 20);
  assert.equal(isRestockAlert(updated!), true, 'À 20 % sur un SPF, l’alerte J-7 doit être active.');

  shelf = await intelligenceStore.getShelf(USER_ID);
  verdict = buildShelfVerdict(shelf, ['skin_cleanser', 'skin_moisturizer', 'skin_spf']);
  assert.equal(verdict.needsPurchase, false, 'Une alerte de réassort ne doit pas transformer l’étagère en achat obligatoire.');

  await intelligenceStore.deleteIntelligenceData(USER_ID);
  console.log('✓ 5 composants KPEAU-02 persistés');
  console.log('✓ dates d’ouverture et % restant persistés');
  console.log('✓ verdict « rien à acheter » respecté');
  console.log('✓ alerte J-7 déclenchée sans forcer un achat');
  console.log('\n4 checks parcours C4 validés.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
