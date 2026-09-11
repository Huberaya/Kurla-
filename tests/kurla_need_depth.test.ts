import assert from 'node:assert/strict';
import { FIBRE_NEEDS, assessNeedDepth } from '../src/lib/needDepth';
import { RECOGNIZED_NEED_CODES, calculateKurlaFit } from '../src/lib/kurlaFit';
import { normalizeBeautyProfile, BeautyProfile } from '../src/lib/beautyProfile';
import { buildRecommendations, EngineProduct } from '../src/lib/recommendationEngine';

/**
 * BANC D1 — « deux fibres différentes ne reçoivent pas le même conseil ».
 *
 * Fait déclencheur, mesuré dans le code : les cinq besoins de fibre de
 * `calculateKurlaFit` retournaient un booléen. `hydrater_cheveux` était vrai de
 * la même façon pour un 4C à porosité faible et pour un 2A à porosité forte,
 * alors que le geste conseillé est opposé. La porosité figurait dans les
 * preuves affichées sans jamais changer la décision.
 *
 * Ce banc est comportemental : il exécute `calculateKurlaFit` et
 * `buildRecommendations`, pas une copie de leur logique. Trois propriétés sont
 * tenues ensemble, parce que chacune isolée ne prouve rien :
 *
 *  1. deux profils qui ne diffèrent que par la porosité reçoivent des conseils
 *     différents ;
 *  2. cette différence ne change ni l'éligibilité ni le score — sinon D1
 *     aurait déplacé le problème au lieu de l'élargir ;
 *  3. aucune nuance n'existe sans le champ déclaré qui la fonde — sinon KURLA
 *     inventerait une caractéristique pour se donner un conseil à formuler.
 */

const RICH = {
  texturePatterns: ['4C'],
  curlPattern: 'spirales',
  porosity: 'forte',
  density: 'forte',
  strandThickness: 'fine',
  length: 'long',
  fiberCondition: 'fragile',
  dryness: 'forte',
  frizz: 'frequents',
  breakage: 'frequente',
  elasticity: 'faible',
  chemicalTreatments: ['defrisage'],
  coloring: 'decoloration',
  protectiveStyles: ['tresses'],
  stylingHabits: ['wash_and_go', 'demelage', 'chaleur']
};

function profileWith(hair: Record<string, unknown>, environment: Record<string, unknown> = {}): BeautyProfile {
  return normalizeBeautyProfile({ hair, environment }) as BeautyProfile;
}

function fitFor(needs: string[], profile: BeautyProfile) {
  return calculateKurlaFit({ category: 'cheveux', needs } as never, profile);
}

function signalOf(needs: string[], profile: BeautyProfile, code: string) {
  const signal = fitFor(needs, profile).needSignals.find(entry => entry.code === code);
  assert.ok(signal, `le besoin ${code} doit produire un signal`);
  return signal!;
}

/** Résout un chemin de champ sur le profil : prouve qu'il existe vraiment. */
function resolvePath(profile: BeautyProfile, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (current, key) => (current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined),
    profile
  );
}

function engineProduct(partial: Partial<EngineProduct> & { id: string; name: string; needs: string[] }): EngineProduct {
  return { slug: partial.id, brand: 'KURLA', price: 20, category: 'cheveux', inStock: true, ...partial } as EngineProduct;
}

async function runNeedDepthTests(): Promise<void> {
  // --- 1. Périmètre déclaré de D1 -----------------------------------------
  assert.deepEqual(
    [...FIBRE_NEEDS].sort(),
    ['definir_boucles', 'demeler_cheveux', 'hydrater_cheveux', 'reduire_casse', 'reduire_frisottis'],
    'D1 porte sur exactement cinq besoins de fibre'
  );
  const unlisted = (FIBRE_NEEDS as readonly string[]).filter(need => !(RECOGNIZED_NEED_CODES as readonly string[]).includes(need));
  assert.deepEqual(unlisted, [], 'un besoin de D1 hors vocabulaire reconnu serait un orphelin réintroduit');

  // --- 2. La porosité change le conseil, pas l'éligibilité -----------------
  const lowPorosity = profileWith({ ...RICH, porosity: 'faible' });
  const highPorosity = profileWith({ ...RICH, porosity: 'forte' });

  const fitLow = fitFor(['hydrater_cheveux'], lowPorosity);
  const fitHigh = fitFor(['hydrater_cheveux'], highPorosity);

  // (2a) Même éligibilité, même score : D1 n'a pas déplacé le problème.
  assert.deepEqual(fitLow.unmetNeeds, fitHigh.unmetNeeds, 'la porosité ne doit pas changer l’éligibilité du besoin');
  assert.equal(fitLow.score, fitHigh.score, 'la porosité ne doit pas changer le score (le chantier F s’en chargera)');

  // (2b) Mais le conseil diffère.
  const nuanceLow = fitLow.needSignals[0].nuances.find(n => n.field === 'hair.porosity');
  const nuanceHigh = fitHigh.needSignals[0].nuances.find(n => n.field === 'hair.porosity');
  assert.ok(nuanceLow && nuanceHigh, 'les deux profils doivent porter une nuance de porosité');
  assert.notEqual(nuanceLow!.advice, nuanceHigh!.advice, 'deux porosités opposées doivent recevoir deux conseils différents');

  // Ancres de sens : ces mots sont ce qui rend la différence vérifiable, pas
  // une assertion sur la rédaction.
  assert.match(nuanceLow!.advice, /cuticule/, 'une porosité faible appelle un conseil sur la cuticule fermée');
  assert.match(nuanceHigh!.advice, /[Ss]celler/, 'une porosité forte appelle un conseil de scellement');

  // --- 3. Chaque besoin de fibre est effectivement approfondi --------------
  const rich = profileWith(RICH, { humidity: 'forte' });
  for (const need of FIBRE_NEEDS) {
    const signal = signalOf([need], rich, need);
    assert.equal(signal.met, true, `${need} doit être couvert par le profil riche`);
    assert.ok(signal.nuances.length > 0, `${need} doit produire au moins une nuance sur un profil renseigné`);
  }

  // Discriminations propres à chaque besoin, au-delà de la porosité.
  const thick = profileWith({ ...RICH, strandThickness: 'epaisse' });
  const fine = profileWith({ ...RICH, strandThickness: 'fine' });
  const adviceFor = (profile: BeautyProfile, field: string) =>
    signalOf(['hydrater_cheveux'], profile, 'hydrater_cheveux').nuances.find(n => n.field === field)?.advice;
  assert.notEqual(adviceFor(thick, 'hair.strandThickness'), adviceFor(fine, 'hair.strandThickness'),
    'un cheveu fin et un cheveu épais ne reçoivent pas le même conseil d’hydratation');

  // Élasticité : faible et forte appellent des gestes opposés.
  const stiff = profileWith({ ...RICH, elasticity: 'faible' });
  const stretchy = profileWith({ ...RICH, elasticity: 'forte' });
  const elasticAdvice = (profile: BeautyProfile) =>
    signalOf(['reduire_casse'], profile, 'reduire_casse').nuances.find(n => n.field === 'hair.elasticity')?.advice;
  assert.notEqual(elasticAdvice(stiff), elasticAdvice(stretchy),
    'une élasticité faible et une élasticité trop forte appellent des gestes opposés');
  assert.match(elasticAdvice(stretchy)!, /excès d’hydratation/,
    'un cheveu mou doit être lu comme un excès d’hydratation, pas comme un manque');

  // --- 4. Aucune nuance sans champ déclaré --------------------------------
  // Besoin couvert par la seule sécheresse, tous les champs de nuance inconnus.
  const sparse = profileWith({ dryness: 'moyenne' });
  const sparseSignal = signalOf(['hydrater_cheveux'], sparse, 'hydrater_cheveux');
  assert.equal(sparseSignal.met, true, 'une sécheresse moyenne suffit à rendre le besoin pertinent');
  assert.deepEqual(sparseSignal.nuances, [],
    'sans porosité, épaisseur ni densité déclarées, KURLA ne doit formuler aucun geste différencié');

  // Et la profondeur reste vide pour un besoin non couvert.
  const uncovered = fitFor(['reduire_casse'], sparse).needSignals[0];
  assert.equal(uncovered.met, false);
  assert.equal(uncovered.intensity, 0, 'un besoin non couvert a une intensité nulle');
  assert.deepEqual(uncovered.nuances, []);

  // --- 5. L'intensité mesure la gravité déclarée ---------------------------
  const moderate = profileWith({ ...RICH, dryness: 'moyenne' });
  const severe = profileWith({ ...RICH, dryness: 'forte' });
  assert.ok(
    signalOf(['hydrater_cheveux'], severe, 'hydrater_cheveux').intensity
      > signalOf(['hydrater_cheveux'], moderate, 'hydrater_cheveux').intensity,
    'une sécheresse forte doit produire une intensité supérieure à une sécheresse moyenne'
  );
  assert.ok(sparseSignal.intensity >= 50, 'un besoin couvert n’a jamais une intensité nulle');

  // --- 6. Le score reste le ratio booléen (marqueur pour le chantier F) ----
  // hydrater_cheveux couvert, reduire_casse et definir_boucles non : 1/3.
  const booleanRatio = fitFor(['hydrater_cheveux', 'reduire_casse', 'definir_boucles'], sparse);
  assert.deepEqual(booleanRatio.unmetNeeds, ['reduire_casse', 'definir_boucles']);
  assert.equal(booleanRatio.score, 33,
    'le score est toujours le ratio booléen. Quand le chantier F pondérera les besoins, cette assertion est celle qu’il faudra consciusement mettre à jour.');

  // --- 7. Frontière honnête : D2 et D3 ne sont pas faits -------------------
  const nonFibre = (RECOGNIZED_NEED_CODES as readonly string[]).filter(need => !(FIBRE_NEEDS as readonly string[]).includes(need));
  assert.equal(nonFibre.length, 16, '21 besoins reconnus moins 5 besoins de fibre');
  for (const need of nonFibre) {
    const depth = assessNeedDepth(need, rich);
    assert.deepEqual(depth, { intensity: 0, nuances: [] },
      `${need} n’est pas traité par D1 : sa profondeur doit rester vide, pas simulée`);
  }

  // --- 8. Chaque nuance cite un chemin réel du profil ----------------------
  const checked = new Set<string>();
  for (const profile of [rich, lowPorosity, highPorosity, thick, stiff, stretchy]) {
    for (const need of FIBRE_NEEDS) {
      for (const nuance of signalOf([need], profile, need).nuances) {
        checked.add(nuance.field);
        assert.notEqual(resolvePath(profile, nuance.field), undefined,
          `${nuance.field} doit être un chemin réel du profil, sinon la traçabilité est fictive`);
      }
    }
  }
  assert.ok(checked.size >= 6, `au moins 6 champs distincts doivent porter des nuances, trouvé ${checked.size}`);

  // --- 9. La profondeur atteint la recommandation --------------------------
  const leaveIn = engineProduct({ id: 'leave_in', name: 'Lait hydratant', needs: ['hydrater_cheveux'], routineStep: 'leave_in' });
  const richResult = buildRecommendations([leaveIn], { profile: rich, shelf: [], observations: [] });
  const richRec = richResult.recommendations[0];
  assert.ok(richRec.needNuances.length > 0, 'la recommandation doit remonter les nuances');
  assert.ok(richRec.needNuances.some(n => n.field === 'hair.porosity'), 'la nuance de porosité doit atteindre la recommandation');

  const sparseResult = buildRecommendations([leaveIn], { profile: sparse, shelf: [], observations: [] });
  assert.deepEqual(sparseResult.recommendations[0].needNuances, [],
    'sur un profil peu renseigné, la recommandation ne doit pas inventer de nuance');

  // --- 10. Les nuances ne volent pas la première raison affichée -----------
  // `recommendationsForSlugs` affiche `reasons[0]`.
  const firstReason = fitFor(['hydrater_cheveux'], rich).reasons[0];
  assert.ok(firstReason, 'au moins une raison doit être produite');
  assert.ok(!fitFor(['hydrater_cheveux'], rich).needSignals[0].nuances.some(n => firstReason.includes(n.advice)),
    'la première raison doit rester l’explication de pertinence, pas un détail de geste');

  console.log(
    `[PASS] Profondeur des besoins de fibre : ${FIBRE_NEEDS.length} besoins approfondis, ${checked.size} champs porteurs de nuances, conseils discriminants par porosité, épaisseur et élasticité, aucune nuance sans champ déclaré, éligibilité et score inchangés.`
  );
}

runNeedDepthTests().catch(error => {
  console.error('[FAIL] Profondeur des besoins de fibre :', error);
  process.exitCode = 1;
});
