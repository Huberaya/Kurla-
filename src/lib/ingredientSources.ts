/**
 * CHANTIER 1 — GRAPHE DE CONNAISSANCES, sources 100 % gratuites.
 *
 * Ce module fédère des sources publiques et gratuites (aucune clé, aucun
 * compte) pour peupler le graphe d'ingrédients SANS rien inventer :
 *
 *  1. Open Beauty Facts (ODbL)  — INCI réellement présents sur les étiquettes
 *     cosmétiques, avec leur fréquence. C'est le « réservoir de demandes » :
 *     les ingrédients que les clientes rencontrent vraiment.
 *  2. PubChem (NIH/NLM, domaine public) — résout l'identité d'un INCI en
 *     entité chimique : CID, formule, CAS. Ne résout PAS les mélanges
 *     (beurres/extraits botaniques) : c'est un refus attendu, pas une erreur.
 *  3. Wikidata (CC0) — identifiant QID + CAS + numéro EC en secours et
 *     recoupement.
 *
 * Règle d'or du chantier : une fonction cosmétique, une famille ou une
 * allégation ne sont inscrites que si une source le dit. PubChem donne la
 * chimie (formule/CAS), pas la fonction cosmétique : on n'en déduit donc
 * jamais la fonction. Les fonctions viendront d'un vocabulaire conservateur
 * fondé sur la réglementation (CosIng) dans un second temps.
 */

const UA = 'KURLA-IngredientGraph/1.0 (research; contact: support@kurla-beauty.com)';

async function fetchJson(url: string, timeoutMs = 12000, init?: RequestInit): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, headers: { 'User-Agent': UA, ...(init?.headers || {}) } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Normalisation des libellés d'ingrédients
// ---------------------------------------------------------------------------

/**
 * Convertit un tag OBF (ex. "en:citric-acid", "fr:butyrospermum-parkii-butter")
 * ou un libellé libre en une clé d'INCI comparable. On N'essaie pas de
 * reconstruire la casse exacte de l'INCI : on produit une clé de rapprochement
 * stable (minuscules, tirets). Le nom d'affichage INCI officiel est posé lors
 * de la résolution d'entité (PubChem/Wikidata) ou reste le libellé nettoyé.
 */
export function inciKeyFromTag(tag: string): string {
  const raw = tag.includes(':') ? tag.split(':').pop()! : tag;
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/** Remet un tag OBF en libellé lisible (sans la casse INCI officielle). */
export function prettyFromTag(tag: string): string {
  const key = inciKeyFromTag(tag);
  return key
    .split('-')
    .map(w => (/^[a-z]+$/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Les tags « agrégats » OBF ne sont pas des INCI : ce sont des fourre-tout
// (allergènes regroupés, familles, « parfum » générique). On les exclut du
// réservoir d'entités car ce ne sont pas des substances identifiables.
const NON_ENTITY_TAGS = new Set([
  'allergenic-fragrances', 'silicones', 'parabens', 'sulfates', 'mineral-oil',
  'petroleum', 'microplastics', 'nan-ingredients', 'ingredients-unknown',
  'fragrance-allergens', 'essential-oils', 'vegetable-oils', 'vitamins',
  // « parfum / fragrance » est une mention d'étiquette, pas une substance.
  'parfum', 'fragrance', 'aroma', 'perfume', 'fragrance-parfum', 'parfum-fragrance',
]);

/**
 * Synonymes INCI pointant vers la MÊME entité. OBF livre parfois l'eau sous
 * deux étiquettes (« aqua » en fr, « water » en en) : on les fusionne sur une
 * clé canonique pour ne pas créer deux lignes. La clé de gauche est l'INCI
 * officiel retenu (celui de la réglementation cosmétique).
 */
const INCI_CANONICAL: Record<string, string> = {
  'water': 'aqua',                 // INCI officiel : Aqua
  'eau': 'aqua',
  'fragrance': 'parfum',           // tous deux non-entités (exclus par ailleurs)
  'perfume': 'parfum',
  'edta': 'tetrasodium-edta',      // « edta » est un fourre-tout ; on garde l'entité précise si présente
};

export function canonicalInciKey(key: string): string {
  return INCI_CANONICAL[key] ?? key;
}

/** Libellé INCI d'affichage à partir d'une clé canonique. */
const INCI_DISPLAY: Record<string, string> = {
  'aqua': 'Aqua',
  'parfum': 'Parfum',
};

export function displayInciLabel(key: string, fallback: string): string {
  return INCI_DISPLAY[key] ?? fallback;
}

// ---------------------------------------------------------------------------
// 1) Open Beauty Facts — fréquence des INCI sur les étiquettes
// ---------------------------------------------------------------------------

export interface ObfIngredientCount {
  key: string;        // clé de rapprochement stable
  label: string;      // libellé lisible
  tag: string;        // tag OBF d'origine (avec préfixe de langue)
  count: number;      // nombre de produits (échantillon) qui le contiennent
}

/**
 * Agrège les `ingredients_tags` des produits cosmétiques OBF sur plusieurs
 * catégories et pages. Renvoie les INCI classés par fréquence décroissante.
 * Ne lève jamais : en cas d'échec réseau, renvoie ce qui a déjà été collecté.
 */
export async function fetchObfIngredientFrequency(
  options: { pageSize?: number; pages?: number; categories?: string[]; signal?: AbortSignal } = {}
): Promise<ObfIngredientCount[]> {
  const pageSize = options.pageSize ?? 100;
  const pages = options.pages ?? 3;
  const categories = options.categories ?? [
    'en:hair-care', 'en:skin-care', 'en:shampoos', 'en:hair-conditioners',
    'en:body-lotions', 'en:soaps', 'en:face-creams',
  ];

  const counts = new Map<string, { label: string; tag: string; count: number }>();

  for (const category of categories) {
    for (let page = 1; page <= pages; page++) {
      const url = `https://world.openbeautyfacts.org/api/v2/search?categories_tags=${encodeURIComponent(category)}&page=${page}&page_size=${pageSize}&fields=ingredients_tags`;
      const data = await fetchJson(url, 20000, options.signal ? { signal: options.signal } : undefined);
      const products = data?.products;
      if (!Array.isArray(products)) continue;
      for (const product of products) {
        const tags: string[] = product?.ingredients_tags ?? [];
        const seenInProduct = new Set<string>();
        for (const tag of tags) {
          let key = inciKeyFromTag(tag);
          if (key.length < 3 || NON_ENTITY_TAGS.has(key)) continue;
          // On ignore les tags qui restent des fourre-tout (pluriels de familles, etc.)
          if (/(-ingredients|ingredients-|^ingredient-)/.test(key)) continue;
          key = canonicalInciKey(key);
          if (NON_ENTITY_TAGS.has(key)) continue;
          if (seenInProduct.has(key)) continue; // un même INCI compte une fois par produit
          seenInProduct.add(key);
          const label = displayInciLabel(key, prettyFromTag(tag));
          const entry = counts.get(key) ?? { label, tag, count: 0 };
          entry.count += 1;
          counts.set(key, entry);
        }
      }
    }
  }

  return Array.from(counts.entries())
    .map(([key, v]) => ({ key, label: v.label, tag: v.tag, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// 2) PubChem — résolution d'identité chimique (CID, formule, CAS)
// ---------------------------------------------------------------------------

export interface PubchemMatch {
  cid: number;
  molecularFormula?: string;
  iupacName?: string;
  casNumbers: string[];
  sourceUrl: string;
}

/** Interroge PubChem par nom. Renvoie `null` si aucune entité chimique unique. */
export async function resolvePubchem(inciName: string): Promise<PubchemMatch | null> {
  const name = encodeURIComponent(inciName);
  const prop = await fetchJson(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/property/MolecularFormula,IUPACName/JSON`,
    12000
  );
  const cid: number | undefined = prop?.PropertyTable?.Properties?.[0]?.CID;
  if (!cid) return null;
  const formula: string | undefined = prop.PropertyTable.Properties[0].MolecularFormula;
  const iupac: string | undefined = prop.PropertyTable.Properties[0].IUPACName;

  let casNumbers: string[] = [];
  const syn = await fetchJson(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`,
    12000
  );
  const synonyms: string[] = syn?.InformationList?.Information?.[0]?.Synonym ?? [];
  casNumbers = Array.from(new Set(synonyms.filter((s: string) => /^\d{2,7}-\d{2}-\d$/.test(s))));

  return {
    cid,
    molecularFormula: formula,
    iupacName: iupac,
    casNumbers,
    sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
  };
}

// ---------------------------------------------------------------------------
// 3) Wikidata — secours / recoupement (QID, CAS, EC)
// ---------------------------------------------------------------------------

export interface WikidataMatch {
  qid: string;
  label: string;
  casNumber?: string;
  ecNumber?: string;
  pubchemCid?: number;
  sourceUrl: string;
}

const WD_SPARQL = 'https://query.wikidata.org/sparql';

/** Résout un libellé INCI via Wikidata (label exact), puis vérifie le CAS. */
export async function resolveWikidata(inciName: string): Promise<WikidataMatch | null> {
  const query = `
    SELECT ?item ?itemLabel ?cas ?ec ?cid WHERE {
      ?item rdfs:label ?label .
      FILTER(LCASE(STR(?label)) = LCASE(${JSON.stringify(inciName)}))
      ?item wdt:P31/wdt:P279* wd:Q11173 .   # instance/sous-classe de "chemical entity"
      OPTIONAL { ?item wdt:P231 ?cas . }
      OPTIONAL { ?item wdt:P233 ?ec . }
      OPTIONAL { ?item wdt:P662 ?cid . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }
    } LIMIT 5
  `;
  const data = await fetchJson(
    `${WD_SPARQL}?format=json&query=${encodeURIComponent(query)}`,
    15000,
    { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } }
  );
  const bindings = data?.results?.bindings;
  if (!Array.isArray(bindings) || bindings.length === 0) return null;
  // On privilégie une entité qui a un CAS (identité chimique confirmée).
  const withCas = bindings.find((b: any) => b.cas?.value) ?? bindings[0];
  const qid = (withCas.item.value as string).split('/').pop()!;
  return {
    qid,
    label: withCas.itemLabel?.value ?? inciName,
    casNumber: withCas.cas?.value,
    ecNumber: withCas.ec?.value,
    pubchemCid: withCas.cid?.value ? Number(withCas.cid.value) : undefined,
    sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
  };
}

// ---------------------------------------------------------------------------
// Résolution d'identité consolidée (PubChem d'abord, Wikidata en secours)
// ---------------------------------------------------------------------------

export interface ResolvedIngredientIdentity {
  inciLabel: string;
  casNumber?: string;
  pubchemCid?: number;
  wikidataQid?: string;
  molecularFormula?: string;
  /** Sources ayant confirmé l'identité (pour la table de provenance). */
  sources: Array<{ label: string; url: string; tier: 1 | 2; cas?: string; note: string }>;
  /** true si au moins une source fait foi (entité chimique reconnue). */
  confirmed: boolean;
}

/**
 * Consolide PubChem puis Wikidata. Ne lève jamais. Un ingrédient non résolu
 * (mélange botanique, extrait) renvoie `confirmed: false` : il pourra être
 * créé comme entité `pending` sans CAS, mais sans prétention chimique.
 */
export async function resolveIngredientIdentity(inciName: string): Promise<ResolvedIngredientIdentity> {
  const sources: ResolvedIngredientIdentity['sources'] = [];
  let cas: string | undefined;
  let cid: number | undefined;
  let formula: string | undefined;
  let qid: string | undefined;

  const pub = await resolvePubchem(inciName);
  if (pub) {
    cid = pub.cid;
    formula = pub.molecularFormula;
    cas = pub.casNumbers[0];
    sources.push({
      label: 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes)',
      url: pub.sourceUrl,
      tier: 1,
      cas: cas,
      note: `CID ${pub.cid}${pub.molecularFormula ? `, ${pub.molecularFormula}` : ''}`,
    });
  }

  const wiki = await resolveWikidata(inciName);
  if (wiki) {
    qid = wiki.qid;
    // Recoupement : si Wikidata donne un CAS et que PubChem n'en avait pas.
    if (!cas && wiki.casNumber) cas = wiki.casNumber;
    if (!cid && wiki.pubchemCid) cid = wiki.pubchemCid;
    sources.push({
      label: 'Wikidata (CC0) — entité référencée (QID, CAS/EC)',
      url: wiki.sourceUrl,
      tier: 2,
      cas: wiki.casNumber,
      note: `${wiki.qid}${wiki.casNumber ? `, CAS ${wiki.casNumber}` : ''}`,
    });
  }

  return {
    inciLabel: inciName,
    casNumber: cas,
    pubchemCid: cid,
    wikidataQid: qid,
    molecularFormula: formula,
    sources,
    confirmed: sources.length > 0,
  };
}
