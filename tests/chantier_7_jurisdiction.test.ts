/**
 * CHANTIER 7.7 — filtrage réglementaire par juridiction.
 *
 * On appelle le code livré (`assessProductCompliance`, `jurisdictionForCountry`)
 * et le vrai moteur (`buildRecommendations`) : aucune copie de logique. Les
 * défauts couverts sont ceux qui coûtent de la conformité légale ou de la
 * confiance :
 *
 * 1. Un ingrédient interdit recommandé quand même → vente illégale.
 * 2. Une concentration au-dessus de la limite acceptée → même faute, plus grave
 *    parce qu'elle ressemble à de la conformité.
 * 3. Une concentration non déclarée transformée en infraction → accusation
 *    fabriquée ; ou en conformité → garantie fabriquée. Les deux sont refusés.
 * 4. Une absence de donnée présentée comme un feu vert → « conforme » sans base.
 * 5. Une restriction d'une autre juridiction appliquée ici → produit sain bloqué.
 * 6. Un blocage silencieux : si le score bouge, la trace doit dire pourquoi et
 *    citer la base légale.
 */
import { strict as assert } from 'node:assert';

import type { JurisdictionRestriction } from '../src/lib/ingredientGraph';
import {
  JURISDICTION_BY_COUNTRY,
  assessProductCompliance,
  complianceLabel,
  jurisdictionForCountry,
  parseDeclaredIngredient,
} from '../src/lib/jurisdiction';
import { resolveIngredient } from '../src/lib/ingredientGraph';
import { buildRecommendations } from '../src/lib/recommendationEngine';
import { SHIPPING_OPTIONS } from '../src/lib/shippingRules';

/** Jeu réel seedé en base (migration 20260851000000), reproduit ici à l'identique. */
const EU_RESTRICTIONS: JurisdictionRestriction[] = [
  {
    ingredientId: 'salicylic-acid',
    jurisdiction: 'EU',
    status: 'restricted',
    limitPercent: 2.0,
    reference: 'Règlement (CE) n° 1223/2009, annexe III, entrée 98',
  },
  {
    ingredientId: 'retinol',
    jurisdiction: 'EU',
    status: 'restricted',
    limitPercent: 0.3,
    reference: 'Règlement (CE) n° 1223/2009, annexe III, entrée 102',
  },
  {
    ingredientId: 'hydroquinone',
    jurisdiction: 'EU',
    status: 'prohibited',
    reference: 'Règlement (CE) n° 1223/2009, annexe II',
  },
];

/** Restriction d'une autre juridiction : ne doit jamais s'appliquer à l'UE. */
const FOREIGN_RESTRICTIONS: JurisdictionRestriction[] = [
  { ingredientId: 'glycerin', jurisdiction: 'US', status: 'prohibited', reference: 'Fictif, pour le test' },
];

async function runJurisdictionTests(): Promise<void> {
  // -------------------------------------------------------------------
  // 1. Pays desservis → juridiction. Borné exactement aux pays livrés.
  // -------------------------------------------------------------------
  const servedCountries = new Set(SHIPPING_OPTIONS.map(option => option.country));
  assert.deepEqual(
    [...new Set(Object.keys(JURISDICTION_BY_COUNTRY))].sort(),
    [...servedCountries].sort(),
    'La table des juridictions doit couvrir exactement les pays desservis.'
  );
  for (const country of servedCountries) {
    assert.equal(jurisdictionForCountry(country), 'EU', `${country} relève du droit cosmétique européen.`);
  }
  // Tolérance à la casse et aux espaces : « fr » et « FR » sont le même pays.
  assert.equal(jurisdictionForCountry(' fr '), 'EU');
  // Un pays non desservi n'a pas de juridiction évaluée — pas de verdict inventé.
  assert.equal(jurisdictionForCountry('US'), null);
  assert.equal(jurisdictionForCountry('CH'), null);
  assert.equal(jurisdictionForCountry(undefined), null);
  assert.equal(jurisdictionForCountry(''), null);

  // -------------------------------------------------------------------
  // 2. Ingrédient interdit → non commercialisable, avec sa base légale.
  // -------------------------------------------------------------------
  const bleaching = assessProductCompliance({
    ingredients: [{ ingredientId: 'hydroquinone' }, { ingredientId: 'glycerin' }],
    restrictions: EU_RESTRICTIONS,
    jurisdiction: 'EU',
  });
  assert.equal(bleaching.verdict, 'prohibited');
  assert.equal(bleaching.sellable, false, 'Un ingrédient interdit rend le produit invendable.');
  const hydroquinoneFinding = bleaching.findings.find(finding => finding.ingredientId === 'hydroquinone');
  assert.ok(hydroquinoneFinding, 'La constatation doit nommer l’ingrédient en cause.');
  assert.equal(hydroquinoneFinding.status, 'prohibited');
  assert.match(hydroquinoneFinding.reference || '', /1223\/2009/, 'La base légale doit être citée, pas reconstituée.');
  assert.equal(bleaching.findings.length, 1, 'Un ingrédient `allowed` ou sans restriction ne produit pas de constatation.');
  assert.equal(complianceLabel(bleaching.verdict), 'Non commercialisable dans cette juridiction');

  // -------------------------------------------------------------------
  // 3. Limite dépassée → interdit de fait, même si le statut est « restricted ».
  // -------------------------------------------------------------------
  const overLimit = assessProductCompliance({
    ingredients: [{ ingredientId: 'salicylic-acid', declaredConcentrationPercent: 3.5 }],
    restrictions: EU_RESTRICTIONS,
    jurisdiction: 'EU',
  });
  assert.equal(overLimit.verdict, 'prohibited', 'Une concentration déclarée au-dessus de la limite bloque la vente.');
  assert.equal(overLimit.sellable, false);
  assert.equal(overLimit.findings[0].withinLimit, false);
  assert.equal(overLimit.findings[0].limitPercent, 2);

  // -------------------------------------------------------------------
  // 4. Dans la limite → réglementé mais vendable, et le calcul est exact.
  // -------------------------------------------------------------------
  const withinLimit = assessProductCompliance({
    ingredients: [{ ingredientId: 'salicylic-acid', declaredConcentrationPercent: 2 }],
    restrictions: EU_RESTRICTIONS,
    jurisdiction: 'EU',
  });
  assert.equal(withinLimit.verdict, 'restricted');
  assert.equal(withinLimit.sellable, true);
  assert.equal(withinLimit.findings[0].withinLimit, true, 'La limite est inclusive : 2 % pour une limite de 2 %.');
  assert.equal(withinLimit.findings[0].declaredConcentrationPercent, 2);

  // -------------------------------------------------------------------
  // 5. Concentration non déclarée → avertissement, jamais accusation.
  // -------------------------------------------------------------------
  const undeclared = assessProductCompliance({
    ingredients: [{ ingredientId: 'retinol', declaredConcentrationPercent: null }],
    restrictions: EU_RESTRICTIONS,
    jurisdiction: 'EU',
  });
  assert.equal(undeclared.verdict, 'restricted');
  assert.equal(undeclared.sellable, true, 'Une concentration inconnue ne suffit pas à interdire la vente.');
  assert.equal(undeclared.findings[0].withinLimit, null, 'KURLA ne devine pas la conformité.');
  assert.match(undeclared.limitations.join(' '), /concentration/i);
  // L'absence de champ doit se comporter comme `null`.
  const omitted = assessProductCompliance({
    ingredients: [{ ingredientId: 'retinol' }],
    restrictions: EU_RESTRICTIONS,
    jurisdiction: 'EU',
  });
  assert.equal(omitted.findings[0].withinLimit, null);

  // -------------------------------------------------------------------
  // 6. Statut inconnu en base → « non vérifié », jamais « conforme ».
  // -------------------------------------------------------------------
  const unknownStatus = assessProductCompliance({
    ingredients: [{ ingredientId: 'mystery-extract' }],
    restrictions: [{ ingredientId: 'mystery-extract', jurisdiction: 'EU', status: 'unknown' }],
    jurisdiction: 'EU',
  });
  assert.equal(unknownStatus.verdict, 'unverified');
  assert.equal(unknownStatus.sellable, true, 'Un statut inconnu n’interdit pas la vente, il l’étiquette.');
  assert.match(unknownStatus.limitations.join(' '), /inconnu/i);

  // -------------------------------------------------------------------
  // 7. Précedence : le pire statut gagne.
  // -------------------------------------------------------------------
  const mixed = assessProductCompliance({
    ingredients: [
      { ingredientId: 'retinol', declaredConcentrationPercent: 0.1 },
      { ingredientId: 'hydroquinone' },
      { ingredientId: 'mystery-extract' },
    ],
    restrictions: [...EU_RESTRICTIONS, { ingredientId: 'mystery-extract', jurisdiction: 'EU', status: 'unknown' }],
    jurisdiction: 'EU',
  });
  assert.equal(mixed.verdict, 'prohibited');
  assert.equal(mixed.sellable, false);
  assert.equal(mixed.findings[0].ingredientId, 'hydroquinone', 'Les constatations sont triées du plus grave au plus bénin.');

  // -------------------------------------------------------------------
  // 8. Absence de donnée ≠ conformité.
  // -------------------------------------------------------------------
  const uncovered = assessProductCompliance({
    ingredients: [{ ingredientId: 'some-unknown-peptide' }],
    restrictions: EU_RESTRICTIONS,
    jurisdiction: 'EU',
  });
  assert.equal(uncovered.verdict, 'no_data');
  assert.equal(uncovered.sellable, true, 'On ne bloque pas ce qu’on ne connaît pas — mais on ne dit pas « conforme ».');
  assert.ok(uncovered.limitations.length > 0, 'Le manque de donnée doit être déclaré explicitement.');
  assert.match(uncovered.limitations.join(' '), /ne vaut pas conformité/);
  assert.equal(uncovered.findings.length, 0);

  const emptyFormula = assessProductCompliance({
    ingredients: [],
    restrictions: EU_RESTRICTIONS,
    jurisdiction: 'EU',
  });
  assert.equal(emptyFormula.verdict, 'no_data');

  // -------------------------------------------------------------------
  // 9. Une restriction d'une autre juridiction ne s'applique pas ici.
  // -------------------------------------------------------------------
  const glycerinInEU = assessProductCompliance({
    ingredients: [{ ingredientId: 'glycerin' }],
    restrictions: [...EU_RESTRICTIONS, ...FOREIGN_RESTRICTIONS],
    jurisdiction: 'EU',
  });
  assert.equal(glycerinInEU.sellable, true, 'Une interdiction étrangère ne doit pas bloquer une vente en UE.');
  assert.equal(glycerinInEU.findings.length, 0);

  // La même formule évaluée dans la juridiction qui l'interdit l'est bien.
  const glycerinInUS = assessProductCompliance({
    ingredients: [{ ingredientId: 'glycerin' }],
    restrictions: [...EU_RESTRICTIONS, ...FOREIGN_RESTRICTIONS],
    jurisdiction: 'US',
  });
  assert.equal(glycerinInUS.verdict, 'prohibited');

  // Sans juridiction exploitable, on refuse d'évaluer plutôt que de conclure.
  assert.throws(
    () => assessProductCompliance({ ingredients: [], restrictions: EU_RESTRICTIONS, jurisdiction: '  ' }),
    /Juridiction requise/
  );

  // -------------------------------------------------------------------
  // 10. Le moteur exclut un produit interdit — et dit pourquoi.
  // -------------------------------------------------------------------
  const catalog = [
    product('p-bleach', 'Sérum éclaircissant', ['hydroquinone', 'glycerin']),
    product('p-acid', 'Exfoliant doux', ['salicylic-acid', 'glycerin']),
    product('p-plain', 'Baume neutre', ['shea-butter', 'glycerin']),
  ];
  const context = {
    shelf: [],
    observations: [],
    jurisdiction: 'EU',
    jurisdictionRestrictions: EU_RESTRICTIONS,
  };
  const engine = buildRecommendations(catalog, context);
  const byId = new Map(engine.recommendations.map(entry => [entry.product.id, entry]));

  const excluded = byId.get('p-bleach');
  assert.ok(excluded, 'Le moteur doit renvoyer une trace pour chaque produit du catalogue.');
  assert.equal(excluded.excluded, true, 'Un produit contenant un ingrédient interdit n’est pas recommandable.');
  assert.equal(excluded.rank, null, 'Un produit exclu n’a pas de rang.');
  assert.match(excluded.exclusionReason || '', /hydroquinone/, 'La raison d’exclusion doit nommer l’ingrédient.');
  const jurisdictionAdjustment = excluded.adjustments.filter(adjustment => adjustment.kind === 'jurisdiction');
  assert.equal(jurisdictionAdjustment.length, 1, 'Un seul ajustement réglementaire par produit.');
  assert.equal(jurisdictionAdjustment[0].delta, -100);
  assert.match(jurisdictionAdjustment[0].reason, /1223\/2009/, 'L’ajustement cite la base légale.');

  // Un ingrédient réglementé sans dépassement constaté ne bloque pas : il pénalise.
  const restricted = byId.get('p-acid');
  assert.equal(restricted?.excluded, false, 'Un ingrédient réglementé n’est pas un ingrédient interdit.');
  const restrictedAdjustment = restricted?.adjustments.filter(adjustment => adjustment.kind === 'jurisdiction') || [];
  assert.equal(restrictedAdjustment.length, 1);
  assert.ok(restrictedAdjustment[0].delta < 0, 'Un ingrédient réglementé doit peser dans le score.');
  assert.ok(restrictedAdjustment[0].delta > -100, '…sans pour autant l’exclure.');

  // Aucune donnée réglementaire pour la formule → aucun ajustement inventé.
  const plain = byId.get('p-plain');
  assert.equal(plain?.adjustments.some(adjustment => adjustment.kind === 'jurisdiction'), false,
    'Sans donnée, le moteur ne pénalise pas : il ne sait pas.');

  // -------------------------------------------------------------------
  // 11. Sans juridiction dans le contexte, le moteur se comporte comme avant.
  // -------------------------------------------------------------------
  const legacy = buildRecommendations(catalog, { shelf: [], observations: [] });
  assert.equal(
    legacy.recommendations.some(entry => entry.adjustments.some(adjustment => adjustment.kind === 'jurisdiction')),
    false,
    'Sans juridiction déclarée, aucun filtrage réglementaire ne doit apparaître.'
  );
  assert.equal(
    legacy.recommendations.find(entry => entry.product.id === 'p-bleach')?.excluded,
    false,
    'Sans juridiction, le moteur ne prétend pas connaître le droit applicable.'
  );

  // Une restriction étrangère ne doit pas filtrer le catalogue UE.
  const foreign = buildRecommendations(catalog, {
    shelf: [],
    observations: [],
    jurisdiction: 'EU',
    jurisdictionRestrictions: FOREIGN_RESTRICTIONS,
  });
  assert.equal(
    foreign.recommendations.filter(entry => entry.excluded).length,
    0,
    'Aucun produit du catalogue ne doit être exclu par une restriction d’une autre juridiction.'
  );

  // -------------------------------------------------------------------
  // 12. Le catalogue réel écrit la concentration dans le libellé.
  // -------------------------------------------------------------------
  assert.deepEqual(parseDeclaredIngredient('Acide Salicylique 1.5%'), {
    name: 'Acide Salicylique',
    concentrationPercent: 1.5,
  });
  assert.deepEqual(parseDeclaredIngredient('Niacinamide 4 %'), { name: 'Niacinamide', concentrationPercent: 4 });
  assert.deepEqual(parseDeclaredIngredient('Vitamine C 10,5 %'), { name: 'Vitamine C', concentrationPercent: 10.5 });
  assert.deepEqual(parseDeclaredIngredient('Glycérine Végétale'), {
    name: 'Glycérine Végétale',
    concentrationPercent: null,
  }, 'Sans pourcentage, aucune concentration n’est inventée.');
  assert.deepEqual(parseDeclaredIngredient(undefined), { name: '', concentrationPercent: null });

  // Cas réel relevé en base le 2026-08-28 : produit p13, « Acide Salicylique 1.5% »,
  // limite européenne 2 %. La résolution passe par l'alias français ajouté par la
  // migration 20260861000000, puis le pourcentage est confronté à la limite.
  const realCatalog = [
    { id: 'salicylic-acid', inciName: 'Salicylic Acid', inciNameNormalized: 'salicylic acid', commonNames: ['BHA', 'acide salicylique'] },
  ];
  const declared = parseDeclaredIngredient('Acide Salicylique 1.5%');
  const resolvedReal = resolveIngredient(declared.name, realCatalog as any);
  assert.equal(resolvedReal?.id, 'salicylic-acid', 'L’alias français doit résoudre vers l’entité du graphe.');

  const realCase = assessProductCompliance({
    ingredients: [{
      ingredientId: resolvedReal!.id,
      declaredConcentrationPercent: declared.concentrationPercent,
      concentrationSource: 'declared_name',
      declaredLabel: 'Acide Salicylique 1.5%',
    }],
    restrictions: EU_RESTRICTIONS,
    jurisdiction: 'EU',
  });
  assert.equal(realCase.verdict, 'restricted');
  assert.equal(realCase.sellable, true);
  assert.equal(realCase.findings[0].withinLimit, true, '1,5 % pour une limite de 2 % : dans la limite.');
  assert.equal(realCase.findings[0].concentrationSource, 'declared_name');
  const provenance = realCase.limitations.join(' ');
  assert.match(provenance, /Acide Salicylique 1.5%/, 'La provenance du chiffre doit être citée.');
  assert.match(provenance, /pas dans une liaison structurée/, 'Un pourcentage lu dans le libellé n’est pas une analyse.');

  // Une liaison structurée prime : même ingrédient, source différente.
  const linkedCase = assessProductCompliance({
    ingredients: [{ ingredientId: 'salicylic-acid', declaredConcentrationPercent: 1.5, concentrationSource: 'linked' }],
    restrictions: EU_RESTRICTIONS,
    jurisdiction: 'EU',
  });
  assert.equal(linkedCase.findings[0].concentrationSource, 'linked');
  assert.equal(linkedCase.limitations.some(text => /libellé déclaré/.test(text)), false);

  console.log(
    `[PASS] Chantier 7.7 : ${Object.keys(JURISDICTION_BY_COUNTRY).length} pays desservis rattachés au droit cosmétique ` +
    `européen, interdit/limite dépassée → non commercialisable, concentration non déclarée → avertissement ` +
    `sans blocage, absence de donnée ≠ conformité, restriction étrangère inapplicable, moteur et raison ` +
    `d’exclusion vérifiés (base légale citée).`
  );
}

function product(id: string, name: string, ingredientIds: string[]) {
  return {
    id,
    slug: id,
    name,
    brand: 'KURLA',
    price: 18.9,
    category: 'soin',
    needs: ['hydration'],
    concerns: ['secheresse'],
    routineStep: 'leave_in',
    ingredientIds,
    inStock: true,
  };
}

try {
  await runJurisdictionTests();
} catch (error) {
  console.error('[FAIL] Chantier 7.7 — filtrage réglementaire par juridiction :', error);
  process.exitCode = 1;
}
