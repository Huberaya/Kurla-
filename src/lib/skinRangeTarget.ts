/**
 * GAMME PEAU KURLA — fiches de FORMULATION CIBLE.
 * ==============================================
 *
 * Pourquoi ce fichier existe :
 *
 * Les 16 fiches peau (`peau-ess-001` à `016`) sont publiées et actives en base,
 * mais la porte de publiabilité les écarte : leur `source_supplier` porte
 * « formulation interne (précommande) », donc l'application les classe
 * `formulation_target`. C'est exact, et ce n'est pas un bug à corriger — c'est
 * la règle posée en B-08 : **la formulation visée d'un produit non fabriqué
 * n'est pas sa composition**. Les sortir du catalogue par un coup de tournevis
 * (forcer les champs à « verified », garder les visuels d'emprunt) reviendrait
 * à fabriquer des preuves réglementaires pour des cosmétiques.
 *
 * Elles restaient donc invisibles, ce qui est un autre défaut : seize fiches
 * décrites, sourcées et testées que personne ne peut lire.
 *
 * La réponse n'est pas de les rendre achetables, c'est de les rendre **lisibles
 * comme ce qu'elles sont** : une gamme en cours de formulation, avec sa formule
 * cible, la préoccupation visée, et une liste d'attente. Jamais un prix
 * ferme, jamais un stock, jamais un visuel produit.
 *
 * Trois interdits tenus par la projection, et vérifiés par le banc :
 *
 * 1. Aucun visuel (`image` est toujours vide). Elles n'ont pas de packshot.
 * 2. Aucune disponibilité : ni stock, ni « en vente », ni panier. Le RSA est
 *    la liste d'attente, comme pour les rayons annoncés mais vides.
 * 3. L'INCI est étiqueté `formuleCible`, jamais `composition` ou `inci` : un
 *    champ nommé ainsi finirait par être lu comme une composition réelle par
 *    le premier écran venu, ce qui est précisément ce que B-08 interdit.
 */

import { isFormulationTarget } from './catalogTruth';
import { inciListe } from './cosmeticCompliance';

/** Les quatre temps d'une routine peau, dans l'ordre où ils s'appliquent. */
export type GroupeEtapePeau = 'nettoyant' | 'traitement' | 'hydratant' | 'spf';

export interface GroupeEtapeDefinition {
  id: GroupeEtapePeau;
  label: string;
  /** Ce que le groupe fait dans la routine, en une phrase. */
  role: string;
}

export const GROUPES_ETAPE_PEAU: GroupeEtapeDefinition[] = [
  { id: 'nettoyant', label: 'Nettoyer', role: 'Retirer sans décaper : c’est l’étape qui conditionne tout le reste.' },
  { id: 'traitement', label: 'Traiter', role: 'Un actif, une préoccupation. Un seul nouveau à la fois — c’est le seul moyen de savoir ce qui agit.' },
  { id: 'hydratant', label: 'Hydrater', role: 'Soutenir la barrière cutanée. Sans elle, les actifs irritent au lieu d’agir.' },
  { id: 'spf', label: 'Protéger', role: 'Sur peau riche en mélanine, c’est l’étape qui prévient les marques durables. Elle ne se repousse pas.' },
];

/**
 * Rang d'un groupe, pour ordonner l'affichage sans dépendre de l'ordre du
 * tableau ci-dessus (qu'un réagencement visuel ne doit pas casser).
 */
export function rangGroupeEtape(groupe: GroupeEtapePeau): number {
  return GROUPES_ETAPE_PEAU.findIndex(entry => entry.id === groupe);
}

/**
 * Déduit le groupe d'étape à partir du libellé métier.
 *
 * La base porte un libellé lisible (« Nettoyant doux », « Sérum niacinamide »)
 * et non un code d'étape : le groupe est donc déduit, jamais stocké. Le
 * défaut est `traitement` — un soin qu'on ne sait pas ranger est un soin
 * actif, et il vaut mieux le classer là (où la prudence est de mise) que
 * dans l'hydratation, où il passerait pour anodin.
 */
export function groupeEtapePeau(routineStep: string, name = ''): GroupeEtapePeau {
  const texte = `${routineStep} ${name}`.toLowerCase();
  if (/(spf|solair|protection)/.test(texte)) return 'spf';
  if (/(nettoyant|micellaire|demaquill|démaquill)/.test(texte)) return 'nettoyant';
  // Le masque est un soin ponctuel (1 à 2 fois par semaine), pas un hydratant quotidien.
  if (/(hydratant|creme|crème|baume)/.test(texte)) return 'hydratant';
  return 'traitement';
}

/**
 * Une fiche telle qu'elle peut être MONTRÉE — pas telle qu'elle est stockée.
 *
 * Le nom porte « cible » et chaque champ qui n'est pas arrêté le dit. Rien
 * ici ne doit pouvoir se lire comme une offre commerciale.
 */
export interface FicheCiblePeau {
  id: string;
  name: string;
  slug: string;
  /** Jamais une URL : ces produits n'ont pas de visuel. Toujours `''`. */
  image: '';
  groupe: GroupeEtapePeau;
  /** Libellé métier d'origine, conservé tel quel. */
  routineStep: string;
  subCategory: string;
  sizeLabel: string;
  texture: string;
  usageFrequency: string;
  concerns: string[];
  skinTypes: string[];
  /** Actifs annoncés, tels que saisis. Ne sont pas la composition. */
  actifsAnnonces: string[];
  /** INCI visé, explicitement non industrialisé. */
  formuleCible: string;
  /** Prix de travail, indicatif et non engageant. */
  prixCible: number | null;
  benefitPrimary: string;
  forWho: string;
  notIdealIf: string;
  howToUse: string;
  /** Ce qu'on peut honnêtement promettre — donc rien. */
  availabilityState: 'formulation_target';
  avertissement: string;
}

export const AVERTISSEMENT_CIBLE = 'Formule cible, non industrialisée : la composition finale, le prix et la disponibilité ne sont pas arrêtés. Aucun de ces soins n’est en vente.';

function lireChamp(product: any, ...cles: string[]): any {
  for (const cle of cles) {
    if (product?.[cle] !== undefined && product?.[cle] !== null) return product[cle];
  }
  return undefined;
}

function enTableau(valeur: unknown): string[] {
  return Array.isArray(valeur) ? valeur.map(item => String(item)) : [];
}

/**
 * Vrai pour une fiche de formulation cible de la gamme peau.
 *
 * On ne réimplémente pas la règle : on appelle `isFormulationTarget`, qui lit
 * le marqueur posé par B-08 (source, statut ou badge). Le marqueur, pas
 * l'état des preuves : `commercialState` vaut `'formulation_target'` dès
 * qu'il manque une preuve, et quatre fiches de démonstration du catalogue
 * (« aucun sourcing réel ») tombent alors dans le même état. Les prendre
 * pour des cibles KURLA afficherait « Milk Marvel » et « Black Girl
 * Sunscreen » — deux marques tierces — dans la gamme en cours de formulation.
 * Mesuré : 20 fiches de catégorie peau, 16 cibles réelles, 4 démonstrations.
 */
export function estFicheCiblePeau(product: unknown): boolean {
  if (!product || typeof product !== 'object') return false;
  const p = product as Record<string, unknown>;
  const categorie = String(lireChamp(p, 'category') ?? '').toLowerCase();
  if (categorie !== 'peau') return false;
  return isFormulationTarget(p);
}

/**
 * Projette une fiche cible vers ce qui est montrable.
 *
 * Toute donnée absente reste absente : un champ vide n'est pas complété, un
 * prix non arrêté n'est pas arrondi. La fiche dit « cible » et c'est tout ce
 * qu'elle promet.
 */
export function projeterFicheCiblePeau(product: any): FicheCiblePeau {
  const routineStep = String(lireChamp(product, 'routineStep', 'routine_step') ?? '');
  const name = String(lireChamp(product, 'name') ?? '');
  const prix = Number(lireChamp(product, 'price'));
  return {
    id: String(lireChamp(product, 'id') ?? ''),
    name,
    slug: String(lireChamp(product, 'slug') ?? ''),
    image: '',
    groupe: groupeEtapePeau(routineStep, name),
    routineStep,
    subCategory: String(lireChamp(product, 'subCategory', 'subcategory') ?? ''),
    sizeLabel: String(lireChamp(product, 'sizeLabel', 'size_label') ?? ''),
    texture: String(lireChamp(product, 'texture') ?? ''),
    usageFrequency: String(lireChamp(product, 'usageFrequency', 'usage_frequency') ?? ''),
    concerns: enTableau(lireChamp(product, 'concerns')),
    skinTypes: enTableau(lireChamp(product, 'skinTypes', 'skin_types')),
    actifsAnnonces: enTableau(lireChamp(product, 'ingredients', 'keyIngredients', 'key_ingredients')),
    // `inciListe` retire le marqueur « [Formulation cible] » posé par la
    // migration B-08. Sans ce retrait, la page afficherait le marqueur en
    // clair — « [Formulation cible] Aqua, Niacinamide… » — alors qu'elle
    // dit déjà « Formule cible » dans son intitulé. La page reste ainsi
    // identique avant et après l'exécution de la migration.
    formuleCible: inciListe(product),
    prixCible: Number.isFinite(prix) && prix > 0 ? prix : null,
    benefitPrimary: String(lireChamp(product, 'benefitPrimary', 'benefit_primary') ?? ''),
    forWho: String(lireChamp(product, 'forWho', 'for_who') ?? ''),
    notIdealIf: String(lireChamp(product, 'notIdealIf', 'not_ideal_if') ?? ''),
    howToUse: String(lireChamp(product, 'howToUse', 'how_to_use') ?? ''),
    availabilityState: 'formulation_target',
    avertissement: AVERTISSEMENT_CIBLE,
  };
}

/** Trie par temps de routine, puis par nom : l'ordre doit se lire comme une routine. */
export function trierFichesCibles(fiches: FicheCiblePeau[]): FicheCiblePeau[] {
  return [...fiches].sort((a, b) => {
    const ecart = rangGroupeEtape(a.groupe) - rangGroupeEtape(b.groupe);
    return ecart !== 0 ? ecart : a.name.localeCompare(b.name, 'fr');
  });
}
/**
 * Libellés lisibles des préoccupations et des types de peau.
 *
 * Les valeurs de la base sont des clés (`taches_hyperpigmentation`), pas des
 * libellés : les afficher telles quelles donnerait « taches hyperpigmentation »
 * au milieu d'une phrase française. La table est fermée et ne couvre que les
 * valeurs réellement portées par les seize fiches — une clé inconnue est
 * rendue lisible (espaces au lieu des tirets bas) plutôt que remplacée : on
 * n'invente pas un libellé, on se contente de ne pas l'abîmer.
 */
export const LIBELLES_PREOCCUPATIONS: Record<string, string> = {
  taches_hyperpigmentation: 'Taches / HPI',
  hydrater_peau: 'Hydratation',
  imperfections_acne: 'Imperfections',
  peau_sensible: 'Peau sensible',
  barriere_cutanee: 'Barrière cutanée',
  eclat_teint_terne: 'Éclat / teint terne',
  maturite_rides: 'Rides / fermeté',
  protection_solaire: 'Protection solaire'
};

export const LIBELLES_TYPES_PEAU: Record<string, string> = {
  mixte: 'Mixte',
  grasse: 'Grasse',
  seche: 'Sèche',
  tres_seche: 'Très sèche',
  sensible: 'Sensible',
  normale: 'Normale'
};

export function libellerCle(valeur: string, table: Record<string, string>): string {
  return table[valeur] ?? valeur.replace(/_/g, ' ');
}
