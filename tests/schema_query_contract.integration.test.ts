/**
 * CONTRAT DE SCHEMA — rejoue contre la base reelle chaque requete `select`
 * ecrite dans le code source.
 *
 * Pourquoi ce banc existe : trois defauts ont ete trouves ainsi, tous invisibles
 * a la compilation comme aux bancs en memoire —
 *   - `user_archetypes.id` n'existe pas (42703, colonne absente) ;
 *   - `returns.product_id` n'existe pas (42703, colonne absente) ;
 *   - `reviews` n'a aucune cle etrangere vers `user_archetypes`, donc
 *     l'imbrication `reviews(user_archetypes(...))` est refusee par PostgREST
 *     (PGRST200) alors que le chemin reel passe par `profiles`.
 *
 * `tsc` ne voit rien de tout cela : les noms de tables, de colonnes et les
 * imbrications sont des chaines de caracteres. Un store en memoire non plus,
 * puisqu'il ne connait pas le schema. Ce banc est le seul filet, et il doit
 * rester dans `test:realdb`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getSupabaseServerClient, describeStoreBinding } from '../src/lib/supabaseClient';

interface QuerySite {
  table: string;
  select: string;
  origin: string;
}

/** `.from('table')` suivi, eventuellement apres un retour a la ligne, de `.select('...')`. */
const FROM_SELECT = /\.from\('([a-z_0-9]+)'\)\s*\.select\(\s*'([^'$]*)'/g;

function collectSourceFiles(root: string, extra: string[]): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const info = statSync(full);
      if (info.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) found.push(full);
    }
  };
  walk(root);
  return [...found, ...extra];
}

function collectQuerySites(): QuerySite[] {
  const files = collectSourceFiles('src', ['server.ts']);
  const sites: QuerySite[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    FROM_SELECT.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FROM_SELECT.exec(source)) !== null) {
      const line = source.slice(0, match.index).split('\n').length;
      sites.push({ table: match[1], select: match[2], origin: `${file}:${line}` });
    }
  }
  return sites;
}

async function main() {
  const binding = describeStoreBinding();
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error(
      '[FAIL] Contrat de schéma : aucune liaison Supabase serveur. ' +
      `mode=${binding.mode} — ce banc n'a de sens que contre la base réelle.`
    );
    process.exit(1);
  }

  const sites = collectQuerySites();
  if (sites.length === 0) {
    console.error('[FAIL] Contrat de schéma : aucune requête extraite. Le motif de recherche a dérivé.');
    process.exit(1);
  }

  // Une même requête peut apparaître plusieurs fois ; une seule exécution suffit.
  const distinct = new Map<string, QuerySite>();
  for (const site of sites) {
    const key = `${site.table}\u0000${site.select}`;
    if (!distinct.has(key)) distinct.set(key, site);
  }

  const failures: string[] = [];
  for (const site of distinct.values()) {
    const { error } = await supabase.from(site.table).select(site.select).limit(1);
    if (error) {
      failures.push(
        `  ${site.table}  <- ${site.origin}\n` +
        `      select : ${site.select}\n` +
        `      erreur : ${error.code || ''} ${error.message}`
      );
    }
  }

  if (failures.length > 0) {
    console.error(
      `[FAIL] Contrat de schéma : ${failures.length} requête(s) refusée(s) par la base ` +
      `sur ${distinct.size} distinctes (${sites.length} sites dans le code).\n\n` +
      failures.join('\n')
    );
    process.exit(1);
  }

  console.log(
    `[PASS] Contrat de schéma : ${distinct.size} requêtes distinctes ` +
    `(${sites.length} sites) acceptées par la base réelle.`
  );
  process.exit(0);
}

void main();
