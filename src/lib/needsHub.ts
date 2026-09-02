// Contenu éditorial des « besoins » accessibles depuis la page d'accueil
// (section « Quel est votre besoin aujourd’hui ? »).
//
// Chaque besoin : un contenu d'expert (mécanisme + routine chiffrée + erreurs +
// signes de consultation) et des références produits RÉELLES du catalogue
// (ids launch-pXX / launch-kXX, publiés en précommande). On n'invente jamais
// de produit : quand la gamme n'existe pas encore (peau), on oriente vers le
// diagnostic et on l'indique clairement.

export type NeedIcon =
  | 'droplet' | 'feather' | 'sparkles' | 'scissors' | 'shield'
  | 'user' | 'sun' | 'heart' | 'badge' | 'bottle' | 'baby' | 'lock';

export interface NeedRoutineStep {
  step: string;
  detail: string;
  productIds?: string[]; // ids launch (pXX)
}

export interface NeedContent {
  id: string;
  homeSlug: string; // valeur de ?need= sur la home (ChooseNeedSection)
  icon: NeedIcon;
  domain: 'cheveux' | 'peau' | 'special';
  badge: string;
  title: string;
  headline: string; // bénéfice principal en une phrase
  mechanism: string; // explication « pourquoi »
  routine: NeedRoutineStep[];
  tips: string[]; // gestes / erreurs à éviter
  seeDoctor: string; // signes qui doivent mener à consulter
  productIds: string[]; // ids pXX à afficher (ordre d'importance)
  kitIds?: string[]; // kits cohérents
  comingSoon?: boolean; // gamme boutique pas encore disponible (peau)
  primaryCta?: { label: string; href: string };
}

export const NEEDS_HUB: NeedContent[] = [
  {
    id: 'hydrater-cheveux',
    homeSlug: 'hydrater',
    icon: 'droplet',
    domain: 'cheveux',
    badge: 'Cheveux 3A–4C',
    title: 'Hydrater mes cheveux',
    headline: 'Retrouver souplesse, élasticité et douceur — et garder l’hydratation plusieurs jours.',
    mechanism:
      'Le cheveu texturé (3A–4C) est naturellement sec : sa forme en spirale ralentit la remontée du sébum du cuir chevelu vers les pointes. L’hydratation vient de l’EAU et des actifs humectants (aloe, glycérine), pas des beurres : le beurre et les huiles servent à « sceller », c’est-à-dire à empêcher l’eau de s’évaporer. La routine LCO (Liquid / Cream / Oil) sur cheveux HUMIDES est la méthode la plus fiable.',
    routine: [
      { step: 'Laver en douceur', detail: '1 fois par semaine, un shampoing sans sulfate ou un co-wash qui ne dessèche pas.', productIds: ['p01', 'p03'] },
      { step: 'Hydrater (L)', detail: 'Sur cheveux essorés, vaporisez un leave-in hydratant : c’est l’étape eau.', productIds: ['p07', 'p18', 'p32'] },
      { step: 'Nourrir (C)', detail: 'Appliquez une crème riche pour faire pénétrer l’hydratation.', productIds: ['p08', 'p34'] },
      { step: 'Sceller (O)', detail: 'Une noisette de beurre ou d’huile en bout de routine pour retenir l’eau.', productIds: ['p09', 'p11'] },
      { step: 'Protéger la nuit', detail: 'Bonnets satin pour ne pas perdre l’hydratation dans l’oreiller en coton.', productIds: ['p17'] },
    ],
    tips: [
      'Appliquez toujours les crèmes sur cheveux humides : sur cheveux secs, le beurre « scelle » la sécheresse.',
      'Hydratez aussi les longueurs entre deux lavages (refresh) avec un spray à l’eau.',
      'Une fois par semaine, un masque sous la chaleur (bonnet chauffant ou steamer) change tout sur 4C.',
    ],
    seeDoctor: 'Si le cuir chevelu est douloureux, présente des plaques rouges, des croûtes ou des chutes de cheveux localisées, consultez un dermatologue.',
    productIds: ['p07', 'p08', 'p09', 'p18', 'p32', 'p17', 'p01'],
    kitIds: ['k02', 'k03'],
  },
  {
    id: 'reduire-casse',
    homeSlug: 'casse',
    icon: 'feather',
    domain: 'cheveux',
    badge: 'Cheveux fragiles',
    title: 'Réduire la casse',
    headline: 'Renforcer la fibre et protéger les pointes pour conserver ses longueurs.',
    mechanism:
      'La casse vient surtout de la manipulation à sec et du manque de force de la fibre. Deux axes : (1) le démêlage sur cheveux humides et glissants avec les bons outils, (2) la « force » de la fibre, maintenue par des soins protéinés qui reconstituent les liens capillaires, en alternance avec des soins hydratants.',
    routine: [
      { step: 'Laver sans agresser', detail: 'Un shampoing doux, jamais sur cheveux emmêlés à sec.', productIds: ['p01'] },
      { step: 'Soigner la force', detail: 'Masque protéiné ou reconstructeur de liens une à deux fois par mois selon les besoins.', productIds: ['p06', 'p52'] },
      { step: 'Glisser pour démêler', detail: 'Appliquez l’après-shampoing, puis démêlez avec un outil à dents larges en partant des pointes.', productIds: ['p04', 'p16', 'p19', 'p20'] },
      { step: 'Sceller les pointes', detail: 'Une huile riche sur les longueurs les plus sèches.', productIds: ['p31', 'p28'] },
    ],
    tips: [
      'Ne peignez jamais les cheveux crépus à sec : humectez et ajoutez un démêlant.',
      'Démêlez des pointes vers la racine, pas l’inverse, pour ne pas concentrer la tension au milieu.',
      'Trop de protéines sans hydratation peut rendre le cheveu rêche : alternez masque nourrissant et protéiné.',
    ],
    seeDoctor: 'Une chute de cheveux avec amincissement visible, des plaques sans cheveux ou un cuir chevelu douloureux justifie un avis dermatologique.',
    productIds: ['p16', 'p19', 'p20', 'p06', 'p52', 'p04', 'p31', 'p28'],
    kitIds: ['k04', 'k07'],
  },
  {
    id: 'cuir-chevelu',
    homeSlug: 'cuir-chevelu',
    icon: 'sparkles',
    domain: 'cheveux',
    badge: 'Cuir chevelu',
    title: 'Apaiser mon cuir chevelu',
    headline: 'Réduire tiraillements, démangeaisons et pellicules de sécheresse, assainir en douceur.',
    mechanism:
      'Un cuir chevelu sain est la base de la pousse. Les désagréments viennent souvent d’un excès de résidus (co-wash, gels, bords de bonnet) ou au contraire d’un dessèchement. On clarifie en douceur, on apaise, puis on hydrate. Le massage stimule la circulation sans faire de miracles sur la pousse.',
    routine: [
      { step: 'Clarifier', detail: 'Un shampoing purifiant ou un gommage doux, 1 à 2 fois par mois, pour éliminer les résidus.', productIds: ['p02', 'p33', 'p54'] },
      { step: 'Masser', detail: 'Massez 2 à 3 minutes sous la douche avec la brosse silicone : ça répartit le produit et stimule.', productIds: ['p36'] },
      { step: 'Apaiser au quotidien', detail: 'Une eau tonique ou un sérum racine appliqués directement sur le cuir chevelu.', productIds: ['p53', 'p28'] },
      { step: 'Cibler précisément', detail: 'Le flacon applicateur dépose l’huile exactement sur les zones qui tiraillent.', productIds: ['p26'] },
    ],
    tips: [
      'Ne clarifiez pas tous les jours : trop de nettoyage dessèche et fait « tirailler ».',
      'Rincez abondamment : les résidus de shampoing démangent autant que les produits coiffants.',
      'Sous les tresses, vaporisez un soin racine plutôt que de gratter.',
    ],
    seeDoctor: 'Des démangeaisons persistantes malgré l’hygiène, des plaques grasses ou squameuses, des boutons ou des rougeurs douloureuses doivent être montrés à un dermatologue (possible dermite séborrhéique, psoriasis…).',
    productIds: ['p02', 'p33', 'p54', 'p36', 'p53', 'p28', 'p26'],
    kitIds: ['k10'],
  },
  {
    id: 'protective-styles',
    homeSlug: 'protective',
    icon: 'scissors',
    domain: 'special',
    badge: 'Tresses & coiffures',
    title: 'Entretenir mes tresses',
    headline: 'Garder le cuir chevelu hydraté et protéger les edges sous les coiffures protectrices.',
    mechanism:
      'Une coiffure protectrice protège les longueurs, mais le cuir chevelu reste exposé et les racines tirent. L’objectif : hydrater et apaiser la racine sans défaire la coiffure, contrôler les résidus, et ne pas trop tendre la ligne de cheveux (edges) pour éviter la casse de traction.',
    routine: [
      { step: 'Hydrater la racine', detail: 'Vaporisez un soin ou une mousse adaptée directement sur les tresses, 2 à 3 fois par semaine.', productIds: ['p32', 'p30'] },
      { step: 'Apaiser le cuir chevelu', detail: 'Un sérum ou une huile sur les zones qui tiraillent avec l’embout précis.', productIds: ['p28', 'p26'] },
      { step: 'Protéger la nuit', detail: 'Filet ou bonnet pour ne pas frotter et garder la coiffure nette.', productIds: ['p27', 'p17'] },
      { step: 'Soigner les edges', detail: 'Une brosse dédiée et un gel adapté pour une ligne de cheveux nette sans sur-tension.', productIds: ['p21', 'p14'] },
      { step: 'Des raies nettes', detail: 'Le peigne à queue de rat pour des séparations propres à la pose.', productIds: ['p38'] },
    ],
    tips: [
      'Ne gardez pas des tresses trop serrées douloureuses : la traction répétée peut casser les bords.',
      'Lavez le cuir chevelu même avec des tresses (shampoing dilué au flacon applicateur).',
      'Ne dépassez pas 6 à 8 semaines sans dépose, et laissez souffler la chevelure entre deux poses.',
    ],
    seeDoctor: 'Des bordures qui se dégarnissent, des vésicules ou une douleur qui dure après la pose doivent être signalées à un coiffeur puis à un médecin si elles persistent.',
    productIds: ['p32', 'p30', 'p28', 'p27', 'p21', 'p14', 'p38', 'p26'],
    kitIds: ['k05', 'k08'],
  },
  {
    id: 'locks-care',
    homeSlug: 'locks',
    icon: 'lock',
    domain: 'special',
    badge: 'Locks & vanilles',
    title: 'Entretenir mes locks',
    headline: 'Des locks saines, un cuir chevelu propre et un resserrage doux fait maison.',
    mechanism:
      'Les locks piègent naturellement les résidus : il faut donc un nettoyage qui mousse et se rince bien, sans alourdir. L’hydratation passe par le cuir chevelu et des brumes légères. Le resserrage (interlocking) peut se faire soi-même avec le bon outil, ce qui réduit les passages en salon.',
    routine: [
      { step: 'Laver sans résidu', detail: 'Shampoing clarifiant ou mousse adaptée, en insistant sur les racines, puis rincage abondant.', productIds: ['p02', 'p30'] },
      { step: 'Hydrater la racine', detail: 'Brume hydratante et huile légère sur le cuir chevelu, sans en mettre trop sur les locks.', productIds: ['p32', 'p53'] },
      { step: 'Resserrer soi-même', detail: 'L’aiguille d’interlocking permet de resserrer les repousses à la maison, doucement.', productIds: ['p42'] },
      { step: 'Protéger la nuit', detail: 'Filet ou durag pour maintenir les locks et éviter les peluches.', productIds: ['p27', 'p46'] },
    ],
    tips: [
      'Évitez les corps gras trop épais (beurres) sur les locks : ils s’y accumulent et blanchissent.',
      'Séchez bien après lavage : l’humidité retenue peut gêner le cuir chevelu.',
      'Au démarrage des locks, manipulez peu et laissez-les se former.',
    ],
    seeDoctor: 'Une odeur persistante malgré les lavages, des douleurs, des zones molles ou une chute anormale doivent être examinées par un professionnel.',
    productIds: ['p02', 'p30', 'p42', 'p32', 'p53', 'p27', 'p46'],
    kitIds: ['k08'],
  },
  {
    id: 'barbe',
    homeSlug: 'barbe',
    icon: 'user',
    domain: 'special',
    badge: 'Grooming homme',
    title: 'Prendre soin de ma barbe',
    headline: 'Assouplir la barbe, apaiser la peau sous-jacente et rendre le rasage confortable.',
    mechanism:
      'La barbe drue et la peau qu’elle recouvre sont souvent sèches : hydrater le poil ET la peau dessous réduit tiraillements et poils incarnés. Pour le rasage, on prépare la peau, on rase dans le sens du poil, et on apaise après. Les huiles et baumes dédiés arrivent bientôt en boutique ; les outils de coiffage sont déjà là.',
    routine: [
      { step: 'Nettoyer', detail: 'Lavez barbe et visage avec un nettoyant doux, sans agresser la peau.' },
      { step: 'Coiffer les cheveux courts', detail: 'L’éponge twist forme des coils nets en quelques minutes sur cheveux humides.', productIds: ['p41', 'p30'] },
      { step: 'Maintenir la nuit', detail: 'Le durag préserve waves et coiffures et réduit les frottements.', productIds: ['p46'] },
      { step: 'Hydrater (bientôt)', detail: 'Une huile à barbe et un baume apaisant après-rasage seront disponibles au prochain lot.' },
    ],
    tips: [
      'Pour éviter les poils incarnés : rasez dans le sens de pousse, n’appuyez pas, exfoliez doucement 1 à 2 fois par semaine.',
      'Séchez en tapotant sans frotter, puis hydratez tant que la peau est légèrement humide.',
      'Une brosse à barbe propre aide à répartir l’huile et discipliner le poil.',
    ],
    seeDoctor: 'Des poils incarnés infectés, des follicules enflammés douloureux ou des plaques persistantes relèvent d’un avis dermatologique.',
    productIds: ['p41', 'p46', 'p30', 'p35'],
    primaryCta: { label: 'Découvrir l’espace hommes', href: '/hommes' },
  },
  {
    id: 'hydrater-peau',
    homeSlug: 'hydrater-peau',
    icon: 'droplet',
    domain: 'peau',
    badge: 'Peaux sèches',
    title: 'Hydrater ma peau',
    headline: 'Une peau souple et confortable, sans fini gras ni brillances.',
    mechanism:
      'Sur peau mélanée, une bonne hydratation renforce la barrière cutanée et améliore l’uniformité du teint. Le réflexe clé : sceller l’hydratation sur peau humide, avec une texture adaptée (légère le jour, plus riche la nuit). Les soins visage KURLA arrivent bientôt en boutique ; le diagnostic peau vous donne d’ores et déjà la routine adaptée à votre carnation.',
    routine: [
      { step: 'Nettoyer en douceur', detail: 'Un nettoyant non décapant, matin et/ou soir.' },
      { step: 'Hydrater sur peau humide', detail: 'Crème ou baume appliqué juste après la toilette pour retenir l’eau.' },
      { step: 'Protéger le jour', detail: 'Un SPF invisible chaque matin, même en ville.' },
    ],
    tips: [
      'Appliquez le soin sur peau légèrement humide : c’est là qu’il pénètre le mieux.',
      'Évitez les savons trop alcalins qui tiraillent et dessèchent.',
      'Buvez et adaptez la texture à la saison (plus riche en hiver).',
    ],
    seeDoctor: 'Une sécheresse extrême, des démangeaisons, des fissures ou de l’eczéma justifient un avis dermatologique.',
    productIds: [],
    comingSoon: true,
    primaryCta: { label: 'Faire le diagnostic peau gratuit', href: '/diagnostic/peau' },
  },
  {
    id: 'taches',
    homeSlug: 'taches',
    icon: 'sun',
    domain: 'peau',
    badge: 'Teint unifié',
    title: 'Estomper les taches',
    headline: 'Atténuer les marques et zones d’ombre avec une routine douce et constante.',
    mechanism:
      'La mélanine réagit à toute inflammation : acné, frottements, rasage, petites blessures laissent des marques plus foncées. Le levier n°1 est la protection solaire quotidienne — sans elle, les taches reviennent. Les actifs unifiants (vitamine C, niacinamide…) agissent lentement, sur plusieurs semaines, en douceur. Les soins visage arrivent bientôt ; le diagnostic peau vous guide déjà.',
    routine: [
      { step: 'Protéger chaque matin', detail: 'Un SPF invisible, même nuageux : c’est l’étape qui empêche les taches de se fixer.' },
      { step: 'Unifier en douceur', detail: 'Un soin unifiant le soir, introduit progressivement.' },
      { step: 'Ne pas agresser', detail: 'Évitez de toucher les boutons et les frottements répétés (col, aisselles…).' },
    ],
    tips: [
      'Soyez constante : l’atténuation prend 6 à 12 semaines, pas quelques jours.',
      'N’utilisez pas plusieurs actifs puissants en même temps au risque d’irriter (ce qui ravive les taches).',
      'Un SPF qui laisse des traces blanches ? Il existe des formulations spécifiques aux carnations mates et foncées.',
    ],
    seeDoctor: 'Une tache qui change de taille, de forme ou de couleur, qui démange ou saigne doit être montrée rapidement à un dermatologue (dépistage).',
    productIds: [],
    comingSoon: true,
    primaryCta: { label: 'Faire le diagnostic peau gratuit', href: '/diagnostic/peau' },
  },
  {
    id: 'peau-sensible',
    homeSlug: 'sensible',
    icon: 'heart',
    domain: 'peau',
    badge: 'Peaux sensibles',
    title: 'Apaiser ma peau',
    headline: 'Des formules douces et une routine minimale pour les peaux réactives.',
    mechanism:
      'Une peau sensible réagit aux parfums, aux actifs trop concentrés et aux superpositions de produits. La stratégie est de simplifier : peu de produits, sans parfum agressif, introduits un par un. Les soins visage KURLA arrivent ; le diagnostic peau identifie d’ores et déjà votre niveau de tolérance.',
    routine: [
      { step: 'Nettoyer sans savon agressif', detail: 'Un nettoyant très doux, voire à l’eau fraîche les jours de réaction.' },
      { step: 'Apaiser et hydrater', detail: 'Un soin minimaliste, sans parfum, en couche fine.' },
      { step: 'Protéger', detail: 'Un SPF minéral toléré, testé sur peau sensible.' },
    ],
    tips: [
      'Introduisez un nouveau produit seul, attendez quelques jours avant le suivant.',
      'Évitez les gommages mécaniques pendant les poussées.',
      'Tenez un mini-journal des produits pour repérer ce qui déclenche les rougeurs.',
    ],
    seeDoctor: 'Des rougeurs durables, un œdème, des brûlures ou des crises de plus en plus fréquentes doivent être évaluées par un dermatologue.',
    productIds: [],
    comingSoon: true,
    primaryCta: { label: 'Faire le diagnostic peau gratuit', href: '/diagnostic/peau' },
  },
  {
    id: 'spf',
    homeSlug: 'spf',
    icon: 'badge',
    domain: 'peau',
    badge: 'Protection solaire',
    title: 'Trouver un SPF invisible',
    headline: 'Une protection solaire efficace sans trace blanche ni fini gris sur peau noire.',
    mechanism:
      'Les filtres solaires traditionnels laissent parfois un voile blanc sur les carnations mates à foncées. Des formulations adaptées (textures gels/fluides, filtres modernes) pénètrent sans laisser de trace. Le SPF protège du vieillissement et, surtout, empêche les taches d’hyperpigmentation de se fixer. La gamme solaire KURLA arrive bientôt ; le diagnostic peau vous oriente déjà.',
    routine: [
      { step: 'Appliquer chaque matin', detail: 'Quantité suffisante (environ deux doigts pour le visage), renouvelée si exposition.' },
      { step: 'Choisir la bonne texture', detail: 'Un fluide ou gel invisible sur carnation foncée, testé sans trace.' },
      { step: 'Renouveler', detail: 'Toutes les 2 h en extérieur, et après la transpiration ou la baignade.' },
    ],
    tips: [
      'Le SPF se met APRÈS l’hydratant, AVANT le maquillage.',
      '« Indice élevé » ne dispense pas de renouveler l’application.',
      'Pensez au cou, aux oreilles et au dos des mains.',
    ],
    seeDoctor: 'Un grain de beauté ou une tache qui évolue doit être surveillé par un dermatologue, notamment en cas d’antécédents.',
    productIds: [],
    comingSoon: true,
    primaryCta: { label: 'Faire le diagnostic peau gratuit', href: '/diagnostic/peau' },
  },
  {
    id: 'routine-enfant',
    homeSlug: 'enfant',
    icon: 'baby',
    domain: 'special',
    badge: 'KURLA Kids',
    title: 'Une routine pour mon enfant',
    headline: 'Des gestes tout doux et des formules adaptées pour coiffer sans larmes.',
    mechanism:
      'Le cuir chevelu et les cheveux des enfants sont délicats : on mise sur la douceur, des outils qui ne tirent pas et des gestes courts. Le coiffage se fait sur cheveux humides et bien glissants, des pointes vers les racines. Les soins kids (dès 3 ans) arrivent en précommande ; le diagnostic enfant est déjà disponible et gratuit.',
    routine: [
      { step: 'Laver en douceur', detail: 'Un shampoing doux sans sulfates ni huiles essentielles, en petite quantité.' },
      { step: 'Bien démêler', detail: 'Sur cheveux humides avec un peigne à dents larges, des pointes vers le haut.', productIds: ['p16', 'p20'] },
      { step: 'Hydrater légèrement', detail: 'Un leave-in ou une brume légère, sans tirer.', productIds: ['p07', 'p18'] },
      { step: 'Protéger', detail: 'Chouchous sans casse et bonnet satin pour la nuit.', productIds: ['p45', 'p17'] },
    ],
    tips: [
      'Ne forcez jamais sur un nœud : humectez, ajoutez du démêlant, et recommencez doucement.',
      'Faites des pauses et transformez le coiffage en moment calme, pas en épreuve.',
      'Évitez les coiffures trop serrées sur les bords pendant de longues heures.',
    ],
    seeDoctor: 'En cas de douleur persistante, de plaques, de croûtes ou de zones sans cheveux, arrêtez les produits et demandez un avis pédiatrique/dermatologique.',
    productIds: ['p16', 'p20', 'p45', 'p18', 'p17'],
    primaryCta: { label: 'Ouvrir le diagnostic enfant', href: '/diagnostic/enfant' },
  },
  {
    id: 'routine-homme',
    homeSlug: 'homme',
    icon: 'user',
    domain: 'special',
    badge: 'KURLA Homme',
    title: 'Une routine pour homme',
    headline: 'Du cheveu court aux waves et à la barbe : un rituel simple et efficace au quotidien.',
    mechanism:
      'La routine homme se veut rapide : nettoyer, hydrater, coiffer et maintenir. Sur cheveux courts, l’éponge twist et la mousse donnent des coils nets en minutes ; le durag préserve waves et définition la nuit. Les soins barbe arrivent bientôt, les outils sont déjà disponibles.',
    routine: [
      { step: 'Laver', detail: 'Shampoing doux ou co-wash, cuir chevelu inclus.', productIds: ['p01', 'p03'] },
      { step: 'Coiffer', detail: 'Sur cheveux humides, mousse puis éponge twist en mouvements circulaires réguliers.', productIds: ['p30', 'p41'] },
      { step: 'Donner du volume', detail: 'Le peigne afro (fro pick) soulève les racines pour un volume net.', productIds: ['p35'] },
      { step: 'Maintenir la nuit', detail: 'Durag pour les waves et la définition, filet pour les locks.', productIds: ['p46', 'p27'] },
    ],
    tips: [
      'Avec l’éponge, tournez toujours dans le même sens pour des coils uniformes.',
      'Hydratez aussi le cuir chevelu ras ou court, pas seulement la barbe.',
      'Lavez régulièrement le durag et les outils pour éviter les résidus.',
    ],
    seeDoctor: 'Des bosses, douleurs du cuir chevelu, poils incarnés infectés ou plaques persistantes doivent être examinés.',
    productIds: ['p41', 'p30', 'p46', 'p35', 'p27', 'p01'],
    primaryCta: { label: 'Découvrir l’espace hommes', href: '/hommes' },
  },
];

export function findNeedByHomeSlug(slug: string): NeedContent | undefined {
  return NEEDS_HUB.find((n) => n.homeSlug === slug || n.id === slug);
}
