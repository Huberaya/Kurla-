import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import { BRAND_CONTRACT_TERMS_TEXT, BRAND_CONTRACT_TERMS_VERSION } from '../src/lib/brandContractTerms';
import { deleteUserData, exportUserData } from '../src/lib/db/privacyStore';

/**
 * CHANTIER 12 (bloc D) — banc « contrat marque ».
 *
 * Critère de sortie du chantier F : « un contrat marque signé sur agrégats,
 * sans aucune donnée personnelle cédée ». Ce banc vérifie les façons dont un
 * contrat rate en pratique :
 *  1. un contrat non signé ne laisse rien passer ;
 *  2. les clauses ne sont pas présumées — elles se cochent une par une ;
 *  3. une marque ne signe pas le contrat d'une autre ;
 *  4. KURLA ne contresigne pas avant la marque ;
 *  5. changer le texte invalide les signatures (l'empreinte est vérifiée) ;
 *  6. un contrat est une donnée personnelle : il sort à l'export et part à la
 *     suppression.
 */

const BRAND = 'brand-1';
const OTHER_BRAND = 'brand-2';
const ADMIN = 'admin-1';

const CLAUSES = {
  acceptsAggregateOnly: true,
  acceptsNoPersonalDataTransfer: true,
  confirmsTermsVersionRead: true
};

async function runBrandContractTests(): Promise<void> {
  serverDb.inMemoryBrandContracts = [];
  serverDb.inMemoryBrandTestRequests = [];

  // ---------------------------------------------------------------------
  // 0. Le texte signé est bien celui qu'on montre, et son empreinte est stable.
  // ---------------------------------------------------------------------
  const termsRouteHash = createHash('sha256').update(BRAND_CONTRACT_TERMS_TEXT).digest('hex');
  assert.match(BRAND_CONTRACT_TERMS_TEXT, /agrégats k-anonymes/, 'la clause agrégats doit figurer dans le texte signé');
  assert.match(BRAND_CONTRACT_TERMS_TEXT, /Aucune donnée personnelle n'est cédée/, 'la clause non-cession doit figurer dans le texte signé');

  // ---------------------------------------------------------------------
  // 1. Sans contrat, aucune demande de test.
  // ---------------------------------------------------------------------
  await assert.rejects(
    () => serverDb.createBrandTestRequest({
      brandUserId: BRAND,
      brandName: 'Marque Test',
      contactEmail: 'contact@marque.test',
      productName: 'Sérum',
      hypothesis: 'Le sérum améliore l’hydratation.',
      cohort: { needs: ['hydration'] } as never,
      targetParticipants: 30,
      durationDays: 30
    }),
    /contrat/i
  );

  const gateBefore = await serverDb.resolveBrandContractEligibility(BRAND);
  assert.equal(gateBefore.eligible, false);
  assert.match(gateBefore.reason || '', /Aucun contrat émis/);

  // ---------------------------------------------------------------------
  // 2. Émission, puis refus de signer sans les trois clauses.
  // ---------------------------------------------------------------------
  const contract = await serverDb.issueBrandContract(ADMIN, {
    brandUserId: BRAND,
    brandName: 'Marque Test',
    contactEmail: 'contact@marque.test',
    priceCents: 45000
  });
  assert.equal(contract.status, 'issued');
  assert.equal(contract.termsVersion, BRAND_CONTRACT_TERMS_VERSION);
  assert.equal(contract.termsHash, termsRouteHash, 'l’empreinte du contrat doit égaler celle du texte affiché');

  await assert.rejects(
    () => serverDb.signBrandContract(BRAND, contract.id, { ...CLAUSES, acceptsAggregateOnly: false }),
    /agrégats k-anonymes/
  );
  await assert.rejects(
    () => serverDb.signBrandContract(BRAND, contract.id, { ...CLAUSES, acceptsNoPersonalDataTransfer: false }),
    /aucune donnée personnelle/
  );
  await assert.rejects(
    () => serverDb.signBrandContract(BRAND, contract.id, { ...CLAUSES, confirmsTermsVersionRead: false }),
    /lecture de la version/
  );

  // Une autre marque ne signe pas ce contrat.
  await assert.rejects(
    () => serverDb.signBrandContract(OTHER_BRAND, contract.id, CLAUSES),
    /pas été émis pour votre compte/
  );

  // KURLA ne contresigne pas avant la marque.
  await assert.rejects(
    () => serverDb.countersignBrandContract(ADMIN, contract.id),
    /n’a pas encore signé/
  );

  // ---------------------------------------------------------------------
  // 3. Les deux signatures, dans l'ordre, activent le contrat.
  // ---------------------------------------------------------------------
  const signed = await serverDb.signBrandContract(BRAND, contract.id, CLAUSES);
  assert.ok(signed.signedByBrandAt);
  assert.equal(signed.status, 'issued', 'la signature de la marque ne suffit pas à activer');

  const gateHalf = await serverDb.resolveBrandContractEligibility(BRAND);
  assert.equal(gateHalf.eligible, false);

  const active = await serverDb.countersignBrandContract(ADMIN, contract.id);
  assert.equal(active.status, 'active');
  assert.ok(active.signedByKurlaAt);

  const gateOk = await serverDb.resolveBrandContractEligibility(BRAND);
  assert.equal(gateOk.eligible, true);
  assert.equal(gateOk.contractId, contract.id);

  // Un second contrat actif pour la même marque est refusé.
  const second = await serverDb.issueBrandContract(ADMIN, {
    brandUserId: BRAND,
    brandName: 'Marque Test',
    contactEmail: 'contact@marque.test'
  });
  await serverDb.signBrandContract(BRAND, second.id, CLAUSES);
  await assert.rejects(
    () => serverDb.countersignBrandContract(ADMIN, second.id),
    /déjà un contrat actif/
  );

  // ---------------------------------------------------------------------
  // 4. Avec un contrat actif, la demande de test passe.
  // ---------------------------------------------------------------------
  const request = await serverDb.createBrandTestRequest({
    brandUserId: BRAND,
    brandName: 'Marque Test',
    contactEmail: 'contact@marque.test',
    productName: 'Sérum',
    hypothesis: 'Le sérum améliore l’hydratation.',
    cohort: { needs: ['hydration'] } as never,
    targetParticipants: 30,
    durationDays: 30
  });
  assert.equal(request.status, 'submitted');

  // ---------------------------------------------------------------------
  // 5. Un texte qui change invalide la signature.
  // ---------------------------------------------------------------------
  const outdated = serverDb.inMemoryBrandContracts.find(item => item.id === contract.id)!;
  outdated.termsVersion = 'KURLA-BRAND-v0';
  const gateOutdated = await serverDb.resolveBrandContractEligibility(BRAND);
  assert.equal(gateOutdated.eligible, false);
  assert.match(gateOutdated.reason || '', /nouvelle signature/);
  await assert.rejects(
    () => serverDb.createBrandTestRequest({
      brandUserId: BRAND,
      brandName: 'Marque Test',
      contactEmail: 'contact@marque.test',
      productName: 'Sérum',
      hypothesis: 'Le sérum améliore l’hydratation.',
      cohort: { needs: ['hydration'] } as never,
      targetParticipants: 30,
      durationDays: 30
    }),
    /nouvelle signature/
  );
  outdated.termsVersion = BRAND_CONTRACT_TERMS_VERSION;

  // ---------------------------------------------------------------------
  // 6. Résiliation : plus de nouvelle demande, motif obligatoire.
  // ---------------------------------------------------------------------
  await assert.rejects(() => serverDb.terminateBrandContract(contract.id, 'x'), /motif de résiliation/);
  const terminated = await serverDb.terminateBrandContract(contract.id, 'Fin de partenariat, à la demande de la marque.');
  assert.equal(terminated.status, 'terminated');
  const gateAfter = await serverDb.resolveBrandContractEligibility(BRAND);
  assert.equal(gateAfter.eligible, false);

  // ---------------------------------------------------------------------
  // 7. RGPD : le contrat sort à l'export et part à la suppression.
  // ---------------------------------------------------------------------
  const exported = await exportUserData(serverDb, BRAND);
  const exportedContracts = exported.sections.brandContracts as unknown[];
  assert.ok(exportedContracts.length >= 2, 'les contrats de la marque doivent sortir dans l’export');
  assert.deepEqual(exported.exportErrors, [], 'un export ne doit rien omettre en silence');

  const neighbourExport = await exportUserData(serverDb, OTHER_BRAND);
  assert.equal((neighbourExport.sections.brandContracts as unknown[]).length, 0);

  await deleteUserData(serverDb, BRAND);
  assert.equal(serverDb.inMemoryBrandContracts.some(item => item.brandUserId === BRAND), false);
  assert.equal(serverDb.inMemoryBrandTestRequests.length, 1, 'la demande de test reste : elle est rattachée au test, pas au contrat');

  // ---------------------------------------------------------------------
  // 8. Lecture publique du texte, écriture authentifiée.
  // ---------------------------------------------------------------------
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const terms = await fetch(`${baseUrl}/api/brand-contracts/terms`);
    assert.equal(terms.status, 200);
    const termsBody = await terms.json() as { version: string; termsHash: string; text: string };
    assert.equal(termsBody.version, BRAND_CONTRACT_TERMS_VERSION);
    assert.equal(termsBody.termsHash, termsRouteHash, 'l’API doit publier l’empreinte du texte qu’elle affiche');
    assert.equal(termsBody.text, BRAND_CONTRACT_TERMS_TEXT);

    const issue = await fetch(`${baseUrl}/api/admin/brand-contracts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brandUserId: OTHER_BRAND, brandName: 'Autre', contactEmail: 'a@b.test' })
    });
    assert.equal(issue.status, 401);

    const sign = await fetch(`${baseUrl}/api/brand-contracts/whatever/sign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(CLAUSES)
    });
    assert.equal(sign.status, 401);

    const mine = await fetch(`${baseUrl}/api/brand-contracts/mine`);
    assert.equal(mine.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Contrat marque banc : clauses non présumées, ordre des signatures imposé, texte versionné, contrat couvert par le RGPD.');
}

runBrandContractTests().catch(error => {
  console.error('[FAIL] Contrat marque banc :', error);
  process.exitCode = 1;
});
