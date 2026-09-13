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

export type HairScienceTheme = 'fibre' | 'eau' | 'environnement' | 'coiffures' | 'savoirs' | 'enfants' | 'barbe' | 'chimique' | 'locks';

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
  {
    key: 'sci_kid_scalp',
    theme: 'enfants',
    title: 'La tête d’un enfant est plus sensible que vous ne le pensez',
    fact: 'Le cuir chevelu de votre enfant est plus fin que le vôtre, et ses follicules sont encore en cours de développement : la tension y travaille en premier, et les premiers signes apparaissent au contour et aux tempes. La bonne nouvelle documentée par les pédiatres : si on détend tôt, le cheveu repousse. Laisser faire « quelques jours de plus », ce n’est pas un plan.',
    mechanism: 'Les revues de dermatologie pédiatrique stratifient le risque : le niveau le plus haut, c’est le cheveu naturel porté serré **souvent** — pas la longueur des coiffures, c’est la fréquence du serrage.',
    source: 'Rev. traction pédiatrique (Pediatric Dermatology, 2021) ; Traya (2026) — scalp enfant',
    confidence: 'institution',
  },
  {
    key: 'sci_kid_speech',
    theme: 'enfants',
    title: 'Un enfant ne dit pas toujours « ça tire » : apprenez-lui le mot',
    fact: 'Les recommandations pédiatriques sont explicites : **enseigner à l’enfant à dire que c’est trop serré** pendant la coiffure. Un enfant qui ne peut pas formuler l’inconfort a besoin d’un adulte qui lit les signaux — le confort du jour 1 (pas de pique, pas de tirage) reste votre alarme à tous les deux.',
    mechanism: 'La douleur est le signal « trop serré » documenté ; chez l’enfant, elle est moins exprimée et plus tardive — d’où le contrôle au moment de la coiffure, pas après.',
    source: 'Rev. traction pédiatrique (Pediatric Dermatology, 2021) — « teach children to communicate when something is too tight »',
    confidence: 'institution',
  },
  {
    key: 'sci_kid_rotation',
    theme: 'enfants',
    title: 'La rotation 1:1 : 4 semaines tendues, 4 semaines détendues',
    fact: 'Le protocole de prévention pédiatrique est chiffré : alterner **4 semaines de coiffures à tension et 4 semaines détendues** (ratio 1:1), détendre le contour avant de coiffer, et ne pas mettre de rouleaux la nuit. C’est le même principe que pour l’adulte — appliqué avant que le contour ne signale.',
    mechanism: 'Le follicule tiré en permanence s’use ; la rotation lui donne des cycles sans traction — le risque mesuré diminue avec le ratio, pas avec la coiffure elle-même.',
    source: 'Rev. traction pédiatrique (Pediatric Dermatology, 2021) — « 1:1 ratio, e.g. braids for 4 weeks then 4 weeks in natural style »',
    confidence: 'institution',
  },
  {
    key: 'sci_kid_demelage',
    theme: 'enfants',
    title: 'Le démêlage d’enfant est une méthode, pas une bagarre',
    fact: 'Les guides des cheveux d’enfant se ressur tous les mêmes points : doigts d’abord pour défaire, puis peigne **des pointes vers la racine** (le sens inverse reserre les nœuds et casse), conditionneur en barrière avant de peigner, section par section. Le satin (bonnet ou taie) la nuit compte autant : l’enfant frotte plus que vous (école, jeu, sommeil).',
    mechanism: 'La fibre d’enfant est plus fine et plus fragile que l’adulte : le nœud tire plus de fibres à la fois, et la cuticule fine s’use plus vite au frottement.',
    source: 'Guides démêlage enfants (Fro Babies, 2020–2021 ; Mustela, 2018) ; Mustela — « la peau du nourrisson continue de se développer jusqu’à 2 ans »',
    confidence: 'communaute',
  },
  {
    key: 'sci_kid_pellicules',
    theme: 'enfants',
    title: 'Les « pellicules » de votre enfant ne sont souvent pas des pellicules',
    fact: 'Les squames du cuir chevelu sont **très peu fréquentes chez le jeune enfant** (le pic arrive vers la puberté) : avant 12 mois, le suintement est presque toujours la « coussette » (cradle cap), qui est autre chose. Et si des squames apparaissent, l’agent documenté est une levure présente sur **tous** les cuirs chevelus, nourrie par le sébum — pas un manque d’hygiène. Laver plus fort, c’est aggraver.',
    mechanism: 'La levure (Malassezia) vit naturellement sur le cuir chevelu ; elle s’active quand le sébum la nourrit — d’où le pic hormonal de la puberté, et d’où l’aggravation par les lavages décappants.',
    source: 'BabyCenter (2025) — « dandruff is very uncommon in young children » ; Tucokids (2025) — Malassezia, « not a hygiene issue »',
    confidence: 'institution',
  },
  {
    key: 'sci_beard_fibre',
    theme: 'barbe',
    title: 'Votre barbe n’est pas le cheveu de votre crâne',
    fact: 'Les follicules de la barbe répondent au signal hormonal (androgènes/DHT) en **épaississant** — cheveu terminal, plus grossier, plus de couches de cuticule, phase de croissance plus longue — pendant que les follicules du crâne, eux, se miniaturisent sous le même signal. C’est pour ça que la barbe pousse pendant que le crâne s’affine, et c’est pour ça qu’une routine de crâne ne s’applique pas telle quelle à la barbe.',
    mechanism: 'Le même message chimique, des récepteurs différents : la face épaissit, le crâne s’affine — la réponse dépend du follicule, pas de la dose.',
    source: 'Littérature clinique greffe (Kopelman, 2026) — follicules barbe : anagen plus long, cuticules plus nombreuses ; Cynsmith (2024)',
    confidence: 'recherche',
  },
  {
    key: 'sci_beard_sebum',
    theme: 'barbe',
    title: 'Une barbe longue est sèche en longueur par construction',
    fact: 'Les glandes sébacées restent à la **racine**, avec une production fixe : au-delà de quelques millimètres, **le sébum ne couvre plus la longueur** — les pointes vivent sèches, et la peau **sous** la barbe (qui squame) est sèche elle aussi. La barbe a donc deux peaux à entretenir : la peau dessous, la fibre au-dessus.',
    mechanism: 'Le sébum voyage le long de la fibre comme sur un cheveu ; la barbe est trop longue pour la production de ses racines — la même logique que le cheveu texturé, en version courte.',
    source: 'Wise Beards (2018) ; Live Bearded (2019) ; One Society (2026) — production sébacée fixe vs longueur',
    confidence: 'expertise',
  },
  {
    key: 'sci_beard_incarnes',
    theme: 'barbe',
    title: 'Le poil incarné : c’est la coupe qui décide, pas la peau',
    fact: 'La cause principale du poil incarné, c’est **le rasage lui-même** — et le mécanisme est documenté : le système multi-lames lève le poil et le coupe **sous** la surface de la peau, la pointe pique ; le rasage **sec** produit des pointes biseautées qui pénètrent ; le rasage **à contre-grain** augmente le risque ; les lames obtuses étirent avant de couper. L’eau chaude avant le passage fait gonfler le poil et réduit la pointe biseautée. Arrêter de raser la zone irritée : l’amélioration vient en environ 12 semaines.',
    mechanism: 'Le poil qui repousse est une aiguille microscopique : plus sa pointe est courte, biseautée et plantée sous la surface, plus il pénètre — chaque paramètre de coupe est un paramètre de risque.',
    source: 'Révision NIH — pseudofolliculitis barbae (2019, PMC6585396) ; American Academy of Dermatology — 6 tips razor bumps',
    confidence: 'recherche',
  },
  {
    key: 'sci_beard_trim',
    theme: 'barbe',
    title: '« Couper à contre-grain pour un rendu plus net » est un mythe',
    fact: 'Le contre-grain donne un rendu plus court, oui — au prix de plus d’irritation, plus de poils incarnés et plus de fourches. Avec le grain, la barbe se porte plus proprement : moins de fourches, moins d’irritation, et le « net » se fait à la ligne, pas à la contre-direction. Et la barbe a des **directions** (le menton pousse vers le haut) : le grain n’est pas un, il s’observe par zone. La fourche, elle, se coupe — toutes les 4 à 6 semaines, pas plus souvent.',
    mechanism: 'La fourche = cuticule usée qui s’ouvre ; le contre-grain usure la cuticule et laisse des pointes qui s’élèvent — le grain suit la fibre au lieu de la défier.',
    source: 'Brazy Kuts (2024) ; Glossy Locks (2026) ; Stubble & Stache (2026) — fourches, directions, fréquence',
    confidence: 'expertise',
  },
  {
    key: 'sci_relax_bonds',
    theme: 'chimique',
    title: 'Le défrisage change la forme à vie — jusqu’au cheveu pousse',
    fact: '« L’eau écrit la boucle, le séchage la fixe » — et le chimique, lui, **réécrit la forme définitivement** : le relaxeur casse les liaisons disulfures (les liaisons permanentes de la fibre) et les convertit en liens plus faibles (lanthionine). Le cheveu traité ne reprendra jamais sa texture — seule la repousse la porte. C’est pour ça que votre cheveu défrisé a deux natures : la repousse en coil, et la longueur en lisse.',
    mechanism: 'Contrairement aux liaisons hydrogène (eau, chaleur, réversibles), les liaisons disulfures tiennent la forme permanente : une fois cassées et reformées, le changement est irréversible sur la longueur traitée.',
    source: 'JAMA Dermatology Reviews — « Safety of chemical hair relaxers » (2024) ; chimie cosmétique standard (liaisons disulfures → lanthionine)',
    confidence: 'recherche',
  },
  {
    key: 'sci_relax_scalp',
    theme: 'chimique',
    title: 'Le cuir chevelu est le premier à brûler — et la « no-lye » n’est pas moins dure',
    fact: 'Les relaxeurs lye (hydroxyde de sodium) sont d’une alcalinité extrême : c’est eux qui irritent et brûlent le cuir chevelu le plus vite. Les no-lye (calcium) irritent moins **mais laissent des dépôts de calcium** dans la fibre — ce n’est pas « moins de dommage », c’est un autre dommage. Une étude mesurée le résultat : cheveux défrisés = squames, casse et perte **significativement plus fréquentes** que sur cheveu naturel. La protection du cuir chevelu (base avant application, temps de pose) est le geste qui change tout.',
    mechanism: 'La fibre supporte le chimique mieux que le cuir chevelu : la peau n’a pas de couche cuticulaire, le chimique l’atteint directement — d’où la brûlure, et d’où la barrière à la racine.',
    source: 'JAMA Dermatology Reviews (2024) ; étude casse/perte/squames (2019, ResearchGate — P=0,046 / 0,023 / 0,020) ; Salons (2011) — lye vs no-lye',
    confidence: 'recherche',
  },
  {
    key: 'sci_relax_timing',
    theme: 'chimique',
    title: 'La retouche à 4 semaines est la cause n°1 de casse documentée',
    fact: 'Le standard professionnel est de **8 à 12 semaines** entre deux applications — avec **au moins ≈ 2,5 cm de repousse**. Appliquer le relaxeur sur du cheveu **déjà traité** est décrit par les professionnels comme « l’une des façons les plus rapides de casser la fibre ». Et la ligne de démarcation (repousse en coil / longueur lissée) est le point fragile : c’est là que la tension et la casse se concentrent.',
    mechanism: 'La fibre défrisée est déjà affaiblie (liaisons re-formées plus fragiles) : un second passage sur la même longueur ajoute de l’usure à l’usure — d’où la casse à la ligne de démarcation.',
    source: 'Shun Salon (2025) — 8–12 semaines, 10–12 pour cheveu fin ; Kabelly (2026) — retouche 4 semaines = cause majeure ; max 4–6 applications/an',
    confidence: 'institution',
  },
  {
    key: 'sci_relax_porosite',
    theme: 'chimique',
    title: 'Le cheveu défrisé est hautement poreux par construction',
    fact: 'La cuticule du cheveu défrisé est ouverte par le chimique : la fibre **perd l’eau plus vite et l’absorbe aussi plus vite** — c’est de la porosité forte par définition, pas par accident. D’où l’équilibre qui fait toute la différence : ni trop de protéines (la fibre devient rigide et casse nette sans s’étirer), ni trop d’eau (elle s’étire sans revenir). Le test d’élasticité — étirer une mèche humide et observer — dit lequel des deux manque.',
    mechanism: 'La cuticule ouverte = les écailles ne se referment plus sur la fibre : l’eau entre et sort, et la kératine interne s’échappe partiellement — le test d’élasticité mesure la réponse de la fibre à ce déséquilibre.',
    source: 'Guides haute porosité (Natures Natural Hair, 2025) — équilibre protéine/hydratation, test d’élasticité ; JAMA Dermatology Reviews (2024) — cuticule',
    confidence: 'expertise',
  },
  {
    key: 'sci_locks_mecanisme',
    theme: 'locks',
    title: 'Une lock n’est pas fabriquée : elle pousse',
    fact: 'Le lockage est un phénomène physique : les écailles de la cuticule — comme des tuiles de toit — se soulèvent par **friction** (oreiller, vêtements, vent, doigts) et accrochent les fibres voisines ; les **≈ 100 cheveux que vous perdez par jour** restent prisonniers à l’intérieur et compactent le cœur de la lock. Le coil serré locke plus vite (il s’enroule sur lui-même), la cuticule ouverte aussi. Il n’y a **aucun produit qui remplace le temps** — les « crèmes de lockage » accélèrent, elles ne causent pas.',
    mechanism: 'La lock est de la feutrage capillaire : friction → cuticule levée → accroche → les cheveux morts emprisonnés compactionnent — le même processus qu’une pelote de laine qui se feutre, en version fibre.',
    source: 'Welly (2025) — mécanisme de matting naturel ; Dreadlockulture (2026) ; Dreadlocks Extension (2025)',
    confidence: 'communaute',
  },
  {
    key: 'sci_locks_temps',
    theme: 'locks',
    title: 'La timeline honnête des locks : 12 mois pour la forme, 3–5 ans pour la stabilité',
    fact: 'Les repères documentés : **1–3 mois** — « budding » (les premières boucles se forment) ; **3–6 mois** — la phase « teen » (débouclage, rétrécissement, fourches : c’est normal, ce n’est pas un échec) ; **6–12 mois** — locks définies (cheveu 4C, routine régulière) ; **12–24 mois** — locks matures ; **3–5 ans** — stabilisation complète. La texture, la méthode (freeform, twist, palm rolling, backcombing) et la régularité pilotent le rythme — le cheveu court locke plus vite que le long.',
    mechanism: 'La lock mûrit par compaction progressive : le cheveu pousse, se ré-enroule, emprisonne les cheveux morts — chaque cycle ajoute de la densité ; la stabilité finale, c’est quand la lock tient sa forme sans intervention.',
    source: 'Shun Salon (2025) — timelines par méthode ; r/Dreadlocks (retours communautaires concordants)',
    confidence: 'communaute',
  },
  {
    key: 'sci_locks_scalp',
    theme: 'locks',
    title: 'Un scalp en locks est une pièce close : ce qu’on y met reste',
    fact: 'Sous une lock, rien ne s’échappe facilement : **les silicones, le pétrolatum, l’huile minérale et les cires s’accumulent** — c’est le « résidu », l’ennemi n°1 des locks (odeur, cuir chevelu bouché, locks qui ne lockent plus pareil). Les gestes documentés : shampoing **sans résidu** (le critère est le résidu, pas la marque), lavage **aux doigts, pas aux ongles**, **séchage complet après chaque lavage** (une lock à moitié humide sent en quelques jours), et un **deep cleanse tous les 3–6 mois** pour libérer ce qui s’est accumulé.',
    mechanism: 'La lock compactionne tout ce qui entre : un produit insoluble reste prisonnier du même mécanisme qui locke la fibre — la « pièce close » n’a pas d’évacuation, d’où le nettoyage en profondeur périodique.',
    source: 'Dollylocks (2025) — résidus, séchage complet, detox 3–6 mois ; Locs Essentials (2023) ; StyleCraze (2026)',
    confidence: 'communaute',
  },
  {
    key: 'sci_locks_shrinkage',
    theme: 'locks',
    title: 'Une lock qui rétrécit n’est pas une lock qui ne pousse pas',
    fact: 'Le rétrécissement des locks est **mesuré : 10 à 30 %** (au backcombing : 7″ → 5,6″ ; 3″ → 2,4″) — et il se poursuit pendant que la lock pousse : c’est pour ça que les locks **semblent s’élargir** au lieu de s’allonger. La longueur réelle se voit **après 12–18 mois**, quand la lock est assez lourde pour tirer vers le bas. Les sections grosses rétrécissent plus que les fines — et le retight (resserrage) reste une tension racinaire comme les autres : la règle du confort du jour 1 s’applique à la racine des locks.',
    mechanism: 'La lock s’allonge par la racine et se raccourcit par le ré-enroulement — les deux processus se superposent : l’effet visible net est l’élargissement, pas l’allongement, jusqu’à la maturité.',
    source: 'Dreadhead HQ — shrinkage mesuré (10–30 %, 7″→5,6″) ; r/Dreadlocks — poids et maturité 12–18 mois',
    confidence: 'communaute',
  },

];

export const HAIR_SCIENCE_THEMES: { theme: HairScienceTheme; label: string; intro: string }[] = [
  { theme: 'fibre', label: 'La fibre', intro: 'Ce que la microscopie dit de votre cheveu : la forme qui fait la boucle, et la forme qui fait la casse.' },
  { theme: 'eau', label: 'Eau & hydratation', intro: 'Pourquoi votre cheveu est sec par architecture, et comment l’eau écrit et réécrit votre boucle.' },
  { theme: 'environnement', label: 'Environnement & protection', intro: 'Soleil, sébum, pellicules : ce que la peau et le cheveu font entre deux soins.' },
  { theme: 'coiffures', label: 'Coiffures & tension', intro: 'Ce que les cliniciens documentent sur la tension, la friction et le confort d’une coiffure.' },
  { theme: 'savoirs', label: 'Savoirs & tests', intro: 'Typing, porosité, méthodes : ce qui est utile, ce qui est perfectible, et pourquoi.' },
  { theme: 'enfants', label: 'Enfants', intro: 'Ce que la dermatologie pédiatrique documente sur les têtes fragiles — et les gestes qui changent tout.' },
  { theme: 'barbe', label: 'Barbe & hommes', intro: 'Votre barbe n’est pas le cheveu de votre crâne : sa fibre, son sébum et ses poils incarnés.' },
  { theme: 'chimique', label: 'Défrisage & chimiques', intro: 'Ce que le relaxeur fait vraiment à la fibre, au cuir chevelu — et le timing qui sauve.' },
  { theme: 'locks', label: 'Locks', intro: 'Le lockage est un phénomène physique mesuré : son mécanisme, sa timeline et son scalp.' },
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
  const isRelaxed = texture === 'defrisee';
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
  else if (isLocked) wanted.push('sci_locks_mecanisme', 'sci_locks_shrinkage', 'sci_locks_scalp');
  else if (isRelaxed) wanted.push('sci_relax_bonds', 'sci_relax_timing', 'sci_relax_scalp');
  else if (isWig) wanted.push('sci_tension', 'sci_friction', 'sci_pellicules');
  else if (isProtective) wanted.push('sci_tension', 'sci_friction', 'sci_pellicules');
  else if (isKid) wanted.push('sci_kid_scalp', 'sci_kid_demelage', 'sci_kid_rotation');
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
