import type { HairStyle, HairTexture } from '../types';

/**
 * DIAGNOSTIC ADAPTATIF (chantier diagnostic, consigne 18/09).
 *
 * Après la texture (Q1) et le coiffage (Q2), le diagnostic INSERTE une
 * question dédiée au profil déclaré : « Et pour vos locks, qu'est-ce qui
 * compte le plus pour vous ? » — les besoins et problèmes réels des gens de
 * CE profil, EN PLUS des questions existantes (qui restent intactes).
 *
 * Discipline du contenu (règle de la plateforme) : connaissance de soin
 * courante et documentée pour chaque segment — zéro invention, zéro
 * promesse médicale. Chaque option porte les `needs` du vocabulaire
 * EXISTANT de la plateforme (hydrater_cheveux, reduire_casse, cuir_chevelu,
 * entretenir_locks, entretenir_tresses, entretenir_perruque, definir_boucles)
 * : la réponse pilote ainsi le choix des produits, des cartes de
 * connaissances et le prompt IA, sans nouveau vocabulaire à inventorier.
 *
 * Fonction PURE et déterministe (banc `kurla_diagnostic_segments`) : même
 * (texture, style) → même segment, même question, mêmes options.
 */

/** Vocabulaire des besoins existants — rien d'autre n'est admis ici. */
export const KNOWN_DIAGNOSTIC_NEEDS = [
  'hydrater_cheveux',
  'reduire_casse',
  'definir_boucles',
  'cuir_chevelu',
  'entretenir_tresses',
  'entretenir_locks',
  'entretenir_perruque',
] as const;

export type DiagnosticNeed = (typeof KNOWN_DIAGNOSTIC_NEEDS)[number];

export type HairSegmentId =
  | 'locks'
  | 'protective'
  | 'wig'
  | 'enfant'
  | 'transition'
  | 'naturel_cresp'
  | 'naturel_boucle';

export interface SegmentFocusOption {
  /** Id stable, préfixé par le segment : `locks_allonger`, `prot_tension`… */
  id: string;
  title: string;
  desc: string;
  /** Besoins existants que cette préoccupation pilote (produits, cartes, IA). */
  needs: DiagnosticNeed[];
}

export interface HairDiagnosticSegment {
  id: HairSegmentId;
  /** Libellé court du profil affiché (« En locks », « En tresses / twists »…). */
  label: string;
  /** La question insérée après Q2. */
  question: string;
  options: SegmentFocusOption[];
}

const SEGMENTS: Record<HairSegmentId, HairDiagnosticSegment> = {
  locks: {
    id: 'locks',
    label: 'En locks',
    question: 'Et pour vos locks, qu’est-ce qui compte le plus pour vous ?',
    options: [
      { id: 'locks_allonger', title: 'Allonger mes locks sans les casser', desc: 'La longueur se gagne par la régularité du retwist et la fibre intacte.', needs: ['entretenir_locks', 'reduire_casse'] },
      { id: 'locks_propre', title: 'Un lavage en profondeur, sans dépôt', desc: 'Le buildup (produit qui s’accumule) est l’ennemi n°1 des locks.', needs: ['entretenir_locks', 'cuir_chevelu'] },
      { id: 'locks_cuirs', title: 'Le confort du cuir chevelu entre les locks', desc: 'Démangeaisons, sécheresse ou tiraillements sous la lock.', needs: ['cuir_chevelu', 'entretenir_locks'] },
      { id: 'locks_regularite', title: 'Régularité et forme (retwist, palm rolling)', desc: 'Des locks qui se resserrent de façon régulière, sans mat.', needs: ['entretenir_locks'] },
      { id: 'locks_douceur', title: 'Douceur, frizz et tenue au quotidien', desc: 'Des locks souples qui gardent leur forme entre deux lavages.', needs: ['hydrater_cheveux', 'entretenir_locks'] },
    ],
  },
  protective: {
    id: 'protective',
    label: 'En tresses / twists',
    question: 'Et pour votre coiffure protectrice, qu’est-ce qui compte le plus ?',
    options: [
      { id: 'prot_tension', title: 'Zéro tension aux racines et aux edges', desc: 'La traction est la première cause de casse et de perte en racine.', needs: ['reduire_casse', 'cuir_chevelu'] },
      { id: 'prot_cuirs', title: 'Le cuir chevelu sous la coiffure', desc: 'Netteté, confort et respiration du cuir chevelu plusieurs semaines.', needs: ['cuir_chevelu', 'entretenir_tresses'] },
      { id: 'prot_duree', title: 'Faire durer la coiffure propre et nette', desc: 'Rafraîchir les racines sans défaire la coiffure.', needs: ['entretenir_tresses', 'definir_boucles'] },
      { id: 'prot_lavage', title: 'Le bon rythme de lavage sans tout démêler', desc: 'Laver en profondeur, section par section, sans tirer les longueurs.', needs: ['entretenir_tresses', 'hydrater_cheveux'] },
      { id: 'prot_longueurs', title: 'Nourrir les longueurs protégées', desc: 'Les longueurs restent sous la coiffure : l’hydratation doit les atteindre.', needs: ['hydrater_cheveux', 'entretenir_tresses'] },
    ],
  },
  wig: {
    id: 'wig',
    label: 'En perruque / tissage',
    question: 'Et avec votre perruque ou tissage, qu’est-ce qui compte le plus ?',
    options: [
      { id: 'wig_cuirs', title: 'Le confort du cuir chevelu sous la pose', desc: 'Fraîcheur et apaisement du cuir chevelu pendant toute la durée de la pose.', needs: ['cuir_chevelu', 'entretenir_perruque'] },
      { id: 'wig_edges', title: 'Protéger les racines et les edges', desc: 'Les racines naturelles restent les zones les plus fragiles sous une pose.', needs: ['reduire_casse'] },
      { id: 'wig_transpiration', title: 'Transpiration et fraîcheur au quotidien', desc: 'Vivre la pose sans inconfort, même les jours chauds.', needs: ['cuir_chevelu'] },
      { id: 'wig_entretien', title: 'Entretenir perruque / tissage entre deux poses', desc: 'Lavage, séchage et rangement pour prolonger la durée de vie.', needs: ['entretenir_perruque'] },
    ],
  },
  enfant: {
    id: 'enfant',
    label: 'Cheveux d’enfant',
    question: 'Et pour la chevelure de votre enfant, qu’est-ce qui compte le plus ?',
    options: [
      { id: 'enf_demeler', title: 'Démêler sans larmes', desc: 'Un démêlage doux, sans douleur ni arrachage.', needs: ['hydrater_cheveux', 'reduire_casse'] },
      { id: 'enf_patience', title: 'Des gestes rapides et calmes', desc: 'Une routine courte qu’un enfant accepte de faire.', needs: ['hydrater_cheveux'] },
      { id: 'enf_cuirs', title: 'Apaiser le cuir chevelu de l’enfant', desc: 'Tiraillements, sécheresse ou gratouilles du cuir chevelu.', needs: ['cuir_chevelu'] },
      { id: 'enf_texture', title: 'Respecter et protéger sa texture', desc: 'Soutenir la fibre fragile d’un enfant sans alourdir.', needs: ['definir_boucles', 'hydrater_cheveux'] },
    ],
  },
  transition: {
    id: 'transition',
    label: 'Défrisée / en transition',
    question: 'Et pour vos cheveux défrisés ou en transition, qu’est-ce qui compte le plus ?',
    options: [
      { id: 'trans_ligne', title: 'La zone de démarcation', desc: 'La frontière entre racines naturelles et longueurs traitées est la plus fragile.', needs: ['reduire_casse', 'hydrater_cheveux'] },
      { id: 'trans_melanges', title: 'Gérer les deux textures ensemble', desc: 'Deux types de fibre dans la même chevelure : deux besoins différents.', needs: ['definir_boucles', 'hydrater_cheveux'] },
      { id: 'trans_fibre', title: 'Renforcer la fibre sensibilisée', desc: 'Les cheveux traités cassent plus : la priorité est la solidité.', needs: ['reduire_casse', 'hydrater_cheveux'] },
      { id: 'trans_racines', title: 'Nourrir les racines naturelles', desc: 'Les nouvelles pousses non traitées redemandent hydratation et douceur.', needs: ['hydrater_cheveux', 'reduire_casse'] },
    ],
  },
  naturel_cresp: {
    id: 'naturel_cresp',
    label: 'Crépues au naturel',
    question: 'Et pour vos cheveux crépus portés au naturel, qu’est-ce qui compte le plus ?',
    options: [
      { id: 'cresp_hydratation', title: 'Rétention d’hydratation au quotidien', desc: 'Le 4C perd son humidité vite : la routine la garde.', needs: ['hydrater_cheveux'] },
      { id: 'cresp_demelage', title: 'Démêler sans casse ni douleur', desc: 'La fibre fine et resserrée se démêle humide, avec de la glisse.', needs: ['reduire_casse', 'hydrater_cheveux'] },
      { id: 'cresp_definir', title: 'Définir les boucles sans cartonner', desc: 'Du définition et de la souplesse, pas un effet coque.', needs: ['definir_boucles'] },
      { id: 'cresp_longueur', title: 'Gérer le rétrécissement et la longueur', desc: 'Suivre sa vraie longueur malgré le shrinkage important.', needs: ['hydrater_cheveux', 'reduire_casse'] },
    ],
  },
  naturel_boucle: {
    id: 'naturel_boucle',
    label: 'Bouclés / frisés au naturel',
    question: 'Et pour vos boucles portées au naturel, qu’est-ce qui compte le plus ?',
    options: [
      { id: 'boucle_definition', title: 'Définir les boucles sans cartonner', desc: 'La forme de la boucle, avec de la souplesse.', needs: ['definir_boucles'] },
      { id: 'boucle_frisottis', title: 'Réduire les frisottis', desc: 'Des boucles nettes, sans aspect broussaille.', needs: ['definir_boucles', 'hydrater_cheveux'] },
      { id: 'boucle_hydratation', title: 'Hydrater sans alourdir', desc: 'De l’humidité dans la boucle, pas de poids qui l’écrase.', needs: ['hydrater_cheveux'] },
      { id: 'boucle_longueur', title: 'Soutenir la pousse et les longueurs', desc: 'Moins de casse, des pointes propres, une pousse qui se garde.', needs: ['reduire_casse', 'hydrater_cheveux'] },
    ],
  },
};

/**
 * Résout le segment du profil (texture, coiffage). Ordre des règles :
 *   1. coiffure enfant      → le contexte enfant prime sur tout,
 *   2. locks (texture OU style) → la lock est la forme du cheveu lui-même,
 *   3. perruque / tissage  → le soin se concentre sur le cuir chevelu et la pose,
 *   4. coiffure protectrice (tresses / twists / « protectrice »),
 *   5. défrisée / transition → la fibre traitée dicte la routine,
 *   6. texture portée au naturel (crépue ou frisée/bouclée).
 * Aucun segment ne correspond (texture inconnue + coiffage neutre) → null :
 * la question adaptative n’est pas posée, le parcours reste à 8 questions.
 */
export function getHairDiagnosticSegment(texture: string | undefined, style: string | undefined): HairDiagnosticSegment | null {
  const t = String(texture ?? '').toLowerCase();
  const s = String(style ?? '').toLowerCase();
  if (s === 'enfant') return SEGMENTS.enfant;
  if (t === 'locksee' || s === 'locks') return SEGMENTS.locks;
  if (s === 'wig') return SEGMENTS.wig;
  if (t === 'protective' || s === 'braids' || s === 'twists') return SEGMENTS.protective;
  if (t === 'defrisee' || s === 'defrise') return SEGMENTS.transition;
  if (s === 'naturel') {
    if (t === 'crepue') return SEGMENTS.naturel_cresp;
    if (t === 'frisee' || t === 'bouclee') return SEGMENTS.naturel_boucle;
  }
  return null;
}

/** Options d'un segment, en sécurité (segment inconnu → aucune option). */
export function getSegmentOptions(segmentId: string | undefined): SegmentFocusOption[] {
  if (!segmentId) return [];
  return (SEGMENTS as Record<string, HairDiagnosticSegment | undefined>)[segmentId]?.options || [];
}

/** L'option choisie (id) de la question adaptative, ou null si inconnue. */
export function getSegmentFocus(segmentId: string | undefined, focusId: string | undefined): SegmentFocusOption | null {
  if (!focusId) return null;
  return getSegmentOptions(segmentId).find(option => option.id === focusId) || null;
}

/** Recherche d'une option dans TOUS les segments (les ids sont préfixés par le segment). */
function findFocusOptionAnywhere(focusId: string | undefined): SegmentFocusOption | null {
  if (!focusId) return null;
  for (const segment of Object.values(SEGMENTS)) {
    const option = segment.options.find(o => o.id === focusId);
    if (option) return option;
  }
  return null;
}

/** Les needs existants pilotés par la préoccupation déclarée (ou []). */
export function getSegmentFocusNeeds(focusId: string | undefined): DiagnosticNeed[] {
  return findFocusOptionAnywhere(focusId)?.needs || [];
}

/** Libellé court de la préoccupation déclarée (affichage page résultat). */
export function getSegmentFocusLabel(focusId: string | undefined): string {
  return findFocusOptionAnywhere(focusId)?.title || '';
}

/** Toutes les combinaisons (texture, style) du questionnaire — pour le banc. */
export const ALL_HAIR_TEXTURES: HairTexture[] = ['bouclee', 'frisee', 'crepue', 'locksee', 'defrisee', 'protective', 'inconnue'];
export const ALL_HAIR_STYLES: HairStyle[] = ['naturel', 'braids', 'twists', 'locks', 'wig', 'defrise', 'enfant'];
