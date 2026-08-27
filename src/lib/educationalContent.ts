export const EDUCATIONAL_CONTENT_TYPES = ['article', 'video', 'guide', 'ingredient_sheet', 'routine'] as const;
export type EducationalContentType = typeof EDUCATIONAL_CONTENT_TYPES[number];

export const EDUCATIONAL_TOPICS = [
  'general',
  'men',
  'children',
  'braids',
  'locks',
  'beard',
  'sunscreen',
  'colored_hair',
  'relaxed_hair',
  'sensitive_skin',
  'hyperpigmentation',
  'scalp_health'
] as const;
export type EducationalTopic = typeof EDUCATIONAL_TOPICS[number];

export const EVIDENCE_LEVELS = ['not_provided', 'low', 'moderate', 'high', 'expert_consensus'] as const;
export type EvidenceLevel = typeof EVIDENCE_LEVELS[number];

export interface EducationalContentSource {
  label: string;
  url?: string;
  publisher?: string;
  accessedAt?: string;
  note?: string;
}

export interface EducationalContentTranslation {
  title: string;
  excerpt?: string;
  content: string;
  medicalWarning?: string;
}

export function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value.trim());
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function normalizeContentSources(input: unknown): EducationalContentSource[] {
  if (input === undefined || input === null || input === '') return [];
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      throw new Error('Les sources doivent être un tableau JSON valide.');
    }
  }
  if (!Array.isArray(value) || value.length > 30) throw new Error('Les sources doivent être un tableau de 30 éléments maximum.');
  return value.map((source, index) => {
    if (!source || typeof source !== 'object') throw new Error(`Source ${index + 1} invalide.`);
    const item = source as Record<string, unknown>;
    const label = cleanText(item.label, 300);
    const url = cleanText(item.url, 2000);
    if (!label) throw new Error(`La source ${index + 1} doit avoir un libellé.`);
    if (url && !isHttpUrl(url)) throw new Error(`L’URL de la source ${index + 1} est invalide.`);
    return {
      label,
      ...(url ? { url } : {}),
      ...(cleanText(item.publisher, 200) ? { publisher: cleanText(item.publisher, 200) } : {}),
      ...(cleanText(item.accessedAt, 40) ? { accessedAt: cleanText(item.accessedAt, 40) } : {}),
      ...(cleanText(item.note, 500) ? { note: cleanText(item.note, 500) } : {})
    };
  });
}

export function normalizeContentTranslations(input: unknown): Record<string, EducationalContentTranslation> {
  if (input === undefined || input === null || input === '') return {};
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      throw new Error('Les traductions doivent être un objet JSON valide.');
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Les traductions doivent être un objet indexé par langue.');
  const result: Record<string, EducationalContentTranslation> = {};
  for (const [locale, rawTranslation] of Object.entries(value)) {
    const normalizedLocale = locale.trim().toLowerCase();
    if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(normalizedLocale)) throw new Error(`Langue de traduction invalide : ${locale}.`);
    if (!rawTranslation || typeof rawTranslation !== 'object') throw new Error(`Traduction ${locale} invalide.`);
    const translation = rawTranslation as Record<string, unknown>;
    const title = cleanText(translation.title, 240);
    const content = cleanText(translation.content, 100000);
    if (!title || !content) throw new Error(`La traduction ${locale} doit contenir un titre et un contenu.`);
    result[normalizedLocale] = {
      title,
      content,
      ...(cleanText(translation.excerpt, 1000) ? { excerpt: cleanText(translation.excerpt, 1000) } : {}),
      ...(cleanText(translation.medicalWarning, 2000) ? { medicalWarning: cleanText(translation.medicalWarning, 2000) } : {})
    };
  }
  return result;
}

export function contentTypeLabel(type: string): string {
  return {
    article: 'Article',
    video: 'Vidéo',
    guide: 'Guide',
    ingredient_sheet: 'Fiche ingrédient',
    routine: 'Routine éditoriale'
  }[type] || 'Contenu';
}

export function topicLabel(topic: string): string {
  return {
    general: 'Général',
    men: 'Conseils hommes',
    children: 'Conseils enfants',
    braids: 'Tresses',
    locks: 'Locks',
    beard: 'Barbe',
    sunscreen: 'Protection solaire',
    colored_hair: 'Cheveux colorés',
    relaxed_hair: 'Cheveux défrisés',
    sensitive_skin: 'Peau sensible',
    hyperpigmentation: 'Hyperpigmentation',
    scalp_health: 'Santé du cuir chevelu'
  }[topic] || 'Sujet non renseigné';
}
