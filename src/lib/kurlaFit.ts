import { Product } from '../types';
import { BeautyProfile, UNKNOWN } from './beautyProfile';

export interface FitEvidence {
  field: string;
  label: string;
  value: string;
  relation: string;
}

export interface KurlaFitResult {
  score: number | null;
  confidence: number;
  reasons: string[];
  evidence: FitEvidence[];
  unmetNeeds: string[];
}

function known(value: unknown): boolean {
  return typeof value === 'string' && value !== '' && value !== UNKNOWN;
}

function hasAny(values: string[], expected: string[]): boolean {
  return values.some(value => expected.includes(value));
}

function formatValue(value: string): string {
  return value.replaceAll('_', ' ');
}

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
      default:
        return false;
    }
  };

  needs.forEach(need => {
    if (!matchNeed(need)) unmetNeeds.push(need);
  });

  if (known(environment.climate) || known(environment.humidity) || known(environment.waterQuality)) {
    addEvidence('environment.climate', 'Climat', environment.climate, 'il peut modifier la fréquence et la texture conseillées');
    addEvidence('environment.humidity', 'Humidité', environment.humidity, 'elle peut modifier le comportement de la fibre');
    addEvidence('environment.waterQuality', 'Qualité de l’eau', environment.waterQuality, 'elle peut modifier le besoin de clarification');
  }

  const confidenceFields = [hair.porosity, hair.density, hair.fiberCondition, hair.dryness, hair.breakage, hair.scalpCondition, skin.sensitivity, skin.hyperpigmentationTendency, skin.hydration, skin.spfUsage];
  const knownConfidence = confidenceFields.filter(known).length;
  const confidence = Math.round((knownConfidence / confidenceFields.length) * 100);
  const score = needs.length > 0 ? Math.round((needs.length - unmetNeeds.length) / needs.length * 100) : null;

  return {
    score,
    confidence,
    reasons: Array.from(new Set(reasons)),
    evidence,
    unmetNeeds
  };
}
