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

process.env.KURLA_TEST_NO_SERVER = 'true';

const { buildTextureGapReport, TEXTURE_GAP_CAVEATS } = await import('../src/lib/textureGap');
const { DEFAULT_K_ANONYMITY_THRESHOLD } = await import('../src/lib/archetype');

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

console.log(
  `[PASS] Chantier 8.6a — Texture Gap Report : k-anonymité appliquée (cellule sous ${DEFAULT_K_ANONYMITY_THRESHOLD} absente du rapport, ` +
    `${smallCohort.totals.suppressedMembers} membres comptés non publiés), ${report.totals.blindSpots} angles morts classés par cohorte ` +
    `(${report.blindSpots.map(cell => `${cell.archetypeLabel}/${cell.concern} ${cell.memberCount}`).join(', ')}), ` +
    `couverture ${hydration.coverage} en partiel, trou de donnée jamais présenté comme un angle mort, aucun ratio inventé.`
);
