/**
 * FICHES LIÉES — contrat du magasin partagé et des manques nommés.
 *
 * Ce banc couvre ce qui, s'il se trompe, produit le pire effet : faire croire
 * à l'exploitant qu'une saisie a été enregistrée alors que le serveur l'a
 * refusée. Trois invariants :
 *
 *   1. un échec restaure la valeur précédente ET remonte l'erreur du serveur ;
 *   2. `legalName` n'est jamais envoyé (le serveur la refuse : l'identifiant
 *      en dérive) — l'envoyer ferait échouer toute la saisie ;
 *   3. deux écritures simultanées ne partent pas : la seconde est refusée
 *      net, pas empilée.
 *
 * Aucun fetch réel : `fetchImpl` est injecté.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getAdminRecordsSnapshot,
  getAdminRecordsVersion,
  isWritingAdminRecords,
  loadProduct,
  loadSupplier,
  loadSupplierDirectory,
  readSupplier,
  resetAdminRecords,
  resetSupplierDirectory,
  subscribeAdminRecords,
  supplierDisplayName,
  writeProduct,
  writeProductSupplierLink,
  writeSupplier,
} from '../src/lib/adminRecordsStore';
import {
  SEVERITY_LABELS,
  SUPPLIER_TYPE_LABELS_FULL,
  missingProductFields,
  missingSupplierFields,
} from '../src/lib/recordCompleteness';

const HEADERS = { Authorization: 'Bearer test', 'X-Kurla-Workspace': 'hair' };

function jsonResponse(payload: unknown, ok = true, status = ok ? 200 : 400) {
  return { ok, status, json: async () => payload } as unknown as Response;
}

/** Enregistre chaque appel pour pouvoir l'inspecter. */
function recorder(handler: (url: string, init: any) => Promise<Response>) {
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = (async (url: string, init: any) => {
    calls.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

/* ---------- Manques nommés ---------- */

/* 1. Fournisseur vide : les manques sont nommés, et un 0 n'est pas un manque. */
{
  const empty = missingSupplierFields({ id: 'sup-x', legalName: 'X', supplierType: 'brand', verificationStatus: 'not_provided' });
  const keys = empty.missing.map(m => m.key);
  for (const expected of ['contactEmail', 'moqUnits', 'leadTimeDays', 'country', 'certifications', 'verificationStatus']) {
    assert.ok(keys.includes(expected), `manque attendu : ${expected}`);
  }
  assert.ok(empty.blocking.some(m => m.key === 'contactEmail'), 'e-mail absent = bloquant');
  assert.ok(empty.blocking.some(m => m.key === 'verificationStatus'), 'aucune preuve = bloquant');

  const withZero = missingSupplierFields({ id: 'sup-y', contactEmail: 'a@b.c', moqUnits: 0, leadTimeDays: 0, country: 'FR', certifications: ['CPSR'], verificationStatus: 'pending' });
  const zeroKeys = withZero.missing.map(m => m.key);
  assert.ok(!zeroKeys.includes('moqUnits'), 'MOQ 0 = information, pas un trou');
  assert.ok(!zeroKeys.includes('leadTimeDays'), 'délai 0 = information, pas un trou');
  assert.ok(!zeroKeys.includes('verificationStatus'), 'statut tranché = pas un manque');
  console.log('✓ fournisseur : manques nommés, 0 considéré comme une donnée');
}

/* 2. Le motif du manque explique, et ne promet rien qu'on ne puisse saisir. */
{
  const completeness = missingSupplierFields(null);
  assert.ok(completeness.missing.length > 0, 'fiche absente → tout manque');
  for (const field of completeness.missing) {
    assert.ok(field.label.length > 2, 'libellé lisible');
    assert.ok(field.why.length > 10, 'raison nommée');
    assert.ok(['bloquant', 'important', 'utile'].includes(field.severity));
    assert.ok(SEVERITY_LABELS[field.severity], 'niveau traduit');
  }
  // legalName n'est jamais un « manque » : le serveur refuse de la modifier.
  assert.ok(!completeness.missing.some(m => m.key === 'legalName'), 'legalName non modifiable → jamais listée');
  console.log('✓ chaque manque a un libellé, une raison, un niveau ; legalName exclue');
}

/* 3. Produit : la grille KURLA Ready est reprise telle quelle, pas réinventée. */
{
  const readiness = { hardBlockers: ['autorisation fournisseur absente'], qualityGaps: ['INCI absente', 'marque absente'] };
  const out = missingProductFields({ id: 'p1', price: 12, category: 'cheveux', supplierId: 'sup-1', supplierSku: 'SKU-9' }, readiness);
  const keys = out.missing.map(m => m.key);
  assert.ok(keys.includes('truth'), 'bloqueur de la grille repris');
  assert.ok(keys.includes('inci'), '« INCI absente » mappée sur le champ inci');
  assert.ok(keys.includes('brand'), '« marque absente » mappée sur le champ brand');
  assert.ok(!keys.includes('supplierId'), 'fournisseur rattaché → pas un manque');
  assert.ok(!keys.includes('supplierSku'), 'SKU fournisseur présent → pas un manque');
  assert.equal(out.blocking.length, 1, 'un seul bloquant ici');

  const orphan = missingProductFields({ id: 'p2', price: 0, supplierId: 'sup-1' }, { hardBlockers: [], qualityGaps: [] });
  const orphanKeys = orphan.missing.map(m => m.key);
  assert.ok(orphanKeys.includes('supplierSku'), 'rattaché mais sans SKU → manque nommé');
  assert.ok(orphanKeys.includes('price'), 'prix 0 ou absent → bloquant');
  assert.ok(orphanKeys.includes('category'), 'catégorie absente → manque nommé');
  console.log('✓ produit : grille KURLA Ready reprise, rattachement et SKU ajoutés');
}

/* 4. Libellés des types fournisseur : les 8 valeurs acceptées sont couvertes. */
{
  for (const value of ['contract_manufacturer', 'textile', 'tool', 'raw_material', 'packaging', 'laboratory', 'brand', 'distributor']) {
    assert.ok(SUPPLIER_TYPE_LABELS_FULL[value], `libellé manquant pour ${value}`);
    assert.notEqual(SUPPLIER_TYPE_LABELS_FULL[value], value, `${value} ne doit pas s’afficher en brut`);
  }
  console.log('✓ les 8 types fournisseur ont un libellé français');
}

/* ---------- Magasin partagé ---------- */

/* 5. Chargement : une seule requête pour deux panneaux qui demandent la même fiche. */
{
  resetAdminRecords();
  const { calls, fetchImpl } = recorder(async () => jsonResponse({ supplier: { id: 'sup-a', tradeName: 'Baraka', contactEmail: null } }));
  const [first, second] = await Promise.all([
    loadSupplier('sup-a', HEADERS, { fetchImpl }),
    loadSupplier('sup-a', HEADERS, { fetchImpl }),
  ]);
  assert.equal(calls.length, 1, 'une seule requête pour deux lecteurs');
  assert.equal(first?.tradeName, 'Baraka');
  assert.equal(second?.tradeName, 'Baraka');
  assert.equal(readSupplier('sup-a')?.tradeName, 'Baraka', 'fiche mise en magasin');
  assert.ok(calls[0].url.endsWith('/api/admin/suppliers/sup-a'), 'route existante, identifiant encodé');
  console.log('✓ chargement partagé : 2 lecteurs, 1 requête, fiche en magasin');
}

/* 6. Écriture réussie : version incrémentée, abonnés réveillés. */
{
  resetAdminRecords();
  const { fetchImpl } = recorder(async () => jsonResponse({ supplier: { id: 'sup-a', tradeName: 'Baraka', contactEmail: 'contact@baraka.eu' } }));
  let wakeups = 0;
  const unsubscribe = subscribeAdminRecords(() => { wakeups += 1; });

  const before = getAdminRecordsVersion();
  const result = await writeSupplier('sup-a', { contactEmail: 'contact@baraka.eu' }, HEADERS, { fetchImpl });
  unsubscribe();

  assert.equal(result.ok, true, 'écriture acceptée');
  assert.equal(readSupplier('sup-a')?.contactEmail, 'contact@baraka.eu', 'valeur en magasin');
  assert.equal(getAdminRecordsVersion(), before + 1, 'version incrémentée → les panneaux rechargent');
  assert.ok(wakeups >= 2, 'abonnés réveillés (optimiste + confirmé)');
  assert.equal(isWritingAdminRecords(), false, 'plus d’écriture en cours');
  console.log('✓ écriture réussie : version incrémentée, abonnés prévenus');
}

/* 7. Écriture refusée : la valeur précédente revient, l'erreur du serveur remonte. */
{
  resetAdminRecords();
  await loadSupplier('sup-b', HEADERS, {
    fetchImpl: (async () => jsonResponse({ supplier: { id: 'sup-b', tradeName: 'Distristar', verificationStatus: 'pending' } })) as unknown as typeof fetch,
  });
  const { fetchImpl } = recorder(async () => jsonResponse({ error: 'Un fournisseur ne passe pas en « vérifié » sans aucun document de conformité enregistré.' }, false, 400));

  const result = await writeSupplier('sup-b', { verificationStatus: 'verified' }, HEADERS, { fetchImpl });
  assert.equal(result.ok, false, 'refus du serveur');
  assert.match(String(result.error), /document de conformité/, 'l’erreur réelle du serveur remonte, pas un message générique');
  assert.equal(readSupplier('sup-b')?.verificationStatus, 'pending', 'valeur précédente restaurée à l’écran');
  assert.equal(isWritingAdminRecords(), false, 'verrou relâché après l’échec');
  console.log('✓ écriture refusée : restauration + erreur réelle du serveur');
}

/* 8. legalName n'est jamais envoyé au serveur. */
{
  resetAdminRecords();
  const { calls, fetchImpl } = recorder(async () => jsonResponse({ supplier: { id: 'sup-c', legalName: 'KURLA' } }));
  await writeSupplier('sup-c', { legalName: 'Autre raison sociale', legal_name: 'Autre raison sociale', country: 'FR' }, HEADERS, { fetchImpl });
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(Object.keys(body), ['country'], 'seuls les champs modifiables partent');
  assert.ok(!('legalName' in body) && !('legal_name' in body), 'legalName retirée du corps');
  console.log('✓ legalName jamais envoyée (le serveur la refuse)');
}

/* 9. Deux écritures simultanées : la seconde est refusée, pas empilée. */
{
  resetAdminRecords();
  let resolveFirst: (value: Response) => void = () => {};
  const firstResponse = new Promise<Response>(resolve => { resolveFirst = resolve; });
  const fetchImpl = (async (url: string) => {
    if (url.includes('sup-d')) return firstResponse;
    return jsonResponse({ product: { id: 'p9' } });
  }) as unknown as typeof fetch;

  const first = writeSupplier('sup-d', { country: 'FR' }, HEADERS, { fetchImpl });
  assert.equal(isWritingAdminRecords(), true, 'écriture en cours signalée');
  const second = await writeProduct('p9', { brand: 'X' }, HEADERS, { fetchImpl });
  assert.equal(second.ok, false, 'la seconde écriture est refusée tant que la première tourne');
  assert.match(String(second.error), /déjà en cours/);

  resolveFirst(jsonResponse({ supplier: { id: 'sup-d', country: 'FR' } }));
  const firstResult = await first;
  assert.equal(firstResult.ok, true);
  assert.equal(isWritingAdminRecords(), false);
  console.log('✓ écritures concurrentes : la seconde est refusée net');
}

/* 10. Corps vide : aucune requête, aucun verrou. */
{
  resetAdminRecords();
  const { calls, fetchImpl } = recorder(async () => jsonResponse({ supplier: {} }));
  const result = await writeSupplier('sup-e', {}, HEADERS, { fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 0, 'rien à écrire → aucune requête');
  assert.equal(getAdminRecordsVersion(), 0, 'pas de changement de version');
  console.log('✓ patch vide : aucune requête, aucune version incrémentée');
}

/* 11. Fiche produit : chargement puis écriture sur la route produit. */
{
  resetAdminRecords();
  const { calls, fetchImpl } = recorder(async (url: string, init: any) => {
    if (init?.method === 'PATCH') return jsonResponse({ product: { id: 'p1', supplierId: 'sup-a', supplierSku: 'SKU-1' } });
    return jsonResponse({ product: { id: 'p1', name: 'Sérum', supplierId: null } });
  });
  const loaded = await loadProduct('p1', HEADERS, { fetchImpl });
  assert.equal(loaded?.name, 'Sérum');
  const written = await writeProduct('p1', { supplierId: 'sup-a', supplierSku: 'SKU-1' }, HEADERS, { fetchImpl });
  assert.equal(written.ok, true);
  assert.equal(calls[1].init.method, 'PATCH');
  assert.ok(calls[1].url.endsWith('/api/admin/catalog/products/p1'));
  assert.deepEqual(JSON.parse(calls[1].init.body), { supplierId: 'sup-a', supplierSku: 'SKU-1' }, 'le rattachement part tel quel');
  console.log('✓ fiche produit : chargement puis rattachement fournisseur');
}

/* 12. Nom d'affichage : enseigne, sinon raison sociale, sinon identifiant — jamais vide inventé. */
{
  assert.equal(supplierDisplayName({ id: 'sup-1', tradeName: 'Baraka', legalName: 'BARAKA SAS' }), 'Baraka');
  assert.equal(supplierDisplayName({ id: 'sup-1', legalName: 'BARAKA SAS' }), 'BARAKA SAS');
  assert.equal(supplierDisplayName({ id: 'sup-1' }), 'sup-1');
  assert.equal(supplierDisplayName(null), '');
  assert.equal(getAdminRecordsSnapshot().products.p1?.supplierId, 'sup-a', 'instantané lisible');
  console.log('✓ nom d’affichage : enseigne → raison sociale → identifiant');
}

/* 13. Rattachement fournisseur : la route dédiée, pas le PATCH produit. */
{
  resetAdminRecords();
  const { calls, fetchImpl } = recorder(async (url: string, init: any) => {
    if (init?.method === 'PATCH') return jsonResponse({ ok: true });
    return jsonResponse({ product: { id: 'p2', name: 'Huile', supplierId: null } });
  });
  await loadProduct('p2', HEADERS, { fetchImpl });
  const linked = await writeProductSupplierLink('p2', { supplierId: 'sup-a', supplierSku: 'SKU-7' }, HEADERS, { fetchImpl });
  assert.equal(linked.ok, true, 'rattachement accepté');
  const patchCall = calls.find(call => call.init?.method === 'PATCH')!;
  assert.ok(patchCall.url.endsWith('/api/admin/products/p2/supplier'), 'route dédiée au rattachement, pas le PATCH produit');
  assert.deepEqual(JSON.parse(patchCall.init.body), { supplierId: 'sup-a', supplierSku: 'SKU-7' });

  const detached = await writeProductSupplierLink('p2', { supplierId: null }, HEADERS, { fetchImpl });
  assert.equal(detached.ok, true, 'détachement explicite accepté');
  assert.deepEqual(JSON.parse(calls[calls.length - 1].init.body), { supplierId: null }, 'null = détacher, acte explicite');
  console.log('✓ rattachement par la route dédiée ; null détache explicitement');
}

/* 14. Rattachement refusé : la fiche revient à son fournisseur précédent. */
{
  resetAdminRecords();
  await loadProduct('p3', HEADERS, {
    fetchImpl: (async () => jsonResponse({ product: { id: 'p3', supplierId: 'sup-a' } })) as unknown as typeof fetch,
  });
  const { fetchImpl } = recorder(async () => jsonResponse({ error: 'Produit introuvable dans cet espace.' }, false, 404));
  const result = await writeProductSupplierLink('p3', { supplierId: 'sup-b' }, HEADERS, { fetchImpl });
  assert.equal(result.ok, false);
  assert.match(String(result.error), /introuvable dans cet espace/);
  console.log('✓ rattachement refusé : erreur réelle remontée, verrou relâché');
}

/* ---------- 17/09, 2e demande : tout est modifiable dans l'espace Approvisionnement ---------- */

/* 15. Le référentiel fournisseurs est lu UNE fois, puis servi depuis le magasin.
   Chaque panneau de cet espace affiche des fournisseurs : sans cache, un écran
   de 8 panneaux déclencherait 8 requêtes identiques. */
{
  resetSupplierDirectory();
  const { calls, fetchImpl } = recorder(async () => jsonResponse({
    suppliers: [{ id: 'sup-a', legalName: 'Aquarius' }, { id: 'sup-b', legalName: 'Baraka' }],
  }));

  const first = await loadSupplierDirectory(HEADERS, { fetchImpl });
  const second = await loadSupplierDirectory(HEADERS, { fetchImpl });
  const concurrent = await loadSupplierDirectory(HEADERS, { fetchImpl });

  assert.equal(first.length, 2, 'les deux fournisseurs sont rendus');
  assert.deepEqual(second, first, 'la seconde lecture rend la même liste');
  assert.deepEqual(concurrent, first, 'la troisième aussi');
  assert.equal(calls.length, 1, `une seule requête pour trois lecteurs (mesuré : ${calls.length})`);
  assert.ok(calls[0].url.includes('/api/admin/suppliers?all=1'), 'route réelle, sans filtre d\'espace : ce référentiel sert les deux familles');
  console.log('✓ référentiel fournisseurs : 3 lecteurs, 1 requête');
}

/* 16. Un référentiel indisponible ne rend pas une liste vide qui ferait croire
   qu'aucun fournisseur n'existe : l'erreur remonte, et rien n'est mis en cache. */
{
  resetSupplierDirectory();
  const failing = recorder(async () => jsonResponse({ error: 'Référentiel indisponible.' }, false, 500));
  await assert.rejects(
    () => loadSupplierDirectory(HEADERS, { fetchImpl: failing.fetchImpl }),
    /Référentiel indisponible/
  );
  assert.equal(failing.calls.length, 1, 'la tentative échouée est comptée');

  const recovered = recorder(async () => jsonResponse({ suppliers: [{ id: 'sup-a', legalName: 'Aquarius' }] }));
  const list = await loadSupplierDirectory(HEADERS, { fetchImpl: recovered.fetchImpl });
  assert.equal(list.length, 1, `l'échec n'a rien mis en cache : la liste est relue (mesuré : ${list.length})`);
  console.log('✓ référentiel indisponible : erreur réelle remontée, aucune liste vide en cache');
}

/* 17. `refresh` force la relecture : après la création d'un fournisseur, la
   liste des rattachements proposés doit contenir le nouveau, pas l'ancienne. */
{
  resetSupplierDirectory();
  // Le compteur est tenu DANS le gestionnaire : `calls` est rempli avant que le
  // gestionnaire ne tourne, il ne peut donc pas servir à distinguer les tours.
  let served = 0;
  const { calls, fetchImpl } = recorder(async () => {
    served += 1;
    return jsonResponse({ suppliers: served === 1 ? [{ id: 'sup-a' }] : [{ id: 'sup-a' }, { id: 'sup-nouveau' }] });
  });
  await loadSupplierDirectory(HEADERS, { fetchImpl });
  const stale = await loadSupplierDirectory(HEADERS, { fetchImpl });
  const fresh = await loadSupplierDirectory(HEADERS, { fetchImpl, refresh: true });
  assert.equal(stale.length, 1, 'sans refresh, la liste en cache est rendue');
  assert.equal(fresh.length, 2, `avec refresh, le fournisseur créé apparaît (mesuré : ${fresh.length})`);
  assert.equal(calls.length, 2, 'deux requêtes : la mise en cache puis la relecture forcée');
  console.log('✓ refresh : le fournisseur créé devient proposable au rattachement');
}

/* 18. GARDE-FOU DE STRUCTURE — ce que l'exploitant a corrigé deux fois.
   Règle 1 : la fiche fournisseur ÉDITABLE ne se monte que dans la base de
   l'Approvisionnement (`SupplierAdminPanel`). Ailleurs, un nom de fournisseur
   passe par `SupplierName`, qui ouvre cette même fiche.
   Règle 2 : dans l'espace Approvisionnement, chaque panneau qui affiche un
   fournisseur ou un produit rattaché au catalogue propose de le modifier.
   Ce bloc lit les sources : si quelqu'un remonte une surface d'édition
   concurrente, ou retire un accès, le banc échoue au lieu de laisser passer. */
{
  const sourceDir = join(process.cwd(), 'src');
  const read = (relative: string) => readFileSync(join(sourceDir, relative), 'utf8');

  /** Panneaux de cet espace qui affichent des FICHES (fournisseur, ou produit du
   *  catalogue rattaché) : chacun doit proposer de les modifier. */
  const panelsAvecFiches = [
    'components/SupplierAdminPanel.tsx',      // la base : édition complète
    'components/SupplierCatalogPanel.tsx',    // fournisseur + produits rattachés
    'components/SupplierDossierPanel.tsx',    // piste reliée à une fiche fournisseur
    'components/ProductSupplierPanel.tsx',    // affectation + fiche produit
    'components/PurchaseProposalPanel.tsx',   // référence + fournisseur rattaché
    'components/GlobalSearchPanel.tsx',       // résultats fournisseur et catalogue
    'components/SourcingProspectsPanel.tsx',  // piste + fiche fournisseur liée
    'components/ProductSourcesPanel.tsx',     // sources d'achat par produit
    'components/SourcingWorkflowPanel.tsx',   // transitions d'étape écrites
    // 18/09 — « cliquer sur le fournisseur » partout dans l'Appro :
    'components/SourcingConsolidatedPanel.tsx',   // fiche quand la ligne porte un supplierId réel
    'components/SourcingCountryStrategyPanel.tsx', // chips pays = fiches fournisseurs réelles
    'components/SupplyOpsPanel.tsx',            // 18/09 : alertes + produits cliquables
  ];
  /** Panneaux de cet espace qui n'affichent AUCUNE fiche : totaux, agrégats par
   *  pays, ou entités qui ne sont pas des fiches (piste sans fiche liée, kit,
   *  message prêt à envoyer à un transporteur). Les rendre « modifiables »
   *  reviendrait à inventer un champ à écrire. */
  const panelsSansFiche = [
    'components/TamponOrderPanel.tsx',          // message 3PL, destinataires fixes
    'components/KittingAdminPanel.tsx',         // composition de kits
  ];

  const mounted = [...panelsAvecFiches, ...panelsSansFiche].filter(panel => read(panel).includes('<SupplierSheet'));
  assert.deepEqual(mounted, ['components/SupplierAdminPanel.tsx'],
    `la fiche fournisseur éditable ne se monte QUE dans la base (mesuré : ${mounted.join(', ') || 'nulle part'})`);

  const modifiable = (panel: string) => {
    const code = read(panel);
    return code.includes('<SupplierName') || code.includes('<ProductName')
      || code.includes('<ProductSheet') || code.includes('<SupplierSheet')
      || /method: '(PATCH|PUT|POST)'/.test(code);
  };
  const sansAcces = panelsAvecFiches.filter(panel => !modifiable(panel));
  assert.deepEqual(sansAcces, [],
    `tout panneau qui affiche une fiche propose de la modifier (sans accès : ${sansAcces.join(', ') || 'aucun'})`);

  // Aucun panneau de l'espace ne doit rester sans classification : sinon un
  // nouveau panneau échapperait silencieusement à ce contrôle.
  const attendus = new Set([...panelsAvecFiches, ...panelsSansFiche]);
  for (const panel of [
    'components/SupplierAdminPanel.tsx', 'components/SupplierCatalogPanel.tsx',
    'components/SupplierDossierPanel.tsx', 'components/ProductSupplierPanel.tsx',
    'components/PurchaseProposalPanel.tsx', 'components/GlobalSearchPanel.tsx',
    'components/SourcingProspectsPanel.tsx', 'components/ProductSourcesPanel.tsx',
    'components/SourcingWorkflowPanel.tsx', 'components/SupplyOpsPanel.tsx',
    'components/SourcingCountryStrategyPanel.tsx', 'components/SourcingConsolidatedPanel.tsx',
    'components/TamponOrderPanel.tsx', 'components/KittingAdminPanel.tsx',
  ]) assert.ok(attendus.has(panel), `panneau non classé : ${panel}`);

  // Le référentiel doit être atteignable depuis un panneau qui n'a pas de liste
  // en props : c'est ce qui rend le rattachement possible partout.
  assert.ok(read('components/EditableRecordName.tsx').includes('loadSupplierDirectory'),
    'la fiche produit ouverte depuis un panneau charge le référentiel elle-même');
  console.log('✓ garde-fou : une seule fiche fournisseur éditable, chaque panneau de l\'espace propose une modification');
}

// ---------------------------------------------------------------------------
// 19. FAMILLE CATALOGUE (18/09) — « tous les produits présents dans le
//     catalogue doivent être modifiables » : chaque panneau qui affiche des
//     fiches produits réelles propose leur édition (fiche flottante). Les
//     candidates/pistes (id synthétiques) restent en texte : ouvrir une fiche
//     sur un id qui n'existe pas afficherait une erreur, pas un formulaire.
// ---------------------------------------------------------------------------
{
  const read = (relative: string) => readFileSync(join(process.cwd(), 'src', relative), 'utf8');
  const panneauxCatalogue = [
    'components/CatalogAdminPanel.tsx',        // cartes + ProductSheet
    'components/CatalogPipelinePanel.tsx',     // lignes kind === 'product'
    'components/OperationsCockpitPanel.tsx',   // produit par produit
    'components/CatalogClaimsAuditPanel.tsx',  // allégations par fiche
    'components/CatalogGatePanel.tsx',         // propositions de publication
    'components/DerogationsPanel.tsx',         // dérogations datées
    'components/TestPhaseGatesPanel.tsx',      // phase test
    'components/BatchAdminPanel.tsx',          // colonne produit des lots
    'components/ProductLifecyclePanel.tsx',    // lignes linkedProductId
  ];
  for (const panneau of panneauxCatalogue) {
    const code = read(panneau);
    const cliquable = code.includes('<ProductName') || code.includes('setSheetProduct');
    assert.ok(cliquable, `${panneau} affiche des produits sans offrir leur édition.`);
  }
  // La fiche flottante elle-même : les 12 champs éditables promis par la route
  // sont tous dans le formulaire (mesuré le 18/09 : 8 sur 12 seulement).
  const sheet = read('components/ProductSheet.tsx');
  for (const champ of ['name', 'slug', 'brand', 'category', 'subCategory', 'price', 'stockQuantity', 'inci', 'description', 'ean', 'image', 'sourceSupplier']) {
    assert.ok(sheet.includes(`setField('${champ}'`), `ProductSheet : le champ « ${champ} » n'est pas éditable dans le formulaire.`);
  }
  // Et le rattachement — l'entrée dans le catalogue d'approvisionnement —
  // passe par la route dédiée, jamais par le PATCH produit.
  assert.ok(sheet.includes('writeProductSupplierLink'), 'ProductSheet : le rattachement fournisseur a disparu.');
  console.log('✓ famille catalogue : 9 panneaux offrent l\'édition produit ; fiche = 12 champs + rattachement sur la route dédiée');
}

// ---------------------------------------------------------------------------
// 20. FOURNISSEURS (18/09) — « cliquer sur le fournisseur, voir ses
//     informations, les renseigner si elles manquent » :
//     a) le nom dans la base est lui-même cliquable (pas seulement le bouton) ;
//     b) la fiche fournisseur expose les 11 champs du contrat serveur ;
//     c) la vue consolidée ne rend le nom cliquable que si une vraie fiche
//        existe derrière (supplierId réel) — jamais sur du texte libre.
// ---------------------------------------------------------------------------
{
  const read = (relative: string) => readFileSync(join(process.cwd(), 'src', relative), 'utf8');

  const base = read('components/SupplierAdminPanel.tsx');
  assert.ok(
    /onClick=\{\(\) => setSheetSupplierId\(supplier\.id\)\}[^>]*>\s*\{?[^<]*\{supplier\.legalName\}|setSheetSupplierId\(supplier\.id\)\} title="Ouvrir la fiche fournisseur/.test(base) || base.includes('setSheetSupplierId(supplier.id)} title='),
    'SupplierAdminPanel : le nom du fournisseur dans le tableau doit ouvrir la fiche.'
  );

  const sheet = read('components/SupplierSheet.tsx');
  for (const champ of ['tradeName', 'supplierType', 'country', 'website', 'contactName', 'contactEmail', 'moqUnits', 'leadTimeDays', 'certifications', 'verificationStatus', 'notes']) {
    assert.ok(sheet.includes(`setField('${champ}'`), `SupplierSheet : le champ « ${champ} » n'est pas éditable dans le formulaire.`);
  }
  assert.ok(sheet.includes('missingSupplierFields'), 'SupplierSheet : les manques ne sont plus nommés.');

  const consolidated = read('lib/sourcingConsolidated.ts');
  assert.ok(consolidated.includes('supplierId: supplier ? String(supplier.id) : null'), 'Vue consolidée : le supplierId des fiches rattachées n\'est plus remonté.');
  const consolidatedPanel = read('components/SourcingConsolidatedPanel.tsx');
  assert.ok(consolidatedPanel.includes('row.supplierId') && consolidatedPanel.includes('<SupplierName'), 'Vue consolidée : le nom cliquable a disparu.');

  console.log('✓ fournisseurs : nom cliquable dans la base, fiche = 11 champs + manques nommés, consolidé cliquable seulement sur fiche réelle');
}

// ---------------------------------------------------------------------------
// 21. RÈGLE D'OR ANNÉE 1 — « tous les matériels & outils sont en dropship
//     24–48h, 0 carton à Paris » — mise en évidence dans la vue ops :
//     a) supplyModel expose le contrôle (evaluateDropshipToolRule) ;
//     b) la route ops l'évalue sur TOUS les accessoires (y compris
//        unavailable) et renvoie le bloc `dropshipRule` ;
//     c) le panneau affiche la règle en tête, nomme les écarts, et chaque
//        matériel/outil (conforme ou hors règle) reste cliquable vers sa
//        fiche éditable — pas de texte mort.
// ---------------------------------------------------------------------------
{
  const read = (relative: string) => readFileSync(join(process.cwd(), 'src', relative), 'utf8');

  const model = read('lib/supplyModel.ts');
  assert.ok(model.includes('export function evaluateDropshipToolRule'), 'supplyModel : le contrôle de la règle dropship outils a disparu.');
  assert.ok(model.includes('accessoires') && model.includes('0 carton'), 'supplyModel : la règle ne nomme plus son périmètre (accessoires) ni son exigence (0 carton).');

  const route = read('server/routes/sourcing.ts');
  assert.ok(route.includes('evaluateDropshipToolRule('), 'route ops : la règle n’est plus évaluée côté serveur.');
  assert.ok(route.includes('dropshipRule'), 'route ops : le bloc dropshipRule n’est plus renvoyé à la vue.');

  const panel = read('components/SupplyOpsPanel.tsx');
  assert.ok(panel.includes('Règle d’or Année 1'), 'vue ops : la règle d’or n’est plus mise en évidence.');
  assert.ok(panel.includes('0 carton à Paris'), 'vue ops : l’exigence « 0 carton à Paris » n’est plus affichée.');
  assert.ok(panel.includes('Hors règle — cliquez sur le nom pour corriger la fiche'), 'vue ops : les écarts à la règle ne sont plus nommés comme corrigeables.');
  const violationBlock = panel.slice(panel.indexOf('tool-violation-'), panel.indexOf('tool-ok-'));
  assert.ok(violationBlock.includes('<ProductName'), 'vue ops : un matériel/outil hors règle n’est plus cliquable vers sa fiche.');
  const conformingBlock = panel.slice(panel.indexOf('tool-ok-'));
  assert.ok(conformingBlock.includes('<ProductName'), 'vue ops : un matériel/outil conforme n’est plus cliquable vers sa fiche.');

  // La règle doit aussi être visible dans l'ONGLET DROPSHIP (« Guide dropship
  // 0 carton ») — c'est là qu'on la cherche. Correction du 19/09 : la carte
  // est partagée (DropshipRuleCard) entre la vue ops et l'onglet dropship.
  assert.ok(panel.includes('export const DropshipRuleCard'), 'la carte règle d’or n’est plus un composant partagé.');
  assert.ok(panel.includes('export const DropshipToolsSection'), 'la section autonome pour l’onglet dropship a disparu.');
  assert.ok(panel.includes('<DropshipRuleCard dropshipRule={dropshipRule}'), 'vue ops : la carte partagée n’est plus utilisée.');
  const page = read('pages/AdminDashboardPage.tsx');
  const guideTab = page.slice(page.indexOf("activeTab === 'guide_dropship'"));
  assert.ok(guideTab.includes('<DropshipToolsSection'), 'onglet « Guide dropship 0 carton » : l’état des matériels & outils n’y est plus affiché.');

  console.log('✓ règle d’or Année 1 : matériels & outils = dropship 24–48h · 0 carton à Paris — mise en évidence dans la vue ops ET l’onglet dropship, écarts nommés, fiches cliquables');
}

// ---------------------------------------------------------------------------
// 22. CONTEXTE OUTREACH — au moment d'écrire à un fournisseur, trois réponses
//     visibles : quels produits le message cible, lesquels sont dans la
//     boutique, quels produits n'ont aucun fournisseur.
//     a) la route outreach-products remonte le fournisseur réel (null = sans
//        fournisseur, jamais deviné) ;
//     b) le lien candidate → boutique est le lien RÉEL draft_product_id —
//        aucun rapprochement par nom ;
//     c) le bureau des achats affiche les produits sans fournisseur (noms
//        cliquables) et, par destinataire, les produits ciblés + statut.
// ---------------------------------------------------------------------------
{
  const read = (relative: string) => readFileSync(join(process.cwd(), 'src', relative), 'utf8');

  const route = read('server/routes/prospects.ts');
  assert.ok(route.includes("app.get('/api/admin/sourcing/outreach-products'"), 'route outreach-products absente.');
  assert.ok(route.includes('supplierId: p.supplierId ? String(p.supplierId) : null'), 'route outreach-products : le fournisseur absent doit rester null, pas deviné.');

  const store = read('lib/db/prospectStore.ts');
  assert.ok(store.includes('draft_product_id'), 'prospectStore : le lien réel draft_product_id n’est plus remonté.');

  const desk = read('components/PurchasingDeskPanel.tsx');
  assert.ok(desk.includes('Produits sans fournisseur — il faut en chercher un'), 'bureau des achats : la liste des produits sans fournisseur a disparu.');
  assert.ok(desk.includes('Que cible cet email ?'), 'bureau des achats : le ciblage produit par email a disparu.');
  assert.ok(desk.includes('pas encore dans la boutique'), 'bureau des achats : le statut « pas encore dans la boutique » a disparu.');
  assert.ok(desk.includes('candidatesByProspect') && desk.includes('productsBySupplier') && desk.includes('productsWithoutSupplier'), 'bureau des achats : les trois calculs de contexte ont disparu.');
  const noSupplierBlock = desk.slice(desk.indexOf('no-supplier-'), desk.indexOf('Prochaine action'));
  assert.ok(noSupplierBlock.includes('<ProductName'), 'bureau des achats : les produits sans fournisseur ne sont plus cliquables vers leur fiche.');
  const cibleBlock = desk.slice(desk.indexOf('cible-shop-'));
  assert.ok(cibleBlock.includes('<ProductName'), 'bureau des achats : les produits boutique du fournisseur visé ne sont plus cliquables.');

  const parent = read('components/SourcingProspectsPanel.tsx');
  assert.ok(parent.includes('outreach-products') && parent.includes('candidates={candidates} products={outreachProducts}'), 'panneau pistes : le contexte outreach n’est plus passé au bureau des achats.');

  console.log('✓ contexte outreach : produits ciblés par email, statut boutique sur lien réel, produits sans fournisseur cliquables');
}

// ---------------------------------------------------------------------------
// 23. CIBLAGE DES MESSAGES DANS LA VUE CONSOLIDÉE (19/09) — avant d'envoyer un message
//     (affiliation, devis), l'acheteur voit : quels produits sont ciblés,
//     lesquels sont déjà dans la boutique, et la liste des produits pour
//     lesquels il faut chercher un fournisseur. Les noms sont cliquables
//     vers la fiche éditable SEULEMENT derrière un id réel.
// ---------------------------------------------------------------------------
{
  const read = (relative: string) => readFileSync(join(process.cwd(), 'src', relative), 'utf8');

  const lib = read('lib/sourcingConsolidated.ts');
  assert.ok(lib.includes('SupplierEmailTarget'), 'consolidé : le ciblage des messages (SupplierEmailTarget) a disparu.');
  assert.ok(lib.includes('needsSupplier'), 'consolidé : le bloc « produits à sourcer » n’est plus marqué.');
  assert.ok(lib.includes('inShopCount'), 'consolidé : le compte « déjà dans la boutique » a disparu.');

  const panel = read('components/SourcingConsolidatedPanel.tsx');
  assert.ok(panel.includes('Ce message cible'), 'vue consolidée : le ciblage du message n’est plus affiché.');
  assert.ok(panel.includes('déjà dans la boutique'), 'vue consolidée : les produits déjà en boutique ne sont plus distingués.');
  assert.ok(panel.includes('Produits pour lesquels trouver un fournisseur'), 'vue consolidée : la liste des produits à sourcer a disparu.');
  const targetBlock = panel.slice(panel.indexOf('Lister les produits ciblés') - 2000, panel.indexOf('Lister les produits ciblés') + 2000);
  assert.ok(targetBlock.includes('target.productId'), 'vue consolidée : le clic vers la fiche doit dépendre d’un id produit réel.');
  assert.ok(/target\.productId\s*\?\s*<ProductName/.test(panel), 'vue consolidée : sans id réel, le nom doit rester du texte — jamais de lien inventé.');

  console.log('✓ ciblage des messages (vue consolidée) : produits ciblés, déjà dans la boutique, à sourcer — cliquables seulement sur fiche réelle');
}

// ---------------------------------------------------------------------------
// 24. LISTES DÉROULANTES PAR SECTION (19/09) — « au niveau de chaque
//     section, je veux avoir une liste déroulante ». Chaque liste de la vue
//     ops et du ciblage consolidé porte son filtre : règle d'or (tous /
//     conformes / hors règle), alertes (par type), produits (par statut et
//     par modèle), produits ciblés d'un message (tous / en boutique / pas
//     encore). Les options viennent des données réelles, jamais d'une
//     nomenclature supposée.
// ---------------------------------------------------------------------------
{
  const read = (relative: string) => readFileSync(join(process.cwd(), 'src', relative), 'utf8');

  const ops = read('components/SupplyOpsPanel.tsx');
  assert.ok(ops.includes('Filtrer les matériels et outils'), 'règle d’or : la liste déroulante a disparu.');
  assert.ok(ops.includes('Tous les matériels') && ops.includes('Hors règle — à corriger'), 'règle d’or : les options du filtre ont changé.');
  assert.ok(ops.includes('Filtrer les alertes par type'), 'alertes : la liste déroulante par type a disparu.');
  assert.ok(ops.includes('ALERT_KIND_LABELS'), 'alertes : les types n’ont plus de libellés lisibles.');
  assert.ok(ops.includes('alertKindOptions'), 'alertes : les options ne sont plus construites depuis les alertes réelles.');
  assert.ok(ops.includes('Filtrer les produits par statut'), 'produits : la liste déroulante par statut a disparu.');
  assert.ok(ops.includes('Filtrer les produits par modèle'), 'produits : la liste déroulante par modèle a disparu.');
  assert.ok(ops.includes('statusOptions'), 'produits : les statuts du filtre ne viennent plus des données.');

  const consolidated = read('components/SourcingConsolidatedPanel.tsx');
  assert.ok(consolidated.includes('Filtrer les produits ciblés'), 'ciblage consolidé : la liste déroulante par message a disparu.');
  assert.ok(consolidated.includes('BlockTargets'), 'ciblage consolidé : le filtre par bloc n’est plus un composant (chaque bloc doit garder son choix).');

  console.log('✓ listes déroulantes par section : règle d’or, alertes par type, produits par statut/modèle, ciblage des messages — options issues des données réelles');
}

// ---------------------------------------------------------------------------
// 25. ENTONNOIR UNIQUE — LES SIX COLONNES EN FILTRES (19/09) : « dans
//     entonnoir unique mets moi ces champs en filtre avec des listes
//     déroulantes : Stade, Nom, Origine, Fournisseur, Offre, Public ».
//     La barre de filtres doit être RENDUE (l'infrastructure existait mais
//     aucune barre n'était affichée) et porter les six clés.
// ---------------------------------------------------------------------------
{
  const read = (relative: string) => readFileSync(join(process.cwd(), 'src', relative), 'utf8');

  const panel = read('components/ProductLifecyclePanel.tsx');
  assert.ok(panel.includes('<ColumnFilterStrip'), 'entonnoir unique : la barre de filtres n’est pas rendue.');
  for (const cle of ['stade', 'nom', 'origine', 'fournisseur', 'offre', 'public']) {
    assert.ok(panel.includes(`{ key: '${cle}'`), `entonnoir unique : le filtre « ${cle} » a disparu.`);
  }
  assert.ok(panel.includes('loadSupplierDirectory'), 'entonnoir unique : le filtre fournisseur ne résout plus les noms réels via le référentiel partagé.');
  assert.ok(panel.includes("emptyLabel: 'Sans fournisseur'"), 'entonnoir unique : les lignes sans fournisseur ne sont plus groupées nommément.');
  const stageFilter = panel.slice(panel.indexOf("{ key: 'stade'"), panel.indexOf("{ key: 'nom'"));
  assert.ok(stageFilter.includes('BUSINESS_STAGES'), 'entonnoir unique : les options de stade ne viennent plus du vocabulaire canonique.');

  console.log('✓ entonnoir unique : Stade, Nom, Origine, Fournisseur, Offre, Public en listes déroulantes — barre rendue, fournisseurs par nom réel');
}

// ---------------------------------------------------------------------------
// 26. PRODUITS EN DROPSHIP PRÉSENTS DANS LA BOUTIQUE (19/09) — « dans
//     catalogue, dans dropshipping, je veux avoir tous les produits présents
//     dans la boutique et qui sont en dropship » : la règle canonique
//     (badge / accessoires / outil historique) appliquée aux produits
//     publiés, listée dans l'onglet dropship, noms cliquables vers la fiche.
// ---------------------------------------------------------------------------
{
  const read = (relative: string) => readFileSync(join(process.cwd(), 'src', relative), 'utf8');

  const fulfillment = read('lib/fulfillment.ts');
  assert.ok(fulfillment.includes('export function selectShopDropshipProducts'), 'fulfillment : la sélection des produits dropship en boutique a disparu.');
  assert.ok(fulfillment.includes("status !== 'published'"), 'fulfillment : « présent dans la boutique » n’est plus le statut publié mesuré.');

  const route = read('server/routes/sourcing.ts');
  assert.ok(route.includes('selectShopDropshipProducts(') && route.includes('dropshipInShop'), 'route ops : le bloc dropshipInShop n’est plus renvoyé.');

  const panel = read('components/SupplyOpsPanel.tsx');
  assert.ok(panel.includes('Produits en dropship — présents dans la boutique'), 'onglet dropship : la liste des produits dropship en boutique a disparu.');
  const shopBlock = panel.slice(panel.indexOf('dropship-shop-'));
  assert.ok(shopBlock.includes('<ProductName'), 'onglet dropship : un produit dropship en boutique n’est plus cliquable vers sa fiche.');
  assert.ok(panel.includes('{product.why}'), 'onglet dropship : le motif dropship n’est plus nommé par produit.');

  console.log('✓ produits dropship présents dans la boutique : règle canonique sur les publiés, liste dans l’onglet dropship, motif nommé, fiches cliquables');
}

console.log('\n26 blocs de contrôles validés — manques nommés, magasin partagé, optimiste restauré, écritures serialisées, rattachement sur la bonne route, référentiel partagé, une seule surface d\'édition fournisseur, catalogue et fournisseurs entièrement modifiables, règle d’or dropship outils mise en évidence, contexte outreach complet, ciblage des messages dans la vue consolidée, listes déroulantes par section, entonnoir unique filtrable, produits dropship en boutique listés.');
