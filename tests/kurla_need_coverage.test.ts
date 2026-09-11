import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TAXONOMY_TERMS } from '../src/lib/taxonomyReference';
import { RECOGNIZED_NEED_CODES, calculateKurlaFit } from '../src/lib/kurlaFit';
import { createEmptyBeautyProfile, normalizeBeautyProfile, FRIZZ_OPTIONS } from '../src/lib/beautyProfile';

/**
 * GARDE — aucun besoin du vocabulaire ne peut rester sans correspondance.
 *
 * Fait déclencheur, mesuré : le vocabulaire contrôlé déclarait **16** besoins,
 * `RECOGNIZED_NEED_CODES` n'en listait que **13**. `reduire_frisottis`,
 * `apaiser_cuir_chevelu` et `proteger_chaleur` n'avaient aucune branche.
 *
 * Conséquence : un produit portant l'un de ces besoins le voyait compté au
 * dénominateur de `(needs - unmetNeeds) / needs` sans jamais pouvoir être
 * satisfait. Son score était plafonné à vie, silencieusement.
 *
 * Rien ne le détectait : `brand_test.test.ts` valide contre
 * `RECOGNIZED_NEED_CODES`, donc la liste se contrôlait elle-même. Cette garde
 * compare au contraire le vocabulaire **et** la présence réelle d'une branche.
 */

function profileWith(hair: Record<string, unknown>) {
  return normalizeBeautyProfile({ hair });
}

function needMatches(need: string, hair: Record<string, unknown>): boolean {
  const fit = calculateKurlaFit({ category: 'cheveux', needs: [need] } as any, profileWith(hair) as any);
  return fit.unmetNeeds.length === 0;
}

async function runNeedCoverageTests(): Promise<void> {
  // --- 1. Vocabulaire ⊆ codes reconnus -----------------------------------
  const taxonomyNeeds = TAXONOMY_TERMS.filter(term => term.taxonomy === 'need').map(term => term.code);
  assert.ok(taxonomyNeeds.length >= 16, `le vocabulaire doit déclarer au moins 16 besoins, trouvé ${taxonomyNeeds.length}`);

  const orphans = taxonomyNeeds.filter(code => !(RECOGNIZED_NEED_CODES as readonly string[]).includes(code));
  assert.deepEqual(orphans, [], `besoins du vocabulaire sans correspondance : ${orphans.join(', ')}`);

  const undeclared = (RECOGNIZED_NEED_CODES as readonly string[]).filter(code => !taxonomyNeeds.includes(code));
  assert.deepEqual(undeclared, [], `codes reconnus absents du vocabulaire contrôlé : ${undeclared.join(', ')}`);

  // --- 2. Chaque code reconnu a une branche réelle -----------------------
  const source = await readFile('src/lib/kurlaFit.ts', 'utf8');
  const withoutBranch = (RECOGNIZED_NEED_CODES as readonly string[]).filter(code => !source.includes(`case '${code}'`));
  assert.deepEqual(withoutBranch, [], `codes listés sans branche \`case\` : ${withoutBranch.join(', ')}`);

  // --- 3. Les trois besoins réparés se comportent correctement -----------
  // reduire_frisottis : champ dédié, rien n'est déduit.
  assert.equal(needMatches('reduire_frisottis', { frizz: 'frequents' }), true, 'des frisottis fréquents doivent activer le besoin');
  assert.equal(needMatches('reduire_frisottis', { frizz: 'occasionnels' }), true, 'des frisottis occasionnels doivent activer le besoin');
  assert.equal(needMatches('reduire_frisottis', { frizz: 'rare' }), false, 'des frisottis rares ne doivent pas activer le besoin');
  assert.equal(needMatches('reduire_frisottis', { dryness: 'forte', porosity: 'faible' }), false,
    'la sécheresse et la porosité ne doivent PAS suffire : les frisottis ne se déduisent pas');

  // apaiser_cuir_chevelu : plus étroit que cuir_chevelu.
  assert.equal(needMatches('apaiser_cuir_chevelu', { scalpConcerns: ['demangeaisons'] }), true);
  assert.equal(needMatches('apaiser_cuir_chevelu', { scalpConcerns: ['sensibilite'] }), true);
  assert.equal(needMatches('apaiser_cuir_chevelu', { scalpConcerns: ['sebum'] }), false,
    'le sébum appelle un lavage, pas un apaisant : il ne doit pas activer le besoin');
  assert.equal(needMatches('apaiser_cuir_chevelu', { scalpConcerns: ['aucun'] }), false);

  // proteger_chaleur : fondé sur l'usage déclaré d'outils chauffants.
  assert.equal(needMatches('proteger_chaleur', { stylingHabits: ['chaleur'] }), true);
  assert.equal(needMatches('proteger_chaleur', { stylingHabits: ['wash_and_go'] }), false,
    'un wash-and-go n’implique aucun outil chauffant');
  assert.equal(needMatches('proteger_chaleur', {}), false);

  // --- 4. Le champ dédié est intégré au profil ---------------------------
  const frizzValues = FRIZZ_OPTIONS.map(option => option.value);
  assert.ok(frizzValues.includes('frequents') && frizzValues.includes('inconnu'),
    'FRIZZ_OPTIONS doit couvrir la fréquence et l’indétermination');
  assert.equal(createEmptyBeautyProfile().hair.frizz, 'inconnu', 'un profil vide doit déclarer les frisottis comme inconnus');
  assert.equal(normalizeBeautyProfile({ hair: { frizz: 'frequents' } }).hair.frizz, 'frequents');
  assert.equal(normalizeBeautyProfile({ hair: { frizz: 42 } }).hair.frizz, 'inconnu', 'une valeur invalide doit retomber sur inconnu');

  const profileSource = await readFile('src/lib/beautyProfile.ts', 'utf8');
  assert.ok(profileSource.includes("['hair.frizz', 'frisottis']"),
    'hair.frizz doit compter dans le calcul de confiance du profil');

  console.log(
    `[PASS] Couverture des besoins : ${taxonomyNeeds.length} besoins au vocabulaire, ${RECOGNIZED_NEED_CODES.length} reconnus, tous avec une branche ; les 3 besoins réparés sont discriminants et le champ frisottis est intégré au profil.`
  );
}

runNeedCoverageTests().catch(error => {
  console.error('[FAIL] Couverture des besoins :', error);
  process.exitCode = 1;
});
