/**
 * WORKBENCH CATALOGUE (dashboard admin — chantier 17/09, phase 2).
 *
 * La fiche produit passe d'un CRUD à un espace de travail : filtres rapides,
 * sélection multiple + actions groupées, et « Vue 360 » qui assemble les trois
 * points de vue de l'acheteur. Deux fonctions pures sont couvertes ici :
 *   - `buildProduct360` : commercial (état publication + manques), appro
 *     (fournisseur + dernier coût de lot reçu), demande (précommandes) —
 *     un champ inconnu reste null, jamais supposé ;
 *   - `productsSelectionToCsv` : export RFC4180 (CRLF, échappements).
 */
import { strict as assert } from 'node:assert';
import { buildProduct360, productsSelectionToCsv } from '../src/components/CatalogAdminPanel';

/* 1. 360 vide / sources absentes → null, jamais de plantage. */
{
  const result = buildProduct360({ product: null, supplier: null, readiness: null, batches: [], demandRow: null });
  assert.equal(result.commercial.status, 'inconnu');
  assert.equal(result.commercial.ready, null, 'readiness absente → état inconnu (null), pas faux/prêt');
  assert.deepEqual(result.commercial.missing, []);
  assert.equal(result.supply.supplierName, null);
  assert.equal(result.supply.lotsReceived, 0);
  assert.equal(result.supply.lastLotCostEur, null);
  assert.equal(result.demand.hasDemand, false);
  console.log('✓ 360 vide : nulls honnêtes, pas de plantage');
}

/* 2. 360 complet : état bloqué + manques, fournisseur + dernier lot, demande. */
{
  const result = buildProduct360({
    product: { id: 'p1', name: 'Sérum', catalogStatus: 'published', inStock: false, stockQuantity: 0, isPreorder: true },
    supplier: { legalName: 'Qudo Beauty', country: 'RO', moqUnits: 300, leadTimeDays: 10, verificationStatus: 'verified' },
    readiness: { ready: false, missing: ['CPNP+RP+CPSR manquants', 'visuel non autorisé'] },
    batches: [
      { receivedOn: '2026-08-01', quantityReceived: 50, unitCost: 900 },
      { receivedOn: '2026-09-15', quantityReceived: 200, unitCost: 850 }
    ],
    demandRow: { qtyFirm: 12, qtyPending: 3, qtyToSource: 20, orderCountFirm: 12 }
  });
  assert.equal(result.commercial.status, 'published');
  assert.equal(result.commercial.ready, false);
  assert.deepEqual(result.commercial.missing, ['CPNP+RP+CPSR manquants', 'visuel non autorisé']);
  assert.equal(result.supply.supplierName, 'Qudo Beauty');
  assert.equal(result.supply.country, 'RO');
  assert.equal(result.supply.moqUnits, 300);
  assert.equal(result.supply.leadTimeDays, 10);
  assert.equal(result.supply.verified, true);
  assert.equal(result.supply.lotsReceived, 2);
  assert.equal(result.supply.lastLotCostEur, 8.5, 'dernier lot reçu (15/09) fait foi : 850 centimes');
  assert.equal(result.demand.hasDemand, true);
  assert.equal(result.demand.qtyFirm, 12);
  assert.equal(result.demand.qtyPending, 3);
  assert.equal(result.demand.qtyToSource, 20);
  console.log('✓ 360 complet : manques nommés, fournisseur vérifié, dernier lot, demande exacte');
}

/* 3. 360 : lot sans coût → null ; fournisseur non vérifié ; MOQ/délai absentes. */
{
  const result = buildProduct360({
    product: { id: 'p2', name: 'Huile', catalogStatus: 'draft' },
    supplier: { legalName: 'Ankorstore', verificationStatus: 'pending' },
    readiness: { ready: true, missing: [] },
    batches: [{ receivedOn: '2026-07-01', quantityReceived: 10, unitCost: null }],
    demandRow: null
  });
  assert.equal(result.commercial.ready, true);
  assert.equal(result.supply.supplierName, 'Ankorstore');
  assert.equal(result.supply.verified, false);
  assert.equal(result.supply.moqUnits, null, 'MOQ absente → null, jamais 0');
  assert.equal(result.supply.leadTimeDays, null);
  assert.equal(result.supply.lotsReceived, 1, 'le lot compte même sans coût');
  assert.equal(result.supply.lastLotCostEur, null, 'lot sans coût → à obtenir (null)');
  assert.equal(result.demand.hasDemand, false);
  console.log('✓ 360 : lots sans coût, MOQ/délai null, jamais de valeur supposée');
}

/* 4. Export CSV sélection : en-tête, CRLF, oui/non, échappements. */
{
  const csv = productsSelectionToCsv([
    { id: 'a', name: 'Sérum, 4C', slug: 'serum-4c', brand: 'KURLA', price: 14.9, catalogStatus: 'published', supplierName: 'Qudo Beauty', ready: true, missing: [] },
    { id: 'b', name: 'Sérum "pro"', slug: 'serum-pro', brand: null, price: 19.5, catalogStatus: 'draft', supplierName: null, ready: false, missing: ['CPNP', 'visuel'] }
  ]);
  assert.ok(csv.endsWith('\r\n'), 'CRLF final');
  const lines = csv.trimEnd().split('\r\n');
  assert.equal(lines.length, 3, 'en-tête + 2 lignes');
  assert.equal(lines[0], 'Reference,Nom,Slug,Marque,Prix_eur,Statut,Fournisseur,Publiable,Manquants');
  assert.ok(lines[1].includes('"Sérum, 4C"'), 'virgule → entre guillemets');
  assert.ok(lines[1].includes('oui'), 'prête → oui');
  assert.ok(lines[2].includes('"Sérum ""pro"""'), 'guillemets doublés');
  assert.ok(lines[2].includes('non'), 'bloquée → non');
  assert.ok(lines[2].includes('CPNP | visuel'), 'manques concaténés');
  console.log('✓ CSV : RFC4180, oui/non, échappements, manques nommés');
}

console.log('\n4 blocs de contrôles « workbench catalogue » validés — vue 360, honnêteté des nulls, export CSV.');
