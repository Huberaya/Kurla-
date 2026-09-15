import assert from 'node:assert/strict';

import { buildFicheFromCandidate } from '../src/lib/sourcingFicheLink';

/**
 * BANC — LIAISON CANDIDAT → FICHE (chantier C3, 15/09/2026).
 *
 * La fiche générée ne contient QUE des données réelles : jamais de prix
 * inventé (prix absent = pas de prix), jamais de visuel, jamais d'INCI.
 * Elle naît en draft inactive, avec la clé de liaison source_candidate_id.
 */

const candidate = {
  id: 'cand-abc123',
  product: 'Sérum Niacinamide 10 %',
  brand: 'INKEY',
  category: 'peau',
  public_price_cents: 1350,
};
const prospect = { id: 'prospect-1', name: 'Ankorstore' };

function main(): void {
  // 1. Payload complet avec prix réel.
  const fiche = buildFicheFromCandidate(candidate, prospect);
  assert.equal(fiche.name, 'Sérum Niacinamide 10 %');
  assert.equal(fiche.brand, 'INKEY');
  assert.equal(fiche.price, 13.5, 'prix public constaté converti en euros');
  assert.equal(fiche.catalog_status, 'draft', 'naît en draft');
  assert.equal(fiche.is_active, false, 'naît inactive');
  assert.equal(fiche.source_candidate_id, 'cand-abc123', 'clé de liaison posée');
  assert.equal(fiche.sourceSupplier, 'Ankorstore', 'fournisseur réel du prospect');
  assert.equal(fiche.category, 'peau');
  assert.equal(fiche.slug, 'inkey-serum-niacinamide-10-abc123', 'slug lisible + suffixe candidat');

  // 2. Jamais de prix inventé : 0 ou absent = pas de champ prix.
  const noPrice = buildFicheFromCandidate({ ...candidate, public_price_cents: 0 }, prospect);
  assert.equal('price' in noPrice, false, 'prix 0 => aucun champ prix');
  const nullPrice = buildFicheFromCandidate({ ...candidate, public_price_cents: null }, prospect);
  assert.equal('price' in nullPrice, false, 'prix null => aucun champ prix');

  // 3. Sans prospect, pas de fournisseur inventé.
  const noProspect = buildFicheFromCandidate(candidate, null);
  assert.equal('sourceSupplier' in noProspect, false);

  // 4. Sans nom de produit, création refusée — pas de fiche fantôme.
  assert.throws(() => buildFicheFromCandidate({ ...candidate, product: '  ' }, prospect), /nom de produit/i);

  // 5. Marque absente : slug construit sur le produit seul.
  const noBrand = buildFicheFromCandidate({ ...candidate, brand: '' }, prospect);
  assert.equal('brand' in noBrand, false);
  assert.equal(noBrand.slug, 'serum-niacinamide-10-abc123');

  console.log('[PASS] Liaison candidat→fiche : données réelles uniquement, prix jamais inventé, draft inactive, clé de liaison, refus sans nom.');
}

main();
