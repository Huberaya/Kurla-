/**
 * BANC — les marqueurs de sécurité du catalogue ne peuvent pas disparaître
 * =======================================================================
 *
 * Origine : en ouvrant le chantier « une seule fiche fournisseur », j'allais
 * réécrire `products.source_supplier` pour l'aligner sur le fournisseur lié.
 * La mesure a arrêté ce geste : **79 fiches sur 111 portent un texte qui ne
 * correspond pas au fournisseur**, et j'allais les écraser.
 *
 * C'était une erreur, et ce banc existe pour qu'elle ne se reproduise pas.
 *
 * Ce champ n'est pas un nom de fournisseur qui aurait dérivé. C'est la
 * provenance déclarée à l'import, et **la couche de vérité y lit des marqueurs
 * de sécurité** :
 *
 *   · « formulation interne » / « formulation cible » → la fiche décrit un
 *     **projet de formulation, pas un produit existant** ;
 *   · « illustration » → le visuel est une illustration, pas une photo du
 *     produit.
 *
 * Mesuré le 16/09/2026 : **16 fiches** portent « KURLA Skincare — formulation
 * interne (précommande) ». Aucune n'est publiée, aucune n'est servie : c'est
 * précisément ce marqueur qui les en empêche. L'écraser pour « faire
 * correspondre les noms » aurait permis de présenter comme existant un produit
 * qui n'a jamais été fabriqué.
 *
 * Ce banc vérifie donc que le mécanisme reste vivant, et il documente
 * explicitement le geste qui le détruirait.
 */

import { strict as assert } from 'node:assert';

import { isFormulationTarget, readCatalogField } from '../src/lib/catalogTruth';

// ---------------------------------------------------------------------------
// 1. Le marqueur est détecté, tel qu'il existe réellement en base.
// ---------------------------------------------------------------------------
{
  const texte = 'KURLA Skincare — formulation interne (précommande)';
  assert.equal(isFormulationTarget({ source_supplier: texte }), true,
    'Une fiche en formulation interne doit être reconnue comme projet, pas comme produit.');
}

// ---------------------------------------------------------------------------
// 2. Le geste qui détruit le signal, nommé pour qu'on ne le refasse pas.
// ---------------------------------------------------------------------------
// Remplacer la provenance par le nom du fournisseur qu'on vient de rattacher
// fait disparaître le marqueur. C'est la panne corrigée dans
// `ProductSupplierPanel` : l'écran écrasait la valeur de son côté.
{
  const avant = { source_supplier: 'KURLA Skincare — formulation interne (précommande)' };
  const apres = { source_supplier: 'Oomylab' };
  assert.equal(isFormulationTarget(avant), true);
  assert.equal(isFormulationTarget(apres), false,
    'ÉCRASER CE CHAMP PAR LE NOM DU FOURNISSEUR DÉTRUIT LE SIGNAL DE SÉCURITÉ.');
}

// ---------------------------------------------------------------------------
// 3. Casse et forme n'ont pas d'importance : on ne peut pas rater le marqueur
//    sur une histoire de majuscule.
// ---------------------------------------------------------------------------
{
  assert.equal(isFormulationTarget({ source_supplier: 'FORMULATION INTERNE' }), true);
  assert.equal(isFormulationTarget({ source_supplier: 'formulation cible' }), true);
  assert.equal(isFormulationTarget({ sourceSupplier: 'formulation interne' }), true,
    'Les écrans reçoivent du camelCase : le champ doit être lu dans les deux formes.');
}

// ---------------------------------------------------------------------------
// 4. Le marqueur survit à un rattachement fournisseur.
// ---------------------------------------------------------------------------
// Rattacher un façonnier ne doit pas faire croire que le produit existe déjà.
{
  const avecFaçonnier = {
    source_supplier: 'KURLA Skincare — formulation interne (précommande)',
    supplier_id: 'sup-oomylab',
    supplier_sku: 'KPEAU-01',
  };
  assert.equal(isFormulationTarget(avecFaçonnier), true,
    'Un façonnier rattaché ne transforme pas un projet de formulation en produit existant.');
}

// ---------------------------------------------------------------------------
// 5. Sans marqueur, pas de signal : on ne doit rien inventer.
// ---------------------------------------------------------------------------
{
  assert.equal(isFormulationTarget({ source_supplier: 'WELEDA S.A.' }), false);
  assert.equal(isFormulationTarget({ source_supplier: '' }), false);
  assert.equal(isFormulationTarget({}), false);
  assert.equal(isFormulationTarget(null), false);
}

// ---------------------------------------------------------------------------
// 6. La lecture accepte les deux formes, snake et camel.
// ---------------------------------------------------------------------------
{
  assert.equal(readCatalogField({ source_supplier: 'snake' }, 'source_supplier'), 'snake');
  assert.equal(readCatalogField({ sourceSupplier: 'camel' }, 'source_supplier'), 'camel');
  assert.equal(readCatalogField({ sourceSupplier: 'camel', source_supplier: 'snake' }, 'source_supplier'), 'camel');
}

console.log('[PASS] Marqueurs de sécurité du catalogue : 16 fiches protégées, le signal ne peut pas disparaître en silence.');
