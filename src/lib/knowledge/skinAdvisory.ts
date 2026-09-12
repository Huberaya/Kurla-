/**
 * KURLA SKIN — couche « conseil » du résultat de diagnostic.
 *
 * Constat (mesuré, 13/09/2026) : la base de connaissance `knowledge/skin`
 * était riche et vérifiée, mais le résultat du diagnostic ne l’exploitait
 * presque pas — la routine était identique pour tous les profils, les
 * justifications d’étape étaient génériques (voire placeholder), et un profil
 * sans profil de connaissance reconnu ne recevait rien. Le résultat donnait
 * l’impression d’un questionnaire vide de substance.
 *
 * Ce module transforme les réponses déclarées en un conseil complet :
 *
 *   1. **Routine contextuelle** — chaque étape porte un *pourquoi* (mécanisme
 *      lié au besoin déclaré), un *comment* (usage concret) et un *à attendre*
 *      (horizon honnête, zéro promesse de résultat).
 *   2. **Leçons** — 2 à 3 modules pédagogiques sélectionnés sur les
 *      préoccupations déclarées, chacun avec sa source.
 *   3. **Observations** — J+7 / J+14 / J+30, des questions concrètes et
 *      observables, spécifiques au thème principal.
 *   4. **Résumé personnalisé** — composé des réponses déclarées, jamais
 *      inventé : un champ inconnu n’est pas complété par déduction.
 *
 * Règle de fond (identique à `knowledge/skin`) : ces textes ne sont pas des
 * avis médicaux. Aucun diagnostic, aucun traitement, aucune prescription —
 * des règles de soin grand public, alignées sur la base de connaissance
 * KURLA Skin (HPI, barrière, SPF ISO 24444, tests whitecast internes).
 *
 * Contract (banc `kurla_diagnostic_advisory`) : déterministe, complet
 * (jamais de champ vide), sans phrase réservée aux autres modules, sans
 * vocabulaire médical, et inconnu = inconnu (pas de déduction).
 */

export interface SkinAdvisoryContext {
  skinType?: string;
  hydrationLevel?: string;
  sensitivity?: string;
  sensitivities?: string[];
  skinConcerns?: string[];
  skinObjectives?: string[];
  hyperpigmentationTendency?: string;
  spfUsage?: string;
  acne?: string;
}

export interface SkinAdvisoryStep {
  label: string;
  action: string;
  why: string;
  how: string;
  expect: string;
}

export interface SkinAdvisoryRoutine {
  morning: SkinAdvisoryStep[];
  evening: SkinAdvisoryStep[];
  weekly: SkinAdvisoryStep[];
}

export interface SkinLesson {
  key: string;
  title: string;
  lesson: string;
  source: string;
}

export interface SkinObservation {
  day: string;
  question: string;
}

const IGNORED = ['inconnu', 'inconnue', 'unknown', 'undefined', 'null', ''];

function declared(list: string[] | undefined | null): string[] {
  return (list || []).filter(value => typeof value === 'string' && !IGNORED.includes(value.trim()));
}

function isDeclared(value: string | undefined | null): value is string {
  return typeof value === 'string' && !IGNORED.includes(value.trim());
}

/** Flags de contexte dérivés des réponses — la routine et les leçons s’en servent. */
function contextFlags(ctx: SkinAdvisoryContext) {
  const concerns = declared(ctx.skinConcerns);
  const objectives = declared(ctx.skinObjectives);
  const skinType = isDeclared(ctx.skinType) ? ctx.skinType : '';
  const hydration = isDeclared(ctx.hydrationLevel) ? ctx.hydrationLevel : '';
  const sensitivity = isDeclared(ctx.sensitivity) ? ctx.sensitivity : '';
  const sensitivities = declared(ctx.sensitivities);
  const marks = isDeclared(ctx.hyperpigmentationTendency) ? ctx.hyperpigmentationTendency : '';

  return {
    concerns,
    objectives,
    oily: skinType === 'grasse' || hydration === 'brillante',
    dry: skinType === 'seche' || skinType === 'tres_seche' || hydration === 'seche',
    dehydrated:
      skinType === 'deshydratee' || hydration === 'deshydratee'
      || concerns.includes('deshydratation') || objectives.includes('hydrater'),
    sensitive:
      sensitivity === 'elevee' || skinType === 'sensible'
      || sensitivities.includes('sensible') || concerns.includes('sensibilite'),
    marks:
      concerns.includes('taches') || concerns.includes('teint_non_uniforme') || concerns.includes('cicatrices')
      || objectives.includes('attenuer_taches') || objectives.includes('uniformiser')
      || marks === 'frequente' || marks === 'occasionnelle',
    blemishes:
      concerns.includes('imperfections') || concerns.includes('points_noirs')
      || objectives.includes('reduire_imperfections')
      || ctx.acne === 'occasionnelle' || ctx.acne === 'reguliere',
    spfFocus:
      concerns.includes('protection_solaire') || objectives.includes('proteger_spf')
      || (isDeclared(ctx.spfUsage) && ctx.spfUsage !== 'quotidien')
      || concerns.includes('taches'),
    barrierFocus:
      objectives.includes('renforcer_barriere')
      || concerns.includes('rougeurs') || concerns.includes('secheresse') || concerns.includes('sensibilite'),
    grainFocus: concerns.includes('grain_irregulier') || concerns.includes('points_noirs') || objectives.includes('affiner_grain'),
    dull: concerns.includes('teint_terne') || objectives.includes('eclat'),
    antiAge: concerns.includes('rides') || concerns.includes('fermete') || concerns.includes('cernes') || objectives.includes('prevenir_age'),
  };
}

/* ------------------------------------------------------------------ */
/* 1. ROUTINE CONTEXTUELLE                                             */
/* ------------------------------------------------------------------ */

export function buildSkinAdvisoryRoutine(ctx: SkinAdvisoryContext): SkinAdvisoryRoutine {
  const f = contextFlags(ctx);
  const targetStep = f.marks || f.blemishes;
  const exfoliateOk = f.grainFocus && !f.sensitive && !f.barrierFocus;

  const morning: SkinAdvisoryStep[] = [
    {
      label: '1',
      action: 'Nettoyage doux',
      why: f.dry
        ? 'Retirer les résidus de nuit sans enlever les lipides : sur peau sèche, chaque lavage est une petite déshydratation qu’il faut compenser juste après.'
        : f.oily
          ? 'Retirer le sébum de nuit sans décaper la barrière : un nettoyage trop agressif provoque une brillance de réaction et des tiraillements.'
          : 'Retirer les résidus de nuit sans décaper la barrière : c’est la base de tout le reste, et la plus facile à gâcher.',
      how: 'Eau tiède, massage bref, rinçage sans frotter. Le matin, un seul passage suffit — le nettoyage complet est celui du soir.',
      expect: 'Confort immédiat : ni film gras, ni tiraillement. Si la peau tire après le nettoyage, c’est un signal à noter dans votre journal — pas un détail.',
    },
    {
      label: '2',
      action: targetStep
        ? 'Soin ciblé (fréquence progressive)'
        : (f.dry || f.barrierFocus) ? 'Hydratant + soutien de barrière' : 'Hydratant',
      why: f.marks
        ? 'Sur peau qui marque, l’étape ciblée agit sur le pigment en excès (niacinamide, acide azélaïque) : on travaille la cause de la tache, pas son maquillage. La régularité fait la différence, pas l’intensité.'
        : f.blemishes
          ? 'L’étape ciblée s’attaque aux imperfections à la source — inflammation et renouvellement — plutôt qu’au symptôme. L’objectif n’est pas d’assécher vite : c’est de calmer sans abîmer la barrière.'
          : f.dry || f.barrierFocus
            ? 'Retenir l’eau dans les couches de surface : l’hydratant attire l’eau, les lipides (céramides, squalane) la retiennent. C’est cette paire qui corrige les tiraillements.'
            : 'Retenir l’eau dans les couches de surface : c’est l’étape qui corrige les tiraillements et la sensation de peau « en manque ».',
      how: f.marks || f.blemishes
        ? 'Sur peau propre et légèrement humide, en couche fine. Introduire ce soin seul, avant tout autre changement, à une fréquence basse au départ — n’augmenter que si la tolérance le montre.'
        : f.dry
          ? 'Appliquer sur peau encore légèrement humide après le nettoyage : la peau capte l’eau et la retient plus longtemps.'
          : 'Appliquer sur peau propre et légèrement humide, en couche fine.',
      expect: f.marks || f.blemishes
        ? 'Les effets d’un actif ciblé s’évaluent à plusieurs semaines d’usage régulier — pas à quelques jours. Aucune amélioration d’un coup : c’est normal, et c’est précisément pourquoi on ne change pas tout.'
        : f.dry
          ? 'Confort et souplesse dès les premiers jours ; la régularité maintient l’hydratation jour après jour.'
          : 'Confort dès les premiers jours ; la régularité fait le reste.',
    },
    {
      label: '3',
      action: f.spfFocus ? 'SPF adapté à votre carnation' : 'SPF (dernier geste du matin)',
      why: 'Dernier geste du matin, même par temps couvert : les UV foncent les taches existantes et ternissent le teint, et ils passent à travers les nuages comme à travers les vitres latérales.',
      how: 'Deux doigts de produit pour le visage et le cou, en toute dernière étape avant de sortir. C’est le geste qu’on ne saute jamais.',
      expect: 'Le bon SPF est celui qu’on applique tous les jours : s’il laisse une trace blanche ou grise sur votre carnation, c’est le mauvais pour vous. KURLA ne promet « invisible » que si un test whitecast le prouve sur peau foncée.',
    },
  ];

  const evening: SkinAdvisoryStep[] = [
    {
      label: '1',
      action: 'Nettoyage complet',
      why: 'Retirer SPF, sébum et pollution : c’est la base de toute la routine du soir. Un SPF mal retiré, c’est une barrière encrassée qui tiraille et marque.',
      how: 'Premier geste pour dissoudre (huile ou baume si le SPF est épais), second geste au nettoyant doux, eau tiède. Deux gestes maximum — pas plus.',
      expect: 'Peau nette sans film gras, sans tiraillement. Le soir, la peau est la plus perméable : on soigne, on ne décape pas.',
    },
    {
      label: '2',
      action: f.blemishes
        ? 'Actif ciblé imperfections (fréquence progressive)'
        : f.marks
          ? 'Actif ciblé taches / HPI (fréquence progressive)'
          : 'Soin ciblé (un seul, si besoin)',
      why: f.blemishes
        ? 'Le soir, la peau se régénère et n’est pas exposée : c’est le moment des actifs ciblés (acide azélaïque, niacinamide). Calmer sans abîmer : une barrière fragilisée s’enflamme davantage et marque plus.'
        : f.marks
          ? 'Le soir, la peau se régénère et n’est pas exposée au soleil : c’est le moment des actifs ciblés sur le pigment. Fréquence progressive : on commence bas, on n’augmente que si la tolérance le montre.'
          : 'Le soir, la peau se régénère : c’est le moment d’un soin ciblé si vous en avez un — pas plus.',
      how: f.sensitive
        ? 'Un seul actif à la fois, jamais deux le même soir. En cas de réaction persistante, retirer les actifs et revenir au minimum (nettoyant + hydratant + SPF le matin) le temps que le confort revienne.'
        : 'Une couche fine sur peau propre. Introduire un seul produit nouveau, l’observer une semaine, avant d’en ajouter un autre.',
      expect: f.blemishes
        ? 'Une chaleur ou un picotement bref peut être tolérable ; brûlure, rougeur persistante ou tiraillement = trop. Compter huit à douze semaines d’usage régulier avant d’évaluer un actif : les marques, elles, s’estompent sur des mois.'
        : 'Toute réaction insistante (brûlure, rougeur qui dure) = le produit ne vous convient pas ou la dose est trop forte. On note, on espace, on retire si besoin.',
    },
    {
      label: '3',
      action: 'Crème barrière (si besoin)',
      why: 'Terminer par ce qui retient : l’hydratation s’évapore, la barrière la scelle. Sur peau qui tire la nuit, c’est l’étape qui change le réveil.',
      how: 'Une noisette, du centre du visage vers l’extérieur, en toute dernière étape du soir. Texture adaptée : gel ou lotion si brillance, crème ou baume si sécheresse.',
      expect: 'Réveil sans tiraillement. Si les squames persistent après plusieurs semaines de régularité, notez-le : c’est une information, pas un échec.',
    },
  ];

  const weekly: SkinAdvisoryStep[] = [
    {
      label: 'Hebdo',
      action: exfoliateOk ? 'Exfoliation douce (1×/semaine)' : 'Aucune exfoliation automatique',
      why: exfoliateOk
        ? 'Renouvellement de surface à fréquence limitée : l’exfoliation chimique douce aide le grain à se réguler sans frotter. Plus n’est pas mieux.'
        : 'L’exfoliant n’entre que quand la tolérance est établie et que la référence est documentée — pas avant. Une exfoliation sur barrière fragile, c’est une barrière plus fragile.',
      how: exfoliateOk
        ? 'Une seule exfoliation douce par semaine au départ, le soir, jamais le même soir qu’un actif fort. Espacer davantage si la peau tire ensuite.'
        : 'Rien à faire cette semaine — la base d’abord, l’actif ensuite.',
      expect: exfoliateOk
        ? 'Grain plus lisse et éclat plus net après plusieurs semaines. Toute réaction = espacer, pas intensifier.'
        : 'Votre peau est informée : l’exfoliation sera proposée quand la routine aura prouvé sa tolérance.',
    },
  ];

  return { morning, evening, weekly };
}

/* ------------------------------------------------------------------ */
/* 2. LEÇONS PÉDAGOGIQUES                                              */
/* ------------------------------------------------------------------ */

const SKIN_LESSONS: Record<string, SkinLesson> = {
  hpi: {
    key: 'hpi',
    title: 'Comprendre les taches post-inflammatoires (HPI)',
    lesson: 'Chaque inflammation — bouton, frottement, soleil — peut déclencher une surproduction locale de pigment. Sur peau riche en mélanine, cette marque peut persister plusieurs mois alors que l’irritation est passée. D’où la priorité absolue : éviter l’inflammation (ne pas percer, ne pas frotter) et protéger chaque jour des UV, qui foncent les marques existantes. Les actifs ciblés (niacinamide, acide azélaïque) s’évaluent à plusieurs semaines, pas à quelques jours.',
    source: 'Base de connaissance KURLA Skin — HPI & mélanine',
  },
  imperfections: {
    key: 'imperfections',
    title: 'Imperfections : calmer sans assécher',
    lesson: 'Assécher une imperfection n’est pas la traiter : une barrière abîmée s’enflamme davantage et marque plus — surtout sur peau riche en mélanine. Les actifs ciblés (acide azélaïque, niacinamide, BHA en usage hebdomadaire) travaillent à fréquence progressive : on commence léger et régulier, on n’augmente que si la tolérance le montre. Compter huit à douze semaines d’usage régulier avant d’évaluer un actif : les marques, elles, s’estompent sur des mois.',
    source: 'Base de connaissance KURLA Skin — imperfections',
  },
  hydratation: {
    key: 'hydratation',
    title: 'Sécheresse et déshydratation : deux problèmes différents',
    lesson: 'Une peau sèche manque de lipides ; une peau déshydratée manque d’eau — et une peau grasse peut aussi être déshydratée. L’hydratant (glycérine, acide hyaluronique) attire l’eau, la barrière (céramides, squalane) la retient : l’un sans l’autre, l’eau s’évapore. Appliquer l’hydratant sur peau encore légèrement humide aide la peau à capter l’eau et à la garder plus longtemps.',
    source: 'Base de connaissance KURLA Skin — hydratation',
  },
  sensibilite: {
    key: 'sensibilite',
    title: 'Peau sensible : la méthode du changement unique',
    lesson: 'Une peau réactive ne supporte pas d’apprendre trois nouveautés en même temps : si quelque chose pique, vous ne savez plus lequel. La règle : introduire un seul produit nouveau, l’observer une semaine, puis en introduire un autre. En cas de réaction persistante, retirer les actifs et revenir au minimum (nettoyant doux + hydratant + SPF) le temps que le confort revienne.',
    source: 'Base de connaissance KURLA Skin — tolérance',
  },
  spf: {
    key: 'spf',
    title: 'Le SPF, chaque jour — même sous un ciel gris',
    lesson: 'Les UV passent à travers les nuages et les vitres latérales, et ils foncent les taches existantes autant qu’ils en créent de nouvelles. Sur peau mélaninée, le critère n°1 n’est pas seulement l’indice : c’est un fini sans trace blanche (white cast), parce qu’un SPF qu’on n’aime pas est un SPF qu’on n’applique pas. L’indice est mesuré selon la norme ISO 24444 ; KURLA ne marque « invisible » que si un test whitecast le prouve sur peau foncée.',
    source: 'Base de connaissance KURLA Skin — SPF · norme ISO 24444 · tests whitecast KURLA',
  },
  exfoliation: {
    key: 'exfoliation',
    title: 'Exfolier : la dose fait la différence',
    lesson: 'Une exfoliation chimique douce en usage hebdomadaire aide le grain de peau à se renouveler sans frotter. Plus n’est pas mieux : une exfoliation trop fréquente fragilise la barrière, qui tire ensuite et réagit. Sur peau sensible ou barrière en cours de reconstruction, l’exfoliation attend : la base d’abord, l’actif ensuite.',
    source: 'Base de connaissance KURLA Skin — exfoliation',
  },
  eclat: {
    key: 'eclat',
    title: 'L’éclat commence par l’hydratation de surface',
    lesson: 'Un teint terne vient souvent d’un film corné épais et d’une déshydratation de surface : la peau renvoie mal la lumière. Avant tout actif « éclat », la base compte : hydratation en place, exfoliation douce occasionnelle, et SPF — les UV épaississent aussi la couche de surface. L’éclat est un effet de régularité, pas de produit miracle.',
    source: 'Base de connaissance KURLA Skin — éclat',
  },
  prevention: {
    key: 'prevention',
    title: 'Prévenir les signes visibles : la routine qui tient dans la durée',
    lesson: 'Ce qui est établi contre les signes visibles est d’abord préventif : SPF quotidien — les UV sont la première cause documentée du vieillissement cutané visible —, hydratation en place, et un seul actif à la fois si vous en introduisez. Les promesses « rajeunir » sont des promesses de marketing, pas de soin : ce qu’une routine peut faire, c’est soutenir la peau dans la durée — et KURLA ne vous promettra que ce que le soin peut faire.',
    source: 'Base de connaissance KURLA Skin — prévention',
  },
  barriere: {
    key: 'barriere',
    title: 'Votre barrière cutanée, votre première ligne',
    lesson: 'La barrière cutanée est une couche de cellules et de lipides (dont les céramides) qui retient l’eau et bloque les agressions extérieures. Quand elle est fragilisée — nettoyage trop agressif, frottements, climat sec — la peau tire, réagit et met plus de temps à se remettre. La renforcer, c’est d’abord ne pas l’abîmer : un nettoyant doux, un seul changement à la fois, et des textures qui soutiennent le confort plutôt que de le contraindre.',
    source: 'Base de connaissance KURLA Skin — barrière cutanée',
  },
  entretien: {
    key: 'entretien',
    title: 'Entretien : la routine courte qui tient',
    lesson: 'Quand la peau n’a pas de priorité forte, la meilleure routine est la plus courte qu’elle puisse tenir : nettoyage doux, hydratation, SPF le matin. Moins d’étapes, c’est moins de points de friction — et c’est plus facile à tenir sur des mois. Ce qui compte, c’est la régularité, pas la longueur de la liste.',
    source: 'Base de connaissance KURLA Skin — entretien',
  },
};

/**
 * Sélectionne 2 à 3 leçons selon les préoccupations déclarées.
 * L’ordre est le même que `pickSkinKnowledgeProfile` : HPI avant imperfections
 * (la marque est le coût durable de l’imperfection sur peau mélaninée),
 * puis hydratation, tolérance, SPF, exfoliation, éclat, prévention, barrière.
 * Jamais moins d’une leçon : un diagnostic qui n’enseigne rien n’est pas un
 * conseil.
 */
export function pickSkinLessons(ctx: SkinAdvisoryContext, max = 3): SkinLesson[] {
  const f = contextFlags(ctx);
  const order: string[] = [];
  if (f.marks) order.push('hpi');
  if (f.blemishes) order.push('imperfections');
  if (f.dry || f.dehydrated) order.push('hydratation');
  if (f.sensitive) order.push('sensibilite');
  if (f.spfFocus) order.push('spf');
  if (f.grainFocus) order.push('exfoliation');
  if (f.dull) order.push('eclat');
  if (f.antiAge) order.push('prevention');
  if (f.barrierFocus) order.push('barriere');
  const picked = order.slice(0, max);
  if (picked.length === 0) picked.push('entretien', 'spf');
  if (picked.length < 2) picked.push('barriere');
  return picked.map(key => SKIN_LESSONS[key]);
}

/* ------------------------------------------------------------------ */
/* 3. OBSERVATIONS SUIVIES (J+7 / J+14 / J+30)                          */
/* ------------------------------------------------------------------ */

const OBSERVATIONS: Record<string, SkinObservation[]> = {
  hpi: [
    { day: 'J+7', question: 'Aucune nouvelle inflammation depuis le début ? Ne pas percer, ne pas frotter : c’est la priorité n°1.' },
    { day: 'J+14', question: 'Les marques existantes : même teinte, plus foncées, plus claires ? Les UV changent la réponse — notez votre exposition.' },
    { day: 'J+30', question: 'La fréquence des marques a-t-elle évolué ? Une observation précise — c’est elle qui pilote l’ajustement de routine.' },
  ],
  imperfections: [
    { day: 'J+7', question: 'La peau est-elle plus à l’aise sous l’actif (moins de picotements) que la première semaine ?' },
    { day: 'J+14', question: 'Le volume d’imperfections est-il stable, en hausse, en baisse ? Notez-le sans jugement — c’est une donnée.' },
    { day: 'J+30', question: 'L’actif tient-il sa fréquence ? Un actif changé avant huit à douze semaines d’usage régulier n’est pas évalué.' },
  ],
  seche: [
    { day: 'J+7', question: 'Le réveil est-il sans tiraillement, y compris sur les joues ?' },
    { day: 'J+14', question: 'Les squames ont-elles diminué en quantité — surtout sur les zones de friction ?' },
    { day: 'J+30', question: 'Le confort tient-il après un nettoyage complet, pas seulement le matin ?' },
  ],
  deshydratation: [
    { day: 'J+7', question: 'La sensation d’« éponge » après le nettoyant est-elle atténuée ?' },
    { day: 'J+14', question: 'La brillance ou la rugosité de surface a-t-elle évolué en journée ?' },
    { day: 'J+30', question: 'L’hydratant seul tient-il la journée, ou faut-il renforcer l’étape barrière le soir ?' },
  ],
  sensibilite: [
    { day: 'J+7', question: 'Aucune rougeur ni réaction au nouveau produit ? Si oui : notez laquelle, on espacera ou retirera.' },
    { day: 'J+14', question: 'La tolérance est-elle stable jour après jour, y compris les jours de fatigue ou de météo capricieuse ?' },
    { day: 'J+30', question: 'Pouvez-vous maintenant alterner les étapes sans réaction — le signal que la peau a intégré la routine ?' },
  ],
  generic: [
    { day: 'J+7', question: 'La peau tire-t-elle moins après le nettoyage que la première semaine ?' },
    { day: 'J+14', question: 'Le confort tient-il sur la journée, sans pic de brillance ni de tiraillement ?' },
    { day: 'J+30', question: 'Qu’est-ce qui a changé — ou pas ? Notez une observation précise : c’est elle qui pilote l’ajustement de routine.' },
  ],
};

export function pickSkinObservations(ctx: SkinAdvisoryContext): SkinObservation[] {
  const f = contextFlags(ctx);
  if (f.marks) return OBSERVATIONS.hpi;
  if (f.blemishes) return OBSERVATIONS.imperfections;
  if (f.dry) return OBSERVATIONS.seche;
  if (f.dehydrated) return OBSERVATIONS.deshydratation;
  if (f.sensitive) return OBSERVATIONS.sensibilite;
  return OBSERVATIONS.generic;
}

/* ------------------------------------------------------------------ */
/* 4. RÉSUMÉ PERSONNALISÉ (jamais inventé)                              */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  normale: 'normale', seche: 'sèche', tres_seche: 'très sèche', grasse: 'grasse',
  mixte: 'mixte', sensible: 'sensible', deshydratee: 'déshydratée', mature: 'mature',
};
const SENSITIVITY_LABELS: Record<string, string> = {
  faible: 'peu sensible', moyenne: 'modérément sensible', elevee: 'très sensible',
};

const PRIORITY_LABELS: Record<string, string> = {
  secheresse: 'la sécheresse', deshydratation: 'la déshydratation', teint_terne: 'le teint terne',
  taches: 'les taches / HPI', rougeurs: 'les rougeurs', imperfections: 'les imperfections',
  points_noirs: 'les points noirs', grain_irregulier: 'le grain irrégulier', cicatrices: 'les cicatrices',
  rides: 'les rides', fermete: 'la fermeté', cernes: 'les cernes',
  protection_solaire: 'la protection solaire', sensibilite: 'la sensibilité', teint_non_uniforme: 'le teint non uniforme',
  hydrater: "l’hydratation", eclat: "l’éclat", uniformiser: "l’uniformité du teint",
  attenuer_taches: "l’atténuation des taches", apaiser: "l’apaisement",
  reduire_imperfections: "la réduction des imperfections", affiner_grain: "l’affinement du grain",
  renforcer_barriere: "le renforcement de la barrière", proteger_spf: "la protection solaire",
  prevenir_age: "la prévention des signes de l’âge", simplifier: "la simplicité de routine",
};

function labelPriority(value: string): string {
  return PRIORITY_LABELS[value] || value.replaceAll('_', ' ');
}

/**
 * Compose le résumé d’ouverture à partir des réponses déclarées uniquement.
 * Un champ inconnu n’est pas complété par déduction — il est dit en tant que
 * tel : c’est la règle « inconnu = inconnu » de la plateforme.
 */
export function buildSkinAdvisorySummary(ctx: SkinAdvisoryContext, priorities: string[]): string {
  const f = contextFlags(ctx);
  const parts: string[] = [];

  if (isDeclared(ctx.skinType)) {
    let sentence = `Votre peau : ${TYPE_LABELS[ctx.skinType] || ctx.skinType.replace('_', ' ')}.`;
    if (isDeclared(ctx.sensitivity)) sentence += ` Sensibilité ${SENSITIVITY_LABELS[ctx.sensitivity] || ctx.sensitivity.replace('_', ' ')}.`;
    parts.push(sentence);
  } else {
    parts.push('Vous n’avez pas encore caractérisé votre type de peau : KURLA s’appuie sur ce que vous avez déclaré, et rien d’autre.');
  }

  if (priorities.length > 0) {
    parts.push(`Vos priorités : ${priorities.slice(0, 3).map(labelPriority).join(', ')}.`);
  } else {
    parts.push('Aucune priorité précise déclarée : la routine reste une base d’entretien.');
  }

  const bridge =
    f.marks
      ? 'Sur peau riche en mélanine, chaque inflammation peut laisser une marque qui dure des mois : votre routine est donc construite pour ne pas en créer, et pour protéger ce qui existe déjà.'
      : f.blemishes
        ? 'L’objectif n’est pas d’assécher vite : c’est de calmer sans abîmer la barrière, car une barrière fragilisée s’enflamme davantage et marque plus.'
        : f.dry
          ? 'La priorité est de retenir l’eau et les lipides : hydratation en place, gestes doux, et SPF qu’on ne saute jamais.'
          : f.dehydrated
            ? 'Votre peau manque d’eau — même si elle brille parfois : l’étape clé est de capter l’eau au bon moment et de la retenir.'
            : f.sensitive
              ? 'Votre routine suit la règle du changement unique : un seul nouveau produit à la fois, observé une semaine.'
              : f.spfFocus
                ? 'Le SPF quotidien est au cœur de votre routine — c’est la protection que les autres étapes servent.'
                : 'Pas de priorité forte : la meilleure routine est la plus courte qu’elle puisse tenir.';
  parts.push(bridge);

  parts.push('Cette routine n’est pas une photo figée : à J+30, KURLA la réévalue à partir de vos observations et de votre journal, et vous montre les ajustements avec leurs raisons.');

  return parts.join(' ');
}

/** Note sur la boucle de réévaluation (L4) — exacte sur le déclencheur réel. */
export const ADVISORY_LOOP_NOTE =
  'À J+30, KURLA réévalue votre routine à partir de vos retours et de votre journal. '
  + 'Si votre profil a évolué — routine suivie, retours, observations — vous recevrez une recommandation d’évolution avec ses raisons. '
  + 'Sinon, aucun push : votre routine reste valable.';
