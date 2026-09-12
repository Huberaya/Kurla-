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
  priority?: string;   // hydratation | casse | definition | pousse | cuir_chevelu | demelage_enfant
  porosity?: string;   // forte | faible | moyenne | inconnue
  scalp?: string;      // normal | sec | demangeaisons | pellicules | irritation
  frequency?: string;  // debutante | 1x_semaine | 2x_semaine | irreguliere
  budget?: string;     // moins_40 | 40_70 | 70_100 | premium
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
  debutante: 'Débutante',
  '1x_semaine': '1× par semaine',
  '2x_semaine': '2× par semaine',
  irreguliere: 'Irregular',
};

interface HairFlags {
  texture: string; style: string; priority: string; porosity: string; scalp: string; frequency: string;
  isCoily: boolean; isCurly: boolean; isLocked: boolean; isProtective: boolean;
  isWig: boolean; isKid: boolean; isBreakage: boolean; isDefinition: boolean;
  isGrowth: boolean; isScalp: boolean; scalpTrouble: boolean;
  highPorosity: boolean; lowPorosity: boolean; isBeginner: boolean;
}

function flags(ctx: HairAdvisoryContext): HairFlags {
  const texture = String(ctx.texture ?? '');
  const style = String(ctx.style ?? '');
  const priority = String(ctx.priority ?? '');
  const porosity = String(ctx.porosity ?? '');
  const scalp = String(ctx.scalp ?? '');
  const frequency = String(ctx.frequency ?? '');
  const scalpTrouble = scalp === 'sec' || scalp === 'demangeaisons' || scalp === 'pellicules' || scalp === 'irritation';
  return {
    texture, style, priority, porosity, scalp, frequency,
    isCoily: texture === 'crepue',
    isCurly: texture === 'frisee' || priority === 'definition',
    isLocked: texture === 'locksee' || style === 'locks',
    isProtective: texture === 'protective' || style === 'braids' || style === 'twists',
    isWig: style === 'wig',
    isKid: style === 'enfant' || priority === 'demelage_enfant',
    isBreakage: priority === 'casse',
    isDefinition: priority === 'definition',
    isGrowth: priority === 'pousse',
    isScalp: priority === 'cuir_chevelu' || scalpTrouble,
    scalpTrouble,
    highPorosity: porosity === 'forte',
    lowPorosity: porosity === 'faible',
    isBeginner: frequency === 'debutante',
  };
}

/**
 * « Jour de lavage » — le cycle complet, dans l’ordre qui protège la fibre.
 * Chaque étape est contextuelle : le *pourquoi* change selon le profil
 * déclaré (casse, cuir chevelu, porosité, enfant, locks…).
 */
type HairStepDraft = Omit<HairAdvisoryStep, 'label'>;

function buildWashDay(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [];

  // 1. Lavage
  let washWhy: string;
  if (f.isScalp) {
    washWhy = 'Le cuir chevelu d’abord : les inconforts — tiraillements, démangeaisons, pellicules — viennent le plus souvent de résidus (coiffants, gels, bords de bonnet) ou d’un dessèchement. Nettoyer en douceur, sans décaper, est le premier geste d’apaisement.';
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

  // 2. Conditionnement + démêlage
  steps.push({
    action: 'Conditionner et démêler',
    why: f.isKid
      ? 'Démêler sans larmes, c’est une méthode : cheveu mouillé et glissant, outil à dents larges, toujours des pointes vers la racine. Si ça accroche, on recule d’un pas — plus de produit, plus d’eau — on ne tire jamais.'
      : f.isBreakage
        ? 'Le conditionneur est l’étape démêlage : sur cheveu mouillé et glissant, chaque nœud cède sans traction. C’est le geste qui protège le plus vos longueurs, avant n’importe quel produit.'
        : 'Le conditionneur prépare le démêlage : sur cheveu mouillé, chaque nœud cède sans traction, et la fibre est prête à recevoir l’hydratation.',
    how: 'Répartir le conditionneur, pré-démêler aux doigts, puis passer un outil à dents larges des pointes vers la racine, mèche par mèche. Rincer à l’eau tiède, jamais chaude.',
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
      how: 'Sur cheveux essorés (ni gorgés ni secs) : leave-in hydratant (L), crème (C), puis une noisette de beurre ou d’huile pour sceller (O). Toujours dans cet ordre, toujours sur cheveu humide : sur cheveu sec, on scelle la sécheresse.',
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

/**
 * « Entre deux lavages » — les gestes d’entretien du quotidien, selon la
 * coiffure usuelle déclarée (locks, tresses, perruque, naturel, enfant).
 */
function buildBetweenWashes(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [];

  if (f.isLocked) {
    steps.push({
      action: 'Entretenir entre deux lavages',
      why: 'Entre deux lavages, la lock vit de l’eau et d’une régularité légère : un rafraîchissement à l’eau garde la souplesse sans déposer de matière qui attirerait les résidus.',
      how: 'Une brume d’eau sur les pointes, un léger retwist en racine seulement si besoin, palm rolling léger. Ne pas toucher les longueurs plus que nécessaire : la manipulation excessive casse et amincit.',
      expect: 'Des locks souples et propres entre deux lavages. Un signe de dépôt — rêche, odeur — appelle un lavage, pas plus de produit.',
    });
  } else if (f.isProtective) {
    steps.push({
      action: 'Entretenir sous la coiffure',
      why: 'Sous tresses ou twists, le cuir chevelu vit isolé : sans soin léger, il tire et gratte, et les résidus s’accumulent plus vite qu’en coiffure naturelle. Le cuir chevelu est le seul point d’attention — et il veut du léger, de l’aqueux.',
      how: 'Une brume aqueuse sur le cuir chevelu, une à deux fois par semaine, avec les pulpes des doigts. Jamais de beurre ni d’huile épaisse sous une coiffure attachée : ça fait dépôt, pas soin.',
      expect: 'Une coiffure confortable sur toute sa durée. Gratte ou tiraillement, c’est le signal de détendre la coiffure, pas d’endurer : une coiffure protectrice doit être confortable dès le premier jour.',
    });
  }
  if (f.isWig) {
    steps.push({
      action: 'Entretenir le dessous',
      why: 'Sous perruque ou tissage, le cuir chevelu et les racines vivent à l’abri de la coiffure : sans entretien, sécheresse, résidus et tension s’installent pendant que la coiffure paraît impeccable. Le dessous est le capital — la coiffure est la vitrine.',
      how: 'Le cuir chevelu propre, sec et sans tension (raie, tempes) avant chaque pose ; pendant la portée, un soin léger et aqueux, une à deux fois par semaine, sans dépôt.',
      expect: 'Des portées de plusieurs semaines sans dégât : le dessous, à la sortie de la coiffure, doit rester fort, souple et sans casse. Sinon, la prochaine pose repartira de plus loin.',
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

  // Nuit en satin — universelle (version adaptée si coiffure portée).
  steps.push(f.isWig
    ? {
        action: 'Nuit : le dessous respire',
        why: 'Le cuir chevelu sous coiffure a besoin de respirer la nuit : la friction du coton et la transpiration fatiguent le cuir chevelu comme la coiffure. Bonnet ou taie en satin, et cuir chevelu propre et sec avant de dormir.',
        how: 'Vérifier que le cuir chevelu est sec, bonnet ou taie en satin chaque nuit, coiffure détendue.',
        expect: 'Un cuir chevelu moins irrité, une coiffure qui tient plus longtemps. La différence se voit après quelques nuits, pas après une.',
      }
    : {
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

/** « À faire chaque semaine » — le soin en profondeur et les gestes correcteurs. */
function buildWeekly(f: HairFlags): HairStepDraft[] {
  const steps: HairStepDraft[] = [];

  steps.push({
    action: 'Masque : hydratation, ou force',
    why: f.isBreakage
      ? 'La fibre cassante a besoin de force : un masque protéiné ou un reconstructeur de liens, une à deux fois par mois, en alternance avec un masque hydratant. Trop de protéines sans hydratation rend le cheveu rêche et cassant — l’équilibre est la technique.'
      : f.isCoily
        ? 'Une fois par semaine, un masque hydratant sous chaleur (chapeau chaud ou vapeur) est ce qui change le plus sur un cheveu très texturé : la chaleur ouvre la fibre et fait pénétrer.'
        : 'Le masque est le soin en profondeur que la routine quotidienne ne fait pas : hydratant en règle générale, en alternance avec un soin de force si la fibre casse.',
    how: 'Sur cheveux propres et essorés, mèche par mèche, couvrir (bonnet ou chapeau de bain), 20 à 30 minutes. Le masque n’est pas un leave-in : on rince.',
    expect: 'Un cheveu plus souple, un démêlage plus facile, une casse moins nette — sur quelques semaines, pas en un jour. Le soin de la fibre se juge sur un mois, pas sur un usage.',
  });

  if (f.scalpTrouble || f.isProtective || f.isWig) {
    steps.push({
      action: 'Nettoyage profond occasionnel',
      why: 'Les résidus — coiffants, eau calcaire, dépôts de produits — s’installent sur le cuir chevelu et les longueurs : un nettoyage profond, occasionnel, redonne de la légèreté et fait que les autres soins recommencent à agir.',
      how: 'Une fois par mois, ou quand le cheveu pèse et qu’il perd de la définition. C’est un geste correcteur, pas un rythme : s’il faut clarifier chaque semaine, la cause est en amont — trop de produit, ou mauvais type.',
      expect: 'Un cheveu plus léger, un cuir chevelu plus à l’aise. Après un nettoyage profond, l’hydratation repart plus vite : c’est le signe que les résidus étaient le problème.',
    });
  }

  if (f.isLocked) {
    steps.push({
      action: 'Racines : le travail de la lock',
      why: 'La lock se forme par la régularité : palm rolling pour donner la forme, retwist léger en racine seulement, et beaucoup moins de manipulation que la main ne le voudrait. Une lock retwistée trop souvent et trop serrée casse et amincit — c’est l’ennemi n° 1 de la maturité.',
      how: 'Après le lavage : palm rolling des pointes vers la racine, retwist léger sur les nouvelles racines seulement. Les longueurs : eau et soin, sans retwist.',
      expect: 'Des locks qui se resserrent semaine après semaine. La maturité d’une lock se compte en mois : le travail est dans la régularité, pas dans l’effort.',
    });
  }

  return steps;
}

/** Routine cheveux complète — déterministe, contextuelle, sans champ vide. */
export function buildHairAdvisoryRoutine(ctx: HairAdvisoryContext): HairAdvisoryRoutine {
  const f = flags(ctx);
  const number = (steps: HairStepDraft[]): HairAdvisoryStep[] =>
    steps.map((step, index) => ({ ...step, label: String(index + 1) }));
  return {
    morning: number(buildWashDay(f)),
    evening: number(buildBetweenWashes(f)),
    weekly: number(buildWeekly(f)),
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
  if (f.isKid) wanted.push('hair_lesson_kid');
  if (f.isGrowth) wanted.push('hair_lesson_pousse');
  if (f.isDefinition) wanted.push('hair_lesson_definition');
  if (f.highPorosity || f.lowPorosity) wanted.push('hair_lesson_porosite');
  if (f.isCoily || f.isCurly || f.priority === 'hydratation') wanted.push('hair_lesson_lco');
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

  // Texture
  if (f.texture && f.texture !== 'inconnue' && HAIR_TEXTURE_VALUES[f.texture]) {
    parts.push(`Votre texture est ${HAIR_TEXTURE_VALUES[f.texture].toLowerCase()}.`);
  } else {
    parts.push('Vous n’avez pas encore caractérisé votre texture : rien ne bloque, et elle se précisera avec l’observation — le test du verre d’eau aide, et le ressenti de vos soins aussi.');
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
    parts.push(`Votre priorité est ${HAIR_PRIORITY_VALUES[f.priority].toLowerCase()}.`);
    if (bridge[f.priority]) parts.push(bridge[f.priority]);
  } else if (f.texture === 'locksee' || f.style === 'locks') {
    parts.push(bridge.locks);
  } else if (f.priority === undefined) {
    parts.push('Aucune priorité marquée : la routine reste courte et tenable — trois gestes répétés valent mieux qu’une liste de dix mal tenue.');
  }

  // Porosité
  if (f.porosity === 'forte') {
    parts.push('Porosité forte déclarée : votre cheveu boit vite et perd vite — d’où l’importance du scellement dans la routine.');
  } else if (f.porosity === 'faible') {
    parts.push('Porosité faible déclarée : votre cheveu retient — d’où l’importance des textures légères, en moins, pas en plus.');
  } else if (f.porosity === 'moyenne') {
    parts.push('Porosité moyenne déclarée : comportement intermédiaire, la routine type vous convient.');
  }

  // Cuir chevelu
  const scalpLine: Record<string, string> = {
    sec: 'Votre cuir chevelu tire : la routine intègre un soin cuir chevelu dédié, séparé des soins des longueurs.',
    demangeaisons: 'Votre cuir chevelu présente des démangeaisons : la routine intègre un soin apaisant dédié, séparé des soins des longueurs.',
    pellicules: 'Votre cuir chevelu présente des pellicules de sécheresse : la routine intègre un soin dédié, séparé des soins des longueurs.',
    irritation: 'Votre cuir chevelu est irrité : la routine intègre un apaisement en douceur, séparé des soins des longueurs.',
  };
  if (scalpLine[f.scalp]) parts.push(scalpLine[f.scalp]);

  // Fréquence
  const frequencyLine: Record<string, string> = {
    debutante: 'Rythme : vous débutez dans la routine — la régularité compte plus que la fréquence : mieux vaut un cycle que l’on tient.',
    '1x_semaine': 'Rythme : un lavage par semaine — un jour de lavage fixe est ce qui rend la routine tenable.',
    '2x_semaine': 'Rythme : deux lavages par semaine — pensez à garder les soins entre les lavages légers.',
    irreguliere: 'Rythme de lavage irrégulier déclaré : la routine tient mieux quand elle est ancrée sur un jour fixe — choisissez-le, même imparfait.',
  };
  if (frequencyLine[f.frequency]) parts.push(frequencyLine[f.frequency]);

  parts.push('À J+30, notez une observation précise — démêlage, cuir chevelu, tenue de la coiffure : c’est elle qui oriente le prochain ajustement.');

  return parts.join(' ');
}
