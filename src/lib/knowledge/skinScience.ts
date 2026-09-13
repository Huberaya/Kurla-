/**
 * KURLA SKIN — base de savoirs : la science des peaux riches en mélanine,
 * sourcée. Miroir exact de knowledge/hairScience (13/09/2026).
 *
 * Fouille documentée : docs/RECHERCHE_SCIENCE_CHEVEUX_2026-09-13.md,
 * « Pièce 2 — peaux riches en mélanine et problèmes de peau ».
 *
 * Règle : **sourcée ou absente, jamais inventée.** Chaque carte porte sa
 * source et un niveau de confiance :
 *   recherche (publication) · institution (dermato/trichologie) ·
 *   communauté (guides spécialisés) · expertise (formulateurs).
 *
 * Usage :
 *  - « ouvrir les yeux » : pickSkinScienceInsights() choisit 2–3 faits
 *    contextuels pour le profil (HPI, SPF, sensibilité, sécheresse…) ;
 *  - page publique : SKIN_SCIENCE_CARDS (page /peau/science) ;
 *  - leçons/routine : les gestes sont déjà dans skinAdvisory.ts (ce module
 *    est la couche « connaissance » en amont).
 *
 * Contract (banc `kurla_science_hub`) : chaque carte est complète et
 * sourcée, sélection déterministe et bornée, aucune phrase réservée aux
 * autres modules, aucun vocabulaire médical.
 */

import type { SkinAdvisoryContext } from './skinAdvisory';
import type { ScienceConfidence, ScienceInsight } from './hairScience';

export type SkinScienceTheme = 'soleil' | 'taches' | 'barriere' | 'sensibilite' | 'savoirs';

export interface SkinScienceCard extends ScienceInsight {
  theme: SkinScienceTheme;
  /** Le mécanisme, en une phrase (affiché en retrait sur la page). */
  mechanism: string;
}

export const SKIN_SCIENCE_CARDS: SkinScienceCard[] = [
  {
    key: 'sci_skin_spf',
    theme: 'soleil',
    title: 'Votre peau a un SPF 10–13 intégré — pas un SPF 30',
    fact: 'La peau foncée a une protection naturelle réelle : l’eumélanine absorbe 50 à 75 % des UV et les dissipe en chaleur. Mais le SPF naturel de la peau très foncée est estimé autour de 10 à 13 — bien en dessous du 30 que recommandent les consignes de photoprotection. La mélanine aide. La mélanine n’est pas un écran.',
    mechanism: 'Les études comparatives mesurent 5× plus d’UV atteignant le derme des peaux claires que des peaux foncées — le reste, lui, y arrive quand même, et c’est lui qui entretient les taches.',
    source: 'Kaidbey, Agin, Sayre & Kligman — « Photoprotection by melanin » (J Am Acad Dermatol, 1979) ; « Photoaging in Skin of Color » (2009)',
    confidence: 'recherche',
  },
  {
    key: 'sci_skin_visible',
    theme: 'taches',
    title: 'Ce n’est pas que les UV : la lumière visible aussi assombrit',
    fact: 'La lumière visible à haute énergie est absorbée par la mélanine : les peaux phototypes IV à VI s’assombrissent sous lumière bleue, et la pigmentation est plus soutenue — le même mécanisme que les taches post-inflammatoires. Sur une peau à tendance pigmentaire, un écran coloré (avec dioxyde de fer) couvre là où l’écran invisible ne couvre pas.',
    mechanism: 'L’absorption de la lumière visible par la mélanine génère de la chaleur vasodilatatrice et entretient la réponse pigmentaire — mesuré en conditions simulées d’exposition.',
    source: '« Environmental aging of the skin: new insights » (2020) ; Cleveland Clinic — taches et lumière visible',
    confidence: 'recherche',
  },
  {
    key: 'sci_skin_hpi',
    theme: 'taches',
    title: 'La tache, ce n’est pas le bouton : c’est l’après — et il dure',
    fact: 'Après toute inflammation — un bouton, un frottement, un rasage — la peau surproduit localement de la mélanine : c’est l’hyperpigmentation post-inflammatoire. En peau foncée, les taches durent des mois à des années : plus de la moitié dépassent un an, une sur cinq dépasse cinq ans. Et pour beaucoup, la tache gêne plus que le bouton lui-même.',
    mechanism: 'L’inflammation active les cellules pigmentaires ; plus la peau est irritée — touchée, grattée, frottée — plus elle réagit. Gratter est un facteur de risque documenté, et c’est le seul que vous contrôlez entièrement.',
    source: 'Asian Acne Board — « Frequency and characteristics of acne-related PIH » (2016, PubMed 26813513) ; « Treatment of PIH in Skin of Colour » (révision systématique, SAGE, 2024)',
    confidence: 'recherche',
  },
  {
    key: 'sci_skin_friction',
    theme: 'taches',
    title: 'Le frottement et la pression sont des causes de taches',
    fact: 'Au-delà du soleil et des boutons : le frottement répété (serviette, téléphone contre la joue, col serré) et la pression prolongée (sangles de masque, coussin sur le front) irritent la peau et peuvent y laisser des marques. Votre visage cartographie vos habitudes.',
    mechanism: 'Le traumatisme mécanique est une cause documentée d’hyperpigmentation post-inflammatoire, au même titre que l’inflammation et les UV — les révisions 2024 recensent les zones de frottement du quotidien.',
    source: '« Treatment of Post-Inflammatory Hyperpigmentation in Skin of Colour » (révision systématique, SAGE, 2024)',
    confidence: 'recherche',
  },
  {
    key: 'sci_skin_ipd',
    theme: 'soleil',
    title: 'L’assombrissement immédiat du soleil ne protège de rien',
    fact: 'Votre peau peut s’assombrir en quelques minutes d’exposition solaire : c’est de l’oxydation de la mélanine existante, et ça s’efface en 20 à 30 minutes — aucune protection. La vraie défense se met en place 24 à 72 heures plus tard (nouvelle mélanine). C’est une défense de votre peau, pas une recommandation : l’écran quotidien reste le seul bouclier stable.',
    mechanism: 'L’assombrissement immédiat (IPD) n’est pas une production de mélanine mais son oxydation ; il disparaît, la protection lui aussi.',
    source: '« Environmental aging of the skin: new insights » (2020)',
    confidence: 'recherche',
  },
  {
    key: 'sci_skin_aging',
    theme: 'savoirs',
    title: 'Votre peau se ride plus tard — et vieillit à sa manière',
    fact: 'La peau foncée a un derme plus compact et un réseau de collagène plus dense : les rides apparaissent 10 à 20 ans plus tard qu’en peau claire. En échange, la mélanine plus « mobile » rend la peau plus réactive au niveau de la couleur — taches, melasma, teint irrégulier. Pour votre peau, l’enjeu du vieillissement n’est pas la ride : c’est la pigmentation, et elle se prévient à basse dose — photoprotection quotidienne et barrière intacte.',
    mechanism: 'L’eumélanine filtre les UV et réduit les espèces réactives de l’oxygène d’environ 50 % ; la réponse pigmentaire, elle, est plus vigoureuse — la peau protège d’abord la couleur, pas le relief.',
    source: '« Photoaging in Skin of Color » (2009) ; Rousselot — « Does ethnicity affect how our skin ages? » (2020) ; « Comprehensive Review of the Role of UV Radiation in Photoaging » (2025, PMC12018068)',
    confidence: 'recherche',
  },
  {
    key: 'sci_skin_barriere',
    theme: 'barriere',
    title: 'Votre barrière : l’eau n’est pas un ressenti, c’est de la structure',
    fact: 'La couche superficielle de la peau a besoin de 10 à 13 % d’eau pour rester souple ; en dessous de 10 %, la barrière se dérègle : tiraillements, squames, picotements. La sécheresse n’est donc pas une impression — c’est un état mesurable, et c’est une structure (les lipides de la barrière) que l’on remet en place avec les bonnes textures, pas en frottant davantage.',
    mechanism: 'La microscopie Raman in vivo montre que la peau sèche présente des lipides désorganisés : la « maçonnerie » (briques + mortier) n’est plus étanche, et l’eau s’échappe — c’est la perte hydrique transepidermique que les instruments mesurent.',
    source: '« Lipid organization in xerosis: the key of the problem? » (2018, PubMed 30286269) ; Barco & Giménez-Arnau — « Xerosis: a Dysfunction of the Epidermal Barrier » (Actas Dermosifiliogr, 2008)',
    confidence: 'recherche',
  },
  {
    key: 'sci_skin_lavage',
    theme: 'barriere',
    title: 'La règle des minutes : hydrater sur peau encore humide',
    fact: 'Après le lavage, la peau perd son eau de surface très vite : l’air l’évapore. Appliquer l’hydratant sur peau encore humide, dans les minutes qui suivent le lavage, emprisonne cette eau dans la barrière — c’est le principe du protocole « soak and smear », documenté pour les peaux sèches. Une crème sur peau humide travaille mieux qu’une crème sur peau parfaitement sèche.',
    mechanism: 'L’eau laissée en surface est captée par les humectants et scellée par les occlusifs : la barrière boit au lieu de rendre.',
    source: 'Draelos et al. (nettoyage et sécheresse) ; Gutman et al. — protocole « soak and smear », via Dermatology Advisor (2019)',
    confidence: 'institution',
  },
  {
    key: 'sci_skin_parfum',
    theme: 'sensibilite',
    title: '« Sans parfum » n’est pas « sans allergène »',
    fact: 'Le parfum est la première cause d’allergie cosmétique : les composants parfumants comptent pour 30 à 45 % des réactions allergiques aux cosmétiques, et le « fragrance mix » figure dans le top 10 des allergènes des patch tests (environ 10 % de la population sensibilisée). Et le label « sans parfum » n’est pas une garantie : il peut masquer des odeurs avec des composants parfumants — dans une étude de 179 shampoings, 170 contenaient du parfum. Si votre peau réagit, c’est la liste INCI qui fait foi, pas l’étiquette.',
    mechanism: 'Certaines plantes utilisées comme masquants (rose, vanille, amande douce) contiennent des allergènes parfumants : le « naturel » n’est pas un certificat de tolérance.',
    source: '« Allergic contact dermatitis to fragrance: A review » (Contact Dermatitis) ; North American Contact Dermatitis Group ; Vanicream — revue des études (2021)',
    confidence: 'recherche',
  },
  {
    key: 'sci_skin_fitzpatrick',
    theme: 'savoirs',
    title: 'L’échelle de phototypes 1 à 6 a été construite pour 4 des 6 types',
    fact: 'L’échelle de Fitzpatrick (I à VI), utilisée par tous les écrans solaires et les références dermatologiques, a été construite d’abord sur 4 types de peaux claires. Une étude récente (Skin Health and Disease) montre qu’elle ne reflète pas le risque réel des peaux foncées — l’un des facteurs du « sunscreen gap », cette conviction que « je ne bronz pas, je n’ai pas besoin ». Votre phototype se déclare avec votre consentement — jamais déduit — et il est une donnée parmi d’autres dans le raisonnement KURLA.',
    mechanism: 'L’échelle décrit la réaction au brûlure ; elle ne mesure pas le risque pigmentaire, qui, pour les peaux foncées, est d’abord une question de couleur — pas de coup de soleil.',
    source: 'Étude citée dans Health Central (2025) — revue de la représentativité de l’échelle de Fitzpatrick ; Skin Health and Disease', 
    confidence: 'recherche',
  },
];

export const SKIN_SCIENCE_THEMES: { theme: SkinScienceTheme; label: string; intro: string }[] = [
  { theme: 'soleil', label: 'Soleil & mélanine', intro: 'Ce que les études mesurent sur la protection naturelle — et sur ce qu’elle ne protège pas.' },
  { theme: 'taches', label: 'Pigmentation', intro: 'L’hyperpigmentation post-inflammatoire : le problème le plus documenté des peaux foncées, et ses déclencheurs.' },
  { theme: 'barriere', label: 'Barrière & sécheresse', intro: 'L’eau, les lipides et la structure qui tient votre peau souple — et le geste qui change tout.' },
  { theme: 'sensibilite', label: 'Sensibilité', intro: 'Le parfum, premier allergène cosmétique — et ce que le label ne dit pas.' },
  { theme: 'savoirs', label: 'Vieillissement & repères', intro: 'Comment vieillit vraiment une peau riche en mélanine, et les échelles qu’il faut savoir lire.' },
];

/**
 * « Ouvrir les yeux » côté peau : 2 à 3 faits choisis pour le profil
 * déclaré (HPI, SPF, sensibilité, sécheresse, teint). Le fait le plus
 * utile à la préoccupation principale d’abord, toujours sourcé, jamais
 * de doublon. Déterministe.
 */
export function pickSkinScienceInsights(ctx: SkinAdvisoryContext, max = 3): ScienceInsight[] {
  const concerns = (ctx.skinConcerns ?? []).map(v => String(v));
  const objectives = (ctx.skinObjectives ?? []).map(v => String(v));
  const sensitivities = (ctx.sensitivities ?? []).map(v => String(v));
  const hpi = String(ctx.hyperpigmentationTendency ?? '');
  const spfUsage = String(ctx.spfUsage ?? '');
  const sensitivity = String(ctx.sensitivity ?? '');

  const skinType = String(ctx.skinType ?? '');
  const hydration = String(ctx.hydrationLevel ?? '');
  const hasHpi = ['frequente', 'occasionnelle'].includes(hpi) || concerns.includes('taches') || concerns.includes('teint_non_uniforme') || concerns.includes('cicatrices') || objectives.includes('attenuer_taches') || objectives.includes('uniformiser');
  const lowSpf = Boolean(spfUsage) && spfUsage !== 'quotidien' || concerns.includes('protection_solaire') || objectives.includes('proteger_spf');
  const sensitive = sensitivity === 'elevee' || skinType === 'sensible' || sensitivities.includes('sensible') || concerns.includes('sensibilite');
  const dry = skinType === 'seche' || skinType === 'tres_seche' || hydration === 'seche' || concerns.includes('secheresse') || concerns.includes('deshydratation') || objectives.includes('hydrater') || objectives.includes('renforcer_barriere');
  const dull = concerns.includes('teint_terne') || objectives.includes('eclat');

  const wanted: string[] = [];
  if (hasHpi) wanted.push('sci_skin_hpi', 'sci_skin_visible', 'sci_skin_friction');
  if (dull) wanted.push('sci_skin_visible', 'sci_skin_spf');
  if (lowSpf) wanted.unshift('sci_skin_spf', 'sci_skin_ipd');
  if (sensitive) wanted.push('sci_skin_parfum', 'sci_skin_barriere');
  if (dry) wanted.push('sci_skin_barriere', 'sci_skin_lavage');
  if (wanted.length === 0) wanted.push('sci_skin_spf', 'sci_skin_hpi', 'sci_skin_aging');
  wanted.push('sci_skin_fitzpatrick'); // repère utile, glissé en fin de file

  const byKey = new Map(SKIN_SCIENCE_CARDS.map(card => [card.key, card]));
  const chosen: ScienceInsight[] = [];
  for (const key of wanted) {
    const card = byKey.get(key);
    if (!card || chosen.some(c => c.key === card.key)) continue;
    chosen.push({ key: card.key, title: card.title, fact: card.fact, source: card.source, confidence: card.confidence });
    if (chosen.length >= max) break;
  }
  return chosen;
}
