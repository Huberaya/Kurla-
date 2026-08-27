/**
 * CHANTIER 7.2 — génère `sitemap.xml` et `robots.txt` dans `dist/`.
 *
 * Les deux fichiers sont dérivés de la même source que le rendu,
 * `src/lib/routeMeta.ts`. C'est le choix structurant : ajouter une route
 * publiable met à jour le sitemap sans toucher à rien d'autre, et une page
 * rendue privée disparaît du sitemap et entre dans les Disallow de robots.
 *
 * Exécuté au build par `tsx` (dépendance de développement, donc présente sur
 * Vercel). Aucun accès à la base n'est fait ici : les URLs d'entités
 * (produits, ingrédients, articles publiés) sont ajoutées par le sous-chantier
 * 7.4, quand les pages générées depuis le graphe existeront. Générer des URLs
 * vers des pages que rien ne sert serait un leurre pour le moteur — et la règle
 * de publiabilité (`isPublishableProduct`) vit dans un module de 6 000 lignes
 * qu'il faudrait importer ou dupliquer, créant exactement la divergence que ce
 * chantier cherche à supprimer.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { ROUTE_META, indexableRoutes } from '../src/lib/routeMeta';
import { fetchIngredientPages } from './seoEntities';
import type { EntityPage } from './seoEntities';

const SITE_URL = (
  process.env.SITEMAP_BASE_URL ||
  process.env.VITE_APP_URL ||
  'https://kurlabeauty.vercel.app'
).replace(/\/+$/, '');

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** URL canonique d'un motif, paramètres omis. */
function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '/' : path}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function urlBlock(loc: string, changefreq?: string, priority?: number, now?: string): string {
  const freq = changefreq ? `    <changefreq>${changefreq}</changefreq>\n` : '';
  const prio = priority !== undefined ? `    <priority>${priority.toFixed(1)}</priority>\n` : '';
  const lastmod = now ? `    <lastmod>${now}</lastmod>\n` : '';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${lastmod}${freq}${prio}  </url>`;
}

/**
 * Construit le sitemap. `extra` reçoit les pages d'entités lues dans la base
 * (ingrédients vérifiés) : elles n'existent que si la base répond, et le sitemap
 * reste valide sans elles.
 */
export function buildSitemap(extra: EntityPage[] = []): string {
  const now = todayIso();
  const urls = indexableRoutes()
    .filter(route => !route.path.includes(':'))
    .map(route => urlBlock(absoluteUrl(route.path), route.changefreq, route.priority, now));

  // Pages d'entités générées depuis le graphe (action 37, volet ingrédient).
  for (const page of extra) {
    urls.push(urlBlock(`${SITE_URL}${page.path}`, 'monthly', 0.7, now));
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Généré par scripts/generateSitemap.ts depuis src/lib/routeMeta.ts. Ne pas éditer. -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join('\n') +
    `\n</urlset>\n`
  );
}

/**
 * Motif Disallow pour une route non indexable.
 *
 * Un motif paramétré est réduit à son préfixe statique : `/diagnostic/resultat/:id`
 * devient `/diagnostic/resultat/`, ce qui bloque tout l'arbre sans toucher aux
 * autres diagnostics. Un motif exact est utilisé tel quel, le préfixe ne
 * correspondant à aucune route publique existante.
 */
export function disallowPattern(path: string): string {
  const idx = path.indexOf(':');
  if (idx === -1) return path;
  const prefix = path.slice(0, idx);
  return prefix.endsWith('/') ? prefix : `${prefix}/`;
}

export function buildRobots(): string {
  const privatePaths = ROUTE_META.filter(route => !route.indexable);
  const all = Array.from(
    new Set([
      '/api/',
      ...privatePaths.map(route => disallowPattern(route.path)),
    ])
  ).sort((a, b) => a.length - b.length || a.localeCompare(b));

  // Minimisation : robots.txt fait de la correspondance par préfixe, donc
  // `/account` couvre déjà `/account/shelf`. Garder les deux est du bruit qui
  // fait dépasser la limite de règles de certains moteurs ; on ne conserve que
  // le préfixe le plus court.
  const disallows: string[] = [];
  for (const pattern of all) {
    if (disallows.some(kept => pattern.startsWith(kept) && pattern !== kept)) continue;
    disallows.push(pattern);
  }
  disallows.sort();

  return (
    `# Généré par scripts/generateSitemap.ts depuis src/lib/routeMeta.ts. Ne pas éditer.\n` +
    `User-agent: *\n` +
    `Allow: /\n` +
    disallows.map(pattern => `Disallow: ${pattern}\n`).join('') +
    `\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
}

async function main(): Promise<void> {
  await mkdir('dist', { recursive: true });
  const entities = await fetchIngredientPages();
  const sitemap = buildSitemap(entities);
  const robots = buildRobots();
  await writeFile('dist/sitemap.xml', sitemap, 'utf8');
  await writeFile('dist/robots.txt', robots, 'utf8');

  const urlCount = (sitemap.match(/<loc>/g) || []).length;
  const disallowCount = (robots.match(/Disallow:/g) || []).length;
  console.log(
    `[SEO] sitemap.xml : ${urlCount} URLs (${urlCount - entities.length} statiques + ${entities.length} ingrédients) ` +
    `· robots.txt : ${disallowCount} Disallow. Base : ${SITE_URL}.`
  );
}

// Permet à la fois l'exécution directe (`tsx scripts/generateSitemap.ts`) et
// l'import pour les bancs de test.
if (process.argv[1] && process.argv[1].includes('generateSitemap')) {
  main().catch(error => {
    console.error('[FAIL] SEO — génération sitemap/robots :', error);
    process.exitCode = 1;
  });
}
