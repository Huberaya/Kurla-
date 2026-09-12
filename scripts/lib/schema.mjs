/**
 * Lecture du schéma déclaré : migrations SQL et requêtes du code.
 *
 * Partagé par `scripts/verifier-schema.mjs` (compare à la base réelle) et
 * par le banc `tests/kurla_schema_declare.test.ts` (contrôle statique),
 * pour que les deux ne divergent pas.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function fichiers(chemin) {
  const absolu = join(RACINE, chemin);
  let etat;
  try { etat = statSync(absolu); } catch { return []; }
  if (etat.isFile()) return [absolu];
  return readdirSync(absolu).flatMap((e) => fichiers(join(chemin, e)));
}

export const MOTIF_TABLE = /create\s+table\s+(?:if\s+not\s+exists\b\s*)?(?:only\s+)?(?:public\s*\.\s*)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;

/**
 * Le code interroge aussi des vues — `batch_order_trace` et
 * `professional_dossier_access` sont des vues, pas des tables. Les ignorer
 * les faisait passer pour des requêtes sans déclaration.
 */
export const MOTIF_VUE = /create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\b\s*)?(?:public\s*\.\s*)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;

/**
 * Les commentaires SQL parlent de DDL sans en être : « son `CREATE TABLE IF
 * NOT EXISTS` saute donc la création » a fait déclarer une table « IF », et
 * « not CREATE TABLE IF NOT EXISTS only: » une table « only ». On les
 * retire avant toute analyse — c'est ainsi qu'on lit du SQL, jamais avec
 * des expressions régulières appliquées au texte brut.
 */
export function sansCommentaires(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** nom -> { fichier, genre } pour tout objet déclaré par une migration */
export function objetsDeclares() {
  const declarees = new Map();
  for (const fichier of fichiers('supabase/migrations').filter((f) => f.endsWith('.sql'))) {
    const source = sansCommentaires(readFileSync(fichier, 'utf8'));
    for (const [, nom] of source.matchAll(MOTIF_TABLE)) {
      if (!declarees.has(nom)) declarees.set(nom, { fichier: fichier.split('/').pop(), genre: 'table' });
    }
    for (const [, nom] of source.matchAll(MOTIF_VUE)) {
      if (!declarees.has(nom)) declarees.set(nom, { fichier: fichier.split('/').pop(), genre: 'vue' });
    }
  }
  return declarees;
}

/** table -> nom du fichier de migration qui la déclare */
export function tablesDeclarees() {
  return new Map([...objetsDeclares()]
    .filter(([, v]) => v.genre === 'table')
    .map(([k, v]) => [k, v.fichier]));
}

export const MOTIF_REQUETE = /\.from\(\s*['"`]([a-z_][a-z0-9_]*)['"`]\s*\)/g;

/** table -> premier fichier qui la requête */
export function tablesRequetees() {
  const requetees = new Map();
  for (const fichier of [...fichiers('src'), join(RACINE, 'server.ts')]) {
    if (!/\.tsx?$/.test(fichier)) continue;
    let source;
    try { source = readFileSync(fichier, 'utf8'); } catch { continue; }
    for (const [, table] of source.matchAll(MOTIF_REQUETE)) {
      if (!requetees.has(table)) requetees.set(table, fichier.replace(RACINE, ''));
    }
  }
  return requetees;
}
