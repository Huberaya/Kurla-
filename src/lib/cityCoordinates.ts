/**
 * Coordonnées approximatives (x/y en % sur la carte stylisée) pour les villes
 * où un pro peut exercer. La carte est une silhouette France/Europe très
 * stylisée (viewBox 0 0 100 100), pas un fond Mapbox : on place donc chaque
 * ville manuellement.
 *
 * Hors zone (Dakar, Abidjan…) = placé sur la frange sud avec un badge
 * « Afrique » — la carte reste lisible, le pro reste trouvable via le filtre.
 */

export interface CityCoord { x: number; y: number; region: string }

export const CITY_COORDS: Record<string, CityCoord> = {
  // France
  'paris': { x: 48, y: 32, region: 'Île-de-France' },
  'lyon': { x: 62, y: 58, region: 'Auvergne-Rhône-Alpes' },
  'nantes': { x: 28, y: 44, region: 'Pays de la Loire' },
  'marseille': { x: 68, y: 78, region: 'PACA' },
  'bordeaux': { x: 32, y: 68, region: 'Nouvelle-Aquitaine' },
  'lille': { x: 50, y: 18, region: 'Hauts-de-France' },
  'toulouse': { x: 42, y: 75, region: 'Occitanie' },
  'strasbourg': { x: 72, y: 28, region: 'Grand Est' },
  'nice': { x: 74, y: 82, region: 'PACA' },
  'rennes': { x: 26, y: 36, region: 'Bretagne' },
  'montpellier': { x: 58, y: 78, region: 'Occitanie' },
  'angers': { x: 31, y: 48, region: 'Pays de la Loire' },
  'dijon': { x: 62, y: 42, region: 'Bourgogne' },
  'grenoble': { x: 68, y: 62, region: 'Auvergne-Rhône-Alpes' },
  // Benelux / Europe proche
  'bruxelles': { x: 52, y: 16, region: 'Belgique' },
  'brussel': { x: 52, y: 16, region: 'Belgique' },
  'anvers': { x: 50, y: 14, region: 'Belgique' },
  'amsterdam': { x: 54, y: 8, region: 'Pays-Bas' },
  'luxembourg': { x: 58, y: 22, region: 'Luxembourg' },
  'londres': { x: 38, y: 12, region: 'UK' },
  'london': { x: 38, y: 12, region: 'UK' },
  // Afrique de l'Ouest (placés sur la frange sud, hors silhouette)
  'dakar': { x: 12, y: 92, region: 'Sénégal' },
  'abidjan': { x: 22, y: 92, region: 'Côte d’Ivoire' },
  'bamako': { x: 18, y: 92, region: 'Mali' },
  'conakry': { x: 8, y: 92, region: 'Guinée' },
  'casablanca': { x: 28, y: 90, region: 'Maroc' },
  'alger': { x: 48, y: 90, region: 'Algérie' },
  'tunis': { x: 62, y: 90, region: 'Tunisie' },
};

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Retourne une coordonnée pour une ville, même inconnue. Les villes inconnues
 * sont dispersées de façon déterministe dans la moitié basse de la carte pour
 * rester visibles sans se superposer au centre.
 */
export function coordForCity(cityRaw: string): CityCoord {
  const key = cityRaw.trim().toLowerCase();
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // fallback déterministe
  const h = hashString(key);
  const x = 20 + (h % 60); // 20..80
  const y = 30 + ((h >> 8) % 55); // 30..85
  return { x, y, region: cityRaw };
}
