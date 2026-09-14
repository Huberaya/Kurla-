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
import { readFileSync } from 'node:fs';

/**
 * Ce que la machine peut réellement donner, pas ce qu'elle a de vacant.
 *
 * `os.freemem()` rapporte la mémoire strictement inutilisée ; sur Linux, une
 * part importante de la mémoire occupée est du cache de fichiers que le noyau
 * rend sur demande. Mesuré ici le 14/09/2026 : 1 123 Mo « libres » pour
 * 1 417 Mo « disponibles » — la vérification des types échouait sur une
 * machine qui avait en réalité 294 Mo de plus à donner, et le nouvel essai
 * était refusé faute de marge. `MemAvailable` est le chiffre que le noyau
 * publie précisément pour répondre à cette question.
 */
function memoireDisponibleMo() {
  try {
    const lignes = readFileSync('/proc/meminfo', 'utf8').split('\n');
    const ligne = lignes.find(candidate => candidate.startsWith('MemAvailable:'));
    const ko = Number(ligne?.split(/\s+/)[1]);
    if (Number.isFinite(ko) && ko > 0) return ko / 1024;
  } catch {
    // Pas de /proc/meminfo (macOS, Windows) : on retombe sur la mesure Node.
  }
  return os.freemem() / MO;
}

const MO = 1024 * 1024;
// En dessous, TypeScript abandonne sur ce projet (mesuré : 896 Mo → SIGABRT).
const PLANCHER = 1024;
const PLAFOND = 4096;
const GARDE_FOU_DEFAUT = 900;
// Laissés de côté pour les autres processus de la machine, au premier essai
// puis à chaque nouvel essai après un épuisement (table ci-dessous).
//
// Défaut trouvé le 14/09/2026 : la réserve était fixe, et la valeur du tas
// valait « disponible − réserve ». La marge restante valait donc toujours la
// réserve — 120 Mo — soit moins que le pas d'augmentation, 256 Mo. Le nouvel
// essai était refusé **par construction** : les trois essais n'en faisaient
// qu'un, et l'échec annonçait « après 3 essais » pour une seule tentative.
//
// L'escalade resserre donc la réserve au lieu d'ajouter au disponible :
// remonter au-delà de la mémoire physique ne rendrait pas service, le noyau
// n'ayant pas d'espace d'échange ici.
const RESERVES = [120, 80, 40];
// Réserve du dernier essai : on ne descend pas en dessous.
const RESERVE_MIN = 40;

function limiteMemoire(essai = 0) {
  const forcee = Number(process.env.KURLA_TSC_MEMORY);
  if (Number.isFinite(forcee) && forcee > 0) {
    return { valeur: Math.round(forcee), origine: 'KURLA_TSC_MEMORY' };
  }
  const reserve = RESERVES[essai] ?? RESERVE_MIN;
  const totale = os.totalmem() / MO;
  const libre = memoireDisponibleMo();
  // Une réserve FIXE, pas un pourcentage. Mesuré le 12/09/2026 : 85 % du
  // libre tombait à 1 111 Mo et faisait échouer la vérification, alors que
  // la machine annonçait encore 1 307 Mo de libres et que la même commande
  // passait à 1 172 Mo quelques heures plus tôt. Le projet avait grossi de
  // dix-huit commits ; la part réservée, elle, n'avait aucune raison de
  // grandir avec lui. Un pourcentage lie la marge au besoin, ce qui est
  // exactement l'inverse de ce qu'il faut.
  const disponible = Math.max(0, libre - reserve);
  const souhaitee = Math.min(totale * 0.8, disponible);
  const bornee = Math.min(PLAFOND, Math.max(PLANCHER, Math.round(souhaitee)));
  return {
    valeur: bornee,
    origine: `${Math.round(libre)} Mo disponibles sur ${Math.round(totale)} Mo`,
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
    const { valeur, origine } = limiteMemoire(essai);
    const resultat = await lancer(valeur, origine);
    dernier = { ...resultat, valeur, origine };

    if (resultat.code === 0) process.exit(0);
    if (resultat.delaiDepasse) process.exit(1);

    const epuise = resultat.code === 134 || resultat.signal === 'SIGABRT';
    if (!epuise) process.exit(resultat.code ?? 1);

    const suivante = limiteMemoire(essai + 1).valeur;
    if (suivante <= valeur) {
      console.error(
        `\n[tsc] Mémoire insuffisante à ${valeur} Mo, et la machine n'a pas` +
        ` de quoi monter plus haut (${Math.round(memoireDisponibleMo())} Mo disponibles).\n`
      );
      break;
    }
    console.error(
      `\n[tsc] Mémoire insuffisante à ${valeur} Mo (${origine}).\n` +
      `      Nouvel essai à ${suivante} Mo, en laissant` +
      ` ${Math.round(memoireDisponibleMo() - suivante)} Mo aux autres processus.\n`
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
