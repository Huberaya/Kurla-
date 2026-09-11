import { TAXONOMY_TERMS } from './taxonomyReference';

const UNKNOWN = 'inconnu';

/** C2 : version fonctionnelle du contrat de taxonomie de profil peau. */
export const SKIN_TAXONOMY_VERSION = '2026-09-18.c2';

export type SkinProfileTaxonomy = {
  skinType: string;
  skinConcerns: string[];
  skinObjectives: string[];
};

function normalizeToken(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function canonical(value: unknown, taxonomy: 'skin_type' | 'skin_concern' | 'skin_objective'): string {
  const token = normalizeToken(value);
  if (!token || token === normalizeToken(UNKNOWN)) return UNKNOWN;
  const terms = TAXONOMY_TERMS.filter(term => term.taxonomy === taxonomy);
  const match = terms.find(term => normalizeToken(term.code) === token || term.synonyms.some(synonym => normalizeToken(synonym) === token));
  return match?.code || UNKNOWN;
}

function canonicalArray(value: unknown, taxonomy: 'skin_concern' | 'skin_objective'): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const normalized = values.map(item => canonical(item, taxonomy)).filter(item => item !== UNKNOWN);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : [UNKNOWN];
}

/**
 * Normalise uniquement les dimensions qui ont un vocabulaire C2 versionné.
 * Une valeur absente ou inconnue devient `inconnu`, jamais un code inventé.
 */
export function normalizeSkinProfileTaxonomy(input: Partial<SkinProfileTaxonomy> | null | undefined): SkinProfileTaxonomy {
  return {
    skinType: canonical(input?.skinType, 'skin_type'),
    skinConcerns: canonicalArray(input?.skinConcerns, 'skin_concern'),
    skinObjectives: canonicalArray(input?.skinObjectives, 'skin_objective'),
  };
}

export function skinProfileTaxonomyUnknowns(input: Partial<SkinProfileTaxonomy> | null | undefined): Array<{ field: keyof SkinProfileTaxonomy; value: string }> {
  const values: Array<{ field: keyof SkinProfileTaxonomy; value: string }> = [];
  const check = (field: keyof SkinProfileTaxonomy, raw: unknown, taxonomy: 'skin_type' | 'skin_concern' | 'skin_objective') => {
    const entries = Array.isArray(raw) ? raw : [raw];
    for (const entry of entries) {
      if (entry === undefined || entry === null || normalizeToken(entry) === normalizeToken(UNKNOWN)) continue;
      if (canonical(entry, taxonomy) === UNKNOWN) values.push({ field, value: String(entry) });
    }
  };
  check('skinType', input?.skinType, 'skin_type');
  check('skinConcerns', input?.skinConcerns, 'skin_concern');
  check('skinObjectives', input?.skinObjectives, 'skin_objective');
  return values;
}
