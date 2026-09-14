import assert from 'node:assert/strict';

import { buildConsolidatedSourcing } from '../src/lib/sourcingConsolidated';

/**
 * BANC — VUE SOURCING CONSOLIDÉE (14/09/2026).
 *
 * « Je veux voir tous les 242 produits avec les prix et le nom des
 * fournisseurs et leurs contacts avec des e-mails prêts à être envoyés. »
 *
 * La vue ne doit JAMAIS inventer : un prix absent reste « à obtenir », un
 * e-mail « prêt » est un RFQ existant ou un texte généré qui ne contient que
 * les données réelles passées en entrée.
 */

const fixtures = {
  products: [
    { id: 'fond-to-nmf', name: 'Natural Moisturizing Factors + HA', brand: 'The Ordinary', catalogStatus: 'published', isTestListing: true, basePrice: 7.5, supplierId: 'sup-deciem', sourceSupplier: 'The Ordinary' },
    { id: 'fond-boj-glow', name: 'Beauty of Joseon Glow', brand: 'Beauty of Joseon', catalogStatus: 'published', isTestListing: true, basePrice: 16.9, supplierId: 'sup-blacketique-sas', sourceSupplier: 'BLACKETIQUE SAS' },
    { id: 'src-unknown-price', name: 'Sérum sans prix', brand: null, catalogStatus: 'draft', basePrice: 0, supplierId: null, sourceSupplier: 'Fournisseur à qualifier' },
    { id: 'prod-retired', name: 'Fiche retirée', catalogStatus: 'unavailable', basePrice: 12, supplierId: null, sourceSupplier: 'X' },
  ],
  candidates: [
    { id: 'cand-1', prospect_id: 'prospect-ankorstore', product: 'Sérum Niacinamide 10 %', brand: 'INKEY', public_price_cents: 1350 },
    { id: 'cand-2', prospect_id: 'prospect-qudo', product: 'Masque nuit', brand: 'Qudo', public_price_cents: 0 },
  ],
  prospects: [
    { id: 'prospect-ankorstore', name: 'Ankorstore', contact_email: null, source_url: 'https://www.ankorstore.com/fr' },
    { id: 'prospect-qudo', name: 'Qudo Beauty', contact_email: 'sales@qudo.beauty', source_url: 'https://qudo.beauty' },
  ],
  suppliers: [
    { id: 'sup-deciem', legal_name: 'The Ordinary (Deciem)', website: 'https://theordinary.com', contact_email: null },
    { id: 'sup-blacketique-sas', legal_name: 'BLACKETIQUE SAS', website: 'https://blacketique.com', contact_email: 'info@blacketique.com' },
  ],
  rfqs: [
    { id: 'peau-blacketique-kbeauty', supplier_id: 'sup-blacketique-sas', content: 'Bonjour BLACKETIQUE, demande de compte pro pour Beauty of Joseon Glow…', status: 'draft' },
  ],
};

function main(): void {
  const result = buildConsolidatedSourcing(fixtures as any);

  // 1. Les fiches unavailable sont exclues ; produits + candidats comptés.
  assert.equal(result.total, 5, '4 produits - 1 unavailable + 2 candidats = 5 lignes');
  assert.equal(result.products, 3);
  assert.equal(result.candidates, 2);
  assert.equal(result.rows.some(r => r.id === 'prod-retired'), false, 'fiche retirée exclue');

  // 2. Aucun prix inventé : 0 € devient « à obtenir ».
  const noPrice = result.rows.find(r => r.id === 'src-unknown-price');
  const noPriceCandidate = result.rows.find(r => r.id === 'cand-2');
  assert.equal(noPrice?.priceEur, null, 'prix produit absent = null');
  assert.equal(noPrice?.priceLabel, 'à obtenir');
  assert.equal(noPriceCandidate?.priceEur, null, 'prix candidat absent = null');

  // 3. Fournisseur, contact et état e-mail rattachés par ligne.
  const boj = result.rows.find(r => r.id === 'fond-boj-glow');
  assert.equal(boj?.supplierName, 'BLACKETIQUE SAS');
  assert.equal(boj?.supplierContact, 'info@blacketique.com');
  assert.equal(boj?.emailState, 'pret', 'RFQ existant trouvé -> ligne prêt');
  const qudo = result.rows.find(r => r.id === 'cand-2');
  assert.equal(qudo?.supplierContact, 'sales@qudo.beauty', 'contact du prospect rattaché');
  const deciem = result.rows.find(r => r.id === 'fond-to-nmf');
  assert.equal(deciem?.emailState, 'a_preparer', 'pas de RFQ -> généré');

  // 4. RFQ existant = e-mail prêt ; sinon texte généré sans invention.
  const blacketique = result.supplierBlocks.find(b => b.name === 'BLACKETIQUE SAS');
  assert.equal(blacketique?.emailState, 'pret');
  assert.ok(blacketique?.emailBody.includes('Bonjour BLACKETIQUE'), 'corps du RFQ existant servi tel quel');
  const deciemBlock = result.supplierBlocks.find(b => b.name.toLowerCase().includes('deciem'));
  assert.equal(deciemBlock?.emailState, 'a_preparer');
  assert.ok(deciemBlock?.emailBody.includes('Natural Moisturizing Factors + HA'), 'référence réelle citée');
  assert.ok(deciemBlock?.emailBody.includes('7,50 €'), 'prix constaté cité');
  assert.ok(!deciemBlock?.emailBody.includes('undefined'), 'aucun undefined dans le texte généré');
  assert.ok(!/0,00 €/.test(deciemBlock?.emailBody || ''), 'aucun prix fantôme 0,00 €');
  assert.equal(deciemBlock?.contact, null, 'pas d’e-mail inventé pour DECIEM');

  // 5. Les conditions publiques constatées du canal sont rappelées.
  const ankorstore = result.supplierBlocks.find(b => b.name === 'Ankorstore');
  assert.ok(ankorstore?.knownTerms.join(' ').includes('franco 300 €'), 'conditions Ankorstore rappelées');

  console.log('[PASS] Vue sourcing consolidée : exclusions, prix jamais inventés, fournisseurs/contacts rattachés, RFQ servis tels quels, textes générés sans invention.');
}

main();
