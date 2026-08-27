/**
 * CHANTIER 7.4 — graphe de connaissances seedé, vérifié contre la base réelle.
 *
 * Le seed (migration 20260851000000) n'a de sens que s'il est réellement en base
 * et servi par la fiche publique. Ce banc lit la base via le même chemin que le
 * sitemap/prérendu (`fetchIngredientPages`) et exige le jeu seedé. Sans
 * credentials, il se déclare SKIP plutôt que de mentir en passant.
 */
import { strict as assert } from 'node:assert';
import { fetchIngredientPages } from '../scripts/seoEntities';

async function main(): Promise<void> {
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)) {
    console.log('[SKIP] Chantier 7.4 : pas de credentials Supabase dans cet environnement.');
    return;
  }

  const pages = await fetchIngredientPages();

  assert.ok(pages.length >= 12, `Attendu au moins 12 ingrédients seedés, obtenu ${pages.length}.`);

  const paths = pages.map(page => page.path);
  for (const expected of ['/ingredient/glycerin', '/ingredient/shea-butter', '/ingredient/salicylic-acid']) {
    assert.ok(paths.includes(expected), `Le graphe doit exposer ${expected}.`);
  }

  // Chaque page d'entité doit porter un titre et une description non vides,
  // sinon le sitemap/prérendu produirait des coquilles vides.
  for (const page of pages) {
    assert.ok(page.title.trim().length > 0, `${page.path} : titre vide.`);
    assert.ok(page.description.trim().length > 0, `${page.path} : description vide.`);
  }

  console.log(`[PASS] Chantier 7.4 : ${pages.length} fiches ingrédient vérifiées servies depuis la base réelle, titres et descriptions non vides.`);
}

main().catch(error => {
  console.error('[FAIL] Chantier 7.4 — graphe seedé :', error);
  process.exitCode = 1;
});
