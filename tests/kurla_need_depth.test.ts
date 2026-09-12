import assert from 'node:assert/strict';
import { FIBRE_NEEDS, STYLE_NEEDS, SCALP_NEEDS, SKIN_NEEDS, assessNeedDepth } from '../src/lib/needDepth';
import { RECOGNIZED_NEED_CODES, calculateKurlaFit } from '../src/lib/kurlaFit';
import { normalizeBeautyProfile, BeautyProfile } from '../src/lib/beautyProfile';
import { buildRecommendations, EngineProduct } from '../src/lib/recommendationEngine';

/**
 * BANC D1 + D2 — « deux profils différents ne reçoivent pas le même conseil ».
 *
 * Fait déclencheur, mesuré dans le code : les 21 branches de `calculateKurlaFit`
 * retournaient un booléen. `hydrater_cheveux` était vrai de la même façon pour
 * un 4C à porosité faible et pour un 2A à porosité forte, alors que le geste
 * conseillé est opposé. La porosité figurait dans les preuves affichées sans
 * jamais changer la décision.
 *
 * Ce banc est comportemental : il exécute `calculateKurlaFit` et
 * `buildRecommendations`, pas une copie de leur logique. Quatre propriétés sont
 * tenues ensemble, parce que chacune isolée ne prouve rien :
 *
 *  1. deux profils qui ne diffèrent que par un champ reçoivent des conseils
 *     différents ;
 *  2. cette différence ne change ni l'éligibilité ni le score — sinon on aurait
 *     déplacé le problème au lieu de l'élargir ;
 *  3. aucune nuance n'existe sans le champ déclaré qui la fonde — sinon KURLA
 *     inventerait une caractéristique pour se donner un conseil à formuler ;
 *  4. D2 ne redit pas ce que `styleFit.ts` établit déjà. Une duplication
 *     serait invisible à l'œil et produirait deux fois la même phrase à
 *     l'utilisateur.
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

/** Profil riche côté coiffure : D2 lit d'autres champs que D1. */
const RICH_STYLE = {
  protectiveStyles: ['tresses', 'locks', 'perruque'],
  stylingHabits: ['chaleur', 'coiffures_serrees'],
  washFrequency: 'une_fois_semaine',
  availableTime: 'moins_15_min',
  length: 'long',
  density: 'forte',
  porosity: 'forte',
  strandThickness: 'fine',
  texturePatterns: ['4C'],
  coloring: 'decoloration',
  chemicalTreatments: ['defrisage'],
  fiberCondition: 'fragile',
  breakage: 'frequente',
  dryness: 'forte'
};

const RICH_SKIN = { sensitivity: 'elevee', activeTolerance: 'faible' };

/** Profil riche côté cuir chevelu et barbe : D3 lit d'autres champs encore. */
const RICH_SCALP = {
  scalpCondition: 'sec',
  scalpConcerns: ['pellicules', 'demangeaisons'],
  washFrequency: 'plusieurs_fois_semaine',
  facialHair: 'dense'
};

const RICH_SCALP_SKIN = { sensitivity: 'elevee', activeTolerance: 'faible', acne: 'reguliere', hydration: 'seche' };

/** Profil riche côté peau : chantier E. */
const RICH_SKIN_PROFILE = {
  spfUsage: 'jamais',
  sunExposure: 'forte',
  hyperpigmentationTendency: 'frequente',
  postInflammatoryMarks: 'frequentes',
  acne: 'reguliere',
  sensitivity: 'elevee',
  activeTolerance: 'faible',
  hydration: 'seche',
  skinType: 'grasse',
  texturePreference: 'fluide',
  finishPreference: 'mat',
  skinConcerns: ['teint_terne', 'teint_non_uniforme', 'rougeurs', 'rides', 'fermete', 'points_noirs', 'secheresse']
};

const RICH_SKIN_ENV = { climate: 'froid_sec', humidity: 'faible' };

function profileWith(
  hair: Record<string, unknown>,
  extra: { skin?: Record<string, unknown>; environment?: Record<string, unknown> } = {}
): BeautyProfile {
  return normalizeBeautyProfile({ hair, skin: extra.skin, environment: extra.environment }) as BeautyProfile;
}

function fitFor(needs: string[], profile: BeautyProfile) {
  return calculateKurlaFit({ category: 'cheveux', needs } as never, profile);
}

function signalOf(needs: string[], profile: BeautyProfile, code: string) {
  const signal = fitFor(needs, profile).needSignals.find(entry => entry.code === code);
  assert.ok(signal, `le besoin ${code} doit produire un signal`);
  return signal!;
}

function adviceFor(profile: BeautyProfile, need: string, field: string) {
  return signalOf([need], profile, need).nuances.find(n => n.field === field)?.advice;
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

/**
 * Formulations déjà produites par `styleFit.ts`. D2 ne doit pas les redire :
 * l'utilisateur verrait deux fois la même phrase, produite par deux modules qui
 * ne se connaissent pas.
 */
/**
 * Formulations déjà produites ailleurs. D1–D3 ne doivent pas les redire :
 * l'utilisateur verrait deux fois la même phrase, produite par des modules qui
 * ne se connaissent pas.
 *
 * - les cinq premières viennent de `styleFit.ts`, qui alimente la même sortie
 *   que le moteur ;
 * - les trois dernières viennent de `needsHub.ts`, surface éditoriale distincte
 *   (`NEEDS_HUB` n'est lu que par `needTexturePages.ts` et `NeedHubPage.tsx`).
 *   Le doublon n'y serait pas visible au même endroit, mais KURLA ne doit pas
 *   tenir deux fois le même discours médical.
 */
const RESERVED_BY_STYLE_FIT = [
  'texture fluide',
  'seule zone réellement accessible',
  'occlusif de la formule',
  'retirez la perruque la nuit',
  'lavage clarifiant régulier',
  'consultez un dermatologue',
  'avis dermatologique',
  'doivent être montrés à un dermatologue',
  // `skinRecommendation.ts` — SKIN_INCOMPATIBILITIES. Autre surface (boutique
  // et skinRoutine.ts), mais E ne doit pas reformuler ces règles d'association.
  'Rétinol + AHA',
  'Rétinol + BHA',
  'Rétinol + vitamine C',
  'AHA + BHA'
];

async function runNeedDepthTests(): Promise<void> {
  // --- 1. Périmètre déclaré ------------------------------------------------
  assert.deepEqual(
    [...FIBRE_NEEDS].sort(),
    ['definir_boucles', 'demeler_cheveux', 'hydrater_cheveux', 'reduire_casse', 'reduire_frisottis'],
    'D1 porte sur exactement cinq besoins de fibre'
  );
  assert.deepEqual(
    [...STYLE_NEEDS].sort(),
    ['entretenir_locks', 'entretenir_perruque', 'entretenir_tresses', 'proteger_chaleur', 'proteger_nuit'],
    'D2 porte sur exactement cinq besoins de coiffure'
  );
  const overlap = (STYLE_NEEDS as readonly string[]).filter(need => (FIBRE_NEEDS as readonly string[]).includes(need));
  assert.deepEqual(overlap, [], 'un besoin ne peut pas relever des deux chantiers');
  assert.deepEqual(
    [...SCALP_NEEDS].sort(),
    ['apaiser_cuir_chevelu', 'barbe', 'cuir_chevelu'],
    'D3 porte sur exactement trois besoins'
  );
  assert.deepEqual(
    [...SKIN_NEEDS].sort(),
    ['barriere_cutanee', 'eclat_teint_terne', 'hydrater_peau', 'imperfections_acne',
      'maturite_rides', 'peau_sensible', 'protection_solaire', 'taches_hyperpigmentation'],
    'E porte sur exactement huit besoins peau'
  );
  const allDeepened = [...FIBRE_NEEDS, ...STYLE_NEEDS, ...SCALP_NEEDS, ...SKIN_NEEDS];
  assert.equal(new Set(allDeepened).size, 21, 'les quatre chantiers couvrent les 21 besoins sans chevauchement');
  const unlisted = allDeepened.filter(need => !(RECOGNIZED_NEED_CODES as readonly string[]).includes(need));
  assert.deepEqual(unlisted, [], 'un besoin approfondi hors vocabulaire reconnu serait un orphelin réintroduit');

  // === D1 — fibre =========================================================

  // --- 2. La porosité change le conseil, pas l'éligibilité -----------------
  const lowPorosity = profileWith({ ...RICH, porosity: 'faible' });
  const highPorosity = profileWith({ ...RICH, porosity: 'forte' });
  const fitLow = fitFor(['hydrater_cheveux'], lowPorosity);
  const fitHigh = fitFor(['hydrater_cheveux'], highPorosity);

  assert.deepEqual(fitLow.unmetNeeds, fitHigh.unmetNeeds, 'la porosité ne doit pas changer l’éligibilité du besoin');
  assert.equal(fitLow.score, fitHigh.score, 'la porosité ne doit pas changer le score (le chantier F s’en chargera)');

  const nuanceLow = fitLow.needSignals[0].nuances.find(n => n.field === 'hair.porosity');
  const nuanceHigh = fitHigh.needSignals[0].nuances.find(n => n.field === 'hair.porosity');
  assert.ok(nuanceLow && nuanceHigh, 'les deux profils doivent porter une nuance de porosité');
  assert.notEqual(nuanceLow!.advice, nuanceHigh!.advice, 'deux porosités opposées doivent recevoir deux conseils différents');
  assert.match(nuanceLow!.advice, /cuticule/, 'une porosité faible appelle un conseil sur la cuticule fermée');
  assert.match(nuanceHigh!.advice, /[Ss]celler/, 'une porosité forte appelle un conseil de scellement');

  // --- 3. Chaque besoin de fibre est effectivement approfondi --------------
  const rich = profileWith(RICH, { environment: { humidity: 'forte' } });
  for (const need of FIBRE_NEEDS) {
    const signal = signalOf([need], rich, need);
    assert.equal(signal.met, true, `${need} doit être couvert par le profil riche`);
    assert.ok(signal.nuances.length > 0, `${need} doit produire au moins une nuance sur un profil renseigné`);
  }

  const thick = profileWith({ ...RICH, strandThickness: 'epaisse' });
  const fine = profileWith({ ...RICH, strandThickness: 'fine' });
  assert.notEqual(
    adviceFor(thick, 'hydrater_cheveux', 'hair.strandThickness'),
    adviceFor(fine, 'hydrater_cheveux', 'hair.strandThickness'),
    'un cheveu fin et un cheveu épais ne reçoivent pas le même conseil d’hydratation'
  );

  const stiff = profileWith({ ...RICH, elasticity: 'faible' });
  const stretchy = profileWith({ ...RICH, elasticity: 'forte' });
  assert.notEqual(
    adviceFor(stiff, 'reduire_casse', 'hair.elasticity'),
    adviceFor(stretchy, 'reduire_casse', 'hair.elasticity'),
    'une élasticité faible et une élasticité trop forte appellent des gestes opposés'
  );
  assert.match(adviceFor(stretchy, 'reduire_casse', 'hair.elasticity')!, /excès d’hydratation/,
    'un cheveu mou doit être lu comme un excès d’hydratation, pas comme un manque');

  // --- 4. Aucune nuance sans champ déclaré --------------------------------
  const sparse = profileWith({ dryness: 'moyenne' });
  const sparseSignal = signalOf(['hydrater_cheveux'], sparse, 'hydrater_cheveux');
  assert.equal(sparseSignal.met, true, 'une sécheresse moyenne suffit à rendre le besoin pertinent');
  assert.deepEqual(sparseSignal.nuances, [],
    'sans porosité, épaisseur ni densité déclarées, KURLA ne doit formuler aucun geste différencié');
  assert.deepEqual(sparseSignal.limitations, [], 'un besoin de fibre n’a pas de limite à déclarer');

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
  const booleanRatio = fitFor(['hydrater_cheveux', 'reduire_casse', 'definir_boucles'], sparse);
  assert.deepEqual(booleanRatio.unmetNeeds, ['reduire_casse', 'definir_boucles']);
  assert.equal(booleanRatio.score, 33,
    'le score est toujours le ratio booléen. Quand le chantier F pondérera les besoins, cette assertion est celle qu’il faudra consciusement mettre à jour.');

  // === D2 — coiffure ======================================================

  const richStyle = profileWith(RICH_STYLE, { skin: RICH_SKIN });

  // --- 7. Chaque besoin de coiffure est approfondi -------------------------
  for (const need of STYLE_NEEDS) {
    const signal = signalOf([need], richStyle, need);
    assert.equal(signal.met, true, `${need} doit être couvert par le profil coiffure`);
    assert.ok(signal.nuances.length > 0, `${need} doit produire au moins une nuance sur un profil renseigné`);
  }

  // --- 8. Sensibilité cutanée sous perruque : discriminant -----------------
  const reactive = profileWith(RICH_STYLE, { skin: { sensitivity: 'elevee', activeTolerance: 'faible' } });
  const tolerant = profileWith(RICH_STYLE, { skin: { sensitivity: 'faible', activeTolerance: 'elevee' } });
  const fitReactive = fitFor(['entretenir_perruque'], reactive);
  const fitTolerant = fitFor(['entretenir_perruque'], tolerant);

  assert.deepEqual(fitReactive.unmetNeeds, fitTolerant.unmetNeeds,
    'la sensibilité cutanée ne doit pas changer l’éligibilité du besoin perruque');
  assert.equal(fitReactive.score, fitTolerant.score, 'la sensibilité cutanée ne doit pas changer le score');
  assert.ok(
    fitReactive.needSignals[0].nuances.length > fitTolerant.needSignals[0].nuances.length,
    'une peau déclarée réactive doit produire plus de conseils qu’une peau tolérante'
  );
  assert.ok(fitReactive.needSignals[0].intensity > fitTolerant.needSignals[0].intensity,
    'une peau réactive sous occlusion est un besoin plus pressant');

  // --- 9. Chaleur : la décoloration change le conseil et l'intensité -------
  const bleached = profileWith({ ...RICH_STYLE, coloring: 'decoloration' });
  const natural = profileWith({ ...RICH_STYLE, coloring: 'aucune', chemicalTreatments: ['aucun'] });
  const fitBleached = fitFor(['proteger_chaleur'], bleached);
  const fitNatural = fitFor(['proteger_chaleur'], natural);

  assert.deepEqual(fitBleached.unmetNeeds, fitNatural.unmetNeeds,
    'la coloration ne crée pas le besoin de protection thermique : l’usage d’outils chauffants le crée');
  assert.equal(fitBleached.score, fitNatural.score);
  assert.ok(fitBleached.needSignals[0].intensity > fitNatural.needSignals[0].intensity,
    'une fibre décolorée exposée à la chaleur est un besoin plus pressant');
  assert.ok(fitBleached.needSignals[0].nuances.some(n => n.field === 'hair.coloring'),
    'une fibre décolorée doit produire un conseil propre à la décoloration');
  assert.ok(!fitNatural.needSignals[0].nuances.some(n => n.field === 'hair.coloring'),
    'sans décoloration, aucun conseil de ce type ne doit apparaître');

  // --- 10. Une limite existe même sans aucune nuance -----------------------
  // Perruque portée, et rien d'autre de déclaré : aucun conseil différencié
  // n'est possible, mais ce que KURLA ignore reste dit.
  const bareWig = profileWith({ protectiveStyles: ['perruque'] });
  const bareSignal = signalOf(['entretenir_perruque'], bareWig, 'entretenir_perruque');
  assert.equal(bareSignal.met, true, 'une perruque portée suffit à rendre le besoin pertinent');
  assert.deepEqual(bareSignal.nuances, [], 'sans autre champ déclaré, aucun geste différencié ne doit être formulé');
  assert.ok(bareSignal.limitations.length >= 2, 'les deux lacunes du profil doivent être nommées');
  assert.ok(bareSignal.limitations.some(text => /fibre de la perruque/.test(text) && /synthétique/.test(text)),
    'la nature de la fibre de la perruque n’est déclarée nulle part : cela doit être dit');
  assert.ok(bareSignal.limitations.some(text => /fixation/.test(text)),
    'le mode de fixation n’est pas déclaré : cela doit être dit');

  // Une limite n'est pas conditionnelle : elle reste sur un profil riche.
  assert.ok(signalOf(['entretenir_perruque'], richStyle, 'entretenir_perruque').limitations.length >= 2,
    'la limite sur la fibre de la perruque ne dépend d’aucun champ déclaré');
  assert.ok(signalOf(['entretenir_locks'], richStyle, 'entretenir_locks').limitations.some(text => /stade des locks/.test(text)),
    'le stade des locks n’est pas déclaré : cela doit être dit');
  assert.ok(signalOf(['proteger_chaleur'], richStyle, 'proteger_chaleur').limitations.some(text => /température/.test(text)),
    'ni l’outil ni sa température ne sont déclarés : KURLA ne doit pas inventer de réglage');

  // Profil cuir chevelu et barbe : déclaré ici parce que le test
  // anti-duplication ci-dessous en a besoin avant la section D3.
  const richScalp = profileWith(RICH_SCALP, { skin: RICH_SCALP_SKIN, environment: { waterQuality: 'calcaire' } });
  const richSkin = profileWith({}, { skin: RICH_SKIN_PROFILE, environment: RICH_SKIN_ENV });

  // --- 11. D2 ne redit pas ce que styleFit établit déjà --------------------
  const duplicated: string[] = [];
  for (const need of [...STYLE_NEEDS, ...SCALP_NEEDS, ...SKIN_NEEDS]) {
    const profileForNeed = (SCALP_NEEDS as readonly string[]).includes(need) ? richScalp
      : (SKIN_NEEDS as readonly string[]).includes(need) ? richSkin
        : richStyle;
    const signal = signalOf([need], profileForNeed, need);
    for (const text of [...signal.nuances.map(n => n.advice), ...signal.limitations]) {
      for (const reserved of RESERVED_BY_STYLE_FIT) {
        if (text.includes(reserved)) duplicated.push(`${need} → « ${reserved} »`);
      }
    }
  }
  assert.deepEqual(duplicated, [],
    `D2/D3 reformulent ce que styleFit.ts ou needsHub.ts disent déjà : ${duplicated.join(' ; ')}`);

  // === D3 — cuir chevelu et barbe =========================================

  // --- 12. Chaque besoin D3 est approfondi ---------------------------------
  for (const need of SCALP_NEEDS) {
    const signal = signalOf([need], richScalp, need);
    assert.equal(signal.met, true, `${need} doit être couvert par le profil cuir chevelu`);
    assert.ok(signal.nuances.length > 0, `${need} doit produire au moins une nuance sur un profil renseigné`);
  }

  // --- 13. Cuir chevelu sec et cuir chevelu gras : conseils opposés ---------
  const dryScalp = profileWith({ ...RICH_SCALP, scalpCondition: 'sec' });
  const oilyScalp = profileWith({ ...RICH_SCALP, scalpCondition: 'gras' });
  const fitDry = fitFor(['cuir_chevelu'], dryScalp);
  const fitOily = fitFor(['cuir_chevelu'], oilyScalp);

  assert.deepEqual(fitDry.unmetNeeds, fitOily.unmetNeeds,
    'l’état du cuir chevelu ne doit pas changer l’éligibilité du besoin');
  assert.equal(fitDry.score, fitOily.score);
  const dryAdvice = adviceFor(dryScalp, 'cuir_chevelu', 'hair.scalpCondition');
  const oilyAdvice = adviceFor(oilyScalp, 'cuir_chevelu', 'hair.scalpCondition');
  assert.notEqual(dryAdvice, oilyAdvice, 'un cuir chevelu sec et un cuir chevelu gras reçoivent des conseils opposés');
  assert.match(dryAdvice!, /manque d’eau/, 'un cuir chevelu sec doit être lu comme un manque d’eau');
  assert.match(oilyAdvice!, /asséchant/, 'un cuir chevelu gras doit mettre en garde contre l’assèchement');

  // --- 14. Des squames ne se lisent pas pareil selon le cuir chevelu --------
  // La discrimination la plus utile de D3 : le même signe déclaré appelle deux
  // lectures différentes.
  const flakyDry = profileWith({ scalpCondition: 'sec', scalpConcerns: ['pellicules'] });
  const flakyOily = profileWith({ scalpCondition: 'gras', scalpConcerns: ['pellicules'] });
  const flakyDryAdvice = adviceFor(flakyDry, 'apaiser_cuir_chevelu', 'hair.scalpCondition');
  const flakyOilyAdvice = adviceFor(flakyOily, 'apaiser_cuir_chevelu', 'hair.scalpCondition');
  assert.notEqual(flakyDryAdvice, flakyOilyAdvice,
    'des squames sur cuir chevelu sec et sur cuir chevelu gras ne se traitent pas de la même façon');
  assert.match(flakyDryAdvice!, /desquame/, 'sur cuir chevelu sec, les squames peuvent venir de la sécheresse');
  assert.match(flakyOilyAdvice!, /pas comme une simple sécheresse/, 'sur cuir chevelu gras, la sécheresse n’est pas la bonne lecture');

  // --- 15. La barbe : le poil et la peau dessous ---------------------------
  const denseBeard = profileWith({ facialHair: 'dense' }, { skin: { sensitivity: 'elevee', acne: 'reguliere' } });
  const lightBeard = profileWith({ facialHair: 'leger' }, { skin: { sensitivity: 'faible', acne: 'aucune' } });
  const fitDense = fitFor(['barbe'], denseBeard);
  const fitLight = fitFor(['barbe'], lightBeard);

  assert.deepEqual(fitDense.unmetNeeds, fitLight.unmetNeeds,
    'la densité de la pilosité ne doit pas changer l’éligibilité du besoin');
  assert.equal(fitDense.score, fitLight.score);
  assert.ok(fitDense.needSignals[0].nuances.length > fitLight.needSignals[0].nuances.length,
    'une barbe dense sur peau réactive avec imperfections doit produire plus de conseils');
  assert.ok(fitDense.needSignals[0].nuances.some(n => /deux objets de soin/.test(n.advice)),
    'sous la barbe il y a le poil et la peau dessous : cette distinction doit être dite');
  assert.deepEqual(fitLight.needSignals[0].nuances, [],
    'pilosité légère sur peau sans particularité déclarée : aucun geste différencié ne doit être inventé');

  // --- 16. Limites D3 ------------------------------------------------------
  assert.ok(signalOf(['apaiser_cuir_chevelu'], richScalp, 'apaiser_cuir_chevelu').limitations.some(text => /pas une cause/.test(text)),
    'le profil déclare un signe, pas une cause : KURLA ne diagnostique pas et doit le dire');
  assert.ok(signalOf(['barbe'], richScalp, 'barbe').limitations.some(text => /longueur de la barbe/.test(text)),
    'la longueur de la barbe n’est déclarée nulle part : cela doit être dit');
  assert.deepEqual(signalOf(['cuir_chevelu'], richScalp, 'cuir_chevelu').limitations, [],
    'cuir_chevelu n’a pas de lacune de profil à déclarer');

  // === E — besoins peau ====================================================

  // --- 17. Chaque besoin peau est approfondi -------------------------------
  for (const need of SKIN_NEEDS) {
    const signal = signalOf([need], richSkin, need);
    assert.equal(signal.met, true, `${need} doit être couvert par le profil peau`);
    assert.ok(
      signal.nuances.length > 0 || signal.limitations.length > 0,
      `${need} doit produire au moins une nuance ou une limite`
    );
  }

  // --- 18. Sèche et déshydratée : deux besoins opposés ---------------------
  // La discrimination centrale de E, homologue de sec/gras en D3.
  const drySkin = profileWith({}, { skin: { hydration: 'seche' } });
  const dehydratedSkin = profileWith({}, { skin: { hydration: 'deshydratee' } });
  const fitDrySkin = fitFor(['hydrater_peau'], drySkin);
  const fitDehydrated = fitFor(['hydrater_peau'], dehydratedSkin);

  assert.deepEqual(fitDrySkin.unmetNeeds, fitDehydrated.unmetNeeds,
    'sèche et déshydratée rendent toutes deux le besoin pertinent');
  assert.equal(fitDrySkin.score, fitDehydrated.score);
  const drySkinAdvice = adviceFor(drySkin, 'hydrater_peau', 'skin.hydration');
  const dehydratedAdvice = adviceFor(dehydratedSkin, 'hydrater_peau', 'skin.hydration');
  assert.notEqual(drySkinAdvice, dehydratedAdvice,
    'une peau sèche et une peau déshydratée appellent des produits opposés');
  assert.match(drySkinAdvice!, /manque est du gras/, 'une peau sèche manque de lipides');
  assert.match(dehydratedAdvice!, /manque est de l’eau/, 'une peau déshydratée manque d’eau');

  // --- 19. Grasse ET déshydratée : le cas le plus mal traité ---------------
  const oilyDehydrated = profileWith({}, { skin: { hydration: 'deshydratee', skinType: 'grasse' } });
  assert.ok(
    signalOf(['hydrater_peau'], oilyDehydrated, 'hydrater_peau').nuances.some(n => n.field === 'skin.skinType'),
    'une peau grasse et déshydratée doit être nommée comme telle, pas comme une contradiction'
  );

  // --- 20. Taches : l'imperfection est en amont ----------------------------
  const marksWithAcne = profileWith({}, { skin: { postInflammatoryMarks: 'frequentes', acne: 'reguliere', spfUsage: 'quotidien' } });
  const marksAlone = profileWith({}, { skin: { postInflammatoryMarks: 'frequentes', acne: 'aucune', spfUsage: 'quotidien' } });
  const fitMarksAcne = fitFor(['taches_hyperpigmentation'], marksWithAcne);
  const fitMarksAlone = fitFor(['taches_hyperpigmentation'], marksAlone);

  assert.deepEqual(fitMarksAcne.unmetNeeds, fitMarksAlone.unmetNeeds,
    'l’acné ne crée pas le besoin de traiter les marques, elle en change la lecture');
  assert.equal(fitMarksAcne.score, fitMarksAlone.score);
  assert.ok(fitMarksAcne.needSignals[0].nuances.some(n => n.field === 'skin.acne'),
    'des marques avec imperfections actives doivent renvoyer à la cause');
  assert.ok(!fitMarksAlone.needSignals[0].nuances.some(n => n.field === 'skin.acne'),
    'sans imperfection déclarée, aucun conseil de ce type ne doit apparaître');
  assert.ok(fitMarksAcne.needSignals[0].intensity > fitMarksAlone.needSignals[0].intensity,
    'des marques entretenues par une inflammation active sont un besoin plus pressant');

  // --- 21. Ridules : déshydratation ou rides installées --------------------
  const linesDry = profileWith({}, { skin: { skinConcerns: ['rides'], hydration: 'seche' } });
  const linesHydrated = profileWith({}, { skin: { skinConcerns: ['rides'], hydration: 'confortable' } });
  assert.ok(
    signalOf(['maturite_rides'], linesDry, 'maturite_rides').nuances.some(n => /déshydratation/.test(n.advice)),
    'des ridules sur peau sèche doivent d’abord être lues comme une déshydratation'
  );
  assert.ok(
    !signalOf(['maturite_rides'], linesHydrated, 'maturite_rides').nuances.some(n => /déshydratation/.test(n.advice)),
    'sur une peau hydratée, cette lecture ne doit pas apparaître'
  );

  // --- 22. SPF : l'usage déclaré change le conseil -------------------------
  const noSpf = profileWith({}, { skin: { spfUsage: 'jamais', sunExposure: 'faible' } });
  const dailySpf = profileWith({}, { skin: { spfUsage: 'quotidien', sunExposure: 'forte' } });
  assert.notEqual(
    adviceFor(noSpf, 'protection_solaire', 'skin.spfUsage'),
    adviceFor(dailySpf, 'protection_solaire', 'skin.spfUsage'),
    'une personne qui ne met jamais de SPF et une personne qui en met tous les jours ne reçoivent pas le même conseil'
  );

  // --- 23. Limites E -------------------------------------------------------
  assert.ok(signalOf(['protection_solaire'], richSkin, 'protection_solaire').limitations.some(t => /jamais son indice/.test(t)),
    'le profil déclare la fréquence d’usage du SPF, pas son indice');
  assert.ok(signalOf(['taches_hyperpigmentation'], richSkin, 'taches_hyperpigmentation').limitations.some(t => /nature des taches/.test(t)),
    'la nature des taches n’est pas déclarée');
  assert.ok(signalOf(['imperfections_acne'], richSkin, 'imperfections_acne').limitations.some(t => /sévérité/.test(t)),
    'la sévérité des imperfections n’est pas déclarée');
  assert.ok(signalOf(['eclat_teint_terne'], richSkin, 'eclat_teint_terne').limitations.some(t => /perception/.test(t)),
    'l’éclat est une perception, pas une grandeur mesurée');
  assert.ok(signalOf(['maturite_rides'], richSkin, 'maturite_rides').limitations.some(t => /anti-âge/.test(t)),
    'KURLA ne vérifie aucune revendication anti-âge');
  assert.ok(signalOf(['barriere_cutanee'], richSkin, 'barriere_cutanee').limitations.some(t => /déduit/.test(t)),
    'l’état de la barrière est déduit, pas mesuré');
  assert.ok(signalOf(['peau_sensible'], richSkin, 'peau_sensible').limitations.some(t => /auto-déclaré/.test(t)),
    'la sensibilité est auto-déclarée, pas mesurée');

  // --- 24. Les 21 besoins sont couverts, un code inconnu ne produit rien ---
  const deepenedByChantier: Array<[string, BeautyProfile]> = [
    ...(FIBRE_NEEDS as readonly string[]).map(need => [need, rich] as [string, BeautyProfile]),
    ...(STYLE_NEEDS as readonly string[]).map(need => [need, richStyle] as [string, BeautyProfile]),
    ...(SCALP_NEEDS as readonly string[]).map(need => [need, richScalp] as [string, BeautyProfile]),
    ...(SKIN_NEEDS as readonly string[]).map(need => [need, richSkin] as [string, BeautyProfile])
  ];
  assert.equal(deepenedByChantier.length, 21, 'les 21 besoins reconnus doivent être couverts');
  for (const [need, profile] of deepenedByChantier) {
    const depth = assessNeedDepth(need, profile);
    assert.ok(depth.nuances.length > 0 || depth.limitations.length > 0,
      `${need} ne produit ni nuance ni limite sur un profil riche : il n’est pas réellement approfondi`);
  }

  // Un code hors vocabulaire ne doit rien produire : ni conseil, ni limite.
  const unknownNeed = assessNeedDepth('blanchir_la_peau', richSkin);
  assert.deepEqual(unknownNeed, { intensity: 0, nuances: [], limitations: [] },
    'un besoin hors vocabulaire ne doit produire aucun conseil inventé');

  // --- 25. Frontière honnête : il ne reste plus de besoin non traité -------
  const untouched = (RECOGNIZED_NEED_CODES as readonly string[])
    .filter(need => !([...FIBRE_NEEDS, ...STYLE_NEEDS, ...SCALP_NEEDS, ...SKIN_NEEDS] as readonly string[]).includes(need));
  assert.deepEqual(untouched, [], 'aucun besoin reconnu ne doit rester sans profondeur');

  // --- 13. Chaque nuance cite un chemin réel du profil ----------------------
  const checked = new Set<string>();
  const profiles: Array<[string, BeautyProfile]> = [
    ['rich', rich], ['lowPorosity', lowPorosity], ['highPorosity', highPorosity],
    ['thick', thick], ['stiff', stiff], ['stretchy', stretchy],
    ['richStyle', richStyle], ['reactive', reactive], ['tolerant', tolerant],
    ['bleached', bleached], ['natural', natural],
    ['richScalp', richScalp], ['dryScalp', dryScalp], ['oilyScalp', oilyScalp],
    ['flakyDry', flakyDry], ['flakyOily', flakyOily],
    ['denseBeard', denseBeard], ['lightBeard', lightBeard],
    ['richSkin', richSkin], ['drySkin', drySkin], ['dehydratedSkin', dehydratedSkin],
    ['oilyDehydrated', oilyDehydrated], ['marksWithAcne', marksWithAcne],
    ['linesDry', linesDry], ['noSpf', noSpf], ['dailySpf', dailySpf]
  ];
  for (const [label, profile] of profiles) {
    for (const need of [...FIBRE_NEEDS, ...STYLE_NEEDS, ...SCALP_NEEDS, ...SKIN_NEEDS]) {
      for (const nuance of signalOf([need], profile, need).nuances) {
        checked.add(nuance.field);
        assert.notEqual(resolvePath(profile, nuance.field), undefined,
          `${nuance.field} (${label}) doit être un chemin réel du profil, sinon la traçabilité est fictive`);
      }
    }
  }
  assert.ok(checked.size >= 24, `au moins 24 champs distincts doivent porter des nuances, trouvé ${checked.size}`);

  // --- 14. La profondeur atteint la recommandation --------------------------
  const leaveIn = engineProduct({ id: 'leave_in', name: 'Lait hydratant', needs: ['hydrater_cheveux'], routineStep: 'leave_in' });
  const richResult = buildRecommendations([leaveIn], { profile: rich, shelf: [], observations: [] });
  const richRec = richResult.recommendations[0];
  assert.ok(richRec.needNuances.length > 0, 'la recommandation doit remonter les nuances');
  assert.ok(richRec.needNuances.some(n => n.field === 'hair.porosity'), 'la nuance de porosité doit atteindre la recommandation');
  assert.deepEqual(richRec.needLimitations, [], 'un besoin de fibre ne remonte aucune limite');

  const sparseResult = buildRecommendations([leaveIn], { profile: sparse, shelf: [], observations: [] });
  assert.deepEqual(sparseResult.recommendations[0].needNuances, [],
    'sur un profil peu renseigné, la recommandation ne doit pas inventer de nuance');

  const wigCare = engineProduct({ id: 'wig_care', name: 'Soin perruque', needs: ['entretenir_perruque'], routineStep: 'cleanse' });
  const wigRec = buildRecommendations([wigCare], { profile: bareWig, shelf: [], observations: [] }).recommendations[0];
  assert.ok(wigRec.needLimitations.length >= 2, 'les limites doivent atteindre la recommandation, pas seulement le moteur');

  // --- 15. Les nuances ne volent pas la première raison affichée -----------
  const firstReason = fitFor(['hydrater_cheveux'], rich).reasons[0];
  assert.ok(firstReason, 'au moins une raison doit être produite');
  assert.ok(!fitFor(['hydrater_cheveux'], rich).needSignals[0].nuances.some(n => firstReason.includes(n.advice)),
    'la première raison doit rester l’explication de pertinence, pas un détail de geste');

  console.log(
    `[PASS] Profondeur des besoins : ${FIBRE_NEEDS.length} de fibre (D1), ${STYLE_NEEDS.length} de coiffure (D2), ${SCALP_NEEDS.length} de cuir chevelu et barbe (D3) et ${SKIN_NEEDS.length} peau (E) — les 21 besoins du vocabulaire, un code inconnu ne produisant rien — ${checked.size} champs porteurs de nuances, 13 limites nommées, aucune duplication de styleFit, needsHub ni skinRecommendation, éligibilité et score inchangés.`
  );
}

runNeedDepthTests().catch(error => {
  console.error('[FAIL] Profondeur des besoins :', error);
  process.exitCode = 1;
});
