export const FAMILY_AGE_BANDS = ['baby', 'child', 'teen', 'adult'] as const;
export type FamilyAgeBand = typeof FAMILY_AGE_BANDS[number];

export const FAMILY_PROFILE_KINDS = ['adult', 'child'] as const;
export type FamilyProfileKind = typeof FAMILY_PROFILE_KINDS[number];

export const FAMILY_CONSENT_STATUSES = ['not_required', 'pending', 'granted', 'revoked'] as const;
export type FamilyConsentStatus = typeof FAMILY_CONSENT_STATUSES[number];

export const FAMILY_PLAN_TYPES = ['routine', 'calendar', 'gift'] as const;
export type FamilyPlanType = typeof FAMILY_PLAN_TYPES[number];

export const FAMILY_PLAN_STATUSES = ['draft', 'active', 'archived'] as const;
export type FamilyPlanStatus = typeof FAMILY_PLAN_STATUSES[number];

export const FAMILY_AGE_LABELS: Record<FamilyAgeBand, string> = {
  baby: 'Bébé · 0 à 2 ans',
  child: 'Enfant · 3 à 11 ans',
  teen: 'Adolescent · 12 à 17 ans',
  adult: 'Adulte · 18 ans et plus'
};

export const FAMILY_PLAN_LABELS: Record<FamilyPlanType, string> = {
  routine: 'Routine partagée',
  calendar: 'Calendrier de soins',
  gift: 'Coffret ou cadeau'
};

export const CURRENT_FAMILY_CONSENT_VERSION = 'family-minor-consent-v1';

export function isMinorAgeBand(ageBand: string): boolean {
  return ageBand === 'baby' || ageBand === 'child' || ageBand === 'teen';
}

export function isProductSuitableForAgeBand(product: any, ageBand: string): boolean {
  if (!isMinorAgeBand(ageBand)) return true;
  if (product?.minorSafetyStatus !== 'verified' && product?.minor_safety_status !== 'verified') return false;
  if (product?.imageSupervisionStatus !== 'verified' && product?.image_supervision_status !== 'verified') return false;
  const adultOnlyActives = product?.adultOnlyActives ?? product?.adult_only_actives;
  if (Array.isArray(adultOnlyActives) && adultOnlyActives.length > 0) return false;
  const band = product?.recommendedAgeBand || product?.recommended_age_band;
  if (!band || band === 'not_provided' || band === 'adult') return false;
  const ranges: Record<string, [number, number]> = {
    baby: [0, 2], child: [3, 11], teen: [12, 17], adult: [18, 120], all_ages: [0, 120]
  };
  const wanted = ranges[ageBand];
  if (!wanted) return false;
  const productMin = product?.recommendedAgeMin ?? product?.recommended_age_min;
  const productMax = product?.recommendedAgeMax ?? product?.recommended_age_max;
  const range = productMin !== undefined || productMax !== undefined
    ? [Number.isFinite(Number(productMin)) ? Number(productMin) : 0, Number.isFinite(Number(productMax)) ? Number(productMax) : 120]
    : ranges[band];
  return Boolean(range && range[0] <= wanted[1] && range[1] >= wanted[0]);
}

export function familyAgeLabel(ageBand: string): string {
  return FAMILY_AGE_LABELS[ageBand as FamilyAgeBand] || 'Âge recommandé non renseigné';
}

export function familyPlanLabel(planType: string): string {
  return FAMILY_PLAN_LABELS[planType as FamilyPlanType] || 'Plan familial';
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanIds(value: unknown, max: number): string[] {
  if (Array.isArray(value)) return Array.from(new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))).slice(0, max);
  if (typeof value === 'string') return Array.from(new Set(value.split(',').map(item => item.trim()).filter(Boolean))).slice(0, max);
  return [];
}

export interface FamilyMemberInput {
  id?: string;
  familyId?: string;
  displayName?: string;
  profileKind?: string;
  ageBand?: string;
  parentalConsent?: boolean;
  consentVersion?: string;
  carePreferences?: Record<string, unknown>;
}

export function normalizeFamilyMemberInput(input: FamilyMemberInput): {
  displayName: string;
  profileKind: FamilyProfileKind;
  ageBand: FamilyAgeBand;
  consentStatus: FamilyConsentStatus;
  consentVersion?: string;
  parentalConsent: boolean;
  carePreferences: Record<string, unknown>;
} {
  const displayName = cleanText(input.displayName, 80);
  const profileKind = input.profileKind === 'child' ? 'child' : 'adult';
  const ageBand = FAMILY_AGE_BANDS.includes(input.ageBand as FamilyAgeBand) ? input.ageBand as FamilyAgeBand : 'adult';
  if (!displayName) throw new Error('Le prénom ou surnom du profil familial est obligatoire.');
  if (profileKind === 'child' && ageBand === 'adult') throw new Error('Un profil enfant doit avoir une tranche d’âge mineure.');
  if (profileKind === 'adult' && isMinorAgeBand(ageBand)) throw new Error('Un profil adulte ne peut pas utiliser une tranche d’âge mineure.');
  const minor = isMinorAgeBand(ageBand);
  const parentalConsent = input.parentalConsent === true;
  const consentStatus: FamilyConsentStatus = minor ? (parentalConsent ? 'granted' : 'pending') : 'not_required';
  const carePreferences = input.carePreferences && typeof input.carePreferences === 'object' && !Array.isArray(input.carePreferences)
    ? Object.fromEntries(Object.entries(input.carePreferences).slice(0, 20).map(([key, value]) => [cleanText(key, 60), cleanText(value, 240)]).filter(([key]) => Boolean(key)))
    : {};
  return {
    displayName,
    profileKind,
    ageBand,
    consentStatus,
    consentVersion: minor && parentalConsent ? CURRENT_FAMILY_CONSENT_VERSION : undefined,
    parentalConsent,
    carePreferences
  };
}

export function normalizeFamilyPlanInput(input: Record<string, unknown>): {
  title: string;
  planType: FamilyPlanType;
  audience: 'shared' | 'selected';
  memberIds: string[];
  productIds: string[];
  schedule: Array<Record<string, string>>;
  notes?: string;
  status: FamilyPlanStatus;
} {
  const title = cleanText(input.title, 160);
  const planType = FAMILY_PLAN_TYPES.includes(input.planType as FamilyPlanType) ? input.planType as FamilyPlanType : 'routine';
  const audience = input.audience === 'selected' ? 'selected' : 'shared';
  const memberIds = cleanIds(input.memberIds, 20);
  const productIds = cleanIds(input.productIds, 50);
  const rawSchedule = Array.isArray(input.schedule) ? input.schedule : [];
  const schedule = rawSchedule.slice(0, 100).filter(item => item && typeof item === 'object').map(item => {
    const value = item as Record<string, unknown>;
    return {
      date: cleanText(value.date, 40),
      label: cleanText(value.label, 160),
      memberId: cleanText(value.memberId, 80),
      status: cleanText(value.status, 30) || 'planned'
    };
  }).filter(item => item.date || item.label || item.memberId);
  const status = FAMILY_PLAN_STATUSES.includes(input.status as FamilyPlanStatus) ? input.status as FamilyPlanStatus : 'draft';
  if (!title) throw new Error('Le nom du plan familial est obligatoire.');
  return { title, planType, audience, memberIds, productIds, schedule, notes: cleanText(input.notes, 2000) || undefined, status };
}
