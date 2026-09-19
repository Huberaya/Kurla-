import assert from 'node:assert/strict';

import {
  applyRegistryFilter, buildConsolidatedSourcing, buildRowEmail,
  emptyRegistryFilter, registryFilterOptions, registryToCsv
} from '../src/lib/sourcingConsolidated';

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
  positions: [
    { sourcing_item_id: 'fond-1', rang: 1, marque: 'The Ordinary', produit: 'Glycolic Acid 7 %', format: '240 ml', prix_constate_cents: 1390, statut_prix: 'constate', fournisseur_canal: 'theordinary.com' },
    { sourcing_item_id: 'fond-1', rang: 2, marque: 'COSRX', produit: 'Advanced Snail 96', format: '100 ml', prix_constate_cents: 0, statut_prix: 'a_obtenir', fournisseur_canal: 'getyourkbeauty' },
  ],
  rfqs: [
    { id: 'peau-blacketique-kbeauty', supplier_id: 'sup-blacketique-sas', content: 'Bonjour BLACKETIQUE, demande de compte pro pour Beauty of Joseon Glow…', status: 'draft' },
  ],
};

function main(): void {
  const result = buildConsolidatedSourcing(fixtures as any);

  // 1. Les fiches unavailable sont exclues ; produits + candidats + positions comptés.
  assert.equal(result.total, 7, '4 produits - 1 unavailable + 2 candidats + 2 positions = 7 lignes');
  assert.equal(result.products, 3);
  assert.equal(result.candidates, 2);
  assert.equal(result.positions, 2);
  assert.equal(result.rows.some(r => r.id === 'prod-retired'), false, 'fiche retirée exclue');

  // 1b. Pipeline : chaque ligne porte un état, les KPI somment juste.
  const priced = result.rows.find(r => r.name === 'Glycolic Acid 7 %');
  const unpriced = result.rows.find(r => r.name === 'Advanced Snail 96');
  assert.equal(priced?.state, 'source', 'position avec prix constaté = sourcé');
  assert.equal(unpriced?.state, 'identifie', 'position sans prix = identifié');
  assert.equal(priced?.format, '240 ml', 'format de la position conservé');
  const published = result.rows.find(r => r.id === 'fond-boj-glow');
  assert.equal(published?.state, 'publie', 'produit publié non achetable = publié');
  const draft = result.rows.find(r => r.id === 'src-unknown-price');
  assert.equal(draft?.state, 'conforme', 'produit draft = conforme (pas encore publié)');
  const somme = Object.values(result.pipeline).reduce((a: number, b) => a + (b as number), 0);
  assert.equal(somme, 7, 'les KPI du pipeline somment au total');

  // 2. Aucun prix inventé : 0 € devient « à obtenir ».
  const noPrice = result.rows.find(r => r.id === 'src-unknown-price');
  const noPriceCandidate = result.rows.find(r => r.id === 'cand-2');
  assert.equal(noPrice?.priceEur, null, 'prix produit absent = null');
  assert.equal(noPrice?.priceLabel, 'à obtenir');
  assert.equal(noPriceCandidate?.priceEur, null, 'prix candidat absent = null');
  assert.equal(unpriced?.priceEur, null, 'position sans prix = null');

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

  // 6. CHANTIER D — sans readiness mesurée, le registre reste fail-closed :
  //    publié = un fait de catalogue, mais AUCUNE fiche n'est « conforme ».
  assert.equal(result.readinessAvailable, false, 'readiness non fournie = non mesurable');
  assert.equal(draft?.registryStage, 'fiche_creee', 'draft sans readiness mesurée = fiche créée, jamais conforme');
  assert.equal(published?.registryStage, 'publie', 'publié reste un fait même sans readiness');
  assert.equal(published?.ready, null, 'ready non mesurable = null, pas faux');
  const regSomme = Object.values(result.registry).reduce((a, b) => a + (b as number), 0);
  assert.equal(regSomme, 7, 'les 4 stades de registre somment au total');
  assert.equal(ankorstore && result.rows.find(r => r.id === 'cand-1')?.registryStage, 'identifie', 'candidat sans fiche = identifié');

  console.log('[PASS] Vue sourcing consolidée : exclusions, prix jamais inventés, fournisseurs/contacts rattachés, RFQ servis tels quels, textes générés sans invention.');
}

function mainRegistry(): void {
  // BLOC 2 — CHANTIER D : le registre approvisionné.
  const reg = buildConsolidatedSourcing({
    products: [
      { id: 'p-pub-ready', name: 'Shampoing Doux', brand: 'A', catalogStatus: 'published', basePrice: 10 },
      { id: 'p-pub-notready', name: 'Sérum Kératine', brand: 'B', catalogStatus: 'published', basePrice: 20 },
      { id: 'p-draft-ready', name: 'Masque Nuit', brand: 'C', catalogStatus: 'draft', basePrice: 15 },
      { id: 'p-draft-notready', name: 'Huile Capillaire', brand: 'D', catalogStatus: 'draft', basePrice: 12 },
      { id: 'p-esc', name: 'Sérum; Intense', brand: 'A"Z', catalogStatus: 'draft', basePrice: 8 },
    ],
    candidates: [
      { id: 'c-no-fiche', product: 'Candidat simple', brand: 'E', prospect_id: 'pr-1', public_price_cents: 900, draft_product_id: null },
      { id: 'c-with-fiche', product: 'Candidat relié', brand: 'F', prospect_id: 'pr-1', public_price_cents: 1100, draft_product_id: 'p-draft-ready' },
      { id: 'c-orphan-link', product: 'Candidat orphelin lié', brand: 'X', prospect_id: 'pr-1', public_price_cents: 0, draft_product_id: 'p-missing' },
    ],
    positions: [
      { sourcing_item_id: 'it-1', rang: 1, marque: 'G', produit: 'Position 1', prix_constate_cents: 500, fournisseur_canal: 'canal-x' },
      { sourcing_item_id: 'it-unknown', rang: 2, marque: 'H', produit: 'Position 2', prix_constate_cents: null, fournisseur_canal: 'canal-y' },
    ],
    prospects: [{ id: 'pr-1', name: 'Prospect Uno', contact_email: 'u@exemple.fr' }],
    suppliers: [],
    rfqs: [],
    readiness: [
      { productId: 'p-pub-ready', ready: true, missing: [], catalogStatus: 'published' },
      { productId: 'p-pub-notready', ready: false, missing: ['CPNP', 'INCI'], catalogStatus: 'published' },
      { productId: 'p-draft-ready', ready: true, missing: [], catalogStatus: 'draft' },
      { productId: 'p-draft-notready', ready: false, missing: ['visuel'], catalogStatus: 'draft' },
      { productId: 'p-esc', ready: false, missing: [], catalogStatus: 'draft' },
    ],
    items: [{ id: 'it-1', wave: 'vague-1', title: 'Besoin 1' }],
  } as any);

  // 1. Dérivation des 4 stades — publiée > conforme > fiche créée > identifié,
  //    chacun prouvé par une donnée réelle.
  assert.equal(reg.readinessAvailable, true);
  assert.equal(reg.total, 10);
  assert.equal(reg.rows.find(r => r.id === 'p-pub-ready')?.registryStage, 'publie');
  assert.equal(reg.rows.find(r => r.id === 'p-pub-notready')?.registryStage, 'publie', 'publié mais non conforme reste publié (anomalie nommée)');
  assert.deepEqual(reg.rows.find(r => r.id === 'p-pub-notready')?.missing, ['CPNP', 'INCI'], 'manquants nommés, jamais masqués');
  assert.equal(reg.rows.find(r => r.id === 'p-draft-ready')?.registryStage, 'conforme');
  assert.equal(reg.rows.find(r => r.id === 'p-draft-notready')?.registryStage, 'fiche_creee', 'non prête = fiche créée');
  assert.equal(reg.rows.find(r => r.id === 'p-esc')?.registryStage, 'fiche_creee');
  assert.equal(reg.rows.find(r => r.id === 'c-no-fiche')?.registryStage, 'identifie');
  assert.equal(reg.rows.find(r => r.id === 'pos-it-1-1')?.registryStage, 'identifie', 'une position n’a pas de fiche');
  assert.deepEqual(reg.registry, { identifie: 3, fiche_creee: 3, conforme: 2, publie: 2 }, 'comptes réels par stade');

  // 2. Réconciliation catalogue ⇄ approvisionnement : même id des deux côtés.
  const linked = reg.rows.find(r => r.id === 'c-with-fiche');
  assert.equal(linked?.linkedProductId, 'p-draft-ready', 'candidat relié = stade de sa fiche');
  assert.equal(linked?.registryStage, 'conforme', 'le stade suit la fiche (ready=true, draft)');
  assert.equal(linked?.ready, true);
  assert.equal(reg.rows.find(r => r.id === 'p-draft-ready')?.linkedCandidateId, null, 'la fiche ne connaît pas son candidat ici (source_candidate_id absent)');
  const orphan = reg.rows.find(r => r.id === 'c-orphan-link');
  assert.equal(orphan?.registryStage, 'fiche_creee', 'fiche liée mais readiness absente = fiche créée (fail-closed)');
  assert.equal(orphan?.ready, null);

  // 3. Vague : celle de l'item, null si l'item est inconnu (jamais supposée).
  assert.equal(reg.rows.find(r => r.id === 'pos-it-1-1')?.wave, 'vague-1');
  assert.equal(reg.rows.find(r => r.id === 'pos-it-unknown-2')?.wave, null, 'item inconnu = vague null');
  assert.equal(reg.rows.find(r => r.id === 'p-pub-ready')?.wave, null, 'les fiches n’ont pas de vague');

  // 4. Filtres du registre — cumulables, sur les lignes réelles.
  const bySupplier = applyRegistryFilter(reg.rows, { ...emptyRegistryFilter(), supplier: 'Prospect Uno' });
  assert.equal(bySupplier.length, 3, '3 candidats chez Prospect Uno');
  const byStage = applyRegistryFilter(reg.rows, { ...emptyRegistryFilter(), stage: 'conforme' });
  assert.equal(byStage.length, 2, 'conforme = fiche prête + candidat relié à une fiche prête');
  const byWave = applyRegistryFilter(reg.rows, { ...emptyRegistryFilter(), wave: 'vague-1' });
  assert.equal(byWave.length, 1);
  const byNoWave = applyRegistryFilter(reg.rows, { ...emptyRegistryFilter(), wave: 'sans' });
  assert.equal(byNoWave.length, 9, '9 lignes sans vague (item inconnu ou hors positions)');
  const byNoSupplier = applyRegistryFilter(reg.rows, { ...emptyRegistryFilter(), supplier: 'sans' });
  assert.equal(byNoSupplier.length, 5, 'les 5 fiches sans fournisseur rattaché');
  const bySearch = applyRegistryFilter(reg.rows, { ...emptyRegistryFilter(), search: 'sérum' });
  assert.equal(bySearch.length, 2, 'recherche insensible à la casse (Sérum Kératine + Sérum; Intense)');
  const byAll = applyRegistryFilter(reg.rows, { ...emptyRegistryFilter(), supplier: 'Prospect Uno', stage: 'identifie' });
  assert.equal(byAll.length, 1, 'cumul : Prospect Uno ∩ identifié = c-no-fiche');

  // 5. Options de filtre : uniquement ce que les données proposent, comptes réels.
  const options = registryFilterOptions(reg.rows);
  assert.deepEqual(options.suppliers.map(s => [s.value, s.count]),
    [['Prospect Uno', 3], ['canal-x', 1], ['canal-y', 1], ['sans', 5]], 'fournisseurs = ceux des lignes, sans en dernier');
  assert.deepEqual(options.waves.map(w => [w.value, w.count]), [['vague-1', 1], ['sans', 9]]);
  assert.deepEqual(options.stages.map(s => [s.value, s.count]),
    [['all', 10], ['identifie', 3], ['fiche_creee', 3], ['conforme', 2], ['publie', 2]]);

  // 6. Export CSV : BOM + CRLF, séparateur ;, échappement, prix français.
  const csv = registryToCsv(reg.rows);
  assert.ok(csv.startsWith('\uFEFF'), 'BOM UTF-8 (Excel)');
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 12, 'en-tête + 10 lignes + CRLF final');
  assert.equal(lines[0].slice(1), 'type;id;nom;marque;format;prix_eur;prix_source;fournisseur;contact;site;e_mail;vague;statut_registre;statut_pipeline;critères_manquants;fiche_liee;candidat_lie');
  const escLine = lines.find(l => l.includes('p-esc'));
  assert.ok(escLine, 'ligne p-esc présente');
  assert.ok(escLine!.includes('"Sérum; Intense"'), 'nom avec ; entre guillemets');
  assert.ok(escLine!.includes('"A""Z"'), 'guillemet dupliqué dans la marque');
  assert.ok(escLine!.includes('8,00'), 'prix en euros à virgule');
  assert.ok(escLine!.includes('Fiche créée'), 'stade en français');
  const notReadyLine = lines.find(l => l.includes('p-pub-notready'));
  assert.ok(notReadyLine!.includes('CPNP | INCI'), 'critères manquants nommés dans le CSV');
  assert.ok(notReadyLine!.includes('Publié'));
  assert.ok(!lines.some(l => l.includes('undefined')), 'aucun undefined dans l’export');

  // 7. E-mail d'une référence seule : données réelles uniquement.
  const rowEmail = buildRowEmail(reg.rows.find(r => r.id === 'pos-it-1-1')!);
  assert.equal(rowEmail.subject, '[KURLA] Devis Position 1 — G');
  assert.ok(rowEmail.body.includes('Référence visée : Position 1 (G) — prix public constaté : 5,00 €'));
  assert.ok(rowEmail.body.includes('preuve de notification CPNP et nom de la Personne Responsable UE'), 'attentes standard partagées');
  assert.ok(!rowEmail.body.includes('undefined'));
  const rowNoPrice = buildRowEmail(reg.rows.find(r => r.id === 'pos-it-unknown-2')!);
  assert.ok(rowNoPrice.body.includes('prix à obtenir'), 'absence de prix = à obtenir, jamais 0');

  console.log('[PASS] Registre approvisionné (chantier D) : 4 stades dérivés fail-closed, réconciliation par id, vague réelle, filtres cumulables, options sans invention, CSV CRLF échappé, e-mail par ligne.');
}

/**
 * CIBLAGE DES MESSAGES (19/09) — « quand j'envoie un message à un
 * fournisseur, je veux savoir quels produits sont ciblés, lesquels sont déjà
 * dans la boutique, et lesquels attendent un fournisseur ».
 */
function mainTargeting() {
  const result = buildConsolidatedSourcing(fixtures as any);

  // Chaque bloc porte son ciblage : compte cohérent, jamais inventé.
  for (const block of result.supplierBlocks) {
    assert.equal(block.targetedCount, block.targeted.length, `bloc ${block.name} : targetedCount doit coller à la liste`);
    assert.equal(block.targetedCount, block.rowCount, `bloc ${block.name} : le ciblage couvre toutes les lignes du bloc`);
    assert.ok(block.inShopCount <= block.targetedCount, `bloc ${block.name} : inShopCount incohérent`);
  }

  // Un produit publié rattaché à un fournisseur : ciblé ET dans la boutique,
  // derrière son id réel (fiche éditable).
  const blacketique = result.supplierBlocks.find(b => b.name === 'BLACKETIQUE SAS');
  assert.ok(blacketique, 'bloc BLACKETIQUE attendu');
  const boj = blacketique!.targeted.find(t => t.name === 'Beauty of Joseon Glow');
  assert.ok(boj, 'le produit publié doit être ciblé dans le message à son fournisseur');
  assert.equal(boj!.inShop, true, 'publié = dans la boutique (fait mesuré)');
  assert.equal(boj!.productId, 'fond-boj-glow', 'le ciblage porte l’id réel de la fiche');
  assert.equal(boj!.stateLabel, 'publié');
  assert.ok(blacketique!.inShopCount >= 1);
  assert.equal(blacketique!.needsSupplier, false);

  // Un candidat sans fiche : ciblé, pas dans la boutique, et AUCUN id produit
  // inventé — le nom reste du texte tant qu'aucune fiche n'existe.
  const ankorstore = result.supplierBlocks.find(b => b.name === 'Ankorstore');
  assert.ok(ankorstore, 'bloc Ankorstore attendu');
  const cand = ankorstore!.targeted.find(t => t.name === 'Sérum Niacinamide 10 %');
  assert.ok(cand, 'le candidat rattaché à la piste doit être ciblé');
  assert.equal(cand!.inShop, false);
  assert.equal(cand!.productId, null, 'pas de fiche = pas d’id produit (jamais inventé)');
  assert.equal(cand!.stateLabel, 'identifié');

  // Le bloc des produits sans canal connu est marqué « à sourcer » — c'est la
  // liste des produits pour lesquels il faut CHERCHER un fournisseur.
  const toSource = result.supplierBlocks.find(b => b.name === 'Fournisseur à qualifier');
  assert.ok(toSource, 'bloc « Fournisseur à qualifier » attendu');
  assert.equal(toSource!.needsSupplier, true, 'le bloc sans canal doit être marqué à sourcer');
  assert.ok(toSource!.targeted.some(t => t.name === 'Sérum sans prix'), 'l’orphelin sans canal doit y figurer');
  for (const block of result.supplierBlocks) {
    if (block.name !== 'Fournisseur à qualifier') assert.equal(block.needsSupplier, false, `bloc ${block.name} : needsSupplier ne se déclenche que sur le bloc sans canal`);
  }

  console.log('[PASS] Ciblage des messages : produits ciblés par fournisseur, dans la boutique ou non, id réel seulement s’il existe une fiche, bloc « à sourcer » marqué.');
}

main();
mainRegistry();
mainTargeting();
