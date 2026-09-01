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

/**
 * Résout un nom (INCI ou nom commun) vers la fiche ingrédient vérifiée la plus
 * proche. Utilisé pour interpréter « sans parabènes », « sans sulfates »… et
 * pour rattacher les keyIngredients déclarées d'un produit aux fiches réelles.
 */
async function resolveIngredientFactsByName(names: string[]): Promise<Array<{ inciName: string; commonNames: string[]; functions: string[]; isAllergenRegulated: boolean; isFragrance: boolean; verificationStatus: string }>> {
  let catalog: any[] = [];
  try {
    catalog = await serverDb.getIngredientCatalog();
  } catch {
    return [];
  }
  const facts: Array<{ inciName: string; commonNames: string[]; functions: string[]; isAllergenRegulated: boolean; isFragrance: boolean; verificationStatus: string }> = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const q = normalizeInciName(raw);
    if (!q || q.length < 3) continue;
    const qTokens = new Set(q.split(' ').filter(t => t.length >= 4));
    let best: { ing: any; score: number } | null = null;
    for (const ing of catalog) {
      if (ing.verificationStatus === 'not_provided') continue;
      const candidates = [normalizeInciName(ing.inciName), ...(ing.commonNames || []).map((c: unknown) => normalizeInciName(c))];
      let score = 0;
      for (const name of candidates) {
        if (!name) continue;
        if (q === name) score = Math.max(score, 12);
        else if (q.includes(name) && name.length >= 4) score = Math.max(score, 7);
        else {
          const toks = name.split(' ');
          for (const t of qTokens) if (toks.includes(t)) score = Math.max(score, 4);
        }
      }
      if (score > 0 && (!best || score > best.score)) best = { ing, score };
    }
    if (best && best.score >= 7 && !seen.has(best.ing.inciName)) {
      seen.add(best.ing.inciName);
      facts.push({
        inciName: best.ing.inciName,
        commonNames: (best.ing.commonNames || []).slice(0, 3),
        functions: (best.ing.functions || []).slice(0, 4),
        isAllergenRegulated: Boolean(best.ing.isAllergenRegulated),
        isFragrance: Boolean(best.ing.isFragrance),
        verificationStatus: best.ing.verificationStatus
      });
    }
  }
  return facts;
}

// Déclencheurs « sans X » : un libellé réglementaire/familier → les tokens
// (INCI normalisé) qui signalent sa présence dans une liste d'ingrédients.
const AVOID_PATTERNS: Array<{ label: string; test: RegExp; markers: string[] }> = [
  { label: 'sulfates', test: /sans\s+sulfate|sulfate|sls|sles|tensioactif\s+agressif/i, markers: ['sulfate', 'lauryl', 'laureth', 'sls', 'sles'] },
  { label: 'parabènes', test: /parab[èe]ne/i, markers: ['paraben'] },
  { label: 'silicones', test: /silicone|dimethicone|methicone/i, markers: ['methicone', 'siloxane', 'silane'] },
  { label: 'huiles minérales / paraffine', test: /huile\s+min[ée]rale|paraffine|mineral\s+oil|vaseline/i, markers: ['paraffin', 'petrolatum', 'mineral oil', 'vaseline'] },
  { label: 'parfum / fragrances', test: /sans\s+parfum|sans\s+fragrance|sans\s+odeur|non\s+parfum/i, markers: ['parfum', 'fragrance', 'perfume'] },
  { label: 'protéines', test: /sans\s+prot[ée]ine|protein/i, markers: ['protein', 'hydrolyzed', 'keratin', 'collagen', 'wheat', 'soy'] },
  { label: 'alcool asséchant', test: /sans\s+alcool|alcohol/i, markers: ['alcohol denat', 'ethanol', 'isopropyl alcohol'] },
  { label: 'colorants', test: /colorant|dye|ci\s?\d{4,5}/i, markers: ['colorant', 'ci ', 'dye'] }
];

/**
 * Interprète les contraintes « sans X » / allergies de la question. Retourne les
 * exclusions détectées (libellé + tokens révélateurs) pour filtrer le catalogue
 * et signaler à l'IA les allergènes réglementés à éviter.
 */
export function detectIngredientAvoidance(query: string): { avoided: Array<{ label: string; markers: string[] }>; avoidRaw: string[] } {
  const text = String(query || '').toLocaleLowerCase('fr-FR');
  const avoided: Array<{ label: string; markers: string[] }> = [];
  const avoidRaw: string[] = [];
  // « sans X » explicites (mots composants après « sans » jusqu'à une ponctuation)
  const sansMatches = text.match(/sans\s+([a-zà-ÿ0-9 ,'-]{2,40})/g) || [];
  for (const m of sansMatches) {
    const tail = m.replace(/^sans\s+/, '').trim();
    if (tail) avoidRaw.push(tail);
  }
  for (const pat of AVOID_PATTERNS) {
    if (pat.test.test(text)) avoided.push({ label: pat.label, markers: pat.markers });
  }
  return { avoided, avoidRaw };
}

function productIngredientBlob(product: any): string {
  const parts = [
    ...(Array.isArray(product.ingredients) ? product.ingredients : []),
    ...(Array.isArray(product.keyIngredients) ? product.keyIngredients : []),
    ...(Array.isArray(product.inci) ? product.inci : []),
    ...(Array.isArray(product.allergens) ? product.allergens : [])
  ];
  return normalizeInciName(parts.join(' '));
}

/**
 * Retire du catalogue les produits qui contiennent un ingrédient explicitement
 * exclu par la personne (« sans sulfate », « sans parfum », allergie…). Le
 * filtrage se base sur la liste d'ingrédients déclarée, les allergènes et
 * l'indicateur containsFragrance ; il est prudent : un produit sans aucune liste
 * d'ingrédients n'est pas écarté (l'IA signalera l'incertitude).
 */
export function filterCatalogByAvoidance(catalog: AvailableCatalogEntry[], avoided: Array<{ label: string; markers: string[] }>, avoidRaw: string[]): { kept: AvailableCatalogEntry[]; excluded: Array<{ slug: string; reason: string }> } {
  if (avoided.length === 0 && avoidRaw.length === 0) return { kept: catalog, excluded: [] };
  const excluded: Array<{ slug: string; reason: string }> = [];
  const kept = catalog.filter(entry => {
    const p: any = entry.product || {};
    const blob = productIngredientBlob(p);
    const hasIngredientList = blob.length > 0;
    // Parfum : indicateur structuré faisant foi.
    const fragranceAvoided = avoided.some(a => a.label.startsWith('parfum'));
    if (fragranceAvoided && p.containsFragrance === true) {
      excluded.push({ slug: entry.slug, reason: 'contient un parfum/fragrance (demandé sans parfum)' });
      return false;
    }
    for (const a of avoided) {
      if (a.label.startsWith('parfum')) continue; // déjà traité
      if (hasIngredientList && a.markers.some(mk => blob.includes(normalizeInciName(mk)))) {
        excluded.push({ slug: entry.slug, reason: `contient des ${a.label}` });
        return false;
      }
    }
    for (const raw of avoidRaw) {
      const token = normalizeInciName(raw);
      if (token.length >= 4 && hasIngredientList && blob.includes(token)) {
        excluded.push({ slug: entry.slug, reason: `contient « ${raw.trim()} »` });
        return false;
      }
    }
    return true;
  });
  return { kept, excluded };
}

/**
 * Enrichit chaque produit du catalogue avec les fiches ingrédient VÉRIFIÉES qui
 * correspondent à ses keyIngredients déclarées. Permet à l'IA de citer, pour un
 * produit recommandé, de vrais ingrédients INCI + leur fonction (transparence),
 * sans jamais inventer une composition.
 */
export async function enrichCatalogWithIngredientFacts(catalog: AvailableCatalogEntry[]): Promise<Map<string, Array<{ inciName: string; functions: string[]; isAllergenRegulated: boolean; verificationStatus: string }>>> {
  const bySlug = new Map<string, Array<{ inciName: string; functions: string[]; isAllergenRegulated: boolean; verificationStatus: string }>>();
  // Limite le nombre de résolutions pour rester léger (les produits du catalogue
  // transmis au modèle sont déjà filtrés par besoin/profil).
  for (const entry of catalog.slice(0, 12)) {
    const declared = Array.from(new Set([
      ...(Array.isArray(entry.keyIngredients) ? entry.keyIngredients : []),
      ...(Array.isArray((entry.product as any)?.ingredients) ? (entry.product as any).ingredients : [])
    ].filter((v): v is string => typeof v === 'string'))).slice(0, 6);
    if (declared.length === 0) continue;
    const facts = await resolveIngredientFactsByName(declared);
    if (facts.length > 0) {
      bySlug.set(entry.slug, facts.map(f => ({ inciName: f.inciName, functions: f.functions, isAllergenRegulated: f.isAllergenRegulated, verificationStatus: f.verificationStatus })));
    }
  }
  return bySlug;
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
