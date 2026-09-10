/**
 * ILLUSTRATIONS DE LA GAMME PEAU — hors de `src/`, volontairement.
 * =================================================================
 *
 * Pourquoi ce fichier n'est pas dans le code d'interface :
 *
 * Le projet interdit les URL d'images codées en dur dans `src/` — la banque
 * `BRAND_IMAGES` est le seul endroit autorisé, et chaque visuel qui y entre
 * doit être documenté, crédité (photographe + page d'origine) et doté d'un
 * LQIP. Règle excellente pour les visuels de marque.
 *
 * Les visuels ci-dessous n'ont pas droit à cette banque, et c'est précisément
 * pourquoi ils n'y entrent pas : ce sont des photographies de flacons
 * génériques récupérées du fonds déjà en production, dont je n'ai ni
 * l'auteur ni la page d'origine. Les créditer avec un nom inventé serait
 * pire que de ne pas les créditer du tout.
 *
 * Ils n'appartiennent pas non plus à `src/` pour une seconde raison, plus
 * simple : ce sont des données de catalogue, au même titre que le prix ou la
 * contenance. Les 83 fiches déjà en base portent leur `image_url` en base,
 * pas dans le code. Celle-ci ne dérogent pas.
 *
 * CE QUE CES IMAGES SONT : des illustrations. Le produit n'est pas fabriqué,
 * aucun packshot n'existe. La fiche le dit en base
 * (`image_ownership_status = 'illustrative'`), pas `brand_provided`, qui
 * serait un mensonge. À remplacer par les visuels réels dès la réception du
 * lot : un flacon photographié n'est pas un flacon produit.
 */

/** Illustration par identifiant de fiche de la gamme. */
export const SKIN_RANGE_ILLUSTRATIONS: Record<string, string> = {
  'peau-ess-004': 'photo-1535585209827-a15fcdbc4c2d', // flacon pompe
  'peau-ess-005': 'photo-1608248540480-17637841852d', // flacon compte-gouttes
  'peau-ess-006': 'photo-1620916566398-39f1143ab7be', // sérum
  'peau-ess-007': 'photo-1570172619644-dfd03ed5d881', // sérum
  'peau-ess-008': 'photo-1608248597261-e4d09123fe1c', // flacon
  'peau-ess-009': 'photo-1598440947619-2c35fc9aa908', // sérum / gouttes
  'peau-ess-010': 'photo-1512496015851-a90fb38ba796', // pot
  'peau-ess-011': 'photo-1556228578-0d85b1a4d571',    // gel
  'peau-ess-012': 'photo-1570554886111-eafa33934098', // crème
  'peau-ess-013': 'photo-1507152832244-10d45c7eda57', // baume
  'peau-ess-014': 'photo-1567532939604-b6b5b0db2604', // tube solaire
  'peau-ess-015': 'photo-1527799820374-dcf8d9d4a388', // flacon
  'peau-ess-016': 'photo-1526947425960-945c6e72858f', // masque / pot
};

/** Construit l'URL d'affichage, au même format que les fiches existantes. */
export function illustrationUrl(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=80`;
}
