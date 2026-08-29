import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import { buildRfqContent } from '../src/lib/sourcingRfq';

/**
 * CHANTIER 16C — banc « sourcing réel, par vague ».
 *
 * Ce banc ne vérifie pas que le sourcing a été fait — il ne peut pas : personne
 * n'a été contacté. Il vérifie que la plateforme **ne peut pas faire semblant** :
 *
 *  1. un besoin sans motif est refusé — un besoin sans raison est une envie ;
 *  2. le contenu d'une demande de prix cite les obligations réelles et marque
 *     explicitement ce qu'il ne sait pas, au lieu de l'inventer ;
 *  3. « envoyé » exige un destinataire existant et une date ;
 *  4. une réponse ne peut pas être enregistrée sur une demande jamais envoyée,
 *     et **aucun chiffre n'est déduit** : ce qui n'est pas chiffré reste vide ;
 *  5. la comparaison ne classe pas et ne choisit pas ;
 *  6. retenir un fournisseur est **bloqué** tant que les documents exigés ne
 *     sont pas enregistrés — une promesse dans un devis ne suffit pas ;
 *  7. les 7 routes sont montées et protégées, sans effet.
 */

const ADMIN = 'admin-sourcing-1';

function reset(): void {
  serverDb.inMemorySuppliers = [];
  serverDb.inMemorySupplierDocuments = [];
  serverDb.inMemoryProducts = [];
  serverDb.inMemorySourcingItems = [];
  serverDb.inMemoryRfqs = [];
  serverDb.inMemoryRfqResponses = [];
}

const ITEM = {
  wave: 'vague-1',
  title: 'Après-shampoing rincé',
  category: 'soin capillaire',
  rationale: 'Le catalogue lave et scelle, mais ne démêle pas sous la douche.',
  requiredDocuments: ['cpsr', 'gmp_iso_22716', 'microplastic_free']
};

async function runSourcingTests(): Promise<void> {
  // ---------------------------------------------------------------
  // 1. Un besoin sans motif est refusé.
  // ---------------------------------------------------------------
  reset();
  const noRationale = await serverDb.createSourcingItem(ADMIN, { ...ITEM, rationale: '' })
    .then(() => null).catch(error => error);
  assert.match(String(noRationale?.message), /motif est obligatoire/);

  const item = await serverDb.createSourcingItem(ADMIN, ITEM);
  assert.equal(item.status, 'to_source');
  assert.equal(item.requiredDocuments.length, 3);
  assert.equal(item.id, 'vague-1-apres-shampoing-rince', 'l’identifiant est dérivé de la vague et du titre');

  // ---------------------------------------------------------------
  // 2. Le contenu cite les obligations réelles et marque ses trous.
  // ---------------------------------------------------------------
  const content = buildRfqContent(item);
  assert.match(content, /Rapport de sécurité \(CPSR\)/);
  assert.match(content, /BPF — ISO 22716/);
  assert.match(content, /0,01 % de la masse/, 'l’interdiction AGEC doit être citée avec son seuil');
  assert.match(content, /1er janvier 2026/, 'la date d’entrée en vigueur doit être écrite');
  assert.match(content, /⟨à compléter⟩/, 'ce qui est inconnu doit être marqué, pas inventé');
  assert.doesNotMatch(content, /SIRET|@kurla\./, 'aucune identité juridique ou adresse inventée');

  // ---------------------------------------------------------------
  // 3. « Envoyé » exige un destinataire existant et une date.
  // ---------------------------------------------------------------
  const rfq = await serverDb.createRfq(ADMIN, item.id);
  assert.equal(rfq.status, 'draft');
  assert.equal(rfq.content, content, 'le contenu stocké est celui du générateur');
  assert.equal((await serverDb.getSourcingItem(item.id))?.status, 'in_rfq');

  const sendNoSupplier = await serverDb.markRfqSent(ADMIN, rfq.id, { sentOn: '2026-08-29' })
    .then(() => null).catch(error => error);
  assert.match(String(sendNoSupplier?.message), /destinataire identifié/);

  const sendUnknown = await serverDb.markRfqSent(ADMIN, rfq.id, { supplierId: 'inexistant', sentOn: '2026-08-29' })
    .then(() => null).catch(error => error);
  assert.match(String(sendUnknown?.message), /Fournisseur introuvable/);

  const supplierA = await serverDb.createSupplier(ADMIN, { legalName: 'Façonnier A', supplierType: 'contract_manufacturer' });
  const sent = await serverDb.markRfqSent(ADMIN, rfq.id, { supplierId: supplierA.id, sentOn: '2026-08-29', channel: 'courriel' });
  assert.equal(sent.status, 'sent');
  assert.equal(sent.sentOn, '2026-08-29');

  // ---------------------------------------------------------------
  // 4. Une réponse : pas sur un brouillon, pas sans date, rien de déduit.
  // ---------------------------------------------------------------
  reset();
  const item2 = await serverDb.createSourcingItem(ADMIN, { ...ITEM, title: 'Shampoing clarifiant' });
  const draftRfq = await serverDb.createRfq(ADMIN, item2.id);
  const onDraft = await serverDb.recordRfqResponse(ADMIN, draftRfq.id, { receivedOn: '2026-09-01', unitPriceCents: 420 })
    .then(() => null).catch(error => error);
  assert.match(String(onDraft?.message), /encore en brouillon/);

  const supplierB = await serverDb.createSupplier(ADMIN, { legalName: 'Façonnier B', supplierType: 'contract_manufacturer' });
  await serverDb.markRfqSent(ADMIN, draftRfq.id, { supplierId: supplierB.id, sentOn: '2026-08-29' });

  const noDate = await serverDb.recordRfqResponse(ADMIN, draftRfq.id, { unitPriceCents: 420 })
    .then(() => null).catch(error => error);
  assert.match(String(noDate?.message), /date de réception est obligatoire/);

  const noSubstance = await serverDb.recordRfqResponse(ADMIN, draftRfq.id, { receivedOn: '2026-09-01' })
    .then(() => null).catch(error => error);
  assert.match(String(noSubstance?.message), /sans prix et sans note/);

  // Réponse partielle : le prix est donné, le MOQ et le délai ne le sont pas.
  const partial = await serverDb.recordRfqResponse(ADMIN, draftRfq.id, {
    receivedOn: '2026-09-01', unitPriceCents: 420, currency: 'EUR'
  });
  assert.equal(partial.unitPriceCents, 420);
  assert.equal(partial.moqUnits, null, 'un MOQ absent doit rester null, pas devenir 0');
  assert.equal(partial.leadTimeDays, null, 'un délai absent doit rester null, pas devenir 0');
  assert.equal((await serverDb.getRfq(draftRfq.id))?.status, 'answered');

  // ---------------------------------------------------------------
  // 5. La comparaison ne classe pas ; elle signale ce qui manque.
  // ---------------------------------------------------------------
  const comparison = await serverDb.compareRfqResponses(item2.id);
  assert.equal(comparison.rows.length, 1);
  const row = comparison.rows[0];
  assert.equal(row.pricePerUnitEuros, 4.2);
  assert.deepEqual(row.documentsMissing.sort(), ['cpsr', 'gmp_iso_22716', 'microplastic_free']);
  assert.equal(row.selectable, false, 'sans aucun document exigé, la sélection doit être impossible');
  // Aucune notion de classement dans la structure renvoyée.
  assert.equal((row as any).rank, undefined, 'la comparaison ne doit pas classer');
  assert.equal((comparison as any).best, undefined, 'la comparaison ne doit pas désigner un gagnant');

  // ---------------------------------------------------------------
  // 6. Retenir est bloqué tant que les documents manquent.
  // ---------------------------------------------------------------
  const awardBlocked = await serverDb.awardSourcingItem(ADMIN, item2.id, partial.id)
    .then(() => null).catch(error => error);
  assert.match(String(awardBlocked?.message), /Sélection refusée/);
  assert.match(String(awardBlocked?.message), /cpsr/);
  assert.equal((await serverDb.getSourcingItem(item2.id))?.status, 'in_rfq', 'le statut ne doit pas avoir changé');

  // Un document seulement « offert » dans le devis ne suffit pas : il faut
  // l'enregistrer au référentiel, avec fichier et date.
  const awardStillBlocked = await serverDb.recordRfqResponse(ADMIN, draftRfq.id, {
    receivedOn: '2026-09-02', notes: 'CPSR et ISO 22716 fournis sur demande',
    documentsOffered: ['cpsr', 'gmp_iso_22716', 'microplastic_free']
  });
  const stillBlocked = await serverDb.awardSourcingItem(ADMIN, item2.id, awardStillBlocked.id)
    .then(() => null).catch(error => error);
  assert.match(String(stillBlocked?.message), /Sélection refusée/, 'une promesse dans un devis ne vaut pas un document enregistré');

  // Les documents réellement enregistrés débloquent la sélection.
  for (const documentType of ['cpsr', 'gmp_iso_22716', 'microplastic_free']) {
    await serverDb.addSupplierDocument(ADMIN, {
      supplierId: supplierB.id, documentType, fileUrl: `https://doc.test/${documentType}.pdf`, issuedOn: '2026-06-01'
    });
  }
  const awarded = await serverDb.awardSourcingItem(ADMIN, item2.id, partial.id);
  assert.equal(awarded.status, 'awarded');
  assert.equal(awarded.awardedSupplierId, supplierB.id);

  const twice = await serverDb.awardSourcingItem(ADMIN, item2.id, partial.id).then(() => null).catch(error => error);
  assert.match(String(twice?.message), /déjà attribué/);

  // ---------------------------------------------------------------
  // 7. Les 7 routes : montées, protégées, sans effet.
  // ---------------------------------------------------------------
  reset();
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });
  const { port } = listener.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const probes: Array<[string, string, any]> = [
      ['GET', '/api/admin/sourcing/items', undefined],
      ['POST', '/api/admin/sourcing/items', { wave: 'vague-1', title: 'Sonde', category: 'test', rationale: 'sonde' }],
      ['GET', '/api/admin/sourcing/items/sonde', undefined],
      ['POST', '/api/admin/sourcing/items/sonde/rfqs', {}],
      ['POST', '/api/admin/sourcing/rfqs/sonde/send', { supplierId: 'sonde', sentOn: '2026-08-29' }],
      ['POST', '/api/admin/sourcing/rfqs/sonde/responses', { receivedOn: '2026-09-01', unitPriceCents: 100 }],
      ['POST', '/api/admin/sourcing/items/sonde/award', { responseId: 'sonde' }]
    ];
    for (const [method, path, body] of probes) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      assert.equal(response.status, 401, `${method} ${path} doit répondre 401 sans jeton, obtenu ${response.status}`);
      const payload = await response.json().catch(() => ({}));
      assert.equal(payload.error, 'Authentification Supabase requise.', `${method} ${path} doit renvoyer le refus standard`);
    }
    assert.equal((await serverDb.listSourcingItems()).length, 0, 'aucun besoin ne doit être créé sans jeton');
    assert.equal(serverDb.inMemoryRfqs.length, 0, 'aucune demande ne doit être créée sans jeton');
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Sourcing banc : besoin motivé obligatoire, RFQ citant les obligations réelles sans rien inventer, envoi daté et destiné, aucun chiffre déduit, comparaison sans classement, sélection bloquée sans documents, 7 routes protégées.');
}

runSourcingTests().catch(error => {
  console.error('[FAIL] Sourcing banc :', error);
  process.exitCode = 1;
});
