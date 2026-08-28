import { serverDb } from '../../lib/serverDb';
import { selectKnowledgeCards } from '../../lib/ai/knowledgeBase';

/**
 * CHANTIER 8.1 — catalogue exposé à l'assistant, extrait de `server.ts`.
 */
// Real Available Catalog helper for AI Assistant.
// The model receives only entries that are in stock and allowed in the user's
// country. It never receives a product name without its exact catalog slug.
export type AvailableCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  link: string;
  category: string;
  description: string;
  needs: string[];
  keyIngredients: string[];
  notIdealIf: string;
  product: any;
};

export const SUPPORTED_AI_LOCALES = new Set(['fr', 'en', 'es', 'pt']);

export async function getAvailableCatalog(country = 'FR'): Promise<AvailableCatalogEntry[]> {
  const normalizedCountry = country.trim().toUpperCase();
  const products = await serverDb.getProducts({ publishedOnly: true });
  return products
    .filter(product => product.inStock)
    .filter(product => !product.countryAvailability?.length || product.countryAvailability.includes(normalizedCountry) || product.countryAvailability.includes('INT'))
    .map(product => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: product.price,
      link: `/produit/${product.slug}`,
      category: product.category,
      description: product.description,
      needs: product.needs || [],
      keyIngredients: product.keyIngredients || [],
      notIdealIf: product.notIdealIf,
      product
    }));
}

export async function selectOperationalKnowledgeCards(query: string, domains: string[] = []): Promise<any[]> {
  const staticCards = selectKnowledgeCards(query, domains);
  const terms = `${query} ${domains.join(' ')}`.toLocaleLowerCase('fr-FR');
  const persistedSources = await serverDb.getActiveAiKnowledgeSources();
  const persistedCards = persistedSources
    .filter(source => Array.isArray(source.domains) && source.domains.some((domain: string) => terms.includes(domain.toLocaleLowerCase('fr-FR'))))
    .map(source => ({
      id: source.id,
      title: source.title,
      domains: source.domains,
      content: source.content,
      sourceLabel: source.sourceLabel,
      status: 'validated',
      evidenceUrl: source.evidenceUrl
    }));
  return [...persistedCards, ...staticCards.filter(card => !persistedCards.some(source => source.id === card.id))].slice(0, 5);
}
