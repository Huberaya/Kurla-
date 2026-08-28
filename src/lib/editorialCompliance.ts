/**
 * CHANTIER 9 (bloc A4) — AI ACT, ARTICLE 50(4) APPLIQUÉ AU CMS.
 *
 * L'article 50(4) du règlement (UE) 2024/1689 vise les systèmes d'IA qui
 * génèrent ou manipulent du texte publié pour informer le public sur des
 * questions d'intérêt général. Le texte doit être signalé comme généré par IA
 * **sauf** s'il fait l'objet d'une relecture humaine et d'une validation
 * éditoriale, avec une personne responsable nommément identifiée.
 *
 * KURLA publie du contenu de santé cosmétique : c'est exactement le périmètre
 * visé. Jusqu'ici l'exemption était écrite dans `AI_TRANSPARENCY` mais
 * n'était appliquée nulle part — ce module la rend exécutoire :
 *
 *  - un texte **humain** n'a rien à prouver ;
 *  - un texte **généré par IA** doit, pour être publié, soit porter un
 *    signalement explicite, soit porter la trace d'une relecture humaine
 *    assumée par une personne **nommée** ;
 *  - « relu par la rédaction » sans nom ne vaut pas exemption : la règle
 *    exige une personne identifiable, pas une entité.
 *
 * Le module est pur : aucune dépendance, donc testable ligne à ligne, et
 * réutilisable par le CMS, l'audit et les migrations.
 */

export type ContentGenerationMode = 'human' | 'ai' | 'ai_assisted';

export type EditorialComplianceMode =
  | 'human'
  | 'ai_disclosed'
  | 'ai_editorial_control'
  | 'ai_not_compliant';

export interface EditorialRecord {
  generatedBy?: unknown;
  aiDisclosure?: unknown;
  editorialReview?: unknown;
  reviewedBy?: unknown;
  reviewedAt?: unknown;
  responsibilityAccepted?: unknown;
  /**
   * Les lignes de base arrivent en `snake_case` (`generated_by`,
   * `editorial_review`) : le module lit les deux écritures, il accepte donc
   * toute clé supplémentaire plutôt que d'imposer un mappage préalable.
   */
  [key: string]: unknown;
}

export interface EditorialCompliance {
  /** Mode retenu : humain, IA signalée, IA sous contrôle éditorial, ou non conforme. */
  mode: EditorialComplianceMode;
  compliant: boolean;
  /** Raisons lisibles — vides quand le contenu est publiable. */
  reasons: string[];
  /** Ce qu'il manque pour publier, en noms de champs. */
  missing: string[];
  /** Personne responsable nommée, quand l'exemption éditoriale est invoquée. */
  responsiblePerson: string | null;
  /** Signalement affiché au public quand le texte est généré par IA. */
  disclosureLabel: string | null;
}

/**
 * Valeurs qui ne désignent personne : une exemption éditoriale sans personne
 * identifiable n'est pas une exemption.
 */
const NOT_A_PERSON = ['ia', 'ai', 'ia kurla', 'kurla', 'chatgpt', 'gpt', 'llm', 'modele', 'modèle', 'assistant', 'bot', 'automatique', 'n/a', 'na', 'none', 'null', '-', 'tbd', 'à définir'];

export const AI_DISCLOSURE_LABEL = 'Contenu généré par IA, relu et publié sous la responsabilité de la rédaction KURLA.';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function pick(record: EditorialRecord, key: string): unknown {
  if (record[key] !== undefined) return record[key];
  const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  return (record as Record<string, unknown>)[snake];
}

function pickReviewField(review: unknown, key: 'reviewedBy' | 'reviewedAt' | 'responsibilityAccepted'): unknown {
  if (review && typeof review === 'object') {
    const candidate = (review as Record<string, unknown>)[key];
    if (candidate !== undefined) return candidate;
    const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const fromSnake = (review as Record<string, unknown>)[snake];
    if (fromSnake !== undefined) return fromSnake;
  }
  return undefined;
}

export function normalizeGenerationMode(value: unknown): ContentGenerationMode {
  const raw = readString(value).toLowerCase();
  if (raw === 'ai' || raw === 'ia' || raw === 'generated' || raw === 'ai_generated') return 'ai';
  if (raw === 'ai_assisted' || raw === 'ai-assisted' || raw === 'assiste_ia' || raw === 'assisté par ia') return 'ai_assisted';
  return 'human';
}

/** Une exemption éditoriale exige une personne : ni entité, ni placeholder. */
export function resolveResponsiblePerson(review: unknown, fallback?: unknown): string | null {
  const candidate = readString(pickReviewField(review, 'reviewedBy') ?? fallback);
  if (!candidate) return null;
  const normalized = candidate.toLowerCase().replace(/\s+/g, ' ');
  if (NOT_A_PERSON.includes(normalized)) return null;
  // Un nom tient en au moins deux mots : « Marie » seule n'identifie personne.
  if (normalized.split(' ').filter(Boolean).length < 2) return null;
  return candidate;
}

function isTimestamp(value: unknown): boolean {
  const raw = readString(value);
  if (!raw) return false;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed);
}

/**
 * Évalue la conformité d'un contenu au regard de l'article 50(4).
 *
 * Le module ne décide jamais à la place de la rédaction : il dit ce qui manque.
 */
export function evaluateEditorialCompliance(record: EditorialRecord = {}): EditorialCompliance {
  const generatedBy = normalizeGenerationMode(pick(record, 'generatedBy'));

  if (generatedBy === 'human') {
    return {
      mode: 'human',
      compliant: true,
      reasons: [],
      missing: [],
      responsiblePerson: null,
      disclosureLabel: null
    };
  }

  const disclosureValue = pick(record, 'aiDisclosure');
  const disclosed = disclosureValue === true
    || (typeof disclosureValue === 'string' && disclosureValue.trim().length > 0)
    || (Array.isArray(disclosureValue) && disclosureValue.length > 0);

  const review = pick(record, 'editorialReview');
  const responsiblePerson = resolveResponsiblePerson(review, pick(record, 'reviewedBy'));
  const reviewedAt = pickReviewField(review, 'reviewedAt') ?? pick(record, 'reviewedAt');
  const responsibility = pickReviewField(review, 'responsibilityAccepted') ?? pick(record, 'responsibilityAccepted');
  const editorialControl = Boolean(responsiblePerson) && isTimestamp(reviewedAt) && responsibility === true;

  if (editorialControl) {
    return {
      mode: 'ai_editorial_control',
      compliant: true,
      reasons: [`Exemption éditoriale art. 50(4) : relecture humaine assumée par ${responsiblePerson}.`],
      missing: [],
      responsiblePerson,
      // Même sous exemption, KURLA signale l'origine : la transparence reste
      // lisible pour le lecteur, l'exemption ne porte que sur l'obligation.
      disclosureLabel: AI_DISCLOSURE_LABEL
    };
  }

  if (disclosed) {
    return {
      mode: 'ai_disclosed',
      compliant: true,
      reasons: ['Texte généré par IA signalé comme tel au public.'],
      missing: [],
      responsiblePerson: null,
      disclosureLabel: AI_DISCLOSURE_LABEL
    };
  }

  const missing: string[] = [];
  const reasons: string[] = ['Article 50(4) : un texte généré par IA publié pour informer le public doit être signalé, ou relever d’une relecture humaine assumée par une personne nommée.'];
  if (!responsiblePerson) missing.push('editorialReview.reviewedBy (prénom et nom)');
  if (!isTimestamp(reviewedAt)) missing.push('editorialReview.reviewedAt (date de relecture)');
  if (responsibility !== true) missing.push('editorialReview.responsibilityAccepted (validation explicite)');
  if (!disclosed) missing.push('aiDisclosure (signalement au public)');
  reasons.push(`Champs manquants : ${missing.join(', ')}.`);

  return {
    mode: 'ai_not_compliant',
    compliant: false,
    reasons,
    missing,
    responsiblePerson: null,
    disclosureLabel: null
  };
}

/** Bloque la publication d'un contenu non conforme. */
export function assertPublishable(record: EditorialRecord = {}): EditorialCompliance {
  const compliance = evaluateEditorialCompliance(record);
  if (!compliance.compliant) {
    throw new Error(`Publication refusée — ${compliance.reasons.join(' ')}`);
  }
  return compliance;
}
