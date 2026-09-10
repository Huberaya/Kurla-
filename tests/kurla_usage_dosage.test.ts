/**
 * BANC — G-03 / D-04 : « le prix affiché n'est pas un coût »
 * ==========================================================
 *
 * Le simulateur de coût est présenté comme la fonctionnalité la plus
 * différenciante de KURLA, et il était mort : 0 produit sur 79 ne déclare son
 * rendement, donc aucune fiche ne pouvait afficher de coût mensuel.
 *
 * Ce chantier rend le coût calculable sans inventer de donnée : la dose
 * appliquée vient des valeurs quotidiennes de référence du SCCS (Notes of
 * Guidance, 12e révision), la contenance est lue sur la fiche.
 *
 * Ce banc verrouille la discipline qui fait que ce n'est pas une invention :
 *
 *   1. chaque dose cite sa source — un chiffre sans origine est un chiffre
 *      inventé ;
 *   2. une catégorie non couverte ne reçoit aucun chiffre, jamais un chiffre
 *      choisi parce qu'il arrange ;
 *   3. deux pièges mesurés sur le catalogue réel restent corrigés : un baume
 *      à lèvres dosé comme une crème visage, et un soin localisé dosé comme
 *      une application sur tout le visage ;
 *   4. une déclaration fournisseur prime sur le modèle.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_usage_dosage.test.ts
 */

import assert from 'node:assert/strict';
import {
  estimerUsage,
  parsePackSize,
  DOSE_PAR_CATEGORIE,
  CATEGORIES_SANS_DOSE,
} from '../src/lib/usageDosage';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

const shampoing = { name: 'Shampoing doux (250 ml)', category: 'cheveux', subcategory: 'Lavage', price: 12.9 };
const sérum = { name: 'Sérum Niacinamide 5% — 30ml', category: 'peau', subcategory: 'Traitement', price: 15.9 };
const masque = { name: 'Masque profond (340 g)', category: 'cheveux', subcategory: 'Soin profond', price: 16.9 };
const nettoyant = { name: 'Gel Nettoyant Doux (150 ml)', category: 'peau', subcategory: 'Nettoyage', price: 12.9 };
const levres = { name: 'Baume Lèvres Céramides — 10ml', category: 'peau', subcategory: 'Hydratation', price: 8.9 };
const local = { name: 'Soin Local Imperfections BHA 2% — 15ml', category: 'peau', subcategory: 'Traitement', price: 12.9 };

console.log('\nBANC G-03 / D-04 — coût réel et dose d’usage\n');

// ── 1. Les doses sont sourcées ──────────────────────────────────────────────
ok('chaque dose cite la référence dont elle vient', () => {
  const entrees = Object.entries(DOSE_PAR_CATEGORIE);
  assert.ok(entrees.length >= 9, `${entrees.length} catégories couvertes`);
  for (const [cle, ref] of entrees) {
    assert.ok(ref.source.length > 20, `${cle} : source absente ou trop vague`);
    assert.ok(ref.dosePerUse > 0, `${cle} : dose nulle ou négative`);
    assert.ok(ref.usesPerWeek > 0, `${cle} : fréquence nulle`);
    assert.ok(ref.note.length > 20, `${cle} : la note doit dire ce que la valeur couvre`);
  }
});

ok('les catégories écartées le sont pour une raison écrite', () => {
  for (const [cle, raison] of Object.entries(CATEGORIES_SANS_DOSE)) {
    assert.ok(raison.length > 40, `${cle} : raison trop courte pour être affichable`);
  }
});

// ── 2. Une catégorie non couverte ne reçoit aucun chiffre ───────────────────
ok('un masque et un nettoyant visage ne sont pas estimés', () => {
  for (const p of [masque, nettoyant]) {
    const e = estimerUsage(p);
    assert.equal(e.costPerUse, null, `${p.name} : un chiffre a été produit`);
    assert.equal(e.monthlyCost, null);
    assert.equal(e.uses, null);
    assert.ok((e.limitation || '').length > 20, `${p.name} : raison manquante`);
  }
});

// ── 3. L’arithmétique ───────────────────────────────────────────────────────
ok('le nombre d’utilisations et le coût par usage sont cohérents', () => {
  const e = estimerUsage(shampoing);
  const dose = DOSE_PAR_CATEGORIE['cheveux/lavage'];
  assert.ok(e.uses !== null && e.costPerUse !== null);
  assert.equal(e.uses, Math.round(250 / dose.dosePerUse));
  assert.equal(e.costPerUse, Math.round((12.9 / (250 / dose.dosePerUse)) * 100) / 100);
  assert.ok(e.costPerUse! > 0 && e.costPerUse! < 12.9, 'le coût d’un usage doit être inférieur au prix');
});

ok('la fréquence change le coût mensuel, pas le coût par utilisation', () => {
  const une = estimerUsage(shampoing, { usesPerWeek: 1 });
  const trois = estimerUsage(shampoing, { usesPerWeek: 3 });
  assert.equal(une.costPerUse, trois.costPerUse, 'la dose ne dépend pas de la fréquence');
  assert.ok((trois.monthlyCost ?? 0) > (une.monthlyCost ?? 0), 'trois lavages coûtent plus qu’un');
  assert.ok((une.monthsOfUse ?? 0) > (trois.monthsOfUse ?? 0), 'et le flacon dure moins longtemps');
});

ok('l’hypothèse est affichable, pas implicite', () => {
  const e = estimerUsage(sérum);
  assert.match(e.assumption, /g par utilisation/);
  assert.match(e.assumption, /utilisations/);
  assert.ok(e.source && e.source.length > 20);
});

// ── 4. Les deux pièges mesurés sur le catalogue ─────────────────────────────
ok('un baume à lèvres n’est pas dosé comme une crème visage', () => {
  // La dose visage (800 mg) donnerait treize utilisations pour un stick de
  // 10 ml : le chiffre serait faux d'un facteur quatorze.
  const e = estimerUsage(levres);
  const face = DOSE_PAR_CATEGORIE['peau/hydratation'];
  assert.ok(e.uses !== null && e.uses > 100, `${e.uses} utilisations : dose visage appliquée ?`);
  assert.equal(e.dosePerUse, 0.057);
  assert.ok(e.dosePerUse! < face.dosePerUse);
});

ok('un soin localisé n’est pas dosé comme une application sur tout le visage', () => {
  const e = estimerUsage(local);
  assert.equal(e.costPerUse, null);
  assert.match(e.limitation || '', /cibl/);
});

// ── 5. Les données manquantes ───────────────────────────────────────────────
ok('sans contenance ni prix, aucune estimation', () => {
  assert.equal(estimerUsage({ name: 'Crème', category: 'peau', subcategory: 'Hydratation', price: 10 }).costPerUse, null);
  assert.equal(estimerUsage({ name: 'Crème 50 ml', category: 'peau', subcategory: 'Hydratation' }).costPerUse, null);
});

ok('la contenance est lue sur le nom quand le champ dédié est vide', () => {
  const viaNom = parsePackSize({ name: 'Gel Nettoyant — 150 ml' });
  const viaChamp = parsePackSize({ sizeLabel: '150ml' });
  assert.equal(viaNom?.value, 150);
  assert.equal(viaChamp?.value, 150);
  assert.equal(parsePackSize({ name: 'Baume' }), null);
});

// ── 6. Une déclaration fournisseur prime sur le modèle ──────────────────────
ok('un rendement déclaré remplace l’estimation', () => {
  const declare = estimerUsage({ ...shampoing, estimatedYield: '6 mois' });
  const estime = estimerUsage(shampoing);
  assert.equal(declare.monthlyCost, Math.round((12.9 / 6) * 100) / 100);
  assert.notEqual(declare.monthlyCost, estime.monthlyCost);
  assert.match(declare.assumption, /Rendement déclaré/);
  assert.equal(declare.uses, null, 'sans dose déclarée, le nombre d’usages n’est pas inventé');
});

console.log(`\n${checks} contrôles passés — coût réel calculable sans donnée inventée\n`);
