/**
 * ONGLET « DROPSHIPPING » DU CATALOGUE — contrat (20/09).
 *
 * Demande de l'utilisatrice : « dans catalogue il faut mettre un onglet
 * dropshipping ». Le banc vérifie DEUX choses :
 *  1) la logique (computeDropshipOps) ne montre que l'état réel : aucune
 *     promesse sans offre, aucun coût inventé, les catégories réservées ne
 *     reçoivent pas le badge 24–48h ;
 *  2) le câblage : l'onglet vit dans le groupe Catalogue, branché sur les
 *     vraies routes, sans dupliquer la saisie (le bon de commande reste au
 *     sourcing) ni le guide (le guide reste son propre onglet).
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { computeDropshipOps, formatCost, formatLeadTime } from '../src/lib/dropshipOps';

const srcOf = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

/* 1. Offre saine sur catégorie éligible → conforme, promesse tenable. */
{
  const products = [{ id: 'p1', name: 'Sèche-cheveux diffuseur', category: 'accessoires', badges: [] }];
  const sources: any = [{ productId: 'p1', supplierId: 's1', partnerName: null, model: 'dropshipping', isPrimary: true, available: true, leadTimeDays: 1, costCents: 4200, currency: 'EUR' }];
  const { rows, totals } = computeDropshipOps(products, sources, [{ id: 's1', name: 'Afro Wholesale' }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].anomalies.length, 0, 'une offre saine ne doit rien signaler');
  assert.equal(rows[0].promises24h, true, 'délai ≤ 2 j + offre disponible = promesse tenable');
  assert.equal(rows[0].supplierName, 'Afro Wholesale', 'le nom du registre fournisseur prime');
  assert.equal(formatCost(4200), '42.00 € HT');
  assert.deepEqual([totals.products, totals.withOffer, totals.availableNow, totals.promised24h, totals.anomalies], [1, 1, 1, 1, 0]);
  console.log('✓ offre saine : conforme, promesse tenable, fournisseur nommé');
}

/* 2. Délai > 2 jours → promesse suspendue + anomalie datée. */
{
  const products = [{ id: 'p1', name: 'Brosse', category: 'accessoires', badges: ['dropship_24_48h'] }];
  const sources: any = [{ productId: 'p1', supplierId: null, partnerName: 'Grossiste X', model: 'dropshipping', isPrimary: true, available: true, leadTimeDays: 5, costCents: 100, currency: 'EUR' }];
  const { rows } = computeDropshipOps(products, sources);
  assert.equal(rows[0].promises24h, false, '5 j > 2 j : la promesse boutique tombe');
  assert.ok(rows[0].anomalies.some(a => /5 j > 2 j/.test(a)), 'lanomalie cite le délai réel');
  assert.equal(rows[0].supplierName, 'Grossiste X', 'défaut de rattachement : le nom du partenaire sert de référence');
  console.log('✓ délai hors promesse : suspendue et signalée, pas masquée');
}

/* 3. Badge sans offre = anomalie, JAMAIS une promesse. */
{
  const products = [{ id: 'p2', name: 'Vente en l\'air', category: 'accessoires', badges: ['dropship_24_48h'] }];
  const { rows, totals } = computeDropshipOps(products, []);
  assert.equal(rows.length, 1, 'un badge seul entre dans le champ de l\'onglet : c\'est une anomalie à voir');
  assert.ok(rows[0].anomalies.some(a => /sans offre fournisseur/.test(a)));
  // La promesse boutique est ACTIVE (badge = héritage Hair, voie de
  // compatibilité fulfillment) — et c'est exactement le danger : l'onglet
  // doit montrer la promesse ET son vide, pas effacer l'une pour l'autre.
  assert.equal(rows[0].promises24h, true, 'le badge tient la promesse boutique — la case « promesses » doit le dire');
  assert.equal(rows[0].hasOffer, false, '… et la ligne doit dire quelle ne repose sur aucune offre');
  assert.ok(totals.anomalies >= 1);
  console.log('✓ badge sans offre : promesse affichée comme active, fragilité signalée');
}

/* 4. Cosmétique skin : badge interdit, promesse impossible, coût inconnu ≠ 0. */
{
  const products = [{ id: 'p3', name: 'Sérum', category: 'peau', badges: ['dropship_24_48h'] }];
  const sources: any = [{ productId: 'p3', supplierId: 's1', partnerName: null, model: 'dropshipping', isPrimary: true, available: true, leadTimeDays: 1, costCents: null, currency: 'EUR' }];
  const { rows } = computeDropshipOps(products, sources);
  assert.equal(rows[0].promises24h, false, 'un soin visage ne promet jamais 24–48h en dropship');
  assert.ok(rows[0].anomalies.some(a => /badge 24–48h n’a pas à y figurer/.test(a)), 'le badge sur catégorie réservée est signalé');
  assert.ok(rows[0].anomalies.some(a => /reclasser/.test(a)), 'loffre sur catégorie réservée est signalée');
  assert.equal(rows[0].costCents, null, 'coût inconnu reste null');
  assert.equal(formatCost(null), 'à obtenir', 'jamais de 0 inventé');
  assert.equal(formatLeadTime(null), 'à obtenir');
  console.log('✓ skin cosmétique : badge refusé, coût « à obtenir »');
}

/* 5. Une offre indisponible se voit ; un produit sans dropship sort du champ. */
{
  const products = [
    { id: 'p4', name: 'Rasoir', category: 'accessoires', badges: [] },
    { id: 'p5', name: 'Kit complet', category: 'kits', badges: [] },
  ];
  const sources: any = [
    { productId: 'p4', supplierId: 's1', partnerName: null, model: 'dropshipping', isPrimary: true, available: false, leadTimeDays: 2, costCents: 500, currency: 'EUR' },
    { productId: 'p5', supplierId: 's1', partnerName: null, model: 'stock_kurla', isPrimary: true, available: true, leadTimeDays: 1, costCents: 500, currency: 'EUR' },
  ];
  const { rows } = computeDropshipOps(products, sources);
  assert.deepEqual(rows.map(r => r.productId), ['p4'], 'le stock KURLA pur n’a rien à faire dans l’onglet dropshipping');
  assert.ok(rows[0].anomalies.some(a => /indisponible/.test(a)));
  console.log('✓ offre indisponible signalée ; produits hors dropship exclus');
}

/* 6. Câblage : onglet DANS le groupe Catalogue, données réelles, zéro duplication. */
{
  const page = srcOf('../src/pages/AdminDashboardPage.tsx');
  const panel = srcOf('../src/components/DropshipOpsPanel.tsx');
  const grp = page.slice(page.indexOf("id: 'catalog', label: workspace === 'skin'"), page.indexOf("id: 'supply',"));
  assert.ok(grp.includes("{ id: 'dropshipping', label: 'Dropshipping'"), 'l\'onglet doit vivre dans le groupe Catalogue');
  assert.ok(grp.indexOf("'dropshipping'") < grp.indexOf("'guide_dropship'"), 'onglet « Dropshipping » avant son guide');
  assert.ok(page.includes("activeTab === 'dropshipping'") && page.includes('<DropshipOpsPanel'), 'l\'onglet rend le panneau');
  assert.ok(/onOpenGuide=\{\(\) => setActiveTab\('guide_dropship'\)\}/.test(page), 'le panneau renvoie au guide existant — il ne le duplique pas');
  assert.ok(panel.includes('fetchAdminCatalogProducts'), 'les produits viennent du chargeur partagé du catalogue');
  assert.ok(panel.includes("'/api/admin/sourcing/sources'") && panel.includes("'/api/admin/suppliers?all=1'"), 'offres et fournisseurs lus aux vraies routes admin');
  assert.ok(!panel.includes('buildDropshipPurchaseOrder') && !panel.includes('mailtoHref'), 'le bon de commande reste au sourcing : pas de double saisie');
  assert.ok(panel.includes('à obtenir') || panel.includes('formatCost'), 'le « à obtenir » orne le panneau comme la logique');
  console.log('✓ câblage : groupe Catalogue, vraies routes, aucun doublon de saisie');
}

console.log('\n6 blocs de contrôles onglet dropshipping validés — logique d\'état, promesses tenables, zéro invention, câblage catalogue.');
