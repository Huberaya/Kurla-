import { ROUTE_META } from './routeMeta';
import type { RouteMeta } from './routeMeta';

/**
 * CHANTIER 13 — TÊTE SEO DES PAGES DYNAMIQUES, ET IDEMPOTENCE DU PRÉRENDU.
 *
 * Deux défauts vérifiés avant d'écrire ce module :
 *
 *  1. **Le prérendu ajoutait ses balises sans retirer les précédentes.**
 *     `buildRouteHtml` remplaçait le titre et la description, puis *ajoutait*
 *     canonique, robots, Open Graph et JSON-LD. Relancé sur un `dist` non
 *     nettoyé, il produisait des pages portant **plusieurs canoniques**, la
 *     première pointant sur l'accueil — le signal exact qui fait déréférencer
 *     une page. Vérifié sur `dist/boutique/index.html` : 3 canoniques.
 *
 *  2. **Toute URL inconnue répondait 200** avec la coquille d'accueil
 *     (`/produit/ce-produit-n-existe-pas` → 200). Un soft 404 fait indexer du
 *     vide et dilue le crawl.
 *
 * Ces fonctions sont pures et sans dépendance à React ni au navigateur : le
 * banc les appelle directement, et le serveur comme le script de prérendu
 * utilisent exactement le même code.
 */

export interface SeoHeadInput {
  title: string;
  description: string;
  canonical: string;
  /** `noindex` pour ce qui ne doit pas être référencé — dont les 404. */
  indexable?: boolean;
  ogType?: 'website' | 'article' | 'product';
  ogLocale?: string;
  imageUrl?: string;
  alternates?: Array<{ hreflang: string; href: string }>;
  jsonLd?: unknown;
}

/** Échappe pour un attribut HTML. */
export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * JSON sûr pour un bloc `<script type="application/ld+json">`.
 *
 * `JSON.stringify` seul ne suffit pas : un `</script>` présent dans une donnée
 * fermerait le bloc et permettrait d'injecter du HTML. Échapper `<` en
 * `\u003c` reste du JSON valide et neutralise la sortie de balise.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * Retire toute balise SEO produite par ce module.
 *
 * C'est ce qui rend l'application **idempotente** : on peut relancer le
 * prérendu sur un `dist` déjà prérendu, ou injecter la tête d'une entité dans
 * une coquille qui porte déjà celle de l'accueil, sans jamais empiler deux
 * canoniques.
 */
export function stripSeoTags(html: string): string {
  return html
    .replace(/[ \t]*<link rel="canonical"[^>]*>\n?/g, '')
    .replace(/[ \t]*<link rel="alternate" hreflang="[^"]*"[^>]*>\n?/g, '')
    .replace(/[ \t]*<meta name="robots"[^>]*>\n?/g, '')
    .replace(/[ \t]*<meta property="og:[^"]*"[^>]*>\n?/g, '')
    .replace(/[ \t]*<meta name="twitter:[^"]*"[^>]*>\n?/g, '')
    .replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '');
}

/** Construit le bloc de balises — sans l'insérer. */
export function buildSeoHeadTags(input: SeoHeadInput): string {
  const indexable = input.indexable !== false;
  const ogType = input.ogType ?? 'website';
  const tags = [
    `<link rel="canonical" href="${escapeAttribute(input.canonical)}" />`,
    ...(input.alternates ?? []).map(alternate =>
      `<link rel="alternate" hreflang="${escapeAttribute(alternate.hreflang)}" href="${escapeAttribute(alternate.href)}" />`),
    `<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, nofollow'}" />`,
    `<meta property="og:site_name" content="KURLA Beauty" />`,
    `<meta property="og:locale" content="${escapeAttribute(input.ogLocale ?? 'fr_FR')}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:title" content="${escapeAttribute(input.title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(input.description)}" />`,
    `<meta property="og:url" content="${escapeAttribute(input.canonical)}" />`,
    input.imageUrl ? `<meta property="og:image" content="${escapeAttribute(input.imageUrl)}" />` : null,
    `<meta name="twitter:card" content="summary_large_image" />`,
    input.jsonLd
      ? `<script type="application/ld+json">${safeJsonLd(input.jsonLd)}</script>`
      : null
  ].filter(Boolean);
  return tags.join('\n    ');
}

/**
 * Applique une tête SEO à un document : retire l'ancienne, écrit le titre et la
 * description, insère le bloc. Idempotent par construction.
 */
export function applySeoHead(html: string, input: SeoHeadInput): string {
  let out = stripSeoTags(html);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttribute(input.title)}</title>`);
  out = out.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeAttribute(input.description)}" />`
  );
  return out.replace('</head>', `    ${buildSeoHeadTags(input)}\n  </head>`);
}

/** Amorce de contenu lisible sans JavaScript. */
export function buildContentSeed(title: string, description: string, extra?: string): string {
  return (
    `<main class="prerender-seed" style="min-height:60vh;display:flex;flex-direction:column;` +
    `align-items:center;justify-content:center;text-align:center;padding:2rem">` +
    `<h1>${escapeAttribute(title)}</h1><p style="max-width:38rem">${escapeAttribute(description)}</p>` +
    (extra ? `<p style="font-size:1.125rem;font-weight:600">${escapeAttribute(extra)}</p>` : '') +
    `</main>`
  );
}

/**
 * Remplace l'amorce de contenu du conteneur racine.
 *
 * Le remplacement est délibérément large : la coquille lue dans `dist` peut
 * déjà porter l'amorce d'une autre page (celle de l'accueil, écrite par le
 * prérendu). Sans cela, une fiche produit servie à un moteur sans JavaScript
 * afficherait le `<h1>` de l'accueil.
 */
export function applyContentSeed(html: string, title: string, description: string, extra?: string): string {
  const seed = buildContentSeed(title, description, extra);
  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${seed}</div>`);
}

export interface RouteMatch {
  meta: RouteMeta;
  params: Record<string, string>;
}

function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map(segment => (segment.startsWith(':') ? `([^/]+)` : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${source}/?$`);
}

/**
 * Reconnaît un chemin dans la table de routes.
 *
 * C'est ce qui permet de distinguer « cette URL n'existe pas » (404) de « cette
 * URL existe mais n'est pas prérendue » (200). Sans cette distinction, tout
 * chemin inconnu renvoyait la coquille d'accueil avec un statut 200.
 */
export function matchKnownRoute(pathname: string): RouteMatch | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const meta of ROUTE_META) {
    if (!meta.path.includes(':')) {
      const base = meta.path.length > 1 ? meta.path.replace(/\/+$/, '') : meta.path;
      if (base === clean) return { meta, params: {} };
      continue;
    }
    const regex = patternToRegExp(meta.path);
    const match = regex.exec(clean);
    if (!match) continue;
    const names = (meta.path.match(/:([A-Za-z0-9_]+)/g) ?? []).map(name => name.slice(1));
    const params: Record<string, string> = {};
    names.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1] ?? '');
    });
    return { meta, params };
  }
  return null;
}

/** Tête d'une page introuvable : non indexable, et sans canonique vers l'accueil. */
export function buildNotFoundHead(siteUrl: string, pathname: string): SeoHeadInput {
  return {
    title: 'Page introuvable | KURLA Beauty',
    description: 'Cette adresse ne correspond à aucune page de KURLA Beauty.',
    canonical: `${siteUrl}/404`,
    indexable: false,
    jsonLd: undefined
  };
}
