/**
 * BANC — la fusion piste ↔ fournisseur
 * ====================================
 *
 * Demande du 16/09/2026 : « quand je remplis les informations d'un fournisseur,
 * qu'elles apparaissent partout où il est mentionné. »
 *
 * Ce banc porte sur la jointure elle-même. Ce qui est en jeu : la piste est le
 * seul endroit où l'exploitant suit un démarchage, et le fournisseur le seul
 * endroit où l'information validée est saisie. Si la fusion se trompe, la piste
 * affiche le pays, le site ou le statut de vérification d'une autre maison — et
 * personne ne le voit avant d'avoir écrit au mauvais contact.
 *
 * Règles vérifiées ici :
 *   1. la fiche fournisseur **comble** la piste, elle ne l'écrase pas : ce que
 *      la piste sait de particulier prime ;
 *   2. l'origine de la valeur affichée est **désignée**, sinon l'exploitant
 *      croit corriger la fiche en retapant l'e-mail et crée une deuxième
 *      valeur qui divergera ;
 *   3. sans migration appliquée, rien ne casse.
 */

import { strict as assert } from 'node:assert';

import { mapProspect } from '../src/lib/db/prospectStore';

const PISTE = {
  id: 'c01', name: 'Weleda', route: 'A', contact_type: 'brand_fr', status: 'to_contact',
  created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
};
const FICHE = {
  id: 'sup-weleda', legal_name: 'WELEDA S.A.', country: 'FR',
  website: 'weleda.fr', contact_email: 'contact@weleda.fr',
  verification_status: 'verified',
};

// ---------------------------------------------------------------------------
// 1. La fiche comble la piste.
// ---------------------------------------------------------------------------
{
  const p = mapProspect(PISTE, FICHE);
  assert.equal(p.contactEmail, 'contact@weleda.fr', "L'e-mail de la fiche doit apparaître sur la piste.");
  assert.equal(p.supplier?.legalName, 'WELEDA S.A.');
  assert.equal(p.supplier?.country, 'FR');
  assert.equal(p.supplierId, 'sup-weleda');
}

// ---------------------------------------------------------------------------
// 2. Ce que la piste sait de particulier prime sur la fiche.
// ---------------------------------------------------------------------------
{
  const p = mapProspect({ ...PISTE, contact_email: 'achats@weleda.fr' }, FICHE);
  assert.equal(p.contactEmail, 'achats@weleda.fr', "Le contact propre à la piste ne doit pas être écrasé.");
  assert.equal(p.contactFromSupplier, false);
}

// ---------------------------------------------------------------------------
// 3. L'origine de la valeur est désignée.
// ---------------------------------------------------------------------------
{
  const depuisLaFiche = mapProspect(PISTE, FICHE);
  assert.equal(depuisLaFiche.contactFromSupplier, true, 'Origine fiche : doit être signalée.');

  const depuisLaPiste = mapProspect({ ...PISTE, contact_email: 'x@y.fr' }, FICHE);
  assert.equal(depuisLaPiste.contactFromSupplier, false);

  const sansContactDuTout = mapProspect(PISTE, { ...FICHE, contact_email: undefined });
  assert.equal(sansContactDuTout.contactFromSupplier, false, 'Aucun contact nulle part : rien à signaler.');
}

// ---------------------------------------------------------------------------
// 4. Sans lien, et sans migration, rien ne casse.
// ---------------------------------------------------------------------------
{
  const sansLien = mapProspect(PISTE, undefined);
  assert.equal(sansLien.supplier, null);
  assert.equal(sansLien.supplierId, null);
  assert.equal(sansLien.contactEmail, undefined, 'Sans fiche, aucun contact ne doit être inventé.');

  // Colonne absente (migration non appliquée) : la piste reste utilisable.
  const sansMigration = mapProspect(PISTE);
  assert.equal(sansMigration.supplierId, null);
  assert.equal(sansMigration.name, 'Weleda');
}

// ---------------------------------------------------------------------------
// 5. Les certifications arrivent sous une seule forme.
// ---------------------------------------------------------------------------
{
  assert.deepEqual(mapProspect(PISTE, { ...FICHE, certifications: ['ISO 22716', 'BPF'] }).supplier?.certifications,
    ['ISO 22716', 'BPF']);
  assert.equal(mapProspect(PISTE, { ...FICHE, certifications: 'ISO 22716' }).supplier?.certifications?.length, 1);
  assert.deepEqual(mapProspect(PISTE, { ...FICHE, certifications: [] }).supplier?.certifications, [], "Un tableau vide reste un tableau vide : il n'est pas invente.");
}

console.log('[PASS] Fusion piste ↔ fournisseur : la fiche comble sans écraser, origine toujours désignée.');
