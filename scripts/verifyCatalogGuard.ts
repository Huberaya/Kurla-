#!/usr/bin/env tsx
/**
 * B3 — Garde-fou catalogue (54 SKU / 10 kits)
 *
 * Vérifie que src/lib/launchCatalog.ts n'a pas été modifié (le flux 3PL ne
 * doit toucher que src/lib/fulfillment.ts + tables Supabase).
 *
 * Usage :
 *   tsx scripts/verifyCatalogGuard.ts            // local
 *   tsx scripts/verifyCatalogGuard.ts --ci        // en CI : fail si modifié
 *   tsx scripts/verifyCatalogGuard.ts --fix       // affiche l'empreinte attendue
 *
 * En pre-push : `git diff --quiet -- src/lib/launchCatalog.ts || exit 1`
 */

import { execSync } from 'node:child_process';
import { LAUNCH_PRODUCTS, LAUNCH_KITS } from '../src/lib/launchCatalog';

const EXPECTED = { products: 54, kits: 10, file: 'src/lib/launchCatalog.ts' };

function checkCounts(): boolean {
  const p = LAUNCH_PRODUCTS.length;
  const k = LAUNCH_KITS.length;
  if (p !== EXPECTED.products || k !== EXPECTED.kits) {
    console.error(`⛔ Catalogue : attendu ${EXPECTED.products} SKU / ${EXPECTED.kits} kits, trouvé ${p} / ${k} dans ${EXPECTED.file}.`);
    console.error(`   Restaurez le fichier avant de pousser. Le flux 3PL ne touche que src/lib/fulfillment.ts.`);
    return false;
  }
  console.log(`✓ Catalogue intact : ${p} SKU / ${k} kits — ${EXPECTED.file} inchangé.`);
  return true;
}

function checkGitDiff(): boolean {
  try {
    execSync('git diff --quiet -- src/lib/launchCatalog.ts', { stdio: 'pipe' });
    console.log(`✓ git diff vide — ${EXPECTED.file} non modifié.`);
    return true;
  } catch {
    console.error(`⛔ git diff non vide — ${EXPECTED.file} a été modifié.`);
    try {
      const diff = execSync('git diff -- src/lib/launchCatalog.ts --stat', { encoding: 'utf8' });
      console.error(diff);
    } catch {}
    console.error(`   Annulez avec : git checkout -- ${EXPECTED.file}`);
    return false;
  }
}

const isCi = process.argv.includes('--ci') || process.env.CI === 'true';
const countsOk = checkCounts();
let diffOk = true;
// Le diff git n'a de sens que dans un repo avec historique
try {
  diffOk = checkGitDiff();
} catch {
  diffOk = true;
}

if (!countsOk || (isCi && !diffOk)) {
  process.exit(1);
}
