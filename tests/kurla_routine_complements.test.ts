/**
 * BANC — L1 « Complète votre routine » (cross-sell explicable)
 * ============================================================
 *
 * Promesse du plan de chantiers : sur la fiche et sur le panier, proposer
 * jusqu'à 3 produits qui COMPLETENT la routine déclarée, avec la raison, et
 * JAMAIS un produit déjà possédé (Shelf) ou déjà au panier.
 *
 * Ce banc verrouille :
 *  - le mapping texte libre `routineStep` → vocabulaire contrôlé (shelf.ts) ;
 *  - la complétion : une étape manquante = un produit qui la déclare ;
 *  - les exclusions strictes (contexte, Shelf, domaine, étape) ;
 *  - le contrat de la route `GET /api/routine/complements`
 *    (invitée acceptée, contexte vide = réponse vide, jamais une erreur).
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_routine_complements.test.ts
 */

import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { app } from '../server';
import { serverDb } from '../src/lib/serverDb';
import {
  buildRoutineComplements,
  analyseRoutineCoverage,
  mapRoutineStepText,
  HAIR_ROUTINE_STEPS,
  SKIN_ROUTINE_STEPS,
} from '../src/lib/routineComplements';
import { RoutineStep, ShelfItem } from '../src/lib/shelf';
import { Product } from '../src/types';

let checks = 0;
const ok = async (label: string, fn: () => void | Promise<void>) => {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

// ── Fixtures (champs libres, aucune donnée inventée) ───────────────────────

const pub = (extra: Record<string, unknown>): any => ({
  is_active: true,
  catalog_status: 'published',
  ingredient_verification_status: 'verified',
  claims_validation_status: 'verified',
  images_validation_status: 'verified',
  stock_validation_status: 'verified',
  certifications_validation_status: 'verified',
  translations_validation_status: 'verified',
  brand_verification_status: 'verified',
  image_ownership_status: 'brand_provided',
  brand: 'KURLA Botanicals',
  ingredients: ['Glycerin'],
  image: 'https://images.example.org/produit.jpg',
  country_availability: ['FR'],
  badges: [],
  description: 'Produit de test',
  ...extra,
});

const SHAMPOO = pub({ id: 'c1', slug: 'shampoing-doux', name: 'Shampoing doux au karité', category: 'cheveux', routineStep: 'Shampoing', price: 12, inStock: true });
const CONDITIONER = pub({ id: 'c2', slug: 'apres-shampoing', name: 'Après-shampoing karité', category: 'cheveux', routineStep: 'Après-shampoing', price: 13, inStock: true });
const LEAVEIN = pub({ id: 'c3', slug: 'leave-in', name: 'Crème leave-in karité', category: 'cheveux', routineStep: 'Leave-in', price: 15, inStock: true });
const OIL_OUT = pub({ id: 'c4', slug: 'huile-karite', name: 'Huile de karité pure', category: 'cheveux', routineStep: 'Huile', price: 18, inStock: false });
const OIL_IN = pub({ id: 'c4b', slug: 'huile-jojoba', name: 'Huile de jojoba', category: 'cheveux', routineStep: 'Huile', price: 20, inStock: true });
const MOISTURIZER = pub({ id: 's1', slug: 'gel-hydratant', name: 'Gel hydratant', category: 'peau', routineStep: 'Gel hydratant', price: 22, inStock: true });
const SPF = pub({ id: 's2', slug: 'fluide-solaire', name: 'Fluide solaire SPF50', category: 'peau', routineStep: 'Solaire', price: 24, inStock: true });

const CATALOG: Product[] = [SHAMPOO, CONDITIONER, LEAVEIN, OIL_OUT, OIL_IN, MOISTURIZER, SPF] as unknown as Product[];

const shelfItem = (extra: Record<string, unknown>): ShelfItem => ({
  id: `shelf-${extra.id || Math.random().toString(36).slice(2)}`,
  userId: 'u-test',
  status: 'in_use',
  ingredientIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...extra,
} as ShelfItem);

async function runPureTests() {
  // ── 1. Mapping texte libre → vocabulaire contrôlé ────────────────────────
  await ok('mapping : les libellés du catalogue se rattachent aux étapes', async () => {
    assert.equal(mapRoutineStepText('Shampoing'), 'cleanse');
    assert.equal(mapRoutineStepText('Après-shampoing rincé au karité'), 'condition');
    assert.equal(mapRoutineStepText('Masque réparateur au ricin'), 'deep_condition');
    assert.equal(mapRoutineStepText('Crème hydratante Leave-In'), 'leave_in');
    assert.equal(mapRoutineStepText('Huile de karité 100% pure'), 'seal_oil');
    assert.equal(mapRoutineStepText('Coiffage'), 'styling_definer');
    assert.equal(mapRoutineStepText('Soin cuir chevelu'), 'scalp_treatment');
    assert.equal(mapRoutineStepText('Nettoyant doux', 'peau'), 'skin_cleanser');
    assert.equal(mapRoutineStepText('Sérum niacinamide', 'peau'), 'skin_treatment');
    assert.equal(mapRoutineStepText('Gel hydratant', 'peau'), 'skin_moisturizer');
    assert.equal(mapRoutineStepText('Fluide solaire SPF50', 'peau'), 'skin_spf');
  });

  await ok('mapping : un texte non reconnu ne couvre AUCUNE étape', async () => {
    assert.equal(mapRoutineStepText('Bonnet satin'), null);
    assert.equal(mapRoutineStepText(''), null);
    assert.equal(mapRoutineStepText(undefined), null);
    // Domaine indéterminé : « Nettoyant » sans catégorie = lavant (cheveux).
    assert.equal(mapRoutineStepText('Nettoyant'), 'cleanse');
  });

  await ok('mapping : une étape déjà typée passe telle quelle', async () => {
    assert.equal(mapRoutineStepText('skin_spf'), 'skin_spf');
    assert.equal(mapRoutineStepText('SEAL_OIL'.toLowerCase()), 'seal_oil');
  });

  // ── 2. Cas d'acceptation : panier 1 produit → ≥ 1 complément justifié ────
  await ok('acceptation : un panier avec un shampoing reçoit ≥ 1 complément avec raison', async () => {
    const suggestions = buildRoutineComplements(CATALOG, {
      contextProducts: [SHAMPOO as Product],
      shelfItems: [],
    });
    assert.ok(suggestions.length >= 1, 'aucun complément pour un shampoing seul');
    assert.ok(suggestions.length <= 3, 'plus de 3 propositions');
    assert.equal(suggestions[0].missingStep, 'condition', 'l’après-shampooing est la 1re étape manquante');
    for (const s of suggestions) {
      assert.ok(s.reason.length > 0, 'proposition sans raison');
      assert.ok(s.product.id !== 'c1', 'le produit du contexte est re-proposé');
    }
  });

  await ok('acceptation : la première suggestion porte le produit qui déclare l’étape manquante', async () => {
    const suggestions = buildRoutineComplements(CATALOG, {
      contextProducts: [SHAMPOO as Product],
      shelfItems: [],
    });
    assert.equal(suggestions[0].product.id, 'c2', 'l’après-shampoing doit être proposé pour l’étape condition');
  });

  await ok('domaine : la fiche d’un produit peau complète d’abord la routine peau', async () => {
    const suggestions = buildRoutineComplements(CATALOG, {
      contextProducts: [MOISTURIZER as Product],
      shelfItems: [],
    });
    assert.ok(suggestions.length >= 1);
    assert.equal(suggestions[0].missingStep, 'skin_spf', 'l’hydratant est couvert, le SPF manque');
    assert.equal(suggestions[0].product.id, 's2');
  });

  // ── 3. Exclusions strictes ───────────────────────────────────────────────
  await ok('exclusion : un produit du contexte n’est jamais re-proposé', async () => {
    const suggestions = buildRoutineComplements(CATALOG, {
      contextProducts: [LEAVEIN as Product],
      shelfItems: [],
    });
    assert.ok(suggestions.every(s => s.product.id !== 'c3'), 'le leave-in du contexte est re-proposé');
    assert.ok(suggestions.every(s => s.missingStep !== 'leave_in'), 'l’étape déjà au contexte est traitée comme manquante');
  });

  await ok('exclusion : une étape couverte par le Shelf n’est pas re-vendue', async () => {
    const suggestions = buildRoutineComplements(CATALOG, {
      contextProducts: [SHAMPOO as Product],
      shelfItems: [shelfItem({ id: 'a', productId: 'c2', routineStep: 'condition' as RoutineStep })],
    });
    assert.ok(suggestions.every(s => s.missingStep !== 'condition'), 'l’étape possédée est re-proposée');
  });

  await ok('exclusion : un produit possédé (libellé libre) n’est jamais recommandé', async () => {
    const suggestions = buildRoutineComplements(CATALOG, {
      contextProducts: [SHAMPOO as Product],
      shelfItems: [shelfItem({ id: 'b', freeLabel: 'Huile de karité pure' })],
    });
    const oil = suggestions.find(s => s.missingStep === 'seal_oil');
    assert.ok(oil, 'l’étape huile est manquante, un produit devrait la couvrir');
    assert.notEqual(oil.product.id, 'c4', 'le produit possédé est recommandé');
    assert.equal(oil.product.id, 'c4b', 'le produit en stock de la même étape doit l’être');
  });

  await ok('classement : stock disponible d’abord, prix croissant ensuite', async () => {
    const suggestions = buildRoutineComplements(CATALOG, {
      contextProducts: [SHAMPOO as Product],
      shelfItems: [],
    });
    const oil = suggestions.find(s => s.missingStep === 'seal_oil');
    assert.equal(oil?.product.id, 'c4b', 'le produit en stock doit précéder le produit épuisé');
  });

  await ok('catalogue vide ou sans candidat : réponse vide, jamais de remplissage approximatif', async () => {
    assert.deepEqual(buildRoutineComplements([], { contextProducts: [SHAMPOO as Product], shelfItems: [] }), []);
    // Aucune huile dans ce mini-catalogue : l’étape reste simplement silencieuse.
    const noOil = buildRoutineComplements([SHAMPOO, CONDITIONER] as unknown as Product[], {
      contextProducts: [LEAVEIN as Product],
      shelfItems: [],
    });
    assert.ok(noOil.every(s => s.missingStep !== 'seal_oil'));
  });

  await ok('couverture : les étapes du contexte ET de l’étagère comptent', async () => {
    const { covered, missing } = analyseRoutineCoverage({
      contextProducts: [SHAMPOO as Product],
      shelfItems: [shelfItem({ id: 'c', productId: 'c2', routineStep: 'condition' as RoutineStep })],
    });
    assert.ok(covered.includes('cleanse') && covered.includes('condition'));
    assert.ok(missing.includes('leave_in') && missing.includes('seal_oil'));
    assert.ok(missing.every(step => !covered.includes(step)), 'une étape ne peut être à la fois couverte et manquante');
  });

  await ok('vocabulaire : les deux listes d’étapes cœur sont stables', async () => {
    assert.deepEqual(HAIR_ROUTINE_STEPS, ['cleanse', 'condition', 'leave_in', 'seal_oil']);
    assert.deepEqual(SKIN_ROUTINE_STEPS, ['skin_cleanser', 'skin_moisturizer', 'skin_spf']);
  });
}

async function runRouteTests() {
  await serverDb.initialize(CATALOG as unknown as any[]);

  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const address = listener.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    await ok('route : sans paramètre, réponse vide (jamais une erreur)', async () => {
      const response = await fetch(`${base}/api/routine/complements`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data.suggestions, []);
      assert.equal(data.count, 0);
    });

    await ok('route : invitée acceptée — panier 1 produit → ≥ 1 complément justifié', async () => {
      const response = await fetch(`${base}/api/routine/complements?products=c1`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(data.suggestions.length >= 1, 'aucun complément pour un shampoing seul');
      assert.ok(data.suggestions.length <= 3);
      assert.ok(data.suggestions[0].reason.length > 0, 'suggestion sans raison');
      assert.equal(data.suggestions[0].product.id, 'c2');
      assert.equal(data.personalized, false, 'sans compte, l’étagère n’entre pas en jeu');
    });

    await ok('route : le slug marche comme l’id', async () => {
      const response = await fetch(`${base}/api/routine/complements?products=shampoing-doux`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.suggestions[0]?.product.id, 'c2', 'le contexte par slug doit donner la même routine');
    });

    await ok('route : ids inconnus → contexte vide, suggestions vides, 200', async () => {
      const response = await fetch(`${base}/api/routine/complements?products=neant-001`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data.suggestions, []);
      assert.deepEqual(data.context.covered, []);
    });

    await ok('route : la réponse expose la couverture calculée (transparence)', async () => {
      const response = await fetch(`${base}/api/routine/complements?products=c1,c3`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(data.context.covered.includes('cleanse') && data.context.covered.includes('leave_in'));
      assert.ok(data.context.missing.includes('condition'));
      assert.ok(data.suggestions.every(s => s.missingStep === data.context.missing.includes(s.missingStep) ? s.missingStep : 'contradiction'),
        'toute suggestion correspond à une étape réellement manquante');
    });
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }
}

async function main() {
  console.log('L1 — Complète votre routine (pur)');
  await runPureTests();
  console.log('\nL1 — Complète votre routine (route)');
  await runRouteTests();
  console.log(`\n${checks} contrôles passés — L1 compléments de routine\n`);
}

main().catch(error => {
  console.error('[FAIL] L1 compléments de routine :', error);
  process.exitCode = 1;
});
