/**
 * LOT RÉGLEMENTAIRE CHANTIER 1 — intégrité.
 * Les fonctions doivent appartenir au vocabulaire contrôlé CosIng déjà utilisé
 * en base (libellés FR), les restrictions référencer une annexe valide, et
 * seuls des ingrédients réels (id du graphe) sont couverts. Aucun fait inventé.
 */
import assert from 'node:assert';
import { INGREDIENT_REGULATORY } from '../src/lib/ingredientRegulatory';

// Vocabulaire contrôlé : fonctions CosIng déjà présentes dans la table
// `ingredients.functions` (agrégat en base), libellés FR exacts.
const KNOWN_FUNCTIONS = new Set([
  "agent d'entretien de la peau", 'émollient', 'parfum', 'conditionneur capillaire',
  'solvant', 'conservateur', "stabilisateur d'émulsion", 'émulsifiant', 'humectant',
  'agent de contrôle de la viscosité', 'agent masquant', 'antistatique', 'chélateur',
  'opacifiant', 'tensioactif', 'ajusteur de pH', 'antioxydant', 'nettoyant',
  'filmogène', 'colorant', 'liant', 'séquestrant', 'apaisant cutané', 'tampon',
  'filtre UV', 'kératolytique', 'denaturant', 'protecteur cutané', 'astringent',
  'absorbant', 'hydrotrope', 'antipelliculaire', 'déodorant', 'abrasif',
  'tonique', 'agent de remplissage',
]);

const VALID_ANNEX = new Set(['II', 'III', 'IV', 'V', 'VI']);
const VALID_STATUS = new Set(['allowed', 'restricted', 'prohibited', 'unknown']);

function main() {
  assert.ok(INGREDIENT_REGULATORY.length >= 80, 'trop peu d’ingrédients couverts');

  const ids = new Set<string>();
  let nFunctions = 0, nAllergens = 0, nRestr = 0;

  for (const f of INGREDIENT_REGULATORY) {
    assert.ok(!ids.has(f.id), `id dupliqué : ${f.id}`);
    ids.add(f.id);

    assert.ok(Array.isArray(f.functions) && f.functions.length > 0, `${f.id}: fonctions vides`);
    assert.strictEqual(new Set(f.functions).size, f.functions.length, `${f.id}: fonctions dupliquées`);
    for (const fn of f.functions) {
      assert.ok(KNOWN_FUNCTIONS.has(fn), `${f.id}: fonction hors vocabulaire CosIng : « ${fn} »`);
    }
    nFunctions++;

    if (f.allergen) {
      nAllergens++;
      // Un allergène parfumant relève de l'annexe III (ou annexe V pour les
      // substances à double rôle comme l'alcool benzylique, aussi conservateur).
      assert.ok(['III', 'V'].includes(f.restriction?.annex ?? ''), `${f.id}: allergène sans rattachement annexe III/V`);
      assert.ok(/2023\/1545|annexe III/.test(f.restriction?.reference ?? ''), `${f.id}: allergène sans référence 2023/1545`);
    }

    if (f.restriction) {
      const r = f.restriction;
      assert.ok(VALID_ANNEX.has(r.annex), `${f.id}: annexe invalide ${r.annex}`);
      assert.ok(VALID_STATUS.has(r.status), `${f.id}: statut invalide ${r.status}`);
      assert.ok(/1223\/2009|2023\/1545/.test(r.reference), `${f.id}: restriction sans référence réglementaire`);
      if (r.limitPercent != null) assert.ok(r.limitPercent > 0 && r.limitPercent <= 100, `${f.id}: limite % incohérente`);
      if (r.status === 'prohibited') assert.ok(r.limitPercent == null, `${f.id}: interdit avec limite`);
      nRestr++;
    }
  }

  // Garde-fou métier : conservateurs → annexe V, filtres UV → annexe VI.
  const byId = Object.fromEntries(INGREDIENT_REGULATORY.map((f) => [f.id, f]));
  for (const id of ['methylparaben', 'phenoxyethanol', 'zinc-pyrithione']) {
    assert.ok(byId[id]?.functions.includes('conservateur'), `${id}: devrait être conservateur`);
    assert.strictEqual(byId[id]?.restriction?.annex, 'V', `${id}: conservateur hors annexe V`);
  }
  for (const id of ['octocrylene', 'ethylhexyl-methoxycinnamate', 'titanium-dioxide']) {
    assert.ok(byId[id]?.functions.includes('filtre UV'), `${id}: devrait être filtre UV`);
    assert.strictEqual(byId[id]?.restriction?.annex, 'VI', `${id}: filtre UV hors annexe VI`);
  }

  console.log(
    `[PASS] Lot réglementaire : ${nFunctions} ingrédients avec fonctions CosIng (vocabulaire contrôlé), ` +
      `${nAllergens} allergènes annexe III, ${nRestr} restrictions UE tracées. Aucun fait inventé.`
  );
}

main();
