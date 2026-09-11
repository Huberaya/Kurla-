/**
 * COMPARAISON DE PRODUITS — ce qui compte, pas ce qui est affichable.
 * ==================================================================
 *
 * La boutique comparait déjà deux à trois produits côte à côte, mais sur
 * quatre lignes : prix, texture, format, pays. Autrement dit, sur ce qui est
 * renseigné partout, pas sur ce qui aide à choisir.
 *
 * Comparer deux shampoings au prix est un mauvais service : un flacon de
 * 400 ml à 18 € revient moins cher à l'usage qu'un 250 ml à 12 €. KURLA
 * sait calculer cela — `estimerUsage` (D-04) dose chaque catégorie d'après
 * les quantités appliquées du SCCS/1647/22 — et ne le montrait nulle part
 * dans le comparateur. Le seul chiffre qui départage réellement deux
 * produits était absent de l'écran fait pour les départager.
 *
 * Deux règles tenues ici :
 *
 * 1. Une catégorie non couverte par la table de référence ne reçoit aucun
 *    chiffre. `estimerUsage` renvoie alors une `limitation` : on l'affiche à
 *    la place du nombre, jamais un chiffre arrangé.
 * 2. Aucun score, aucun « meilleur choix ». Le comparateur montre les écarts,
 *    il ne conclut pas : deux produits ne se départagent pas seuls, la
 *    décision dépend d'un cheveu et d'une routine.
 */

import { estimerUsage } from './usageDosage';

export interface LigneComparaison {
  /** Libellé affiché dans la colonne de gauche. */
  champ: string;
  /** Une valeur par produit, dans l'ordre des produits comparés. */
  valeurs: string[];
  /** Vrai quand les produits ne se valent pas sur ce champ. */
  divergent: boolean;
  /**
   * Vrai pour les lignes issues d'une estimation. Elles portent une
   * hypothèse — dose et fréquence — que la page doit afficher.
   */
  estimation?: boolean;
}

export interface ComparaisonProduits {
  lignes: LigneComparaison[];
  /** Hypothèses de calcul, une par produit, quand elles existent. */
  hypotheses: string[];
  /** Vrai si au moins un produit n'a pas pu être estimé. */
  estimationsIncompletes: boolean;
}

function argent(valeur: number | null): string {
  return valeur === null ? '—' : `${valeur.toFixed(2)} €`;
}

function liste(valeur: string[] | undefined): string {
  return valeur && valeur.length > 0 ? valeur.join(', ') : 'Non renseigné';
}

/**
 * Construit les lignes de comparaison.
 *
 * Une ligne est « divergente » dès que les produits ne portent pas la même
 * valeur : c'est la seule information qu'un comparateur doit mettre en avant,
 * le reste étant identique et donc inutile à relire trois fois.
 */
export function comparerProduits(produits: any[]): ComparaisonProduits {
  const estimations = produits.map(produit => estimerUsage(produit));

  const brut: { champ: string; valeurs: string[]; estimation?: boolean }[] = [
    { champ: 'Marque', valeurs: produits.map(p => String(p?.brand || 'Non renseignée')) },
    { champ: 'Prix', valeurs: produits.map(p => argent(Number.isFinite(Number(p?.price)) ? Number(p.price) : null)) },
    {
      champ: 'Coût par utilisation',
      estimation: true,
      valeurs: estimations.map(estimation => estimation.costPerUse === null
        ? estimation.limitation || 'Non estimable'
        : argent(estimation.costPerUse)),
    },
    {
      champ: 'Coût par mois',
      estimation: true,
      valeurs: estimations.map(estimation => estimation.monthlyCost === null
        ? '—'
        : argent(estimation.monthlyCost)),
    },
    {
      champ: 'Durée estimée',
      estimation: true,
      valeurs: estimations.map(estimation => estimation.monthsOfUse === null
        ? '—'
        : `${estimation.monthsOfUse.toFixed(1)} mois`),
    },
    { champ: 'Actifs clés', valeurs: produits.map(p => liste(p?.keyIngredients)) },
    { champ: 'Texture', valeurs: produits.map(p => String(p?.texture || 'Non renseignée')) },
    { champ: 'Format', valeurs: produits.map(p => String(p?.sizeLabel || 'Non renseigné')) },
    { champ: 'Pays', valeurs: produits.map(p => liste(p?.countryAvailability)) },
  ];

  const lignes: LigneComparaison[] = brut.map(ligne => ({
    ...ligne,
    divergent: new Set(ligne.valeurs).size > 1,
  }));

  return {
    lignes,
    hypotheses: estimations.map(estimation => estimation.assumption || ''),
    estimationsIncompletes: estimations.some(estimation => estimation.costPerUse === null),
  };
}

/**
 * Les champs sur lesquels les produits diffèrent réellement.
 *
 * Sert à résumer la comparaison en une phrase plutôt que de laisser relire
 * neuf lignes : « ces deux produits diffèrent sur 3 points ».
 */
export function pointsDeDivergence(comparaison: ComparaisonProduits): string[] {
  return comparaison.lignes.filter(ligne => ligne.divergent).map(ligne => ligne.champ);
}
