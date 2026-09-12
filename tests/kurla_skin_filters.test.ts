/**
 * BANC — FILTRES PEAU P3 : « la boutique répond, et explique pourquoi »
 * =====================================================================
 *
 * Chantier P3 du plan de chantiers. C2 a posé les 5 filtres peau (actif,
 * phototype, texture, fini, sensibilité) + le score ; ce banc fige la
 * promesse d'acceptation : « niacinamide sans parfum, fini mat, ≤ 28 € »
 * renvoie des résultats, et le phototype V–VI déclassee un SPF minéral
 * au whitecast élevé. Surtout : chaque position est expliquée par des
 * raisons lues (jamais un score inventé).
 *
 * Banc pur (aucun serveur, aucune base) : il couvre le moteur
 * scoreSkinProduct / rankSkinProducts et la taxonomie figée.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_skin_filters.test.ts
 */

import assert from 'node:assert/strict';
import {
  SKIN_NEEDS,
  SKIN_ACTIVE_FILTERS,
  SKIN_PHOTOTYPE_FILTERS,
  SKIN_TEXTURE_FILTERS,
  SKIN_FINISH_FILTERS,
  SKIN_SENSITIVITY_FILTERS,
} from '../src/lib/skinTaxonomy';
import {
  scoreSkinProduct,
  rankSkinProducts,
  SKIN_BUDGET_CAPS,
} from '../src/lib/skinRecommendation';

let checks = 0;
const ok = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

// ── Fixtures : fiches peau réalistes (aucune donnée inventée, champs libres) ──

const SERUM_NIACINAMIDE = {
  id: 'serum-niacinamide',
  slug: 'serum-niacinamide-10',
  name: 'Sérum Niacinamide 10% — fini mat',
  description: 'Sérum léger qui unifie le teint et mattifie, sans film gras.',
  category: 'peau',
  price: 24.9,
  rating: 0,
  inStock: true,
  keyIngredients: ['Niacinamide 10%', 'Acide hyaluronique'],
  skinFinishCode: 'mat',
  skinTextureCode: 'lotion',
  supportedPhototypes: ['I', 'II', 'III', 'IV', 'V', 'VI'],
  containsFragrance: false,
} as any;

const CREME_PARFUMEE = {
  id: 'creme-parfumee',
  slug: 'creme-hydratante-parfumee',
  name: 'Crème hydratante parfumée',
  description: 'Hydratation 24h, parfum floral doux.',
  category: 'peau',
  price: 22,
  rating: 0,
  inStock: true,
  keyIngredients: ['Glycérine', 'Parfum'],
  skinFinishCode: 'naturel',
  skinTextureCode: 'creme',
  supportedPhototypes: ['I', 'II', 'III', 'IV'],
  containsFragrance: true,
} as any;

const SPF_MINERAL = {
  id: 'spf-mineral',
  slug: 'spf-50-mineral',
  name: 'SPF 50 minéral',
  description: 'Protection solaire minérale, dioxyde de titane et oxyde de zinc.',
  category: 'peau',
  price: 19.9,
  rating: 0,
  inStock: true,
  keyIngredients: ['Dioxyde de titane', 'Oxyde de zinc'],
  skinFinishCode: 'naturel',
  supportedPhototypes: ['III', 'IV', 'V', 'VI'],
  containsFragrance: false,
} as any;

const SPF_HYBRIDE = {
  id: 'spf-hybride',
  slug: 'spf-50-hybride-invisible',
  name: 'SPF 50+ hybride invisible',
  description: 'Protection solaire hybride, fini invisible sans trace blanche.',
  category: 'peau',
  price: 27.5,
  rating: 0,
  inStock: true,
  keyIngredients: ['Filtres organiques', 'Niacinamide 2%'],
  skinFinishCode: 'mat',
  supportedPhototypes: ['I', 'II', 'III', 'IV', 'V', 'VI'],
  containsFragrance: false,
} as any;

const GOMMAGE_RETINOL_AHA = {
  id: 'gommage-retinol-aha',
  slug: 'gommage-retinol-glycolic',
  name: 'Gommage Rétinol + Acide glycolique',
  description: 'Exfoliation puissante rétinol et AHA en une seule formule.',
  category: 'peau',
  price: 35,
  rating: 0,
  inStock: true,
  keyIngredients: ['Rétinol 0.3%', 'Acide glycolique 8%'],
  skinFinishCode: 'naturel',
  containsFragrance: false,
} as any;

// ── 1. Taxonomie figée : cohérente entre filtres UI et moteur ───────────────

ok('taxonomie : 15 besoins, 9 actifs, 6 phototypes, 5 textures, 3 finis', () => {
  assert.equal(SKIN_NEEDS.length, 15, '15 besoins peau attendus');
  assert.equal(SKIN_ACTIVE_FILTERS.length, 9, '9 actifs filtables attendus');
  assert.deepEqual(
    SKIN_PHOTOTYPE_FILTERS.map(p => p.value),
    ['I', 'II', 'III', 'IV', 'V', 'VI'],
    'phototypes I→VI'
  );
  assert.deepEqual(
    SKIN_TEXTURE_FILTERS.map(t => t.value),
    ['gel', 'lotion', 'creme', 'baume', 'huile'],
    'textures contrôlées'
  );
  assert.deepEqual(
    SKIN_FINISH_FILTERS.map(f => f.value),
    ['mat', 'naturel', 'glowy'],
    'finis contrôlés'
  );
  assert.ok(SKIN_SENSITIVITY_FILTERS.length >= 2, 'au moins sensible / très sensible');
});

ok('taxonomie : chaque actif filtrable est reconnu par le moteur de score', () => {
  for (const actif of SKIN_ACTIVE_FILTERS) {
    const contient = {
      id: `test-${actif.value}`,
      name: `Produit ${actif.label}`,
      description: '',
      category: 'peau',
      price: 20,
      rating: 0,
      inStock: true,
      keyIngredients: [actif.inci],
    } as any;
    // P3 REGRESSION — un produit SANS l'actif ne doit plus hériter du boost :
    // avant le fix, l'actif demandé était injecté dans le haystack du produit
    // et « Contient X recherché » s'appliquait à tout le catalogue.
    const neContientPas = {
      id: `test-${actif.value}-négatif`,
      name: 'Glycérine pure hydratante',
      description: '',
      category: 'peau',
      price: 20,
      rating: 0,
      inStock: true,
      keyIngredients: ['Glycérine'],
    } as any;
    const avec = scoreSkinProduct(contient, { activeFilters: { actif: actif.value } });
    const sans = scoreSkinProduct(contient, {});
    assert.ok(
      avec.score > sans.score,
      `${actif.value} : le boost actif ne s'applique pas (avec=${avec.score}, sans=${sans.score})`
    );
    assert.ok(
      avec.reasons.some(r => r.toLowerCase().includes(actif.value.replace(/_/g, ' ')) || r.toLowerCase().includes(actif.label.toLowerCase())),
      `${actif.value} : aucune raison lisible ne justifie le boost`
    );
    const neg = scoreSkinProduct(neContientPas, { activeFilters: { actif: actif.value } });
    assert.ok(
      neg.score < scoreSkinProduct(neContientPas, {}).score,
      `${actif.value} : un produit sans l'actif n'est pas pénalisé (bug haystack)`
    );
    assert.ok(
      neg.reasons.some(r => /sans/i.test(r)),
      `${actif.value} : la raison « sans l'actif » est absente`
    );
  }
});

// ── 2. Cas d'acceptation : niacinamide, sans parfum, fini mat, ≤ 28 € ───────

const CTX_FATOU = {
  activeFilters: {
    actif: 'niacinamide' as string,
    finish: 'mat' as string,
    sansParfum: true,
    budgetMax: 28,
  },
  hyperpigmentationBoost: true,
};

ok('acceptation : « niacinamide sans parfum, fini mat, ≤ 28 € » classe le sérum 1er', () => {
  const ranked = rankSkinProducts([CREME_PARFUMEE, SERUM_NIACINAMIDE], CTX_FATOU);
  assert.equal(ranked[0].id, SERUM_NIACINAMIDE.id, 'le sérum niacinamide doit être 1er');
  assert.ok(ranked[0]._skinScore > ranked[1]._skinScore, 'score strictement supérieur');
});

ok('acceptation : le 1er a des raisons lues (niacinamide, fini mat, budget)', () => {
  const { score, reasons } = scoreSkinProduct(SERUM_NIACINAMIDE, CTX_FATOU);
  assert.ok(score >= 80, `score attendu élevé (actif + HPI + fini + budget), obtenu ${score}`);
  assert.ok(reasons.some(r => /niacinamide/i.test(r)), 'raison niacinamide absente');
  assert.ok(reasons.some(r => /fini mat/i.test(r)), 'raison fini mat absente');
  assert.ok(reasons.some(r => /budget/i.test(r)), 'raison budget absente');
});

ok('acceptation : la crème parfumée est expliquée comme déclassée', () => {
  const { score, reasons } = scoreSkinProduct(CREME_PARFUMEE, CTX_FATOU);
  assert.ok(score < 50, `crème parfumée doit passer sous le score neutre, obtenu ${score}`);
  assert.ok(reasons.some(r => /sans niacinamide/i.test(r)), 'raison « sans niacinamide » absente');
  assert.ok(reasons.some(r => /parfum/i.test(r)), 'raison parfum absente');
});

// ── 3. Phototype V–VI : whitecast minéral déclassé (critère d'acceptation) ──

const CTX_VI = {
  activeFilters: { phototype: 'VI' as string, spfInvisible: true },
};

ok('phototype VI : SPF minéral whitecast élevé déclassé sous le neutre', () => {
  const { score, reasons } = scoreSkinProduct(SPF_MINERAL, CTX_VI);
  assert.ok(score < 50, `SPF minéral doit être < 50 (whitecast critique), obtenu ${score}`);
  assert.ok(reasons.some(r => /trace blanche|déclassé/i.test(r)), 'raison whitecast absente');
});

ok('phototype VI : SPF hybride invisible devant le minéral, avec raisons', () => {
  const ranked = rankSkinProducts([SPF_MINERAL, SPF_HYBRIDE], CTX_VI);
  assert.equal(ranked[0].id, SPF_HYBRIDE.id, 'le SPF invisible doit être 1er');
  assert.ok(ranked[0]._skinReasons.some(r => /invisible/i.test(r)), 'raison « SPF invisible » absente');
  assert.ok(ranked[1]._skinReasons.some(r => /trace blanche/i.test(r)), 'raison trace blanche absente du minéral');
});

// ── 4. Incompatibilité intra-produit : rétinol + AHA dans la même formule ──

ok('formule rétinol+AHA : incompatibilité bloquante détectée et expliquée', () => {
  const { score, reasons, incompatibilities } = scoreSkinProduct(GOMMAGE_RETINOL_AHA, {});
  assert.ok(incompatibilities.length >= 1, 'aucune incompatibilité détectée sur rétinol+aha');
  assert.equal(incompatibilities[0].severity, 'bloquant');
  assert.ok(reasons.some(r => /mélange|alternez|irritation/i.test(r)), 'raison de l’incompatibilité absente');
  assert.ok(score < 50, `le score doit refléter le risque, obtenu ${score}`);
});

// ── 5. Budget : plafonds cohérents et pénalité lisible ──────────────────────

ok('budget : le plafonnement « 40_70 » vaut bien 28 € (cas ≤ 28 €)', () => {
  assert.equal(SKIN_BUDGET_CAPS['40_70'], 28);
  assert.ok(SKIN_BUDGET_CAPS['moins_40'] < SKIN_BUDGET_CAPS['40_70'], 'ladder croissante');
});

ok('budget : un produit à 35 € passe sous un produit à 24,90 € si plafond 28 €', () => {
  const ctx = { activeFilters: { budgetMax: 28 } };
  const chers = scoreSkinProduct(GOMMAGE_RETINOL_AHA, ctx); // 35 €
  const abordable = scoreSkinProduct(SERUM_NIACINAMIDE, ctx); // 24,90 €
  assert.ok(abordable.score > chers.score, 'le produit hors budget doit être déclassé');
  assert.ok(chers.reasons.some(r => /hors budget/i.test(r)), 'raison « hors budget » absente');
  assert.ok(abordable.reasons.some(r => /dans budget/i.test(r)), 'raison « dans budget » absente');
});

// ── 6. Explicabilité : cohérence score/raisons, rien d'inventé ──────────────

ok('explicabilité : _skinScore reproduit exactement scoreSkinProduct', () => {
  const ctx = CTX_FATOU;
  const ranked = rankSkinProducts([SERUM_NIACINAMIDE, CREME_PARFUMEE, SPF_MINERAL, SPF_HYBRIDE], ctx);
  for (const p of ranked) {
    assert.equal(p._skinScore, scoreSkinProduct(p, ctx).score, `${p.id} : score incohérent`);
    assert.ok(Array.isArray(p._skinReasons), `${p.id} : raisons absentes`);
    for (const r of p._skinReasons) assert.ok(typeof r === 'string' && r.length > 0, `${p.id} : raison vide`);
  }
});

ok('explicabilité : en contexte filtré, le 1er produit a au moins une raison', () => {
  const ranked = rankSkinProducts([SERUM_NIACINAMIDE, CREME_PARFUMEE, SPF_MINERAL, SPF_HYBRIDE], CTX_FATOU);
  assert.ok(ranked[0]._skinReasons.length >= 1, 'le 1er n’est justifié par aucune raison');
  // Borne naturelle du moteur = nombre de règles de scoring (≤ 9) : l'interface
  // se borne elle-même (2 raisons par carte), le moteur ne tronque plus.
  assert.ok(ranked[0]._skinReasons.length <= 9, 'trop de raisons : une règle dupliquée ?');
});

console.log(`\n${checks} contrôles passés — filtres peau P3 (scoring, whitecast, budget, explicabilité)\n`);
