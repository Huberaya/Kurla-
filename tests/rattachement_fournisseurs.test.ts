/**
 * RATTACHEMENT DES FOURNISSEURS TROUVÉS — banc du chantier du 16/09/2026.
 * ======================================================================
 *
 * Contexte mesuré en production à l'écriture : 138 produits, 52 sans
 * `supplier_id`, 17 marques, 16 fiches fournisseurs en base — dont deux
 * concernées par la recherche (DECIEM, Qudo Beauty) qu'il ne fallait surtout
 * pas dupliquer.
 *
 * Ce banc porte sur la **table de décision** du script de rattachement, pas
 * sur son exécution : il vérifie les propriétés qui empêchent une écriture
 * fausse, avant qu'elle atteigne la base.
 *
 * Contrats :
 *
 *   1. toute clé de rattachement se résout — une faute de frappe sur un nom de
 *      fournisseur ferait échouer le chantier au milieu de l'écriture ;
 *   2. aucun type hors contrainte — la base refuse la ligne, mais seulement
 *      au moment de l'insertion ;
 *   3. aucune entité en double, y compris avec les fiches déjà présentes ;
 *   4. aucune fiche sans provenance : on sait d'où vient l'information ;
 *   5. toute note est datée — une annotation sans date n'est plus attribuable
 *      six mois plus tard (défaut réel, corrigé en cours de chantier : 24
 *      notes sur 52 n'étaient pas datées) ;
 *   6. un rattachement **volontairement** vide le dit — sinon rien ne
 *      distingue « pas trouvé » de « pas cherché » ;
 *   7. ce qui n'a pas pu être vérifié est dit plutôt que laissé vide en
 *      silence.
 */

import assert from 'node:assert/strict';

import { ENRICHISSEMENTS, FICHES_EXISTANTES, NOUVEAUX, RATTACHEMENT, cleMarque } from '../scripts/rattacheFournisseursTrouves';
import { normalizeSupplierName, supplierIdFromName } from '../src/lib/db/supplierStore';

// Liste imposée par la contrainte `suppliers_supplier_type_check`, telle que
// l'élargit la migration 20260925000000. Copiée ici volontairement : si
// quelqu'un resserre la contrainte, ce banc doit le voir.
const TYPES_AUTORISES = new Set([
  'contract_manufacturer',
  'textile',
  'tool',
  'raw_material',
  'packaging',
  'laboratory',
  'brand',
  'distributor',
  'dropship',
  'affiliation',
  'third_party_logistics',
  'unknown',
]);

// 1. Toute clé de rattachement se résout en une entité réellement définie.
const nomsDefinis = new Set(NOUVEAUX.map(f => f.legalName));
const clesConnues = new Set(Object.keys(FICHES_EXISTANTES));
for (const r of RATTACHEMENT) {
  if (r.cle === null) continue;
  assert.ok(
    nomsDefinis.has(r.cle) || clesConnues.has(r.cle),
    `« ${r.marque} » pointe vers « ${r.cle} », qui n'est défini nulle part`,
  );
}

// 2. Aucun type hors contrainte.
for (const f of NOUVEAUX) {
  assert.ok(TYPES_AUTORISES.has(f.supplierType), `type « ${f.supplierType} » refusé par la contrainte (${f.legalName})`);
}

// 3. Aucune entité en double, ni entre elles, ni avec les fiches existantes.
const nomsNormalises = NOUVEAUX.map(f => normalizeSupplierName(f.legalName));
assert.equal(
  new Set(nomsNormalises).size,
  nomsNormalises.length,
  'deux fiches nouvelles portent le même nom normalisé — la base les refuserait en bloc',
);
for (const cleExistante of Object.keys(FICHES_EXISTANTES)) {
  assert.ok(
    !nomsNormalises.includes(normalizeSupplierName(cleExistante)),
    `« ${cleExistante} » existe déjà en base et ne doit pas être recréé`,
  );
}

// Les identifiants ne se téléscopent pas.
const identifiants = NOUVEAUX.map(f => f.id || `sup-${supplierIdFromName(f.legalName)}`);
assert.equal(new Set(identifiants).size, identifiants.length, 'deux fiches nouvelles viseraient le même identifiant');
for (const id of identifiants) assert.match(id, /^sup-[a-z0-9-]+$/, `identifiant « ${id} » hors convention`);

// 4. Aucune fiche sans provenance.
for (const f of NOUVEAUX) {
  assert.ok(f.notes && f.notes.length > 80, `« ${f.legalName} » : notes trop courtes pour constituer une provenance`);
  assert.ok(f.notes.includes('16/09/2026'), `« ${f.legalName} » : provenance non datée`);
}

// 5. Toute note produit est datée, et dit quand aucune voie n'existe.
for (const r of RATTACHEMENT) {
  assert.ok(r.note.includes('16/09/2026'), `« ${r.marque} » : note non datée — elle ne serait plus attribuable`);
  if (r.cle === null) {
    assert.ok(/AUCUN/i.test(r.note), `« ${r.marque} » : aucun fournisseur, mais la note ne le dit pas — on ne distinguerait plus « pas trouvé » de « pas cherché »`);
  }
}

// 6. Une marque ne figure qu'une fois : deux lignes pour la même marque
// répartiraient ses produits en silence sur deux fournisseurs.
const marques = RATTACHEMENT.map(r => cleMarque(r.marque));
assert.equal(new Set(marques).size, marques.length, 'une marque apparaît deux fois dans la table de rattachement');

// 7. Ce qui n'a pas pu être vérifié est dit, pas tu.
for (const f of NOUVEAUX) {
  if (!f.website) {
    assert.ok(
      /Réserve|non vérifié/i.test(f.notes),
      `« ${f.legalName} » n'a pas de site et les notes ne le signalent pas : un champ vide doit être un vide assumé`,
    );
  }
}

// Les enrichissements visent des fiches qui existent, et complètent sans
// remplacer : le suffixe est ajouté après la note déjà présente.
for (const e of ENRICHISSEMENTS) {
  assert.ok(Object.values(FICHES_EXISTANTES).includes(e.id), `enrichissement « ${e.id} » : fiche inconnue`);
  assert.ok(e.notesSuffixe.includes('16/09/2026'), `enrichissement « ${e.id} » : ajout non daté`);
}

process.stdout.write(
  '[PASS] Rattachement des fournisseurs trouvés : 13 entités sourcées (types conformes à la contrainte, identifiants '
  + 'uniques, aucune en doublon avec les fiches existantes), toute clé de rattachement résolue, toute note datée, '
  + 'tout rattachement vide explicitement déclaré comme tel, et tout champ non vérifié signalé plutôt que laissé vide.\n',
);
