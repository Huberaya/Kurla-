import assert from 'node:assert/strict';

import { scanCatalogClaims, describeClaimScan, CATALOG_CLAIM_RULES, foldForClaimSearch } from '../src/lib/catalogClaims';
import { serverDb } from '../src/lib/serverDb';

/**
 * CHANTIER 14 — banc « une vérification existe, et elle dit ce qu'elle fait ».
 *
 * Deux choses sont vérifiées ici, et toutes deux sont nées d'un constat
 * mesuré, pas d'une intention :
 *
 *  1. **Le crible d'allégations.** La publication exigeait
 *     `claims_validation_status = 'verified'` alors qu'aucun outil ne
 *     produisait cette vérification : le statut ne pouvait être que laissé
 *     vide ou coché sans trace. Le banc vérifie que chaque règle tombe sur ce
 *     qu'elle vise, que les champs de contre-indication ne sont pas punis pour
 *     leur prudence, et que la note enregistrée annonce la limite du contrôle.
 *
 *  2. **Le rapport de préparation ne cache plus rien.** En production, le
 *     rapport annonçait « produits : 0 » pour un catalogue de 16 lignes : il
 *     rechargeait chaque produit via un getter filtré sur `is_active = true`
 *     et avalait l'erreur résultante. Un rapport d'audit qui omet les lignes
 *     qu'il audite se lit comme « rien à faire ».
 */

function hitFor(text: Record<string, unknown>) {
  return scanCatalogClaims(text).hits;
}

async function runCatalogClaimsTests(): Promise<void> {
  // ---------------------------------------------------------------------
  // 1. Chaque règle tombe sur ce qu'elle vise.
  // ---------------------------------------------------------------------
  const cases: Array<{ id: string; text: string; rule: string }> = [
    { id: 'therapeutic_claim', text: 'Ce sérum traite l’eczéma du cuir chevelu', rule: 'therapeutic_claim' },
    { id: 'therapeutic_claim (repousse)', text: 'Fait repousser les cheveux en 3 semaines', rule: 'therapeutic_claim' },
    { id: 'guaranteed_result', text: 'Résultat garanti dès la première application', rule: 'guaranteed_result' },
    { id: 'unsupported_proof', text: 'Efficacité démontrée cliniquement', rule: 'unsupported_proof' },
    { id: 'absolute_safety', text: 'Formule sans aucun risque, aucun effet secondaire', rule: 'absolute_safety' },
    { id: 'prohibited_practice', text: 'Prépare la peau au décapage éclaircissant', rule: 'prohibited_practice' }
  ];

  for (const testCase of cases) {
    const hits = hitFor({ description: testCase.text });
    assert.ok(hits.length > 0, `aucune trouvaille pour « ${testCase.text} »`);
    assert.ok(
      hits.some(hit => hit.ruleId === testCase.rule),
      `« ${testCase.text} » aurait dû tomber sur ${testCase.rule}, obtenu : ${hits.map(hit => hit.ruleId).join(', ')}`
    );
    assert.equal(hits[0].field, 'description');
  }

  // Chaque règle déclarée est couverte par au moins un cas : une règle
  // jamais exercée par le banc est une règle qui peut casser en silence.
  const covered = new Set(cases.map(item => item.rule));
  for (const rule of CATALOG_CLAIM_RULES) {
    assert.ok(covered.has(rule.id), `règle ${rule.id} non couverte par le banc`);
    assert.ok(rule.patterns.length > 0, `règle ${rule.id} sans motif`);
    assert.ok(rule.reason.length > 20, `règle ${rule.id} sans raison documentée`);
  }

  // ---------------------------------------------------------------------
  // 2. Casse et accents ne changent rien au verdict.
  // ---------------------------------------------------------------------
  assert.equal(foldForClaimSearch('  GUÉRIT   l’Eczéma '), 'guerit l\'eczema');
  for (const variant of ['Guérit', 'GUÉRIT', 'guerit', 'GuéRiT']) {
    assert.ok(hitFor({ description: variant }).some(hit => hit.ruleId === 'therapeutic_claim'), `variante ${variant} non détectée`);
  }

  // ---------------------------------------------------------------------
  // 3. Les champs de contre-indication ne sont pas punis pour leur prudence.
  // ---------------------------------------------------------------------
  const contraindication = scanCatalogClaims({ not_ideal_if: 'Déconseillé en cas d’eczéma ou de psoriasis du cuir chevelu.' });
  assert.equal(contraindication.hits.filter(hit => hit.ruleId === 'therapeutic_claim').length, 0,
    'une contre-indication a été lue comme une allégation thérapeutique');
  assert.ok(contraindication.scannedFields.includes('not_ideal_if'), 'le champ de contre-indication n’a pas été lu');

  // Les autres règles restent actives dans ces champs : l'exemption porte sur
  // le seul vocabulaire des pathologies, pas sur tout le contrôle.
  const riskyWarning = scanCatalogClaims({ warnings: ['Résultat garanti, sans aucun risque'] });
  assert.ok(riskyWarning.hits.some(hit => hit.ruleId === 'guaranteed_result'), 'résultat garanti non détecté dans les avertissements');
  assert.ok(riskyWarning.hits.some(hit => hit.ruleId === 'absolute_safety'), 'innocuité absolue non détectée dans les avertissements');

  // ---------------------------------------------------------------------
  // 4. Un texte propre passe, et la note annonce la limite du contrôle.
  // ---------------------------------------------------------------------
  const clean = scanCatalogClaims({
    name: 'Shampoing Doux Sans Sulfates',
    description: 'Nettoie sans décaper, mousse fine, se rince facilement.',
    badges: ['Sans sulfates', 'Vegan']
  });
  assert.equal(clean.clean, true, `texte propre rejeté : ${clean.hits.map(hit => hit.term).join(', ')}`);
  assert.deepEqual(clean.scannedFields, ['name', 'description', 'badges']);
  const cleanNote = describeClaimScan(clean);
  assert.match(cleanNote, /Crible automatique/);
  assert.match(cleanNote, /non une validation juridique/);

  const dirty = scanCatalogClaims({ description: 'Guérit l’alopécie, résultat garanti.' });
  assert.equal(dirty.clean, false);
  const dirtyNote = describeClaimScan(dirty);
  assert.match(dirtyNote, /à corriger/);
  assert.match(dirtyNote, /description/);

  // ---------------------------------------------------------------------
  // 5. Les deux formes d'objet circulent dans le code : snake_case et camelCase.
  // ---------------------------------------------------------------------
  const snake = scanCatalogClaims({ benefit_primary: 'Répare l’ADN du cheveu' });
  const camel = scanCatalogClaims({ benefitPrimary: 'Répare l’ADN du cheveu' });
  assert.equal(snake.hits.length, camel.hits.length);
  assert.ok(camel.hits.length > 0, 'le champ camelCase n’a pas été lu');

  // ---------------------------------------------------------------------
  // 6. Le rapport de préparation nomme les produits désactivés au lieu de
  //    les faire disparaître.
  // ---------------------------------------------------------------------
  const ready = {
    is_active: true,
    catalog_status: 'draft',
    ingredient_verification_status: 'verified',
    claims_validation_status: 'verified',
    images_validation_status: 'verified',
    stock_validation_status: 'verified',
    certifications_validation_status: 'verified',
    translations_validation_status: 'verified',
    brand_verification_status: 'verified',
    image_ownership_status: 'brand_provided',
    brand: 'KURLA Botanicals',
    ingredients: ['Glycerin'],
    image: 'https://images.example.org/produit.jpg',
    country_availability: ['FR']
  };
  serverDb.inMemoryProducts = [
    { ...ready, id: 'p-actif', slug: 'actif', title: 'Produit actif' },
    { ...ready, id: 'p-desactive', slug: 'desactive', title: 'Produit désactivé', is_active: false }
  ] as never[];

  const report = await serverDb.getCatalogPublicationReadinessReport();
  assert.equal(report.products, 2, `le rapport ne voit que ${report.products} produit(s) sur 2`);
  const deactivated = report.perProduct.find(entry => entry.productId === 'p-desactive');
  assert.ok(deactivated, 'le produit désactivé a disparu du rapport');
  assert.equal(deactivated.ready, false);
  assert.deepEqual(deactivated.missing, ['produit désactivé'],
    `blocages annoncés : ${deactivated.missing.join(', ')}`);
  const active = report.perProduct.find(entry => entry.productId === 'p-actif');
  assert.equal(active?.ready, true);
  assert.equal(report.readyToPublish, 1);

  console.log('[PASS] Crible d’allégations banc : 5 règles exercées, casse/accents, contre-indications épargnées, note honnête, rapport fidèle.');
}

runCatalogClaimsTests().catch(error => {
  console.error('[FAIL] Crible d’allégations banc :', error);
  process.exitCode = 1;
});
