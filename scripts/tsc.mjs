#!/usr/bin/env node
/**
 * Lance `tsc --noEmit` avec une limite de mémoire adaptée à la machine.
 *
 * Pourquoi ce fichier existe :
 *
 * `package.json` fixait `NODE_OPTIONS=--max-old-space-size=3072` — 3 Go —
 * en dur. Sur une machine de 2 Go, la limite dépasse la mémoire physique :
 * le processus ne meurt pas franchement, il s'épuise. Mesuré ici :
 *
 *   3 072 Mo → aucun résultat après 241 s (tué)
 *   1 400 Mo → 0 erreur en 100 s
 *   1 200 Mo → tué (SIGABRT) en 44 s
 *   1 024 Mo → tué (SIGABRT) en 26 s
 *
 * Conséquence : `npm test` ne se terminait jamais. La vérification des types
 * est la DERNIÈRE étape de la suite, donc tout le monde voyait « code 124 »
 * après vingt minutes, sans savoir que les 70 bancs étaient passés et que
 * seul `tsc` bloquait. On contournait à la main, chacun de son côté.
 *
 * Le seuil utile est d'environ 70 % de la mémoire totale : au-dessus, le
 * système n'a plus de place pour le reste ; en dessous, TypeScript abandonne.
 *
 * Surcharge possible : `KURLA_TSC_MEMORY=2048 npm run lint`.
 */

import { spawn } from 'node:child_process';
import os from 'node:os';
import { createRequire } from 'node:module';

const MO = 1024 * 1024;
const PLANCHER = 1400;
const PLAFOND = 4096;

function limiteMemoire() {
  const forcee = Number(process.env.KURLA_TSC_MEMORY);
  if (Number.isFinite(forcee) && forcee > 0) {
    return { valeur: Math.round(forcee),origine: 'KURLA_TSC_MEMORY' };
  }
  const totale = os.totalmem() / MO;
  const calculee = Math.round(totale * 0.75);
  const bornee = Math.min(PLAFOND, Math.max(PLANCHER, calculee));
  return { valeur: bornee, origine: `${Math.round(totale)} Mo de mémoire totale` };
}

const { valeur, origine } = limiteMemoire();
const totalMo = Math.round(os.totalmem() / MO);

console.log(`[tsc] --max-old-space-size=${valeur} (${origine})`);

const args = [...process.argv.slice(2)];
if (!args.includes('--noEmit')) args.push('--noEmit');

// Le binaire LOCAL, pas `npx` : lancé dans un sous-processus, npx peut
// repartir résoudre TypeScript au lieu de prendre celui du projet — et
// l'appel réseau qu'il tente alors fait croire à un blocage de tsc.
const require = createRequire(import.meta.url);
const binaireTsc = require.resolve('typescript/bin/tsc');

const enfant = spawn(process.execPath, [`--max-old-space-size=${valeur}`, binaireTsc, ...args], {
  stdio: 'inherit',
  env: process.env,
});

enfant.on('exit', (code, signal) => {
  // 134 = SIGABRT : V8 a épuisé le tas. Sans ce message, on ne lit qu'un
  // « Aborted » anonyme et on cherche la faute dans le code.
  if (code === 134 || signal === 'SIGABRT') {
    console.error(
      `\n[tsc] Mémoire insuffisante à ${valeur} Mo (machine : ${totalMo} Mo).\n` +
      `      TypeScript a besoin d'environ 70 % de la mémoire totale.\n` +
      `      Réessayez avec : KURLA_TSC_MEMORY=2048 npm run lint\n`
    );
    process.exit(1);
  }
  process.exit(code ?? 0);
});
