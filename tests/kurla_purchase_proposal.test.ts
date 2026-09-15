/**
 * PROPOSITION D'ACHAT (dashboard admin — chantier 17/09, phase 3).
 *
 * `buildPurchaseProposal` assemble demande (précommandes, kits déroulés), stock,
 * fournisseur (MOQ/délai), coût du dernier lot reçu et pièces manquantes en un
 * tableau d'achat. Contrats :
 *   - quantité à commander = max(0, demande − stock) — jamais négative,
 *   - coût unitaire = coût réel du LOT REÇU LE PLUS RÉCENT (centimes → euros),
 *     sinon null + « à obtenir » : jamais d'estimation inventée,
 *   - total estimé = somme des lignes à commander AUSSI TOUTES connues, sinon
 *     estimation partielle nommée (estComplete false),
 *   - tri : quantité à commander décroissante,
 *   - export CSV RFC4180 (CRLF, échappements),
 *   - robuste : sources absentes → résultat vide, jamais de plantage.
 */
import { strict as assert } from 'node:assert';
import { buildPurchaseProposal, purchaseProposalToCsv } from '../src/components/PurchaseProposalPanel';

/* 1. Aucune demande → tableau vide, zéros, estimation « complète » par vacuité. */
{
  const result = buildPurchaseProposal({});
  assert.deepEqual(result.rows, []);
  assert.deepEqual(result.totals, { refs: 0, units: 0, estEur: null, estComplete: true });

  const nulls = buildPurchaseProposal({ demand: null, products: null, suppliers: null, batches: null, readiness: null });
  assert.deepEqual(nulls.rows, []);
  console.log('✓ vide : pas de demande → proposition vide, pas de plantage');
}

/* 2. À commander = max(0, demande − stock) ; stock suffisant → « couvert ». */
{
  const result = buildPurchaseProposal({
    demand: [
      { productId: 'a', name: 'A', qtyToSource: 10 },
      { productId: 'b', name: 'B', qtyToSource: 5 },
      { productId: 'c', name: 'C', qtyToSource: 0 },
      { productId: 'd', name: 'D', qtyToSource: 3 }
    ],
    products: [
      { id: 'a', stockQuantity: 4 },
      { id: 'b', stockQuantity: 5 },
      { id: 'd', stockQuantity: 10 }
    ]
  });
  assert.equal(result.rows.length, 3, 'demande nulle exclue (c)');
  const byId = (id: string) => result.rows.find(r => r.productId === id)!;
  assert.equal(byId('a').qtyToOrder, 6, '10 demandées − 4 en stock');
  assert.equal(byId('b').qtyToOrder, 0, 'stock = demande → couvert');
  assert.equal(byId('d').qtyToOrder, 0, 'stock > demande → jamais négatif');
  assert.equal(result.totals.units, 6, 'unités totales = 6');
  console.log('✓ quantités : demande − stock bornée à zéro, couvert géré');
}

/* 3. Coût unitaire = dernier lot reçu (pas la moyenne, pas un inventé). */
{
  const result = buildPurchaseProposal({
    demand: [
      { productId: 'a', name: 'A', qtyToSource: 2 },
      { productId: 'b', name: 'B', qtyToSource: 3 },
      { productId: 'c', name: 'C', qtyToSource: 4 }
    ],
    batches: [
      { productId: 'a', receivedOn: '2026-09-01', unitCost: 850 },
      { productId: 'a', receivedOn: '2026-10-01', unitCost: 920 },
      { productId: 'b', receivedOn: '2026-09-15', unitCost: null }
    ]
  });
  const byId = (id: string) => result.rows.find(r => r.productId === id)!;
  assert.equal(byId('a').unitCostEur, 9.2, 'le lot le plus récent fait foi (920 centimes)');
  assert.ok(byId('a').unitCostLabel.includes('2026-10-01'));
  assert.equal(byId('b').unitCostEur, null, 'lot sans coût connu → à obtenir');
  assert.equal(byId('b').unitCostLabel, 'à obtenir');
  assert.equal(byId('c').unitCostEur, null, 'aucun lot → à obtenir');
  assert.equal(byId('a').totalEstEur, 18.4, '2 × 9,20 €');
  assert.equal(byId('b').totalEstEur, null);
  console.log('✓ coût : dernier lot reçu fait foi, sinon à obtenir');
}

/* 4. Fournisseur : MOQ + délai rattachés, null sinon. */
{
  const result = buildPurchaseProposal({
    demand: [{ productId: 'a', name: 'A', qtyToSource: 1 }, { productId: 'b', name: 'B', qtyToSource: 2 }],
    products: [{ id: 'a', supplierId: 's1' }],
    suppliers: [{ id: 's1', legalName: 'Qudo Beauty', moqUnits: 300, leadTimeDays: 10 }]
  });
  const byId = (id: string) => result.rows.find(r => r.productId === id)!;
  assert.equal(byId('a').supplierName, 'Qudo Beauty');
  assert.equal(byId('a').moqUnits, 300);
  assert.equal(byId('a').leadTimeDays, 10);
  assert.equal(byId('b').supplierName, null, 'sans fournisseur → à sourcer (null)');
  assert.equal(byId('b').moqUnits, null);
  console.log('✓ fournisseur : MOQ/délai réels ou null, jamais supposé');
}

/* 5. Total estimé : complet seulement si toutes les lignes ont un coût. */
{
  const complete = buildPurchaseProposal({
    demand: [{ productId: 'a', name: 'A', qtyToSource: 2 }],
    products: [{ id: 'a', stockQuantity: 0 }],
    batches: [{ productId: 'a', receivedOn: '2026-09-01', unitCost: 1000 }]
  });
  assert.equal(complete.totals.estEur, 20, '2 × 10 €');
  assert.equal(complete.totals.estComplete, true);

  const partial = buildPurchaseProposal({
    demand: [
      { productId: 'a', name: 'A', qtyToSource: 2 },
      { productId: 'b', name: 'B', qtyToSource: 3 }
    ],
    products: [{ id: 'a', stockQuantity: 0 }, { id: 'b', stockQuantity: 0 }],
    batches: [{ productId: 'a', receivedOn: '2026-09-01', unitCost: 1000 }]
  });
  assert.equal(partial.totals.estEur, 20, 'seul le connu est sommé');
  assert.equal(partial.totals.estComplete, false, 'manque un coût → estimation partielle nommée');
  console.log('✓ total : estimation partielle nommée quand un coût manque');
}

/* 6. Pièces manquantes lues sur l'état de publication ; tri par quantité. */
{
  const result = buildPurchaseProposal({
    demand: [
      { productId: 'a', name: 'A', qtyToSource: 1 },
      { productId: 'b', name: 'B', qtyToSource: 9 }
    ],
    readiness: [
      { productId: 'a', missing: ['CPNP+RP+CPSR manquants'] },
      { productId: 'b', missing: [] }
    ]
  });
  assert.deepEqual(result.rows.map(r => r.productId), ['b', 'a'], 'tri : quantité à commander décroissante');
  assert.deepEqual(result.rows.find(r => r.productId === 'a')!.missing, ['CPNP+RP+CPSR manquants']);
  assert.deepEqual(result.rows.find(r => r.productId === 'b')!.missing, []);
  console.log('✓ pièces : manques nommés repris tels quels, tri par quantité');
}

/* 7. CSV : en-tête, CRLF, échappements, valeurs vides → chaîne vide. */
{
  const result = buildPurchaseProposal({
    demand: [{ productId: 'a', name: 'Sérum, "défi"', qtyToSource: 2 }],
    products: [{ id: 'a', supplierId: 's1' }],
    suppliers: [{ id: 's1', legalName: 'Lab, SARL' }],
    batches: [{ productId: 'a', receivedOn: '2026-09-01', unitCost: 1050 }]
  });
  const csv = purchaseProposalToCsv(result);
  assert.ok(csv.endsWith('\r\n'), 'finit par CRLF');
  const lines = csv.trimEnd().split('\r\n');
  assert.equal(lines.length, 2, 'en-tête + 1 ligne');
  assert.ok(lines[0].startsWith('Reference,Nom,Demande,Stock,A_commander'));
  assert.ok(lines[1].includes('"Sérum, ""défi"""'), 'virgule + guillemets échappés');
  assert.ok(lines[1].includes('"Lab, SARL"'), 'fournisseur avec virgule entre guillemets');
  assert.ok(lines[1].includes('10.5'), 'coût en euros avec point (machine)');
  assert.ok(lines[1].includes('21'), 'total estimé présent');
  console.log('✓ CSV : RFC4180, échappements, valeurs honnêtes');
}

console.log('\n7 blocs de contrôles « Proposition d’achat » validés — quantités, coût réel, totaux honnêtes, CSV.');
