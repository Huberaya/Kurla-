/**
 * CHANTIER C-03 — LE PHOTOTYPE DEVIENT UNE DONNÉE.
 *
 * Avant ce module, KURLA ne savait pas techniquement qui elle servait.
 * `SkinBeautyProfile` existait, il était typé, il portait `toneDepth` — et
 * **aucun code ne le lisait**. Le diagnostic peau (`DiagnosticSkinPage`)
 * n'écrivait rien nulle part : il affichait un résultat et s'arrêtait là.
 *
 * Conséquence : le positionnement « peaux riches en mélanine » était vrai dans
 * la communication et inexistant dans le système. Impossible de personnaliser
 * pour la mélanine, impossible de constituer un jeu de données, impossible de
 * rien prouver.
 *
 * Ce module est volontairement pur — aucune dépendance à React, au navigateur
 * ni à la base : le banc l'appelle directement, et le diagnostic comme le
 * moteur de recommandation utilisent exactement le même code.
 */

/** Échelle de Fitzpatrick, à six niveaux. */
export type Fitzpatrick = 1 | 2 | 3 | 4 | 5 | 6;

export interface PhototypeInfo {
  level: Fitzpatrick;
  label: string;
  /** Comportement au soleil — le critère clinique réel de l'échelle. */
  sunReaction: string;
  /** Teintes typiques. Donné à titre indicatif, jamais comme critère unique. */
  typicalTones: string;
  /** Riche en mélanine au sens où l'entend KURLA (phototypes IV à VI). */
  melaninRich: boolean;
}

export const FITZPATRICK: Record<Fitzpatrick, PhototypeInfo> = {
  1: {
    level: 1,
    label: 'Phototype I',
    sunReaction: 'Brûle toujours, ne bronze jamais.',
    typicalTones: 'Très claire, souvent avec des taches de rousseur.',
    melaninRich: false
  },
  2: {
    level: 2,
    label: 'Phototype II',
    sunReaction: 'Brûle facilement, bronze difficilement.',
    typicalTones: 'Claire.',
    melaninRich: false
  },
  3: {
    level: 3,
    label: 'Phototype III',
    sunReaction: 'Brûle parfois, bronze progressivement.',
    typicalTones: 'Claire à mate.',
    melaninRich: false
  },
  4: {
    level: 4,
    label: 'Phototype IV',
    sunReaction: 'Brûle rarement, bronze facilement.',
    typicalTones: 'Mate.',
    melaninRich: true
  },
  5: {
    level: 5,
    label: 'Phototype V',
    sunReaction: 'Brûle très rarement, bronze intensément.',
    typicalTones: 'Mate à foncée.',
    melaninRich: true
  },
  6: {
    level: 6,
    label: 'Phototype VI',
    sunReaction: 'Ne brûle pratiquement jamais.',
    typicalTones: 'Foncée à très foncée.',
    melaninRich: true
  }
};

export const FITZPATRICK_LEVELS: Fitzpatrick[] = [1, 2, 3, 4, 5, 6];

/**
 * Seuil à partir duquel KURLA considère la peau comme riche en mélanine.
 *
 * Phototypes IV à VI : c'est la population sur laquelle la littérature
 * documente une précision moindre des systèmes d'analyse cutanée, et celle
 * que KURLA s'est donné pour mission de mieux servir.
 */
export const MELANIN_RICH_THRESHOLD: Fitzpatrick = 4;

/** Normalise une saisie quelconque en phototype valide, ou `null`. */
export function normalizePhototype(value: unknown): Fitzpatrick | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6) {
    return value as Fitzpatrick;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (/^[1-6]$/.test(cleaned)) return Number(cleaned) as Fitzpatrick;
    const found = FITZPATRICK_LEVELS.find(level => FITZPATRICK[level].label === cleaned);
    if (found) return found;
  }
  return null;
}

/** Peau riche en mélanine : phototypes IV, V et VI. */
export function isMelaninRich(phototype: Fitzpatrick | null | undefined): boolean {
  if (phototype == null) return false;
  return phototype >= MELANIN_RICH_THRESHOLD;
}

export interface PhototypeImplications {
  /** Un SPF à fini invisible devient une exigence, pas une préférence. */
  invisibleSunscreenRequired: boolean;
  /** Le risque de marques post-inflammatoires est le risque dominant. */
  postInflammatoryRisk: 'élevé' | 'modéré' | 'standard';
  /** Actifs à manier avec prudence : l'agression elle-même pigment. */
  cautionWithActives: string[];
  /** Points de vigilance à afficher à l'utilisatrice. */
  watchpoints: string[];
}

/**
 * Ce que le phototype change concrètement dans les recommandations.
 *
 * Ces implications sont cosmétiques, jamais médicales. Elles traduisent des
 * réponses physiologiques documentées — pas des généralités sur une carnation.
 */
export function phototypeImplications(phototype: Fitzpatrick | null | undefined): PhototypeImplications {
  if (!isMelaninRich(phototype)) {
    return {
      invisibleSunscreenRequired: false,
      postInflammatoryRisk: 'standard',
      cautionWithActives: [],
      watchpoints: []
    };
  }

  const level = phototype as Fitzpatrick;

  return {
    invisibleSunscreenRequired: true,
    postInflammatoryRisk: level >= 5 ? 'élevé' : 'modéré',
    cautionWithActives: [
      'Acides exfoliants à forte concentration',
      'Rétinoïdes introduits trop rapidement',
      'Gommages mécaniques abrasifs',
      'Peelings et actes professionnels non encadrés'
    ],
    watchpoints: [
      'Toute inflammation — bouton, frottement, coup de soleil — peut laisser une marque pigmentée durable.',
      'Un SPF à fini invisible est indispensable : un filtre minéral classique laisse un voile blanc ou gris.',
      'La patience est un facteur de résultat : l’atténuation des marques se compte en semaines, pas en jours.',
      'Avant tout acte professionnel (peeling, laser), demander un avis à un praticien formé aux peaux pigmentées.'
    ]
  };
}

/**
 * Question de recueil, posée telle quelle à l'utilisatrice.
 *
 * On demande le **comportement au soleil**, pas la couleur perçue : c'est le
 * critère clinique de l'échelle de Fitzpatrick, et il évite de réduire une
 * personne à une teinte. Une même carnation peut correspondre à deux
 * phototypes différents.
 */
export const PHOTOTYPE_QUESTION = 'Comment votre peau réagit-elle au soleil, sans protection ?';

export const PHOTOTYPE_OPTIONS: Array<{ value: Fitzpatrick; label: string; help?: string }> = [
  { value: 1, label: 'Elle brûle toujours, ne bronze jamais' },
  { value: 2, label: 'Elle brûle facilement, bronze difficilement' },
  { value: 3, label: 'Elle brûle parfois, bronze progressivement' },
  { value: 4, label: 'Elle brûle rarement, bronze facilement' },
  { value: 5, label: 'Elle brûle très rarement, bronze intensément' },
  { value: 6, label: 'Elle ne brûle pratiquement jamais' }
];

/**
 * Consentement exigé avant tout enregistrement du phototype.
 *
 * Le phototype est une donnée sensible au sens du RGPD : il renseigne sur
 * l'origine ethnique. Il n'est donc enregistré qu'après un consentement
 * explicite, distinct du consentement général du profil beauté, et il est
 * effaçable comme tout le reste.
 */
export const PHOTOTYPE_CONSENT_TEXT =
  'J’accepte que KURLA enregistre mon phototype. Cette information permet d’adapter les recommandations '
  + 'au comportement de ma peau — notamment le risque de marques pigmentaires. C’est une donnée sensible : '
  + 'je peux la retirer à tout moment depuis mon espace personnel.';
