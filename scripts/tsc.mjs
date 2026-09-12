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
// Laissés de côté pour les autres processus de la machine.
const RESERVE = 120;
// De combien on remonte à chaque nouvel essai après un épuisement.
const MAJORATION = 256;

function limiteMemoire(majoration = 0) {
  const forcee = Number(process.env.KURLA_TSC_MEMORY);
  if (Number.isFinite(forcee) && forcee > 0) {
    return { valeur: Math.round(forcee), origine: 'KURLA_TSC_MEMORY' };
  }
  const totale = os.totalmem() / MO;
  const libre = os.freemem() / MO;
  // Une réserve FIXE, pas un pourcentage. Mesuré le 12/09/2026 : 85 % du
  // libre tombait à 1 111 Mo et faisait échouer la vérification, alors que
  // la machine annonçait encore 1 307 Mo de libres et que la même commande
  // passait à 1 172 Mo quelques heures plus tôt. Le projet avait grossi de
  // dix-huit commits ; la part réservée, elle, n'avait aucune raison de
  // grandir avec lui. Un pourcentage lie la marge au besoin, ce qui est
  // exactement l'inverse de ce qu'il faut.
  const disponible = Math.max(0, libre - RESERVE) + majoration;
  const souhaitee = Math.min(totale * 0.8, disponible);
  const bornee = Math.min(PLAFOND, Math.max(PLANCHER, Math.round(souhaitee)));
  return {
    valeur: bornee,
    origine: `${Math.round(libre)} Mo libres sur ${Math.round(totale)} Mo`,
  };
}
const totalMo = Math.round(os.totalmem() / MO);
const delai = Number(process.env.KURLA_TSC_TIMEOUT) > 0
  ? Number(process.env.KURLA_TSC_TIMEOUT)
  : GARDE_FOU_DEFAUT;

const args = [...process.argv.slice(2)];
if (!args.includes('--noEmit')) args.push('--noEmit');

// Le binaire LOCAL, pas `npx` : lancé dans un sous-processus, npx peut
// repartir résoudre TypeScript au lieu de prendre celui du projet — et
// l'appel réseau qu'il tente alors fait croire à un blocage de tsc.
const require = createRequire(import.meta.url);
const binaireTsc = require.resolve('typescript/bin/tsc');

function lancer(valeur, origine) {
  return new Promise((resoudre) => {
    console.log(`[tsc] --max-old-space-size=${valeur} (${origine})`);
    const enfant = spawn(process.execPath, [`--max-old-space-size=${valeur}`, binaireTsc, ...args], {
      stdio: 'inherit',
      env: process.env,
    });
    let termine = false;
    // Sans cette coupure, on attend vingt-cinq minutes avant de voir un
    // « code 124 » qui ne dit rien de la cause.
    const gardeFou = setTimeout(() => {
      if (termine) return;
      console.error(
        `\n[tsc] Aucun résultat après ${delai} s à ${valeur} Mo (machine : ${totalMo} Mo).\n` +
        `      Une limite trop haute ne fait pas échouer tsc : elle le fait\n` +
        `      tourner à vide. Réessayez plus bas ou forcez une valeur :\n` +
        `        KURLA_TSC_MEMORY=1024 npm run lint\n`
      );
      enfant.kill('SIGKILL');
      termine = true;
      resoudre({ code: 1, signal: null, delaiDepasse: true });
    }, delai * 1000);

    enfant.on('exit', (code, signal) => {
      termine = true;
      clearTimeout(gardeFou);
      resoudre({ code, signal, delaiDepasse: false });
    });
  });
}

/**
 * Un épuisement du tas n'est pas un verdict : c'est un essai trop bas.
 *
 * Le besoin de TypeScript grandit avec le projet, alors que la mémoire libre
 * d'une machine varie d'une minute à l'autre. Un calcul unique finit donc
 * toujours par se tromper dans un sens ou dans l'autre, et il se trompe au
 * pire moment — en fermant la suite après trois minutes de bancs verts, sur
 * une panne qui n'a rien à voir avec le code.
 *
 * On remonte donc d'un cran et on recommence, tant que la machine a
 * physiquement de quoi suivre. Deux essais suffisent : au-delà, ce n'est plus
 * un réglage, c'est une fuite de mémoire ou un projet devenu trop gros pour
 * la machine, et il vaut mieux le dire.
 */
const ESSAIS_MAX = 3;

async function principal() {
  let dernier = null;
  for (let essai = 0; essai < ESSAIS_MAX; essai += 1) {
    const { valeur, origine } = limiteMemoire(essai * MAJORATION);
    const resultat = await lancer(valeur, origine);
    dernier = { ...resultat, valeur, origine };

    if (resultat.code === 0) process.exit(0);
    if (resultat.delaiDepasse) process.exit(1);

    const epuise = resultat.code === 134 || resultat.signal === 'SIGABRT';
    if (!epuise) process.exit(resultat.code ?? 1);

    const marge = os.freemem() / MO - valeur;
    if (marge < MAJORATION) break;
    console.error(
      `\n[tsc] Mémoire insuffisante à ${valeur} Mo (${origine}) —` +
      ` il restait ${Math.round(marge)} Mo de marge.\n` +
      `      Nouvel essai à ${valeur + MAJORATION} Mo.\n`
    );
  }

  const { valeur, origine, code, signal } = dernier;
  console.error(
    `\n[tsc] Mémoire insuffisante : ${valeur} Mo n'ont pas suffi (${origine}),` +
    ` après ${ESSAIS_MAX} essais.\n` +
    `      Le projet a probablement grandi au-delà de ce que cette machine\n` +
    `      peut vérifier. Deux issues :\n` +
    `        KURLA_TSC_MEMORY=1792 npm run lint   (si la machine suit)\n` +
    `        réduire ce que tsconfig.json analyse, comme dist/ l'a déjà été\n`
  );
  process.exit(code === 134 || signal === 'SIGABRT' ? 1 : (code ?? 1));
}

await principal();
