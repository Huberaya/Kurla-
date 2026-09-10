import { NEEDS_HUB } from './needsHub';
import type { NeedContent } from './needsHub';
import { TAXONOMY_TERMS } from './taxonomyReference';

/**
 * Pages SEO « besoin × texture » autorisées.
 *
 * Les besoins viennent de `needsHub` et les textures de la taxonomie contrôlée;
 * aucune combinaison de bénéfice n'est créée ici. Les contenus spéciaux retenus
 * sont ceux dont la fiche décrit explicitement un usage capillaire.
 */
const TEXTURE_AWARE_NEED_IDS = new Set([
  'hydrater-cheveux',
  'reduire-casse',
  'cuir-chevelu',
  'protective-styles',
  'locks-care',
  'routine-enfant',
  'routine-homme'
]);

export const HAIR_TEXTURE_TERMS = TAXONOMY_TERMS.filter(term => term.taxonomy === 'texture');

export interface NeedTexturePageDescriptor {
  need: NeedContent;
  textureCode: string;
  textureLabel: string;
  path: string;
  title: string;
  description: string;
}

export function getHairTextureTerm(rawCode: string | undefined) {
  const code = String(rawCode || '').trim().toUpperCase();
  return HAIR_TEXTURE_TERMS.find(term => term.code.toUpperCase() === code);
}

export function isTextureAwareNeed(need: NeedContent): boolean {
  return TEXTURE_AWARE_NEED_IDS.has(need.id);
}

export function getNeedTexturePageDescriptor(
  needSlug: string,
  textureCode: string
): NeedTexturePageDescriptor | null {
  const need = NEEDS_HUB.find(item => item.id === needSlug || item.homeSlug === needSlug);
  const texture = getHairTextureTerm(textureCode);
  if (!need || !texture || !isTextureAwareNeed(need)) return null;

  const normalizedCode = texture.code.toUpperCase();
  return {
    need,
    textureCode: normalizedCode,
    textureLabel: texture.labelFr,
    path: `/besoin/${encodeURIComponent(need.id)}/${encodeURIComponent(normalizedCode)}`,
    title: `${need.title} — cheveux ${normalizedCode} | KURLA`,
    description: `${need.title} pour ${texture.labelFr.toLowerCase()} : conseils, limites et produits explicitement reliés à cette texture dans le catalogue KURLA.`
  };
}

export function buildNeedTexturePages(): NeedTexturePageDescriptor[] {
  return NEEDS_HUB
    .filter(isTextureAwareNeed)
    .flatMap(need => HAIR_TEXTURE_TERMS.map(texture => getNeedTexturePageDescriptor(need.id, texture.code)!));
}

function textureCodeIndex(code: string): number {
  const normalized = code.toUpperCase();
  const family = Number(normalized[0]);
  const letter = normalized.charCodeAt(1) - 'A'.charCodeAt(0);
  return Number.isFinite(family) && letter >= 0 && letter <= 2 ? (family - 3) * 3 + letter : -1;
}

/**
 * Vérifie une liaison produit × texture sans déduire une compatibilité à partir
 * du besoin. Les valeurs du catalogue sont des codes simples ou des plages
 * (par exemple `3A-3C`, `4A-4C`, `3A-4C`). Une fiche sans cible capillaire ne
 * remonte jamais dans une page texture.
 */
export function productMatchesHairTexture(product: unknown, textureCode: string): boolean {
  const requested = textureCodeIndex(textureCode);
  if (requested < 0 || !product || typeof product !== 'object') return false;
  const record = product as Record<string, unknown>;
  const targets = Array.isArray(record.targetHairTypes)
    ? record.targetHairTypes
    : Array.isArray(record.hairTypes)
      ? record.hairTypes
      : [];

  return targets.some(target => {
    if (typeof target !== 'string') return false;
    const matches: string[] = target.toUpperCase().match(/[234][ABC](?:\s*[-–]\s*[234][ABC])?/g) || [];
    return matches.some((range: string) => {
      const parts = range.replace(/\s/g, '').split(/[-–]/);
      const start = textureCodeIndex(parts[0]);
      const end = textureCodeIndex(parts[1] || parts[0]);
      return start >= 0 && end >= 0 && requested >= Math.min(start, end) && requested <= Math.max(start, end);
    });
  });
}
