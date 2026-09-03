/**
 * Sources d'inscription à la liste de lancement — source unique.
 *
 * Ce module existe pour une raison précise : une adresse e-mail collectée sans
 * savoir ce que la personne attendait ne sert à rien. « Prévenez-moi quand la
 * gamme peau arrive » et « inscrivez-moi à la newsletter du lancement » sont
 * deux intentions différentes, et la relance ne peut pas être la même.
 *
 * La liste est **fermée** : accepter une source arbitraire ouvrirait un canal
 * permettant d'écrire n'importe quoi dans `launch_leads` depuis l'extérieur.
 * Toute valeur hors liste est ramenée à la source par défaut, jamais refusée —
 * une inscription vaut mieux qu'une erreur, mais une inscription mal étiquetée
 * ne vaut pas mieux qu'une inscription perdue.
 */

export const DEFAULT_WAITLIST_SOURCE = 'home_waitlist';

export const WAITLIST_SOURCES: readonly string[] = [
  DEFAULT_WAITLIST_SOURCE,
  'categorie_peau',
  'categorie_hommes',
  'categorie_enfants'
];

/**
 * Ramène une source demandée à une source connue.
 *
 * Vide, absente ou inconnue → `home_waitlist`. Insensible à la casse et aux
 * espaces autour, parce que la valeur arrive d'un client web.
 */
export function normalizeWaitlistSource(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_WAITLIST_SOURCE;
  const candidate = value.trim();
  return WAITLIST_SOURCES.includes(candidate) ? candidate : DEFAULT_WAITLIST_SOURCE;
}
