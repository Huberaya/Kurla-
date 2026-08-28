/**
 * CHANTIER 7.7 — Filtrage réglementaire par juridiction.
 *
 * Le graphe portait déjà les restrictions (`ingredient_jurisdiction_restrictions`)
 * et une fonction `checkJurisdiction`, mais rien ne s'en servait : aucune
 * recommandation, aucune fiche produit, aucun checkout ne les consultait. Une
 * formule légale dans l'UE peut être interdite ailleurs — et l'inverse.
 *
 * Trois principes, qui distinguent ce module d'un simple filtre :
 *
 * 1. **L'absence de donnée n'est pas une conformité.** Aucune ligne de
 *    restriction pour une juridiction donne le verdict `no_data`, jamais
 *    « conforme ». Dire « conforme » sans donnée serait une affirmation
 *    fabriquée.
 * 2. **Une concentration non déclarée n'est pas une infraction.** Un ingrédient
 *    réglementé dont la concentration n'est pas connue produit un avertissement
 *    explicite, pas un blocage : inventer la non-conformité serait aussi faux
 *    que de l'ignorer. En revanche, une concentration déclarée **au-dessus** de
 *    la limite rend le produit non commercialisable.
 * 3. **Chaque verdict cite sa base.** Le champ `reference` vient de la base
 *    (ex. Règlement (CE) n° 1223/2009, annexe III) ; rien n'est reconstitué ici.
 */

import type { JurisdictionRestriction, JurisdictionStatus } from './ingredientGraph';

/**
 * Pays desservis → juridiction réglementaire.
 *
 * KURLA ne livre que dans l'Union européenne (voir `SHIPPING_OPTIONS`), et le
 * droit cosmétique européen est unifié : le Règlement (CE) n° 1223/2009
 * s'applique identiquement en France et au Portugal. Un seul code de
 * juridiction, donc — pas huit tables de taux fantaisistes.
 */
export const JURISDICTION_BY_COUNTRY: Record<string, string> = {
  FR: 'EU',
  BE: 'EU',
  LU: 'EU',
  DE: 'EU',
  ES: 'EU',
  IT: 'EU',
  NL: 'EU',
  PT: 'EU',
};

/** Juridiction d'un pays de livraison, ou `null` si le pays n'est pas desservi. */
export function jurisdictionForCountry(country: unknown): string | null {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  return JURISDICTION_BY_COUNTRY[code] ?? null;
}

export interface DeclaredProductIngredient {
  ingredientId: string;
  /**
   * Concentration déclarée, en pourcentage. `null` quand elle n'est pas connue :
   * c'est le cas le plus fréquent, et il doit le rester visible.
   */
  declaredConcentrationPercent?: number | null;
  /**
   * D'où vient la concentration. `linked` : liaison structurée
   * `product_ingredients`. `declared_name` : lue dans le libellé déclaré
   * (« Acide Salicylique 1.5 % »). La provenance est affichée, jamais fondue
   * dans le verdict.
   */
  concentrationSource?: 'linked' | 'declared_name';
  /** Libellé d'origine, cité quand la concentration en est issue. */
  declaredLabel?: string;
}

/**
 * Sépare une concentration déclarée à même le libellé.
 *
 * Le catalogue réel écrit « Acide Salicylique 1.5 % » ou « Niacinamide 4 % » :
 * le pourcentage fait partie de la déclaration du marchand, pas du nom de
 * l'ingrédient. Le lire n'est pas deviner — c'est parser ce qui est écrit. Le
 * pourcentage reste signalé comme provenant du libellé (`declared_name`), jamais
 * confondu avec une liaison structurée `product_ingredients`.
 */
export function parseDeclaredIngredient(declared: unknown): {
  name: string;
  concentrationPercent: number | null;
} {
  const raw = typeof declared === 'string' ? declared.trim() : '';
  const match = raw.match(/(\d+(?:[.,]\d+)?)\s*%\s*$/);
  if (!match) return { name: raw, concentrationPercent: null };
  const parsed = Number(match[1].replace(',', '.'));
  return {
    name: raw.slice(0, match.index).trim(),
    concentrationPercent: Number.isFinite(parsed) ? parsed : null,
  };
}

export type ComplianceVerdict =
  /** Rien d'interdit ni de réglementé parmi les ingrédients connus. */
  | 'compliant'
  /** Au moins un ingrédient réglementé, sans dépassement constaté. */
  | 'restricted'
  /** Au moins un ingrédient interdit, ou une limite dépassée. */
  | 'prohibited'
  /** Statut explicitement `unknown` en base pour au moins un ingrédient. */
  | 'unverified'
  /** Aucune donnée réglementaire pour cette juridiction. */
  | 'no_data';

export interface ComplianceFinding {
  ingredientId: string;
  /** Provenance de la concentration confrontée à la limite. */
  concentrationSource: 'linked' | 'declared_name' | null;
  status: JurisdictionStatus;
  limitPercent: number | null;
  declaredConcentrationPercent: number | null;
  /** `null` quand la concentration déclarée est inconnue : on ne devine pas. */
  withinLimit: boolean | null;
  reference: string | null;
  message: string;
}

export interface ProductCompliance {
  verdict: ComplianceVerdict;
  jurisdiction: string;
  findings: ComplianceFinding[];
  /** Le produit peut-il être vendu dans cette juridiction ? */
  sellable: boolean;
  /** Ce que KURLA ne peut pas affirmer. Toujours exposé, jamais masqué. */
  limitations: string[];
}

const STATUS_ORDER: Record<ComplianceVerdict, number> = {
  prohibited: 0,
  restricted: 1,
  unverified: 2,
  compliant: 3,
  no_data: 4,
};

/**
 * Évalue la commercialisabilité d'un produit dans une juridiction.
 *
 * Fonction pure : ni base, ni réseau. Le checkout, la fiche produit et le banc
 * de test appellent exactement ce code.
 */
export function assessProductCompliance(input: {
  ingredients: DeclaredProductIngredient[];
  restrictions: Iterable<JurisdictionRestriction>;
  jurisdiction: string;
}): ProductCompliance {
  const jurisdiction = String(input.jurisdiction || '').trim().toUpperCase();
  if (!jurisdiction) throw new Error('Juridiction requise pour évaluer la conformité.');

  const declared = new Map<
    string,
    { concentration: number | null; source: 'linked' | 'declared_name' | null; label: string | null }
  >();
  for (const ingredient of input.ingredients || []) {
    if (!ingredient?.ingredientId) continue;
    const value = ingredient.declaredConcentrationPercent;
    declared.set(ingredient.ingredientId, {
      concentration: typeof value === 'number' && Number.isFinite(value) ? value : null,
      source: typeof value === 'number' && Number.isFinite(value)
        ? (ingredient.concentrationSource === 'declared_name' ? 'declared_name' : 'linked')
        : null,
      label: typeof ingredient.declaredLabel === 'string' && ingredient.declaredLabel.trim()
        ? ingredient.declaredLabel.trim()
        : null,
    });
  }

  const applicable = Array.from(input.restrictions || []).filter(
    restriction => String(restriction.jurisdiction || '').trim().toUpperCase() === jurisdiction
  );

  // Aucune donnée pour cette juridiction : on le dit, on ne conclut pas.
  const knownIds = new Set(applicable.map(restriction => restriction.ingredientId));
  const covered = [...declared.keys()].some(id => knownIds.has(id));
  if (applicable.length === 0 || !covered) {
    return {
      verdict: 'no_data',
      jurisdiction,
      findings: [],
      sellable: true,
      limitations: [
        `Aucune donnée réglementaire enregistrée pour ces ingrédients en ${jurisdiction}. ` +
        'Cela ne vaut pas conformité : le graphe KURLA ne couvre pas encore cette formule.',
      ],
    };
  }

  const findings: ComplianceFinding[] = [];
  for (const [ingredientId, entry] of declared) {
    const restriction = applicable.find(item => item.ingredientId === ingredientId);
    if (!restriction || restriction.status === 'allowed') continue;
    const declaredConcentration = entry.concentration;

    const limit = typeof restriction.limitPercent === 'number' && Number.isFinite(restriction.limitPercent)
      ? restriction.limitPercent
      : null;
    const withinLimit = restriction.status === 'restricted' && limit !== null && declaredConcentration !== null
      ? declaredConcentration <= limit
      : null;

    const message = restriction.status === 'prohibited'
      ? 'Ingrédient interdit dans cette juridiction : le produit n’y est pas commercialisable en l’état.'
      : restriction.status === 'restricted'
        ? withinLimit === true
          ? `Ingrédient réglementé (limite ${limit} %) : la concentration déclarée de ${declaredConcentration} % reste dans la limite.`
          : withinLimit === false
            ? `Ingrédient réglementé (limite ${limit} %) : la concentration déclarée de ${declaredConcentration} % dépasse la limite.`
            : `Ingrédient réglementé${limit !== null ? ` (limite ${limit} %)` : ''} : concentration non déclarée, conformité non vérifiable.`
        : 'Statut réglementaire inconnu dans cette juridiction : aucune garantie de conformité.';

    findings.push({
      ingredientId,
      concentrationSource: entry.source,
      status: restriction.status,
      limitPercent: limit,
      declaredConcentrationPercent: declaredConcentration,
      withinLimit,
      reference: restriction.reference ?? null,
      message,
    });
  }

  findings.sort((a, b) => (STATUS_ORDER[a.status === 'allowed' ? 'compliant' : a.status as ComplianceVerdict] ?? 9)
    - (STATUS_ORDER[b.status === 'allowed' ? 'compliant' : b.status as ComplianceVerdict] ?? 9));

  const prohibitedHit = findings.some(finding => finding.status === 'prohibited');
  const exceedsLimit = findings.some(finding => finding.withinLimit === false);
  const restrictedHit = findings.some(finding => finding.status === 'restricted' && finding.withinLimit !== false);
  const unknownHit = findings.some(finding => finding.status === 'unknown');

  const limitations: string[] = [];
  for (const finding of findings) {
    if (finding.concentrationSource !== 'declared_name') continue;
    const label = declared.get(finding.ingredientId)?.label;
    limitations.push(
      `La concentration de ${finding.ingredientId} (${finding.declaredConcentrationPercent} %) est lue dans ` +
      `le libellé déclaré${label ? ` « ${label} »` : ''}, pas dans une liaison structurée ` +
      '`product_ingredients`. Elle vaut déclaration du marchand, pas analyse de laboratoire.'
    );
  }
  if (findings.some(finding => finding.status === 'restricted' && finding.withinLimit === null)) {
    limitations.push(
      'Au moins une concentration n’est pas déclarée : la conformité à la limite réglementaire ' +
      'ne peut pas être vérifiée. KURLA ne la présume ni bonne ni mauvaise.'
    );
  }
  if (unknownHit) {
    limitations.push('Au moins un ingrédient a un statut explicitement inconnu dans cette juridiction.');
  }
  const uncovered = [...declared.keys()].filter(id => !knownIds.has(id));
  if (uncovered.length > 0) {
    limitations.push(
      `${uncovered.length} ingrédient(s) de la formule ne sont pas couverts par le graphe ` +
      `en ${jurisdiction} : leur statut réglementaire n'est pas connu de KURLA.`
    );
  }

  let verdict: ComplianceVerdict = 'compliant';
  if (prohibitedHit || exceedsLimit) verdict = 'prohibited';
  else if (restrictedHit) verdict = 'restricted';
  else if (unknownHit) verdict = 'unverified';

  return {
    verdict,
    jurisdiction,
    findings,
    sellable: verdict !== 'prohibited',
    limitations,
  };
}

/** Libellé court d'un verdict, pour l'affichage. */
export function complianceLabel(verdict: ComplianceVerdict): string {
  switch (verdict) {
    case 'compliant': return 'Aucune restriction connue';
    case 'restricted': return 'Ingrédient(s) réglementé(s)';
    case 'prohibited': return 'Non commercialisable dans cette juridiction';
    case 'unverified': return 'Statut réglementaire inconnu';
    case 'no_data': return 'Données réglementaires indisponibles';
    default: return 'Statut inconnu';
  }
}
