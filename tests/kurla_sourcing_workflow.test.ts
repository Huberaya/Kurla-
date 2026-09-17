/**
 * CHANTIER 6 — workflow sourcing : un vocabulaire, 8 étapes, entonnoir unique.
 *
 * Invariants : pas de 5ᵉ enum, published/active porte achat ≠ boutique,
 * aucune transition n'écrit catalog_status, Appro v1 conservé.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { canTransitionSupplyWorkflow, SUPPLY_WORKFLOW_LABELS, SUPPLY_WORKFLOW_STATES } from '../src/lib/supplyModel';
import { unifyCandidate, unifyFondPosition, unifyProduct, BUSINESS_STAGES } from '../src/lib/productLifecycle';
import {
  BOUTIQUE_GATE,
  PURCHASE_GATE,
  PURCHASE_STEPS,
  buildUniqueFunnel,
  latestPurchaseState,
  purchaseHintStage,
  workflowPublishesToBoutique,
} from '../src/lib/sourcingWorkflow';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

ok('les 8 clés d’achat + refused sont intactes — pas un 5ᵉ enum', () => {
  assert.deepEqual([...SUPPLY_WORKFLOW_STATES], [
    'identified', 'supplier_identified', 'evaluation', 'validated',
    'approved', 'ready_to_publish', 'published', 'active', 'refused',
  ]);
  assert.deepEqual([...PURCHASE_STEPS], SUPPLY_WORKFLOW_STATES.filter(state => state !== 'refused'));
  assert.equal(PURCHASE_STEPS.length, 8);
  assert.deepEqual([...BUSINESS_STAGES], ['identified', 'sourcing', 'catalog', 'published', 'refused']);
});

ok('libellés alignés : porte achat, published/active ≠ boutique', () => {
  assert.match(SUPPLY_WORKFLOW_LABELS.identified, /Identifié/);
  assert.match(SUPPLY_WORKFLOW_LABELS.supplier_identified, /sourcing/);
  assert.match(SUPPLY_WORKFLOW_LABELS.evaluation, /sourcing/);
  assert.match(SUPPLY_WORKFLOW_LABELS.validated, /Validé/);
  assert.match(SUPPLY_WORKFLOW_LABELS.published, /porte achat/);
  assert.match(SUPPLY_WORKFLOW_LABELS.active, /porte achat/);
  assert.match(SUPPLY_WORKFLOW_LABELS.published, /boutique/);
  assert.match(SUPPLY_WORKFLOW_LABELS.active, /boutique/);
  assert.equal(SUPPLY_WORKFLOW_LABELS.refused, 'Refusé');
});

ok('aucune étape d’achat n’ouvre la boutique', () => {
  for (const state of SUPPLY_WORKFLOW_STATES) {
    assert.equal(workflowPublishesToBoutique(state), false, state);
  }
  assert.equal(workflowPublishesToBoutique(), false);
  assert.equal(BOUTIQUE_GATE, 'catalog_status + isPublishableProduct');
  assert.equal(PURCHASE_GATE, 'sourcing_workflow_events');
});

ok('candidat published/active SANS fiche = sourcing, jamais public', () => {
  for (const workflowState of ['published', 'active'] as const) {
    const row = unifyCandidate({ id: 'c-pub', product: 'Sérum', workflowState });
    assert.equal(row.lifecycle.stage, 'sourcing', workflowState);
    assert.equal(row.lifecycle.isPublic, false);
    assert.equal(row.lifecycle.publishable, false);
    assert.equal(row.purchaseStep, workflowState);
    assert.equal(purchaseHintStage(workflowState), 'sourcing');
  }
});

ok('candidat refused SANS fiche = refusé, hors boutique', () => {
  const row = unifyCandidate({ id: 'c-no', product: 'X', workflowState: 'refused' });
  assert.equal(row.lifecycle.stage, 'refused');
  assert.equal(row.lifecycle.isPublic, false);
  assert.equal(purchaseHintStage('refused'), 'refused');
});

ok('la fiche catalogue gagne : candidat lié published+listable = publié', () => {
  const row = unifyCandidate({
    id: 'c-linked',
    product: 'Bonnet',
    draft_product_id: 'p-hair',
    catalogStatus: 'published',
    isPubliclyListable: true,
    workflowState: 'active',
  });
  assert.equal(row.lifecycle.stage, 'published');
  assert.equal(row.lifecycle.isPublic, true);
  assert.equal(row.purchaseStep, 'active');
});

ok('offre et validé restent des faits, pas des stades du funnel unique', () => {
  const identified = unifyFondPosition({ sourcing_item_id: 'fond-50-n01', rang: 1, produit: 'A' });
  const sourcing = unifyCandidate({ id: 'c1', product: 'B', workflowState: 'evaluation', purchase_price_cents: 400 });
  const catalog = unifyProduct({ id: 'p-draft', name: 'C', catalogStatus: 'draft', publicationReady: true });
  const published = unifyProduct({
    id: 'p-pub', name: 'D', catalogStatus: 'published',
    truth: { isPubliclyListable: true }, sourcesCount: 1,
  });
  const funnel = buildUniqueFunnel([identified, sourcing, catalog, published]);
  assert.equal(funnel.stages.identified, 1);
  assert.equal(funnel.stages.sourcing, 1);
  assert.equal(funnel.stages.catalog, 1);
  assert.equal(funnel.stages.published, 1);
  assert.equal(funnel.stages.refused, 0);
  assert.ok(funnel.withOffer >= 1);
  assert.ok(funnel.validated >= 1);
  assert.equal(funnel.publicCount, 1);
  assert.equal(funnel.purchase.evaluation, 1);
  assert.equal(funnel.purchase.identified, 0);
  assert.equal(identified.purchaseStep, null, 'fond : hors piste achat');
});

ok('sans trace, état d’achat = identifié — jamais une étape devinée', () => {
  assert.equal(latestPurchaseState([], 'c1'), 'identified');
  assert.equal(latestPurchaseState([
    { entity_id: 'c1', entity_type: 'candidate', to_state: 'evaluation', created_at: '2026-01-01' },
    { entity_id: 'c1', entity_type: 'candidate', to_state: 'published', created_at: '2026-02-01' },
  ], 'c1'), 'published');
  assert.equal(latestPurchaseState([
    { entity_id: 'other', entity_type: 'candidate', to_state: 'active', created_at: '2026-03-01' },
  ], 'c1'), 'identified');
});

ok('les transitions légales n’ont pas bougé (pas de saut identifié → publié)', () => {
  assert.equal(canTransitionSupplyWorkflow('identified', 'published'), false);
  assert.equal(canTransitionSupplyWorkflow('ready_to_publish', 'published'), true);
  assert.equal(canTransitionSupplyWorkflow('published', 'active'), true);
  assert.equal(canTransitionSupplyWorkflow('refused', 'evaluation'), true);
});

ok('la route transition n’écrit pas catalog_status — warning additif seulement', () => {
  const source = read('src/server/routes/sourcing.ts');
  const start = source.indexOf("app.post('/api/admin/sourcing/workflow/transition'");
  const end = source.indexOf("app.get('/api/admin/sourcing/workflow/events'");
  assert.ok(start > 0 && end > start);
  const handler = source.slice(start, end);
  assert.match(handler, /sourcing_workflow_events/);
  assert.doesNotMatch(handler, /\.from\('products'\)/);
  assert.doesNotMatch(handler, /\.update\(/);
  assert.match(handler, /publishesToBoutique/);
  const summaryStart = source.indexOf("app.get('/api/admin/sourcing/workflow/summary'");
  const summary = source.slice(summaryStart, source.indexOf("app.get('/api/admin/sourcing/ops'"));
  assert.match(summary, /currentByCandidate/);
  assert.match(summary, /publishesToBoutique/);
});

ok('entonnoir unique = ProductLifecyclePanel ; Funnel = sous-piste achat', () => {
  const unique = read('src/components/ProductLifecyclePanel.tsx');
  assert.match(unique, /Entonnoir unique/);
  assert.match(unique, /workflow\/summary/);
  assert.match(unique, /workflowState/);
  assert.match(unique, /Offre \(fait\)/);
  assert.match(unique, /Validé \(fait\)/);
  assert.match(unique, /Sous-piste achat/);
  const funnel = read('src/components/SourcingWorkflowFunnel.tsx');
  assert.match(funnel, /Porte achat — 8 étapes/);
  assert.match(funnel, /Porte achat ≠ porte boutique/);
  const panel = read('src/components/SourcingWorkflowPanel.tsx');
  assert.match(panel, /porte achat ≠ boutique/);
  assert.match(panel, /La boutique ne change pas/);
});

ok('Appro v1 n’est pas retiré ; Hair (fulfillment / launchCatalog) intacts dans ce chantier', () => {
  const dash = read('src/pages/AdminDashboardPage.tsx');
  assert.match(dash, /Fournisseurs & sourcing/);
  assert.match(dash, /Appro v1 reste intact/);
  assert.match(dash, /supply_v2_negocier/);
});

console.log(`\n[PASS] Workflow sourcing (chantier 6) : ${checks} contrôles — un vocabulaire, 8 étapes, entonnoir unique, boutique ≠ porte achat.`);
