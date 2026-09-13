/**
 * KURLA HAIR — base de savoirs : la science du cheveu texturé, sourcée.
 *
 * Constat (fouille documentée du 13/09/2026, voir docs/RECHERCHE_SCIENCE-
 * CHEVEUX_2026-09-13.md) : les quiz concurrents recommandent, ils n'expliquent
 * pas. La littérature (trichoscopie afro, micro-tomographie, biophysique de la
 * fibre, protection mélaninique) documente depuis des décennies ce que le
 * cheveu 3B–4C est vraiment — personne ne le traduit en français en conseil
 * grand public. C'est l'espace « unique au monde » de KURLA.
 *
 * Règle : **sourcée ou absente, jamais inventée.** Chaque carte porte sa
 * source et un niveau de confiance :
 *   recherche (publication) · institution (dermato/trichologie) ·
 *   communauté (guides spécialisés) · expertise (formulateurs/coiffeurs).
 *
 * Usage :
 *  - « ouvrir les yeux » : pickHairScienceInsights() choisit 2–3 faits
 *    contextuels pour le profil, affichés dans le résultat du diagnostic ;
 *  - page publique : HAIR_SCIENCE_CARDS (page /cheveux/science) ;
 *  - leçons/routine : les faits sont déjà traduits en gestes dans
 *    hairAdvisory.ts (ce module est la couche « connaissance » en amont).
 *
 * Contract (banc `kurla_science_hub`) : chaque carte est complète et
 * sourcée, sélection déterministe et bornée, aucune phrase réservée aux
 * autres modules, aucun vocabulaire médical.
 */

import type { HairAdvisoryContext } from './hairAdvisory';

export type ScienceConfidence = 'recherche' | 'institution' | 'communaute' | 'expertise';

/** Un savoir « ouvrir les yeux » : le fait + le mécanisme + la source. */
export interface ScienceInsight {
  key: string;
  title: string;
  fact: string;
  source: string;
  confidence: ScienceConfidence;
}

export type HairScienceTheme = 'fibre' | 'eau' | 'environnement' | 'coiffures' | 'savoirs';

export interface HairScienceCard extends ScienceInsight {
  theme: HairScienceTheme;
  /** Le mécanisme, en une phrase (affiché en retrait sur la page). */
  mechanism: string;
}

export const SCIENCE_CONFIDENCE_LABELS: Record<ScienceConfidence, string> = {
  recherche: 'Sourcé — recherche publiée',
  institution: 'Recommandations professionnelles',
  communaute: 'Données de la communauté spécialisée',
  expertise: 'Expertise formulateurs',
};

export const HAIR_SCIENCE_CARDS: HairScienceCard[] = [
  {
    key: 'sci_section_plate',
    theme: 'fibre',
    title: 'Votre boucle est écrite dans la forme de votre fibre',
    fact: 'La section de votre fibre est plate (ovale), et elle « tourne » le long de la longueur : c’est ce qui crée le coil serré — et ce qui rend la fibre plus délicate qu’une fibre ronde. Ce n’est pas un défaut : c’est votre architecture.',
    mechanism: 'La micro-tomographie mesure l’ellipticité des sections de cheveux texturés entre 1,7 et 2,1, contre 1,3 à 1,6 pour un cheveu caucasien : plus la section est plate, plus la flexion est souple — la boucle se resserre, la casse aussi.',
    source: 'Étude de micro-tomographie comparant les sections de fibres aux boucles variées (2024, open access PMC11733847) ; « Defying Damage: Understanding Breakage in Afro-textured Hair » (Cosmetics & Toiletries, 2020)',
    confidence: 'recherche',
  },
  {
    key: 'sci_tempes_fines',
    theme: 'fibre',
    title: 'Le point le plus exposé à la casse n’est pas la pointe, c’est le contour',
    fact: 'Les tempes concentrent les cheveux les plus fins de la tête : c’est là que vivent les edges, et là que la tension (queues, gels, brossage) fait le plus de dégâts. Soigner le contour, c’est soigner sa chevelure.',
    mechanism: 'La première norme trichoscopique publiée sur les cheveux afro naturels (2024, 122 participants) a mesuré cet écart : la zone temporale concentre la plus forte proportion de fibres fines, le frontal les plus épaisses.',
    source: '« Baseline trichoscopic values for afro-textured hair » (2024, PubMed 39775520)',
    confidence: 'recherche',
  },
  {
    key: 'sci_follicle_s',
    theme: 'fibre',
    title: 'La boucle est écrite dans le follicule, pas dans la coiffure',
    fact: 'Votre follicule est en forme de S, avec un bulbe incliné : la fibre naît courbée, avant même de sortir du cuir chevelu. C’est pourquoi votre texture revient — à chaque lavage, à chaque saison, toujours.',
    mechanism: 'Le canal folliculaire courbé est décrit comme l’origine de la configuration en coil dans les études comparant les morphologies folliculaires entre populations.',
    source: 'Plastic Surgery Key — « Ethnic differences in hair » ; ISHRS — « Hair under the microscope »',
    confidence: 'institution',
  },
  {
    key: 'sci_sebum',
    theme: 'eau',
    title: 'La sécheresse n’est pas un défaut : c’est de la géométrie',
    fact: 'Le sébum de votre cuir chevelu a du mal à voyager : le follicule est courbé, et chaque virage de la fibre interrompt sa route. Le cuir chevelu peut paraître « gras » pendant que les pointes sont sèches. Vos longueurs ont besoin de l’eau que la fibre ne peut pas amener seule.',
    mechanism: 'La migration du sébum est capillaire : elle suit un canal continu et rond. Sur une fibre plate en coils, chaque courbe crée un point où le sébum s’arrête — il en arrive de moins en moins vers les pointes.',
    source: 'British Association of Dermatologists — « Caring for Afro-textured hair » ; Plastic Surgery Key — « Ethnic differences in hair »',
    confidence: 'institution',
  },
  {
    key: 'sci_liaisons',
    theme: 'eau',
    title: 'L’eau écrit la boucle, le séchage la fixe, l’eau la réécrit',
    fact: 'Votre boucle tient à des liaisons hydrogène : elles cassent avec l’eau et se reforment au séchage. C’est pourquoi la boucle se forme au lavage, et pourquoi une coiffure détressée reprend sa forme dans la pluie. Seul un chimique (défrisage, permanente) change la forme définitivement.',
    mechanism: 'La biophysique distingue le « set cohésif » (liaisons hydrogène, eau et chaleur, transition mesurée vers 60 °C) du « set permanent » (liaisons disulfures, cassées par un chimique seulement).',
    source: '« Perm-waved human hair: a thermorheologically complex shape memory composite » (Biophysical Journal, 2021, PMC8456181)',
    confidence: 'recherche',
  },
  {
    key: 'sci_shrinkage',
    theme: 'eau',
    title: 'Le rétrécissement n’est pas une perte : c’est votre boucle qui respire',
    fact: 'Sur les coils serrés, la chevelure peut paraître jusqu’à trois quarts plus courte au sec qu’étirée. Ce n’est pas de la longueur perdue : c’est la boucle qui retrouve sa forme naturelle. Votre longueur est là — elle est en coil.',
    mechanism: 'C’est le retour des liaisons hydrogène à leur forme d’origine au séchage (voir « l’eau écrit la boucle ») : la fibre se referme sur elle-même.',
    source: 'Valeurs documentées dans les guides spécialisés des textures (Perfect Locks, 2026 ; Trendy Hair Picks, 2026) — données communautaires, pas de norme médicale',
    confidence: 'communaute',
  },
  {
    key: 'sci_melanine_uv',
    theme: 'environnement',
    title: 'Votre cheveu est mieux protégé du soleil que vous ne le pensez',
    fact: 'Le cheveu foncé contient environ 99 % d’eumélanine — le pigment le plus photostable — et jusqu’à 7,2 mg de mélanine par gramme de cheveu (contre 2,5 sur un cheveu blond). Il est structurellement mieux armé contre les UV que le cheveu clair. Sans chapeau en exposition très prolongée, toutefois : les lipides de la fibre, eux, restent sensibles au soleil.',
    mechanism: 'La mélanine absorbe et filtre le rayonnement, le dissipe en chaleur et protège les protéines du cortex — la protection est limitée à la zone riche en pigment.',
    source: '« Photoaggravation of Hair Aging » (revue, PMC2938585) ; « Hair melanin content and photodamage » (Journal of Cosmetic Science, 2007)',
    confidence: 'recherche',
  },
  {
    key: 'sci_pellicules',
    theme: 'environnement',
    title: 'Vos pellicules « de sécheresse » ne demandent pas plus de lavages',
    fact: 'Les petites squames blanches qui tombent viennent d’un cuir chevelu manquant d’eau — pas d’huile. Les lavages décappants aggravent : le bon geste, c’est un nettoyage doux, un nettoyage profond occasionnel, puis une hydratation légère du cuir chevelu.',
    mechanism: 'Un cuir chevelu desséché s’exfolie en petites écailles ; en enlevant la couche protectrice à chaque lavage agressif, on relance le cycle.',
    source: 'Consensus des guides capillaires spécialisés (Curlie, Kinky Curly) croisé avec les recommandations de la BAD sur l’entretien du cuir chevelu des textures',
    confidence: 'communaute',
  },
  {
    key: 'sci_tension',
    theme: 'coiffures',
    title: 'Une coiffure qui tire est une coiffure qui a mal commencé',
    fact: 'La tension prolongée (buns hauts, queues serrées, extensions, tissages tendus) frappe d’abord le contour du visage : tempes et raie. Les cliniciens sont formels : douleur, rougeur ou petits boutons = c’est trop serré, détendre. Entre deux coiffures à tension, laisser le cuir chevelu respirer.',
    mechanism: 'La traction répétée sur le follicule provoque une inflammation locale puis une usure du follicule ; détendue à temps, la zone se remet — c’est pour ça que le confort du premier jour est le signal.',
    source: 'Étude clinique sur la perte de cheveux par traction (Dermatology Advisor, 2024 — Pr Tosti, Dr Agbai, Dr Akintilo, University of Miami)',
    confidence: 'institution',
  },
  {
    key: 'sci_friction',
    theme: 'coiffures',
    title: 'Le coton est un multiplicateur silencieux de casse',
    fact: 'Oreillers en coton, serviettes rugueuses, capuches, et les frottements des longueurs entre elles : ce sont des causes majeures de fourches et de casse diffuse. Le bonnet ou la taie en satin la nuit, la microfibre pour éponger : les deux gestes au meilleur rapport effort/résultat qui existent.',
    mechanism: 'La friction use l’épiderme cuticulaire (les « écailles » de surface) — là où les écailles sont le plus tordues (les points de courbure), l’usure est la plus rapide : ce sont vos points faibles.',
    source: 'HairObics All Natural — « What Causes Breakage in Black Hair » (2026) ; pratique documentée des spécialistes des textures',
    confidence: 'expertise',
  },
  {
    key: 'sci_typing',
    theme: 'savoirs',
    title: 'Le typing 1 à 4C est utile — mais ce n’est pas de la biologie',
    fact: 'Le système créé par Andre Walker dans les années 1990 (4C a été ajouté plus tard par la communauté) classe l’apparence, pas la fibre : deux têtes du même type peuvent avoir une épaisseur, une densité, une porosité et un cuir chevelu totalement différents. Le profil complet, c’est motif + porosité + cuir chevelu + rythme — c’est l’architecture du diagnostic KURLA.',
    mechanism: 'Le motif décrit la courbure ; l’épaisseur, la densité et la porosité décrivent la fibre ; le cuir chevelu décrit la racine. Ce sont quatre instruments de mesure différents.',
    source: 'Byrdie — « The Controversial History of the Hair Typing System » (2021) ; Origenere (2026) ; Curly Nikki (2021)',
    confidence: 'communaute',
  },
  {
    key: 'sci_porosite_test',
    theme: 'savoirs',
    title: 'Le test du verre d’eau est populaire — et perfectible',
    fact: 'Le test de flottaison est jugé « peu fiable » par plusieurs guides spécialisés : l’air emprisonné, la poussière et l’épaisseur de la fibre faussent le résultat. Le test du spray est plus fiable : sur cheveu propre, l’eau pulvérisée perle (porosité faible), s’absorbe partiellement (moyenne) ou immédiatement (forte).',
    mechanism: 'La flottaison mesure surtout l’air et la densité ; la perlent d’une goutte mesure l’hydratation réelle de la cuticule — c’est-à-dire la porosité elle-même.',
    source: 'Holistic Enchilada — « The Ultimate Guide to Hair Porosity » (2023) ; Perfect Locks (2026)',
    confidence: 'expertise',
  },
  {
    key: 'sci_cgm',
    theme: 'savoirs',
    title: 'La Curly Girl Method : des règles utiles, et des limites documentées',
    fact: 'La méthode de Lorraine Massey (livre « Curly Girl: The Handbook », 2001, révisé 2011) a mis la douceur au centre : sans sulfates, sans silicones insolubles, démêlage à l’eau. Mais l’analyse des formules a montré que les silicones hydrosolubles ne s’accumulent pas, et qu’un « sans sulfate » n’est pas automatiquement plus doux — tout dépend de la formule. La douceur se choisit sur votre cuir chevelu, pas sur un interdit.',
    mechanism: 'Les tensioactifs et les silicones se classent par structure moléculaire (solubles ou non, épaississants ou volatils) : l’étiquette ne dit pas ce que fait la formule.',
    source: 'Newsweek — entretien avec Lorraine Massey (2022) ; synthèse des analyses de formules (Grokipedia, 2026)',
    confidence: 'communaute',
  },
];

export const HAIR_SCIENCE_THEMES: { theme: HairScienceTheme; label: string; intro: string }[] = [
  { theme: 'fibre', label: 'La fibre', intro: 'Ce que la microscopie dit de votre cheveu : la forme qui fait la boucle, et la forme qui fait la casse.' },
  { theme: 'eau', label: 'Eau & hydratation', intro: 'Pourquoi votre cheveu est sec par architecture, et comment l’eau écrit et réécrit votre boucle.' },
  { theme: 'environnement', label: 'Environnement & protection', intro: 'Soleil, sébum, pellicules : ce que la peau et le cheveu font entre deux soins.' },
  { theme: 'coiffures', label: 'Coiffures & tension', intro: 'Ce que les cliniciens documentent sur la tension, la friction et le confort d’une coiffure.' },
  { theme: 'savoirs', label: 'Savoirs & tests', intro: 'Typing, porosité, méthodes : ce qui est utile, ce qui est perfectible, et pourquoi.' },
];

/**
 * « Ouvrir les yeux » : 2 à 3 faits choisis pour le profil déclaré.
 * Le fait le plus utile au besoin principal d’abord, toujours sourcé,
 * jamais de doublon. Déterministe.
 */
export function pickHairScienceInsights(ctx: HairAdvisoryContext, max = 3): ScienceInsight[] {
  const texture = String(ctx.texture ?? '');
  const style = String(ctx.style ?? '');
  const priority = String(ctx.priority ?? '');
  const porosity = String(ctx.porosity ?? '');
  const scalp = String(ctx.scalp ?? '');

  const isCoily = texture === 'crepue';
  const isCurly = texture === 'frisee' || priority === 'definition';
  const isLocked = texture === 'locksee' || style === 'locks';
  const isProtective = texture === 'protective' || style === 'braids' || style === 'twists';
  const isWig = style === 'wig';
  const isKid = style === 'enfant' || priority === 'demelage_enfant';
  const isBreakage = priority === 'casse';
  const isGrowth = priority === 'pousse';
  const isScalp = priority === 'cuir_chevelu' || ['sec', 'demangeaisons', 'pellicules', 'irritation'].includes(scalp);

  const wanted: string[] = [];
  if (isBreakage) wanted.push('sci_tempes_fines', 'sci_section_plate', 'sci_shrinkage');
  else if (isGrowth) wanted.push('sci_tempes_fines', 'sci_friction', 'sci_liaisons');
  else if (isScalp) wanted.push('sci_pellicules', 'sci_tension', 'sci_friction');
  else if (isLocked) wanted.push('sci_liaisons', 'sci_section_plate', 'sci_tension');
  else if (isWig) wanted.push('sci_tension', 'sci_friction', 'sci_pellicules');
  else if (isProtective) wanted.push('sci_tension', 'sci_friction', 'sci_pellicules');
  else if (isKid) wanted.push('sci_friction', 'sci_sebum', 'sci_liaisons');
  else if (isCurly) wanted.push('sci_shrinkage', 'sci_liaisons', 'sci_typing');
  if (porosity === 'forte' || porosity === 'faible') wanted.unshift('sci_porosite_test');
  if (wanted.length === 0) wanted.push('sci_typing', 'sci_sebum', 'sci_liaisons');

  const byKey = new Map(HAIR_SCIENCE_CARDS.map(card => [card.key, card]));
  const chosen: ScienceInsight[] = [];
  for (const key of wanted) {
    const card = byKey.get(key);
    if (!card || chosen.some(c => c.key === card.key)) continue;
    chosen.push({ key: card.key, title: card.title, fact: card.fact, source: card.source, confidence: card.confidence });
    if (chosen.length >= max) break;
  }
  return chosen;
}
