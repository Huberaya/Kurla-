import { Product } from '../types';
import { BeautyProfile, UNKNOWN } from './beautyProfile';
import { NeedDepth, assessNeedDepth, type NeedNuance } from './needDepth';

// Réexporté : `recommendationEngine` expose les nuances sur `Recommendation` et
// importe déjà le reste de sa surface depuis ce module.
export type { NeedNuance };

export interface FitEvidence {
  field: string;
  label: string;
  value: string;
  relation: string;
}

/**
 * CHANTIER D1 — ce que le moteur sait d'un besoin, au-delà de « couvert ou
 * non ». L'intensité et les nuances ne modifient pas l'éligibilité : un besoin
 * reste pertinent selon les mêmes conditions qu'avant, il est seulement
 * mesuré et conseillé plus finement.
 */
export interface NeedSignal {
  code: string;
  met: boolean;
  /**
   * Force du besoin, 0–100. Ne participe PAS au score : le chantier F décidera
   * de la pondération. D1 fournit la mesure, pas la formule.
   */
  intensity: number;
  /** Conseils différenciés, chacun rattaché à un champ déclaré du profil. */
  nuances: NeedNuance[];
  /**
   * CHANTIER D2 — ce que le profil ne déclare pas et sans quoi le conseil
   * serait une supposition. Dit, pas estimé.
   */
  limitations: string[];
}

export interface KurlaFitResult {
  score: number | null;
  confidence: number;
  reasons: string[];
  evidence: FitEvidence[];
  unmetNeeds: string[];
  needSignals: NeedSignal[];
}

/**
 * Un besoin couvert part d'une base : il existe et il est servi. Les signaux
 * déclarés s'y **ajoutent** ensuite.
 *
 * Un `Math.max(base, signaux)` avait été écrit d'abord : il écrasait toute
 * différence en dessous de la base — une peau déclarée réactive sous perruque
 * et une peau tolérante tombaient toutes les deux à 50. Le banc l'a montré.
 *
 * Limite connue, laissée au chantier F : l'écrêtage à 100 sature les profils
 * très renseignés, qui deviennent indiscernables entre eux. Tant que F ne
 * consomme pas l'intensité, cela ne produit aucune erreur visible.
 */
const BASE_INTENSITY = 50;

const NO_DEPTH: NeedDepth = { intensity: 0, nuances: [], limitations: [] };

function known(value: unknown): boolean {
  return typeof value === 'string' && value !== '' && value !== UNKNOWN;
}

function hasAny(values: string[], expected: string[]): boolean {
  return values.some(value => expected.includes(value));
}

function formatValue(value: string): string {
  return value.replaceAll('_', ' ');
}

/**
 * Codes de besoins reconnus par `calculateKurlaFit`. La liste vit à côté du
 * matcher : un code ajouté ici sans branche correspondante ne correspondrait à
 * personne, et `tests/brand_test.test.ts` le détecte (un profil maximal doit
 * faire correspondre chaque code de la liste).
 */
export const RECOGNIZED_NEED_CODES = [
  'hydrater_cheveux',
  'reduire_casse',
  'definir_boucles',
  'reduire_frisottis',
  'demeler_cheveux',
  'cuir_chevelu',
  'apaiser_cuir_chevelu',
  'proteger_chaleur',
  'barbe',
  'entretenir_tresses',
  'entretenir_locks',
  'entretenir_perruque',
  'proteger_nuit',
  'protection_solaire',
  'taches_hyperpigmentation',
  'imperfections_acne',
  'peau_sensible',
  'hydrater_peau',
  // Trois codes ajoutés avec le chantier B-01. Ils étaient employés par des
  // fiches produit (barriere_cutanee) ou nécessaires à la couverture de la
  // gamme (éclat, maturité) sans exister ici : un code absent de cette liste
  // ne rencontre aucune branche et compte donc comme besoin non couvert, ce
  // qui abaissait le score des produits qui le portent.
  'barriere_cutanee',
  'eclat_teint_terne',
  'maturite_rides'
] as const;

export function calculateKurlaFit(product: Pick<Product, 'category' | 'needs'> & { concerns?: string[] }, profile: BeautyProfile): KurlaFitResult {
  const needs = Array.from(new Set([...(product.needs || []), ...(product.concerns || [])]));
  const evidence: FitEvidence[] = [];
  const reasons: string[] = [];
  const unmetNeeds: string[] = [];
  const hair = profile.hair;
  const skin = profile.skin;
  const environment = profile.environment;
  const protectiveStyles = hair.protectiveStyles;

  const addEvidence = (field: string, label: string, value: string, relation: string) => {
    if (known(value)) evidence.push({ field, label, value: formatValue(value), relation });
  };

  const matchNeed = (need: string): boolean => {
    switch (need) {
      case 'hydrater_cheveux': {
        const match = hasAny([hair.dryness, hair.porosity, hair.zones.lengths.dryness, hair.zones.ends.dryness], ['moyenne', 'forte']) || hair.zones.lengths.concerns.includes('secheresse') || hair.zones.ends.concerns.includes('secheresse');
        if (match) {
          addEvidence('hair.dryness', 'Sécheresse des longueurs/pointes', hair.dryness, 'le besoin d’hydratation est prioritaire');
          addEvidence('hair.porosity', 'Porosité', hair.porosity, 'elle guide la capacité à retenir l’hydratation');
          reasons.push('Hydratation reliée à la sécheresse et à la porosité renseignées dans Hair ID.');
        }
        return match;
      }
      case 'reduire_casse': {
        const match = hasAny([hair.breakage, hair.zones.lengths.breakage, hair.zones.ends.breakage], ['occasionnelle', 'frequente']) || hair.fiberCondition === 'fragile';
        if (match) {
          addEvidence('hair.breakage', 'Casse', hair.breakage, 'la protection de la fibre devient prioritaire');
          addEvidence('hair.fiberCondition', 'État de la fibre', hair.fiberCondition, 'il influence le niveau de précaution');
          reasons.push('Réduction de la casse reliée à l’état de la fibre et aux niveaux de casse déclarés.');
        }
        return match;
      }
      case 'definir_boucles': {
        const match = known(hair.curlPattern) && hair.curlPattern !== 'frisure_serree' || hair.stylingHabits.includes('wash_and_go');
        if (match) {
          addEvidence('hair.curlPattern', 'Motif de boucle/frisure', hair.curlPattern, 'il guide le choix de définition');
          reasons.push('Définition reliée au motif de boucle/frisure et aux habitudes de coiffage.');
        }
        return match;
      }
      case 'cuir_chevelu': {
        const match = known(hair.scalpCondition) || !hasAny(hair.scalpConcerns, [UNKNOWN, 'aucun']);
        if (match) {
          addEvidence('hair.scalpCondition', 'État du cuir chevelu', hair.scalpCondition, 'il guide la tolérance du soin');
          if (!hair.scalpConcerns.includes(UNKNOWN)) addEvidence('hair.scalpConcerns', 'Signes du cuir chevelu', hair.scalpConcerns.join(', '), 'ils précisent la zone à traiter');
          reasons.push('Cuir chevelu relié à son état et aux signes déclarés, séparément des longueurs.');
        }
        return match;
      }
      case 'reduire_frisottis': {
        /**
         * Champ dédié `hair.frizz`, déclaré dans Hair ID. Aucun frisotti n'est
         * déduit de la porosité ou de l'humidité : une déduction aurait été
         * invérifiable par l'utilisateur.
         */
        const match = hasAny([hair.frizz], ['occasionnels', 'frequents']);
        if (match) {
          addEvidence('hair.frizz', 'Frisottis déclarés', hair.frizz, 'ils déterminent le besoin de contrôle');
          addEvidence('hair.dryness', 'Sécheresse', hair.dryness, 'elle aggrave les frisottis sans en être la cause');
          reasons.push('Contrôle des frisottis relié à la fréquence déclarée, la sécheresse n’étant citée que comme facteur aggravant.');
        }
        return match;
      }
      case 'apaiser_cuir_chevelu': {
        /**
         * Plus étroit que `cuir_chevelu` : celui-ci couvre tout état renseigné,
         * celui-ci ne couvre que les signes d'irritation réels. `sebum` n'est
         * pas une irritation : il appelle un lavage, pas un apaisant.
         */
        const signs = hair.scalpConcerns.filter(concern => ['demangeaisons', 'sensibilite', 'pellicules'].includes(concern));
        const match = signs.length > 0;
        if (match) {
          addEvidence('hair.scalpConcerns', 'Signes du cuir chevelu', signs.join(', '), 'ils appellent un soin apaisant plutôt qu’un simple entretien');
          reasons.push('Apaisement relié aux signes d’irritation déclarés, distingués du simple excès de sébum.');
        }
        return match;
      }
      case 'proteger_chaleur': {
        const match = hair.stylingHabits.includes('chaleur');
        if (match) {
          addEvidence('hair.stylingHabits', 'Habitudes de coiffage', hair.stylingHabits.join(', '), 'l’usage d’outils chauffants crée le besoin');
          addEvidence('hair.fiberCondition', 'État de la fibre', hair.fiberCondition, 'il détermine le niveau de protection requis');
          reasons.push('Protection thermique reliée à l’usage déclaré d’outils chauffants, pas à une supposition sur le coiffage.');
        }
        return match;
      }
      case 'demeler_cheveux': {
        /**
         * Fondé sur l'habitude déclarée, pas sur la texture : un cheveu très
         * bouclé n'appelle pas automatiquement un démêlant si la personne ne
         * démêle pas.
         */
        const match = hair.stylingHabits.includes('demelage');
        if (match) {
          addEvidence('hair.stylingHabits', 'Habitudes de coiffage', hair.stylingHabits.join(', '), 'le démêlage déclaré crée le besoin');
          addEvidence('hair.breakage', 'Casse', hair.breakage, 'elle détermine la prudence requise au démêlage');
          reasons.push('Démêlage relié à l’habitude déclarée, la casse n’étant citée que comme niveau de précaution.');
        }
        return match;
      }
      case 'barbe': {
        /**
         * Champ dédié. Le besoin `barbe` figurait au vocabulaire contrôlé sans
         * qu'aucun champ du profil ne permette de l'établir : tout produit
         * « barbe » était compté au dénominateur sans jamais pouvoir être
         * satisfait. Le déduire du genre aurait été une supposition.
         */
        const match = hasAny([hair.facialHair], ['leger', 'moderee', 'dense']);
        if (match) {
          addEvidence('hair.facialHair', 'Pilosité faciale', hair.facialHair, 'elle établit le besoin de soin de la barbe');
          reasons.push('Soin de la barbe relié à la pilosité faciale déclarée, jamais déduit du genre.');
        }
        return match;
      }
      case 'entretenir_tresses': {
        const match = protectiveStyles.includes('tresses') || protectiveStyles.includes('twists') || protectiveStyles.includes('vanilles');
        if (match) {
          addEvidence('hair.protectiveStyles', 'Style protecteur', protectiveStyles.join(', '), 'il détermine les besoins d’entretien');
          reasons.push('Entretien protecteur relié au style actuellement porté.');
        }
        return match;
      }
      case 'entretenir_locks': {
        const match = protectiveStyles.includes('locks') || hair.texturePatterns.includes('locks');
        if (match) {
          addEvidence('hair.protectiveStyles', 'Style protecteur', protectiveStyles.join(', '), 'il détermine les besoins d’entretien');
          addEvidence('hair.texturePatterns', 'Textures renseignées', hair.texturePatterns.join(', '), 'elles complètent le contexte locks');
          reasons.push('Entretien locks relié au style et aux textures déclarés.');
        }
        return match;
      }
      case 'entretenir_perruque': {
        const match = protectiveStyles.includes('perruque');
        if (match) {
          addEvidence('hair.protectiveStyles', 'Style protecteur', protectiveStyles.join(', '), 'il détermine les besoins d’entretien');
          reasons.push('Entretien perruque relié au style protecteur déclaré.');
        }
        return match;
      }
      case 'proteger_nuit': {
        const match = hair.breakage === 'frequente' || hair.dryness === 'forte' || hair.zones.ends.breakage === 'frequente';
        if (match) {
          addEvidence('hair.breakage', 'Casse', hair.breakage, 'elle rend la réduction des frottements pertinente');
          addEvidence('hair.dryness', 'Sécheresse', hair.dryness, 'elle rend la protection nocturne pertinente');
          reasons.push('Protection nocturne reliée à la sécheresse et à la casse déclarées.');
        }
        return match;
      }
      case 'protection_solaire': {
        const match = skin.spfUsage === 'jamais' || skin.spfUsage === 'parfois' || skin.sunExposure === 'forte';
        if (match) {
          addEvidence('skin.spfUsage', 'Usage du SPF', skin.spfUsage, 'il indique le besoin d’accompagnement solaire');
          addEvidence('skin.sunExposure', 'Exposition solaire', skin.sunExposure, 'elle modifie la priorité de protection');
          reasons.push('Protection solaire reliée à l’exposition et à l’usage du SPF, pas à la profondeur de carnation seule.');
        }
        return match;
      }
      case 'taches_hyperpigmentation': {
        const match = skin.hyperpigmentationTendency === 'frequente' || skin.postInflammatoryMarks === 'frequentes' || skin.postInflammatoryMarks === 'occasionnelles';
        if (match) {
          addEvidence('skin.hyperpigmentationTendency', 'Tendance à l’hyperpigmentation', skin.hyperpigmentationTendency, 'elle indique une priorité pigmentation');
          addEvidence('skin.postInflammatoryMarks', 'Marques post-inflammatoires', skin.postInflammatoryMarks, 'elles précisent le besoin ciblé');
          reasons.push('Pigmentation reliée à l’inflammation déclarée et aux marques, pas à une simple échelle de couleur.');
        }
        return match;
      }
      case 'imperfections_acne': {
        const match = skin.acne === 'occasionnelle' || skin.acne === 'reguliere';
        if (match) {
          addEvidence('skin.acne', 'Imperfections', skin.acne, 'elles déterminent la pertinence du besoin');
          reasons.push('Imperfections reliées à la fréquence déclarée.');
        }
        return match;
      }
      case 'peau_sensible': {
        const match = skin.sensitivity === 'moyenne' || skin.sensitivity === 'elevee' || skin.activeTolerance === 'faible';
        if (match) {
          addEvidence('skin.sensitivity', 'Sensibilité', skin.sensitivity, 'elle guide la prudence de formulation');
          addEvidence('skin.activeTolerance', 'Tolérance aux actifs', skin.activeTolerance, 'elle limite l’intensité recommandée');
          reasons.push('Peau sensible reliée à la sensibilité et à la tolérance aux actifs.');
        }
        return match;
      }
      case 'hydrater_peau': {
        const match = skin.hydration === 'deshydratee' || skin.hydration === 'seche';
        if (match) {
          addEvidence('skin.hydration', 'Hydratation cutanée', skin.hydration, 'elle guide le besoin de confort');
          reasons.push('Hydratation reliée à l’état de déshydratation ou de sécheresse déclaré.');
        }
        return match;
      }
      case 'barriere_cutanee': {
        // La barrière se dégrade avant la sécheresse : tiraillements,
        // réactivité au parfum, intolérance aux actifs. On la relie donc à
        // trois signaux distincts plutôt qu'au seul niveau d'hydratation.
        const concerns = skin.skinConcerns || [];
        const match =
          concerns.includes('secheresse') ||
          concerns.includes('deshydratation') ||
          concerns.includes('sensibilite') ||
          concerns.includes('rougeurs') ||
          skin.hydration === 'seche' ||
          skin.activeTolerance === 'faible';
        if (match) {
          addEvidence('skin.skinConcerns', 'Préoccupations', (skin.skinConcerns || []).join(', '), 'elles signalent une barrière fragilisée');
          addEvidence('skin.activeTolerance', 'Tolérance aux actifs', skin.activeTolerance, 'une tolérance faible traduit une barrière perméable');
          reasons.push('Barrière reliée aux tiraillements, à la réactivité et à la tolérance aux actifs déclarées.');
        }
        return match;
      }
      case 'eclat_teint_terne': {
        const concerns = skin.skinConcerns || [];
        // Une peau qui marque beaucoup n'a pas un teint uniforme : l'éclat est
        // demandé même quand la personne n'a pas coché « teint terne ».
        const match =
          concerns.includes('teint_terne') ||
          concerns.includes('grain_irregulier') ||
          concerns.includes('teint_non_uniforme') ||
          skin.hyperpigmentationTendency === 'frequente' ||
          skin.postInflammatoryMarks === 'frequentes';
        if (match) {
          addEvidence('skin.skinConcerns', 'Préoccupations', (skin.skinConcerns || []).join(', '), 'elles portent la demande d’éclat');
          addEvidence('skin.hyperpigmentationTendency', 'Tendance à l’hyperpigmentation', skin.hyperpigmentationTendency, 'un teint qui marque n’est pas uniforme');
          reasons.push('Éclat relié au teint terne, au grain irrégulier ou aux marques pigmentaires déclarées.');
        }
        return match;
      }
      case 'maturite_rides': {
        const concerns = skin.skinConcerns || [];
        const match =
          concerns.includes('rides') ||
          concerns.includes('fermete') ||
          skin.skinType === 'mature';
        if (match) {
          addEvidence('skin.skinConcerns', 'Préoccupations', (skin.skinConcerns || []).join(', '), 'elles portent la demande de fermeté');
          addEvidence('skin.skinType', 'Type de peau', skin.skinType, 'il indique une peau mature');
          reasons.push('Maturité reliée aux rides, à la perte de fermeté ou au type de peau déclaré.');
        }
        return match;
      }
      default:
        return false;
    }
  };

  const needSignals: NeedSignal[] = [];

  needs.forEach(need => {
    const met = matchNeed(need);
    const depth = met ? assessNeedDepth(need, profile) : NO_DEPTH;
    needSignals.push({
      code: need,
      met,
      intensity: met ? Math.min(100, BASE_INTENSITY + depth.intensity) : 0,
      nuances: depth.nuances,
      limitations: depth.limitations
    });
    if (!met) unmetNeeds.push(need);
  });

  if (known(environment.climate) || known(environment.humidity) || known(environment.waterQuality)) {
    addEvidence('environment.climate', 'Climat', environment.climate, 'il peut modifier la fréquence et la texture conseillées');
    addEvidence('environment.humidity', 'Humidité', environment.humidity, 'elle peut modifier le comportement de la fibre');
    addEvidence('environment.waterQuality', 'Qualité de l’eau', environment.waterQuality, 'elle peut modifier le besoin de clarification');
  }

  /**
   * CHANTIER D1 — les nuances sont ajoutées aux raisons APRÈS les raisons par
   * besoin, jamais avant. `recommendationsForSlugs` affiche `reasons[0]` : un
   * conseil différencié placé en tête aurait remplacé l'explication de
   * pertinence par un détail de geste.
   */
  needSignals.forEach(signal => {
    signal.nuances.forEach(nuance => {
      reasons.push(`${formatValue(signal.code)} — ${nuance.advice}`);
    });
    signal.limitations.forEach(limitation => {
      reasons.push(`${formatValue(signal.code)} — ${limitation}`);
    });
  });

  const confidenceFields = [hair.porosity, hair.density, hair.fiberCondition, hair.dryness, hair.breakage, hair.scalpCondition, skin.sensitivity, skin.hyperpigmentationTendency, skin.hydration, skin.spfUsage];
  const knownConfidence = confidenceFields.filter(known).length;
  const confidence = Math.round((knownConfidence / confidenceFields.length) * 100);
  const score = needs.length > 0 ? Math.round((needs.length - unmetNeeds.length) / needs.length * 100) : null;

  return {
    score,
    confidence,
    reasons: Array.from(new Set(reasons)),
    evidence,
    unmetNeeds,
    needSignals
  };
}
