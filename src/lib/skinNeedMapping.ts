/**
 * CHANTIER 1 — Mapping des 50 besoins peau documentés → les 15 `SKIN_NEEDS`.
 *
 * Source unique des 15 besoins boutique : `skinTaxonomy.ts` (ne pas inventer
 * de 16ᵉ valeur). Source des 50 besoins : `docs/BESOINS_PEAU_50_2026-09-13.md`
 * et le fond `sourcing_fond_positions` (50 × 5).
 *
 * Un besoin documenté qui n'a pas d'équivalent boutique (`skinNeed: null`)
 * n'est PAS un trou à combler par une nouvelle catégorie : c'est de
 * l'éducation, du cheveu, ou du maquillage hors taxonomie actuelle.
 */

import { SKIN_NEED_VALUES, type SkinNeed } from './skinTaxonomy';

export type DocumentedNeedKind = 'education' | 'product' | 'hair';

export type DocumentedSkinNeed = {
  number: number;
  title: string;
  /** `null` = pas de filtre boutique (volontaire, pas un oubli). */
  skinNeed: SkinNeed | null;
  kind: DocumentedNeedKind;
  theme: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
};

export const DOCUMENTED_SKIN_NEEDS: readonly DocumentedSkinNeed[] = [
  { number: 1, title: 'Type de peau (8 types)', skinNeed: null, kind: 'education', theme: 'A' },
  { number: 2, title: 'Sécheresse ≠ déshydratation', skinNeed: 'hydrater', kind: 'product', theme: 'A' },
  { number: 3, title: 'Niveau d’hydratation', skinNeed: 'hydrater', kind: 'product', theme: 'A' },
  { number: 4, title: 'Sensibilité', skinNeed: 'sensible', kind: 'product', theme: 'A' },
  { number: 5, title: 'Phototype et ses limites', skinNeed: null, kind: 'education', theme: 'A' },
  { number: 6, title: 'Teint / sous-ton', skinNeed: null, kind: 'education', theme: 'A' },
  { number: 7, title: 'Barrière cutanée', skinNeed: 'barriere', kind: 'product', theme: 'A' },
  { number: 8, title: 'Profilage saisonnier', skinNeed: 'hydrater', kind: 'product', theme: 'A' },
  { number: 9, title: 'Taches post-boutons (HPI)', skinNeed: 'taches', kind: 'product', theme: 'B' },
  { number: 10, title: 'Taches solaires', skinNeed: 'taches', kind: 'product', theme: 'B' },
  { number: 11, title: 'Teint irrégulier', skinNeed: 'taches', kind: 'product', theme: 'B' },
  { number: 12, title: 'Teint terne, fatigué', skinNeed: 'eclat', kind: 'product', theme: 'B' },
  { number: 13, title: 'Taches par frottement', skinNeed: 'taches', kind: 'product', theme: 'B' },
  { number: 14, title: 'Assombrissement immédiat (IPD)', skinNeed: null, kind: 'education', theme: 'B' },
  { number: 15, title: 'Lumière visible et HPI', skinNeed: 'taches', kind: 'product', theme: 'B' },
  { number: 16, title: 'Taches hormonales / mélasma', skinNeed: 'taches', kind: 'product', theme: 'B' },
  { number: 17, title: 'Assombrissement des plis', skinNeed: 'corps', kind: 'product', theme: 'B' },
  { number: 18, title: 'Cernes', skinNeed: 'contour_yeux', kind: 'product', theme: 'B' },
  { number: 19, title: 'Boutons occasionnels', skinNeed: 'imperfections', kind: 'product', theme: 'C' },
  { number: 20, title: 'Imperfections récurrentes', skinNeed: 'imperfections', kind: 'product', theme: 'C' },
  { number: 21, title: 'Points noirs', skinNeed: 'imperfections', kind: 'product', theme: 'C' },
  { number: 22, title: 'Picking', skinNeed: 'imperfections', kind: 'product', theme: 'C' },
  { number: 23, title: 'Sébum / brillance', skinNeed: 'grasse', kind: 'product', theme: 'C' },
  { number: 24, title: 'Hydrater en profondeur', skinNeed: 'hydrater', kind: 'product', theme: 'D' },
  { number: 25, title: 'Barrière abîmée', skinNeed: 'barriere', kind: 'product', theme: 'D' },
  { number: 26, title: 'Peau réactive', skinNeed: 'sensible', kind: 'product', theme: 'D' },
  { number: 27, title: 'Rougeurs', skinNeed: 'sensible', kind: 'product', theme: 'D' },
  { number: 28, title: 'Réactions au parfum', skinNeed: 'sensible', kind: 'product', theme: 'D' },
  { number: 29, title: 'Climat / eau calcaire', skinNeed: 'seche', kind: 'product', theme: 'D' },
  { number: 30, title: 'SPF 30–50 fini invisible', skinNeed: 'spf', kind: 'product', theme: 'E' },
  { number: 31, title: 'SPF hiver / ciel couvert', skinNeed: 'spf', kind: 'product', theme: 'E' },
  { number: 32, title: 'SPF intégré 10–13 ≠ écran', skinNeed: null, kind: 'education', theme: 'E' },
  { number: 33, title: 'Quantité et réapplication SPF', skinNeed: 'spf', kind: 'product', theme: 'E' },
  { number: 34, title: 'Rides et ridules', skinNeed: 'anti_age', kind: 'product', theme: 'F' },
  { number: 35, title: 'Fermeté / élasticité', skinNeed: 'anti_age', kind: 'product', theme: 'F' },
  { number: 36, title: 'Vieillissement mélaniné', skinNeed: 'anti_age', kind: 'product', theme: 'F' },
  { number: 37, title: 'Prévention active', skinNeed: 'anti_age', kind: 'product', theme: 'F' },
  { number: 38, title: 'Cou / décolleté', skinNeed: 'corps', kind: 'product', theme: 'F' },
  { number: 39, title: 'Poils incarnés / post-rasage', skinNeed: 'corps', kind: 'product', theme: 'G' },
  { number: 40, title: 'Grain de poulet', skinNeed: 'corps', kind: 'product', theme: 'G' },
  { number: 41, title: 'Corps sec et rêche', skinNeed: 'corps', kind: 'product', theme: 'G' },
  { number: 42, title: 'Aisselles', skinNeed: 'corps', kind: 'product', theme: 'G' },
  { number: 43, title: 'Lèvres', skinNeed: 'levres', kind: 'product', theme: 'G' },
  { number: 44, title: 'Cuir chevelu', skinNeed: null, kind: 'hair', theme: 'G' },
  { number: 45, title: 'Démaquiller sans frotter', skinNeed: null, kind: 'product', theme: 'H' },
  { number: 46, title: 'Maquillage non comédogène', skinNeed: null, kind: 'product', theme: 'H' },
  { number: 47, title: 'Teinte fond de teint foncé', skinNeed: null, kind: 'product', theme: 'H' },
  { number: 48, title: 'Routine 3 gestes', skinNeed: 'hydrater', kind: 'product', theme: 'I' },
  { number: 49, title: 'Un actif à la fois', skinNeed: 'par_ingredient', kind: 'product', theme: 'I' },
  { number: 50, title: 'Grossesse / allaitement', skinNeed: null, kind: 'education', theme: 'I' },
];

const BY_NUMBER = new Map(DOCUMENTED_SKIN_NEEDS.map(need => [need.number, need]));

export function documentedNeed(number: number): DocumentedSkinNeed | null {
  return BY_NUMBER.get(number) ?? null;
}

export function skinNeedForDocumentedNeed(number: number): SkinNeed | null {
  return documentedNeed(number)?.skinNeed ?? null;
}

/**
 * Les ids du fond 50 besoins sont `fond-50-n01` … `fond-50-n50`
 * (migration `20260927000000_sourcing_fond_positions`).
 */
export function documentedNeedFromSourcingItemId(id: string): number | null {
  const match = /^fond-50-n(\d+)$/i.exec(String(id || '').trim());
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number >= 1 && number <= 50 ? number : null;
}

/** Garde : chaque `skinNeed` posé ici existe dans la taxonomie boutique. */
export function mappingUsesOnlyExistingSkinNeeds(): boolean {
  return DOCUMENTED_SKIN_NEEDS.every(need => need.skinNeed == null || SKIN_NEED_VALUES.includes(need.skinNeed));
}
