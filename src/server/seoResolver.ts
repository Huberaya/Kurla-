import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { serverDb } from '../lib/serverDb';
import { applyContentSeed, applySeoHead, matchKnownRoute } from '../lib/seoHead';
import type { SeoHeadInput } from '../lib/seoHead';

/**
 * CHANTIER 13 — RENDU DE LA COQUILLE POUR UNE URL DONNÉE.
 *
 * Avant ce module, le repli SPA renvoyait `index.html` avec un statut 200 pour
 * **n'importe quel** chemin. Vérifié en production :
 * `/produit/ce-produit-n-existe-pas` → 200, `/page-qui-n-existe-pas` → 200.
 * Un moteur indexe alors du vide, et le budget de crawl part en fumée.
 *
 * Trois cas, et trois réponses distinctes :
 *
 *  1. **Chemin inconnu** de la table de routes → **404**, tête `noindex`, pas de
 *     canonique pointant vers l'accueil.
 *  2. **Route dynamique dont l'entité existe** → 200 avec le titre, la
 *     description, la canonique, l'Open Graph et le JSON-LD de **cette entité**.
 *     Sans cela, une fiche produit servait la canonique de l'accueil : le signal
 *     exact qui la fait considérer comme un doublon.
 *  3. **Route connue mais non prérendue** (espace compte, tableaux de bord) →
 *     200 avec la coquille : ce sont de vraies pages, simplement privées.
 */

const SITE_URL = (
  process.env.SITEMAP_BASE_URL ||
  process.env.VITE_APP_URL ||
  'https://kurlabeauty.vercel.app'
).replace(/\/+$/, '');

let cachedShell: string | null = null;

async function readShell(distPath: string): Promise<string> {
  if (cachedShell !== null) return cachedShell;
  cachedShell = await readFile(path.join(distPath, 'index.html'), 'utf8');
  return cachedShell;
}

/** Uniquement pour les bancs : force la relecture de la coquille. */
export function resetShellCache(): void {
  cachedShell = null;
}

interface ResolvedEntity {
  title: string;
  description: string;
  jsonLd?: unknown;
  ogType?: SeoHeadInput['ogType'];
}

/**
 * Résout l'entité visée par une route dynamique.
 *
 * `undefined` = cette route dynamique n'est pas (encore) résolue côté serveur :
 * on sert la coquille sans inventer de contenu. `null` = l'entité n'existe pas :
 * 404.
 */
async function resolveEntity(
  routePath: string,
  params: Record<string, string>
): Promise<ResolvedEntity | null | undefined> {
  if (routePath === '/produit/:slug') {
    const products = await serverDb.getProducts({ publishedOnly: true }).catch(() => []);
    const product = products.find((item: any) => item.slug === params.slug || item.id === params.slug);
    if (!product) return null;
    return {
      title: `${product.name} | KURLA Beauty`,
      description: String(product.description || `${product.name} : composition, texture et besoins couverts.`).slice(0, 300),
      ogType: 'product',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || undefined,
        sku: product.id,
        brand: { '@type': 'Brand', name: product.brand || 'KURLA Beauty' }
      }
    };
  }

  if (routePath === '/ingredient/:ingredientId') {
    const ingredients = await serverDb.getIngredientCatalog().catch(() => []);
    const ingredient = ingredients.find((item: any) => item.id === params.ingredientId);
    if (!ingredient) return null;
    return {
      title: `${ingredient.inciName || ingredient.id} : fiche ingrédient | KURLA`,
      description: String(
        ingredient.description || `Ce que fait ${ingredient.inciName || ingredient.id}, pour quelles textures et quels besoins.`
      ).slice(0, 300),
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: ingredient.inciName || ingredient.id,
        description: ingredient.description || undefined,
        termCode: ingredient.id
      }
    };
  }

  if (routePath === '/journal/:slug') {
    const articles = await serverDb.getPublishedArticles().catch(() => []);
    const article = articles.find((item: any) => item.slug === params.slug);
    if (!article) return null;
    return {
      title: `${article.title} | Journal KURLA`,
      description: String(article.excerpt || article.description || article.title).slice(0, 300),
      ogType: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.excerpt || article.description || undefined,
        datePublished: article.publishedAt || undefined
      }
    };
  }

  return undefined;
}

export interface SpaRenderResult {
  status: number;
  html: string;
}

export async function renderSpaDocument(pathname: string, distPath: string): Promise<SpaRenderResult> {
  const shell = await readShell(distPath);
  const match = matchKnownRoute(pathname);

  // 1. Chemin inconnu : 404 franc, non indexable.
  if (!match) {
    const html = applySeoHead(shell, {
      title: 'Page introuvable | KURLA Beauty',
      description: 'Cette adresse ne correspond à aucune page de KURLA Beauty.',
      canonical: `${SITE_URL}/404`,
      indexable: false
    });
    return { status: 404, html: applyContentSeed(html, 'Page introuvable', 'Cette adresse ne correspond à aucune page de KURLA Beauty.') };
  }

  // 3. Route statique non prérendue (espace compte, tableaux de bord) : la
  //    coquille suffit, c'est une vraie page.
  if (!match.meta.path.includes(':')) {
    return { status: 200, html: shell };
  }

  const entity = await resolveEntity(match.meta.path, match.params);

  // Route dynamique non résolue côté serveur : on ne fabrique rien.
  if (entity === undefined) {
    return { status: 200, html: shell };
  }

  // 1bis. Route dynamique valide mais entité absente : 404, pas un soft 404.
  if (entity === null) {
    const html = applySeoHead(shell, {
      title: 'Page introuvable | KURLA Beauty',
      description: 'Cette adresse ne correspond à aucune page de KURLA Beauty.',
      canonical: `${SITE_URL}/404`,
      indexable: false
    });
    return { status: 404, html };
  }

  // 2. L'entité existe : elle a sa propre tête.
  const canonical = `${SITE_URL}${pathname.replace(/\/+$/, '') || '/'}`;
  const html = applySeoHead(shell, {
    title: entity.title,
    description: entity.description,
    canonical,
    indexable: true,
    ogType: entity.ogType ?? 'article',
    imageUrl: `${SITE_URL}/og-default.png`,
    jsonLd: entity.jsonLd
  });

  return { status: 200, html: applyContentSeed(html, entity.title, entity.description) };
}
