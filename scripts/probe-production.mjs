#!/usr/bin/env node
/**
 * SONDE DE PRODUCTION — débusquer les silences, à la main.
 * =======================================================
 *
 * Un endpoint qui casse renvoie du 500 et tout le monde le voit. Un
 * endpoint qui répond **200 avec un tableau vide** ne renvoie rien : pas
 * d'erreur, pas d'alerte, une page blanche. Mesuré deux fois sur
 * `/api/peau/gamme` :
 *
 *   - un filtre trop strict (publishedOnly appliqué là où il ne fallait
 *     pas) ramenait 0 fiche sur 16 présentes, sans erreur ;
 *   - seize fiches repassées en `catalog_status = 'draft'` ont vidé la
 *     route du jour au lendemain, toujours sans erreur.
 *
 * Et le 11/09/2026, c'est cette sonde qui a trouvé l'API entière en 500
 * (`Cannot find module 'web-push'`) alors que la page d'accueil répondait
 * 200 et que tous les bancs étaient verts.
 *
 * Emploi :
 *
 *   KURLA_PROD_URL=https://kurlabeauty.vercel.app node scripts/probe-production.mjs
 *   node scripts/probe-production.mjs --url https://… --strict
 *
 *   --strict  un silence non critique compte aussi comme un échec
 *
 * Codes de sortie : 0 rien d'anormal · 1 anomalie · 2 URL absente.
 *
 * La logique vit dans `scripts/lib/sonde.mjs`, partagée avec
 * `scripts/verifier-deploiement.mjs`. Ajouter un endpoint : compléter
 * `ENDPOINTS` dans ce module.
 */

import { sonderTout, MARQUES, resumer, ENDPOINTS, CRITIQUES, VIDES_ATTENDUS } from './lib/sonde.mjs';

const args = process.argv.slice(2);
const indice = (nom) => args.indexOf(nom);
const base = (process.env.KURLA_PROD_URL || (indice('--url') >= 0 ? args[indice('--url') + 1] : '')).replace(/\/+$/, '');
const strict = args.includes('--strict');

if (!base) {
  console.error('URL manquante : KURLA_PROD_URL=https://… node scripts/probe-production.mjs');
  process.exit(2);
}

console.log(`Sonde de production — ${base}`);
console.log(`${ENDPOINTS.length} endpoints · ${CRITIQUES.length} critique(s) · ${VIDES_ATTENDUS.length} vide(s) attendu(s)`);

const bilan = await sonderTout(base, { journal: (faits, total) => process.stdout.write(`\r  sondage ${faits}/${total}…`) });
process.stdout.write('\r'.padEnd(30) + '\r');

console.log(`identifiant produit : ${bilan.productId || 'non résolu'}\n`);
for (const r of bilan.resultats) {
  const detail = r.classe === 'ok' ? r.taille : (r.detail ?? r.extrait ?? `statut ${r.statut}`);
  console.log(`${MARQUES[r.classe] ?? ' --   '} ${String(r.statut).padStart(3)}  ${r.chemin.padEnd(46)} ${detail}`);
}

console.log(`\n— bilan —\n  ${resumer(bilan)}`);

if (bilan.silences.length > 0) {
  console.log('\nUn silence n’est pas une preuve d’absence : avant de corriger,');
  console.log('vérifier si la base contient bien les données attendues.');
}

const bloquant = bilan.erreurs.length > 0
  || bilan.silences.some((s) => s.classe === 'silence critique')
  || (strict && bilan.silences.length > 0);

process.exit(bloquant ? 1 : 0);
