/**
 * SIMULATEUR DE COÛT ANNUEL & COMPARATEUR DE ROUTINES.
 *
 * Le prix affiché en rayon est un prix d'entrée, pas un coût. Un shampooing à
 * 9 € qui dure trois semaines coûte plus cher à l'année qu'un shampooing à 24 €
 * qui dure six mois. Aucune fiche produit ne le dit, parce que le rendement
 * n'est presque jamais déclaré.
 *
 * Règle héritée du moteur : quand le rendement n'est pas déclaré, le coût n'est
 * PAS estimé. `computeUsageCost` renvoie déjà `null` avec une limitation ; ce
 * module propage cette honnêteté à l'échelle d'une routine entière. Un total
 * partiel est affiché comme partiel, jamais comme un total.
 */

import { computeUsageCost, parseYieldMonths, UsageCost } from './recommendationEngine';

export interface CostLineItem {
  id: string;
  label: string;
  price: number;
  estimatedYield?: string;
  /** Fréquence d'usage déclarée, en fois par semaine. */
  usesPerWeek?: number;
}

export interface CostLine {
  id: string;
  label: string;
  price: number;
  monthsOfUse: number | null;
  monthlyCost: number | null;
  annualCost: number | null;
  /** Dit pourquoi le coût n'a pas pu être calculé. */
  limitation?: string;
}

export interface AnnualCostSimulation {
  lines: CostLine[];
  /** Somme des coûts annuels calculables. */
  annualTotalKnown: number | null;
  monthlyTotalKnown: number | null;
  /** Nombre d'articles dont le rendement n'est pas déclaré. */
  unknownCount: number;
  /** `true` si au moins un article manque : le total n'est pas un total. */
  partial: boolean;
  limitations: string[];
  statement: string;
}

/**
 * Coût annuel d'un article. Retourne `null` si le rendement n'est pas déclaré —
 * jamais une estimation, parce qu'une estimation affichée comme un calcul est
 * exactement le mensonge que KURLA reproche aux fiches produit.
 */
export function annualCostOf(item: Pick<CostLineItem, 'price' | 'estimatedYield'>): { annual: number | null; monthly: number | null; months: number | null; limitation?: string } {
  const usage: UsageCost = computeUsageCost({ price: item.price, estimatedYield: item.estimatedYield });
  if (usage.monthlyCost === null) {
    return { annual: null, monthly: null, months: null, limitation: usage.limitation };
  }
  return {
    annual: Number((usage.monthlyCost * 12).toFixed(2)),
    monthly: usage.monthlyCost,
    months: usage.monthsOfUse
  };
}

export function simulateAnnualCost(items: Iterable<CostLineItem>): AnnualCostSimulation {
  const list = Array.from(items);
  const lines: CostLine[] = list.map(item => {
    const cost = annualCostOf(item);
    return {
      id: item.id,
      label: item.label,
      price: item.price,
      monthsOfUse: cost.months,
      monthlyCost: cost.monthly,
      annualCost: cost.annual,
      limitation: cost.limitation
    };
  });

  const known = lines.filter(line => line.annualCost !== null);
  const unknownCount = lines.length - known.length;
  const partial = unknownCount > 0;

  const annualTotalKnown = known.length > 0
    ? Number(known.reduce((sum, line) => sum + (line.annualCost as number), 0).toFixed(2))
    : null;
  const monthlyTotalKnown = annualTotalKnown === null ? null : Number((annualTotalKnown / 12).toFixed(2));

  const limitations: string[] = [];
  if (partial) {
    limitations.push(
      `${unknownCount} article(s) sur ${lines.length} n'ont pas de rendement déclaré : le total ci-dessus est partiel et sous-estime le coût réel.`
    );
  }
  if (lines.length === 0) {
    limitations.push('Aucun article à évaluer.');
  }
  limitations.push(
    'Le calcul suppose un usage régulier au rythme déclaré. Il ne tient pas compte des promotions, des changements de routine ni des produits terminés plus vite que prévu.'
  );

  const statement = annualTotalKnown === null
    ? 'Aucun coût annuel calculable : aucun article ne déclare son rendement.'
    : partial
      ? `Au moins ${annualTotalKnown.toFixed(2)} € par an pour les ${known.length} article(s) dont le rendement est déclaré. Ce n'est pas un total complet.`
      : `${annualTotalKnown.toFixed(2)} € par an, soit environ ${monthlyTotalKnown?.toFixed(2)} € par mois.`;

  return { lines, annualTotalKnown, monthlyTotalKnown, unknownCount, partial, limitations, statement };
}

// ---------------------------------------------------------------------------
// COMPARATEUR DE ROUTINES
// ---------------------------------------------------------------------------

export interface RoutineProfile {
  id: string;
  label: string;
  items: CostLineItem[];
  /** Minutes par jour déclarées. */
  minutesPerDay?: number;
}

export interface RoutineComparisonItem {
  label: string;
  a: number | null;
  b: number | null;
  /** Écart en faveur du plus avantageux, ou null si incomparable. */
  difference: number | null;
  better: 'a' | 'b' | 'equal' | 'incomparable';
  unit: string;
}

export interface RoutineComparison {
  a: { id: string; label: string };
  b: { id: string; label: string };
  rows: RoutineComparisonItem[];
  /** Ce que la comparaison ne permet pas de trancher. */
  limitations: string[];
  verdict: string;
}

function compareMetric(label: string, a: number | null, b: number | null, unit: string): RoutineComparisonItem {
  if (a === null || b === null) {
    return { label, a, b, difference: null, better: 'incomparable', unit };
  }
  const difference = Number(Math.abs(a - b).toFixed(2));
  const better = difference === 0 ? 'equal' : a < b ? 'a' : 'b';
  return { label, a, b, difference, better, unit };
}

/**
 * Compare deux routines sur le coût et le temps — les deux seules dimensions
 * objectivement comparables sans juger de l'efficacité, que KURLA ne peut pas
 * mesurer sans données longitudinales.
 *
 * Un écart de prix n'est jamais présenté comme un verdict de qualité.
 */
export function compareRoutines(profileA: RoutineProfile, profileB: RoutineProfile): RoutineComparison {
  const costA = simulateAnnualCost(profileA.items);
  const costB = simulateAnnualCost(profileB.items);

  const rows: RoutineComparisonItem[] = [
    compareMetric('Coût annuel connu', costA.annualTotalKnown, costB.annualTotalKnown, '€'),
    compareMetric('Coût mensuel connu', costA.monthlyTotalKnown, costB.monthlyTotalKnown, '€'),
    compareMetric('Articles au rendement non déclaré', costA.unknownCount, costB.unknownCount, 'article(s)'),
    compareMetric('Prix d\'achat initial',
      profileA.items.reduce((sum, item) => sum + item.price, 0),
      profileB.items.reduce((sum, item) => sum + item.price, 0), '€'),
    compareMetric('Articles', profileA.items.length, profileB.items.length, 'article(s)'),
    compareMetric('Minutes par jour', profileA.minutesPerDay ?? null, profileB.minutesPerDay ?? null, 'min')
  ];

  const limitations: string[] = [];
  if (costA.partial || costB.partial) {
    limitations.push(
      'Au moins une des deux routines contient des articles sans rendement déclaré : la comparaison de coût porte sur une base incomplète et peut s\'inverser une fois les rendements connus.'
    );
  }
  limitations.push(
    'Cette comparaison porte sur le coût et le temps. Elle ne dit pas quelle routine est plus efficace pour votre texture : cela demanderait des données de résultat que KURLA n\'a pas sur ces produits.'
  );

  const costRow = rows[0];
  const verdict = costRow.better === 'incomparable'
    ? 'Comparaison de coût impossible : le rendement n\'est pas déclaré d\'au moins un des deux côtés.'
    : costRow.better === 'equal'
      ? 'Coût annuel identique sur les articles comparables.'
      : `${costRow.better === 'a' ? profileA.label : profileB.label} revient moins cher à l'année, avec un écart de ${costRow.difference?.toFixed(2)} € — sur les seuls articles dont le rendement est déclaré.`;

  return {
    a: { id: profileA.id, label: profileA.label },
    b: { id: profileB.id, label: profileB.label },
    rows,
    limitations,
    verdict
  };
}

/** Réexport pour les écrans : le parseur de rendement reste la seule source de vérité. */
export { parseYieldMonths };
