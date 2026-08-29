/**
 * CHANTIER 16C — GÉNÉRATION DES DEMANDES DE PRIX DE LA VAGUE 1.
 *
 * Ces fichiers sont le livrable que l'on envoie réellement à un façonnier. Ils
 * sont produits par `buildRfqContent`, la même fonction que la plateforme
 * utilise quand elle crée une demande de prix : ce que vous lisez ici est donc
 * ce qui sera stocké et envoyé, pas une version retapée à côté.
 *
 * Ce script n'écrit **rien** en base et n'enregistre aucune demande : créer la
 * demande se fait au moment de l'envoi, pour que le contenu stocké soit
 * exactement celui qui est parti.
 *
 * Usage : … npx tsx scripts/generateRfqDocuments.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { listSourcingItems } from '../src/lib/db/sourcingStore';
import { buildRfqContent } from '../src/lib/sourcingRfq';
import { serverDb } from '../src/lib/serverDb';

const WAVE = 'vague-1';
const OUT_DIR = join(process.cwd(), 'docs', 'sourcing');

async function main(): Promise<void> {
  const items = await listSourcingItems(serverDb as never, WAVE);
  if (items.length === 0) {
    console.error('Aucun besoin de sourcing pour la vague 1. Lancez d’abord scripts/seedSourcingWaves.ts --apply.');
    process.exitCode = 1;
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\nCHANTIER 16C — génération des demandes de prix, vague 1 (${items.length} besoin(s))`);

  for (const item of items) {
    const content = buildRfqContent(item);
    const path = join(OUT_DIR, `${item.id}.md`);
    writeFileSync(path, content, 'utf8');
    const placeholders = (content.match(/⟨à compléter⟩/g) || []).length;
    console.log(`  ✓ docs/sourcing/${item.id}.md — ${content.length} caractères, ${placeholders} champ(s) à compléter`);
    if (placeholders === 0) {
      console.error(`    [ALERTE] aucun champ à compléter : le générateur aurait-il inventé des données ?`);
      process.exitCode = 1;
    }
  }

  console.log(`\nRien n'a été envoyé, aucune demande n'a été créée en base.`);
  console.log(`Les champs ⟨à compléter⟩ doivent être remplis par un humain avant envoi.`);
}

main().catch(error => {
  console.error('\n[ÉCHEC]', error?.message || error);
  process.exitCode = 1;
});
