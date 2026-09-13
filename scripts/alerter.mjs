#!/usr/bin/env node
/**
 * ALERTE D'INCIDENT — porter le signal jusqu'à quelqu'un.
 * ======================================================
 *
 * Un banc rouge dans un tableau de bord que personne n'ouvre n'est pas une
 * alerte : c'est un constat différé. Ce programme est le dernier maillon —
 * celui qui fait qu'une panne réveille quelqu'un.
 *
 * Emploi :
 *
 *   node scripts/alerter.mjs --source "Sonde de production" --gravite critique \
 *        --detail "3 endpoints muets"
 *
 *   --detail-file <fichier>   le détail est lu dans un fichier (journaux)
 *   --empreinte <valeur>      forcer l'empreinte de dédoublonnage
 *
 * Destination, dans cet ordre :
 *
 *   1. ALERT_WEBHOOK_URL  POST JSON (Slack, Discord, ntfy, Make, n8n…)
 *   2. GITHUB_TOKEN + GITHUB_REPOSITORY  une issue, notifiée par courriel
 *   3. aucune : échec bruyant, code de sortie 3
 *
 * Codes de sortie : 0 envoyé · 3 aucune destination · 4 émission impossible.
 */

import { readFileSync } from 'node:fs';

import {
  CODES_SORTIE,
  RAPPEL_SANS_DESTINATION,
  choisirDestination,
  construirePayload,
  empreinteDe,
  publier
} from './lib/alerte.mjs';

const args = process.argv.slice(2);
const valeur = (nom, defaut = '') => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] !== undefined ? String(args[i + 1]) : defaut;
};

const fichierDetail = valeur('--detail-file');
const detail = fichierDetail
  ? readFileSync(fichierDetail, 'utf8')
  : valeur('--detail', 'Aucun détail transmis.');

const source = valeur('--source', 'Production');
const gravite = valeur('--gravite', 'majeure');
const empreinte = valeur('--empreinte') || empreinteDe([process.env.GITHUB_WORKFLOW, source]);

// L'adresse de l'exécution : sans elle, une alerte dit « ça a échoué » sans
// dire où regarder. Dans GitHub Actions, les trois variables sont fournies.
const serveur = process.env.GITHUB_SERVER_URL || 'https://github.com';
const lien = process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
  ? `${serveur}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : '';

const payload = construirePayload({ source, empreinte, gravite, detail, lien });
const destination = choisirDestination(process.env);

if (destination.canal === 'aucun') {
  console.error(`\n${RAPPEL_SANS_DESTINATION}\n`);
  process.exit(CODES_SORTIE.aucune_destination);
}

const resultat = await publier(destination, payload);

if (resultat.action === 'echec') {
  console.error(`\nAlerte non remise (${resultat.canal}) : ${resultat.erreur}`);
  console.error(`Empreinte ${payload.empreinte} — ${payload.titre}\n`);
  process.exit(CODES_SORTIE.echec_emission);
}

console.log(`Alerte remise — canal ${resultat.canal} · action ${resultat.action}${resultat.url ? ` · ${resultat.url}` : ''}`);
console.log(`Empreinte ${payload.empreinte} — ${payload.titre}`);
process.exit(CODES_SORTIE.envoye);
