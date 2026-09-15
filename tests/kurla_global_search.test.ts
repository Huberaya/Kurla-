import assert from 'node:assert/strict';

import { searchAcrossCatalog } from '../src/lib/globalSearch';

/**
 * BANC — RECHERCHE GLOBALE UNIFIÉE (§24, 16/09/2026).
 *
 * « hyperpigmentation » doit ressortir le catalogue ET l'approvisionnement.
 * Insensible aux accents/casse ; chaque résultat dit POURQUOI il matche ;
 * aucun résultat inventé.
 */

const fixtures = {
  products: [
    { id: 'p1', name: 'Sérum Éclaircissant', brand: 'IN’OYA', category: 'peau', needs: ['hyperpigmentation', 'taches'], catalogStatus: 'published' },
    { id: 'p2', name: 'Crème Hydratation', brand: 'KURLA', category: 'peau', needs: ['hydratation'], catalogStatus: 'draft' },
  ],
  positions: [
    { sourcing_item_id: 'fond-1', rang: 3, marque: 'Eucerin', produit: 'Pigment Control', format: '50 ml', fournisseur_canal: 'pharmacie' },
  ],
  candidates: [
    { id: 'c1', prospect_id: 'pr1', product: 'Sérum Niacinamide', brand: 'INKEY', category: 'peau' },
  ],
  prospects: [{ id: 'pr1', name: 'Ankorstore' }],
  suppliers: [
    { id: 'sup1', legal_name: 'BLACKETIQUE SAS', country: 'FR', contact_email: 'info@blacketique.com' },
  ],
};

function main(): void {
  // 1. Un besoin traverse catalogue ET approvisionnement sur le MÊME mot.
  // (La recherche est lexicale : « hyperpigmentation » ne matche pas
  // « Pigment Control » — le banc teste ce que le système fait vraiment,
  // pas un rapprochement sémantique qu'il ne promet pas.)
  const avecBesoin = {
    ...fixtures,
    positions: [...fixtures.positions, { sourcing_item_id: 'fond-2', rang: 4, marque: 'IN’OYA', produit: 'Sérum hyperpigmentation nuit', fournisseur_canal: 'ankorstore' }],
  };
  const pigment = searchAcrossCatalog('hyperpigmentation', avecBesoin as any);
  assert.ok(pigment.hits.some(h => h.kind === 'product' && h.id === 'p1'), 'fiche catalogue trouvée par besoin');
  assert.ok(pigment.hits.some(h => h.kind === 'position'), 'position de fond trouvée sur le même mot');
  assert.equal(pigment.counts.candidate, 0, 'rien d’autre n’est inventé autour');
  const product = pigment.hits.find(h => h.id === 'p1');
  assert.ok(product?.matchedOn.includes('besoins'), 'le pourquoi du résultat est nommé');

  // 2. Insensible aux accents et à la casse : « ÉCLAIRCISSANT » = « eclaircissant ».
  const accent = searchAcrossCatalog('ÉCLAIRCISSANT', fixtures as any);
  assert.equal(accent.counts.product, 1);

  // 3. Marque, fournisseur, canal matchent aussi.
  assert.equal(searchAcrossCatalog('ankorstore', fixtures as any).counts.candidate, 1, 'candidat trouvé via son prospect');
  assert.equal(searchAcrossCatalog('blacketique', fixtures as any).counts.supplier, 1);
  assert.ok(searchAcrossCatalog('eucerin', fixtures as any).hits.some(h => h.kind === 'position'));

  // 4. Requête trop courte ou vide : aucun résultat, aucune invention.
  assert.deepEqual(searchAcrossCatalog('a', fixtures as any).hits, []);
  assert.deepEqual(searchAcrossCatalog('', fixtures as any).hits, []);

  // 5. Aucun faux positif : une requête sans rapport ne ressort rien.
  assert.equal(searchAcrossCatalog('zzz-introuvable', fixtures as any).hits.length, 0);

  console.log('[PASS] Recherche globale : besoins/marques/fournisseurs/canaux traversés, accents insensibles, pourquoi nommé, aucun résultat inventé.');
}

main();
