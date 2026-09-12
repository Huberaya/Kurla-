/**
 * CHANTIER 7.3 — prérendu au build (action 8).
 *
 * Pour chaque route publique statique, on écrit `dist/<chemin>/index.html` :
 * la coquille construite par Vite, mais dont le `<head>` porte déjà les
 * métadonnées de la route (titre, description, canonique, Open Graph, robots,
 * JSON-LD) et dont le corps contient une amorce de contenu (<h1> + description).
 *
 * Le corps est rendu avec `renderToPipeableStream` et attend `onAllReady` : les
 * routes lazy sont donc résolues avant l'écriture, au lieu de laisser un
 * fallback Suspense ou une simple amorce `<h1>`. Les données publiques déjà
 * lues pour une fiche produit sont injectées dans un contexte serveur minimal ;
 * les routes privées sans session ne reçoivent jamais de données inventées.
 *
 * Les composants qui exigent encore une API navigateur pendant leur rendu sont
 * conservés avec une amorce explicite et signalés dans la sortie du build. Cela
 * permet une migration progressive sans transformer un échec SSR en page vide.
 * Le client reste compatible avec `createRoot` : il reprend la navigation dès
 * que le bundle est chargé.
 *
 * Ce que ça change réellement : un moteur qui n'exécute pas JavaScript reçoit
 * le corps React complet des pages rendables, avec un `<title>`, une description,
 * un canonique, un JSON-LD et un `<h1>` distincts — au lieu d'un simple seed.
 */
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ROUTE_META } from '../src/lib/routeMeta';
import type { RouteMeta } from '../src/lib/routeMeta';
import { EN_ROUTE_CONTENT, englishBasePaths, localizeRouteMeta } from '../src/lib/routeTranslations';
import { localizedPath, splitLocale, type Locale } from '../src/lib/i18n';
import { buildNeedTexturePages } from '../src/lib/needTexturePages';
import { fetchIngredientPages, fetchProductPages } from './seoEntities';
import type { EntityPage } from './seoEntities';
import { applyContentSeed, applySeoHead } from '../src/lib/seoHead';
import App from '../src/App';

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
  entity?: { jsonLd?: unknown; ogType?: 'website' | 'article' | 'product'; imageUrl?: string; priceLabel?: string },
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

  /**
   * CHANTIER 13 — la tête est appliquée, pas empilée.
   *
   * `applySeoHead` retire d'abord les balises SEO présentes, puis écrit les
   * siennes. Sans cela, relancer le prérendu sur un `dist` non nettoyé produisait
   * des pages à plusieurs canoniques, la première pointant sur l'accueil —
   * vérifié sur `dist/boutique/index.html` (3 canoniques) avant correction.
   */
  //
  // Une fiche produit annonce un `Product` — avec son prix et sa disponibilité
  // — et non une `WebPage` générique. Sans `offers`, aucun moteur ne peut
  // afficher de résultat enrichi (prix, disponibilité) ni alimenter une
  // comparaison shopping : la page la plus commerciale du site était, pour
  // l'index, une page comme une autre.
  const jsonLd = entity?.jsonLd ?? {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: route.title,
    description: route.description,
    url: canonical,
    inLanguage: locale,
    isPartOf: { '@type': 'WebSite', name: 'KURLA Beauty', url: siteUrl }
  };

  html = applySeoHead(html, {
    title: route.title,
    description: route.description,
    canonical,
    /**
     * `indexable: false` veut dire « ne pas référencer », PAS « ne pas produire
     * de fichier ». Codé à `true`, ce drapeau faisait écrire un `index, follow`
     * sur des pages qui n'étaient de toute façon jamais générées — voir main().
     */
    indexable: route.indexable !== false,
    ogType: entity?.ogType ?? (route.path === '/' ? 'website' : 'article'),
    ogLocale: OG_LOCALE[locale],
    imageUrl: entity?.imageUrl || `${siteUrl}/og-default.png`,
    alternates,
    jsonLd
  });

  // Amorce de contenu : un <h1> et la description, pour qu'il y ait du texte
  // réel dans le HTML avant exécution du JavaScript.
  html = applyContentSeed(html, route.title, route.description, entity?.priceLabel);

  return html;
}

interface SsrContext {
  pathname: string;
  search: string;
  initialProduct?: any;
  initialProducts?: any[];
}

/**
 * Rendu React serveur du corps complet, y compris les composants lazy.
 *
 * `renderToPipeableStream` est utilisé plutôt que `renderToString` : ce dernier
 * remplace chaque Suspense par son fallback et reproduisait donc la coquille de
 * chargement sur les pages publiques. `onAllReady` attend les chunks lazy avant
 * d'écrire le conteneur racine.
 */
async function renderReactBody(context: SsrContext): Promise<string> {
  (globalThis as typeof globalThis & { __KURLA_SSR_CONTEXT?: SsrContext }).__KURLA_SSR_CONTEXT = context;
  let html = '';
  let stream: ReturnType<typeof renderToPipeableStream> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    html = await new Promise<string>((resolve, reject) => {
      const writable = new Writable({
        write(chunk, _encoding, callback) {
          html += chunk.toString();
          callback();
        }
      });
      writable.once('finish', () => resolve(html));
      stream = renderToPipeableStream(React.createElement(App), {
        onAllReady() { stream?.pipe(writable); },
        onShellError(error) { reject(error); },
        onError(error) { console.error(`[SSR] ${context.pathname}:`, error instanceof Error ? error.message : String(error)); }
      });
      timer = setTimeout(() => {
        stream?.abort();
        reject(new Error(`SSR timeout for ${context.pathname}`));
      }, 15_000);
    });
    return html;
  } finally {
    if (timer) clearTimeout(timer);
    delete (globalThis as typeof globalThis & { __KURLA_SSR_CONTEXT?: SsrContext }).__KURLA_SSR_CONTEXT;
  }
}

function applyReactBody(html: string, body: string): string {
  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${body}</div>`);
}

async function main(): Promise<void> {
  const template = await readFile('dist/index.html', 'utf8');
  /**
   * TOUTES les routes, pas seulement les indexables.
   *
   * `vercel.json` réécrit `/(.*)` vers `/api` : une URL ne répond que si un
   * fichier prérendu existe. Filtrer sur `indexable` laissait donc 24 routes
   * sans fichier — dont `/admin` et `/account`. Mesuré en production :
   * `/admin`, `/account` et `/admin/texture-gap` renvoyaient
   * `404 {"code":"API_ROUTE_NOT_FOUND"}`, et le lien « Administration KURLA »
   * de la barre de navigation est un `<a href>` (navigation complète), donc le
   * tableau de bord était inaccessible même depuis l'interface.
   *
   * Le sitemap, lui, reste filtré sur les routes indexables : c'est le rôle de
   * `generateSitemap.ts`, pas du prérendu.
   */
  const routes = ROUTE_META.filter(route => !route.path.includes(':'));

  let written = 0;
  for (const route of routes) {
    let html = buildRouteHtml(template, route, SITE_URL);
    try {
      const body = await renderReactBody({ pathname: route.path, search: '' });
      html = applyReactBody(html, body);
    } catch (error) {
      // Une page privée ou un composant encore navigateur-dépendant ne doit
      // pas supprimer son fichier HTML : on conserve le seed explicite et le
      // build signale la route à corriger au lieu d'inventer son contenu.
      console.error(`[SSR] seed conservé pour ${route.path}:`, error instanceof Error ? error.message : String(error));
    }
    const file = route.path === '/'
      ? 'dist/index.html'
      : join('dist', route.path.slice(1), 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, 'utf8');
    written += 1;
  }

  // Pages d'entités : les fiches ingrédient vérifiées, lues dans la base. Sans
  // base disponible, la liste est vide et rien n'est écrit (dégradation douce).
  const needTextureEntities = buildNeedTexturePages().map(page => ({
    path: page.path,
    title: page.title,
    description: page.description,
    ogType: 'article' as const
  }));
  const entities = [
    ...needTextureEntities,
    ...(await fetchIngredientPages()),
    ...(await fetchProductPages())
  ];
  for (const page of entities) {
    const meta: RouteMeta = {
      path: page.path,
      title: page.title,
      description: page.description,
      indexable: true,
      changefreq: 'monthly',
      priority: 0.7,
    };
    let html = buildRouteHtml(template, meta, SITE_URL, 'fr', page);
    try {
      const body = await renderReactBody({ pathname: page.path, search: '', initialProduct: (page as EntityPage).initialProduct });
      html = applyReactBody(html, body);
    } catch (error) {
      console.error(`[SSR] seed conservé pour ${page.path}:`, error instanceof Error ? error.message : String(error));
    }
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
    // Même règle que ci-dessus : une route traduite non indexable a elle aussi
    // besoin de son fichier, sinon `/en/…` retombe sur l'API.
    const base = ROUTE_META.find(route => route.path === basePath);
    if (!base || base.path.includes(':')) continue;
    const copy = EN_ROUTE_CONTENT[basePath];
    const meta: RouteMeta = {
      ...base,
      path: localizedPath(basePath, 'en'),
      title: copy.title,
      description: copy.description,
    };
    let html = buildRouteHtml(template, meta, SITE_URL, 'en');
    try {
      const body = await renderReactBody({ pathname: meta.path, search: '' });
      html = applyReactBody(html, body);
    } catch (error) {
      console.error(`[SSR] seed conservé pour ${meta.path}:`, error instanceof Error ? error.message : String(error));
    }
    const file = join('dist', meta.path.slice(1), 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, 'utf8');
    written += 1;
    english += 1;
  }

  console.log(
    `[SEO] prérendu : ${written} pages (${routes.length} statiques + ${english} anglaises + ${needTextureEntities.length} besoin×texture + ${entities.length - needTextureEntities.length} ingrédients/produits) ` +
    `avec <head> et corps React SSR (fallback seed uniquement si signalé). Base : ${SITE_URL}.`
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
