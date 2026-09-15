/**
 * Estampillage du service worker (15/09/2026).
 * ============================================
 *
 * `public/sw.js` nommait son cache « kurla-shell-v1 » en dur. Ce nom ne
 * changeait jamais, donc le cache n'était jamais vidé : après une mise en
 * ligne, un téléphone qui avait déjà visité le site continuait de servir
 * l'application précédente — dont les fichiers n'existent plus sur le
 * serveur, ou qui ne connaît pas les adresses actuelles. Pages blanches pour
 * le visiteur, alors qu'un navigateur neuf affichait tout.
 *
 * On remplace donc le marqueur `__KURLA_BUILD__` par un identifiant de
 * construction. L'étape d'activation du service worker supprime les caches
 * qui ne portent pas le nom courant : chaque mise en ligne vide
 * d'elle-même celle d'avant.
 *
 * Le marqueur reste présent tel quel dans `public/sw.js` : si l'estampillage
 * ne tournait pas, le cache garderait un nom fixe — le comportement d'avant,
 * dégradé mais fonctionnel, plutôt qu'une panne. D'où l'échec explicite
 * ci-dessous : autant le dire pendant la compilation que le découvrir sur le
 * téléphone d'un visiteur.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const MARQUEUR = '__KURLA_BUILD__';

/** Un identifiant sûr : lettres, chiffres, point, tiret. Rien d'autre. */
export function nettoyer(identifiant: string): string {
  const propre = identifiant.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40);
  return propre.length > 0 ? propre : 'inconnu';
}

/** Remplace toutes les occurrences du marqueur. */
export function estampiller(source: string, identifiant: string): string {
  return source.split(MARQUEUR).join(nettoyer(identifiant));
}

/**
 * Identifiant de construction : le SHA court du dépôt quand il est
 * disponible (Vercel le fournit, sinon on interroge git), l'horodatage à
 * défaut — l'essentiel est qu'il change à chaque mise en ligne.
 */
export function identifiantDeConstruction(): string {
  const depuisVercel = (process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
  if (depuisVercel) return depuisVercel.slice(0, 12);
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (sha) return sha.slice(0, 12);
  } catch {
    /* dépôt absent (archive, copie partielle) : on retombe sur la date */
  }
  return Date.now().toString(36);
}

function main(): void {
  const cible = path.resolve(process.cwd(), 'dist', 'sw.js');
  if (!fs.existsSync(cible)) {
    console.error(`[sw] introuvable : ${cible} — le service worker ne sera pas estampillé.`);
    process.exit(1);
  }
  const source = fs.readFileSync(cible, 'utf-8');
  if (!source.includes(MARQUEUR)) {
    console.error(`[sw] le marqueur ${MARQUEUR} est absent de ${cible} : l'estampillage n'a rien à remplacer.`);
    process.exit(1);
  }
  const identifiant = identifiantDeConstruction();
  fs.writeFileSync(cible, estampiller(source, identifiant), 'utf-8');
  console.log(`[sw] cache estampillé : kurla-shell-${nettoyer(identifiant)}`);
}

/**
 * Le fichier sert de script et de bibliothèque : `main()` ne tourne que
 * lorsqu'il est lancé directement. Importé par le banc, il se contente
 * d'exposer les fonctions pures.
 */
function estLanceDirectement(): boolean {
  const argument = process.argv[1] || '';
  return /stampServiceWorker\.(ts|js)$/.test(argument);
}

if (estLanceDirectement()) {
  main();
}
