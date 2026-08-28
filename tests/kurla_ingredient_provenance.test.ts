import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { serverDb } from '../src/lib/serverDb';

/**
 * CHANTIER 10 (bloc B4) — banc « lot vérifié, source par source ».
 *
 * Le risque ici n'est pas un bug : c'est une ligne marquée « vérifiée » qui ne
 * l'a pas été. Ce banc vérifie donc la chaîne entière :
 *
 *  1. la migration ne contient que ce que la trace de vérification contient —
 *     ni plus, ni moins, et avec le bon statut selon le niveau de preuve ;
 *  2. chaque ingrédient porte une provenance (source, URL absolue, date) ;
 *  3. le code refuse le statut `verified` sans provenance de niveau 1 — la
 *     règle tient même si quelqu'un ajoute une ligne à la main plus tard.
 */

const TRACE_PATH = join(process.cwd(), 'docs', 'data', 'ingredient_batch_1.json');
const MIGRATION_PATH = join(process.cwd(), 'supabase', 'migrations', '20260868000000_ingredient_verified_batch_1.sql');

interface TraceRow {
  id: string;
  /** Dénomination proposée par le lot ; `inciVerified` n'existe qu'au niveau 1. */
  inciProposed: string;
  inciVerified?: string;
  tier: number;
  sourceUrl: string;
  sourceLabel: string;
  retrievedAt: string;
  casNumber?: string | null;
}

async function runProvenanceTests(): Promise<void> {
  const trace = JSON.parse(readFileSync(TRACE_PATH, 'utf8')) as {
    generatedAt: string;
    verifiedCount: number;
    identifiedCount: number;
    rejectedCount: number;
    verified: TraceRow[];
    identified: TraceRow[];
    rejected: Array<{ id: string; reason: string }>;
  };
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  const rows = [...trace.verified, ...trace.identified];
  assert.equal(trace.verified.length, trace.verifiedCount);
  assert.equal(trace.identified.length, trace.identifiedCount);
  assert.equal(trace.rejected.length, trace.rejectedCount);
  assert.ok(rows.length >= 20, 'le lot doit compter au moins 20 lignes vérifiées');

  // ---------------------------------------------------------------------
  // 1. Migration = trace, ligne par ligne.
  // ---------------------------------------------------------------------
  const ingredientInserts = Array.from(sql.matchAll(/INSERT INTO public\.ingredients \([^)]*\) VALUES \(\s*'([^']+)',[\s\S]*?'(verified|pending|not_provided)', NOW\(\)\)/g));
  assert.equal(ingredientInserts.length, rows.length, 'le nombre d’ingrédients de la migration doit égaler celui de la trace');

  const statusById = new Map(ingredientInserts.map(match => [match[1], match[2]]));

  /**
   * Alignement des identifiants : `public.ingredients` a une contrainte
   * d'unicité sur `inci_name`. Un INCI déjà catalogué sous un autre
   * identifiant doit réutiliser celui de la base — sinon la migration échoue en
   * production (vérifié le 28/08/2026 : `salicylic_acid` contre `salicylic-acid`).
   */
  const catalogue = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'data', 'existing_ingredients_2026-08-28.json'), 'utf-8')
  ).ingredients as Array<{ id: string; inci_name_normalized: string }>;
  const existingByNorm = new Map(catalogue.map(item => [item.inci_name_normalized, item.id]));
  const normalizeName = (value: string) => value.toLowerCase().trim();
  const canonicalId = (row: TraceRow) =>
    existingByNorm.get(normalizeName(row.inciVerified || row.inciProposed)) ?? row.id;

  for (const row of rows) {
    const id = canonicalId(row);
    const expected = row.tier === 1 ? 'verified' : 'pending';
    assert.equal(statusById.get(id), expected, `${id} : un niveau ${row.tier} ne peut pas porter le statut « ${statusById.get(id)} »`);
  }

  // Régression : aucun doublon d'identité pour un INCI déjà catalogué.
  for (const row of rows) {
    const already = existingByNorm.get(normalizeName(row.inciVerified || row.inciProposed));
    if (already && already !== row.id) {
      assert.equal(statusById.has(row.id), false, `${row.id} recrée un ingrédient déjà catalogué sous ${already}`);
      assert.equal(statusById.has(already), true, `${already} doit être réutilisé pour l'INCI « ${row.inciVerified || row.inciProposed} »`);
    }
  }

  // Aucune ligne écartée n'a été repêchée dans la migration.
  for (const rejectedRow of trace.rejected) {
    assert.equal(statusById.has(rejectedRow.id), false, `${rejectedRow.id} a été écarté de la vérification, il ne doit pas être inséré`);
  }

  // ---------------------------------------------------------------------
  // 2. Chaque ingrédient a une provenance complète et consultable.
  // ---------------------------------------------------------------------
  // Les libellés contiennent des apostrophes échappées (« n''y ») : le motif
  // accepte les guillemets doublés, sinon les lignes de niveau 2 passent
  // silencieusement à travers le contrôle.
  const provenanceInserts = Array.from(sql.matchAll(/INSERT INTO public\.ingredient_provenance[\s\S]*?VALUES \('([^']+)', '((?:[^']|'')*)', '(https?:\/\/[^']+)', '(\d{4}-\d{2}-\d{2})', (?:'((?:[^']|'')*)'|NULL), (\d),/g));
  assert.equal(provenanceInserts.length, rows.length, 'chaque ingrédient doit avoir exactement une provenance');

  const provenanceById = new Map(provenanceInserts.map(match => [match[1], { label: match[2], url: match[3], date: match[4], tier: Number(match[6]) }]));
  for (const row of rows) {
    const id = canonicalId(row);
    const provenance = provenanceById.get(id);
    assert.ok(provenance, `${id} : provenance absente de la migration`);
    assert.equal(provenance!.url, row.sourceUrl, `${id} : l'URL de la migration diffère de la trace`);
    assert.equal(provenance!.date, row.retrievedAt, `${id} : la date de retrait diffère de la trace`);
    assert.equal(provenance!.tier, row.tier, `${id} : le niveau de preuve diffère de la trace`);
    assert.match(provenance!.url, /^https:\/\/(pubchem\.ncbi\.nlm\.nih\.gov|www\.ncbi\.nlm\.nih\.gov)\//, `${id} : source hors des bases consultées`);
  }

  // Les liaisons produit × ingrédient ne référencent que des ingrédients du lot.
  const linkIds = Array.from(sql.matchAll(/INSERT INTO public\.product_ingredients[^;]*?VALUES \('[^']+', '([^']+)'/g)).map(match => match[1]);
  assert.ok(linkIds.length > 0, 'aucune liaison produit × ingrédient générée');
  for (const ingredientId of linkIds) {
    assert.ok(statusById.has(ingredientId), `la liaison pointe vers ${ingredientId}, absent du lot vérifié`);
  }

  // ---------------------------------------------------------------------
  // 3. Le code refuse « verified » sans provenance de niveau 1.
  // ---------------------------------------------------------------------
  serverDb.inMemoryIngredients = [
    { id: 'test_ingredient', inci_name: 'Test Ingredient', inci_name_normalized: 'test ingredient', common_names: [], functions: [], verification_status: 'not_provided' }
  ] as never[];
  serverDb.inMemoryIngredientProvenance = [];

  await assert.rejects(
    () => serverDb.setIngredientVerificationStatus('admin-1', 'test_ingredient', 'verified'),
    /Statut « verified » refusé/
  );
  let row = serverDb.inMemoryIngredients.find((item: any) => item.id === 'test_ingredient');
  assert.equal(row.verification_status, 'not_provided', 'un refus ne doit pas modifier le statut');

  // Une provenance de niveau 2 (identité botanique seule) ne suffit pas non plus.
  await serverDb.recordIngredientProvenance('admin-1', 'test_ingredient', {
    sourceLabel: 'Source de niveau 2',
    sourceUrl: 'https://www.ncbi.nlm.nih.gov/taxonomy/1',
    retrievedAt: '2026-08-28',
    evidenceTier: 2
  });
  await assert.rejects(
    () => serverDb.setIngredientVerificationStatus('admin-1', 'test_ingredient', 'verified'),
    /niveau 1/
  );

  // Niveau 1 : le statut passe, et la provenance est lisible.
  await serverDb.recordIngredientProvenance('admin-1', 'test_ingredient', {
    sourceLabel: 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/1',
    retrievedAt: '2026-08-28',
    casNumber: '0000-00-0',
    evidenceTier: 1
  });
  const updated = await serverDb.setIngredientVerificationStatus('admin-1', 'test_ingredient', 'verified');
  assert.equal(updated.verificationStatus, 'verified');
  assert.equal(updated.provenanceCount, 2);

  const provenance = await serverDb.getIngredientProvenance('test_ingredient');
  assert.equal(provenance.length, 2);
  assert.ok(provenance.some(item => item.evidenceTier === 1 && item.casNumber === '0000-00-0'));

  // La provenance est contrôlée : URL relative et date invalide sont refusées.
  await assert.rejects(
    () => serverDb.recordIngredientProvenance('admin-1', 'test_ingredient', { sourceLabel: 'x', sourceUrl: '/relative', retrievedAt: '2026-08-28' }),
    /absolue/
  );
  await assert.rejects(
    () => serverDb.recordIngredientProvenance('admin-1', 'test_ingredient', { sourceLabel: 'x', sourceUrl: 'https://example.org/x', retrievedAt: 'hier' }),
    /date de retrait/
  );

  console.log(`[PASS] Provenance banc : ${rows.length} lignes migration = trace (niveau 1 : ${trace.verifiedCount}, niveau 2 : ${trace.identifiedCount}), ${trace.rejectedCount} écartées non repêchées, « verified » exige une provenance de niveau 1.`);
}

runProvenanceTests().catch(error => {
  console.error('[FAIL] Provenance banc :', error);
  process.exitCode = 1;
});
