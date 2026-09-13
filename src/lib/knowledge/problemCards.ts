/**
 * KURLA — cartes « moyens » : pour chaque problème déclaré au diagnostic,
 * le protocole de soin — FAIT (le pourquoi, sourcé) / FAIRE (les gestes) /
 * ÉVITER (les interdits) / S'ATTENDRE (le délai honnête).
 *
 * Miroir exact peau/cheveux (13/09/2026, 2ᵉ vague — docs/RECHERCHE_SCIENCE-
 * CHEVEUX_2026-09-13.md, Pièce 3). Complète sans redire les leçons (qui
 * expliquent la routine) : c'est le « donner les moyens de prendre soin de
 * ses problèmes » — la partie du conseil que les quiz concurrents ne font
 * pas (ils recommandent des produits, pas des protocoles).
 *
 * Règle de publication : sourcée ou absente, jamais inventée. Zéro
 * vocabulaire médical ; côté peau, les mots interdits (cancer, traitement,
 * dermatologues, xérose) ne figurent que jamais dans le corps.
 *
 * Principe : **pas de problème déclaré, pas de carte** — KURLA n'invente
 * pas de problème pour vendre un protocole (inconnu = inconnu).
 */

import type { HairAdvisoryContext } from './hairAdvisory';
import type { SkinAdvisoryContext } from './skinAdvisory';
import type { ScienceConfidence, ScienceInsight } from './hairScience';

export interface ProblemCard extends ScienceInsight {
  /** Les gestes à mettre en place (3–4). */
  faire: string[];
  /** Ce qu'il faut éviter (2–3) — le facteur aggravant documenté en tête. */
  eviter: string[];
  /** Le délai honnête — en quoi compter, et le repère à observer. */
  attendre: string;
}

export const SKIN_PROBLEM_CARDS: ProblemCard[] = [
  {
    key: 'prob_skin_taches',
    title: 'Les taches : l’après de chaque irritation',
    confidence: 'recherche',
    fact: 'Après chaque inflammation — un bouton, un frottement, un rasage — votre peau surproduit localement de la mélanine. Les taches durent des mois à des années : 22,3 % des gens qui ont des boutons en ont pendant plus de 5 ans. Ce n’est pas une fatalité : le facteur n°1 qui les approfondit (les toucher, les gratter, les sur-exfolier) est celui que vous contrôlez entièrement.',
    faire: [
      'Écran 30+ tous les jours, même temps couvert : les UV et la lumière visible foncent les taches existantes — un écran coloré couvre aussi la lumière que l’écran invisible ne couvre pas.',
      'Mains loin : le patch anti-bouton et la routine régulière remplacent le geste d’appuyer — chaque intervention re-déclenche l’inflammation et approfondit la tache.',
      'Un seul actif ciblé (niacinamide, acide azélaïque) à fréquence progressive, introduit seul : la régularité fait la différence, pas l’intensité.',
      'Réduire les frottements du quotidien : tamponner la serviette au lieu de frotter, téléphone et col moins contre la peau.',
    ],
    eviter: [
      'Appuyer, presser, gratter : le facteur aggravant n°1 documenté — il repart l’inflammation au lieu de l’apaiser.',
      'La sur-exfoliation : elle est un déclencheur de taches, pas un remède.',
      'Plusieurs actifs pigmentaires d’un coup : l’irritation commune fait plus de taches que n’importe quel actif n’en efface.',
    ],
    attendre: 'Comptez en mois, pas en semaines. La première victoire est qu’aucune nouvelle tache ne se forme ; les plus anciennes s’estompent ensuite — parfois lentement, et c’est documenté, pas de votre faute.',
    source: 'Asian Acne Board (2016, PubMed 26813513) ; révision systématique des taches post-inflammatoires (SAGE, 2024) ; guides peau (The Inkey List, Waverly DermSpa, 2026) ; revue des actifs (LearnSkin, 2021)',
  },
  {
    key: 'prob_skin_imperfections',
    title: 'Les imperfections : la règle est la douceur',
    confidence: 'institution',
    fact: 'Un point noir est un pore bouché qui s’est oxydé à l’air — ce n’est pas de la saleté, et il ne se « lave » pas. Ce qui change tout en peau foncée : chaque inflammation a un risque de laisser une tache derrière elle. La stratégie gagnante documentée est donc la douceur soutenue, pas l’agression rapide.',
    faire: [
      'Nettoyage doux matin et soir — le nettoyage fait le fond, l’actif fait le reste.',
      'Acide salicylique en leave-on 2–3×/semaine au départ, fréquence montée sur 2–4 semaines ; concentration supportable, démarrer bas si la peau est neuve.',
      'Hydrater chaque jour : une barrière hydratée régule mieux et s’irrite moins.',
      'Écran 30+ tous les jours : les actifs exfoliants rendent la peau plus sensible au soleil.',
    ],
    eviter: [
      'L’extraction à la main : elle pousse l’inflammation plus profond et transforme un point en éruption — et en tache.',
      'Les gommages agressifs et les strips : irritation garantie, taches en prime.',
      '« Assécher vite » : la peau desséchée réagit par brillance de réaction et inflammation.',
    ],
    attendre: 'Des semaines de régularité pour voir la différence — pas des jours. Le premier signe n’est pas « plus rien » mais « moins d’inflammations nouvelles ».',
    source: 'La Roche-Posay (conseils consommateurs, points noirs, 2026) ; DermApproved (guide acide salicylique, 2026) ; The Inkey List (protocole d’introduction, 2026)',
  },
  {
    key: 'prob_skin_secheresse',
    title: 'La sécheresse : une barrière à réparer, pas un visage à décaper',
    confidence: 'recherche',
    fact: 'Votre peau tire parce que sa couche de surface est passée sous le seuil d’eau qui la maintient souple (10–13 %) et que ses lipides se sont désorganisés. L’eau chaude au-delà d’environ 40 °C retire plus de lipides et fait perdre plus d’eau : le geste de lavage est un facteur de sécheresse, pas seulement le climat.',
    faire: [
      'Eau tiède, massage bref, rinçage sans frotter — un seul passage le matin.',
      'Crème sur peau encore humide, dans les 3 minutes après le lavage (règle des 3 minutes, protocole « soak and smear ») : l’eau de rinçage est la vôtre à emprisonner.',
      'Des textures qui ramènent les lipides — céramides, squalane : l’eau hydrate, les lipides scellent.',
      'Moins de lavages, pas plus : chaque lavage décape un peu la barrière.',
    ],
    eviter: [
      'L’eau brûlante « qui nettoie mieux » : elle retire les lipides et augmente la perte d’eau mesurable.',
      'Gommer pour « enlever les squames » : elles sont le symptôme de la barrière, pas un dépôt à décaper.',
      'Changer toute la routine quand ça tire : un seul changement à la fois, sinon on ne sait plus ce qui a aidé.',
    ],
    attendre: 'Le confort revient vite (jours) ; la barrière se répare plus lentement (semaines). Le repère de votre journal : J+4, ça ne tire plus ; J+14, ça ne tire plus même sans crème de la journée.',
    source: 'Barco & Giménez-Arnau (Actas Dermosifiliogr, 2008) ; Draelos & Gutman, protocole « soak and smear » (Dermatology Advisor, 2019) ; synthèse sur l’eau chaude et la barrière (2026)',
  },
  {
    key: 'prob_skin_sensibilite',
    title: 'La sensibilité : le parfum est le suspect n°1',
    confidence: 'recherche',
    fact: 'Les composants parfumants comptent pour 30 à 45 % des réactions allergiques aux cosmétiques — devant tous les autres. « Sans parfum » est un label, pas un certificat : il peut masquer l’odeur avec des parfums. Et la peau sensibilisée ne se « réhabitue » pas : l’exposition répétée l’est encore davantage.',
    faire: [
      'Lire l’INCI (la liste des ingrédients fait foi, pas l’étiquette) — « parfum » / « fragrance » est le mot à repérer.',
      'Un seul produit nouveau à la fois : test 24–48 h derrière l’oreille, puis 1 semaine d’usage avant le suivant — la réaction peut être différée.',
      'Commencer les actifs à fréquence réduite (1×/semaine) et ne monter que si la tolérance le montre.',
      'Noter dans votre journal : produit, date, zone, sensation — le motif (souvent le parfum) finit toujours par se dessiner.',
    ],
    eviter: [
      'Le parfum — y compris « naturel » : la rose, la vanille et l’amande douce contiennent des allergènes.',
      'L’empilement de nouveautés : si ça réagit, vous ne saurez jamais qui est le coupable.',
      '« Attendre que ça passe » sur une même irritation : si elle revient, le produit est écarté, pas patienté.',
    ],
    attendre: 'Une réaction n’est pas un verdict définitif — mais son retour, oui. La bonne routine sensible se construit en quelques semaines d’essais tracés, pas en un coup de cœur.',
    source: 'North American Contact Dermatitis Group (patch tests) ; revue Contact Dermatitis (parfums) ; Vanicream (revue des études, 2021) ; guides peau sensible (2026)',
  },
];

export const HAIR_PROBLEM_CARDS: ProblemCard[] = [
  {
    key: 'prob_hair_casse',
    title: 'La casse : ce qu’on voit, c’est ce qu’on garde',
    confidence: 'recherche',
    fact: 'Votre cheveu pousse à une vitesse que la génétique fixe — environ 5 mm/mois chez les personnes d’origine africaine, contre 13 mm de moyenne mondiale. Aucun produit ne change ce chiffre. Ce qui se « perd » en longueur, c’est ce qui casse : la casse est le seul vrai voleur de longueur, et elle se pilote.',
    faire: [
      'Satin ou microfibre partout — taie, séchage, coiffures : le coton frotte et use la fibre.',
      'Démêler sur cheveu mouillé et produit dans les cheveux, doigts d’abord, par mèches, des pointes vers la racine.',
      'Couper les pointes fourchues régulièrement : la fourche voyage le long de la fibre, elle ne reste pas en place.',
      'Si vous lissez : rester au-dessous d’environ 185 °C, avec protecteur — c’est le seuil mesuré où la boucle ne se déforme pas.',
    ],
    eviter: [
      'Sécher en frottant au torchon de coton : l’usure des écailles de surface est directe.',
      'Démêler sec : c’est là que la fibre casse.',
      'La tension et le frottement répétés (voir la carte coiffures) : la casse diffuse vient souvent d’une habitude, pas de la malchance.',
    ],
    attendre: '2–3 mois d’habitudes changées pour mesurer la rétention. L’instrument honnête : la même zone, même repère, photographiée chaque mois — la perte au lavage et sur l’oreiller baisse en premier.',
    source: 'StatPearls & European Journal of Dermatology (2016) via Live Science — vitesse de croissance ; Journal of Cosmetology & Trichology (lissage 365 °F vs 428 °F) ; PubMed 21635854 (chaleur au-dessus de 200 °C)',
  },
  {
    key: 'prob_hair_cuir_chevelu',
    title: 'Le cuir chevelu : sec ne veut pas dire gras',
    confidence: 'institution',
    fact: 'Les petites squames blanches d’un cuir chevelu qui s’écaille viennent d’un manque d’eau, pas d’un excès d’huile : décapié, il s’exfolie en petites écailles, et chaque lavage agressif relance le cycle. Le cuir chevelu et la longueur ne sont pas la même peau : il peut tirailler pendant que la longueur brille.',
    faire: [
      'Nettoyage doux au quotidien, nettoyage profond occasionnel — 1×/semaine, pas 1×/jour.',
      'Une hydratation légère du cuir chevelu après le lavage : le sérum léger, pas le baume épais.',
      'Massage 4 min/jour : une étude documentée (24 semaines) mesure +8 % d’épaisseur du cheveu — c’est un adjoint, pas un miracle.',
      'Observer à la lumière : nouvelles squames, rougeur, zone qui gratte — noté dans le journal, c’est votre instrument.',
    ],
    eviter: [
      'Laver tous les jours « pour enlever » : le décapage relance l’exfoliation au lieu de la calmer.',
      'Gratter : chaque gratte approfondit l’irritation locale.',
      'Empiler les produits sur le cuir chevelu : un seul à la fois, pour savoir ce qui change.',
    ],
    attendre: '2–4 cycles de lavage pour juger un changement — le cuir chevelu s’adapte lentement ; c’est lui qui met le plus de temps à vous dire oui (ou non).',
    source: 'British Association of Dermatologists (entretien des textures) ; Koyama et al., ePlasty (2016) — massage standardisé 4 min/j',
  },
  {
    key: 'prob_hair_tension',
    title: 'Les coiffures à tension : le confort du jour 1 est le signal',
    confidence: 'institution',
    fact: 'La tension prolongée (queues hautes, tresses serrées, extensions) tire sur le follicule : les cliniciens documentent douleur, rougeur et petits boutons comme les signes « c’est trop serré » — et l’usure du contour (tempes, raie) s’accumule à chaque re-serrage. Ce n’est pas une question de style, c’est une question de serrage.',
    faire: [
      'La règle du premier jour : si ça tire ou pique au jour 1, c’est trop serré — détendre, pas « attendre que ça passe ».',
      'Alterner : des semaines à tension, des semaines détendues — laisser le cuir chevelu respirer entre les deux.',
      'Protéger le contour : le gel à tension quotidienne sur les edges use le contour — il mérite la même douceur que la longueur.',
      'Avant de coiffer : cheveu bien démêlé (mains puis peigne), sans force.',
    ],
    eviter: [
      'Re-serrer chaque semaine « pour que ça tienne » : c’est le cycle qui use le follicule.',
      'Tenir une coiffure qui fait mal « juste quelques jours de plus » : la douleur est un signal, pas un ennui à supporter.',
      'Confondre style et serrage : la même coiffure peut être détendue — c’est le nœud qui serre, pas la coiffure.',
    ],
    attendre: 'Un contour tiraillé se remet quand la tension est détendue — des semaines, pas des jours. Le repère : la douleur du jour 1 disparaît, puis les rougeurs.',
    source: 'Dermatology Advisor (2024) — étude clinique sur la perte de cheveux par traction (Pr Tosti, Dr Agbai, Dr Akintilo, University of Miami)',
  },
  {
    key: 'prob_hair_pousse',
    title: 'La pousse : le levier honnête, c’est la rétention',
    confidence: 'recherche',
    fact: 'La vitesse de pousse est génétique (≈ 5 mm/mois chez les personnes d’origine africaine) : les « produits pousse » ne changent pas ce chiffre. Ce qui change ce qu’on voit, c’est la rétention — combien de ces millimètres vous gardez. Chaque centimètre « invisible » est un centimètre cassé.',
    faire: [
      'Tout ce qui réduit la casse (voir la carte casse) : c’est le levier pousse n°1, et le seul mesurable.',
      'Massage du cuir chevelu 4 min/jour (documenté : +8 % d’épaisseur sur 24 semaines) — le geste gratuit le mieux sourcé.',
      'Photographier la même zone, même repère, chaque mois : c’est le seul instrument honnête de la pousse.',
      'Protéger les pointes (les plus anciennes, les plus exposées) : satin, coupe régulière.',
    ],
    eviter: [
      'Croire les promesses « pousse en 30 jours » : la physique est contre — à 5 mm/mois, 30 jours font 5 mm, point.',
      'La chaleur au-dessus du seuil (voir la carte casse) : elle dégrade la fibre qui pousse.',
      'Mesurer à l’œil sur chevelure bouclée : le rétrécissement joue contre — la photo avec repère, pas la main sur la tête.',
    ],
    attendre: '2–3 mois : c’est là que la rétention devient visible (moins de longueur perdue au lavage, le contour tient).',
    source: 'StatPearls & European Journal of Dermatology (2016) via Live Science ; Koyama et al., ePlasty (2016)',
  },
];

/**
 * Carte(s) « moyens » côté peau : 1 par problème déclaré (max 2),
 * dans l'ordre documenté d'importance pour les peaux foncées (pigmentation
 * d'abord — le problème le plus documenté). Déterministe. Pas de problème
 * déclaré = pas de carte (inconnu = inconnu).
 */
export function pickSkinProblemCards(ctx: SkinAdvisoryContext, max = 2): ProblemCard[] {
  const concerns = (ctx.skinConcerns ?? []).map(v => String(v));
  const objectives = (ctx.skinObjectives ?? []).map(v => String(v));
  const sensitivities = (ctx.sensitivities ?? []).map(v => String(v));
  const hpi = String(ctx.hyperpigmentationTendency ?? '');
  const skinType = String(ctx.skinType ?? '');
  const hydration = String(ctx.hydrationLevel ?? '');
  const sensitivity = String(ctx.sensitivity ?? '');
  const acne = String(ctx.acne ?? '');

  const hasTaches = ['frequente', 'occasionnelle'].includes(hpi) || concerns.includes('taches') || concerns.includes('teint_non_uniforme') || concerns.includes('cicatrices') || objectives.includes('attenuer_taches') || objectives.includes('uniformiser');
  const hasImperfections = concerns.includes('imperfections') || concerns.includes('points_noirs') || objectives.includes('reduire_imperfections') || ['occasionnelle', 'reguliere'].includes(acne);
  const hasSecheresse = skinType === 'seche' || skinType === 'tres_seche' || hydration === 'seche' || hydration === 'deshydratee' || concerns.includes('secheresse') || concerns.includes('deshydratation') || objectives.includes('hydrater') || objectives.includes('renforcer_barriere');
  const hasSensibilite = sensitivity === 'elevee' || skinType === 'sensible' || sensitivities.includes('sensible') || concerns.includes('sensibilite');

  const wanted: string[] = [];
  if (hasTaches) wanted.push('prob_skin_taches');
  if (hasImperfections) wanted.push('prob_skin_imperfections');
  if (hasSecheresse) wanted.push('prob_skin_secheresse');
  if (hasSensibilite) wanted.push('prob_skin_sensibilite');

  const byKey = new Map(SKIN_PROBLEM_CARDS.map(card => [card.key, card]));
  return wanted.map(key => byKey.get(key)).filter((card): card is ProblemCard => Boolean(card)).slice(0, max);
}

/**
 * Carte(s) « moyens » côté cheveux : 1 par problème déclaré (max 2).
 * Déterministe. Pas de problème déclaré = pas de carte (inconnu = inconnu).
 */
export function pickHairProblemCards(ctx: HairAdvisoryContext, max = 2): ProblemCard[] {
  const texture = String(ctx.texture ?? '');
  const style = String(ctx.style ?? '');
  const priority = String(ctx.priority ?? '');
  const scalp = String(ctx.scalp ?? '');

  const hasCasse = priority === 'casse';
  const hasCuirChevelu = priority === 'cuir_chevelu' || ['sec', 'demangeaisons', 'pellicules', 'irritation'].includes(scalp);
  const hasTension = ['braids', 'twists', 'locks'].includes(style) || texture === 'protective';
  const hasPousse = priority === 'pousse';

  const wanted: string[] = [];
  if (hasCasse) wanted.push('prob_hair_casse');
  if (hasCuirChevelu) wanted.push('prob_hair_cuir_chevelu');
  if (hasTension) wanted.push('prob_hair_tension');
  if (hasPousse) wanted.push('prob_hair_pousse');

  const byKey = new Map(HAIR_PROBLEM_CARDS.map(card => [card.key, card]));
  return wanted.map(key => byKey.get(key)).filter((card): card is ProblemCard => Boolean(card)).slice(0, max);
}
