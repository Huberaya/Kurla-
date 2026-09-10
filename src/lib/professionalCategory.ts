/**
 * Catégorie métier des professionnels vérifiés — et un seul prédicat « pro peau ».
 *
 * Pourquoi un module à part entière, et pas une condition écrite deux fois
 * dans deux pages :
 *
 * L'annuaire public (`/professionnels?cat=peau`) et la page d'accueil peau
 * filtraient chacun les pros peau avec leur propre condition. Elles ne
 * testaient pas la même chose : l'une cherchait « peau », l'autre
 * « skin »/« dermat ». Le bouton pouvait donc annoncer « Peau · 3 pros »
 * au-dessus d'une liste qui en affichait 5.
 *
 * Et surtout, les deux lisaient `profile.category` — un champ qui n'existait
 * ni dans la table `professional_profiles`, ni dans la candidature
 * (`professional_applications`), ni dans la réponse de l'API. La condition ne
 * devenait jamais vraie. Seuls remontaient les profils dont la profession ou
 * la spécialité contenaient « peau » : 4 des 6 pros peau seedés, par
 * coïncidence textuelle. Deux d'entre eux — un dermatologue et une
 * esthéticienne — étaient invisibles dans le filtre conçu pour eux.
 *
 * La colonne `category` est ajoutée par la migration 20260911000000 et
 * transportée jusqu'ici. Le repli sur la profession et la spécialité reste
 * nécessaire : la colonne est récente et le formulaire de candidature ne
 * demande pas encore la catégorie.
 */

/** Valeur de `category` pour un professionnel peau. */
export const SKINCARE_EXPERT = 'skincare_expert';

/** Catégories métier KURLA connues. Libre : un métier hors liste reste possible. */
export const PROFESSIONAL_CATEGORIES = [
  'braider',
  'loctician',
  'coiffeur_afro',
  'coiffeur_enfants',
  'barber',
  'wig_installer',
  SKINCARE_EXPERT
] as const;

/** Ce qu'on peut savoir d'un professionnel sans dépendre du type complet. */
export type ProfessionalCategoryInput = {
  category?: string | null;
  profession?: string | null;
  specialty?: string | null;
};

/**
 * Un professionnel exerce-t-il sur la peau ?
 *
 * `category` fait foi quand elle est renseignée. Sinon, on retombe sur la
 * profession et la spécialité déclarées. Un profil vide n'est jamais
 * supposé pro peau.
 */
export function isSkinProfessional(profile: ProfessionalCategoryInput | null | undefined): boolean {
  if (!profile) return false;
  if (profile.category === SKINCARE_EXPERT) return true;

  const profession = (profile.profession || '').toLowerCase();
  const declared = `${profile.specialty || ''} ${profile.profession || ''}`.toLowerCase();

  return declared.includes('peau') || profession.includes('skin') || profession.includes('dermat');
}
