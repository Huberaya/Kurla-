/**
 * DOUBLONS DU CATALOGUE PUBLIÉ — banc du contrôle nocturne.
 * ========================================================
 *
 * Constat mesuré en production le 16/09/2026 : le même sérum The Ordinary
 * (« Hyaluronic Acid 2% + B5 ») était publié deux fois, à 10,12 € et à
 * 17,49 €. Rien ne comptait les doublons. Le contrôle nocturne énonçait huit
 * invariants ; aucun ne portait là-dessus.
 *
 * Ce banc vérifie les deux fonctions qui y répondent, et surtout les pièges
 * qui les rendraient muettes :
 *
 *   1. deux écritures du même produit (casse, accents, ponctuation) sont un
 *      doublon — sinon le contrôle passe à côté de ce qu'il doit attraper ;
 *   2. un même nom chez deux marques différentes n'est PAS un doublon —
 *      sinon le contrôle crie au loup sur un catalogue sain ;
 *   3. on compte le SURPLUS (les fiches à retirer), pas les groupes ;
 *   4. une lecture impossible rend `null`, jamais 0 : « je n'ai pas pu
 *      regarder » ne doit jamais valoir « il n'y a rien à voir ».
 */

import assert from 'node:assert/strict';

import { replierNom, surplusDoublons } from '../scripts/lib/donnees.mjs';

/* 1. Deux écritures du même produit donnent la même clé. */
{
  const variantes = [
    'Hyaluronic Acid 2% + B5',
    'hyaluronic acid 2% + b5',
    'HYALURONIC  ACID  2% + B5',
    '  Hyaluronic Acid 2% + B5  ',
  ];
  const cles = new Set(variantes.map(replierNom));
  assert.equal(cles.size, 1, `casse et espaces ne doivent pas faire deux produits : ${[...cles].join(' | ')}`);

  // Accents : « Crème » et « Creme » sont le même produit.
  assert.equal(replierNom('Crème Riche Céramides'), replierNom('Creme Riche Ceramides'));
  // Ponctuation : le tiret et l'apostrophe non plus.
  assert.equal(replierNom('Gel Nettoyant Doux — 150 ml'), replierNom('Gel Nettoyant Doux 150 ml'));
  assert.equal(replierNom("Lait Corps à l'Argousier"), replierNom('Lait Corps a l Argousier'));
}

/* 2. Un catalogue sain ne produit aucun surplus. */
{
  const sain = [
    { id: 'a', brand: 'KURLA Skincare', name: 'Gel Nettoyant Doux' },
    { id: 'b', brand: 'KURLA Skincare', name: 'Sérum Niacinamide 5%' },
    { id: 'c', brand: 'The Ordinary', name: 'Niacinamide 10% + Zinc 1%' },
  ];
  assert.equal(surplusDoublons(sain), 0, 'trois fiches distinctes : rien à retirer');
}

/* 3. Le doublon réellement rencontré, tel qu'il était en base. */
{
  const reel = [
    { id: 'fond-to-003', brand: 'The Ordinary', name: 'Hyaluronic Acid 2% + B5', price: 10.12 },
    { id: 'fond-to-004', brand: 'The Ordinary', name: 'Hyaluronic Acid 2% + B5', price: 17.49 },
    { id: 'fond-to-005', brand: 'The Ordinary', name: 'Retinol 1% in Squalane', price: 10 },
  ];
  assert.equal(surplusDoublons(reel), 1, 'deux fiches pour un même produit : une à retirer');
}

/* 4. Le surplus, pas les groupes : trois fiches identiques = deux à retirer. */
{
  const triple = [
    { id: 'a', brand: 'M', name: 'N' },
    { id: 'b', brand: 'M', name: 'N' },
    { id: 'c', brand: 'M', name: 'N' },
  ];
  assert.equal(surplusDoublons(triple), 2, 'un groupe de trois, c’est deux fiches en trop');
  // Deux groupes de deux : deux fiches à retirer, pas une.
  const deuxGroupes = [
    { id: 'a', brand: 'M', name: 'N' }, { id: 'b', brand: 'M', name: 'N' },
    { id: 'c', brand: 'M', name: 'P' }, { id: 'd', brand: 'M', name: 'P' },
  ];
  assert.equal(surplusDoublons(deuxGroupes), 2);
}

/* 5. Le même nom chez deux marques n'est pas un doublon. */
{
  const deuxMarques = [
    { id: 'a', brand: 'Avène', name: 'Stick Lèvres SPF50+' },
    { id: 'b', brand: 'La Roche-Posay', name: 'Stick Lèvres SPF50+' },
  ];
  assert.equal(surplusDoublons(deuxMarques), 0, 'deux marques, deux produits : ce n’est pas un doublon, c’est une offre');
}

/* 6. Une lecture impossible rend null, jamais 0. */
{
  assert.equal(surplusDoublons(null), null, 'null ≠ 0 : on n’a pas pu lire');
  assert.equal(surplusDoublons('texte'), null);
  assert.equal(surplusDoublons([]), 0, 'un catalogue vide n’a pas de doublon — c’est un vrai 0');
}

process.stdout.write(
  '[PASS] Doublons du catalogue publié : casse, accents et ponctuation repliés à l’identique, nom identique chez deux '
  + 'marques non compté comme doublon, surplus compté (et non groupes), lecture impossible rendue `null` jamais 0.\n',
);
