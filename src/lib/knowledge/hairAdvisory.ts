import { getSegmentFocusLabel } from '../diagnosticSegments';
import { deriveHairObservations } from './diagnosticDerivations';

/**
 * KURLA HAIR — couche « conseil » du résultat de diagnostic cheveux.
 *
 * Miroir exact du travail fait pour la peau (knowledge/skinAdvisory) :
 * le résultat du diagnostic cheveux porte désormais un conseil complet,
 * déterministe et pédagogique, composé des réponses déclarées :
 *
 *   1. **Routine contextuelle** — Jour de lavage / Entre deux lavages /
 *      À faire chaque semaine. Chaque étape porte un *pourquoi* (mécanisme
 *      lié au besoin déclaré), un *comment* (usage concret) et un
 *      *à attendre* (horizon honnête, zéro promesse de résultat).
 *   2. **Leçons** — 2 à 3 modules pédagogiques sélectionnés sur les
 *      priorités déclarées, chacun avec sa source.
 *   3. **Observations** — J+7 / J+14 / J+30, des questions concrètes et
 *      observables, spécifiques au thème principal.
 *   4. **Résumé personnalisé** — composé des réponses déclarées, jamais
 *      inventé : un champ inconnu n’est pas complété par déduction.
 *
 * Règle de fond : ces textes ne sont pas des avis médicaux. Aucun
 * diagnostic, aucune prescription — des règles de soin grand public,
 * alignées sur la base de connaissance KURLA Cheveux (hydratation & LCO,
 * fibre & casse, cuir chevelu, coiffures protectrices, locks, enfant).
 *
 * Séparation des modules (bancs `kurla_need_depth`, `kurla_skin_knowledge`) :
 * ce module ne redit aucune phrase réservée aux profils style/cuir chevelu
 * (styleFit, needsHub) — en particulier « texture fluide », « seule zone
 * réellement accessible », « occlusif de la formule », « retirez la
 * perruque la nuit », « lavage clarifiant régulier ».
 *
 * Contract (banc `kurla_hair_advisory`) : déterministe, complet (jamais de
 * champ vide), sans phrase réservée aux autres modules, sans vocabulaire
 * médical, et inconnu = inconnu (pas de déduction).
 */

export interface HairAdvisoryContext {
  texture?: string;    // crepue | frisee | locksee | protective | defrisee | inconnue
  style?: string;      // naturel | braids | twists | locks | wig | enfant
  /** Question adaptative (segment texture+coiffage) : id d'option de préoccupation. */
  focus?: string;
  priority?: string;   // hydratation | casse | definition | pousse | cuir_chevelu | demelage_enfant
  porosity?: string;   // forte | faible | moyenne | inconnue
  scalp?: string;      // normal | sec | demangeaisons | pellicules | irritation
  frequency?: string;  // less_1x | 1x_semaine | 2x_semaine | irreguliere (+ 'debutante' hérité → expérience)
  budget?: string;     // moins_40 | 40_70 | 70_100 | premium
  /** D4 : longueur réellement portée (courte | moyenne | longue). */
  length?: string;
  /** D4 : expérience capillaire (debutante | habituee | expert). */
  experience?: string;
  /** D9 (20/09) — les quatre réponses qui manquaient au diagnostic crépu :
   *  sous-motif (4a|4b|4c|inconnu), élasticité (ressort|mou|cassant|inconnu),
   *  largeur (fine|moyenne|epaisse|inconnue), passé chaleur/chimie
   *  (aucun|chaleur|produit|les_deux|inconnue). Absentes = comportement d'avant. */
  coilyPattern?: string;
  elasticity?: string;
  strandWidth?: string;
  chemicalHeat?: string;
  /** D10 (20/09) — bouclés 3B–3C au naturel : séchage + fixant déclarés, pour
   *  caler la méthode sur l'habitude réelle au lieu de la réciter. */
  curlyDry?: string;
  curlyHold?: string;
  /** D10 — transition : où en sont les longueurs traitées (majorite | minorite
   *  | quasi_nulle) — c'est ce qui décide le cap, pas le goût. */
  transitionStep?: string;
  /** D11 (20/09) — locks : maturité (neuve|ado|mature), méthode de racine
   *  (palm|interlock|freeform) et réalité du séchage (sec|seche|humide|lentes).
   *  Les trois questions des FAQ locks ; absentes = comportement d'avant. */
  locStage?: string;
  locCare?: string;
  locDry?: string;
  /** D2 : le journal dit « routine trop longue » → les ajouts de confort
   * passent en réserve, le socle du cycle reste (voir profileEvolution). */
  shorten?: boolean;
}

export interface HairAdvisoryStep {
  label: string;
  action: string;
  why: string;
  how: string;
  expect: string;
}

export interface HairAdvisoryRoutine {
  morning: HairAdvisoryStep[]; // « Jour de lavage »
  evening: HairAdvisoryStep[]; // « Entre deux lavages »
  weekly: HairAdvisoryStep[];  // « À faire chaque semaine »
}

export interface HairLesson {
  key: string;
  title: string;
  lesson: string;
  source: string;
}

export interface HairObservation {
  day: string;
  question: string;
}

/** Vocabulaire affiché (profil déclaré) — miroir des choix du diagnostic. */
export const HAIR_TEXTURE_VALUES: Record<string, string> = {
  crepue: 'Crépue (4A–4C)',
  frisee: 'Frisée / bouclée (3B–3C)',
  locksee: 'En locks',
  protective: 'En coiffure protectrice',
  defrisee: 'Défrisée (transition)',
  inconnue: 'À caractériser',
};

export const HAIR_STYLE_VALUES: Record<string, string> = {
  naturel: 'Coiffures naturelles',
  braids: 'Tresses',
  twists: 'Twists',
  locks: 'Locks',
  wig: 'Perruque / tissage',
  enfant: 'Rituel enfant',
};

export const HAIR_PRIORITY_VALUES: Record<string, string> = {
  hydratation: 'Stopper la sécheresse',
  casse: 'Démêler sans casse',
  definition: 'Définir les boucles',
  pousse: 'Longueurs et racines en santé',
  cuir_chevelu: 'Apaiser le cuir chevelu',
  demelage_enfant: 'Démêler sans larmes',
};

export const HAIR_POROSITY_VALUES: Record<string, string> = {
  forte: 'Forte',
  faible: 'Faible',
  moyenne: 'Moyenne',
  inconnue: 'À tester (verre d’eau)',
};

export const HAIR_SCALP_VALUES: Record<string, string> = {
  normal: 'Normal',
  sec: 'Sec',
  demangeaisons: 'Démangeaisons',
  pellicules: 'Pellicules de sécheresse',
  irritation: 'Irrité',
};

export const HAIR_FREQUENCY_VALUES: Record<string, string> = {
  'less_1x': 'Moins d’1× par semaine',
  '1x_semaine': '1× par semaine',
  '2x_semaine': '2× par semaine',
  irreguliere: 'Variable / selon le temps',
  // Reçu des réponses antérieures (D4 a déplacé « débutante » vers
  // l'expérience) — gardé pour que les sessions en cours s'affichent juste.
  debutante: 'Débutante (réponse héritée)',
};

export const HAIR_LENGTH_VALUES: Record<string, string> = {
  courte: 'Courte (au-dessus de l’épaule non atteinte)',
  moyenne: 'Moyenne (épaules)',
  longue: 'Longue (au-delà des épaules)',
};

export const HAIR_EXPERIENCE_VALUES: Record<string, string> = {
  debutante: 'Je débute dans les routines texturées',
  habituee: 'J’ai déjà des habitudes',
  expert: 'Routine avancée, je connais ma fibre',
};

interface HairFlags {
  texture: string; style: string; priority: string; porosity: string; scalp: string; frequency: string; focus: string;
  isCoily: boolean; isCurly: boolean; isLocked: boolean; isProtective: boolean;
  isWig: boolean; isKid: boolean; isBreakage: boolean; isDefinition: boolean;
  isGrowth: boolean; isScalp: boolean; scalpTrouble: boolean;
  highPorosity: boolean; lowPorosity: boolean; isBeginner: boolean;
  isTransition: boolean;
  length: string; experience: string;
  isShort: boolean; isLong: boolean; isExpert: boolean;
  shorten: boolean;
  /** D9 — sous-motif crépu (vide hors texture crépue), élasticité, largeur, passé chaleur/chimie (vide pour un enfant). */
  pattern: string; elasticity: string; strandWidth: string; chem: string;
  /** D10 — séchage + fixant des boucles au naturel (vide hors ce profil) ; position de la transition. */
  curlyDry: string; curlyHold: string; transitionStep: string;
  /** D11 — locks : maturité, méthode d’entretien racine, séchage (vides hors locks). */
  locStage: string; locCare: string; locDry: string;
}

function flags(ctx: HairAdvisoryContext): HairFlags {
  const texture = String(ctx.texture ?? '');
  const style = String(ctx.style ?? '');
  const priority = String(ctx.priority ?? '');
  const porosity = String(ctx.porosity ?? '');
  const scalp = String(ctx.scalp ?? '');
  const frequency = String(ctx.frequency ?? '');
  const focus = String(ctx.focus ?? '');
  const length = String(ctx.length ?? '');
  const experience = String(ctx.experience ?? '');
  const legacyBeginner = frequency === 'debutante';
  const frequencyReal = legacyBeginner ? '' : frequency;
  const scalpTrouble = scalp === 'sec' || scalp === 'demangeaisons' || scalp === 'pellicules' || scalp === 'irritation';
  // D6-bis (test utilisateur 19/09) : une priorité déclarée ne peut plus
  // contredire la réalité du segment. « Définir les boucles » ne définit rien
  // sur des locks formées — le flag suit le cycle, pas le souhait isolé.
  const lockedNow = texture === 'locksee' || style === 'locks';
  return {
    texture, style, priority, porosity, scalp, frequency: frequencyReal, focus, length, experience,
    isCoily: texture === 'crepue',
    isCurly: texture === 'frisee' || texture === 'bouclee' || (priority === 'definition' && !lockedNow),
    isLocked: lockedNow,
    isProtective: texture === 'protective' || style === 'braids' || style === 'twists',
    isWig: style === 'wig',
    isKid: style === 'enfant' || priority === 'demelage_enfant',
    isBreakage: priority === 'casse',
    isDefinition: priority === 'definition' && !lockedNow,
    isGrowth: priority === 'pousse',
    isScalp: priority === 'cuir_chevelu' || scalpTrouble,
    scalpTrouble,
    highPorosity: porosity === 'forte',
    lowPorosity: porosity === 'faible',
    // D4 : « débutante » vivait dans la fréquence (mauvaise case) ; le champ
    // propre existe — le reçu ancien reste compris comme expérience.
    isBeginner: experience === 'debutante' || legacyBeginner,
    isTransition: texture === 'defrisee' || style === 'defrise',
    isShort: length === 'courte',
    isLong: length === 'longue',
    isExpert: experience === 'expert',
    shorten: ctx.shorten === true,
    // Le sous-motif ne se pose plus une fois la lock formée : le motif a été
    // consommé par la lock — ni définition, ni démêlage n'ont de sens ici.
    pattern: texture === 'crepue' && !lockedNow && ['4a', '4b', '4c'].includes(String(ctx.coilyPattern ?? '')) ? String(ctx.coilyPattern) : '',
    elasticity: ['ressort', 'mou', 'cassant'].includes(String(ctx.elasticity ?? '')) ? String(ctx.elasticity) : '',
    strandWidth: ['fine', 'epaisse'].includes(String(ctx.strandWidth ?? '')) ? String(ctx.strandWidth) : '',
    // La question n'est jamais posée à un enfant ; si une réponse ancienne ou
    // détournée la porte quand même, le moteur l'ignore — la garde vit ici.
    // D10 : un profil « défrisée » qui répondrait « jamais de chimie » se
    // contredit lui-même ; la texture déclarée prime, la ligne de récompense
    // n'est pas servie.
    chem: (style === 'enfant' || priority === 'demelage_enfant') ? '' : ((texture === 'defrisee' || style === 'defrise') && String(ctx.chemicalHeat) === 'aucun') ? '' : (['aucun', 'chaleur', 'produit', 'les_deux'].includes(String(ctx.chemicalHeat ?? '')) ? String(ctx.chemicalHeat) : ''),
    // D10 — les réponses boucles ne vivent que sur le cycle où l'on sèche
    // et coiffe vraiment : bouclés déclarés, portés au naturel, hors locks.
    // D10 (20/09) — séchage et fixant n'existent QUE pour le bouclés/crépu porté
    // au naturel : locks, perruque, enfant (la question ne lui est pas posée —
    // une réponse rémanente d'un ancien profil ne doit rien injecter chez lui).
    curlyDry: ['frisee', 'bouclee'].includes(texture) && style === 'naturel' && !lockedNow &&
      String(ctx.style ?? '') !== 'enfant' && String(ctx.priority ?? '') !== 'demelage_enfant' &&
      ['air', 'diffuse_chaud', 'diffuse_froid', 'serviette'].includes(String(ctx.curlyDry ?? '')) ? String(ctx.curlyDry) : '',
    curlyHold: ['frisee', 'bouclee'].includes(texture) && style === 'naturel' && !lockedNow &&
      String(ctx.style ?? '') !== 'enfant' && String(ctx.priority ?? '') !== 'demelage_enfant' &&
      ['gel', 'mousse', 'creme', 'rien'].includes(String(ctx.curlyHold ?? '')) ? String(ctx.curlyHold) : '',
    // D10 — la position de transition ne vit qu'en transition, hors locks et
    // hors enfant ; sinon c'est une rémanence d'un autre profil, elle est ignorée.
    transitionStep: (texture === 'defrisee' || style === 'defrise') && !lockedNow &&
      String(ctx.style ?? '') !== 'enfant' && String(ctx.priority ?? '') !== 'demelage_enfant' &&
      style !== 'wig' && texture !== 'protective' && style !== 'braids' && style !== 'twists' &&
      ['majorite', 'minorite', 'quasi_nulle'].includes(String(ctx.transitionStep ?? '')) ? String(ctx.transitionStep) : '',
    // D11 — les trois réponses locks n'existent QUE locks en tête (la texture
    // locksee ou le style locks) ; hors de là, rémanence ignorée à la source.
    locStage: lockedNow && ['neuve', 'ado', 'mature'].includes(String(ctx.locStage ?? '')) ? String(ctx.locStage) : '',
    locCare: lockedNow && ['palm', 'interlock', 'freeform'].includes(String(ctx.locCare ?? '')) ? String(ctx.locCare) : '',
    locDry: lockedNow && ['sec', 'seche', 'humide', 'lentes'].includes(String(ctx.locDry ?? '')) ? String(ctx.locDry) : '',
  };
}

/**
 * Cycle principal de la routine — même ordre de priorité que les segments
 * du diagnostic (enfant > locks > perruque > protectrice > transition > naturel).
 * La routine n'est PAS une liste générique : chaque cycle a ses colonnes,
 * ses titres et ses gestes propres.
 */
type HairCycleKey = 'locks' | 'protective' | 'wig' | 'enfant' | 'transition' | 'naturel';

function cycleKey(f: HairFlags): HairCycleKey {
  if (f.isKid) return 'enfant';
  if (f.isLocked) return 'locks';
  if (f.isWig) return 'wig';
  if (f.isProtective) return 'protective';
  if (f.isTransition) return 'transition';
  return 'naturel';
}

/**
 * Titres des trois colonnes — ils changent avec le cycle : une coiffure
 * protectrice n'a pas de « jour de lavage » hebdomadaire, elle a un cycle
 * avant / pendant / à la dépose. La page résultat affiche ces titres.
 */
/**
 * D9 — LA source unique de traduction réponses → contexte moteur.
 * La route serveur et la page résultat appellent CETTE fonction : un champ
 * du questionnaire ne peut plus se perdre entre les deux (deux listes blanches
 * séparées, c'est exactement comment le test navigateur du 20/09 a trouvé la
 * première réponse perdue).
 */
export function buildHairAdvisoryCtx(answers: Record<string, unknown>): HairAdvisoryContext {
  const str = (key: string): string | undefined =>
    typeof answers[key] === 'string' ? (answers[key] as string) : undefined;
  const focus = str('focus');
  return {
    texture: str('texture'),
    style: str('style'),
    focus: focus && focus !== '' ? focus : undefined,
    priority: str('priority'),
    porosity: str('porosity'),
    scalp: str('scalp'),
    frequency: str('frequency'),
    length: str('length'),
    experience: str('experience'),
    budget: str('budget'),
    coilyPattern: str('coilyPattern'),
    elasticity: str('elasticity'),
    strandWidth: str('strandWidth'),
    chemicalHeat: str('chemicalHeat'),
    // D10
    curlyDry: str('curlyDry'),
    curlyHold: str('curlyHold'),
    transitionStep: str('transitionStep'),
    // D11 — idem : le tuyau unique emporte les trois réponses locks.
    locStage: str('locStage'),
    locCare: str('locCare'),
    locDry: str('locDry'),
  };
}

export function hairRoutineTitles(ctx: HairAdvisoryContext): { morning: string; evening: string; weekly: string } {
  switch (cycleKey(flags(ctx))) {
    case 'protective': return { morning: 'Avant de se faire coiffer', evening: 'Pendant la coiffure', weekly: 'À la dépose' };
    case 'wig': return { morning: 'Avant chaque pose', evening: 'Pendant la portée', weekly: 'À la dépose' };
    default: return { morning: 'Jour de lavage', evening: 'Entre deux lavages', weekly: 'À faire chaque semaine' };
  }
}

type HairStepDraft = Omit<HairAdvisoryStep, 'label'>;

/**
 * « Jour de lavage » — cycle complet naturel / locks / enfant.
 * Chaque étape est contextuelle : le *pourquoi* change selon le profil
 * déclaré (casse, cuir chevelu, porosité, enfant, locks…).
 */
function buildWashDay(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [];

  // 1. Lavage
  let washWhy: string;
  if (f.isScalp) {
    washWhy = 'Le cuir chevelu d’abord : les inconforts — tiraillements, démangeaisons, pellicules — viennent le plus souvent de résidus (coiffants, gels, bords de bonnet) ou d’un dessèchement. Nettoyer en douceur, sans décaper, est le premier geste d’apaisement.';
  } else if (f.isLocked) {
    washWhy = f.isBreakage
      ? 'Sur locks, le lavage ne démêle rien — il emporte les résidus qui pèsent et tiraillent. La casse des locks se lit ailleurs : tension aux racines, pointes effilochées. Laver dans le sens de la lock protège les deux.'
      : 'Laver une lock, ce n’est pas la démêler : rien ne s’emmêle dans une lock ancrée, tout s’y dépose. Le shampoing sans résidu, dans le sens de la lock, est le vrai soin de la journée de lavage.';
  } else if (f.isBreakage || f.isKid) {
    washWhy = 'Ne jamais attaquer un cheveu emmêlé : le démêlage se fait avant, sur cheveu mouillé et glissant. C’est à sec, sous tension, que la fibre casse le plus.';
  } else if (f.isCoily || f.highPorosity) {
    washWhy = 'Le cheveu texturé est naturellement sec : le lavage est l’étape où l’hydratation repart de zéro. Un nettoyant doux, sans sulfate, ou un co-wash, nettoie sans décaper.';
  } else {
    washWhy = 'Le lavage est l’étape où l’hydratation repart de zéro : un nettoyant doux qui ne décape pas, pour que le cuir chevelu et la fibre restent en équilibre.';
  }
  steps.push({
    action: 'Laver en douceur',
    why: washWhy,
    how: 'Masser le cuir chevelu avec les pulpes des doigts (pas les ongles), laisser l’écume faire le travail sur les longueurs, rincer à l’eau tiède. Jamais d’eau chaude : elle dessèche et tire sur le cuir chevelu.',
    expect: 'Un cuir chevelu propre, sans effet collant ni tiraillement. Si le cuir chevelu gratte après chaque lavage, notez-le : la cause est plus souvent un résidu qu’un produit qui ne convient pas.',
  });

  // 2. Conditionnement + démêlage — ou conditionnement seul sur locks :
  // une lock ne se démêle pas, elle se rince (test utilisateur 19/09).
  if (f.isLocked) {
    steps.push({
      action: 'Conditionner sans défaire les locks',
      why: f.isBreakage
        ? 'Sur locks, la casse ne se joue pas au peigne — il n’y en a pas : elle se joue à la racine (tension du retwist, racines fines) et aux pointes qui s’effilochent. Le soin se pose dans le sens de la lock, jamais en frottement.'
        : 'Le conditionneur sur locks est un rinçage, pas un démêlage : il adoucit la surface et emporte les résidus sans jamais défaire ce qui est ancré. Travailler « dans le sens de », jamais contre.',
      how: 'Poser le conditionneur sur les longueurs mouillées, lisser du haut vers le bas sans frotter, laisser agir le temps du lavage du cuir chevelu, puis rincer à l’eau tiède en laissant l’eau couler le long des locks. Aucun peigne, aucun pré-démêlage : ils n’ont rien à faire ici.',
      expect: f.isKid
        ? 'Des locks propres et souples sans séance de larmes : chez un enfant, le temps de pose se raccourcit, les gestes se font plus courts — jamais plus forts. Aucun peigne ne remplacera jamais la main.'
        : 'Des locks propres, souples, sans résidu ni fibre arrachée. Si de petits cheveux libérés restent pris dans une lock, retirez-les aux doigts sous l’eau — c’est normal, pas un signal d’alerte.',
    });
  } else steps.push({
    action: 'Conditionner et démêler',
    why: f.isKid
      ? 'Démêler sans larmes, c’est une méthode : cheveu mouillé et glissant, outil à dents larges, toujours des pointes vers la racine. Si ça accroche, on recule d’un pas — plus de produit, plus d’eau — on ne tire jamais.'
      : f.isBreakage
        ? 'Le conditionneur est l’étape démêlage : sur cheveu mouillé et glissant, chaque nœud cède sans traction. C’est le geste qui protège le plus vos longueurs, avant n’importe quel produit.'
        : 'Le conditionneur prépare le démêlage : sur cheveu mouillé, chaque nœud cède sans traction, et la fibre est prête à recevoir l’hydratation.',
    how: 'Répartir le conditionneur, pré-démêler aux doigts, puis passer un outil à dents larges des pointes vers la racine, mèche par mèche. Rincer à l’eau tiède, jamais chaude.' + (f.pattern === '4b' || f.pattern === '4c' ? ' Sur un motif serré 4B/4C : quadriller la tête en sections, travailler une section à la fois sous l’eau et le conditionneur — les doigts lèvent les nœuds, l’outil finit ; jamais l’inverse.' : '') + (f.strandWidth === 'fine' ? ' Cheveu fin : il s’arrache quand on insiste — deux passages par section suffisent, puis on rince.' : ''),
    expect: f.isKid
      ? 'Un démêlage sans tirage : si l’enfant grimace, c’est que la méthode est trop rapide, pas que les cheveux sont trop emmêlés. On ralentit, on réhydrate, on recommence.'
      : f.isBreakage
        ? 'Le démêlage doit demander du temps, pas de la force : une tension nette est un signal de méthode (cheveux trop secs ? partir des pointes ?), pas un obstacle à forcer.'
        : 'Un cheveu démêlé sans nœuds résiduels : s’il en reste au séchage, c’est qu’une zone a été sautée — on y retourne humide, pas sec.',
  });

  // 3. Hydratation — contextuelle selon porosité et locks
  if (f.lowPorosity) {
    steps.push({
      action: 'Soins légers, bien placés',
      why: 'Cheveux à porosité faible : les écailles sont fermées, l’eau met du temps à entrer et les produits lourds restent en surface. La règle : des textures légères à base d’eau, sur cheveu bien humide, et un peu de chaleur douce si besoin — pas plus de produit.',
      how: 'Commencer par un spray ou un leave-in léger sur cheveu mouillé, finir par le plus fin de vos soins. Si le cheveu pèse ou colle, c’est trop : on réduit la quantité avant d’ajouter un produit.',
      expect: 'Un cheveu qui respire, défini sans effet collant. La porosité faible s’entretient en moins, pas en plus — l’accumulation est l’ennemi, pas le manque.',
    });
  } else if (f.isLocked) {
    steps.push({
      action: 'Hydrater à l’eau, sans alourdir',
      why: 'La lock se nourrit à l’eau et aux soins légers : les beurres et huiles épais y laissent des dépôts qui attisent l’odeur et la sécheresse. L’hydratation passe par l’eau et un conditionneur, pas par la matière grasse.',
      how: 'Sur cheveux mouillés, un conditionneur léger, bien rincé, puis une brume d’eau sur les pointes. Les longueurs ne se retwistent pas : l’eau et la main suffisent.',
      expect: 'Des locks souples et propres, sans dépôt. Un cheveu rêche qui sent, c’est un signal de lavage plus profond, pas de plus de produit.',
    });
  } else {
    steps.push({
      action: 'Hydrater puis sceller (LCO)',
      why: f.isKid
        ? 'Le cheveu texturé est naturellement sec : l’hydratation vient de l’eau et des produits humectants, puis le beurre ou l’huile scelle pour qu’elle ne s’évapore pas. L’ordre LCO sur cheveu humide est le plus fiable.'
        : f.highPorosity
          ? 'Porosité forte : le cheveu boit vite et perd vite. L’hydratation ne tient que si elle est scellée — c’est la différence entre « ça marche le jour même » et « ça tient la semaine ».'
          : 'Le cheveu texturé est naturellement sec : sa forme en spirale ralentit la remontée du sébum du cuir chevelu vers les pointes. L’hydratation vient de l’eau et des humectants ; le beurre ou l’huile sert à sceller, pas à hydrater.',
      how: 'Sur cheveux essorés (ni gorgés ni secs) : leave-in hydratant (L), crème (C), puis une noisette de beurre ou d’huile pour sceller (O). Toujours dans cet ordre, toujours sur cheveu humide : sur cheveu sec, on scelle la sécheresse.'
        + (f.strandWidth === 'fine'
          ? ' Cheveu fin : à l’étape O, une huile légère plutôt qu’un beurre — deux ou trois gouttes chauffées dans les paumes puis écrasées sur les longueurs. Un beurre alourdit un cheveu fin en une journée et le fait regraisser plus vite qu’il ne le protège.'
          : f.strandWidth === 'epaisse'
            ? ' Cheveu épais : le beurre riche est le bon choix — réchauffez-le entre les paumes pour qu’il pénètre au lieu de rester en surface, et n’ayez pas peur du temps de pose : plus la fibre est large, plus elle prend son temps.'
            : ''),
      expect: 'Souplesse et élasticité immédiatement ; l’hydratation scellée tient plusieurs jours. Si le cheveu est sec le lendemain, le point faible est au scellement, pas au lavage : on ajuste l’étape O.',
    });
  }

  // 4. Cuir chevelu — seulement si le profil en a besoin
  if (f.isScalp) {
    const scalpWhy: Record<string, string> = {
      demangeaisons: 'Les démangeaisons, surtout sous une coiffure attachée, viennent le plus souvent de sécheresse et de résidus. Apaiser, c’est nettoyer en douceur, hydrater le cuir chevelu avec des textures légères, et ne jamais gratter : ça entretient l’irritation.',
      pellicules: 'Les pellicules de sécheresse — petites, blanches, qui tombent — n’ont rien à voir avec les pellicules grasses : le cuir chevelu manque d’eau, pas d’huile. Le geste, c’est l’hydratation douce, pas le lavage décappant.',
      sec: 'Un cuir chevelu qui tire manque d’eau. Son hydratation se fait avec des textures légères à base d’eau — les beurres et huiles y pèsent et obstruent, sans rien apporter.',
      irritation: 'Un cuir chevelu irrité se répare par la simplicité : moins de produits, des textures douces, et laisser le cuir chevelu respirer entre deux gestes.',
      normal: 'Le cuir chevelu est la base : un cuir chevelu confortable est la condition des longueurs, de la coiffure et du confort au quotidien.',
    };
    steps.push({
      action: 'Cuir chevelu : apaiser en douceur',
      why: scalpWhy[f.scalp] ?? scalpWhy.normal,
      how: 'Les produits cuir chevelu vont sur le cuir chevelu, les produits longueurs sur les longueurs — on ne mélange pas. Massage aux pulpes, en mouvements courts, une à deux fois par semaine si besoin.',
      expect: 'Un soulagement en quelques jours : tiraillements et démangeaisons qui s’espacent. S’ils persistent malgré une routine simple, ou si des plaques, une douleur ou des chutes localisées apparaissent : c’est hors du périmètre d’une routine beauté — c’est un avis professionnel qui tranchera.',
    });
  }

  return steps;
}

/** « Entre deux lavages » — cycle naturel et locks (la perruque a son propre cycle). */
function buildBetweenWashes(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [];

  if (f.isLocked) {
    steps.push({
      action: 'Entretenir entre deux lavages',
      why: 'Entre deux lavages, la lock vit de l’eau et d’une régularité légère : un rafraîchissement à l’eau garde la souplesse sans déposer de matière qui attirerait les résidus.',
      how: f.locCare === 'freeform'
        ? 'Une brume d’eau sur les pointes, rien à retordre : en libre pousse, l’entretien est la séparation des racines, pas le retwist. Ne pas toucher les longueurs plus que nécessaire — c’est déjà le programme.'
        : 'Une brume d’eau sur les pointes, un léger retwist en racine seulement si besoin, palm rolling léger. Ne pas toucher les longueurs plus que nécessaire : la manipulation excessive casse et amincit.',
      expect: 'Des locks souples et propres entre deux lavages. Un signe de dépôt — rêche, odeur — appelle un lavage, pas plus de produit.',
    });
  }
  if ((f.isCurly || f.isCoily) && !f.isLocked) {
    steps.push({
      action: 'Rafraîchir sans relaver',
      why: f.isDefinition
        ? 'Entre deux lavages, les boucles perdent définition et sèchent : une brume à base d’eau redonne de la vie sans relaver — le lavage est le geste le plus desséchant de la routine, on le réserve au jour de lavage.'
        : 'Entre deux lavages, le cheveu texturé sèche et perd sa forme : une brume à base d’eau redonne la définition sans relaver, qui est le geste le plus desséchant de la routine.',
      how: 'Un spray eau + leave-in sur les mèches qui sèchent, remonter la boucle avec la main (scrunching), puis ne plus toucher. Si le cheveu est sale ou alourdi, ce n’est plus un rafraîchissement : c’est un lavage.',
      expect: 'Des boucles qui revivent pour quelques jours. Le rafraîchissement est un geste léger et fréquent, pas une occasion d’empiler des produits : un peu, souvent.',
    });
  }

  // Nuit en satin — universelle.
  steps.push({
    action: 'Nuit en satin',
    why: 'Le coton absorbe l’hydratation et frotte la nuit : bonnet ou taie en satin garde l’hydratation en place et limite la casse aux extrémités. C’est le geste le moins coûteux de toute la routine.',
    how: 'Bonnet ou taie en satin chaque nuit, coiffure détendue — rien ne doit tirer sur la raie ni les tempes.',
    expect: 'Moins de casse aux extrémités, une définition qui tient, un réveil sans nœuds. La différence se voit après quelques nuits, pas après une.',
  });

  if (f.isGrowth) {
    steps.push({
      action: 'Zéro tension aux racines',
      why: 'Pour garder des longueurs, la règle est simple : ce qu’on garde, c’est ce qu’on ne casse pas. Les tensions aux racines — queues serrées, coiffures qui tirent, attaches trop fermes — sont la première cause de casse et d’usure de la raie.',
      how: 'Détendre toutes les coiffures : rien ne doit tirer sur la raie ni les tempes. Une coiffure protectrice doit tenir sans attache agressive.',
      expect: 'Les raies et tempes qui restent intactes sur la durée. C’est l’observation la plus honnête qu’il existe : aucun produit ne fait pousser — la préservation, elle, dépend de vos gestes.',
    });
  }

  return steps;
}


/** D9 — les étapes qui découlent du passé chaleur/chimie, identiques dans
 *  tous les cycles hebdomadaires (naturel, locks, protectrice, perruque,
 *  transition). flags() les vide pour un enfant : la garde est moteur. */
function chemSteps(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [];
  if (f.chem === 'chaleur' || f.chem === 'les_deux') {
    steps.push({
      action: 'Chaleur : la règle des trois, pas de faveur',
      why: 'Vous utilisez la chaleur : l’eau qui bout dans la fibre est la casse immédiate, le fer sans protecteur est la casse différée. Les trois règles ne sont pas une préférence de marque, ce sont les lois physiques du cheveu texturé passé par la chaleur.',
      how: 'Protecteur de chaleur sur cheveu entièrement sec, température la plus basse qui fait le travail, une seule passe par mèche. Le sèche-cheveux à fluxo tiède remplace le fer autant que possible — un lissé doux se paie en longueur gardée, un lissé parfait se paie en pointes.',
      expect: 'Un lissé qui ne se paie pas en fourches ni en anneaux de cassure. Si la pointe crisse, fume ou sent le brûlé, la séance s’arrête là : ce n’est pas un réglage à pousser, c’est un signal.',
    });
  }
  if (f.chem === 'produit' || f.chem === 'les_deux') {
    steps.push({
      action: 'Démarcation : le point faible de la repousse',
      why: 'Sous une repousse naturelle, les longueurs traitées au produit chimique sont une autre fibre — plus poreuse, plus fragile. C’est à la jonction des deux, la démarcation, que ça casse ; jamais sur la pousse neuve.'
        + (f.chem === 'les_deux' ? ' Et chaleur ET produit cumulent leurs effets sur cette même ligne : jamais les deux la même semaine sur la même mèche — la fibre ne négocie pas.' : ''),
      how: 'Retouche du produit sur les racines seules, jamais sur les longueurs déjà traitées ; soin de force ciblé sur la zone de démarcation une fois sur deux'
        + (f.isLocked
          ? ' ; le séchage de la zone est aussi soigné que le reste — l’eau piégée à une démarcation fragilisée est l’irritation assurée.'
          : ' ; à cet endroit, on démêle encore plus doucement.')
        + ' Le jour où la ligne tire ou casse, on espace les retouches — et la coupe nette redevient une option assumée, pas une punition.',
      expect: 'La démarcation tient : peu de cheveux qui tombent après le rinçage, pas de zone qui « décroche » entre la repousse et les longueurs.',
    });
  }
  return steps;
}

/** « À faire chaque semaine » — cycle naturel et locks. */
function buildWeekly(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [];

  // D9 — le test d’élasticité tranche enfin le « hydratation OU force » : le
  // masque est DÉCIDÉ, plus seulement proposé. Sur locks, la décision ne
  // s’applique pas (le masque y est un rinçage souple, pas une cure).
  const maskDecision = !f.isLocked && f.elasticity === 'mou'
    ? {
        action: 'Masque de force, puis hydratation',
        why: 'Votre test au rinçage est clair : le cheveu mouillé s’étire sans limite et ne revient pas — la fibre manque de matière, pas d’eau. Un soin protéiné léger une semaine sur deux la raffermit, l’hydratation reprend la suivante. En excès, la force rend le cheveu rêche : c’est l’alternance qui soigne, jamais la dose.',
      }
    : !f.isLocked && f.elasticity === 'cassant'
      ? {
          action: 'Masque d’hydratation d’abord, la force attendra',
          why: 'Le cheveu casse net sans s’étirer : une fibre assoiffée, pas une fibre molle. Commencer par un soin protéiné sur un cheveu sec le durcirait encore — deux à trois semaines d’hydratation profonde d’abord, puis on refait le test au rinçage avant de décider de la force.',
        }
      : !f.isLocked && f.elasticity === 'ressort'
        ? {
            action: 'Masque hydratant hebdomadaire, rien de plus',
            why: 'Votre élasticité est bonne : le cheveu s’étire et revient. Les cures de force systématiques sont un réflexe de catalogue, pas un diagnostic — chez vous, l’hydratation hebdomadaire suffit tant que le test tient.',
          }
        : null;
  steps.push({
    action: maskDecision ? maskDecision.action : 'Masque : hydratation, ou force',
    why: maskDecision
      ? maskDecision.why
      : f.isBreakage
        ? 'La fibre cassante a besoin de force : un masque protéiné ou un reconstructeur de liens, une à deux fois par mois, en alternance avec un masque hydratant. Trop de protéines sans hydratation rend le cheveu rêche et cassant — l’équilibre est la technique.'
        : f.isCoily
          ? 'Une fois par semaine, un masque hydratant sous chaleur (chapeau chaud ou vapeur) est ce qui change le plus sur un cheveu très texturé : la chaleur ouvre la fibre et fait pénétrer.'
          : 'Le masque est le soin en profondeur que la routine quotidienne ne fait pas : hydratant en règle générale, en alternance avec un soin de force si la fibre casse.',
    how: 'Sur cheveux propres et essorés, mèche par mèche, couvrir (bonnet ou chapeau de bain), 20 à 30 minutes. Le masque n’est pas un leave-in : on rince.'
      + (f.elasticity === 'mou' ? ' Le soin de force se pose 10 à 15 minutes, pas une heure : les protéines ne se laissent pas dormir sur la fibre.' : ''),
    expect: f.isLocked && !f.isKid
      ? 'Des locks souples et un cuir chevelu soulagé — c’est la mesure, sur quelques semaines. Une lock ne cherche pas la « facilité au peigne » : elle n’en voit jamais ; ce qui se juge, c’est la douceur sans dépôt et la propreté de la racine.'
      : 'Un cheveu plus souple, un démêlage plus facile, une casse moins nette — sur quelques semaines, pas en un jour. Le soin de la fibre se juge sur un mois, pas sur un usage.',
  });

  if (f.scalpTrouble || f.isProtective || f.isWig) {
    steps.push({
      action: 'Nettoyage profond occasionnel',
      why: 'Les résidus — coiffants, eau calcaire, dépôts de produits — s’installent sur le cuir chevelu et les longueurs : un nettoyage profond, occasionnel, redonne de la légèreté et fait que les autres soins recommencent à agir.',
      how: 'Une fois par mois, ou quand le cheveu pèse et qu’il perd de sa définition. C’est un geste correcteur, pas un rythme : s’il faut clarifier chaque semaine, la cause est en amont — trop de produit, ou mauvais type.',
      expect: 'Un cheveu plus léger, un cuir chevelu plus à l’aise. Après un nettoyage profond, l’hydratation repart plus vite : c’est le signe que les résidus étaient le problème.',
    });
  }

  if (f.isLocked) {
    // D11 — la méthode se récite rarement correctement pour TOUT LE MONDE : la
    // maturité décide de ce qu’on attend (patience aux premiers mois, rythme
    // plus libre ensuite), la méthode décide du geste (on ne parle pas retwist
    // à une personne en libre pousse). Sources : annieinc.com (rythme 4–6
    // semaines, méthodes par stade), r/Dreadlocks & r/Microlocs (sur-manipulation,
    // shrinkage), thekinkyapothecary (trop serré = casse).
    const stageWhy = f.locStage === 'neuve'
      ? ' Sur des locks de moins de six mois, la consigne première est la patience : le raccourcissement fait partie du processus — la lock construit sa matrice avant de s’allonger. Un début qui lutte contre ce stade ralentit la maturation au lieu de la servir.'
      : f.locStage === 'ado'
        ? ' À mi-parcours, la lock se consolide sans être blindée : le rythme d’entretien se tient, mais la maturation prime encore sur la perfection du tracé.'
        : f.locStage === 'mature'
          ? ' Locks bien ancrées : elles supportent un entretien plus espacé et des lavages plus fréquents — le programme peut viser la tenue, plus la survie.'
          : '';
    const careHow = f.locCare === 'freeform'
      ? 'Rien ne sera retordu ici. Le travail hebdomadaire : séparer les locks entre elles à la racine, un doigt propre, surtout nuque et contour où elles fusionnent ; eau légère sur les pointes si besoin ; lavage sans résidu. La libre pousse est une méthode, pas un abandon.'
      : f.locCare === 'interlock'
        ? 'Interlocking : la séance se tient (autour de huit semaines, jamais moins), le point de croisement vérifié à chaque racine — serré au-delà du nécessaire, la racine perd sa prise et la lock s’amincit. Aucun produit entre les séances : la méthode tient seule.'
        : f.locCare === 'palm'
          ? 'Après le lavage : palm rolling des pointes vers la racine, retwist léger sur les nouvelles racines seulement — et surtout pas tous les jours. Le léger frisottis entre deux séances est normal : il fait partie du verrouillage, ce n’est pas une urgence.'
          : 'Après le lavage : palm rolling des pointes vers la racine, retwist léger sur les nouvelles racines seulement. Les longueurs : eau et soin, sans retwist.';
    steps.push({
      action: 'Racines : le travail de la lock',
      why: 'La lock se forme par la régularité : palm rolling pour donner la forme, retwist léger en racine seulement, et beaucoup moins de manipulation que la main ne le voudrait. Une lock retwistée trop souvent et trop serrée casse et amincit — c’est l’ennemi n° 1 de la maturité.' + stageWhy,
      how: careHow,
      expect: 'Des locks qui se resserrent semaine après semaine. La maturité d’une lock se compte en mois : le travail est dans la régularité, pas dans l’effort.',
    });
  }

  steps.push(...chemSteps(f));
  return steps;
}

/* ------------------------------------------------------------------ */
/* Cycle protectrice (tresses / twists) — avant / pendant / à la dépose */
/* ------------------------------------------------------------------ */

function buildProtectiveMorning(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Laver en profondeur avant la coiffure',
      why: 'C’est le seul moment où tout est accessible : cuir chevelu, longueurs, nœuds. Ce qui reste en résidu avant d’être tressé ou twisté s’installe pour des semaines — l’odeur et la sécheresse sous la coiffure commencent ici. Un nettoyant doux, sans décaper, remet tout à zéro.',
      how: 'Cheveux mouillés, section par section : masser le cuir chevelu avec les pulpes dans chaque raie, rincer long à l’eau tiède, sans frotter les longueurs. Si des résidus pèsent encore, c’est un nettoyage profond, pas un second shampoing agressif.',
      expect: 'Un cuir chevelu propre et léger, des longueurs sans résidu : c’est la base d’une coiffure qui tiendra proprement jusqu’à la dépose. La fraîcheur qui dure des semaines commence ici.',
    },
    {
      action: 'Démêler complètement, avant de coiffer',
      why: 'Sous tresses ou twists, le démêlage ne se refait pas : chaque nœud non réglé avant l’installation devient un point de casse à la dépose. C’est la dernière occasion de le faire bien — sur cheveu mouillé et glissant, sans précipitation.',
      how: 'Sur cheveu mouillé et conditionné : démêler des pointes vers la racine, mèche par mèche, outil à dents larges. Si une zone accroche : plus d’eau et de produit, on recule d’un pas. Ne jamais installer sur un cheveu encore noué.',
      expect: 'Un cheveu entièrement démêlé avant l’installation : c’est ce qui fera que la dépose se passera sans arrachage. À la sortie de la coiffure, le démêlage doit rester facile — c’est le test honnête.',
    },
    {
      action: 'Préparer le cuir chevelu en léger',
      why: 'Le cuir chevelu qui part sous une coiffure a besoin de léger : les beurres et huiles épaisses posés avant l’installation feront dépôt pendant des semaines et entretiennent gratte et irritation. Une base aqueuse, c’est tout ce dont il a besoin pour partir.',
      how: 'Après le lavage, sur cuir chevelu à peine humide : une brume aqueuse ou un soin léger à base d’eau, massé aux pulpes. Ne poser aucun produit épais avant l’installation — le cuir chevelu recevra son entretien pendant la coiffure.',
      expect: 'Un cuir chevelu à l’aise dès le premier jour de coiffure : pas de tiraillement, pas de gratte. Le confort du premier jour est le prédictif du confort des semaines suivantes.',
    },
  ];
  if (f.isScalp) {
    steps.push({
      action: 'Cuir chevelu en souffrance : apaiser avant de coiffer',
      why: 'Installer une coiffure sur un cuir chevelu qui tire ou gratte, c’est sceller l’inconfort pour des semaines : la sécheresse et les résidus s’aggravent à l’abri de la coiffure. Si le cuir chevelu n’est pas à l’aise avant, il ne le sera pas pendant — l’apaisement passe avant l’installation.',
      how: 'Un soin cuir chevelu léger et aqueux, appliqué et massé avant le coiffage ; espacer les jours de coiffure serrée si les inconforts reviennent. Des plaques, une douleur ou des chutes localisées : c’est un avis professionnel, pas une routine.',
      expect: 'Un cuir chevelu confortable avant l’installation, qui le reste pendant. Si les inconforts persistent malgré un cuir chevelu apaisé, la cause est ailleurs — la tension de la coiffure en premier lieu.',
    });
  }
  return steps;
}

function buildProtectiveEvening(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Cuir chevelu : brume aqueuse, 1 à 2 fois par semaine',
      why: 'Sous tresses ou twists, le cuir chevelu vit isolé : sans son entretien léger, il tire, gratte, et les résidus s’accumulent plus vite qu’en coiffure naturelle. Le protocole tient en deux mots — aqueux et régulier : une brume à base d’eau, jamais de matière épaisse sous une coiffure attachée.',
      how: 'Une à deux fois par semaine : une brume aqueuse sur le cuir chevelu, massée aux pulpes des doigts, sans eau ni rinçage. Ne jamais appliquer de beurre ni d’huile épaisse sous la coiffure : ça fait dépôt, pas soin.',
      expect: 'Un cuir chevelu à l’aise sur toute la durée de la coiffure : pas de tiraillement, pas de gratte au réveil. La fraîcheur qui dure est le signe que le protocole tient.',
    },
    {
      action: 'Confort dès le premier jour, sinon détendre',
      why: 'Une coiffure protectrice doit être confortable immédiatement : un tiraillement en racine, en raie ou aux tempes le premier jour ne « s’habitue pas » — il use la racine pendant des semaines. Le signal d’inconfort se traite par la détente, jamais par l’endurance.',
      how: 'Vérifier chaque jour les points sensibles : raie, tempes, attache. Si ça tire : détendre la coiffure immédiatement, ou la refaire plus souple. Ne jamais coiffer en forçant sur une zone qui résiste.',
      expect: 'Aucun point de tension sur la durée de la coiffure, et une raie intacte à la dépose. C’est l’observation la plus importante de tout le cycle protectrice — la racine se juge à la sortie, pas pendant.',
    },
    {
      action: 'Nuit en satin, coiffure détendue',
      why: 'La nuit, le frottement du coton et la pression de l’oreiller usent la coiffure et le cuir chevelu à la fois : bonnet ou taie en satin protège la tenue de la coiffure et l’hydratation en même temps — et rien ne doit tirer pendant le sommeil.',
      how: 'Bonnet ou taie en satin chaque nuit, coiffure vérifiée détendue avant de dormir. Si la coiffure bouge la nuit, la cause est souvent une attache trop lâche ou trop serrée — ajuster, pas enfoncer.',
      expect: 'Une coiffure qui garde sa forme, un cuir chevelu moins irrité au réveil. La tenue qui dure des semaines se joue sur les nuits, pas sur les jours.',
    },
  ];
  if (f.isGrowth) {
    steps.push({
      action: 'Zéro tension : la règle des longueurs',
      why: 'Garder des longueurs sous coiffure protectrice, c’est d’abord ne rien casser : la tension en racine et aux tempes est la première cause de perte — elle s’installe lentement, se voit vite à la dépose. Une coiffure qui tient sans tirer est une coiffure qui protège.',
      how: 'Rien ne doit tirer sur la raie ni les tempes : vérifier les attaches, détendre au moindre tiraillement. Les coiffures qui « finissent » le contour (edges serrées) sont les plus usantes — les éviter sous coiffure protectrice.',
      expect: 'Raie et tempes intactes à la dépose, semaine après semaine. La préservation des longueurs se mesure à la sortie de la coiffure — c’est là que le verdict tombe.',
    });
  }
  return steps;
}

function buildProtectiveWeekly(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Déposer sans arracher',
      why: 'La dépose est le moment le plus casse de tout le cycle protectrice : les nœuds installés pendant la coiffure cèdent mal, et c’est en tirant qu’ils cassent la fibre. La méthode — couper et libérer, section par section — vaut plus que n’importe quel démêlant.',
      how: 'Commencer par les pointes : couper les petits nœuds plutôt que de les forcer, libérer section par section de l’extérieur vers l’intérieur. Cheveux mouillés et conditionnés pour le démêlage final, des pointes vers la racine.',
      expect: 'Une dépose sans arrachage : peu de cheveux sur l’outil, pas de zone qui cède avec violence. Si une section résiste vraiment, c’est qu’il faut plus d’eau et de produit — pas plus de force.',
    },
    {
      action: 'Démêler et réhydrater après la dépose',
      why: 'Sortie de coiffure, les longueurs repartent de zéro : elles ont vécu isolées, sans les soins du quotidien. Le démêlage final — humide et glissant — est suivi d’une hydratation qui relance la routine avant la prochaine coiffure ou la période naturelle.',
      how: 'Sur cheveux mouillés et conditionnés : démêlage final des pointes vers la racine, puis hydratation de la routine (selon la texture). Laisser reposer le cuir chevelu quelques jours avant la prochaine coiffure serrée.',
      expect: 'Un cheveu souple et démêlé après la dépose, un cuir chevelu qui respire. L’état des longueurs à la sortie dit si le cycle a tenu — c’est l’indicateur à noter.',
    },
    {
      action: 'Nettoyage profond avant la prochaine coiffure',
      why: 'Chaque cycle protectrice dépose un peu de résidus — coiffants, eau calcaire, produits. Sans nettoyage profond occasionnel, les cycles s’additionnent : le cheveu pèse, le cuir chevelu s’irrite, et les soins ne travaillent plus. C’est le geste qui remet le compteur à zéro.',
      how: 'Une fois par mois, ou entre deux coiffures : un nettoyant clarifiant doux, massage du cuir chevelu section par section, rince long. Ensuite, repartir sur des soins légers — l’hydratation repart plus vite quand les résidus partent.',
      expect: 'Un cheveu plus léger, un cuir chevelu plus à l’aise, une définition ou une souplesse qui repart. Si le cheveu pèse déjà avant un mois, c’est un signal de soins trop lourds au quotidien.',
    },
  ];
  // D9 — le passé chaleur/chimie se lit dans TOUS les cycles hebdo
  // (la promesse du résumé doit être tenue, pas seulement annoncée).
  steps.push(...chemSteps(f));
  return steps;
}

/* ------------------------------------------------------------------ */
/* Cycle perruque / tissage — le dessous est le capital                */
/* ------------------------------------------------------------------ */

function buildWigMorning(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Le dessous d’abord : propre, sec, sans tension',
      why: 'Sous une pose, le cuir chevelu et les racines vivent plusieurs semaines à l’abri de la coiffure : leur état le jour de la pose décide de la tenue. Un cuir chevelu propre et sec, une raie et des tempes sans tension — c’est la condition d’une portée sans dégât, avant même la qualité de la perruque.',
      how: 'Avant chaque pose : cuir chevelu lavé et parfaitement sec, raie et tempes contrôlées (cassure, irritation, usure), cheveux détachés ou attachés sans tension. Poser la perruque sans serrer : elle doit tenir sans tirer.',
      expect: 'Une pose qui commence sur un dessous à l’aise : pas de tiraillement dès le premier jour. Le confort du premier jour est le prédictif de toute la portée — et de l’état du dessous à la dépose.',
    },
    {
      action: 'Soin léger et aqueux du cuir chevelu',
      why: 'Le cuir chevelu sous une pose a besoin d’eau, pas de matière : un soin léger à base d’eau garde le confort sans dépôt, pendant que les beurres et huiles épaisses collent, chauffent et entretiennent l’irritation. La règle est la même qu’en coiffure protectrice — aqueux et régulier.',
      how: 'Une brume aqueuse ou un soin léger sur le cuir chevelu, une à deux fois par semaine, massé aux pulpes, sans rinçage. Ne poser aucun produit épais sous la pose : le cuir chevelu ne doit pas être alourdi pendant des semaines.',
      expect: 'Un cuir chevelu frais et à l’aise pendant toute la portée, sans odeur ni irritation. La fraîcheur qui dure plusieurs semaines est le signe que la routine tenue est la bonne.',
    },
  ];
  if (f.isScalp) {
    steps.push({
      action: 'Cuir chevelu sensible : apaiser avant la pose',
      why: 'Poser une perruque sur un cuir chevelu qui tire, gratte ou s’irrite, c’est sceller l’inconfort pendant des semaines : la sécheresse s’aggrave à l’abri de la coiffure. Si le cuir chevelu n’est pas apaisé avant, il ne le sera pas pendant — l’apaisement passe avant l’installation.',
      how: 'Un soin cuir chevelu léger et aqueux avant la pose ; espacer les portées serrées si les inconforts reviennent. Des plaques, une douleur ou des chutes localisées : c’est un avis professionnel, pas une routine.',
      expect: 'Un cuir chevelu confortable avant la pose, qui le reste pendant. Si les inconforts persistent malgré l’apaisement, la cause est la tension de la pose — à régler avant la prochaine.',
    });
  }
  return steps;
}

function buildWigEvening(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Pendant la portée : fraîcheur et propreté',
      why: 'La portée se vit au quotidien : transpiration, chaleur, frottement — l’entretien léger et régulier est ce qui fait qu’une pose de plusieurs semaines reste confortable. Ce n’est pas un ajout de produit, c’est de la propreté : linge propre, soin aqueux, cuir chevelu sec.',
      how: 'Chaque soir si besoin : un linge propre et léger sous la pose ; un spray aqueux très léger uniquement si le cuir chevelu tire — jamais sur cuir humide. Les jours chauds, laisser le cuir chevelu respirer sans la pose le plus possible.',
      expect: 'Une journée sans odeur, un cuir chevelu sec au toucher le soir. Si l’odeur revient malgré la propreté, c’est un signal de lavage en profondeur, pas d’ajout de parfum.',
    },
    {
      action: 'Nuit en satin, pose détendue',
      why: 'La nuit sous une pose, la friction du coton et la transpiration fatiguent le cuir chevelu et la pose à la fois : bonnet ou taie en satin protège les deux, et une pose trop serrée la nuit use la raie et les tempes sans qu’on le voie.',
      how: 'Bonnet ou taie en satin chaque nuit, pose vérifiée détendue avant de dormir. Si la pose bouge la nuit, ajuster la taille ou l’attache — un ajustement tient mieux que dix nuits serrées.',
      expect: 'Une pose qui tient, un cuir chevelu moins irrité au réveil, une raie qui reste intacte sur la durée de la portée.',
    },
  ];
  return steps;
}

function buildWigWeekly(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'À la dépose : contrôler raie et tempes',
      why: 'La dépose est l’heure de vérité du cycle perruque : c’est là que se voit ce que la portée a coûté au dessous — casse en raie, usure des tempes, tiraillements. Le contrôle régulier est ce qui fait que la prochaine pose repart de plus loin, pas de plus près.',
      how: 'À chaque dépose : examiner la raie, les tempes, le contour — casse, irritation, zones qui tirent. Noter ce qui change d’une portée à l’autre. Si une zone s’use : changer la pose ou la tension avant la prochaine, sans exception.',
      expect: 'Un dessous qui reste fort et souple porté après porté : c’est l’indicateur honnête que les poses ne coûtent rien aux racines. Une usure qui revient à la même place, c’est un signal à traiter avant la suite.',
    },
    {
      action: 'Laisser le cuir chevelu respirer entre deux poses',
      why: 'Un cuir chevelu qui passe d’une pose à l’autre sans relâche ne se repose jamais : sécheresse, fatigue et irritation s’installent dans l’intervalle. Quelques jours sans pose — avec la routine légère d’entretien — sont ce qui fait durer les portées suivantes.',
      how: 'Quelques jours entre deux poses : cuir chevelu propre, soin aqueux léger si sécheresse, coiffure détendue, satin la nuit. Ne jamais reposer une perruque sur un cuir chevelu qui tire ou gratte.',
      expect: 'Un cuir chevelu qui repart frais à chaque nouvelle pose, des portées qui restent confortables semaine après semaine. La régularité de l’intervalle est le geste le plus sous-estimé du cycle perruque.',
    },
    {
      action: 'Nettoyage profond occasionnel',
      why: 'Sous une pose, les résidus — transpiration, produits, eau calcaire — s’installent plus vite que d’habitude : un nettoyage profond occasionnel remet le cuir chevelu et les racines à zéro avant la prochaine portée. C’est un geste correcteur, pas un rythme.',
      how: 'Entre deux poses, une fois par mois ou quand le cuir chevelu pèse ou tire : un nettoyant doux, massage aux pulpes, rince long. Si le cuir chevelu a besoin d’un nettoyage chaque semaine, la cause est en amont — un soin trop lourd, ou une pose trop serrée.',
      expect: 'Un cuir chevelu plus léger, plus à l’aise, et des portées suivantes plus confortables. Après le nettoyage, l’hydratation légère repart plus vite — c’est le signe que les résidus étaient le problème.',
    },
  ];
  // D9 — le passé chaleur/chimie se lit dans TOUS les cycles hebdo
  // (la promesse du résumé doit être tenue, pas seulement annoncée).
  steps.push(...chemSteps(f));
  return steps;
}

/* ------------------------------------------------------------------ */
/* Cycle enfant — le rituel est l’objectif                             */
/* ------------------------------------------------------------------ */

function buildKidEvening(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Rafraîchissement léger si besoin',
      why: 'Entre deux lavages, les cheveux de l’enfant sèchent comme les autres — mais la routine doit rester courte : un geste, pas une chaîne. Une brume d’eau sur les zones sèches suffit, et le « pas besoin aujourd’hui » est une réponse tout à fait correcte.',
      how: 'Une brume d’eau sur les longueurs sèches, une petite quantité de soin léger si la fibre tire, et on en reste là. Ne pas enchaîner les gestes : le rituel qui tient est le rituel court.',
      expect: 'Des cheveux souples au quotidien, sans routine interminable. Avec un enfant, la régularité d’un petit geste vaut mieux que la perfection d’une grande routine.',
    },
    {
      action: 'Nuit en satin, en douceur',
      why: 'Le frottement du coton la nuit casse les pointes et gâche le démêlage du lendemain : la taie en satin est le geste le plus simple du cycle enfant — et celui qui change le plus le réveil, sans demander aucun effort à l’enfant.',
      how: 'Taie en satin chaque nuit ; si l’enfant préfère un bonnet léger, c’est bon aussi. Le geste se fait dans la routine du soir, sans moment de lutte : il tient parce qu’il est invisible.',
      expect: 'Un réveil sans nœuds, un démêlage du matin plus facile, moins de cheveux cassés aux pointes. La différence se voit en quelques semaines de régularité.',
    },
  ];
  return steps;
}

function buildKidWeekly(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Observer le cuir chevelu de l’enfant',
      why: 'Le cuir chevelu d’un enfant est plus fin et plus sensible : sécheresse et irritations y reviennent vite, et l’enfant ne sait pas toujours les formuler. L’observation régulière — grattage, rougeurs, plaques — est le premier geste de protection, avant tout produit.',
      how: 'Après chaque lavage, examiner le cuir chevelu pendant le séchage : rougeurs, pellicules, plaques, zones qui grattent. Soin léger et aqueux uniquement en cas de sécheresse, jamais de produit parfumé ou agressif. Noter ce qui revient, et quand.',
      expect: 'Un cuir chevelu sans irritation, et un œil entraîné : ce qui revient, quand, après quoi. Des plaques, une douleur ou une chute localisée, c’est un signal pour un avis professionnel — pas un problème de routine.',
    },
    {
      action: 'Ajuster le rituel, pas le forcer',
      why: 'La routine enfant se juge sur un seul critère : l’enfant accepte-t-il de revenir la semaine suivante ? Un rituel qui se termine en lutte est un rituel qui ne tiendra pas — et c’est le rituel qui protège les cheveux, pas la liste des produits.',
      how: 'Chaque semaine, une question simple : qu’est-ce qui s’est bien passé, qu’est-ce qui a posé problème ? Raccourcir ce qui fatigue, déplacer ce qui ne tient pas, garder ce qui fonctionne. La routine grandit avec l’enfant, pas avant.',
      expect: 'Un rituel stable que l’enfant accepte — c’est lui le critère. Moins de lutte, plus de confiance, et des cheveux qui se portent mieux parce que la routine se tient.',
    },
  ];
  return steps;
}

/* ------------------------------------------------------------------ */
/* Cycle transition (défrisage) — deux textures, une ligne fragile     */
/* ------------------------------------------------------------------ */

function buildTransitionMorning(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Laver en douceur, raie d’abord',
      why: 'En transition, le cuir chevelu et la zone de démarcation — la frontière entre racines naturelles et longueurs traitées — sont les points les plus sollicités : c’est là que les deux textures se rencontrent et que la tension s’installe. Le lavage commence par la raie, en douceur, sans décaper.',
      how: 'Commencer par masser le cuir chevelu et la zone de démarcation avec les pulpes, nettoyant doux, rince à l’eau tiède. Les longueurs traitées supportent mal les produits trop lourds comme les racines naturelles les supportent mal trop secs — adapter par zone.',
      expect: 'Un cuir chevelu propre, une zone de démarcation qui ne tire pas, et des longueurs légères. Si la ligne pèse ou gratte après le lavage, la cause est plus souvent un résidu qu’un produit agressif.',
    },
    {
      action: 'Conditionner : deux zones, deux besoins',
      why: 'Deux types de fibre dans la même chevelure n’ont pas le même besoin : les racines naturelles (crépues) demandent de l’hydratation et de la douceur au démêlage ; les longueurs traitées demandent de la légèreté et de la protection. Un soin unique appliqué partout ne sert personne.',
      how: 'Conditionneur sur les racines naturelles, démêlage humide et glissant des pointes vers la racine ; sur les longueurs traitées, un soin plus léger, sans surcharge. La raie reste libre : ne jamais coiffer en tirant d’un côté et de l’autre de la ligne.',
      expect: 'Des racines souples et démêlées, des longueurs nettes et légères, et une ligne de démarcation intacte. L’harmonie des deux zones vient de l’adaptation par zone, pas d’un produit unique.',
    },
    {
      action: 'Hydrater par zone, sans alourdir',
      why: 'Les nouvelles racines non traitées redemandent ce que les longueurs ne demandent plus : de l’hydratation régulière. Les longues traitées, elles, cassent plus vite quand on les surcharge — l’hydratation en transition est une hydratation de précision, zone par zone.',
      how: 'Sur cheveux essorés : un leave-in plus riche sur les racines naturelles, une brume ou un leave-in fin sur les longueurs traitées. Ne jamais mélanger les textures sous tension — la raie reste libre, le satin la protège la nuit.',
      expect: 'Des racines souples, des longueurs qui ne pèsent pas, et une démarcation qui ne casse pas. Le test est simple : chaque zone se porte à son rythme, sans que l’une en souffre pour l’autre.',
    },
  ];
  return steps;
}

function buildTransitionEvening(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Protéger la ligne de démarcation',
      why: 'La frontière entre racines naturelles et longueurs traitées est la zone la plus fragile de la chevelure en transition : c’est là que la casse s’installe, là que les coiffures tirent d’un côté et de l’autre. La protéger chaque jour — satin, coiffures sans tension, hydratation légère — est le geste central du cycle.',
      how: 'Chaque soir : une brume légère sur la zone de démarcation si elle tire, coiffure sans tension sur la raie, satin la nuit. Éviter les coiffures qui tirent les racines naturelles d’un côté et les longueurs traitées de l’autre.',
      expect: 'Une ligne nette, sans casse ni usure au contour, semaine après semaine. Sur un mois, la démarcation reste intacte — c’est l’indicateur que les coiffures ne coûtent rien à la zone fragile.',
    },
    {
      action: 'Nuit en satin, coiffure détendue',
      why: 'La nuit, la friction du coton use les deux textures à la fois — et la ligne de démarcation en premier : bonnet ou taie en satin protège l’hydratation des racines, la forme des longueurs, et la zone qui fait le lien entre les deux.',
      how: 'Taie en satin ou bonnet léger chaque nuit, coiffure détendue avant de dormir. Rien ne doit tirer sur la raie ni les tempes pendant le sommeil — vérifier la coiffure du soir avant de s’allonger.',
      expect: 'Un réveil sans nœuds, une ligne de démarcation intacte, des racines moins sèches. La protection de la nuit est le geste le moins visible et le plus rentable du cycle transition.',
    },
  ];
  return steps;
}

function buildTransitionWeekly(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [
    {
      action: 'Examiner la ligne de démarcation',
      why: 'La ligne de démarcation est le point de contrôle du cycle transition : c’est là que se voient la casse, l’usure et l’effet des coiffures. Une inspection régulière et notée est ce qui permet de distinguer ce qui s’use de ce qui est normal, et d’agir sur la vraie cause.',
      how: 'Chaque semaine, examiner la ligne : casse en longueur, tiraillement en raie, forme de la démarcation, zones qui cèdent. Noter ce qui change d’une semaine à l’autre. Si une zone s’use : changer la coiffure ou la tension avant la suivante, sans exception.',
      expect: 'Une ligne qui reste nette sur un mois, sans casse ni usure au contour. Les notes hebdomadaires racontent la tendance — c’est elle qui oriente le choix des coiffures et des soins.',
    },
    {
      action: 'Le choix honnête : fade ou continuité',
      why: 'La transition pose un choix qui n’en est pas un : faire progressivement place aux racines naturelles, ou continuer le défrisage — les deux sont des choix valides. Ce qui est hors sujet, c’est de coiffer les deux textures comme une seule : la routine s’adapte au choix, pas l’inverse.',
      how: 'Décider du cap (progressif ou continué) et aligner la routine dessus : coiffures, fréquence de lavage, soins par zone. La ligne de démarcation se protège dans les deux cas — c’est la seule constante du cycle transition.'
        + (f.transitionStep === 'majorite'
          ? ' Longueurs traitées encore majoritaires : le cap utile n’est pas la coupe, c’est la stabilisation — alternance force/hydratation sur la ligne, coiffures qui ne brossent pas les deux textures ensemble, et retouches jamais plus rapprochées que 8 à 10 semaines.'
          : f.transitionStep === 'minorite'
            ? ' Le fade est engagé : la ligne recule, la zone fragile recule avec elle. Tenir le programme jusqu’à la sortie des longueurs traitées — pas avant, elles ne sont pas encore remplacées.'
            : f.transitionStep === 'quasi_nulle'
              ? ' Les longueurs traitées sont presque parties : le programme quitte le mode réparation. Rien à « homogénéiser » chimiquement — c’est la texture naturelle nouvelle qui mérite la routine, dans sa forme à elle.'
              : ''),
      expect: 'Une routine cohérente avec le choix, une ligne de démarcation protégée, et des semaines qui avancent sans casse au contour. La transition se gagne par la cohérence des gestes, pas par la vitesse.',
    },
  ];
  // D9 — le passé chaleur/chimie se lit dans TOUS les cycles hebdo
  // (la promesse du résumé doit être tenue, pas seulement annoncée).
  steps.push(...chemSteps(f));
  return steps;
}

/* ------------------------------------------------------------------ */
/* Préoccupation déclarée (question adaptative) — l'étape qui la sert  */
/* ------------------------------------------------------------------ */

type FocusStep = { slot: 'morning' | 'evening' | 'weekly'; step: HairStepDraft };

const FOCUS_STEPS: Record<string, FocusStep> = {
  // — locks
  locks_allonger: {
    slot: 'weekly',
    step: {
      action: 'Préserver chaque centimètre',
      why: 'Avec des locks, la longueur se gagne par la préservation : ce qui casse ou s’amincit en longueur est perdu. Les pointes filantes et les micro-cassures s’installent sans bruit — l’inspection régulière est ce qui les arrête avant qu’elles ne montent.',
      how: 'Après chaque lavage, inspecter les locks : repérer les cassures en longueur et les pointes filantes. Couper seulement l’extrémité des pointes cassées, jamais en longueur, et réduire la manipulation des locks qui s’amincissent.',
      expect: 'Moins de cheveux cassés au fil des semaines, des locks qui gardent leur épaisseur. La longueur se juge en mois : c’est la régularité de l’inspection qui paie, pas le produit.',
    },
  },
  locks_propre: {
    slot: 'weekly',
    step: {
      action: 'Lavage profond contre le dépôt',
      why: 'Le buildup — accumulation de produits — est le premier ennemi des locks : il durcit la lock, attise l’odeur et la sécheresse, et empêche l’eau et les soins légers de travailler. Un lavage profond, occasionnel, remet le cycle à zéro.',
      how: 'Une fois par mois (ou dès que la lock devient rêche et que l’odeur revient) : un nettoyant clarifiant doux sur le cuir chevelu et dans les locks, massage appuyé des racines, rince long. Ensuite, repartir sur des soins aqueux et légers uniquement.',
      expect: 'Des locks plus légères, une odeur qui disparaît, une hydratation qui repart mieux. Si l’odeur revient en quelques jours, la cause est un soin trop lourd — pas un lavage de plus.',
    },
  },
  locks_cuirs: {
    slot: 'morning',
    step: {
      action: 'Cuir chevelu entre les locks : soin aqueux',
      why: 'Entre les locks, le cuir chevelu est ombragé et sèche plus vite : tiraillements, gratte et pellicules y reviennent d’abord. Le soin passe par l’eau et des textures légères — les beurres et huiles y laissent un dépôt qui entretient l’irritation.',
      how: 'À chaque lavage, masser le cuir chevelu lock par lock avec les pulpes ; entre les lavages, une brume aqueuse, une à deux fois par semaine, en écartant les locks. Ne jamais appliquer de beurre ni d’huile épaisse sur le cuir chevelu entre les locks.',
      expect: 'Un cuir chevelu qui ne tire plus, la gratte qui s’espace en quelques jours. Si des plaques, douleurs ou chutes localisées apparaissent : c’est un signal pour un avis professionnel, hors du périmètre d’une routine beauté.',
    },
  },
  locks_regularite: {
    slot: 'weekly',
    step: {
      action: 'Le rythme du retwist : ni trop, ni trop tard',
      why: 'Une lock qui se resserre le doit à un rythme, pas à l’effort : retwister trop souvent ou trop serré casse et amincit ; trop rarement, la racine mat et la forme se perd. Le rythme juste, c’est les nouvelles racines seulement, à intervalles réguliers, sans tension.',
      how: 'Toutes les deux semaines environ : retwist léger des nouvelles racines, palm rolling des pointes vers la racine, sans serrer. Ne pas retwister les longueurs déjà formées — l’eau et le soin suffisent. Un calendrier simple vaut mieux qu’un effort intense.',
      expect: 'Des racines qui se resserrent sans mat ni casse en longueur. Le résultat se voit en mois : la régularité du geste est le seul paramètre qui compte, pas la fréquence des efforts.',
    },
  },
  locks_douceur: {
    slot: 'evening',
    step: {
      action: 'Douceur entre deux lavages : eau, pas matière',
      why: 'Le frizz et la raideur d’une lock entre deux lavages viennent de la sécheresse, pas du manque de produit : l’eau ramollit et assouplit, les beurres et huiles lourds déposent et durcissent. La douceur qui tient se garde avec un minimum de matière, pas un maximum.',
      how: 'Une brume d’eau sur les locks, palm rolling léger pour réaligner, et seulement si besoin une toute petite quantité d’huile légère sur les pointes — jamais sur toute la longueur. Si la lock durcit ou sent, c’est un lavage, pas un ajout de soin.',
      expect: 'Des locks souples au toucher sur toute la semaine, sans dépôt. Le test est simple : la lock doit rester souple au pincement — si elle pince, on retire de la matière, on n’en ajoute pas.',
    },
  },
  // — protectrice
  prot_tension: {
    slot: 'morning',
    step: {
      action: 'Installer sans tension : la règle d’or',
      why: 'La raie, les tempes et les edges sont les zones qui cèdent en premier : chaque attache qui tire — y compris les baby hairs tirés pour un contour net — use la racine, et l’usure est lente à se voir, vite à s’installer. La tension se joue à l’installation : c’est le moment unique où tout se règle.',
      how: 'Avant de sortir, contrôler zone par zone : aucune section ne doit tirer sur la raie ni les tempes. Pour les edges : ne jamais tirer les baby hairs pour « nettoyer » le contour — les laisser tomber, un produit léger posé sans tension. Si la coiffure tire à l’installation, la détendre ou la refaire plus souple — une raie nette obtenue en tirant est une raie qui s’use.',
      expect: 'Aucun tiraillement aux racines pendant toute la durée de la coiffure, un contour net sans usure. Au bout de quelques cycles, raie, tempes et edges restent intacts : c’est l’observation qui compte, porté après porté.',
    },
  },
  prot_cuirs: {
    slot: 'evening',
    step: {
      action: 'Sous la coiffure : lire le signal, pas empiler',
      why: 'Sous tresses ou twists, l’inconfort du cuir chevelu a des causes différentes qui appellent des réponses différentes : la tension tire, la sécheresse tire tout, les résidus pèsent et sentent. Ajouter du produit sans lire le signal entretient le problème — l’empilement n’est pas une réponse.',
      how: 'Quand c’est inconfortable, localiser la zone et nommer la sensation : tiraillement localisé en un point, en raie ou aux tempes = tension, détendre la coiffure. Tension générale, surtout au réveil, sans odeur = sécheresse, brume aqueuse. Pesanteur, odeur, cheveu qui a « vieilli » au bout de quelques jours = résidus, nettoyage profond. Noter la sensation identifiée — elle décide de la réponse suivante, pas l’habitude de resprayer.',
      expect: 'Un inconfort qui s’espace d’une semaine à l’autre, et des réponses qui ciblent la cause. La note de sensation est l’indicateur : une même sensation qui revient au même endroit est un signal à traiter (détendre, nettoyer), pas à supporter. Si des plaques, douleurs ou chutes localisées apparaissent : avis professionnel, hors du périmètre d’une routine beauté.',
    },
  },
  prot_duree: {
    slot: 'evening',
    step: {
      action: 'Rafraîchir les racines sans défaire',
      why: 'Une coiffure se vieillit d’abord aux racines : les nouvelles pousses et le contour trahissent la durée. Le rafraîchissement en douceur — sans défaire ni retoucher sous tension — est ce qui prolonge la tenue propre de la coiffure jusqu’au bout.',
      how: 'Rafraîchir les nouvelles racines avec une petite attache souple ou un gel léger, sans tirer ; contrôler le contour avec un soin léger et une brosse douce, sans presser contre le cuir chevelu. Un rafraîchissement de plus en plus léger vaut mieux qu’un refait.',
      expect: 'Une coiffure qui reste nette jusqu’au bout, sans retouche qui abîme. La durée de vie d’une coiffure se joue sur la douceur du rafraîchissement, pas sur le nombre de produits.',
    },
  },
  prot_lavage: {
    slot: 'morning',
    step: {
      action: 'Laver sous la coiffure, sans tout défaire',
      why: 'Laver sous une coiffure attachée est un art : l’eau et le produit doivent atteindre le cuir chevelu sans frotter les longueurs ni tirer les sections. C’est le geste qui évite de devoir tout défaire pour nettoyer — et qui garde la fraîcheur sur la durée de la coiffure.',
      how: 'Cheveux mouillés, section par section : masser le cuir chevelu avec les pulpes dans la raie de chaque section, un nettoyant doux sans décaper, rincer à l’eau tiède sans frotter. Sécher à l’air avant de refermer la coiffure — jamais de coiffure posée sur du mouillé.',
      expect: 'Un cuir chevelu propre sous la coiffure, sans odeur ni résidu, et la coiffure intacte. Si le cuir gratte après chaque lavage, la cause est plus souvent la tension ou un résidu qu’un produit agressif.',
    },
  },
  prot_longueurs: {
    slot: 'morning',
    step: {
      action: 'Hydrater les longueurs avant de les protéger',
      why: 'Sous une coiffure, les longueurs ne voient plus les soins du quotidien : l’hydratation appliquée avant l’installation est celle qui tient jusqu’à la dépose. C’est l’occasion unique de les nourrir — elle ne se refait pas en cours de coiffure, il ne faut pas la manquer.',
      how: 'Avant l’installation, sur cheveux propres et humides : un soin hydratant léger sur les longueurs (pas de beurre épais qui déposera sous la coiffure), puis installer. En cours de coiffure, les longueurs reçoivent rien — c’est voulu, c’est la méthode.',
      expect: 'À la dépose, des longueurs souples et hydratées, pas sèches et rêches. C’est le test honnête : l’état des longueurs à la sortie dit si l’hydratation d’avant a tenu toute la durée.',
    },
  },
  // — perruque
  wig_cuirs: {
    slot: 'evening',
    step: {
      action: 'Le dessous qui tire : identifier la cause',
      why: 'Sous une pose, l’inconfort du dessous a des causes différentes qui appellent des réponses différentes : la tension de l’installation use la raie et les tempes, la transpiration qui stagne pèse et sent, un produit posé avant la pose peut irriter. Répondre à l’inconfort sans l’identifier, c’enchaîner les portées inconfortables.',
      how: 'Quand le dessous tire ou gratte : localiser et nommer. Tiraillement en raie ou aux tempes = tension de la pose — la détendre ou la reposer plus souple. Pesanteur et odeur qui reviennent = transpiration et résidus — linge propre sous la pose, nettoyage en profondeur entre deux poses. Gratte généralisée après un soin posé avant la pose = le produit — le retirer pour la suivante. Noter la cause — elle règle la prochaine pose.',
      expect: 'Des portées dont l’inconfort s’espace, portée après portée. La cause notée est le levier : on règle la tension, l’entretien ou le produit — pas tout à la fois. Si des plaques, douleurs ou chutes localisées apparaissent : avis professionnel, hors du périmètre d’une routine beauté.',
    },
  },
  wig_edges: {
    slot: 'morning',
    step: {
      action: 'Racines et contour : la zone fragile de la pose',
      why: 'Sous une pose, les racines et le contour restent la zone la plus exposée : elles portent la tension de l’installation et la friction quotidienne. C’est là que la casse s’installe sans bruit — la protection se fait avant la pose, et pendant, pas seulement à la dépose.',
      how: 'Avant chaque pose : cuir chevelu propre, sec, aucune tension sur la raie ni le contour ; installer sans serrer. Pendant la portée, ne jamais coiffer le contour sous tension pour « finir » le style — un contour tiré est un contour qui casse.',
      expect: 'Des racines intactes à la dépose : pas de cassure, pas de tiraillement en raie. Sur plusieurs portées, le contour reste net — c’est l’indicateur que la pose ne coûte rien aux racines.',
    },
  },
  wig_transpiration: {
    slot: 'evening',
    step: {
      action: 'Les jours chargés : le protocole fraîcheur',
      why: 'Chaleur, sport, longues journées dehors : c’est là que la transpiration s’installe le plus vite sous une pose — l’humidité qui stagne fatigue le cuir chevelu et appelle l’odeur en fin de journée. Les jours ordinaires, le geste de base suffit ; les jours chargés, il faut anticiper en trois temps, pas subir en fin de journée.',
      how: 'Avant de sortir : dessous propre et sec, pose détendue, pas serrée à cause de la chaleur. Pendant la journée : un linge propre et léger sous la pose, à changer s’il s’humidifie ; au pic de chaleur, quelques heures sans pose ou pose détendue. Le soir : contrôler l’odeur et l’humidité au toucher — si l’odeur revient malgré le linge, c’est un nettoyage en profondeur entre deux poses, pas un parfum.',
      expect: 'Une journée chaude sans inconfort au soir, un cuir chevelu sec au toucher. La règle tient en un point : l’humidité ne stagne jamais — elle est changée (linge), évacuée (aération) ou nettoyée (entre deux poses).',
    },
  },
  wig_entretien: {
    slot: 'weekly',
    step: {
      action: 'La perruque entre deux poses : l’entretien',
      why: 'Une perruque bien entretenue vit plus longtemps et se pose plus propre : les résidus de produits, la transpiration et les nœuds s’installent entre deux poses — c’est là qu’elle s’use. L’entretien est un soin à part, pas une corvée faite au dernier moment.',
      how: 'Après chaque dépose : démêler aux doigts sur cheveu humide avec un conditionneur, laver avec un nettoyant doux, rincer long, sécher à plat ou sur un support à l’air libre. Rangement suspendu ou sur support, à l’abri de la poussière.',
      expect: 'Une perruque qui se repose propre, sans nœuds ni odeur, et dont la durée de vie s’allonge. Le test : elle doit être prête à se reposer directement, sans lavage de dernière minute.',
    },
  },
  // — enfant
  enf_demeler: {
    slot: 'morning',
    step: {
      action: 'La méthode démêlage, du début à la fin',
      why: 'Avec un enfant, le démêlage se joue sur la méthode, pas sur le produit : cheveu mouillé et glissant, outil à dents larges, des pointes vers la racine, et jamais de tirage — grimacer, c’est le signal de ralentir, pas de forcer. La méthode tient toute la routine.',
      how: 'Commencer par le bas (pointes), petites sections, avancer vers la racine ; si ça accroche : plus d’eau, plus de produit, on recule d’un pas. Terminer sur un geste simple que l’enfant peut faire lui-même, pour que la méthode devienne habitude.',
      expect: 'Un démêlage où l’enfant accepte de revenir la semaine suivante : c’est le seul objectif qui compte. Moins de tirage, moins de larmes, plus de confiance dans le rituel.',
    },
  },
  enf_patience: {
    slot: 'evening',
    step: {
      action: 'Trois gestes qui tiennent, pas cinq qui s’abandonnent',
      why: 'Avec un enfant, une routine trop longue ne tient pas : mieux vaut trois gestes simples répétés que cinq gestes parfaits abandonnés. La régularité d’un rituel court est ce qui protège les cheveux — pas la complétude d’une routine de grand.',
      how: 'Choisir trois gestes maximum : un hydratant léger sur les longueurs humides, un démêlage rapide des pointes si besoin, et la nuit en satin. Tout le reste attend — la routine grandira avec l’enfant, pas avant.',
      expect: 'Un rituel de moins de dix minutes que l’enfant accepte — c’est lui le critère. Les cheveux se portent mieux quand la routine se tient, même courte.',
    },
  },
  enf_cuirs: {
    slot: 'morning',
    step: {
      action: 'Quand l’enfant se gratte : la réponse',
      why: 'Le grattage est le premier signal du cuir chevelu de l’enfant — il ne formule pas toujours ce qui le gêne. Interdire ou gronder fait perdre le signal ; le lire comme un message protège le cuir chevelu et la confiance dans la routine. Chaque zone gratée pointe une cause précise, et la cause appelle une réponse précise.',
      how: 'Quand l’enfant se gratte : identifier la zone. Sécheresse (zone qui tire, petites pellicules fines) = une brume aqueuse et un soin léger sans parfum, massés aux pulpes, posés avec l’enfant et non sur l’enfant. Zone qui gratte toujours à la même place, ou rougeur persistante = ne pas soigner à l’aveugle : c’est un signal pour un avis professionnel. Jamais de force : un soin gagné en lutte se recommence en guerre.',
      expect: 'Des grattages qui s’espacent, et un enfant qui accepte le soin — c’est lui le critère. Une zone qui gratte toujours à la même place après un mois, ou une rougeur qui persiste : avis professionnel, pas routine.',
    },
  },
  enf_texture: {
    slot: 'morning',
    step: {
      action: 'Respecter la texture, sans alourdir',
      why: 'La fibre d’un enfant est fine et fragile : elle se porte avec le minimum de produit et le maximum de douceur. Les textures lourdes (beurres épais, huiles) alourdissent et cassent plus qu’elles ne nourrissent — l’eau et un soin léger suffisent largement.',
      how: 'Sur cheveux humides : un leave-in léger, une petite quantité, et le satin la nuit. Ne pas multiplier les produits : un bon démêlage humide et un hydratant léger valent mieux qu’une routine de grand.',
      expect: 'Des cheveux souples, faciles à coiffer, sans effet collant. La texture de l’enfant se porte avec simplicité — c’est elle qui décidera plus tard de ce qu’elle aime.',
    },
  },
  // — transition
  trans_ligne: {
    slot: 'weekly',
    step: {
      action: 'La ligne de démarcation : inspecter, noter, agir',
      why: 'La frontière entre racines naturelles et longueurs traitées est la zone où la casse s’installe sans bruit : sans méthode, on ne voit l’usure qu’à la dépose — trop tard. Inspecter, noter, et ajuster les coiffures avant que la zone ne s’use, c’est ce qui protège la ligne sur la durée.',
      how: 'Chaque semaine, cinq minutes : examiner la ligne en lumière (cassures, zones qui tirent, forme), noter l’observation dans le journal, et identifier la coiffure de la semaine qui a tiré sur la ligne. La semaine suivante, éliminer ou détendre cette coiffure.',
      expect: 'Une ligne qui reste nette sur un mois, et des notes qui montrent la tendance — c’est elle qui permet d’agir avant l’usure, pas après. Les coiffures qui reviennent dans les notes sont celles à remplacer.',
    },
  },
  trans_melanges: {
    slot: 'morning',
    step: {
      action: 'Deux textures, une seule coiffure : les règles',
      why: 'La casse en transition s’installe surtout quand la coiffure traite les deux textures comme une seule : elle tire les racines naturelles d’un côté et les longueurs traitées de l’autre, et la ligne de démarcation paie l’écart entre les deux. Les soins par zone sont déjà en place — il faut maintenant les prolonger dans le choix et le geste des coiffures, sinon la ligne cède.',
      how: 'Trois règles à chaque coiffure : la raie passe par la ligne de démarcation, jamais à travers ; chaque zone est coiffée dans le sens de sa texture — les racines naturelles en douceur dans leur propre forme, les longueurs traitées comme elles le veulent ; une coiffure qui tire d’un côté et de l’autre de la ligne ne reste pas, détendue ou remplacée. La règle se vérifie à l’installation et au réveil, pas seulement en fin de journée.',
      expect: 'Des coiffures qui tiennent sans user la ligne, semaine après semaine. Le test est simple : la ligne reste nette et les deux zones se portent à leur rythme — c’est l’indicateur que les coiffures travaillent avec les textures, pas contre elles.',
    },
  },
  trans_fibre: {
    slot: 'weekly',
    step: {
      action: 'Renforcer la fibre traitée',
      why: 'Les longueurs traitées sont les plus cassantes : l’usure a modifié la fibre, et c’est en longueur qu’elle cède. Un soin de force, en alternance avec l’hydratation, est ce qui les tient — trop de force sans hydratation rend le cheveu rêche, l’équilibre est la technique.',
      how: 'Une à deux fois par mois, un masque ou soin de force sur les longueurs traitées uniquement, 20 minutes sous bonnet, puis rincer. Alterner avec un masque hydratant : l’équilibre force / hydratation est ce qui fait tenir la fibre sur la durée.',
      expect: 'Moins de casse en longueur sur les longueurs traitées, au fil des semaines. Le cheveu cassant qui redevient souple est le signe que l’alternance tient.',
    },
  },
  trans_racines: {
    slot: 'evening',
    step: {
      action: 'Les racines naturelles : hydratation régulière légère',
      why: 'Les nouvelles racines non traitées redemandent ce que les longueurs ne demandent plus : de l’hydratation régulière et de la douceur. C’est la zone la plus vivante de la chevelure — et la plus sèche, car le sébum ne la sert pas : elle a besoin d’un geste régulier, léger.',
      how: 'Chaque jour ou jour sur deux : une brume ou un leave-in léger sur les racines naturelles, sans frotter, sans tension. Le satin la nuit protège l’hydratation et la démarcation — les deux ensemble font la routine.',
      expect: 'Des racines souples, moins sèches au toucher, et une démarcation qui ne casse pas. L’hydratation régulière des racines est ce qui fait tenir la transition au quotidien.',
    },
  },
  // — naturel cresp
  cresp_hydratation: {
    slot: 'evening',
    step: {
      action: 'Rétention d’hydratation : garder l’eau dans la fibre',
      why: 'Le cheveu très crépu perd son humidité vite : sa structure ralentit la remontée du sébum et accélère l’évaporation. La rétention — eau, puis scellement léger, à intervalles réguliers — est ce qui change la souplesse au quotidien, plus que n’importe quel masque ponctuel.',
      how: 'Chaque matin ou soir : une brume d’eau sur les longueurs, un leave-in léger pour retenir, et le satin la nuit. Ne pas attendre que le cheveu soit sec pour réhydrater : le geste se fait sur cheveu encore souple.',
      expect: 'Un cheveu souple au toucher toute la semaine, moins de sécheresse en pointes, un démêlage plus facile. La rétention se juge au quotidien — c’est elle qui fait la différence.',
    },
  },
  cresp_demelage: {
    slot: 'evening',
    step: {
      action: 'Le démêlage d’entretien, entre deux lavages',
      why: 'Le cheveu très crépu s’emmêle plus vite qu’il ne semble : les nœuds qui s’installent entre deux lavages sont ceux qui casseront au lavage suivant. Un léger démêlage d’entretien, humide et glissant, avant que les nœuds ne s’ancrent, est ce qui protège la fibre au quotidien.',
      how: 'Deux à trois fois par semaine : une brume d’eau sur la zone qui s’emmêle, une micro-quantité de démêlant ou de leave-in, puis un passage aux doigts et à l’outil à dents larges — des pointes vers la racine, sans forcer. Si ça accroche vraiment, c’est un lavage, pas un démêlage.',
      expect: 'Moins de nœuds au lavage, une fibre qui casse moins au démêlage. Le test est simple : le peigne rend moins de cheveux au lavage quand l’entretien d’entre-temps tient.',
    },
  },
  cresp_definir: {
    slot: 'evening',
    step: {
      action: 'Définir sans cartonner : le bon équilibre',
      why: 'La définition du cheveu très crépu se joue sur le produit léger, le geste et le séchage — pas sur la quantité. Un produit qui cartonne rigidifie et casse ; la définition souple vient d’un gel ou d’une crème légère, appliquée sur cheveu humide, et d’un séchage qui respecte la forme.',
      how: 'Sur cheveu humide : une petite quantité de gel ou crème, scrunching ou presse des mèches, séchage à l’air ou diffuseur doux. Ne pas toucher en séchant — la définition se fige, et se réactive le matin à l’eau, sans produit.',
      expect: 'Des mèches définies et souples, sans effet coque. La définition qui tient et reste mobile est le signe que la quantité et le séchage sont justes.',
    },
  },
  cresp_longueur: {
    slot: 'weekly',
    step: {
      action: 'Suivre la vraie longueur, shrinkage compris',
      why: 'Le cheveu très crépu se rétracte fortement : la longueur « perdue » est souvent dans la rétraction, pas dans la casse. La suivre honnêtement — sur cheveu humide étiré, de temps en temps — permet de distinguer ce qui casse de ce qui se rétracte, et d’agir sur le vrai problème.',
      how: 'Une fois par mois, mesurer ou photographier la longueur sur cheveu humide étiré (jamais sec). Noter les zones de casse (pointes, raie) et y adapter la routine : moins de manipulation, plus de protection la nuit, et une inspection des pointes régulière.',
      expect: 'Une longueur qui se stabilise, et une lecture honnête de ses progrès : ce qui se rétracte n’est pas perdu, ce qui casse s’observe et se corrige. Les notes mensuelles racontent la tendance.',
    },
  },
  // — naturel bouclé
  boucle_definition: {
    slot: 'evening',
    step: {
      action: 'La définition de la boucle : produit, geste, séchage',
      why: 'La boucle se définit à trois conditions : un produit adapté (crème ou gel léger), le bon geste (scrunching sur cheveu humide), et un séchage qui ne l’abîme pas. Un seul des trois en défaut et la boucle perd sa forme — c’est la méthode qui compte, pas la puissance du produit.',
      how: 'Sur cheveu humide : une crème légère, scrunching de bas en haut, séchage à l’air ou diffuseur doux, sans toucher. Le matin, réactiver à l’eau et repenser la forme — pas de nouveau produit, la méthode est déjà en place.',
      expect: 'Des boucles nettes, répétées d’une semaine à l’autre. La régularité de la méthode — pas la puissance du produit — est ce qui donne la définition stable.',
    },
  },
  boucle_frisottis: {
    slot: 'evening',
    step: {
      action: 'Réduire le frizz : humidité et friction',
      why: 'Le frizz de la boucle vient de l’humidité qui entre dans la fibre et de la friction (coton, toucher, séchage agressif). Le contrôler, c’est sceller la forme, protéger la nuit en satin, et ne plus toucher en séchant — pas empiler des produits anti-frizz qui alourdissent.',
      how: 'Après la définition, une micro-quantité d’huile légère sur les pointes pour sceller ; satin la nuit ; séchage sans friction. Ne pas « lisser » les frisottis au produit — les prévenir par la méthode, et ne toucher qu’une fois la forme prise.',
      expect: 'Des boucles nettes au réveil, moins d’effet broussaille en journée. Le frizz qui diminue vient de la protection, pas de la quantité de produit.',
    },
  },
  boucle_hydratation: {
    slot: 'morning',
    step: {
      action: 'Hydrater la boucle sans l’écraser',
      why: 'La boucle boit l’eau vite mais la perd aussi : l’hydratation qui tient est celle qui est scellée par du léger — crème fine ou huile légère — pas par un beurre épais qui pèse et aplati la forme. L’équilibre : de l’humidité dans la boucle, pas du poids qui l’écrase.',
      how: 'Sur cheveu humide : un leave-in hydratant, puis une micro-quantité de crème légère ou d’huile pour sceller. Si la boucle pèse et s’aplatit : retirer de la matière, pas en ajouter — la forme est le baromètre.',
      expect: 'Des boucles hydratées et légères, qui gardent leur volume. Le test est visuel : la forme tient, l’hydratation aussi — sans effet collant ni aplati.',
    },
  },
  boucle_longueur: {
    slot: 'weekly',
    step: {
      action: 'Soutenir les longueurs : pointes et casse',
      why: 'La pousse de la boucle se joue sur la préservation : les pointes sèches cassent, et la longueur « pousse » à la vitesse de ce qu’on ne perd pas. L’entretien des pointes et la réduction de la casse sont les deux leviers honnêtes — aucun produit n’accélère la fibre.',
      how: 'Une fois par semaine, inspecter les pointes : couper les fourches nettes. Une à deux fois par mois, un masque hydratant sur les longueurs. Satin la nuit, coiffures sans tension sur la raie — la préservation est une méthode, pas un achat.',
      expect: 'Des pointes propres, moins de casse au démêlage, une longueur qui se garde. La pousse « visible » est en réalité la casse évitée — c’est elle qu’on mesure.',
    },
  },
};

/** Ajoute l’étape qui sert la préoccupation déclarée (une par colonnes concernées). */
/**
 * D4 — LA COUCHE PARAMÈTRES (longueur, fréquence réelle, expérience) : le
 * croisement segment × paramètre produit des étapes RÉELLES, pas une simple
 * phrase de résumé. Chaque ajout vérifie la déduplication : un paramètre ne
 * recopie jamais une étape que le cycle du segment contient déjà.
 */
function applyParams(
  routine: { morning: HairStepDraft[]; evening: HairStepDraft[]; weekly: HairStepDraft[] },
  f: HairFlags
): { morning: HairStepDraft[]; evening: HairStepDraft[]; weekly: HairStepDraft[] } {
  const all = [...routine.morning, ...routine.evening, ...routine.weekly];
  const has = (re: RegExp) => all.some(step => re.test(step.action));
  const next = { morning: [...routine.morning], evening: [...routine.evening], weekly: [...routine.weekly] };

  // — Longueur —
  if (f.isLong && !f.isKid && !has(/Contrôle des pointes/)) {
    next.weekly.push({
      action: 'Contrôle des pointes',
      why: 'Une longueur longue porte toute l’usure à ses extrémités : les fourches remontent la mèche si on les laisse, et c’est ainsi qu’une chevelure saine perd sa longueur faute de surveillance.',
      how: 'En fin de semaine, mèche par mèche, palper les pointes et repérer les fourches naissantes ; protéger la nuit est le premier remède, la coupe se décide à un rendez-vous, pas à la maison entre deux lavages.',
      expect: 'Des pointes surveillées plutôt que surprises : la longueur ne se gagne pas au produit « pousse », elle se gagne à ce qui ne casse pas.',
    });
  }
  if (f.isShort && !has(/Doser selon la longueur/)) {
    next.evening.push({
      action: 'Doser selon la longueur',
      why: 'Sur une longueur courte, le produit parcourt déjà toute la mèche : doser comme sur des longueurs superpose sans hydrater davantage — et l’alourdissement tire sur les racines.',
      how: 'Une noisette maximum pour l’ensemble, appliquée sur cheveu humide ; étirer avec les doigts plutôt qu’ajouter une couche de plus, racines comprises.',
      expect: 'Des longueurs souples sans résidu ni racines alourdies — la preuve que le dosage compte autant que le produit.',
    });
  }

  // — Fréquence réelle —
  if (f.frequency === 'less_1x' && !has(/Rafra[îi]chis|entretenir entre/i) && !next.evening.some(st => /Recharger l’hydratation/i.test(st.action))) {
    next.evening.push({
      action: 'Recharger l’hydratation entre deux lavages',
      why: 'Moins d’un lavage par semaine veut dire des jours sans apport d’eau fraîche : le sébum ne remonte pas la fibre courbée, l’hydratation du jour de lavage s’évapore avant le suivant.',
      how: 'Aux jours du milieu de semaine, brume d’eau sur les longueurs puis scellement léger ; le cuir chevelu, lui, ne se rebrume pas — il se laisse respirer.',
      expect: 'Une souplesse qui tient jusqu’au lavage suivant au lieu de s’éteindre trois jours plus tôt — moins de nœuds au démêlage, c’est là que la différence se voit.',
    });
  }
  // Le « tout-alléger » n'a de sens que si le cycle n'a pas déjà son geste
  // d'entretien entre les lavages (naturel/locks l'ont) — sinon on ferait
  // doublon avec une reformulation du même service.
  if (f.frequency === '2x_semaine' && !f.isKid && !has(/all[ée]ger|Entretenir entre/i)) {
    next.evening.push({
      action: 'Alléger entre les deux lavages',
      why: 'Deux lavages par semaine, c’est la fibre remise à plat deux fois : ce qui tient entre les deux est un entretien aqueux minimal — un soin riche de plus ne protège rien, il se cumule.',
      how: 'Le jour sans lavage : brume d’eau sur les longueurs, scellement léger seulement si la fibre tire ; le contour se rince à l’eau claire, sans shampoing intermédiaire.',
      expect: 'Deux lavages qui ne se marchent pas dessus : chaque jour de lavage repart d’une base propre et souple, sans résidu à décoller.',
    });
  }

  // — Expérience —
  if (f.isBeginner && !has(/Un geste nouveau par semaine|changement à la fois/)) {
    next.weekly.push({
      action: 'Un geste nouveau par semaine',
      why: 'Débuter dix gestes à la fois finit abandonné au deuxième week-end : la routine qui protège le cheveu est celle qui est tenue — un ajout à la fois, le temps que le geste devienne automatique.',
      how: 'Choisir le premier jour de lavage fixe cette semaine ; n’ajouter le soin suivant que quand celui-là se fait sans y penser ; noter au passage ce qui change (démêlage, tiraillements).',
      expect: 'En un mois, trois gestes tenus valent plus qu’une routine idéale de liste — et vos notes rendront le prochain ajustement juste.',
    });
  }
  if (f.isExpert && !has(/Régler fin/)) {
    next.weekly.push({
      action: 'Régler fin : élasticité et temps de pose',
      why: 'Sur un cheveu qu’on connaît, le gain n’est plus dans les gestes mais dans les réglages : une fibre qui s’étire sans revenir manque d’eau, une fibre qui casse net manque de souplesse — les deux ne se soignent pas pareil.',
      how: 'Une fois par mois, étirer une mèche humide et observer le retour ; ajuster le temps de pose du soin de dix minutes selon le résultat — pas de pilote automatique sur les habitudes.',
      expect: 'Une routine réglée sur votre fibre à la saison près, au lieu d’une routine reconduite par habitude depuis deux ans.',
    });
  }

  return next;
}

function applyFocus(routine: { morning: HairStepDraft[]; evening: HairStepDraft[]; weekly: HairStepDraft[] }, f: HairFlags): { morning: HairStepDraft[]; evening: HairStepDraft[]; weekly: HairStepDraft[] } {
  if (!f.focus) return routine;
  const entry = FOCUS_STEPS[f.focus];
  if (!entry) return routine;
  const has = (step: HairStepDraft) => step.action === entry.step.action;
  const target = { ...routine };
  if (!target[entry.slot].some(has)) target[entry.slot] = [...target[entry.slot], entry.step];
  return target;
}

/**
 * Routine cheveux complète — déterministe, segmentée, contextuelle.
 * Le cycle suit la coiffure usuelle (locks / protectrice / perruque /
 * transition / enfant / naturel), chaque étape est adaptée au profil
 * déclaré (casse, cuir chevelu, porosité, pousse…), et la préoccupation
 * déclarée ajoute l’étape qui la sert.
 */
export function buildHairAdvisoryRoutine(ctx: HairAdvisoryContext): HairAdvisoryRoutine {
  const f = flags(ctx);
  const key = cycleKey(f);
  let routine: { morning: HairStepDraft[]; evening: HairStepDraft[]; weekly: HairStepDraft[] };
  switch (key) {
    case 'protective':
      routine = { morning: buildProtectiveMorning(f), evening: buildProtectiveEvening(f), weekly: buildProtectiveWeekly(f) };
      break;
    case 'wig':
      routine = { morning: buildWigMorning(f), evening: buildWigEvening(f), weekly: buildWigWeekly(f) };
      break;
    case 'enfant':
      routine = { morning: buildWashDay(f), evening: buildKidEvening(f), weekly: buildKidWeekly(f) };
      break;
    case 'transition':
      routine = { morning: buildTransitionMorning(f), evening: buildTransitionEvening(f), weekly: buildTransitionWeekly(f) };
      break;
    case 'locks':
      routine = { morning: buildWashDay(f), evening: buildBetweenWashes(f), weekly: buildWeekly(f) };
      break;
    default:
      routine = { morning: buildWashDay(f), evening: buildBetweenWashes(f), weekly: buildWeekly(f) };
  }
  routine = applyFocus(routine, f);
  // D10 — bouclés au naturel : la méthode de séchage et de fixation est
  // CALÉE sur les habitudes déclarées (une réponse inconnue = rien ajouté,
  // pas de conseil général débité pour rien).
  if ((f.curlyDry || f.curlyHold) && key === 'naturel') {
    const dryText: Record<string, string> = {
      serviette: 'Séchage : remplacez le frottement à la serviette éponge par la presse — t-shirt de coton ou microfibre, on presse sans frotter, puis on laisse la tête emmaillotée 10 à 15 minutes avant de sécher. Le frottement est votre frizz ; le produit n’y peut rien.',
      diffuse_chaud: 'Séchage : le diffuseur garde sa place, avec deux gardes — protecteur de chaleur, et air coupé aux trois quarts du séchage. La chaleur qui finit une boucle la fige froissée ; le dernier coup d’air froid est gratuit, il ferme tout.',
      diffuse_froid: 'Séchage : diffuseur tiède ou froid, c’est le bon réflexe — gardez-le, surtout les jours humides, où la chaleur ajoutée est exactement ce qui défait la boucle.',
      air: 'Séchage : à l’air libre, la méthode native de la boucle, avec sa règle unique — ne plus toucher les mèches une fois le produit posé. La forme fige en séchant ; chaque retouche avant la fin casse ce figeage.',
    };
    const holdText: Record<string, string> = {
      gel: 'Finition : le « carton » du gel n’est pas un défaut, c’est un moule — une fois le cheveu sec à 100 %, une goutte d’huile sur les paumes et on froisse doucement pour casser le film. Avant, on ne touche pas.',
      mousse: 'Finition : la mousse tient léger et se pose sur cheveu très mouillé — jamais en retouche sur cheveu quasi sec, à ce stade elle redéforme au lieu de fixer.',
      creme: 'Finition : la crème légère donne la souplesse, pas le maintien. Si la forme fond dans les 24 heures, le correctif est un gel sur les longueurs du seul jour de coiffage — pas plus de crème partout.',
      rien: 'Finition : aucun coiffant déclaré, la routine ne force rien — à savoir malgré tout : la boucle « prend » en séchant. Si le réveil est sans forme, ce n’est pas le produit qui manque, c’est le maintien pendant le séchage. Un gel ou une mousse au seul jour de lavage pour tester ; si la forme est là, on revient à rien.',
    };
    const parts = [dryText[f.curlyDry], holdText[f.curlyHold]].filter(Boolean);
    if (parts.length > 0) {
      routine.morning.push({
        action: 'Séchage et finition, calés sur vos habitudes',
        why: 'Définir une boucle, c’est trois conditions : le produit, le geste, le séchage. Vos réponses disent laquelle coche chez vous — la routine corrige celle-là, pas les trois d’un coup.',
        how: parts.join(' '),
        expect: 'Une boucle qui se forme entre deux lavages sans y penser, un réveil qui ne se rejoue pas au produit : c’est la méthode ajustée, pas la puissance ajoutée.',
      });
    }
  }
  // D11 — séchage des locks : la réponse ne décore pas le lavage, elle AJOUTE
  // l’étape que la routine n’avait pas (locks couchées humides = porte ouverte
  // à l’odeur et à l’irritation) ou confirme le bon réflexe. Hors cycle locks
  // et enfant (le même buildWashDay les sert), rien n’est injecté.
  if (f.locDry && (key === 'locks' || key === 'enfant')) {
    const locDryText: Record<string, string> = {
      sec: 'Séchage : le séchage complet avant la nuit est déjà votre réflexe — c’est exactement la règle qui ferme le chapitre des odeurs et des démangeaisons. Le garder tel quel, surtout en hiver et sous bonnet.',
      seche: 'Séchage : le sèche-cheveux aux racines, air tiède, section par section — le bon outil, bien employé. Terminer quelques minutes plus froid, puis vérifier à la main : une racine encore tiède au coucher est une racine encore humide.',
      humide: 'Séchage : coucher des locks encore humides est la première cause d’odeur — l’eau piégée au cœur de la lock ne ressort plus. La règle nouvelle : laver plus tôt dans la journée, aider le séchage à l’air tiède racine par racine, et ne se coucher que des locks sèches au toucher profond, pas seulement en surface.',
      lentes: 'Séchage : si les racines restent humides des heures, deux leviers avant tout produit — un rinçage plus long (l’eau doit couler le long des locks, pas dessus) et des soins plus légers. Si l’odeur de renfermé revient malgré un séchage soigné, c’est un rinçage clarifiant qu’il faut espacer sur l’année — jamais du parfum sur de l’humide.',
    };
    if (locDryText[f.locDry]) {
      routine.morning.push({
        action: 'Sécher les locks jusqu’au cœur',
        why: 'Une lock mal séchée garde l’eau en son centre : odeur, irritation et dépôt y trouvent leur point de départ — les FAQ locks posent cette question plus souvent que celle du produit, et le diagnostic doit la connaître pour répondre juste.',
        how: locDryText[f.locDry],
        expect: 'Des racines sèches au toucher le jour du lavage, pas le lendemain. C’est le geste qui protège tout le reste : l’odeur disparaît quand l’humidité n’a plus où loger.',
      });
    }
  }
  // D2 — le journal a dit « trop long » : pas d'ajouts de confort, le socle
  // et l'étape de préoccupation restent (c'est l'inverse d'un ajout).
  if (!f.shorten) routine = applyParams(routine, f);
  const number = (steps: HairStepDraft[]): HairAdvisoryStep[] =>
    steps.map((step, index) => ({ ...step, label: String(index + 1) }));
  return {
    morning: number(routine.morning),
    evening: number(routine.evening),
    weekly: number(routine.weekly),
  };
}


/**
 * Leçons — modules pédagogiques, chacun sourcé sur la base de connaissance
 * KURLA Cheveux. Sélection : la priorité déclarée d’abord, puis les
 * caractéristiques du profil ; jamais plus de 3, jamais de doublon.
 */
const HAIR_LESSONS: (HairLesson & { priority: number })[] = [
  {
    key: 'hair_lesson_fibre',
    priority: 100,
    title: 'La casse : 90 % du temps, c’est mécanique',
    lesson: 'La longueur qui casse est le plus souvent tirée, pas faible : démêlage à sec, démêlage en partant de la racine, brossage d’un cheveu crépu à sec, coiffures qui tirent sur les tempes. Deux axes : la douceur mécanique (démêler sur cheveu mouillé et glissant, pointes d’abord, outil à dents larges) et la force de la fibre (soin protéiné ou reconstructeur de liens, une à deux fois par mois, en alternance avec l’hydratation). Trop de protéines sans hydratation rend le cheveu rêche : l’équilibre est la technique.',
    source: 'Base de connaissances KURLA Cheveux — fibre & casse',
  },
  {
    key: 'hair_lesson_scalp',
    priority: 90,
    title: 'Le cuir chevelu : un soin à part',
    lesson: 'Le cuir chevelu n’est pas les longueurs : il a ses besoins, et les produits des longueurs ne lui sont pas nécessairement bons. Démangeaisons sous une coiffure, sécheresse, pellicules : le schéma est nettoyage en douceur, nettoyage profond occasionnel, puis hydratation légère. Le cuir chevelu est la base des longueurs : un cuir chevelu à l’aise, c’est la condition de tout le reste.',
    source: 'Base de connaissances KURLA Cheveux — cuir chevelu',
  },
  {
    key: 'hair_lesson_locks',
    priority: 85,
    title: 'Les locks : un processus, pas un style',
    lesson: 'La lock se forme avec le temps : les premiers mois, c’est le travail de la régularité (palm rolling, retwist léger en racine, satin la nuit), puis le travail de l’entretien. La manipulation excessive est l’ennemi : retwister trop souvent et trop serré casse et amincit la lock. Une lock mature, c’est une lock qui a été respectée, pas une lock qu’on a travaillée.',
    source: 'Base de connaissances KURLA Cheveux — locks',
  },
  {
    key: 'hair_lesson_wig',
    priority: 80,
    title: 'Perruques & tissage : le dessous est votre capital',
    lesson: 'La perruque ou le tissage est une coiffure ; le cuir chevelu et les racines en dessous sont le capital. La règle : propre, sec, sans tension (raie, tempes), et un soin léger et aqueux sous la coiffure pour des portées sans dégât. Avant de poser, le cuir chevelu doit être en état de rester plusieurs semaines : propre et sain.',
    source: 'Base de connaissances KURLA Cheveux — perruques & tissage',
  },
  {
    key: 'hair_lesson_protective',
    priority: 75,
    title: 'Coiffures protectrices : protéger sans étouffer',
    lesson: 'Les tresses, twists et tissages protègent les longueurs de la manipulation quotidienne — le but est de garder le cuir chevelu en dessous vivant : soin léger et aqueux, pas de scellement épais, portée de quelques semaines mais jamais sans entretien. La règle d’or : une coiffure protectrice doit être confortable dès le premier jour. S’il gratte ou tire, c’est le signal de détendre, pas d’endurer.',
    source: 'Base de connaissances KURLA Cheveux — coiffures protectrices',
  },
  {
    key: 'hair_lesson_transition',
    priority: 78,
    title: 'La transition : deux textures, une ligne à protéger',
    lesson: 'En transition (défrisage en cours ou terminé), la chevelure porte deux types de fibre : racines naturelles et longueurs traitées, avec des besoins différents. Le point de contrôle, c’est la ligne de démarcation — la frontière entre les deux zones : c’est là que la tension et la casse s’installent, et c’est là qu’on observe chaque semaine. Les coiffures ne doivent jamais tirer d’un côté et de l’autre de la ligne, et le satin la nuit en est la protection la plus simple. Que le choix soit de faire progressivement place aux racines naturelles ou de continuer le défrisage, la routine s’adapte au choix — la ligne se protège dans les deux cas.',
    source: 'Base de connaissances KURLA Cheveux — transition',
  },
  {
    key: 'hair_lesson_kid',
    priority: 70,
    title: 'Enfant : le rituel avant le produit',
    lesson: 'Avec un enfant, la méthode compte plus que le produit : cheveu mouillé et glissant, peigne à dents larges, pointes d’abord, sessions courtes, et jamais de tirage. Si ça accroche, on recule d’un pas (plus de produit, plus d’eau), on ne force pas. Un démêlage sans larmes, c’est un démêlage où l’enfant accepte de revenir la prochaine fois — c’est ça, la vraie réussite.',
    source: 'Base de connaissances KURLA Cheveux — enfant',
  },
  {
    key: 'hair_lesson_pousse',
    priority: 65,
    title: 'La pousse : ce qui marche vraiment',
    lesson: 'Aucun produit n’accélère la pousse : la longueur pousse à un rythme biologique, et ce qu’on perd, c’est ce qu’on casse. Ce qui compte : un cuir chevelu sans irritation, une fibre qui ne casse pas, des coiffures sans tension aux racines. Tout le reste — « pousse visible en 4 semaines », « réveil de la racine » — est un argument commercial, pas un résultat vérifiable.',
    source: 'Base de connaissances KURLA Cheveux — pousse & longueurs',
  },
  {
    key: 'hair_lesson_definition',
    priority: 60,
    title: 'La définition : une méthode, pas une lutte',
    lesson: 'Définir les boucles, c’est une méthode : produit sur cheveu humide et sectionné, geste précis (paume de la main, scrunching), séchage qui ne déforme pas (air ou diffuseur doux). Le « carton » que certains produits laissent est un effet du séchage — il se casse avec un peu d’eau ou d’huile, ce n’est pas un échec. La définition vient de la régularité : la même méthode, répétée, se voit.',
    source: 'Base de connaissances KURLA Cheveux — boucles & définition',
  },
  {
    key: 'hair_lesson_porosite',
    priority: 55,
    title: 'La porosité : comment votre cheveu boit',
    lesson: 'La porosité, c’est la facilité avec laquelle l’eau entre et sort de la fibre : forte (écailles ouvertes), le cheveu boit vite et perd vite — il a besoin d’un scellement riche. Faible (écailles fermées), il résiste — il a besoin de textures légères, sur cheveu bien humide, et d’un peu de chaleur douce. Le test du verre d’eau est un guide grossier ; le vrai test, c’est votre routine : si le cheveu est sec le lendemain, c’est le scellement qui manque ; si le produit reste en surface, c’est trop lourd pour votre porosité.',
    source: 'Base de connaissances KURLA Cheveux — porosité',
  },
  {
    key: 'hair_lesson_lco',
    priority: 50,
    title: 'L’hydratation : l’eau d’abord, le scellement après',
    lesson: 'Le cheveu texturé (3A–4C) est naturellement sec : sa forme en spirale ralentit la remontée du sébum du cuir chevelu vers les pointes. L’hydratation vient de l’eau et des humectants (aloe, glycérine) — le beurre et les huiles n’hydratent pas, ils scellent pour empêcher l’eau de s’évaporer. D’où l’ordre LCO sur cheveu humide : Liquid (leave-in), Cream, Oil. Sur cheveu sec, on scelle la sécheresse : c’est l’erreur la plus fréquente.',
    source: 'Base de connaissances KURLA Cheveux — hydratation & LCO',
  },
  {
    key: 'hair_lesson_entretien',
    priority: 10,
    title: 'La routine qui tient : trois gestes qui se répètent',
    lesson: 'Une routine cheveux qui tient est courte et répétable : un lavage en douceur, une hydratation qui scelle, un satin la nuit. Trois gestes, répétés, font plus qu’une routine de dix étapes tenue deux fois par mois. La régularité est l’actif principal — les produits ne sont que des moyens.',
    source: 'Base de connaissances KURLA Cheveux — entretien',
  },
];

/** Sélection des leçons : priorité d’abord, caractéristiques ensuite. */
export function pickHairLessons(ctx: HairAdvisoryContext, max = 3): HairLesson[] {
  const f = flags(ctx);
  const wanted: string[] = [];
  if (f.isBreakage) wanted.push('hair_lesson_fibre');
  if (f.isScalp) wanted.push('hair_lesson_scalp');
  if (f.isLocked) wanted.push('hair_lesson_locks');
  if (f.isWig) wanted.push('hair_lesson_wig');
  if (f.isProtective) wanted.push('hair_lesson_protective');
  if (f.isTransition) wanted.push('hair_lesson_transition');
  if (f.isKid) wanted.push('hair_lesson_kid');
  if (f.isGrowth) wanted.push('hair_lesson_pousse');
  if (f.isDefinition) wanted.push('hair_lesson_definition');
  if (f.highPorosity || f.lowPorosity) wanted.push('hair_lesson_porosite');
  if ((f.isCoily || f.isCurly || f.priority === 'hydratation') && !f.isLocked) wanted.push('hair_lesson_lco');
  wanted.push('hair_lesson_entretien');

  const byKey = new Map(HAIR_LESSONS.map(l => [l.key, l]));
  const chosen: HairLesson[] = [];
  for (const id of wanted) {
    const lesson = byKey.get(id);
    if (!lesson) continue;
    if (chosen.some(c => c.key === id)) continue;
    chosen.push({ key: lesson.key, title: lesson.title, lesson: lesson.lesson, source: lesson.source });
    if (chosen.length >= max) break;
  }
  if (chosen.length === 0) {
    const fallback = byKey.get('hair_lesson_entretien');
    if (fallback) chosen.push({ key: fallback.key, title: fallback.title, lesson: fallback.lesson, source: fallback.source });
  }
  return chosen;
}

/**
 * Observations — des questions concrètes et observables, datées, spécifiques
 * au thème principal déclaré. Elles alimentent le suivi (Journal) et la
 * réévaluation de J+30.
 */
const HAIR_OBSERVATIONS: Record<string, HairObservation[]> = {
  casse: [
    { day: '7', question: 'Au démêlage, moins de cheveux sur le peigne qu’il y a une semaine ? (tendance, pas un comptage)' },
    { day: '14', question: 'Des fourches nouvelles visibles en longueur ? La pointe est-elle plus souple qu’avant ?' },
    { day: '30', question: 'Longueur conservée : une différence notable de longueur depuis le départ ? Et le geste de démêlage — qu’est-ce qui a changé ?' },
  ],
  scalp: [
    { day: '7', question: 'Le cuir chevelu tire-t-il moins, gratte-t-il moins après le lavage ?' },
    { day: '14', question: 'Les inconforts reviennent-ils entre deux lavages, et quand ? (moment, coiffure, produit en cause)' },
    { day: '30', question: 'Le cuir chevelu est-il à l’aise sans soin quotidien ? Si le gratte persiste ou que des plaques apparaissent : c’est hors du périmètre d’une routine beauté.' },
  ],
  locks: [
    { day: '7', question: 'Les racines après lavage : le retwist est-il régulier, sans tension ?' },
    { day: '14', question: 'Des cassures en longueur (petits cheveux le long de la lock) ?' },
    { day: '30', question: 'La forme des locks : le palm rolling donne-t-il un résultat plus serré et régulier ?' },
  ],
  protective: [
    { day: '7', question: 'La coiffure est-elle confortable dès le premier jour : pas de gratte, pas de tiraillement en racine ?' },
    { day: '14', question: 'Le cuir chevelu est-il visible à travers la coiffure, avec un soin léger et aqueux en place ?' },
    { day: '30', question: 'La raie et les tempes : casse ou tension visible au contour ?' },
  ],
  transition: [
    { day: '7', question: 'La ligne de démarcation : casse ou tiraillement en raie cette semaine ?' },
    { day: '14', question: 'Les deux zones se portent-elles à leur rythme : racines souples, longueurs nettes — ou l’une tire sur l’autre ?' },
    { day: '30', question: 'Le contour et la raie : usure visible depuis le départ ? C’est l’indicateur honnête du cycle transition.' },
  ],
  wig: [
    { day: '7', question: 'Le dessous est-il à l’aise : propre, sec, sans tension sur la raie et les tempes ?' },
    { day: '14', question: 'Le soin léger et aqueux sous la coiffure est-il fait régulièrement, sans dépôt ?' },
    { day: '30', question: 'Le dessous, à la sortie de la coiffure : force, élasticité, casse — qu’observez-vous ?' },
  ],
  enfant: [
    { day: '7', question: 'Le démêlage s’est-il mieux passé (moins de tirage, moins de larmes) ? Quelle a été la réaction de l’enfant ?' },
    { day: '14', question: 'L’enfant est-il plus calme dans le rituel ? Qu’est-ce qui a changé — méthode ou produit ?' },
    { day: '30', question: 'Le rituel est-il devenu facile (plus court, plus calme) ? C’est l’objectif réel.' },
  ],
  pousse: [
    { day: '7', question: 'Des coiffures qui tirent sur la raie ou les tempes cette semaine ? Noter lesquelles.' },
    { day: '14', question: 'Cuir chevelu : tiraillements, gratte — en baisse, stable ou pire ?' },
    { day: '30', question: 'Casse : en baisse au démêlage (tendance) ? C’est l’indicateur honnête de la préservation.' },
  ],
  definition: [
    { day: '7', question: 'La définition tient-elle mieux qu’avant, sans rajout de produit ?' },
    { day: '14', question: 'Le séchage a-t-il changé (air, diffuseur doux, geste) ? Qu’est-ce qui a bougé ?' },
    { day: '30', question: 'La méthode est-elle stable d’une semaine à l’autre ? La définition se joue sur la régularité du geste.' },
  ],
  general: [
    { day: '7', question: 'Le cheveu est-il plus souple après le lavage, plus facile à démêler ?' },
    { day: '14', question: 'La coiffure tient-elle mieux qu’avant (définition, douceur) ?' },
    { day: '30', question: 'Une observation précise à noter : ce qui a changé — ou ce qui n’a pas changé. C’est elle qui oriente le prochain ajustement.' },
  ],
};

/** Sélection des observations : le thème principal d’abord, sinon général. */
export function pickHairObservations(ctx: HairAdvisoryContext): HairObservation[] {
  const f = flags(ctx);
  let key = 'general';
  if (f.isBreakage) key = 'casse';
  else if (f.isScalp) key = 'scalp';
  else if (f.isLocked) key = 'locks';
  else if (f.isProtective) key = 'protective';
  else if (f.isWig) key = 'wig';
  else if (f.isKid) key = 'enfant';
  else if (f.isTransition) key = 'transition';
  else if (f.isGrowth) key = 'pousse';
  else if (f.isDefinition) key = 'definition';
  return HAIR_OBSERVATIONS[key];
}

/**
 * Résumé personnalisé — composé des réponses déclarées, jamais inventé.
 * Un champ inconnu est dit inconnu, pas complété par déduction.
 */
export function buildHairAdvisorySummary(ctx: HairAdvisoryContext): string {
  const f = flags(ctx);
  const parts: string[] = [];

  // Texture — « en locks » et « en coiffure protectrice » ne sont pas des textures :
  // la ligne de coiffage qui suit les reprend (évite « votre texture est en locks »).
  if (f.texture === 'locksee' || f.texture === 'protective') {
    // pas de phrase texture
  } else if (f.texture && f.texture !== 'inconnue' && HAIR_TEXTURE_VALUES[f.texture]) {
    parts.push(`Votre texture est ${HAIR_TEXTURE_VALUES[f.texture].toLowerCase()}.`);
  } else {
    parts.push('Vous n’avez pas encore caractérisé votre texture : rien ne bloque, et elle se précisera avec l’observation — le test du verre d’eau aide, et le ressenti de vos soins aussi.');
  }

  // Coiffure usuelle — la routine suit le cycle de la coiffure, pas un modèle unique.
  const styleLine: Record<string, string> = {
    locks: 'Vous portez vos cheveux en locks : la routine suit le cycle locks — lavage à l’eau et soins légers, entretien aqueux entre les lavages, retwist des nouvelles racines seulement.',
    braids: 'Vous portez vos cheveux en tresses : la routine suit le cycle protectrice — préparation avant la coiffure, entretien aqueux pendant, dépose sans arrachage.',
    twists: 'Vous portez vos cheveux en twists : la routine suit le cycle protectrice — préparation avant la coiffure, entretien aqueux pendant, dépose sans arrachage.',
    wig: 'Vous portez perruque ou tissage : la routine protège le dessous — propre, sec, sans tension avant chaque pose, entretien aqueux pendant, contrôle du contour à la dépose.',
    enfant: 'Contexte enfant déclaré : la routine est courte, douce, et le rituel est l’objectif — un démêlage sans larmes, c’est un démêlage où l’enfant accepte de revenir.',
    defrise: 'Vous êtes en transition : la routine gère les deux textures — racines naturelles et longueurs traitées — et la ligne de démarcation est le point de contrôle hebdomadaire.',
    naturel: 'Vous portez vos cheveux au naturel : la routine suit le cycle naturel — lavage doux, hydratation scellée, entretien léger entre deux lavages.',
  };
  if ((f.style === 'braids' || f.style === 'twists' || f.style === 'locks' || f.style === 'wig' || f.style === 'enfant') && styleLine[f.style]) {
    parts.push(styleLine[f.style]);
  } else if (f.texture === 'locksee') parts.push(styleLine.locks);
  else if (f.texture === 'defrisee') parts.push(styleLine.defrise);
  else if (f.texture === 'protective') parts.push('Vous avez déclaré une coiffure protectrice : la routine suit le cycle protectrice — préparation avant la coiffure, entretien aqueux pendant, dépose sans arrachage.');
  else if (f.style === 'naturel') parts.push(styleLine.naturel);

  // Préoccupation déclarée (question adaptative) — la routine la met au centre.
  const focusLabel = getSegmentFocusLabel(f.focus || undefined);
  if (focusLabel) parts.push(`Votre préoccupation principale est « ${focusLabel} » : la routine intègre l’étape qui la sert, en plus des gestes de base du cycle.`);

  // D9 — les quatre réponses de professionnelle, chacune avec sa conséquence
  // visible (une réponse qui ne change rien ne doit pas être posée).
  const patternLine: Record<string, string> = {
    '4a': 'Motif 4A : la boucle en S est votre atout — la définition se joue à la crème coiffante froissée aux mains, pas au produit qui cartonne.',
    '4b': 'Motif 4B : les angles en Z s’emmêlent plus qu’ils ne glissent — définition mèche par mèche (twist-out, finger coils) et démêlage section par section sous l’eau.',
    '4c': 'Motif 4C : définition au doigt, jamais au peigne, et longueur réelle jugée aux pointes — le shrinkage efface une grande partie de la longueur visible, ce n’est pas de la longueur perdue.',
  };
  if (f.pattern && patternLine[f.pattern]) parts.push(patternLine[f.pattern]);
  // La phrase « élasticité » doit dire ce que le cycle fait vraiment : sur
  // locks, la cure protéinée n'est jamais la réponse (dépôt) ; sur enfant et
  // sous coiffure, le masque se jugera au prochain lavage complet — on pose
  // le fait, pas une prescription que la routine ne tient pas.
  const maskCycle = !f.isLocked && !f.isProtective && !f.isWig && !f.isKid && !f.isTransition;
  const elasticityLine: Record<string, string> = maskCycle
    ? {
        mou: 'Élasticité : le cheveu s’étire sans revenir au rinçage — la routine a donc décidé pour vous, force d’abord, hydratation ensuite, en alternance.',
        cassant: 'Élasticité : le cheveu casse net sans s’étirer — la priorité est l’eau, pas les protéines ; le masque de force n’arrivera que si le test change.',
        ressort: 'Élasticité : le test est bon — un hydratant par semaine suffit, les cures de « reconstruction » systématiques n’ont pas de raison d’être chez vous.',
      }
    : f.isLocked
      ? {
          mou: 'Élasticité : la fibre s’étire sans revenir — sur locks, la réponse n’est pas une cure protéinée qui sature et dépose, mais l’espacement des retwists et un rinçage long, à l’eau claire.',
          cassant: 'Élasticité : la fibre casse sans s’étirer — sur locks, l’eau d’abord : rinçages soignés, soins légers, séchage complet à chaque lavage.',
          ressort: 'Élasticité : le test est bon — vos locks sont équilibrées, rien à corriger, la routine garde son cadre.',
        }
      : {
          mou: 'Élasticité : le cheveu s’étire sans revenir, il manque de matière — le soin de force sera privilégié au prochain lavage complet.',
          cassant: 'Élasticité : le cheveu casse net sans s’étirer, il manque d’eau — l’hydratation profonde passe avant la force au prochain lavage complet.',
          ressort: 'Élasticité : le test est bon, la fibre est équilibrée — rien à changer au programme.',
        };
  if (f.elasticity && elasticityLine[f.elasticity]) parts.push(elasticityLine[f.elasticity]);
  const widthLine: Record<string, string> = {
    fine: 'Cheveu fin : votre variable n’est pas le produit, c’est le poids — une huile légère plutôt qu’un beurre au scellement, et jamais plus qu’une noisette.',
    epaisse: 'Cheveu épais : chez vous, les textures riches et les temps de pose longs ne sont pas un excès, ce sont les réglages qui font la différence.',
  };
  if (f.strandWidth && widthLine[f.strandWidth]) parts.push(widthLine[f.strandWidth]);
  const chemLine: Record<string, string> = {
    aucun: 'Vos longueurs sont vierges de chaleur et de produit : la routine protège ce capital, elle ne répare rien — la plus enviable des situations, et la moins coûteuse.',
    chaleur: 'La chaleur fait partie de vos outils : la routine y a ajouté sa règle (protecteur, cheveu entièrement sec, température basse) — le fer n’est jamais un raccourci sur cheveu humide.',
    produit: 'Passé chimique déclaré : la démarcation entre repousse et longueurs traitées est le point de contrôle de la semaine, et la retouche se limite aux racines.',
    les_deux: 'Chaleur et produit cumulés : la démarcation porte les deux agressions — le programme pose la règle d’espacement (jamais les deux la même semaine sur la même mèche).',
  };
  if (f.chem && chemLine[f.chem]) parts.push(chemLine[f.chem]);

  // D10 — boucles et transition : la phrase ne paraît que si la réponse a un
  // cycle où s'appliquer (garde déjà posée dans flags()).
  const dryLine: Record<string, string> = {
    serviette: 'Séchage déclaré à la serviette, par frottement : la routine remplace le geste — presse et maillot de coton, pas de frottement. Le frizz vient de là, pas du produit.',
    diffuse_chaud: 'Séchage au diffuseur chaud : la routine garde l’outil et pose ses deux gardes — protecteur, et chaleur coupée avant la fin.',
    diffuse_froid: 'Séchage au diffuseur froid ou tiède : le bon réflexe est déjà chez vous — la routine le confirme au lieu de le répéter.',
    air: 'Séchage à l’air libre : la méthode native de la boucle ; la routine y ajoute la seule règle qui manque souvent — ne plus toucher avant la fin.',
  };
  if (f.curlyDry && dryLine[f.curlyDry]) parts.push(dryLine[f.curlyDry]);
  const holdLine: Record<string, string> = {
    gel: 'Fixation au gel : le carton s’assume et se casse à l’huile, une fois sec à 100 % — le film est un moule, pas un échec.',
    mousse: 'Fixation à la mousse : pose sur cheveu très mouillé, jamais en retouche à mi-séchage.',
    creme: 'Fixation à la crème : souplesse sans maintien — si la forme fond, c’est le gel du jour de coiffage qui manque, pas une couche de plus.',
    rien: 'Aucun fixant déclaré : rien n’est imposé ; le maintien se joue pendant le séchage, et un essai au seul jour de lavage suffit pour le vérifier.',
  };
  if (f.curlyHold && holdLine[f.curlyHold]) parts.push(holdLine[f.curlyHold]);
  const transStepLine: Record<string, string> = {
    majorite: 'Transition : les longueurs traitées sont encore majoritaires — le programme stabilise la ligne de démarcation avant toute décision de coupe.',
    minorite: 'Transition engagée : les longueurs naturelles gagnent — la routine protège la démarcation jusqu’à la sortie complète des longueurs traitées.',
    quasi_nulle: 'Transition presque au bout : la routine quitte le mode réparation — votre forme naturelle nouvelle se protège, sans « homogénéisation » chimique.',
  };
  if (f.transitionStep && transStepLine[f.transitionStep]) parts.push(transStepLine[f.transitionStep]);

  // D11 — locks : le résumé rend les trois décisions, uniquement quand la
  // réponse existe (mêmes garde-flags que la routine).
  const stageLine: Record<string, string> = {
    neuve: 'Maturité : locks de moins de six mois — le programme protège le stade de maturation ; le raccourcissement est attendu, pas combattu.',
    ado: 'Maturité : locks à mi-parcours — l’entretien se tient, mais la maturation prime sur la perfection du tracé.',
    mature: 'Maturité : locks établies — rythme d’entretien plus espacé possible, lavages fréquents sans risque.',
  };
  if (f.locStage && stageLine[f.locStage]) parts.push(stageLine[f.locStage]);
  const careLine: Record<string, string> = {
    palm: 'Entretien déclaré : palm rolling et retwist légers — la règle posée : jamais quotidien, le frisottis entre deux séances est normal.',
    interlock: 'Entretien déclaré : interlocking — séance tenue autour de huit semaines et serrage vérifié ; au-delà, ce n’est plus de la tenue, c’est une traction.',
    freeform: 'Entretien déclaré : libre pousse — rien ne sera retordu ; le programme donne la méthode de la séparation et du lavage sans résidu.',
  };
  if (f.locCare && careLine[f.locCare]) parts.push(careLine[f.locCare]);
  const locDryLine: Record<string, string> = {
    sec: 'Séchage : complet avant la nuit — le bon réflexe est déjà en place, la routine le confirme et n’ajoute rien.',
    seche: 'Séchage : sèche-cheveux air tiède aux racines — méthode validée, avec la vérification au toucher en plus.',
    humide: 'Séchage : des locks couchées humides s’abîment de l’intérieur — la routine impose le séchage complet avant la nuit.',
    lentes: 'Séchage : séchage lent déclaré — rinçage allongé, produits allégés, clarifiant seulement si l’odeur revient malgré tout.',
  };
  if (f.locDry && locDryLine[f.locDry]) parts.push(locDryLine[f.locDry]);

  // Interprétation (D1) : ce que la COMBINAISON des réponses veut dire. Une
  // phrase par observation dérivée (jamais la reprise d'une seule case),
  // chacune fondée sur une carte science (traçabilité vérifiée par le banc).
  const derived = deriveHairObservations(ctx);
  if (derived.length) {
    parts.push('Ce que KURLA a compris de votre situation :');
    for (const d of derived) parts.push(d.text);
  }

  // Priorité + pont pédagogique honnête
  const bridge: Record<string, string> = {
    casse: 'La casse est avant tout mécanique : c’est le geste qui casse, pas le produit. La routine est donc construite sur la douceur du démêlage et la force de la fibre — et les progrès se voient plus vite que ne le laisse croire la croissance.',
    pousse: 'Aucun produit n’accélère la pousse : la longueur gagne ce qu’elle ne casse pas. La routine vise donc trois choses — un cuir chevelu sans irritation, une fibre qui ne casse pas, des coiffures sans tension aux racines.',
    cuir_chevelu: 'Le cuir chevelu passe d’abord : un cuir chevelu confortable est la base des longueurs, de la coiffure et du confort au quotidien. La routine le met au centre, pas en option.',
    definition: 'La définition est une méthode : le bon produit, le bon geste, le bon séchage. La routine met les trois en place, dans l’ordre.',
    protective: 'Une coiffure protectrice protège les longueurs de la manipulation quotidienne — à condition que le cuir chevelu respire dessous. La routine est construite autour de ce point : soin léger sous la coiffure, zéro tension aux racines.',
    locks: 'La lock est un processus, pas un style : la régularité avant l’effort. La routine met en place le cycle lavage → hydratation → entretien qui forme la lock.',
    demelage_enfant: 'Avec un enfant, l’objectif est le rituel : un démêlage sans larmes, c’est un démêlage où l’enfant accepte de revenir. La méthode passe avant le produit.',
    hydratation: 'Le cheveu texturé est naturellement sec : l’hydratation vient de l’eau, et le scellement l’empêche de s’évaporer. La routine est construite sur cet ordre — eau d’abord, matière après.',
  };
  if (f.priority && HAIR_PRIORITY_VALUES[f.priority]) {
    // D6-bis — sur locks, « définir les boucles » et « casse au démêlage »
    // n'ont plus d'objet : la ligne le dit honnêtement, sans feindre de servir un geste qui n'existe pas.
    if (f.isLocked && f.priority === 'definition') {
      parts.push('Votre priorité déclarée — définir les boucles — travaille le cheveu avant le locking : sur des locks formées, il n’y a plus de boucle à définir. Le moteur garde donc le cycle locks et votre préoccupation ; rien n’est forcé.');
    } else if (f.isLocked && f.priority === 'casse') {
      parts.push('Votre priorité est la casse : sur locks, elle se surveille à la racine (tension du retwist) et aux pointes qui s’effilochent — pas au démêlage, qui n’existe pas ici.');
    } else {
      parts.push(`Votre priorité est ${HAIR_PRIORITY_VALUES[f.priority].toLowerCase()}.`);
      if (bridge[f.priority]) parts.push(bridge[f.priority]);
    }
  } else if (f.texture === 'locksee' || f.style === 'locks') {
    parts.push(bridge.locks);
  } else if (f.priority === undefined) {
    parts.push('Aucune priorité marquée : la routine reste courte et tenable — trois gestes répétés valent mieux qu’une liste de dix mal tenue.');
  }

  // Porosité — depuis D1, l'interprétation porosité vit dans les
  // dérivations (règles poro_*, mot « porosité » inclus) : la ligne brute
  // qui reprenait la case est supprimée, sinon le résumé se répète.

  // Cuir chevelu
  const scalpLine: Record<string, string> = {
    sec: 'Votre cuir chevelu tire : la routine intègre un soin cuir chevelu dédié, séparé des soins des longueurs.',
    demangeaisons: 'Votre cuir chevelu présente des démangeaisons : la routine intègre un soin apaisant dédié, séparé des soins des longueurs.',
    pellicules: 'Votre cuir chevelu présente des pellicules de sécheresse : la routine intègre un soin dédié, séparé des soins des longueurs.',
    irritation: 'Votre cuir chevelu est irrité : la routine intègre un apaisement en douceur, séparé des soins des longueurs.',
  };
  if (scalpLine[f.scalp]) parts.push(scalpLine[f.scalp]);

  // Fréquence
  if (f.shorten) {
    parts.push('Votre journal dit « routine trop longue » : cette version garde le socle — lavage, entretien entre deux lavages, et l’étape qui sert votre préoccupation. Les ajouts de confort restent en réserve, à sortir quand le socle est tenu.');
  }

  // D4 — Longueur : le paramètre agit sur la routine (étapes dédiées), la
  // phrase du résumé l'annonce pour que le client voie POURQUOI ces étapes.
  const lengthLine: Record<string, string> = {
    courte: 'Longueur courte déclarée : la routine dose en conséquence — moins de produit, et l’ajustement se voit plus vite.',
    moyenne: 'Longueur moyenne : ni contrainte de fourches à surveiller comme du long, ni maniabilité du court — la routine garde son cadre sans s’alourdir.',
    longue: 'Longueur longue déclarée : l’usure se concentre aux pointes — la routine ajoute le contrôle des pointes et protège la nuit, jamais en arrachant le démêlage.',
  };
  if (lengthLine[f.length]) parts.push(lengthLine[f.length]);

  // D4 — Expérience capillaire (la case qui était logée dans « fréquence »).
  const experienceLine: Record<string, string> = {
    debutante: 'Vous débutez : la routine gagne un seul ajout par semaine, pas une liste — c’est la constance qui protège le cheveu.',
    habituee: 'Vous avez déjà des habitudes : la base KURLA garde ce qui tient chez vous et ajuste le dosage et le temps de pose.',
    expert: 'Vous connaissez votre fibre : la routine va droit au réglage fin — élasticité mesurée, temps de pose ajusté, rien par habitude.',
  };
  if (experienceLine[f.experience]) parts.push(experienceLine[f.experience]);

  const frequencyLine: Record<string, string> = {
    'less_1x': 'Rythme : moins d’un lavage par semaine — l’hydratation vit donc entre les lavages, à l’aqueux léger.',
    '1x_semaine': 'Rythme : un lavage par semaine — un jour de lavage fixe est ce qui rend la routine tenable.',
    '2x_semaine': 'Rythme : deux lavages par semaine — inscrivez les deux jours, le reste de la routine s’accroche à ces deux rendez-vous.',
    irreguliere: 'Rythme : vos lavages ne se suivent pas — notez simplement le jour choisi après chaque lavage, c’est ce qui rendra la suite lisible.',
    // Reçu des anciennes réponses (« je débute » était une option de
    // fréquence) : le fond est dit par la ligne d'expérience, on n'alourdit pas.
    debutante: '',
  };
  if (frequencyLine[f.frequency]) parts.push(frequencyLine[f.frequency]);

  parts.push(f.isLocked
    ? 'À J+30, notez une observation précise — hydratation des locks, cuir chevelu, tension aux racines : c’est elle qui oriente le prochain ajustement.'
    : (f.isWig || f.isProtective)
      ? 'À J+30, notez une observation précise — confort du cuir chevelu, tension aux attaches, tenue de la coiffure : c’est elle qui oriente le prochain ajustement.'
      : 'À J+30, notez une observation précise — démêlage, cuir chevelu, tenue de la coiffure : c’est elle qui oriente le prochain ajustement.');

  return parts.join(' ');
}
