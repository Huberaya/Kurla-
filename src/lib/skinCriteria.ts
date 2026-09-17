/**
 * CHANTIER 5 — Critères Skin, déjà dans le projet, branchés sur l’objet.
 *
 * Sources **uniques** (aucune 3ᵉ grille) :
 *   - 50 besoins documentés → `skinNeedMapping.ts`
 *   - 15 filtres boutique → `skinTaxonomy.ts` (`SKIN_NEEDS`)
 *   - métadonnées commerciales → `SKIN_REQUIRED_METADATA`
 *
 * Un identifié n’est pas une fiche : les métadonnées catalogue y sont
 * `not_applicable`, pas manquantes. Un SKU Hair n’emprunte pas la grille peau.
 */
import { documentedNeed } from './skinNeedMapping';
import { evaluateSkinMetadata, SKIN_REQUIRED_METADATA } from './skinCommercialReadiness';
import { estProduitPeau, SKIN_NEED_VALUES, skinNeedLabel, type SkinNeed } from './skinTaxonomy';

export const SKIN_CRITERIA_SOURCES = ['documented_needs', 'skin_needs', 'skin_required_metadata'] as const;
export type SkinCriteriaSource = (typeof SKIN_CRITERIA_SOURCES)[number];

export type SkinCriteriaStatus = 'ok' | 'missing' | 'not_applicable' | 'voluntary_none';

export type SkinCriteriaItem = {
  id: string;
  source: SkinCriteriaSource;
  label: string;
  status: SkinCriteriaStatus;
  required: boolean;
};

export type SkinCriteriaChecklist = {
  subject: 'identified' | 'catalog';
  applicable: boolean;
  items: SkinCriteriaItem[];
  missingCount: number;
  complete: boolean;
};

const SLOT_DOCUMENTED = 'documented_need';
const SLOT_BOUTIQUE = 'boutique_need';

export const SKIN_CRITERIA_SLOT_IDS = [SLOT_DOCUMENTED, SLOT_BOUTIQUE] as const;

function tally(items: SkinCriteriaItem[]): Pick<SkinCriteriaChecklist, 'missingCount' | 'complete'> {
  const missingCount = items.filter(item => item.required && item.status === 'missing').length;
  return { missingCount, complete: missingCount === 0 };
}

function metadataAsNotApplicable(): SkinCriteriaItem[] {
  return SKIN_REQUIRED_METADATA.map(field => ({
    id: field.field,
    source: 'skin_required_metadata' as const,
    label: field.label,
    status: 'not_applicable' as const,
    required: false,
  }));
}

export function evaluateIdentifiedSkinCriteria(record: {
  kind?: string;
  documentedNeed?: number | null;
  skinNeed?: SkinNeed | null;
}): SkinCriteriaChecklist {
  const number = typeof record.documentedNeed === 'number' ? record.documentedNeed : null;
  const mapped = number != null ? documentedNeed(number) : null;
  const isFond = record.kind === 'fond_position';

  const documented: SkinCriteriaItem = mapped
    ? {
        id: SLOT_DOCUMENTED,
        source: 'documented_needs',
        label: `#${mapped.number} ${mapped.title}`,
        status: 'ok',
        required: true,
      }
    : {
        id: SLOT_DOCUMENTED,
        source: 'documented_needs',
        label: 'Besoin documenté (1–50)',
        status: isFond ? 'missing' : 'not_applicable',
        required: isFond,
      };

  let boutique: SkinCriteriaItem;
  if (!mapped) {
    boutique = {
      id: SLOT_BOUTIQUE,
      source: 'skin_needs',
      label: 'Filtre boutique (15 SKIN_NEEDS)',
      status: 'not_applicable',
      required: false,
    };
  } else if (mapped.skinNeed == null) {
    boutique = {
      id: SLOT_BOUTIQUE,
      source: 'skin_needs',
      label: `${mapped.kind === 'hair' ? 'cheveu' : mapped.kind === 'education' ? 'éducation' : 'hors taxonomie boutique'} — pas un 16ᵉ besoin`,
      status: 'voluntary_none',
      required: false,
    };
  } else {
    boutique = {
      id: SLOT_BOUTIQUE,
      source: 'skin_needs',
      label: skinNeedLabel(mapped.skinNeed),
      status: 'ok',
      required: true,
    };
  }

  const items = [documented, boutique, ...metadataAsNotApplicable()];
  return { subject: 'identified', applicable: true, items, ...tally(items) };
}

export function evaluateCatalogSkinCriteria(product: any): SkinCriteriaChecklist {
  if (!estProduitPeau(product || {})) {
    const items: SkinCriteriaItem[] = [
      {
        id: SLOT_DOCUMENTED,
        source: 'documented_needs',
        label: 'Besoin documenté (1–50)',
        status: 'not_applicable',
        required: false,
      },
      {
        id: SLOT_BOUTIQUE,
        source: 'skin_needs',
        label: 'Filtre boutique (15 SKIN_NEEDS)',
        status: 'not_applicable',
        required: false,
      },
      ...metadataAsNotApplicable(),
    ];
    return { subject: 'catalog', applicable: false, items, missingCount: 0, complete: true };
  }

  const tagged = [...(Array.isArray(product?.concerns) ? product.concerns : []), ...(Array.isArray(product?.needs) ? product.needs : [])]
    .map((value: unknown) => String(value))
    .filter(value => SKIN_NEED_VALUES.includes(value));
  const uniqueNeeds = [...new Set(tagged)] as SkinNeed[];

  const boutique: SkinCriteriaItem = uniqueNeeds.length > 0
    ? {
        id: SLOT_BOUTIQUE,
        source: 'skin_needs',
        label: uniqueNeeds.map(skinNeedLabel).join(' · '),
        status: 'ok',
        required: true,
      }
    : {
        id: SLOT_BOUTIQUE,
        source: 'skin_needs',
        label: 'Filtre boutique (15 SKIN_NEEDS)',
        status: 'missing',
        required: true,
      };

  const documented: SkinCriteriaItem = {
    id: SLOT_DOCUMENTED,
    source: 'documented_needs',
    label: 'Besoin documenté (1–50)',
    status: 'not_applicable',
    required: false,
  };

  const metadata = evaluateSkinMetadata(product);
  const metadataItems: SkinCriteriaItem[] = metadata.checks.map(check => ({
    id: check.field,
    source: 'skin_required_metadata' as const,
    label: check.label,
    status: check.present ? 'ok' as const : 'missing' as const,
    required: check.required,
  }));

  const items = [documented, boutique, ...metadataItems];
  return { subject: 'catalog', applicable: true, items, ...tally(items) };
}

/** Garde : chaque id d’item est un slot connu ou un champ de SKIN_REQUIRED_METADATA. */
export function criteriaIdsAreKnown(checklist: SkinCriteriaChecklist): boolean {
  const allowed = new Set<string>([
    ...SKIN_CRITERIA_SLOT_IDS,
    ...SKIN_REQUIRED_METADATA.map(field => field.field),
  ]);
  return checklist.items.every(item => allowed.has(item.id) && (SKIN_CRITERIA_SOURCES as readonly string[]).includes(item.source));
}
