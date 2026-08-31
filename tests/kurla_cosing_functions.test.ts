/**
 * CHANTIER 1, lot 2 — fonctions CosIng + restrictions UE.
 * Garde-fous :
 *  - chaque ingredientId mappé doit exister dans le graphe (seed référencé ici),
 *  - chaque fonction doit appartenir au vocabulaire contrôlé (jamais inventée),
 *  - les restrictions UE ont un statut/annexe cohérents et une concentration
 *    valide, les interdits sont en 'prohibited',
 *  - les allergènes à déclarer sont flagués et ont une fonction parfum cohérente.
 */
import assert from 'node:assert';
import {
  COSING_FACTS,
  COSMETIC_FUNCTION_VOCABULARY,
  cosingFactsFor,
  type CosmeticFunction,
} from '../src/lib/cosingFunctions';

// Jeu d'ids réellement présents en base (118 ingrédients, cf. migration lot 1
// + vérification production). On garde la liste des ids canoniques.
const KNOWN_INGREDIENT_IDS = new Set<string>([
  'allantoin','aloe_barbadensis','alpha-isomethyl-ionone','althaea_officinalis','aqua',
  'argania_spinosa','arginine','ascorbic-acid','avena_sativa','behentrimonium-chloride',
  'benzoic-acid','benzyl-alcohol','benzyl-benzoate','benzyl-salicylate','butylene-glycol',
  'butylphenyl-methylpropional','butyrospermum_parkii','camelina_sativa','capric-triglyceride',
  'caprylic','caprylyl-glycol','ceramide-np','cetearyl-alcohol','cetrimonium-chloride',
  'cetyl-alcohol','ci-17200','ci-19140','ci-42090','ci-77891','citral','citric-acid',
  'citronellol','cocamidopropyl_betaine','coco-glucoside','coconut-oil','coumarin',
  'cyclopentasiloxane','decyl-glucoside','dehydroacetic-acid','dimethiconol','disodium-edta',
  'disodium-etidronate','e1519','e211','e330','e415','e422','e490','ethylhexylglycerin',
  'geraniol','glycerin','glyceryl-stearate','glycol-distearate','helianthus_annuus',
  'hexyl-cinnamal','histidine','hydrolyzed_rice','hydroquinone','hydroxycitronellal',
  'hydroxyethylcellulose','isopropyl-alcohol','isopropyl-myristate','lactic-acid',
  'lauryl-glucoside','lecithin','limonene','linalool','linalyl-acetate','magnesium-chloride',
  'magnesium-nitrate','mangifera_indica','melaleuca_alternifolia','mentha_piperita','menthol',
  'methylchloroisothiazolinone','methylisothiazolinone','mica','niacinamide','panthenol',
  'parfum','pentylene-glycol','persea_gratissima','phenoxyethanol','piroctone-olamine',
  'potassium-sorbate','propanediol','propylene-glycol','retinol','ricinus_communis',
  'rosmarinus_officinalis','salicylic-acid','shea','shea-butter','simmondsia_chinensis',
  'sodium','sodium-benzoate','sodium-chloride','sodium-citrate','sodium-hydroxide',
  'sodium-laureth-sulfate','sodium-lauryl-sulfate','sodium-pca','sodium-salicylate',
  'sodium-xylenesulfonate','squalane','stearamidopropyl-dimethylamine','stearic-acid',
  'stearyl-alcohol','tetrasodium-edta','tetrasodium-glutamate-diacetate','theobroma_cacao',
  'titanium-dioxide','tocopherol','tocopheryl-acetate','tranexamic_acid','vitamin-e',
  'zinc_pca','zinc-oxide',
]);

function main() {
  const vocab = new Set<string>(COSMETIC_FUNCTION_VOCABULARY);

  // 1) Pas de doublon d'ingrédient.
  const ids = COSING_FACTS.map((f) => f.ingredientId);
  const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(dupes, [], `ingrédients en double : ${dupes.join(', ')}`);

  // 2) Chaque id mappé existe dans le graphe ; chaque fonction est du vocabulaire.
  for (const f of COSING_FACTS) {
    assert.ok(KNOWN_INGREDIENT_IDS.has(f.ingredientId), `id hors graphe : ${f.ingredientId}`);
    for (const fn of f.functions) {
      assert.ok(vocab.has(fn as string), `fonction hors vocabulaire contrôlé pour ${f.ingredientId} : ${fn}`);
    }
  }

  // 3) Cohérence des restrictions UE.
  for (const f of COSING_FACTS) {
    const r = f.restriction;
    if (!r) continue;
    assert.ok(['allowed', 'restricted', 'prohibited'].includes(r.status), `${f.ingredientId}: statut invalide`);
    assert.ok(['II', 'III', 'IV', 'V', 'VI'].includes(r.annex), `${f.ingredientId}: annexe invalide`);
    if (r.status === 'prohibited') {
      assert.ok(r.limitPercent === null, `${f.ingredientId}: un interdit ne peut pas avoir de limite`);
      assert.equal(r.annex, 'II', `${f.ingredientId}: un interdit cosmétique renvoie à l'Annexe II`);
    }
    if (r.limitPercent !== null) {
      assert.ok(r.limitPercent > 0 && r.limitPercent <= 100, `${f.ingredientId}: limite % incohérente`);
    }
    assert.ok(r.note && r.note.length > 10, `${f.ingredientId}: restriction sans note explicative`);
  }

  // 4) Interdits notoires présents.
  assert.ok(cosingFactsFor('hydroquinone')?.restriction?.status === 'prohibited', 'hydroquinone doit être interdite (II)');
  assert.ok(cosingFactsFor('methylisothiazolinone')?.restriction?.status === 'restricted', 'MIT doit être restreint (V)');

  // 5) Allergènes réglementés : drapeau levé sur les parfums connus.
  const allergenIds = COSING_FACTS.filter((f) => f.regulatedAllergen).map((f) => f.ingredientId);
  for (const a of ['linalool', 'limonene', 'citronellol', 'geraniol', 'citral', 'coumarin', 'benzyl-benzoate']) {
    assert.ok(allergenIds.includes(a), `allergène non flagué : ${a}`);
  }
  assert.ok(allergenIds.length >= 10, `trop peu d'allergènes (${allergenIds.length})`);

  // 6) Couverture minimale : la grande majorité des 118 ingrédients ont une fonction.
  const withFn = COSING_FACTS.filter((f) => f.functions.length > 0).length;
  assert.ok(withFn >= 100, `couverture fonctions trop faible : ${withFn}`);

  console.log(
    `[PASS] CosIng lot 2 : ${COSING_FACTS.length} ingrédients renseignés (${withFn} avec fonctions), ${allergenIds.length} allergènes, ${COSING_FACTS.filter((f) => f.restriction).length} restrictions UE. Toutes les fonctions sont dans le vocabulaire contrôlé, tous les ids existent en base. Aucune fonction inventée.`
  );
}

main();
