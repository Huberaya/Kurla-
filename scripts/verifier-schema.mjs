#!/usr/bin/env node
/**
 * VÉRIFICATION DU SCHÉMA — le code déployé et la base réelle
 * ==========================================================
 *
 * Pourquoi ce fichier existe :
 *
 * Vercel déploie à chaque pousse, automatiquement. Les migrations
 * Supabase, elles, s'appliquent à la main. Les deux avancent donc à des
 * rythmes différents, et rien ne signale l'écart : le code déployé peut
 * interroger une table que la base n'a pas.
 *
 * Mesuré le 12/09/2026 sur la production : `photo_ai_analyses` et
 * `push_subscriptions` étaient absentes, alors que le code en production
 * les requêtait. Aucune erreur visible : les notifications push sont
 * envoyées dans un `.catch` qui se contente d'une ligne de journal —
 * la fonctionnalité a l'air de marcher et n'envoie jamais rien.
 *
 * Ce script confronte trois sources :
 *
 *   1. les tables déclarées dans `supabase/migrations/*.sql` ;
 *   2. les tables réellement requêtées par le code (`.from('…')`) ;
 *   3. ce que la base de production expose.
 *
 * Emploi :
 *
 *   SUPABASE_URL=https://… SUPABASE_SECRET_KEY=sb_secret_… \
 *     node scripts/verifier-schema.mjs
 *
 * Codes : 0 conforme · 1 écart bloquant · 2 accès à la base non fourni ·
 *         3 usage incorrect.
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { tablesDeclarees, tablesRequetees, fichiers } from './lib/schema.mjs';

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const cle = process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || '';

const args = process.argv.slice(2);
const valeur = (nom, defaut = null) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const cheminEtat = valeur('--baseline', '.kurla-schema-production.json');

if (!url || !cle) {
  console.error('Accès à la base non fourni.');
  console.error('  SUPABASE_URL=https://… SUPABASE_SECRET_KEY=… node scripts/verifier-schema.mjs');
  console.error('\nLe schéma n’est donc PAS vérifié : ne pas conclure de ce silence');
  console.error('qu’il est conforme.');
  process.exit(2);
}

// ---- 1 et 2. déclarations et usages (logique partagée) ------------------
const declarees = tablesDeclarees();
const requetees = tablesRequetees();
const migrations = fichiers('supabase/migrations').filter((f) => f.endsWith('.sql'));

// ---- 3. ce que la base expose -------------------------------------------
/**
 * Une salve de requêtes parallèles produit des échecs transitoires :
 * `ai_knowledge_sources` a été déclarée manquante une fois, puis a répondu
 * 200 cinq fois de suite. Déclarer absent ce qui ne l'est pas est aussi
 * nuisible que de se taire — l'outil perd sa crédibilité.
 *
 * On distingue donc l'absence franche (l'API répond 404 : la table n'existe
 * pas) de l'incertitude (5xx, délai, réseau : on ne sait pas). L'absence
 * est un constat ; l'incertitude est signalée et ne bloque pas.
 */
async function presente(nom) {
  let dernier = 'inconnu';
  for (let essai = 1; essai <= 3; essai += 1) {
    try {
      const reponse = await fetch(`${url}/rest/v1/${nom}?select=*&limit=1`, {
        headers: { apikey: cle, Authorization: `Bearer ${cle}` },
        signal: AbortSignal.timeout(10000),
      });
      if (reponse.status === 200) return 'presente';
      if (reponse.status === 404 || reponse.status === 400) return 'absente';
      dernier = `statut ${reponse.status}`;
    } catch (erreur) {
      dernier = erreur?.name === 'TimeoutError' ? 'délai dépassé' : 'réseau';
    }
    if (essai < 3) await new Promise((r) => setTimeout(r, 300 * essai));
  }
  return `incertaine:${dernier}`;
}

const aVerifier = [...new Set([...declarees.keys(), ...requetees.keys()])].sort();
const manquantes = [];
const traitees = [];
const incertaines = [];
// Requêtes groupées : 130 tables en série, c'est deux minutes d'attente.
const LOT = 8;
for (let i = 0; i < aVerifier.length; i += LOT) {
  const lot = aVerifier.slice(i, i + LOT);
  const resultats = await Promise.all(lot.map(presente));
  lot.forEach((table, k) => {
    if (resultats[k] === 'presente') traitees.push(table);
    else if (resultats[k] === 'absente') manquantes.push(table);
    else incertaines.push({ table, cause: String(resultats[k]).split(':')[1] });
  });
  process.stdout.write(`\r  vérifié ${Math.min(i + LOT, aVerifier.length)}/${aVerifier.length}…`);
}
process.stdout.write(' '.repeat(40) + '\r');

console.log(`Schéma — ${url.replace(/^https:\/\//, '').split('.')[0]}`);
console.log(`  ${migrations.length} migrations · ${declarees.size} tables déclarées · ${requetees.size} requêtées par le code · ${traitees.length} présentes · ${manquantes.length} absente(s) · ${incertaines.length} incertaine(s)\n`);

if (incertaines.length > 0) {
  // Signalées, jamais comptées comme manquantes : on ne bloque pas sur ce
  // qu'on n'a pas réussi à mesurer.
  console.log('— réponse(s) non concluante(s), à revérifier —');
  for (const { table, cause } of incertaines) console.log(`  ${table} (${cause})`);
  console.log('');
}

if (manquantes.length === 0) {
  console.log('  aucune table manquante : le code déployé et la base sont d’accord.');
}

// Un écart n'a pas la même gravité selon qu'une migration existe ou non.
// Sans migration, c'est une requête écrite à la main sur une table que rien
// ne crée — probablement une vue ou une table oubliée, à vérifier, mais ce
// n'est pas une migration en attente.
const enAttente = [];
const orphelines = [];
for (const table of manquantes) {
  const migration = declarees.get(table);
  (migration ? enAttente : orphelines).push({ table, migration });
}

// Même philosophie que la vérification des endpoints : une migration en
// attente depuis longtemps est un constat, pas une régression. Seule une
// table **nouvellement** manquante bloque la mise en ligne — sinon
// l'alarme, toujours allumée, finit par ne plus être écoutée.
let connues = [];
try {
  connues = JSON.parse(readFileSync(cheminEtat, 'utf8')).manquantes ?? [];
} catch {
  connues = null; // aucun état antérieur : ce passage devient la référence
}
// Au premier passage, il n'y a rien à comparer : tout serait « nouveau » et
// l'outil bloquerait sans jamais établir de référence. On constate, on
// enregistre, et c'est le passage suivant qui jugera.
const nouvelles = connues === null
  ? []
  : enAttente.filter(({ table }) => !connues.includes(table));

if (enAttente.length > 0) {
  console.log(`\n— MIGRATION(S) NON APPLIQUÉE(S) — ${enAttente.length} table(s) absente(s) alors qu'une migration les déclare :`);
  for (const { table, migration } of enAttente) {
    const usage = requetees.get(table);
    console.log(`  ${table}`);
    console.log(`      migration : supabase/migrations/${migration}`);
    if (usage) console.log(`      requêtée par : ${usage}`);
  }
  console.log('\n  Le code déployé les interroge peut-être déjà. Appliquer la');
  console.log('  migration dans Supabase, ou retirer le code qui en dépend.');

  if (nouvelles.length > 0) {
    console.log(`\n  NOUVEAU(x) manque(s) par rapport à l'état connu : ${nouvelles.map((t) => t.table).join(', ')}`);
  } else if (connues) {
    console.log('\n  Écart déjà constaté : signalé, il ne bloque pas la mise en ligne.');
  }
}

if (orphelines.length > 0) {
  console.log(`\n— table(s) requêtée(s) sans migration déclarée — ${orphelines.length} :`);
  for (const { table } of orphelines) {
    console.log(`  ${table}  (premier usage : ${requetees.get(table) ?? 'aucun'})`);
  }
  console.log('\n  Vue, table créée hors migrations, ou requête qui ne peut pas');
  console.log('  aboutir. À vérifier — ce n’est pas une migration en attente.');
}

const bloquant = nouvelles.length > 0;

if (bloquant) {
  console.log(`\n  état de référence inchangé (${cheminEtat}) : un écart nouveau ne devient pas la norme`);
} else {
  writeFileSync(cheminEtat, JSON.stringify({
    maj: new Date().toISOString(),
    presentes: traitees.length,
    manquantes: manquantes,
  }, null, 2) + '\n');
  if (connues === null) {
    console.log(`\n  premier passage : cet état devient la référence (${cheminEtat})`);
  } else {
    console.log(`\n  état de référence mis à jour (${cheminEtat})`);
  }
}

process.exit(bloquant ? 1 : 0);
