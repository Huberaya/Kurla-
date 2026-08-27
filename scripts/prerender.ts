/**
 * CHANTIER 7.3 — prérendu au build (action 8).
 *
 * Pour chaque route publique statique, on écrit `dist/<chemin>/index.html` :
 * la coquille construite par Vite, mais dont le `<head>` porte déjà les
 * métadonnées de la route (titre, description, canonique, Open Graph, robots,
 * JSON-LD) et dont le corps contient une amorce de contenu (<h1> + description).
 *
 * Pourquoi ce niveau, et pas un rendu React complet :
 *
 * 1. Nos pages lisent leurs données dans des `useEffect` au montage. Un
 *    `renderToString` n'exécute pas les effets : il produirait des squelettes de
 *    chargement, pas du contenu. Un vrai SSR de contenu exigerait de charger les
 *    données au build — c'est-à-dire de brancher le build sur Supabase et sur les
 *    pages générées du graphe, qui sont l'objet du sous-chantier 7.4.
 * 2. Ce prérendu utilise uniquement `routeMeta.ts` (données pures, aucun React,
 *    aucun navigateur). Il ne peut donc pas casser parce qu'une page touche
 *    `window` ou `localStorage` : c'est le point de fragilité qu'on évite.
 *
 * Ce que ça change réellement : un moteur qui n'exécute pas JavaScript reçoit
 * désormais, pour chaque route, un `<title>`, une description, un canonique et un
 * `<h1>` distincts — au lieu du titre unique d'`index.html`. C'est la condition
 * pour que 7.1 et 7.2 aient un effet mesurable.
 *
 * Le contenu amorce est remplacé dès le montage par React (`createRoot` vide le
 * conteneur). Si le JS échoue, l'amorce reste : c'est un filet, pas une page
 * parallèle.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ROUTE_META, indexableRoutes } from '../src/lib/routeMeta';
import type { RouteMeta } from '../src/lib/routeMeta';
import { EN_ROUTE_CONTENT, englishBasePaths, localizeRouteMeta } from '../src/lib/routeTranslations';
import { localizedPath, splitLocale, type Locale } from '../src/lib/i18n';
import { fetchIngredientPages } from './seoEntities';

const SITE_URL = (
  process.env.SITEMAP_BASE_URL ||
  process.env.VITE_APP_URL ||
  'https://kurlabeauty.vercel.app'
).replace(/\/+$/, '');

/**
 * Sérialise en JSON sûr pour un bloc `<script type="application/ld+json">`.
 *
 * `JSON.stringify` seul ne suffit pas : un `</script>` présent dans une donnée
 * fermerait le bloc et permettrait d'injecter du HTML. Échapper `<` en
 * `\\u003c` reste du JSON valide et neutralise la sortie de balise.
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function metaTag(property: string, content: string): string {
  return `<meta property="${property}" content="${escapeHtml(content)}" />`;
}

function nameTag(name: string, content: string): string {
  return `<meta name="${name}" content="${escapeHtml(content)}" />`;
}

/** `og:locale` au format Open Graph, aligné sur `useDocumentMeta`. */
const OG_LOCALE: Record<Locale, string> = { fr: 'fr_FR', en: 'en_GB' };

function alternateTags(alternates: { hreflang: string; href: string }[]): string[] {
  return alternates.map(alternate =>
    `<link rel="alternate" hreflang="${escapeHtml(alternate.hreflang)}" href="${escapeHtml(alternate.href)}" />`);
}

/**
 * Réécrit la coquille HTML pour une route donnée.
 *
 * Fonction pure : le banc l'appelle sur un gabarit en mémoire, sans toucher au
 * système de fichiers, donc on teste le code livré.
 */
/**
 * @param route  Métadonnées dans la langue servie. Pour une version anglaise,
 *               `path` est déjà préfixé (`/en/manifeste`) et le titre est anglais.
 * @param locale Locale de la page produite.
 */
export function buildRouteHtml(
  template: string,
  route: RouteMeta,
  siteUrl: string,
  locale: Locale = 'fr',
): string {
  const canonical = `${siteUrl}${route.path}`;
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);

  // Les alternates dépendent de l'existence d'une version anglaise, jamais de
  // la locale demandée : la page française d'une route traduite doit annoncer
  // son équivalent anglais, et inversement.
  const basePath = splitLocale(route.path).rest;
  const { alternates } = localizeRouteMeta(route, locale, basePath, siteUrl);

  let html = template;

  // La langue du document doit suivre le contenu servi.
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${locale}"`);

  // Titre unique par route.
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);

  // Description unique par route.
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${description}" />`
  );

  const headExtra = [
    `<link rel="canonical" href="${canonical}" />`,
    ...alternateTags(alternates),
    nameTag('robots', 'index, follow'),
    metaTag('og:site_name', 'KURLA Beauty'),
    metaTag('og:locale', OG_LOCALE[locale]),
    metaTag('og:type', route.path === '/' ? 'website' : 'article'),
    metaTag('og:title', route.title),
    metaTag('og:description', route.description),
    metaTag('og:url', canonical),
    metaTag('og:image', `${siteUrl}/og-default.png`),
    nameTag('twitter:card', 'summary_large_image'),
    `<script type="application/ld+json">${safeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: route.title,
      description: route.description,
      url: canonical,
      inLanguage: locale,
      isPartOf: { '@type': 'WebSite', name: 'KURLA Beauty', url: siteUrl },
    })}</script>`,
  ].join('\n    ');

  html = html.replace('</head>', `    ${headExtra}\n  </head>`);

  // Amorce de contenu : un <h1> et la description, pour qu'il y ait du texte
  // réel dans le HTML avant exécution du JavaScript.
  const seed =
    `<main class="prerender-seed" style="min-height:60vh;display:flex;flex-direction:column;` +
    `align-items:center;justify-content:center;text-align:center;padding:2rem">` +
    `<h1>${title}</h1><p style="max-width:38rem">${description}</p></main>`;
  html = html.replace('<div id="root"></div>', `<div id="root">${seed}</div>`);

  return html;
}

async function main(): Promise<void> {
  const template = await readFile('dist/index.html', 'utf8');
  const routes = indexableRoutes().filter(route => !route.path.includes(':'));

  let written = 0;
  for (const route of routes) {
    const html = buildRouteHtml(template, route, SITE_URL);
    const file = route.path === '/'
      ? 'dist/index.html'
      : join('dist', route.path.slice(1), 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, 'utf8');
    written += 1;
  }

  // Pages d'entités : les fiches ingrédient vérifiées, lues dans la base. Sans
  // base disponible, la liste est vide et rien n'est écrit (dégradation douce).
  const entities = await fetchIngredientPages();
  for (const page of entities) {
    const meta: RouteMeta = {
      path: page.path,
      title: page.title,
      description: page.description,
      indexable: true,
      changefreq: 'monthly',
      priority: 0.7,
    };
    const html = buildRouteHtml(template, meta, SITE_URL);
    const file = join('dist', page.path.replace(/^\//, ''), 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, 'utf8');
    written += 1;
  }

  // Versions anglaises : uniquement les routes réellement traduites. Publier
  // une page `/en/…` dont le corps resterait français serait un doublon de
  // langue — cf. la règle de routeTranslations.ts.
  let english = 0;
  for (const basePath of englishBasePaths()) {
    const base = indexableRoutes().find(route => route.path === basePath);
    if (!base || base.path.includes(':')) continue;
    const copy = EN_ROUTE_CONTENT[basePath];
    const meta: RouteMeta = {
      ...base,
      path: localizedPath(basePath, 'en'),
      title: copy.title,
      description: copy.description,
    };
    const html = buildRouteHtml(template, meta, SITE_URL, 'en');
    const file = join('dist', meta.path.slice(1), 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, 'utf8');
    written += 1;
    english += 1;
  }

  console.log(
    `[SEO] prérendu : ${written} pages (${routes.length} statiques + ${english} anglaises + ${entities.length} ingrédients) ` +
    `avec <head> et amorce de contenu. Base : ${SITE_URL}.`
  );
}

if (process.argv[1] && process.argv[1].includes('prerender')) {
  main().catch(error => {
    console.error('[FAIL] SEO — prérendu :', error);
    process.exitCode = 1;
  });
}

// Garde l'export de ROUTE_META disponible si un outil veut croiser les listes.
export { ROUTE_META };
