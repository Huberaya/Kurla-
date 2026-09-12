#!/usr/bin/env node
/**
 * VÉRIFICATION APRÈS MISE EN LIGNE
 * ================================
 *
 * `deploy.py` s'arrêtait sur « READY » et rentrait chez moi. Le 11/09/2026,
 * la production a été annoncée en ligne alors que **toute l'API répondait
 * 500** (`Cannot find module 'web-push'`) : la page d'accueil répondait 200,
 * le déploiement était déclaré réussi, et personne n'a rien vu avant qu'une
 * sonde manuelle ne tombe dessus une heure plus tard.
 *
 * Un déploiement qu'on ne vérifie pas n'est pas un déploiement. Ce script :
 *
 *   1. attend que l'alias serve **le commit attendu** — sans quoi on sonde
 *      l'ancien build et on valide une version qui n'est pas encore en
 *      ligne (`/api/health` expose désormais son commit) ;
 *   2. sonde les endpoints publics (même logique que `probe-production`) ;
 *   3. compare à l'état connu et ne bloque que sur les **régressions**.
 *
 * Cette troisième étape compte : une anomalie déjà présente avant le
 * déploiement (les 16 fiches peau en brouillon, par exemple) est signalée
 * mais ne fait pas échouer la mise en ligne — sinon le déploiement serait
 * bloqué en permanence par un problème qu'il n'a pas créé, et l'alarme
 * finirait par ne plus être écoutée.
 *
 * Emploi :
 *
 *   node scripts/verifier-deploiement.mjs --url https://… --sha abc1234
 *   node scripts/verifier-deploiement.mjs --url https://… --maj-base
 *
 *   --sha        commit attendu (défaut : ne pas attendre de commit précis)
 *   --attente    secondes avant d'abandonner la propagation (180)
 *   --baseline   fichier d'état (défaut .kurla-etat-production.json)
 *   --maj-base   réécrit l'état même en présence d'anomalies
 *
 * Codes : 0 conforme · 1 régression · 2 propagation non confirmée ·
 *         3 usage incorrect.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { sonderTout, resumer, MARQUES } from './lib/sonde.mjs';

const args = process.argv.slice(2);
const valeur = (nom, defaut = null) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};

const base = (process.env.KURLA_PROD_URL || valeur('--url', '')).replace(/\/+$/, '');
const sha = valeur('--sha');
const attente = Number(valeur('--attente', 180));
const cheminEtat = valeur('--baseline', '.kurla-etat-production.json');
const majBase = args.includes('--maj-base');

if (!base) {
  console.error('URL manquante : --url https://… (ou KURLA_PROD_URL)');
  process.exit(3);
}

// Gravité croissante. Une régression, c'est passer d'un état sain à un
// état dégradé — pas rester dans un état dégradé connu.
const GRAVITE = {
  ok: 0,
  'vide attendu': 1,
  'vide expliqué': 1,
  'protégé': 1,
  'paramètre requis': 1,
  silence: 2,
  'silence critique': 3,
  'erreur serveur': 4,
  'délai dépassé': 4,
  réseau: 4,
};

async function sante(base) {
  try {
    const reponse = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(10000) });
    const texte = await reponse.text();
    let json = null;
    try { json = JSON.parse(texte); } catch { /* vide ou HTML */ }
    return { statut: reponse.status, json, texte: texte.slice(0, 200) };
  } catch (erreur) {
    return { statut: 0, erreur: erreur?.message ?? String(erreur) };
  }
}

console.log(`Vérification de ${base}${sha ? ` · commit attendu ${sha}` : ''}`);

// ---- 1. propagation -----------------------------------------------------
let servi = null;
const limite = Date.now() + attente * 1000;
let tours = 0;
while (Date.now() < limite) {
  tours += 1;
  const etat = await sante(base);
  servi = etat.json?.commit ?? null;
  if (etat.statut === 200) {
    const attendu = !sha || servi === sha || servi === null;
    if (attendu) {
      console.log(`  servi par ${servi ?? 'commit inconnu'} (${etat.json?.deployment ?? 'déploiement non identifié'}) après ${tours} vérification(s)`);
      break;
    }
    process.stdout.write(`\r  ancien build encore servi (${servi})…`);
  } else {
    process.stdout.write(`\r  santé ${etat.statut || 'injoignable'}…`);
  }
  await new Promise((r) => setTimeout(r, 5000));
}
process.stdout.write(' '.repeat(60) + '\r');

if (sha && servi !== sha && servi !== null) {
  console.error(`\nLe commit attendu n'est pas en ligne après ${attente} s (servi : ${servi}).`);
  console.error('Vérifier l' + 'état du déploiement avant de conclure quoi que ce soit.');
  process.exit(2);
}

const santeFinale = await sante(base);
if (santeFinale.statut !== 200) {
  console.error(`\n/api/health répond ${santeFinale.statut || 'rien'} : le serveur ne démarre pas.`);
  if (santeFinale.texte) console.error(`  ${santeFinale.texte}`);
  process.exit(1);
}

// ---- 2. sondage ---------------------------------------------------------
const bilan = await sonderTout(base);
for (const r of bilan.resultats) {
  const detail = r.classe === 'ok' ? r.taille : (r.detail ?? r.extrait ?? `statut ${r.statut}`);
  console.log(`${MARQUES[r.classe] ?? ' --   '} ${String(r.statut).padStart(3)}  ${r.chemin.padEnd(46)} ${detail}`);
}
console.log(`\n  ${resumer(bilan)}`);

// ---- 3. comparaison à l'état connu -------------------------------------
let precedent = {};
try {
  precedent = JSON.parse(readFileSync(cheminEtat, 'utf8'));
} catch {
  console.log(`\n  aucun état antérieur (${cheminEtat}) : celui-ci servira de référence`);
}

const regressions = [];
for (const r of bilan.resultats) {
  const avant = precedent[r.modele];
  const maintenant = GRAVITE[r.classe] ?? 4;
  if (avant !== undefined && maintenant >= 2 && maintenant > (GRAVITE[avant] ?? 0)) {
    regressions.push({ ...r, avant });
  }
}

if (regressions.length > 0) {
  console.error('\n— RÉGRESSION —');
  for (const r of regressions) {
    console.error(`  ${r.modele} : « ${r.avant} » → « ${r.classe} »`);
  }
  console.error('\nLa mise en ligne a cassé quelque chose qui marchait. Ne pas');
  console.error('laisser passer : revenir en arrière ou corriger avant tout.');
}

// Une erreur franche est bloquante, qu'elle soit nouvelle ou non : une API
// en 500 n'est jamais un état acceptable, même « déjà vu ».
const erreursFranches = bilan.erreurs;
if (erreursFranches.length > 0) {
  console.error('\n— ERREURS FRANCHES —');
  for (const e of erreursFranches) console.error(`  ${e.modele} : ${e.classe} ${e.extrait ?? e.detail ?? ''}`);
}

const bloquant = regressions.length > 0 || erreursFranches.length > 0;

if (!bloquant || majBase) {
  const etat = Object.fromEntries(bilan.resultats.map((r) => [r.modele, r.classe]));
  etat['__maj'] = new Date().toISOString();
  writeFileSync(cheminEtat, JSON.stringify(etat, null, 2) + '\n');
  console.log(`\n  état de référence écrit : ${cheminEtat}`);
} else {
  console.log(`\n  état de référence inchangé (${cheminEtat}) — une régression ne devient pas la norme`);
}

if (bilan.silences.length > 0) {
  console.log('\n  silences connus, à traiter hors déploiement :');
  for (const s of bilan.silences) console.log(`    ${s.modele}`);
}

process.exit(bloquant ? 1 : 0);
