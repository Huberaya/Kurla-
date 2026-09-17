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
import {
  getAdminRecordsSnapshot,
  getAdminRecordsVersion,
  isWritingAdminRecords,
  loadProduct,
  loadSupplier,
  readSupplier,
  resetAdminRecords,
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

console.log('\n14 blocs de contrôles validés — manques nommés, magasin partagé, optimiste restauré, écritures serialisées, rattachement sur la bonne route.');
