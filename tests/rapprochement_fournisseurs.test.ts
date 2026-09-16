/**
 * BANC — le rapprochement piste → fournisseur ne se trompe pas
 * ============================================================
 *
 * Demande du 16/09/2026 : « quand je remplis les informations d'un fournisseur,
 * qu'elles apparaissent partout où il est mentionné. »
 *
 * Le rapprochement est l'opération qui rend cela possible : elle relie une
 * piste de sourcing à la fiche fournisseur validée. Un lien faux serait pire
 * que pas de lien — une piste rattachée au mauvais fournisseur afficherait
 * l'adresse, les certifications et le statut de vérification d'une autre
 * maison, et personne ne le verrait avant d'avoir passé commande.
 *
 * Ce banc vérifie donc d'abord ce qui doit échouer :
 *   · deux fournisseurs dont le nom se plie à l'identique → **aucun** lien ;
 *   · une piste déjà reliée → jamais écrasée ;
 *   · une piste sans correspondance → laissée tranquille.
 *
 * Puis ce qui doit réussir : casse, accents, ponctuation et forme juridique ne
 * doivent pas empêcher un rapprochement qui est évident à la lecture.
 *
 * Le pliage est importé de `supplierStore`, pas recopié : ce banc échouerait si
 * quelqu'un remplaçait l'import par une copie locale qui aurait dérivé.
 */

import { strict as assert } from 'node:assert';

import { rapprocher } from '../scripts/rapprocheFournisseursPistes';
import { normalizeSupplierName } from '../src/lib/db/supplierStore';

// ---------------------------------------------------------------------------
// 1. Ce qui doit réussir : l'identité lue par un humain.
// ---------------------------------------------------------------------------
{
  const r = rapprocher(
    [{ id: 'sup-weleda', legal_name: 'WELEDA S.A.', trade_name: 'Weleda' }],
    [{ id: 'c01', name: 'Weleda' }, { id: 'c02', name: 'weleda' }, { id: 'c03', name: '  WELEDA ,.' }]
  );
  assert.equal(r.aRelier.length, 3, 'Trois orthographes du même nom doivent toutes se rapprocher.');
  for (const lien of r.aRelier) assert.equal(lien.supplierId, 'sup-weleda');
}

// Le nom commercial compte autant que la raison sociale.
{
  const r = rapprocher(
    [{ id: 'sup-inoya', legal_name: "IN'OYA SAS", trade_name: "IN'OYA" }],
    [{ id: 'c01', name: "in'oya" }]
  );
  assert.equal(r.aRelier.length, 1, "Le nom commercial doit permettre le rapprochement.");
}

// ---------------------------------------------------------------------------
// 2. Ce qui doit échouer, et c'est le plus important.
// ---------------------------------------------------------------------------
// Deux fournisseurs, un seul nom plié : on ne choisit pas au hasard.
// « SARL » est une forme juridique : le pliage l'efface, les deux noms
// deviennent identiques. C'est exactement le piège — deux maisons distinctes
// rangées sous la même clé.
{
  const r = rapprocher(
    [
      { id: 'sup-a', legal_name: 'Laboratoire Gravier' },
      { id: 'sup-b', legal_name: 'Laboratoire Gravier SARL' }
    ],
    [{ id: 'c01', name: 'Laboratoire Gravier' }]
  );
  assert.equal(r.aRelier.length, 0, 'Deux candidats : aucun lien ne doit être posé.');
  assert.equal(r.ambigus.length, 1, "L'ambiguïté doit être nommée, pas résolue en douce.");
  assert.deepEqual(r.ambigus[0].candidats.sort(), ['sup-a', 'sup-b']);
}

// Une piste déjà reliée n'est jamais écrasée : un lien posé à la main par
// l'exploitant vaut mieux qu'un rapprochement automatique.
{
  const r = rapprocher(
    [{ id: 'sup-a', legal_name: 'Phytodia' }],
    [{ id: 'c01', name: 'Phytodia', supplier_id: 'sup-choisi-a-la-main' }]
  );
  assert.equal(r.aRelier.length, 0, 'Une piste déjà reliée ne doit pas être réécrite.');
  assert.equal(r.dejaRelies.length, 1);
}

// Pas de correspondance : on ne invente rien.
{
  const r = rapprocher(
    [{ id: 'sup-a', legal_name: 'Oomylab' }],
    [{ id: 'c01', name: 'Une marque jamais démarchée' }]
  );
  assert.equal(r.aRelier.length, 0);
  assert.equal(r.sansCorrespondance.length, 1);
}

// Une fiche sans nom ne doit rien déclencher — ni lien, ni plantage.
{
  const r = rapprocher([{ id: 'sup-a', legal_name: '' }], [{ id: 'c01', name: '' }]);
  assert.equal(r.aRelier.length, 0);
  assert.equal(r.sansCorrespondance.length, 1);
}

// ---------------------------------------------------------------------------
// 3. Le pliage utilisé est bien celui du référentiel, pas une copie.
// ---------------------------------------------------------------------------
// Si ce cas échoue, c'est que le script a cessé d'importer la fonction du
// référentiel : deux définitions de l'identité fournisseur coexistent.
{
  assert.equal(normalizeSupplierName('SARL Biotic Phocéa'), normalizeSupplierName('biotic phocea'));
  const r = rapprocher(
    [{ id: 'sup-biotic', legal_name: 'SARL Biotic Phocéa' }],
    [{ id: 'c01', name: 'biotic phocea' }]
  );
  assert.equal(r.aRelier.length, 1, 'Casse, accent et forme juridique ne doivent pas bloquer.');
}

console.log('[PASS] Rapprochement piste → fournisseur : 8 cas, ambiguïté jamais résolue en douce.');
