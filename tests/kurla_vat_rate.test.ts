/**
 * BANC — B-05 : « un seul format de TVA »
 * =======================================
 *
 * Constat : `vat_rate` valait 0,2 sur 64 produits et 20.0 sur 16. La colonne
 * est un pourcentage (NUMERIC(5,2), DEFAULT 20.00, CHECK 0..100) : les 64
 * premières fiches déclaraient donc une TVA de 0,2 %.
 *
 * Ce que ce banc verrouille :
 *
 *   1. la convention — le pourcentage est la seule écriture admise, et le banc
 *      la relit dans la migration qui définit la colonne plutôt que de la
 *      supposer ;
 *   2. la reprise — une fraction qui se présente est convertie, une exonération
 *      à 0 % est respectée, un taux hors bornes est refusé ;
 *   3. la correction en base — la migration ne convertit que les fractions.
 *
 * Le montant encaissé n'a jamais été faux (la TVA est calculée sur le pays de
 * destination). C'est la donnée qui l'était, et un futur calcul « TVA incluse »
 * à partir du produit aurait été faux d'un facteur 100.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_vat_rate.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serverDb } from '../src/lib/serverDb';
import { normalizeCatalogProductInput } from '../src/lib/db/catalogStore';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

const MIGRATION = 'supabase/migrations/20260914000000_vat_rate_normalise.sql';
const SCHEMA = 'supabase/migrations/20260837000000_catalog_management.sql';

/** Passe un taux par le normalisateur, seul point d'écriture du catalogue. */
function normalise(taux: number): number {
  const produit = normalizeCatalogProductInput(serverDb, {
    id: `p-tva-${String(taux).replace('.', '_')}`,
    name: `Produit TVA ${taux}`,
    price: 10,
    vatRate: taux,
  });
  return produit.vatRate;
}

const sql = readFileSync(join(process.cwd(), MIGRATION), 'utf-8');
const schema = readFileSync(join(process.cwd(), SCHEMA), 'utf-8');

console.log('\nBANC B-05 — un seul format de TVA\n');

// ── 1. La convention ────────────────────────────────────────────────────────
ok('la colonne est déclarée en pourcentage', () => {
  // Relu dans la migration qui crée la colonne : la conventions ne se suppose
  // pas, sinon un changement de schéma passerait inaperçu.
  assert.ok(/vat_rate NUMERIC\(5,2\)/.test(schema), 'type de colonne inattendu');
  assert.ok(/DEFAULT 20\.00/.test(schema), 'la valeur par défaut doit être un pourcentage');
  assert.ok(/CHECK \(vat_rate >= 0 AND vat_rate <= 100\)/.test(schema), 'la borne doit être 0..100');
});

// ── 2. La reprise ───────────────────────────────────────────────────────────
ok('une fraction devient un pourcentage', () => {
  assert.equal(normalise(0.2), 20, '0,2 doit être lu comme 20 %');
  assert.equal(normalise(0.055), 5.5, '0,055 doit être lu comme 5,5 %');
});

ok('un pourcentage reste un pourcentage', () => {
  assert.equal(normalise(20), 20);
  assert.equal(normalise(5.5), 5.5);
  assert.equal(normalise(21), 21);
});

ok('une exonération à 0 % n’est pas convertie', () => {
  // 0 est un taux légitime ; le multiplier par 100 le laisserait à 0, mais la
  // règle doit rester explicite : seules les fractions sont reprises.
  assert.equal(normalise(0), 0);
});

ok('un taux hors bornes est refusé', () => {
  assert.throws(() => normalise(120), /TVA invalide/, '120 % doit être rejeté');
  assert.throws(() => normalise(-1), /TVA invalide/, 'un taux négatif doit être rejeté');
});

// ── 3. La correction en base ────────────────────────────────────────────────
ok('la migration ne convertit que les fractions', () => {
  assert.ok(/WHERE vat_rate > 0 AND vat_rate < 1/.test(sql), 'la condition doit exclure 0 %');
  assert.equal(/WHERE vat_rate\s*>\s*0/.test(sql), true, '0 % ne doit pas être converti');
  assert.ok(/SET vat_rate = vat_rate \* 100/.test(sql), 'conversion attendue : × 100');
});

ok('la migration corrige les variantes autant que les produits', () => {
  const cibles: string[] = sql.match(/UPDATE public\.\w+/g) ?? [];
  assert.ok(cibles.includes('UPDATE public.products'), 'les produits ne sont pas corrigés');
  assert.ok(cibles.includes('UPDATE public.product_variants'), 'les variantes ne sont pas corrigées');
});

ok('la migration est idempotente', () => {
  // Après passage, plus aucune ligne ne satisfait la condition : rejouer ne
  // modifie rien. Une conversion inconditionnelle, elle, doublerait les taux.
  assert.equal(/\bSET vat_rate = vat_rate \* 100\b/.test(sql), true);
  assert.equal(/WHERE vat_rate IS NOT NULL\s*;/.test(sql), false, 'conversion inconditionnelle interdite');
});

console.log(`\n${checks} contrôles passés — TVA normalisée au format pourcentage\n`);
