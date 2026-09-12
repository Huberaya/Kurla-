#!/usr/bin/env tsx
/**
 * Audit déterministe Skin & Catalog.
 *
 * Lecture seule par défaut : aucun statut, fournisseur, prix ou document n'est
 * créé. Le script assemble les rapports déjà utilisés par l'admin et rend les
 * incohérences visibles au niveau d'une release.
 *
 * Usage :
 *   KURLA_STORE_MODE=server npm run audit:truth
 *   KURLA_STORE_MODE=server npm run audit:truth -- --strict
 *   KURLA_STORE_MODE=server npm run audit:truth -- --json
 */

import 'dotenv/config';
import { describeStoreBinding } from '../src/lib/supabaseClient';
import { serverDb } from '../src/lib/serverDb';
import { CATALOG_TRUTH_VERSION } from '../src/lib/catalogTruth';

const strict = process.argv.includes('--strict');
const json = process.argv.includes('--json');
const binding = describeStoreBinding();

if (binding.binding !== 'supabase') {
  console.error('[TRUTH] Refus : cet audit exige la base Supabase réelle.');
  process.exit(2);
}

async function main(): Promise<void> {
  const [publication, sourcing, skin] = await Promise.all([
    serverDb.getCatalogPublicationReadinessReport(),
    serverDb.getCatalogSourcingReadinessReport(),
    serverDb.getSkinCatalogReadinessReport(),
  ]);

  const findings = [
    ...publication.publishedButNotListableProducts.map(product => ({
      severity: 'blocking',
      productId: product.productId,
      kind: 'published_not_listable',
      detail: product.missing.join(' ; '),
    })),
    ...skin.perProduct
      .filter(product => product.catalogStatus === 'published' && product.commercialState === 'blocked')
      .map(product => ({
        severity: 'blocking',
        productId: product.productId,
        kind: 'skin_published_blocked',
        detail: product.blockers.map(blocker => blocker.label).join(' ; '),
      })),
    ...sourcing.perProduct
      .filter(product => product.catalogStatus === 'published' && !product.ready)
      .map(product => ({
        severity: 'blocking',
        productId: product.productId,
        kind: 'published_sourcing_incomplete',
        detail: product.missing.map(item => item.label).join(' ; '),
      })),
  ];

  const result = {
    truthVersion: CATALOG_TRUTH_VERSION,
    generatedAt: new Date().toISOString(),
    binding: binding.binding,
    products: publication.products,
    publishedStatus: publication.publishedStatus,
    publishedButNotListable: publication.publishedButNotListable,
    skinProducts: skin.products,
    skinReadyToBuy: skin.readyToBuy,
    skinPreorderVerified: skin.preorderVerified,
    skinFormulationTargets: skin.formulationTargets,
    sourcingReadyToBuy: sourcing.readyToBuy,
    findings,
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[TRUTH] ${result.truthVersion} · ${result.products} fiches · ${result.skinProducts} fiches peau`);
    console.log(`  publiées=${result.publishedStatus} · publiables=${result.publishedStatus - result.publishedButNotListable}`);
    console.log(`  peau: ready=${result.skinReadyToBuy} · preorder=${result.skinPreorderVerified} · cibles=${result.skinFormulationTargets}`);
    console.log(`  sourcing ready_to_buy=${result.sourcingReadyToBuy}`);
    console.log(`  constats bloquants=${findings.length}`);
    for (const finding of findings) {
      console.log(`  [${finding.kind}] ${finding.productId} — ${finding.detail || 'sans détail'}`);
    }
  }

  if (strict && findings.length > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error('[TRUTH] Échec:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
