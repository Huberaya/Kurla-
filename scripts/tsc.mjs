#!/usr/bin/env node
/**
 * Lance `tsc --noEmit` avec une limite de mémoire adaptée à la machine.
 *
 * Pourquoi ce fichier existe :
 *
 * `package.json` fixait `NODE_OPTIONS=--max-old-space-size=3072` — 3 Go —
 * en dur, sur une machine qui en a 2 Go. Le processus ne mourait pas
 * franchement : il s'épuisait. Mesuré ici, avant correction :
 *
 *   3 072 Mo → aucun résultat après 241 s (tué)
 *   1 400 Mo → 0 erreur en 100 s
 *   1 200 Mo → tué (SIGABRT) en 44 s
 *   1 024 Mo → tué (SIGABRT) en 26 s
 *
 * Comme la vérification des types ferme la suite, tout le monde voyait
 * « code 124 » après vingt minutes sans savoir que les 90 bancs étaient
 * passés et que seul `tsc` bloquait. On contournait à la main, chacun
 * de son côté, et les vrais échecs restaient invisibles.
 *
 * Deuxième cause, trouvée après la première : `tsconfig.json` n'excluait
 * aucun répertoire. Avec `allowJs`, `tsc` analysait donc les 118 fichiers
 * de `dist/` — son propre résultat de build, 9,2 Mo de JS groupé — en plus
 * des 537 fichiers du projet. D'où un besoin mémoire au ras de la machine :
 *
 *   dist/ analysé    → 655 fichiers, 169 s, ~1,4 Go de tas, blocage
 *   dist/ exclu      → 536 fichiers,  30 s, 1 024 Mo suffisent
 *
 * La limite se calcule donc sur la mémoire DISPONIBLE, pas sur la mémoire
 * totale : ce qui compte n'est pas la taille de la machine, c'est ce qui
 * reste quand les autres processus tournent.
 *
 * Mesures de référence (projet à fin 2025, ~536 fichiers) :
 *   1 024 Mo → 0 erreur en 29 s     896 Mo → SIGABRT
 *
 * Surcharges : `KURLA_TSC_MEMORY=2048 npm run lint`
 *              `KURLA_TSC_TIMEOUT=300 npm run lint` (garde-fou, 900 s par défaut)
 */

import { spawn } from 'node:child_process';
import os from 'node:os';
import { createRequire } from 'node:module';

const MO = 1024 * 1024;
// En dessous, TypeScript abandonne sur ce projet (mesuré : 896 Mo → SIGABRT).
const PLANCHER = 1024;
const PLAFOND = 4096;
const GARDE_FOU_DEFAUT = 900;

function limiteMemoire() {
  const forcee = Number(process.env.KURLA_TSC_MEMORY);
  if (Number.isFinite(forcee) && forcee > 0) {
    return { valeur: Math.round(forcee), origine: 'KURLA_TSC_MEMORY' };
  }
  const totale = os.totalmem() / MO;
  const libre = os.freemem() / MO;
  // On ne prend jamais plus que ce qui reste : une machine peut annoncer
  // 2 Go au total et n'en avoir plus que 1,3 Go de libre une fois les
  // autres processus lancés. Dépasser le disponible ne fait pas échouer
  // plus vite — le ramasse-miettes s'emballe et plus rien n'avance.
  const souhaitee = Math.min(totale * 0.75, libre * 0.85);
  const bornee = Math.min(PLAFOND, Math.max(PLANCHER, Math.round(souhaitee)));
  return {
    valeur: bornee,
    origine: `${Math.round(libre)} Mo libres sur ${Math.round(totale)} Mo`,
  };
}

const { valeur, origine } = limiteMemoire();
const totalMo = Math.round(os.totalmem() / MO);
const delai = Number(process.env.KURLA_TSC_TIMEOUT) > 0
  ? Number(process.env.KURLA_TSC_TIMEOUT)
  : GARDE_FOU_DEFAUT;

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

let termine = false;
const gardeFou = setTimeout(() => {
  if (termine) return;
  // Sans cette coupure, on attend vingt-cinq minutes avant de voir un
  // « code 124 » qui ne dit rien de la cause.
  console.error(
    `\n[tsc] Aucun résultat après ${delai} s à ${valeur} Mo (machine : ${totalMo} Mo).\n` +
    `      Une limite trop haute ne fait pas échouer tsc : elle le fait\n` +
    `      tourner à vide. Réessayez plus bas ou forcez une valeur :\n` +
    `        KURLA_TSC_MEMORY=1024 npm run lint\n`
  );
  enfant.kill('SIGKILL');
  termine = true;
  process.exit(1);
}, delai * 1000);

enfant.on('exit', (code, signal) => {
  termine = true;
  clearTimeout(gardeFou);
  // 134 = SIGABRT : V8 a épuisé le tas. Sans ce message, on ne lit qu'un
  // « Aborted » anonyme et on cherche la faute dans le code.
  if (code === 134 || signal === 'SIGABRT') {
    console.error(
      `\n[tsc] Mémoire insuffisante à ${valeur} Mo (${origine}).\n` +
      `      TypeScript a besoin d'environ 1 024 Mo sur ce projet.\n` +
      `      Réessayez avec : KURLA_TSC_MEMORY=1536 npm run lint\n`
    );
    process.exit(1);
  }
  process.exit(code ?? 0);
});
