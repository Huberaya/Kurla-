/**
 * CHANTIER 1, lot 2 — règles d'incompatibilité.
 * Garde-fous :
 *  - les deux ingrédients d'une règle existent dans le graphe ;
 *  - sévérité et niveau de preuve valides ;
 *  - pas de règle dupliquée (même paire dans un ordre ou l'autre) ;
 *  - pas d'auto-incompatibilité ;
 *  - le moteur findConflicts() les déclenche bien et les trie par sévérité ;
 *  - toute règle a une explication et une source.
 */
import assert from 'node:assert';
import { INGREDIENT_INCOMPATIBILITIES } from '../src/lib/ingredientIncompatibilities';
import { findConflicts, type IncompatibilityRule } from '../src/lib/ingredientGraph';

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
  const severities = new Set(['avoid', 'caution', 'space_out']);
  const evidences = new Set(['A', 'B', 'C', 'D', 'not_established']);
  const pairs = new Set<string>();

  for (const r of INGREDIENT_INCOMPATIBILITIES) {
    assert.notEqual(r.ingredientA, r.ingredientB, `auto-incompatibilité : ${r.ingredientA}`);
    assert.ok(KNOWN_INGREDIENT_IDS.has(r.ingredientA), `id A hors graphe : ${r.ingredientA}`);
    assert.ok(KNOWN_INGREDIENT_IDS.has(r.ingredientB), `id B hors graphe : ${r.ingredientB}`);
    assert.ok(severities.has(r.severity), `sévérité invalide : ${r.severity}`);
    assert.ok(evidences.has(r.evidenceLevel), `niveau de preuve invalide : ${r.evidenceLevel}`);
    assert.ok(r.explanation.length > 30, `explication trop courte : ${r.ingredientA}/${r.ingredientB}`);
    assert.ok(r.source && r.source.length > 5, `source manquante : ${r.ingredientA}/${r.ingredientB}`);
    const key = [r.ingredientA, r.ingredientB].sort().join('|');
    assert.ok(!pairs.has(key), `paire dupliquée : ${key}`);
    pairs.add(key);
  }

  assert.ok(INGREDIENT_INCOMPATIBILITIES.length >= 40, `trop peu de règles (${INGREDIENT_INCOMPATIBILITIES.length})`);

  // Le moteur findConflicts détecte et trie (avoid d'abord).
  const rules: IncompatibilityRule[] = INGREDIENT_INCOMPATIBILITIES.map((r) => ({
    ingredientA: r.ingredientA,
    ingredientB: r.ingredientB,
    severity: r.severity,
    explanation: r.explanation,
    evidenceLevel: r.evidenceLevel,
  }));
  const conflicts = findConflicts(['retinol', 'salicylic-acid', 'titanium-dioxide'], rules);
  assert.ok(conflicts.some((c) => c.ingredientA === 'retinol' && c.ingredientB === 'salicylic-acid'),
    'conflit rétinol/BHA non détecté');
  assert.equal(conflicts[0].severity, 'avoid', 'le conflit le plus fort doit remonter en premier');

  // Évidence 'A' réservée aux interactions réglementaires/fortes.
  const strong = INGREDIENT_INCOMPATIBILITIES.filter((r) => r.evidenceLevel === 'A');
  assert.ok(strong.length >= 2, 'au moins quelques règles de niveau A attendues');

  console.log(
    `[PASS] Incompatibilités : ${INGREDIENT_INCOMPATIBILITIES.length} règles, ids réels, paires uniques, explications sourcées. Moteur de conflits opérationnel (avoid > space_out > caution).`
  );
}

main();
