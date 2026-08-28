/**
 * CHANTIER 8.6b — API publique catalogue + scoring.
 *
 * Ce banc vérifie les propriétés qui rendent cette ouverture acceptable :
 *
 *   1. Le scoring est SANS ÉTAT : le profil envoyé n'est enregistré nulle part.
 *      Le banc compare l'état du store avant et après l'appel.
 *   2. Seuls les produits publiés sont servis ; un produit non publiable est
 *      indiscernable d'un identifiant inexistant.
 *   3. Aucun score n'est inventé : un profil vide produit des scores null.
 *   4. L'API annonce ce qu'elle ne fait pas : garanties, attribution, liste de
 *      ce qui n'est jamais exposé.
 */
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.KURLA_TEST_NO_SERVER = 'true';

const { serverDb } = await import('../src/lib/serverDb');
const serverModule = await import('../server');
const publicApi = await import('../src/server/routes/publicApi');

// ---------------------------------------------------------------------------
// Banc de requêtes HTTP
// ---------------------------------------------------------------------------
async function requestApp(path: string, init?: { method?: string; body?: unknown }) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: init?.method ?? 'GET',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: response.status, json, text };
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

// ---------------------------------------------------------------------------
// 1. Le manifeste dit ce que l'API ne fait pas
// ---------------------------------------------------------------------------
const manifest = await requestApp('/api/v1/manifest');
assert.equal(manifest.status, 200, 'le manifeste est public');
assert.equal(manifest.json.version, 'v1', 'la version est annoncée');
assert.equal(manifest.json.baseUrl, '/api/v1', 'la base est annoncée');
assert.ok(manifest.json.engagements.length >= 5, 'les engagements sont énoncés');
assert.ok(manifest.json.neverExposed.length >= 7, 'ce qui n’est jamais exposé est listé');
assert.ok(
  manifest.json.neverExposed.some((item: string) => item.includes('profils de membres')),
  'les profils de membres figurent explicitement parmi ce qui n’est pas exposé'
);
assert.ok(manifest.json.attribution.includes('KURLA Beauty'), 'l’attribution est exigée');
assert.equal(manifest.json.endpoints.length, 5, 'cinq endpoints déclarés');
assert.deepEqual(
  publicApi.PUBLIC_API_ENDPOINTS.map(endpoint => `${endpoint.method} ${endpoint.path}`).sort(),
  manifest.json.endpoints.map((endpoint: any) => `${endpoint.method} ${endpoint.path}`).sort(),
  'le manifeste liste exactement les endpoints montés'
);
assert.ok(
  manifest.json.endpoints.every((endpoint: any) => endpoint.auth === false),
  'aucun endpoint de l’API publique ne demande de compte'
);

// ---------------------------------------------------------------------------
// 2. Catalogue vide : une réponse honnête, pas une erreur
// ---------------------------------------------------------------------------
await serverDb.initialize([]);
const emptyCatalog = await requestApp('/api/v1/products');
assert.equal(emptyCatalog.status, 200, 'un catalogue vide est une réponse valide');
assert.equal(emptyCatalog.json.count, 0, 'zéro produit');
assert.deepEqual(emptyCatalog.json.products, [], 'liste vide');
assert.equal(emptyCatalog.json.total, 0, 'total cohérent');

const missing = await requestApp('/api/v1/products/produit-inexistant');
assert.equal(missing.status, 404, 'un produit inconnu renvoie 404');
assert.equal(missing.json.code, 'PRODUCT_NOT_FOUND', 'avec un code stable pour un tiers');

// ---------------------------------------------------------------------------
// 3. Seuls les produits publiés sont servis
// ---------------------------------------------------------------------------
const publishedRow = {
  id: 'prod-publie',
  slug: 'masque-hydratation',
  name: 'Masque hydratation',
  brand: 'Marque test',
  category: 'soin',
  price: 24.9,
  currency: 'EUR',
  concerns: ['hydrater_cheveux'],
  needs: ['hydrater_cheveux', 'reduire_casse'],
  ingredients: ['Aqua', 'Glycerin'],
  image: 'https://example.com/masque.jpg',
  countryAvailability: ['FR'],
  is_active: true,
  catalog_status: 'published',
  ingredient_verification_status: 'verified',
  claims_validation_status: 'verified',
  images_validation_status: 'verified',
  stock_validation_status: 'verified',
  certifications_validation_status: 'verified',
  translations_validation_status: 'verified',
  brand_verification_status: 'verified',
  image_ownership_status: 'brand_provided'
};
const unpublishedRow = { ...publishedRow, id: 'prod-retire', slug: 'masque-retire', name: 'Masque retiré', is_active: false };
const unverifiedRow = { ...publishedRow, id: 'prod-non-verifie', slug: 'masque-non-verifie', name: 'Masque non vérifié', claims_validation_status: 'pending' };
serverDb.inMemoryProducts = [publishedRow, unpublishedRow, unverifiedRow];

const catalog = await requestApp('/api/v1/products');
assert.equal(catalog.json.total, 1, 'un seul des trois produits est publiable');
assert.equal(catalog.json.products[0].id, 'prod-publie', 'le produit publié est servi');
assert.ok(!JSON.stringify(catalog.json).includes('prod-retire'), 'le produit retiré n’apparaît nulle part');
assert.ok(!JSON.stringify(catalog.json).includes('prod-non-verifie'), 'le produit non vérifié n’apparaît pas non plus');

const retired = await requestApp('/api/v1/products/prod-retire');
assert.equal(retired.status, 404, 'un produit retiré est indiscernable d’un produit inexistant');
const bySlug = await requestApp('/api/v1/products/masque-hydratation');
assert.equal(bySlug.status, 200, 'le slug fonctionne aussi');
assert.equal(bySlug.json.product.id, 'prod-publie', 'et renvoie le bon produit');

// ---------------------------------------------------------------------------
// 4. Le scoring est sans état : rien n'est enregistré
// ---------------------------------------------------------------------------
const profilePayload = {
  hair: { curlPattern: '4c', porosity: 'haute', breakage: 'frequente', dryness: 'forte', scalpConcerns: ['pellicules'] },
  skin: { toneDepth: 'profonde', sensitivity: 'sensible' }
};

const before = {
  profiles: serverDb.inMemoryBeautyProfiles.size,
  journal: serverDb.inMemoryRoutineJournal.size,
  aiSessions: serverDb.inMemoryAiSessions.size,
  loyaltyEvents: serverDb.inMemoryLoyaltyEvents.length,
  memberships: serverDb.inMemoryMemberships.size,
  feedback: serverDb.inMemoryRoutineFeedback.size
};

const scoringSchema = await requestApp('/api/v1/scoring/schema');
assert.equal(scoringSchema.status, 200, 'le schéma de scoring est public');
assert.ok(scoringSchema.json.note.includes('sans état'), 'le caractère sans état est annoncé');
assert.ok(Object.keys(scoringSchema.json.profileFields).length >= 8, 'les champs acceptés sont documentés');

const noProfile = await requestApp('/api/v1/scoring/fit', { method: 'POST', body: {} });
assert.equal(noProfile.status, 400, 'un scoring sans profil est refusé');
assert.equal(noProfile.json.schemaUrl, '/api/v1/scoring/schema', 'et la réponse pointe vers le schéma');

const scored = await requestApp('/api/v1/scoring/fit', { method: 'POST', body: { profile: profilePayload } });
assert.equal(scored.status, 200, 'le scoring répond');
assert.equal(scored.json.evaluated, 1, 'un produit évalué');
assert.equal(scored.json.returned, 1, 'un résultat renvoyé');
assert.equal(scored.json.stateless, true, 'la réponse déclare le caractère sans état');
assert.ok(scored.json.disclaimer.includes('ni un diagnostic'), 'la réserve accompagne le score');
assert.equal(typeof scored.json.results[0].fit.confidence, 'number', 'la confiance est chiffrée');
assert.ok(Array.isArray(scored.json.results[0].fit.reasons), 'les raisons sont fournies');
assert.equal(scored.json.results[0].fit.evaluable, true, 'un profil renseigné est évaluable');
assert.equal(scored.json.results[0].fit.score, 100, 'les deux besoins du produit sont couverts par le profil déclaré');
assert.ok(scored.json.results[0].fit.confidence > 0, 'la confiance d’un profil renseigné est positive');
assert.ok(scored.json.results[0].fit.reasons.length >= 2, 'chaque besoin couvert produit une explication');

const after = {
  profiles: serverDb.inMemoryBeautyProfiles.size,
  journal: serverDb.inMemoryRoutineJournal.size,
  aiSessions: serverDb.inMemoryAiSessions.size,
  loyaltyEvents: serverDb.inMemoryLoyaltyEvents.length,
  memberships: serverDb.inMemoryMemberships.size,
  feedback: serverDb.inMemoryRoutineFeedback.size
};
assert.deepEqual(after, before, 'le scoring n’a rien écrit : ni profil, ni journal, ni session, ni fait de progression');

// Renvoyer au tiers les valeurs qu'il vient d'envoyer n'est pas une fuite :
// c'est sa propre requête. Ce qui compte, c'est qu'aucun identifiant de membre
// de KURLA n'apparaisse — et que rien ne soit écrit.
assert.ok(
  !/sonde-|membre-|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/.test(JSON.stringify(scored.json)),
  'aucun identifiant de membre ne doit apparaître dans la réponse'
);

// ---------------------------------------------------------------------------
// 5. Aucun score inventé : un profil vide ne classe rien
// ---------------------------------------------------------------------------
const emptyProfile = await requestApp('/api/v1/scoring/fit', { method: 'POST', body: { profile: {} } });
assert.equal(emptyProfile.status, 200, 'un profil vide est accepté');
assert.equal(
  emptyProfile.json.results.every((entry: any) => entry.fit.score === null),
  true,
  'sans champ déclaré, aucun score n’est inventé'
);
assert.equal(
  emptyProfile.json.results[0].fit.confidence,
  0,
  'la confiance d’un profil vide est nulle'
);
assert.equal(
  emptyProfile.json.results[0].fit.evaluable,
  false,
  'un profil vide n’est pas évaluable'
);
assert.ok(
  emptyProfile.json.results[0].fit.evaluationNote,
  'et la raison de la non-évaluation est donnée, pas devinée'
);
assert.equal(
  emptyProfile.json.results[0].fit.unmetNeeds.length,
  2,
  'les besoins non couverts restent listés même sans évaluation'
);

// ---------------------------------------------------------------------------
// 6. Garde éditoriale : aucune promesse, aucun vocabulaire médical
// ---------------------------------------------------------------------------
const FORBIDDEN = ['garanti', 'garantie', 'guérison', 'guérir', 'traitement', 'thérapeutique', 'cliniquement prouvé', 'résultat assuré', 'diagnostiquer'];
const responses = [manifest.text, scoringSchema.text, scored.text, emptyProfile.text, catalog.text].join(' ').toLowerCase();
for (const word of FORBIDDEN) {
  assert.equal(responses.includes(word), false, `l’API ne doit pas contenir « ${word} »`);
}
assert.ok(responses.includes('avis médical'), 'la réserve « pas un avis médical » est présente');

// ---------------------------------------------------------------------------
// 7. Aucune route v1 ne fuit hors du périmètre déclaré
// ---------------------------------------------------------------------------
const declaredPaths: string[] = publicApi.PUBLIC_API_ENDPOINTS.map(endpoint => endpoint.path);
for (const path of ['/api/v1/me', '/api/v1/members', '/api/v1/cohorts', '/api/v1/loyalty', '/api/v1/orders']) {
  const response = await requestApp(path);
  assert.equal(response.status, 404, `${path} ne doit pas exister`);
  assert.ok(!declaredPaths.includes(path), `${path} n’est pas déclaré`);
}

console.log(
  `[PASS] Chantier 8.6b — API publique catalogue + scoring : ${publicApi.PUBLIC_API_ENDPOINTS.length} endpoints déclarés et montés, ` +
    `catalogue servi au publié uniquement (1 produit sur 3 semés, produit retiré → 404), scoring sans état vérifié par l’état du store ` +
    `(${Object.keys(before).length} collections inchangées), profil vide → scores null, ${publicApi.PUBLIC_API_NEVER_EXPOSED.length} catégories jamais exposées, aucune promesse ni vocabulaire médical.`
);
