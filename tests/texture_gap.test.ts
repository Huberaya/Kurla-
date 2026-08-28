/**
 * CHANTIER 8.6a — Texture Gap Report (B2B).
 *
 * Ce banc ne vérifie pas un rendu : il vérifie les trois garde-fous qui rendent
 * ce rapport vendable sans trahir la confiance des membres.
 *
 *   1. k-anonymité appliquée : une cellule sous le seuil n'est PAS dans le
 *      rapport. Pas « marquée non publiable » — absente, avec son contenu.
 *   2. Un trou de donnée n'est jamais présenté comme un angle mort.
 *   3. Aucun ratio inventé : sans dénominateur, `coverage` vaut `null`.
 */
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.KURLA_TEST_NO_SERVER = 'true';

const { aggregateTextureGap, buildTextureGapReport, concernsFromProfile, TEXTURE_GAP_CAVEATS } = await import('../src/lib/textureGap');
const { DEFAULT_K_ANONYMITY_THRESHOLD, deriveArchetype } = await import('../src/lib/archetype');
const { calculateProfileConfidence, normalizeBeautyProfile } = await import('../src/lib/beautyProfile');
const { serverDb } = await import('../src/lib/serverDb');
const serverModule = await import('../server');

const labels = {
  afro_coily: 'Afro crépus',
  afro_curly: 'Afro bouclés',
  frizzy: 'Frisés sensibles'
};

// ---------------------------------------------------------------------------
// 1. k-anonymité : la cellule sous le seuil disparaît du rapport
// ---------------------------------------------------------------------------
const smallCohort = buildTextureGapReport({
  demand: [
    { archetypeId: 'afro_coily', concern: 'casse', memberCount: DEFAULT_K_ANONYMITY_THRESHOLD - 1 },
    { archetypeId: 'afro_curly', concern: 'casse', memberCount: DEFAULT_K_ANONYMITY_THRESHOLD }
  ],
  supply: [],
  labels,
  supplyGraphComplete: true
});

assert.equal(smallCohort.totals.demandRows, 2, 'deux lignes de demande en entrée');
assert.equal(smallCohort.totals.publishedCells, 1, 'une seule cellule est publiable');
assert.equal(smallCohort.totals.suppressedCells, 1, 'la cellule sous k est supprimée');
assert.equal(smallCohort.totals.suppressedMembers, DEFAULT_K_ANONYMITY_THRESHOLD - 1, 'et ses membres sont comptés, pas publiés');
assert.ok(
  !smallCohort.cells.some(cell => cell.memberCount < DEFAULT_K_ANONYMITY_THRESHOLD),
  'aucune cellule sous le seuil ne doit apparaître dans le rapport'
);
assert.ok(
  !JSON.stringify(smallCohort.cells).includes('afro_coily'),
  'l’archétype de la cellule supprimée ne doit pas fuiter dans le rapport'
);
assert.equal(smallCohort.kThreshold, DEFAULT_K_ANONYMITY_THRESHOLD, 'le seuil est celui du projet, pas un seuil maison');

// ---------------------------------------------------------------------------
// 2. Angles morts, couverture partielle, couverture complète
// ---------------------------------------------------------------------------
const report = buildTextureGapReport({
  demand: [
    { archetypeId: 'afro_coily', concern: 'casse', memberCount: 420 },
    { archetypeId: 'afro_coily', concern: 'hydratation', memberCount: 380 },
    { archetypeId: 'afro_curly', concern: 'cuir chevelu sensible', memberCount: 120 },
    { archetypeId: 'frizzy', concern: 'frisottis', memberCount: 45 }
  ],
  supply: [
    { archetypeId: 'afro_coily', concern: 'casse', productCount: 3, publishedProductCount: 0 },
    { archetypeId: 'afro_coily', concern: 'hydratation', productCount: 4, publishedProductCount: 2 },
    { archetypeId: 'afro_curly', concern: 'cuir chevelu sensible', productCount: 2, publishedProductCount: 2 },
    { archetypeId: 'frizzy', concern: 'frisottis', productCount: 0, publishedProductCount: 0 }
  ],
  labels,
  supplyGraphComplete: true,
  generatedAt: '2026-08-28T00:00:00.000Z'
});

const byConcern = new Map(report.cells.map(cell => [`${cell.archetypeId}/${cell.concern}`, cell]));
const breakage = byConcern.get('afro_coily/casse')!;
assert.equal(breakage.verdict, 'angle_mort', '3 produits associés, aucun publié : angle mort');
assert.equal(breakage.coverage, 0, 'couverture nulle');
assert.equal(breakage.memberCount, 420, 'la cohorte est publiée parce qu’au-dessus du seuil');

const hydration = byConcern.get('afro_coily/hydratation')!;
assert.equal(hydration.verdict, 'partiel', '2 publiés sur 4 associés : partiel');
assert.equal(hydration.coverage, 0.5, 'la couverture est le rapport publié / associé');

const scalp = byConcern.get('afro_curly/cuir chevelu sensible')!;
assert.equal(scalp.verdict, 'couvert', 'tout est publié : couvert');
assert.equal(scalp.coverage, 1, 'couverture complète');

const frizz = byConcern.get('frizzy/frisottis')!;
assert.equal(frizz.verdict, 'angle_mort', 'aucun produit associé du tout : angle mort');

assert.equal(report.totals.blindSpots, 2, 'deux angles morts');
assert.equal(report.blindSpots[0].memberCount, 420, 'les angles morts sont classés du plus peuplé au moins peuplé');
assert.equal(report.blindSpots[1].memberCount, 45, 'le second angle mort vient après');
assert.equal(report.totals.covered, 1, 'une cellule couverte');
assert.equal(report.totals.partial, 1, 'une cellule partielle');
assert.equal(report.totals.suppressedCells, 0, 'toutes les cohortes sont au-dessus du seuil ici');
assert.equal(report.totals.membersInPublishedCells, 965, 'le total des membres des cellules publiées');

const sortedCounts = report.cells.map(cell => cell.memberCount);
assert.ok(
  sortedCounts.every((value, index) => index === 0 || value <= sortedCounts[index - 1]),
  'les cellules sont triées par cohorte décroissante'
);

// ---------------------------------------------------------------------------
// 3. Un trou de donnée n'est pas un angle mort
// ---------------------------------------------------------------------------
const incompleteGraph = buildTextureGapReport({
  demand: [{ archetypeId: 'afro_coily', concern: 'casse', memberCount: 500 }],
  supply: [],
  labels,
  supplyGraphComplete: false
});
assert.equal(incompleteGraph.cells[0].verdict, 'donnees_insuffisantes', 'graphe incomplet : on ne conclut pas');
assert.equal(incompleteGraph.cells[0].coverage, null, 'aucun ratio inventé sans dénominateur connu');
assert.equal(incompleteGraph.totals.blindSpots, 0, 'un trou de donnée ne compte pas comme un angle mort');
assert.match(incompleteGraph.cells[0].explanation, /inconnue/, 'l’explication dit que la couverture est inconnue');

// Le même besoin, graphe complet, devient un angle mort : c'est la différence
// entre « on ne sait pas » et « il n'y a rien ».
const completeGraph = buildTextureGapReport({
  demand: [{ archetypeId: 'afro_coily', concern: 'casse', memberCount: 500 }],
  supply: [],
  labels,
  supplyGraphComplete: true
});
assert.equal(completeGraph.cells[0].verdict, 'angle_mort', 'graphe complet et rien d’associé : angle mort réel');
assert.equal(completeGraph.cells[0].coverage, 0, 'la couverture est mesurée à zéro');

// ---------------------------------------------------------------------------
// 4. Rapport vide : rien n'est inventé
// ---------------------------------------------------------------------------
const empty = buildTextureGapReport({ demand: [], supply: [], labels, supplyGraphComplete: true });
assert.equal(empty.cells.length, 0, 'aucune cellule');
assert.equal(empty.blindSpots.length, 0, 'aucun angle mort');
assert.equal(empty.totals.membersInPublishedCells, 0, 'aucun membre compté');
assert.equal(empty.caveats.length, TEXTURE_GAP_CAVEATS.length, 'les réserves sont toujours présentes');
assert.ok(
  empty.caveats.some(caveat => caveat.includes('k-anonymité')),
  'la réserve sur la k-anonymité est permanente'
);
assert.ok(
  empty.caveats.some(caveat => caveat.includes('déclarations')),
  'la nature déclarative des données est rappelée'
);

// ---------------------------------------------------------------------------
// 5. Le seuil est paramétrable, et le durcir supprime davantage
// ---------------------------------------------------------------------------
const stricter = buildTextureGapReport({
  demand: [{ archetypeId: 'afro_coily', concern: 'casse', memberCount: 80 }],
  supply: [],
  labels,
  supplyGraphComplete: true,
  kThreshold: 100
});
assert.equal(stricter.kThreshold, 100, 'le seuil demandé est appliqué');
assert.equal(stricter.cells.length, 0, 'une cohorte de 80 sous un seuil de 100 est supprimée');
assert.equal(stricter.totals.suppressedCells, 1, 'et comptée comme supprimée');

// ---------------------------------------------------------------------------
// 6. Extraction des préoccupations : « rien » et « je ne sais pas » ne comptent pas
// ---------------------------------------------------------------------------
const declaredProfile = normalizeBeautyProfile({
  hair: { curlPattern: '4c', scalpConcerns: ['pellicules', 'aucun'], breakage: 'frequente', dryness: 'faible' },
  skin: { concernZones: ['inconnu'] }
});
const declaredConcerns = concernsFromProfile(declaredProfile);
assert.equal(declaredConcerns.length, 2, '« aucun » et « je ne sais pas » ne deviennent pas des préoccupations');
assert.ok(declaredConcerns.some(concern => concern.includes('Pellicules')), 'le signe déclaré est retenu, avec son libellé lisible');
assert.ok(declaredConcerns.some(concern => concern.includes('Casse fréquente')), 'l’état de la fibre déclaré est retenu');
assert.ok(
  !declaredConcerns.some(concern => concern.includes('Peu sèche')),
  'une sécheresse faible n’est pas transformée en besoin'
);
assert.deepEqual(concernsFromProfile(undefined), [], 'sans profil, aucune préoccupation inventée');

// ---------------------------------------------------------------------------
// 7. Agrégation : des lignes individuelles aux comptes k-anonymes
// ---------------------------------------------------------------------------
const aggregated = aggregateTextureGap({
  members: [
    ...Array.from({ length: 40 }, (_, index) => ({
      userId: `membre-${index}`,
      archetypeId: 'arch_a',
      archetypeLabel: 'Cheveux crépus · poreux',
      concerns: ['Fibre : Casse fréquente']
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      userId: `isolé-${index}`,
      archetypeId: 'arch_b',
      archetypeLabel: 'Cheveux ondulés',
      concerns: ['Fibre : Casse fréquente']
    }))
  ],
  products: [
    { id: 'p1', concerns: ['Fibre : Casse fréquente'], published: true, archetypeIds: ['arch_a'] },
    { id: 'p2', concerns: ['Fibre : Casse fréquente'], published: false, archetypeIds: ['arch_a'] }
  ],
  archetypeMappingComplete: true,
  generatedAt: '2026-08-28T00:00:00.000Z'
});

assert.equal(aggregated.totals.publishedCells, 1, 'seule la cohorte au-dessus du seuil est publiée');
assert.equal(aggregated.totals.suppressedCells, 1, 'la cohorte de 4 est supprimée');
assert.equal(aggregated.totals.suppressedMembers, 4, 'et ses membres sont comptés, pas publiés');
assert.equal(aggregated.cells[0].memberCount, 40, 'les 40 membres sont agrégés en une seule cellule');
assert.equal(aggregated.cells[0].archetypeLabel, 'Cheveux crépus · poreux', 'le libellé vient des lignes, pas d’un référentiel deviné');
assert.equal(aggregated.cells[0].productCount, 2, 'deux produits associés au besoin');
assert.equal(aggregated.cells[0].publishedProductCount, 1, 'dont un seul publié');
assert.equal(aggregated.cells[0].verdict, 'partiel', 'un publié sur deux : partiel');
assert.equal(aggregated.cells[0].coverage, 0.5, 'la couverture est mesurée');

// Un produit rattaché deux fois au même archétype ne compte qu'une fois.
const deduped = aggregateTextureGap({
  members: [{ userId: 'm1', archetypeId: 'arch_a', concerns: ['X'] }],
  products: [{ id: 'p1', concerns: ['X'], published: true, archetypeIds: ['arch_a', 'arch_a', 'arch_a'] }],
  archetypeMappingComplete: true,
  kThreshold: 1
});
assert.equal(deduped.cells[0].productCount, 1, 'un produit ne compte qu’une fois par cellule');

// Sans rattachement produit × archétype, la couverture est inconnue — pas nulle.
const unmapped = aggregateTextureGap({
  members: Array.from({ length: 40 }, (_, index) => ({ userId: `m${index}`, archetypeId: 'arch_a', concerns: ['X'] })),
  products: [{ id: 'p1', concerns: ['X'], published: true, archetypeIds: [] }],
  archetypeMappingComplete: false
});
assert.equal(unmapped.cells[0].verdict, 'donnees_insuffisantes', 'produit non rattaché : on ne conclut pas');
assert.equal(unmapped.totals.blindSpots, 0, 'et ce n’est pas compté comme un angle mort');

// ---------------------------------------------------------------------------
// 8. Bout en bout sur le store : catalogue vide, aucun angle mort affirmé
// ---------------------------------------------------------------------------
await serverDb.initialize([]);
const profile = normalizeBeautyProfile({
  hair: { curlPattern: '4c', porosity: 'haute', scalpConcerns: ['pellicules'], breakage: 'frequente' }
});
const confidence = calculateProfileConfidence(profile);
const archetype = deriveArchetype(profile);
for (let index = 0; index < 32; index += 1) {
  serverDb.inMemoryBeautyProfiles.set(`sonde-${index}`, {
    userId: `sonde-${index}`,
    profile,
    confidence,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z'
  });
}

const result = await serverDb.getTextureGapReport();
assert.equal(result.availability.membersRead, 32, 'les profils en mémoire sont lus');
assert.equal(result.availability.membersWithArchetype, 32, 'tous ont un archétype dérivé');
assert.equal(result.availability.publishedProducts, 0, 'aucun produit publié dans cette base');
assert.equal(result.availability.archetypeMappingComplete, false, 'sans graphe, la couverture n’est pas connue');
assert.equal(result.availability.persistence, 'server_fallback', 'l’origine des données est annoncée');
assert.match(result.availability.coverageNote, /ne peut pas être mesurée/, 'la note dit pourquoi la couverture est inconnue');
assert.ok(result.report.cells.length >= 1, 'la cohorte de 32 atteint le seuil et produit des cellules');
assert.ok(
  result.report.cells.every(cell => cell.memberCount >= DEFAULT_K_ANONYMITY_THRESHOLD),
  'aucune cellule sous le seuil ne sort du store'
);
assert.ok(
  result.report.cells.every(cell => cell.verdict === 'donnees_insuffisantes'),
  'catalogue vide : le rapport déclare des données insuffisantes, pas des angles morts'
);
assert.equal(result.report.totals.blindSpots, 0, 'aucun angle mort affirmé sans catalogue');
assert.equal(
  new Set(result.report.cells.map(cell => cell.archetypeId)).size,
  1,
  'des profils identiques tombent dans le même archétype'
);
assert.equal(result.report.cells[0].archetypeLabel, archetype.labelFr, 'le libellé affiché est celui de l’archétype dérivé');

// ---------------------------------------------------------------------------
// 9. HTTP : le rapport est réservé à l'administration
// ---------------------------------------------------------------------------
async function requestApp(path: string) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`);
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

const forbidden = await requestApp('/api/intelligence/texture-gap');
assert.equal(forbidden.status, 401, 'le rapport refuse une requête sans jeton');

console.log(
  `[PASS] Chantier 8.6a — Texture Gap Report (cœur + agrégation + store) : k-anonymité appliquée (cellule sous ${DEFAULT_K_ANONYMITY_THRESHOLD} absente du rapport, ` +
    `${smallCohort.totals.suppressedMembers} membres comptés non publiés), ${report.totals.blindSpots} angles morts classés par cohorte ` +
    `(${report.blindSpots.map(cell => `${cell.archetypeLabel}/${cell.concern} ${cell.memberCount}`).join(', ')}), ` +
    `couverture ${hydration.coverage} en partiel, trou de donnée jamais présenté comme un angle mort, aucun ratio inventé, agrégation ${aggregated.cells[0].memberCount} membres → 1 cellule à ${aggregated.cells[0].coverage} de couverture, « aucun » et « je ne sais pas » non comptés comme besoins, store : ${result.report.cells.length} cellules sur ${result.availability.membersRead} profils, catalogue vide → ${result.report.totals.blindSpots} angle mort affirmé, route réservée à l’administration (401 sans jeton).`
);
