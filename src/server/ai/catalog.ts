import { serverDb } from '../../lib/serverDb';
import { selectKnowledgeCards } from '../../lib/ai/knowledgeBase';
import { normalizeInciName } from '../../lib/ingredientGraph';

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
    // Les produits de démonstration / de test ne sont jamais exposés à l'IA :
    // elle ne doit pas recommander un article factice (ex. « Kit Démo »).
    .filter(product => {
      if (product.isDemo === true || product.demo === true) return false;
      const name = String(product.name || '');
      return !/(^|\s|[([])(démo|demo)(\s|$|[)\]])/i.test(name);
    })
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

/**
 * Retourne les fiches ingrédient VÉRIFIÉES de la base KURLA qui concernent la
 * question (mention d'un nom INCI ou d'un nom commun : « karité », « glycérine »,
 * « sodium lauryl sulfate »…). C'est l'ancre de transparence de l'assistante :
 * elle cite des fonctions et des restrictions réelles, jamais inventées.
 * Un ingrédient non résolu n'est pas deviné : il est simplement absent.
 */
export async function getRelevantIngredientFacts(query: string, limit = 6): Promise<Array<{
  inciName: string;
  commonNames: string[];
  functions: string[];
  family?: string;
  isFragrance: boolean;
  isAllergenRegulated: boolean;
  comedogenicityIndex: number | null;
  maxConcentrationEuPercent: number | null;
  verificationStatus: string;
  description?: string;
}>> {
  let catalog: any[] = [];
  try {
    catalog = await serverDb.getIngredientCatalog();
  } catch {
    return [];
  }
  if (!Array.isArray(catalog) || catalog.length === 0) return [];

  const q = normalizeInciName(query);
  const qTokens = new Set(q.split(' ').filter(t => t.length >= 4));

  const scored = catalog.map(ing => {
    let score = 0;
    const norm = (v: unknown) => normalizeInciName(v);
    const names = [norm(ing.inciName), ...(ing.commonNames || []).map(norm)];
    for (const name of names) {
      if (!name) continue;
      if (q === name) score += 10;                 // nom exact
      if (q.includes(name) && name.length >= 4) score += 6; // mention dans la question
      const nameTokens = name.split(' ');
      for (const t of qTokens) {
        if (nameTokens.includes(t)) score += 3;   // mot du nom présent
      }
    }
    return { ing, score };
  });

  return scored
    .filter(s => s.score > 0 && s.ing.verificationStatus !== 'not_provided')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ ing }) => ({
      inciName: ing.inciName,
      commonNames: (ing.commonNames || []).slice(0, 4),
      functions: (ing.functions || []).slice(0, 6),
      family: ing.family,
      isFragrance: Boolean(ing.isFragrance),
      isAllergenRegulated: Boolean(ing.isAllergenRegulated),
      comedogenicityIndex: ing.comedogenicityIndex ?? null,
      maxConcentrationEuPercent: ing.maxConcentrationEuPercent ?? null,
      verificationStatus: ing.verificationStatus,
      description: ing.description
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
