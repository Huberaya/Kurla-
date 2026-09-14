/**
 * KIT DE SOIN — contrat du bloc « à emporter » de la page de résultat.
 *
 * La personne qui termine un diagnostic doit repartir avec :
 *   1. sa fiche technique (uniquement les champs qu'elle a déclarés),
 *   2. le matériel justifié par la routine (jamais d'outil décoratif),
 *   3. les produits indispensables par phase — et une référence KURLA liée
 *      UNIQUEMENT si elle est publiée dans le catalogue transmis.
 *
 * Contrats : déterminisme, zéro invention (aucun slug inconnu du catalogue,
 * aucun prix, aucune marque hors catalogue), SPF non négociable en peau,
 * fiche technique bornée aux champs déclarés.
 */
import { strict as assert } from 'node:assert';
import type { Product } from '../src/types';
import { buildHairAdvisoryRoutine } from '../src/lib/knowledge/hairAdvisory';
import { buildSkinAdvisoryRoutine } from '../src/lib/knowledge/skinAdvisory';
import { buildHairKit } from '../src/lib/knowledge/careKit';
import { buildSkinKit } from '../src/lib/knowledge/careKit';
import { buildDiagnosticResultModel } from '../src/lib/diagnosticResult';

function makeProduct(overrides: Partial<Product> & { id: string; slug: string; name: string; category: Product['category'] }): Product {
  return {
    brand: 'Marque Test',
    price: null,
    rating: 0,
    reviewsCount: 0,
    image: '',
    badges: [],
    forWho: '',
    notIdealIf: '',
    howToUse: '',
    routineStep: '',
    keyIngredients: [],
    inci: '',
    description: '',
    inStock: true,
    availabilityState: 'available',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Fixtures catalogue (références publiées du site, noms réels)        */
/* ------------------------------------------------------------------ */

const HAIR_CATALOG: Product[] = [
  makeProduct({ id: 'p1', slug: 'preco-shampoing-creme-hydratant-sans-sulfate', name: 'Cantu Shea Butter Sulfate-Free Cleansing Cream Shampoo (400 ml)', category: 'cheveux' }),
  makeProduct({ id: 'p2', slug: 'preco-apres-shampoing-demelant-hydratant', name: 'Cantu Shea Butter Hydrating Cream Conditioner (400 ml)', category: 'cheveux' }),
  makeProduct({ id: 'p3', slug: 'preco-leave-in-creme-hydratante-legere', name: 'Kinky-Curly Knot Today Leave-In Conditioner / Detangler (236 ml)', category: 'cheveux' }),
  makeProduct({ id: 'p4', slug: 'preco-beurre-de-karite-brut-100', name: 'Beurre de karité brut 100 % (200 g)', category: 'cheveux' }),
  makeProduct({ id: 'p5', slug: 'preco-masque-profond-nutrition-beurre-de-karite', name: 'SheaMoisture Raw Shea Butter Deep Treatment Masque (340 g)', category: 'cheveux' }),
  makeProduct({ id: 'p6', slug: 'preco-gel-de-lin-definition-sans-croutage', name: 'Kinky-Curly Original Curling Custard (236 ml)', category: 'cheveux' }),
  makeProduct({ id: 'p7', slug: 'preco-serum-huiles-nourricieres-multi-usages', name: 'Mielle Rosemary Mint Light Scalp & Hair Strengthening Oil (59 ml)', category: 'cheveux' }),
  makeProduct({ id: 'p8', slug: 'preco-gommage-cuir-chevelu-purifiant', name: 'Camille Rose Clean Rinse Moisturizing & Clarifying Shampoo (240 ml)', category: 'cheveux' }),
  makeProduct({ id: 'p9', slug: 'preco-spray-refresh-quotidien-hydratation', name: 'Cantu Comeback Curl Next Day Curl Revitalizer (355 ml)', category: 'cheveux' }),
  makeProduct({ id: 'p10', slug: 'preco-soin-reconstructeur-de-liens', name: 'ApHogee Two-Step Protein Treatment (118 ml)', category: 'cheveux' }),
  makeProduct({ id: 'm1', slug: 'preco-peigne-demeloir-a-dents-larges', name: 'Peigne démêloir à dents larges (anti-casse)', category: 'accessoires' }),
  makeProduct({ id: 'm2', slug: 'preco-serviette-microfibre-boucles', name: 'Serviette microfibre boucles (plopping, anti-frisottis)', category: 'accessoires' }),
  makeProduct({ id: 'm3', slug: 'preco-flacon-vaporisateur-brume-continue', name: 'Flacon vaporisateur brume continue (300 ml)', category: 'accessoires' }),
  makeProduct({ id: 'm4', slug: 'preco-flacon-applicateur-embout-precis', name: 'Flacon applicateur embout précis (soin cuir chevelu, 200 ml)', category: 'accessoires' }),
  makeProduct({ id: 'm5', slug: 'preco-bonnet-satin-nuit-taie-d-oreiller', name: 'Bonnet satin nuit + taie d’oreiller (set)', category: 'accessoires' }),
];

const SKIN_CATALOG: Product[] = [
  makeProduct({ id: 's1', slug: 'preco-nettoyant-gel-doux', name: 'Nettoyant gel doux peaux sensibles', category: 'peau' }),
  makeProduct({ id: 's2', slug: 'preco-serum-niacinamide', name: 'Sérum niacinamide 10 % + zinc', category: 'peau' }),
  makeProduct({ id: 's3', slug: 'preco-spf-50-sans-trace-blanche', name: 'SPF 50 fluide sans trace blanche', category: 'peau' }),
  makeProduct({ id: 's4', slug: 'preco-creme-barriere', name: 'Crème barrière céramides NP', category: 'peau' }),
  makeProduct({ id: 's5', slug: 'preco-bha-2', name: 'BHA 2 % solution exfoliante', category: 'peau' }),
];

/* ------------------------------------------------------------------ */
/* 1. Cheveux — matériel                                               */
/* ------------------------------------------------------------------ */

const hairCtxBase = { texture: 'crepue', style: 'naturel', priority: 'hydratation', porosity: 'forte', scalp: 'sec', frequency: '1x_semaine', budget: '40_70' };
const hairRoutine = buildHairAdvisoryRoutine(hairCtxBase);

const hairKit = buildHairKit(hairCtxBase, hairRoutine, HAIR_CATALOG, buildDiagnosticResultModel({
  answers: { ...hairCtxBase }, result: null, products: HAIR_CATALOG, isSkin: false,
}).profileFields);

{
  const names = hairKit.materials.map(m => m.name);
  // Les outils justifiés par la routine sont présents…
  assert.ok(names.some(n => /dents larges/i.test(n)), 'démêloir : le démêlage est une étape de la routine');
  assert.ok(names.some(n => /microfibre/i.test(n)), 'serviette microfibre : le séchage est une étape de la routine');
  assert.ok(names.some(n => /vaporisateur/i.test(n)), 'vaporisateur : l’hydratation à l’eau est au cœur de la routine');
  assert.ok(names.some(n => /satin/i.test(n)), 'satin : la nuit en satin est une étape universelle de la routine');
  // … et le flacon applicateur aussi, car le cuir chevelu sec a déclenché son étape.
  assert.ok(names.some(n => /applicateur/i.test(n)), 'applicateur : le cuir chevelu déclaré a déclenché l’étape scalp');
  // Chaque matériel a une justification.
  for (const material of hairKit.materials) assert.ok(material.why.length > 10, `justification du matériel : ${material.name}`);
  console.log('✓ cheveux : matériel justifié par la routine (démêloir, microfibre, vaporisateur, applicateur, satin)');
}

/* ------------------------------------------------------------------ */
/* 2. Cheveux — produits indispensables                                */
/* ------------------------------------------------------------------ */

{
  const types = hairKit.essentials.map(e => `${e.phase} :: ${e.type}`);
  assert.ok(types.some(t => /Jour de lavage :: Shampoing doux/.test(t)), 'shampoing doux indispensable');
  assert.ok(types.some(t => /Jour de lavage :: Conditionneur/.test(t)), 'conditionneur indispensable');
  assert.ok(types.some(t => /Leave-in/.test(t)), 'LCO déclaré → leave-in listé');
  assert.ok(types.some(t => /scellant/i.test(t)), 'LCO déclaré → scellant listé');
  assert.ok(types.some(t => /Masque profond/.test(t)), 'masque hebdo listé');
  assert.ok(types.some(t => /Soin ciblé cuir chevelu/.test(t)), 'cuir chevelu déclaré → soin scalp listé');
  assert.ok(types.some(t => /Coiffant/.test(t)), 'coiffure naturelle → coiffant listé');
  // Chaque item a un type (la règle) et une justification.
  for (const essential of hairKit.essentials) {
    assert.ok(essential.type.length > 5, 'type présent');
    assert.ok(essential.why.length > 10, 'justification présente');
    assert.ok(essential.phase.length > 0, 'phase présente');
  }
  console.log('✓ cheveux : produits indispensables par phase (lavage, LCO, masque, scalp, coiffant)');
}

/* ------------------------------------------------------------------ */
/* 3. Cheveux — matching catalogue : jamais d'invention                */
/* ------------------------------------------------------------------ */

{
  const knownSlugs = new Set(HAIR_CATALOG.map(p => p.slug));
  const referenced: string[] = [
    ...hairKit.materials.map(m => m.product?.slug).filter((s): s is string => Boolean(s)),
    ...hairKit.essentials.map(e => e.product?.slug).filter((s): s is string => Boolean(s)),
  ];
  assert.ok(referenced.length >= 8, `le catalogue riche produit des liens (${referenced.length})`);
  for (const slug of referenced) assert.ok(knownSlugs.has(slug), `slug référencé existe dans le catalogue : ${slug}`);
  // Les liens pointent sur les bons types de produits.
  const bySlug = new Map(HAIR_CATALOG.map(p => [p.slug, p]));
  const shampooRef = hairKit.essentials.find(e => /Shampoing doux/.test(e.type))?.product;
  assert.ok(shampooRef && /shampoing|shampoo|clarity|cleansing/i.test(bySlug.get(shampooRef.slug)!.name), 'le shampoing lié est un shampoing');
  const combRef = hairKit.materials.find(m => /dents larges/i.test(m.name))?.product;
  assert.ok(combRef && /peigne|démêloir/i.test(bySlug.get(combRef.slug)!.name), 'le peigne lié est un peigne');
  // Catalogue vide → zéro lien, mais la liste des types reste complète.
  const emptyKit = buildHairKit(hairCtxBase, hairRoutine, [], buildDiagnosticResultModel({
    answers: { ...hairCtxBase }, result: null, products: [], isSkin: false,
  }).profileFields);
  assert.equal(emptyKit.materials.filter(m => m.product).length, 0, 'catalogue vide : aucun matériel lié');
  assert.equal(emptyKit.essentials.filter(e => e.product).length, 0, 'catalogue vide : aucun produit lié');
  assert.ok(emptyKit.essentials.length >= 5, 'catalogue vide : les types indispensables restent listés');
  console.log('✓ cheveux : liens uniquement sur des références publiées ; catalogue vide → types sans liens, zéro invention');
}

/* ------------------------------------------------------------------ */
/* 4. Cheveux — contextuel : locks n'ont ni coiffant ni scellant       */
/* ------------------------------------------------------------------ */

{
  const locksCtx = { ...hairCtxBase, texture: 'locksee', scalp: 'normal', priority: 'hydratation' };
  const locksRoutine = buildHairAdvisoryRoutine(locksCtx);
  const locksKit = buildHairKit(locksCtx, locksRoutine, HAIR_CATALOG, buildDiagnosticResultModel({
    answers: { ...locksCtx }, result: null, products: HAIR_CATALOG, isSkin: false,
  }).profileFields);
  const types = locksKit.essentials.map(e => e.type).join(' | ');
  assert.ok(!/Coiffant/.test(types), 'locks : pas de coiffant gel/custard');
  assert.ok(!/scellant/i.test(types), 'locks : pas de beurre scellant (dépôts)');
  assert.ok(!locksKit.materials.some(m => /applicateur/i.test(m.name)), 'locks, cuir chevelu normal : pas de flacon applicateur');
  console.log('✓ cheveux : kit contextuel (locks → pas de coiffant, pas de scellant, pas d’applicateur sans étape scalp)');
}

/* ------------------------------------------------------------------ */
/* 5. Peau — SPF non négociable + base toujours complète               */
/* ------------------------------------------------------------------ */

const skinCtxBase = { skinType: 'seche', skinConcerns: ['taches'], skinObjectives: ['hydrater'], sensitivity: 'aucune', hydrationLevel: 'faible' };
const skinRoutine = buildSkinAdvisoryRoutine({ ...skinCtxBase, skinConcerns: ['taches'], skinObjectives: ['hydrater'] });

{
  const kit = buildSkinKit({ ...skinCtxBase, skinConcerns: ['taches'], skinObjectives: ['hydrater'] }, skinRoutine, SKIN_CATALOG, buildDiagnosticResultModel({
    answers: { ...skinCtxBase }, result: null, products: SKIN_CATALOG, isSkin: true,
  }).profileFields, null);
  const spf = kit.essentials.find(e => /SPF/.test(e.type));
  assert.ok(spf, 'SPF présent dans le kit peau');
  assert.equal(spf!.nonNegotiable, true, 'SPF marqué non négociable');
  assert.ok(kit.essentials.some(e => /Nettoyant doux/.test(e.type)), 'nettoyant doux présent');
  assert.ok(kit.essentials.some(e => /Crème hydratante/.test(e.type)), 'crème hydratante présente');
  assert.ok(kit.essentials.some(e => /Sérum ciblé/.test(e.type)), 'préoccupation déclarée (taches) → sérum ciblé');
  // Matériel : la vérité — rien de spécial, et rien d'inventé.
  assert.ok(kit.materials.length <= 2, 'peau : pas de matériel inventé');
  for (const material of kit.materials) assert.equal(material.product, undefined, 'peau : aucun outil n’existe au catalogue — aucun lien');
  assert.ok(kit.materialNote && /aucun matériel spécial/i.test(kit.materialNote), 'note honnête sur l’absence de matériel');
  console.log('✓ peau : SPF non négociable, base complète, matériel honnête (rien d’inventé)');
}

/* ------------------------------------------------------------------ */
/* 6. Peau — matching + exfoliation conditionnelle                     */
/* ------------------------------------------------------------------ */

{
  const knownSlugs = new Set(SKIN_CATALOG.map(p => p.slug));
  const kit = buildSkinKit({ ...skinCtxBase, skinConcerns: ['points_noirs'], skinObjectives: [] }, buildSkinAdvisoryRoutine({ ...skinCtxBase, skinConcerns: ['points_noirs'], skinObjectives: [] }), SKIN_CATALOG, buildDiagnosticResultModel({
    answers: { ...skinCtxBase, skinConcerns: ['points_noirs'] }, result: null, products: SKIN_CATALOG, isSkin: true,
  }).profileFields, null);
  const referenced = [
    ...kit.materials.map(m => m.product?.slug).filter((s): s is string => Boolean(s)),
    ...kit.essentials.map(e => e.product?.slug).filter((s): s is string => Boolean(s)),
  ];
  for (const slug of referenced) assert.ok(knownSlugs.has(slug), `slug référence existe : ${slug}`);
  // points_noirs (grain) + non sensible + pas de focus barrière → l’exfoliation
  // hebdo entre dans la routine… donc dans le kit.
  assert.ok(kit.essentials.some(e => /Exfoliation douce/.test(e.type)), 'grain + tolérance → exfoliation douce listée');
  // …et sans le contexte de grain, elle n’apparaît pas.
  const plain = buildSkinKit({ ...skinCtxBase, skinConcerns: ['taches'], skinObjectives: [] }, buildSkinAdvisoryRoutine({ ...skinCtxBase, skinConcerns: ['taches'], skinObjectives: [] }), SKIN_CATALOG, buildDiagnosticResultModel({
    answers: { ...skinCtxBase }, result: null, products: SKIN_CATALOG, isSkin: true,
  }).profileFields, null);
  assert.ok(!plain.essentials.some(e => /Exfoliation/.test(e.type)), 'sans contexte de grain : aucune exfoliation');
  console.log('✓ peau : liens vérifiés, exfoliation conditionnelle sur la routine (pas de geste automatique)');
}

/* ------------------------------------------------------------------ */
/* 7. Fiche technique — uniquement les champs déclarés                 */
/* ------------------------------------------------------------------ */

{
  const lines = hairKit.profileLines.join(' | ');
  assert.ok(/Texture :/.test(lines), 'texture déclarée présente');
  assert.ok(/Porosité :/.test(lines), 'porosité déclarée présente');
  assert.ok(/Cuir chevelu :/.test(lines), 'cuir chevelu déclaré présent');
  assert.ok(!/Budget/.test(lines), 'le budget n’est pas une donnée technique — absent de la fiche');
  // Réponses vides → la fiche ne devine rien.
  const empty = buildHairKit({ texture: '', style: '', priority: '', porosity: '', scalp: '', frequency: '' }, buildHairAdvisoryRoutine({ texture: '', style: '', priority: '', porosity: '', scalp: '', frequency: '' }), [], buildDiagnosticResultModel({
    answers: {}, result: null, products: [], isSkin: false,
  }).profileFields);
  assert.equal(empty.profileLines.length, 0, 'rien déclaré → fiche technique vide (zéro déduction)');
  const emptySkin = buildSkinKit({ skinType: '', skinConcerns: [], skinObjectives: [] }, buildSkinAdvisoryRoutine({ skinType: '', skinConcerns: [], skinObjectives: [] }), [], buildDiagnosticResultModel({
    answers: {}, result: null, products: [], isSkin: true,
  }).profileFields, null);
  assert.ok(emptySkin.profileLines.some(l => /non renseigné/i.test(l)), 'peau rien déclaré → ligne honnête, pas de profil inventé');
  console.log('✓ fiche technique : bornée aux champs déclarés, zéro déduction');
}

/* ------------------------------------------------------------------ */
/* 8. Déterminisme                                                     */
/* ------------------------------------------------------------------ */

{
  const a = buildHairKit(hairCtxBase, hairRoutine, HAIR_CATALOG, buildDiagnosticResultModel({ answers: { ...hairCtxBase }, result: null, products: HAIR_CATALOG, isSkin: false }).profileFields);
  const b = buildHairKit(hairCtxBase, hairRoutine, HAIR_CATALOG, buildDiagnosticResultModel({ answers: { ...hairCtxBase }, result: null, products: HAIR_CATALOG, isSkin: false }).profileFields);
  assert.deepEqual(a, b, 'cheveux : mêmes réponses → même kit');
  const c = buildSkinKit({ ...skinCtxBase, skinConcerns: ['taches'], skinObjectives: ['hydrater'] }, skinRoutine, SKIN_CATALOG, buildDiagnosticResultModel({ answers: { ...skinCtxBase }, result: null, products: SKIN_CATALOG, isSkin: true }).profileFields, null);
  const d = buildSkinKit({ ...skinCtxBase, skinConcerns: ['taches'], skinObjectives: ['hydrater'] }, skinRoutine, SKIN_CATALOG, buildDiagnosticResultModel({ answers: { ...skinCtxBase }, result: null, products: SKIN_CATALOG, isSkin: true }).profileFields, null);
  assert.deepEqual(c, d, 'peau : mêmes réponses → même kit');
  console.log('✓ déterminisme : deux exécutions → deux kits identiques');
}

/* ------------------------------------------------------------------ */
/* 9. Intégration — le modèle de résultat porte le kit                 */
/* ------------------------------------------------------------------ */

{
  const model = buildDiagnosticResultModel({ answers: { ...hairCtxBase }, result: null, products: HAIR_CATALOG, isSkin: false });
  assert.ok(model.kit, 'model.kit présent');
  assert.equal(model.kit.isSkin, false, 'kit cheveux');
  assert.ok(model.kit.essentials.length >= 5, 'kit cheveux : liste non triviale');
  assert.ok(model.kit.profileLines.length >= 4, 'kit cheveux : fiche technique renseignée');
  const skinModel = buildDiagnosticResultModel({ answers: { ...skinCtxBase, phototypeConsent: true, phototype: 5 }, result: null, products: SKIN_CATALOG, isSkin: true });
  assert.equal(skinModel.kit.isSkin, true, 'kit peau');
  assert.ok(skinModel.kit.profileLines.some(l => /Phototype 5/.test(l)), 'phototype consenti présent dans la fiche');
  console.log('✓ intégration : buildDiagnosticResultModel porte le kit (cheveux et peau)');
}

console.log('\n9 blocs de contrôles kit de soin validés — fiche technique, matériel justifié, produits indispensables, zéro invention.');
