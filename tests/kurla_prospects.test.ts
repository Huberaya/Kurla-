import assert from 'node:assert/strict';

import { serverDb } from '../src/lib/serverDb';
import { seedInMemoryProspects, upsertProspect, upsertCandidate, listProspects, listCandidates } from '../src/lib/db/prospectStore';
import { DEFAULT_PROSPECTS, DEFAULT_CANDIDATES } from '../src/lib/prospectSeed';

/**
 * PROSPECTS DE SOURCING — banc.
 * Vérifie :
 *  1. l'amorçage mémoire porte les 21 cibles du plan hybride et les 15
 *     références candidates, toutes en statut initial (aucun chiffre inventé) ;
 *  2. une mise à jour de prospect persiste le statut / la relance sans créer
 *     de doublon ;
 *  3. un tarif n'est jamais inventé : prix et marge restent nuls tant qu'aucune
 *     réponse réelle ne les fournit ;
 *  4. une création exige nom (et marque+produit pour une référence) ;
 *  5. les valeurs hors énumération sont ignorées/replacées par le défaut.
 */

const ADMIN = 'admin-prospects-1';

function reset(): void {
  serverDb.inMemoryProspects = [];
  serverDb.inMemoryCandidates = [];
  seedInMemoryProspects(serverDb);
}

async function main(): Promise<void> {
  reset();

  // 1. Amorçage
  const prospects = await listProspects(serverDb);
  const candidates = await listCandidates(serverDb);
  assert.equal(prospects.length, DEFAULT_PROSPECTS.length, '21 prospects amorcés');
  assert.equal(candidates.length, DEFAULT_CANDIDATES.length, '15 références amorcées');
  assert.ok(prospects.every((p) => p.status === 'to_contact'), 'aucun statut inventé');
  assert.ok(candidates.every((c) => c.governanceStatus === 'blocked'), 'gouvernance bloque par défaut');
  assert.ok(candidates.every((c) => c.purchasePriceCents === null && c.marginPct === null), 'aucun tarif inventé');
  // Les deux voies du plan hybride sont présentes.
  assert.ok(prospects.some((p) => p.route === 'A'), 'voie A (revente) présente');
  assert.ok(prospects.some((p) => p.route === 'B'), 'voie B (façonnage) présente');

  // 2. Mise à jour d'un prospect (pas de doublon)
  const updated = await upsertProspect(serverDb, ADMIN, {
    id: 'c01', name: 'Nappy Queen', route: 'A', contactType: 'brand_fr',
    status: 'emailed', followUpOn: '2026-09-06', contactEmail: 'contact@nappyqueen.fr',
  });
  assert.equal(updated.status, 'emailed');
  assert.equal(updated.followUpOn, '2026-09-06');
  const afterUpdate = await listProspects(serverDb);
  assert.equal(afterUpdate.length, DEFAULT_PROSPECTS.length, 'pas de doublon après mise à jour');
  const c01 = afterUpdate.find((p) => p.id === 'c01');
  assert.equal(c01?.contactEmail, 'contact@nappyqueen.fr');

  // 3. Tarif candidat renseigné par une réponse réelle
  const priced = await upsertCandidate(serverDb, ADMIN, {
    id: 'r01', prospectId: 'c01', brand: 'Nappy Queen', product: 'Après-shampoing karité',
    purchasePriceCents: 650, publicPriceCents: 1390, marginPct: 53.2, firstOrderQty: 12, inciReceived: true,
  });
  assert.equal(priced.purchasePriceCents, 650);
  assert.equal(priced.publicPriceCents, 1390);
  assert.equal(priced.marginPct, 53.2);
  // La marge est bornée à [0,100].
  const capped = await upsertCandidate(serverDb, ADMIN, { id: 'r02', prospectId: 'c02', brand: 'Activilong', product: 'Leave-in', marginPct: 250 });
  assert.equal(capped.marginPct, 100, 'marge bornée à 100');

  // 4. Validations
  await assert.rejects(() => upsertProspect(serverDb, ADMIN, { name: '  ' }), /nom/i, 'nom obligatoire');
  await assert.rejects(() => upsertCandidate(serverDb, ADMIN, { brand: 'X', product: '' }), /produit/i, 'produit obligatoire');

  // 5. Énumération invalide remplacée par le défaut
  const badStatus = await upsertProspect(serverDb, ADMIN, { id: 'c03', name: 'Test', route: 'A', status: 'nimporte' as any });
  assert.equal(badStatus.status, 'to_contact', 'statut invalide -> défaut');

  console.log('[PASS] Prospects sourcing : amorçage hybride, mise à jour sans doublon, tarifs jamais inventés, validations, énumérations.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
