/**
 * CHANTIER 5 — Recherche sémantique.
 *
 * « Je veux une routine cheveux crépus secs pour moins de 50 €. »
 *
 * L'objectif n'est pas un moteur de recherche vectoriel — c'est démesuré pour
 * ce besoin et non explicable. C'est un parseur d'intention qui extrait des
 * contraintes nommées, et qui dit explicitement ce qu'il n'a pas compris.
 * Une contrainte mal comprise doit être signalée, pas devinée.
 */

export interface SearchIntent {
  rawQuery: string;
  /** Besoins détectés, alignés sur la taxonomie `needs` des produits. */
  needs: string[];
  textures: string[];
  toneDepths: string[];
  steps: string[];
  categories: string[];
  budget: { maxPerItem?: number; maxTotal?: number; currency: string } | null;
  wantsRoutine: boolean;
  excludesFragrance: boolean;
  /** Ce que le parseur n'a pas su interpréter. Jamais silently ignoré. */
  unresolved: string[];
}

const BUDGET_PER_ITEM = /(?:moins de|sous|under|max(?:imum)?|budget|<)\s*(\d+(?:[.,]\d+)?)\s*(?:€|euros?|eur)/i;
const BUDGET_TOTAL = /(\d+(?:[.,]\d+)?)\s*(?:€|euros?|eur)\s*(?:au total|en tout|total|pour tout)/i;
const PRICE_TOKEN = /(\d+(?:[.,]\d+)?)\s*(?:€|euros?|eur)/i;

const NEED_LEXICON: { need: string; terms: string[] }[] = [
  { need: 'hydrater_cheveux', terms: ['hydrat', 'sec', 'sèche', 'seche', 'déshydrat', 'deshydrat', 'moisture', 'dry'] },
  { need: 'reduire_casse', terms: ['casse', 'fragile', 'rupture', 'breakage', 'cassant'] },
  { need: 'definir_boucles', terms: ['définition', 'definition', 'boucle', 'curl', 'dessiner'] },
  { need: 'reduire_frisottis', terms: ['frisotti', 'frizz', 'mousseux'] },
  { need: 'apaiser_cuir_chevelu', terms: ['cuir chevelu', 'démangeai', 'demangeai', 'itch', 'pellicul', 'irrit'] },
  { need: 'proteger_chaleur', terms: ['chaleur', 'lisseur', 'sèche-cheveux', 'seche-cheveux', 'heat'] },
  { need: 'protection_solaire', terms: ['spf', 'solaire', 'soleil', 'uv', 'sun'] },
  { need: 'taches_hyperpigmentation', terms: ['tache', 'hyperpigment', 'marque', 'pigment', 'dark spot'] },
  { need: 'imperfections_acne', terms: ['acné', 'acne', 'bouton', 'imperfection', 'pimple'] },
  { need: 'peau_sensible', terms: ['sensible', 'réactive', 'reactive', 'sensitive'] },
  { need: 'hydrater_peau', terms: ['hydrater ma peau', 'peau sèche', 'peau seche', 'hydratation peau'] }
];

const TEXTURE_LEXICON: { texture: string; terms: string[] }[] = [
  { texture: '4c', terms: ['crépu', 'crepu', '4c', 'kinky', 'afro'] },
  { texture: '4a', terms: ['4a', 'frisé serré', 'frise serree'] },
  { texture: '3c', terms: ['3c', 'frisé', 'frise', 'coily'] },
  { texture: '3b', terms: ['3b', 'bouclé', 'boucle', 'curly'] },
  { texture: 'wavy', terms: ['ondulé', 'ondule', 'wavy', '2a', '2b', '2c'] }
];

const TONE_LEXICON: { tone: string; terms: string[] }[] = [
  { tone: 'deep', terms: ['foncée', 'foncee', 'noire', 'profonde', 'deep', 'dark'] },
  { tone: 'medium', terms: ['métisse', 'metissee', 'moyenne', 'medium', 'olive'] },
  { tone: 'light', terms: ['claire', 'light'] }
];

const STEP_LEXICON: { step: string; terms: string[] }[] = [
  { step: 'cleanse', terms: ['shampooing', 'shampoing', 'lavant', 'nettoyant', 'shampoo'] },
  { step: 'condition', terms: ['après-shampooing', 'apres-shampooing', 'conditionneur', 'conditioner'] },
  { step: 'deep_condition', terms: ['masque', 'mask', 'soin profond', 'deep condition'] },
  { step: 'leave_in', terms: ['leave-in', 'leave in', 'lait', 'spray hydratant'] },
  { step: 'seal_oil', terms: ['huile', 'oil', 'scellant', 'seal'] },
  { step: 'styling_definer', terms: ['gel', 'définissant', 'definissant', 'custard', 'coiffant'] },
  { step: 'scalp_treatment', terms: ['cuir chevelu', 'scalp'] },
  { step: 'skin_spf', terms: ['spf', 'solaire', 'écran', 'ecran'] }
];

const CATEGORY_LEXICON: { category: string; terms: string[] }[] = [
  { category: 'cheveux', terms: ['cheveux', 'chevelu', 'hair'] },
  { category: 'peau', terms: ['peau', 'visage', 'skin', 'face'] },
  { category: 'enfants', terms: ['enfant', 'kid', 'bébé', 'bebe', 'child'] },
  { category: 'hommes', terms: ['homme', 'barbe', 'men', 'beard'] },
  { category: 'accessoires', terms: ['accessoire', 'bonnet', 'brosse', 'peigne', 'tool'] }
];

const ROUTINE_TERMS = ['routine', 'regimen', 'protocole', 'programme', 'étapes', 'etapes'];
const FRAGRANCE_EXCLUSION = ['sans parfum', 'sans odeur', 'non parfumé', 'non parfume', 'fragrance free', 'unscented'];

function parseAmount(value: string): number | undefined {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function matchesAny(query: string, terms: string[]): boolean {
  return terms.some(term => query.includes(term));
}

/**
 * Extrait l'intention. Ce qui n'est pas résolu est listé dans `unresolved` :
 * un parseur qui devine produit des résultats faux avec assurance.
 */
export function parseSearchIntent(rawQuery: unknown): SearchIntent {
  const query = typeof rawQuery === 'string' ? rawQuery.toLowerCase().trim() : '';
  if (query === '') {
    return {
      rawQuery: '',
      needs: [], textures: [], toneDepths: [], steps: [], categories: [],
      budget: null, wantsRoutine: false, excludesFragrance: false,
      unresolved: ['Requête vide.']
    };
  }

  const needs = NEED_LEXICON.filter(entry => matchesAny(query, entry.terms)).map(entry => entry.need);
  const textures = TEXTURE_LEXICON.filter(entry => matchesAny(query, entry.terms)).map(entry => entry.texture);
  const toneDepths = TONE_LEXICON.filter(entry => matchesAny(query, entry.terms)).map(entry => entry.tone);
  const steps = STEP_LEXICON.filter(entry => matchesAny(query, entry.terms)).map(entry => entry.step);
  const categories = CATEGORY_LEXICON.filter(entry => matchesAny(query, entry.terms)).map(entry => entry.category);

  const unresolved: string[] = [];

  let budget: SearchIntent['budget'] = null;
  const perItemMatch = query.match(BUDGET_PER_ITEM);
  const totalMatch = query.match(BUDGET_TOTAL);
  if (perItemMatch || totalMatch) {
    const maxPerItem = perItemMatch ? parseAmount(perItemMatch[1]) : undefined;
    const maxTotal = totalMatch ? parseAmount(totalMatch[1]) : undefined;
    if (maxPerItem !== undefined || maxTotal !== undefined) {
      budget = { maxPerItem, maxTotal, currency: 'EUR' };
    }
  } else {
    const barePrice = query.match(PRICE_TOKEN);
    if (barePrice) {
      // Un prix nu est ambigu : plafond par article ou budget total ? On le
      // traite comme un plafond par article et on le signale.
      const amount = parseAmount(barePrice[1]);
      if (amount !== undefined) {
        budget = { maxPerItem: amount, currency: 'EUR' };
        unresolved.push(`« ${barePrice[0].trim()} » interprété comme un plafond par article. Précisez « au total » si c’est un budget global.`);
      }
    }
  }

  if (needs.length === 0 && textures.length === 0 && steps.length === 0 && categories.length === 0) {
    unresolved.push('Aucun besoin, texture, étape ou catégorie reconnu. La recherche retombe sur le catalogue complet.');
  }

  return {
    rawQuery: typeof rawQuery === 'string' ? rawQuery.trim() : '',
    needs,
    textures,
    toneDepths,
    steps,
    categories,
    budget,
    wantsRoutine: ROUTINE_TERMS.some(term => query.includes(term)),
    excludesFragrance: FRAGRANCE_EXCLUSION.some(term => query.includes(term)),
    unresolved
  };
}

export interface SearchableProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  needs?: string[];
  concerns?: string[];
  routineStep?: string;
  targetHairTypes?: string[];
  targetSkinTypes?: string[];
  containsFragrance?: boolean;
  description?: string;
}

export interface SearchMatch {
  product: SearchableProduct;
  /** Nombre de contraintes satisfaites. Le tri suit ce compte, pas un score opaque. */
  satisfied: number;
  matchedOn: string[];
  missedOn: string[];
}

/**
 * Filtre et classe selon l'intention. Chaque résultat dit sur quoi il
 * correspond et sur quoi il ne correspond pas.
 */
export function searchByIntent(catalog: Iterable<SearchableProduct>, intent: SearchIntent): SearchMatch[] {
  const matches: SearchMatch[] = [];

  for (const product of catalog) {
    const matchedOn: string[] = [];
    const missedOn: string[] = [];

    if (intent.budget?.maxPerItem !== undefined && product.price > intent.budget.maxPerItem) {
      missedOn.push(`prix ${product.price} € au-dessus du plafond de ${intent.budget.maxPerItem} €`);
      continue;
    }
    if (intent.budget?.maxPerItem !== undefined) matchedOn.push(`prix dans le budget (${product.price} €)`);

    if (intent.categories.length > 0) {
      if (intent.categories.includes(product.category)) matchedOn.push(`catégorie ${product.category}`);
      else { missedOn.push(`catégorie ${product.category} hors demande`); continue; }
    }

    if (intent.steps.length > 0) {
      if (product.routineStep && intent.steps.includes(product.routineStep)) matchedOn.push(`étape ${product.routineStep}`);
      else missedOn.push('étape différente');
    }

    if (intent.needs.length > 0) {
      const productNeeds = [...(product.needs || []), ...(product.concerns || [])];
      const hit = intent.needs.filter(need => productNeeds.includes(need));
      if (hit.length > 0) matchedOn.push(`besoin(s) ${hit.join(', ')}`);
      else missedOn.push('aucun besoin correspondant');
    }

    if (intent.textures.length > 0) {
      const hairTypes = (product.targetHairTypes || []).map(value => value.toLowerCase());
      const hit = intent.textures.filter(texture => hairTypes.some(type => type.includes(texture)));
      if (hit.length > 0) matchedOn.push(`texture ${hit.join(', ')}`);
      else missedOn.push('texture non ciblée par ce produit');
    }

    if (intent.excludesFragrance && product.containsFragrance === true) {
      missedOn.push('contient du parfum');
      continue;
    }
    if (intent.excludesFragrance) matchedOn.push('sans parfum');

    // Un produit qui ne satisfait aucune contrainte nommée n'est pas un résultat.
    if (matchedOn.length === 0) continue;

    matches.push({ product, satisfied: matchedOn.length, matchedOn, missedOn });
  }

  return matches.sort((a, b) => b.satisfied - a.satisfied || a.product.price - b.product.price);
}

/**
 * Reformule l'intention en langage clair. L'utilisateur doit pouvoir vérifier
 * ce que KURLA a compris avant de voir les résultats.
 */
export function describeIntent(intent: SearchIntent): string {
  const parts: string[] = [];
  if (intent.wantsRoutine) parts.push('une routine complète');
  if (intent.textures.length > 0) parts.push(`cheveux ${intent.textures.join('/')}`);
  if (intent.needs.length > 0) parts.push(`besoins : ${intent.needs.join(', ')}`);
  if (intent.steps.length > 0) parts.push(`étapes : ${intent.steps.join(', ')}`);
  if (intent.categories.length > 0) parts.push(`catégories : ${intent.categories.join(', ')}`);
  if (intent.excludesFragrance) parts.push('sans parfum');
  if (intent.budget) {
    parts.push(intent.budget.maxTotal !== undefined
      ? `budget total ${intent.budget.maxTotal} €`
      : `plafond ${intent.budget.maxPerItem} € par article`);
  }
  if (parts.length === 0) return 'Aucune contrainte reconnue.';
  return `Compris : ${parts.join(' · ')}.`;
}
