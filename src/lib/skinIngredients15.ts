/**
 * KURLA SKIN — 15 FICHES INGRÉDIENT PEAU (C5 P1)
 * Source unique pour IngredientsGuidePage (tabs Cheveux|Peau) et Boutique filtre actif.
 * Chaque fiche = INCI + fonctions CosIng + preuve A/B + toneScope V-VI + garde mélanine.
 * Aucune promesse médicale — vocabulaire : uniformiser, jamais éclaircir.
 */

export type SkinIngredientFiche = {
  id: string; // ingredient.id normalisé
  inci: string;
  inciNormalized: string;
  commonNames: string[];
  functions: string[];
  family: string;
  origin: string;
  isFragrance: boolean;
  comedogenicity: number | null;
  maxEuPercent: number | null;
  description: string;
  evidenceLevel: 'A' | 'B' | 'C';
  evidenceClaim: string;
  toneScope: string[]; // phototypes concernés
  textureScope: string[];
  whitecastRisk?: 'faible' | 'modere' | 'eleve';
  boutiqueActif: string; // SKIN_ACTIVE_FILTERS.value
  routineStep: string;
  peauConcern: string[];
  garde?: string;
  verificationStatus: 'verified';
};

export const SKIN_INGREDIENTS_15: SkinIngredientFiche[] = [
  {
    id: 'niacinamide', inci: 'Niacinamide', inciNormalized: 'niacinamide',
    commonNames: ['vitamine B3', 'nicotinamide'], functions: ['apaisant', 'barrière', 'humectant', 'séborégulateur'],
    family: 'vitamines', origin: 'synthèse', isFragrance: false, comedogenicity: 0, maxEuPercent: null,
    description: 'Sweet spot 5% : limite le transfert de mélanosome (HPI) sans agresser. Tolérance élevée, compatible SPF le matin.',
    evidenceLevel: 'B', evidenceClaim: 'Soutient la fonction barrière et l’aspect uniforme du teint sur peaux sujettes aux marques post-inflammatoires.',
    toneScope: ['IV', 'V', 'VI'], textureScope: ['mixte', 'grasse', 'sensible'], boutiqueActif: 'niacinamide', routineStep: 'Sérum / tonique', peauConcern: ['taches', 'teint_terne', 'imperfections'], garde: 'Commencer 3×/sem, puis quotidien. Éviter même routine que vitamine C forte au début (alterner).',
    verificationStatus: 'verified',
  },
  {
    id: 'azelaic-acid', inci: 'Azelaic Acid', inciNormalized: 'azelaic acid',
    commonNames: ['acide azélaïque'], functions: ['kératolytique', 'apaisant', 'antibactérien'],
    family: 'acides dicarboxyliques', origin: 'synthèse (orge)', isFragrance: false, comedogenicity: 0, maxEuPercent: null,
    description: 'Alternative au niacinamide quand celui-ci ne suffit pas. Action sur taches + imperfections, sans phototoxicité.',
    evidenceLevel: 'B', evidenceClaim: 'Aide à atténuer l’aspect des taches et des rougeurs sur peaux sujettes aux imperfections.',
    toneScope: ['IV', 'V', 'VI'], textureScope: ['mixte', 'grasse'], boutiqueActif: 'acide_azelaic', routineStep: 'Sérum soir 3×/sem', peauConcern: ['taches', 'rougeurs', 'imperfections'], garde: 'Picotement léger possible au début — espacer si sensible.',
    verificationStatus: 'verified',
  },
  {
    id: 'ascorbic-acid', inci: 'Ascorbic Acid', inciNormalized: 'ascorbic acid',
    commonNames: ['vitamine C', 'acide ascorbique'], functions: ['antioxydant', 'éclat'],
    family: 'vitamines', origin: 'synthèse', isFragrance: false, comedogenicity: null, maxEuPercent: null,
    description: 'Antioxydant éclat — efficacité dépendante de la stabilité (Sodium Ascorbyl Phosphate plus stable).',
    evidenceLevel: 'B', evidenceClaim: 'Antioxydant : aide à prévenir l’aspect terne lié au stress oxydatif (stabilité de la formule déterminante).',
    toneScope: ['I', 'II', 'III', 'IV', 'V'], textureScope: ['normale', 'mixte'], boutiqueActif: 'vitamine_c', routineStep: 'Sérum matin', peauConcern: ['teint_terne', 'taches'], garde: 'Matin, jamais même routine que rétinol le soir au début.',
    verificationStatus: 'verified',
  },
  {
    id: 'retinol', inci: 'Retinol', inciNormalized: 'retinol',
    commonNames: ['vitamine A'], functions: ['rénovateur cellulaire'],
    family: 'rétinoïdes', origin: 'synthèse', isFragrance: false, comedogenicity: null, maxEuPercent: 0.3,
    description: 'Rétinoïde cosmétique — renouvellement cellulaire. Introduction progressive, jamais même soir que AHA/BHA.',
    evidenceLevel: 'A', evidenceClaim: 'Rénovateur cellulaire : concentration encadrée UE 0,3% ; introduction progressive conseillée.',
    toneScope: ['I', 'II', 'III', 'IV', 'V', 'VI'], textureScope: ['normale', 'mixte', 'mature'], boutiqueActif: 'retinol', routineStep: 'Sérum soir 2×/sem', peauConcern: ['rides', 'grain_irregulier', 'cicatrices'], garde: 'Jamais même soir que AHA/BHA — alterner soir A/B. SPF le matin obligatoire.',
    verificationStatus: 'verified',
  },
  {
    id: 'glycolic-acid', inci: 'Glycolic Acid', inciNormalized: 'glycolic acid',
    commonNames: ['acide glycolique', 'AHA'], functions: ['exfoliant', 'kératolytique'],
    family: 'AHA', origin: 'synthèse', isFragrance: false, comedogenicity: null, maxEuPercent: null,
    description: 'Plus petit AHA — exfoliation en surface, affine le grain. 1–2×/sem max, pas même soir que rétinol.',
    evidenceLevel: 'A', evidenceClaim: 'Kératolytique : lisse le grain de peau par desquamation maîtrisée.',
    toneScope: ['III', 'IV', 'V', 'VI'], textureScope: ['mixte', 'grasse'], boutiqueActif: 'aha', routineStep: 'Exfoliant 1–2×/sem', peauConcern: ['grain_irregulier', 'teint_terne', 'cicatrices'], garde: 'Sur peaux foncées : préférer lactique si sensible, toujours SPF le lendemain.',
    verificationStatus: 'verified',
  },
  {
    id: 'lactic-acid', inci: 'Lactic Acid', inciNormalized: 'lactic acid',
    commonNames: ['acide lactique', 'AHA doux'], functions: ['exfoliant doux', 'humectant'],
    family: 'AHA', origin: 'fermentation', isFragrance: false, comedogenicity: null, maxEuPercent: null,
    description: 'AHA plus doux que glycolique — option sensible. Humectant en plus.',
    evidenceLevel: 'B', evidenceClaim: 'Exfoliant doux : améliore la sensation de grain régulier avec meilleure tolérance.',
    toneScope: ['IV', 'V', 'VI'], textureScope: ['sensible', 'sèche'], boutiqueActif: 'aha', routineStep: 'Exfoliant doux', peauConcern: ['grain_irregulier', 'secheresse'], garde: 'Toléré souvent quand glycolique picote — tester sur zone.',
    verificationStatus: 'verified',
  },
  {
    id: 'salicylic-acid', inci: 'Salicylic Acid', inciNormalized: 'salicylic acid',
    commonNames: ['BHA', 'acide salicylique'], functions: ['kératolytique', 'séborégulateur'],
    family: 'BHA', origin: 'synthèse', isFragrance: false, comedogenicity: null, maxEuPercent: 2.0,
    description: 'BHA lipophile — désobstrue le pore, idéal mixte/grasse à imperfections. UE max 2%.',
    evidenceLevel: 'A', evidenceClaim: 'Kératolytique désobstruant : lisse le grain et réduit l’aspect des pores dilatés.',
    toneScope: ['III', 'IV', 'V', 'VI'], textureScope: ['grasse', 'mixte'], boutiqueActif: 'bha', routineStep: 'Exfoliant / nettoyant', peauConcern: ['imperfections', 'points_noirs', 'grain_irregulier'], garde: 'Ne pas cumuler AHA+BHA même soir si sensible.',
    verificationStatus: 'verified',
  },
  {
    id: 'ceramide-np', inci: 'Ceramide NP', inciNormalized: 'ceramide np',
    commonNames: ['céramide NP', 'céramide 3'], functions: ['barrière', 'émollient'],
    family: 'céramides', origin: 'synthèse biomimétique', isFragrance: false, comedogenicity: 0, maxEuPercent: null,
    description: 'Céramide identique peau — restaure les lipides intercornéocytaires, scelle l’hydratation.',
    evidenceLevel: 'B', evidenceClaim: 'Complète les lipides de la barrière cutanée et réduit la perte insensible en eau.',
    toneScope: ['I', 'II', 'III', 'IV', 'V', 'VI'], textureScope: ['sèche', 'sensible', 'mixte'], boutiqueActif: 'ceramides', routineStep: 'Crème / baume', peauConcern: ['secheresse', 'sensibilite', 'deshydratation'], garde: 'Incontournable peau sensible — associer cholestérol + acides gras pour ratio barrière.',
    verificationStatus: 'verified',
  },
  {
    id: 'squalane', inci: 'Squalane', inciNormalized: 'squalane',
    commonNames: ['squalane végétal'], functions: ['émollient', 'barrière'],
    family: 'lipides', origin: 'olive / canne à sucre', isFragrance: false, comedogenicity: 1, maxEuPercent: null,
    description: 'Émollient léger proche du sébum, peu comédogène. Fini naturel, non gras.',
    evidenceLevel: 'B', evidenceClaim: 'Émollient protecteur proche des lipides cutanés, bien toléré.',
    toneScope: ['I', 'II', 'III', 'IV', 'V', 'VI'], textureScope: ['sèche', 'mixte'], boutiqueActif: 'squalane', routineStep: 'Huile / scellage', peauConcern: ['secheresse', 'barriere'], garde: '1–2 gouttes suffisent sur peau encore humide.',
    verificationStatus: 'verified',
  },
  {
    id: 'hyaluronic-acid', inci: 'Hyaluronic Acid', inciNormalized: 'hyaluronic acid',
    commonNames: ['acide hyaluronique', 'sodium hyaluronate'], functions: ['humectant', 'repulpant'],
    family: 'glycosaminoglycanes', origin: 'fermentation', isFragrance: false, comedogenicity: 0, maxEuPercent: null,
    description: 'Humectant repulpant — attire jusqu’à 1000× son poids en eau en surface. Sur peau humide.',
    evidenceLevel: 'B', evidenceClaim: 'Humectant : améliore la sensation immédiate d’hydratation et de repulpé.',
    toneScope: ['I', 'II', 'III', 'IV', 'V', 'VI'], textureScope: ['deshydratee', 'mixte', 'sèche'], boutiqueActif: 'acide_hyaluronique', routineStep: 'Sérum / gel', peauConcern: ['deshydratation', 'secheresse', 'teint_terne'], garde: 'Toujours sceller avec crème — sinon perte en eau.',
    verificationStatus: 'verified',
  },
  {
    id: 'glycerin', inci: 'Glycerin', inciNormalized: 'glycerin',
    commonNames: ['glycérine'], functions: ['humectant'],
    family: 'polyols', origin: 'végétal', isFragrance: false, comedogenicity: 0, maxEuPercent: null,
    description: 'Humectant de référence — retient l’eau dans la couche cornée. Présent dans 90% des formules.',
    evidenceLevel: 'A', evidenceClaim: 'Humectant établi : retient l’eau et améliore la souplesse.',
    toneScope: ['I', 'II', 'III', 'IV', 'V', 'VI'], textureScope: ['toute'], boutiqueActif: 'acide_hyaluronique', routineStep: 'Toutes étapes', peauConcern: ['secheresse', 'deshydratation'], garde: 'Au-delà de 20% peut coller — dosage 5–10% idéal.',
    verificationStatus: 'verified',
  },
  {
    id: 'panthenol', inci: 'Panthenol', inciNormalized: 'panthenol',
    commonNames: ['provitamine B5'], functions: ['humectant', 'apaisant'],
    family: 'vitamines', origin: 'synthèse', isFragrance: false, comedogenicity: 0, maxEuPercent: null,
    description: 'Apaisant et humectant — confort immédiat, favorise la réparation.',
    evidenceLevel: 'B', evidenceClaim: 'Humectant et apaisant, améliore la sensation de confort cutané.',
    toneScope: ['I', 'II', 'III', 'IV', 'V', 'VI'], textureScope: ['sensible'], boutiqueActif: 'ceramides', routineStep: 'Sérum apaisant', peauConcern: ['sensibilite', 'rougeurs'], garde: 'Bien toléré — alternative douce quand niacinamide picote.',
    verificationStatus: 'verified',
  },
  {
    id: 'allantoin', inci: 'Allantoin', inciNormalized: 'allantoin',
    commonNames: ['allantoïne'], functions: ['apaisant', 'kératolytique doux'],
    family: 'purines', origin: 'consoude / synthèse', isFragrance: false, comedogenicity: 0, maxEuPercent: null,
    description: 'Apaisante et légèrement kératolytique — lisse sans décaper, idéale sensible.',
    evidenceLevel: 'B', evidenceClaim: 'Apaisante : réduit la sensation d’inconfort et favorise l’aspect lisse.',
    toneScope: ['IV', 'V', 'VI'], textureScope: ['sensible'], boutiqueActif: 'ceramides', routineStep: 'Crème apaisante', peauConcern: ['sensibilite', 'grain_irregulier'], garde: 'Souvent associée à panthénol + céramides pour barrière.',
    verificationStatus: 'verified',
  },
  {
    id: 'centella-asiatica', inci: 'Centella Asiatica Extract', inciNormalized: 'centella asiatica extract',
    commonNames: ['centella', 'cica'], functions: ['apaisant', 'réparateur'],
    family: 'extraits végétaux', origin: 'centella asiatica', isFragrance: false, comedogenicity: 0, maxEuPercent: null,
    description: 'Plante réparatrice (madécassoside) — apaise, soutient la barrière, bien tolérée phototypes foncés.',
    evidenceLevel: 'B', evidenceClaim: 'Apaisante et réparatrice : soutient le confort des peaux réactives.',
    toneScope: ['IV', 'V', 'VI'], textureScope: ['sensible', 'mixte'], boutiqueActif: 'ceramides', routineStep: 'Baume / crème cica', peauConcern: ['rougeurs', 'sensibilite', 'cicatrices'], garde: 'Cica ≠ cicatrisant médical — vocabulaire “apaiser, réconforter”.',
    verificationStatus: 'verified',
  },
  {
    id: 'tocopherol', inci: 'Tocopherol', inciNormalized: 'tocopherol',
    commonNames: ['vitamine E'], functions: ['antioxydant', 'émollient'],
    family: 'vitamines', origin: 'végétal', isFragrance: false, comedogenicity: 0, maxEuPercent: null,
    description: 'Antioxydant lipophile — stabilise les huiles et protège du stress oxydatif, souvent avec vitamine C.',
    evidenceLevel: 'B', evidenceClaim: 'Antioxydant lipophile complémentaire de la vitamine C (synergie).',
    toneScope: ['I', 'II', 'III', 'IV', 'V', 'VI'], textureScope: ['sèche', 'mixte'], boutiqueActif: 'vitamine_c', routineStep: 'Sérum / huile', peauConcern: ['teint_terne', 'deshydratation'], garde: 'Peut oxyder — flacon opaque, bien fermé.',
    verificationStatus: 'verified',
  },
];

export const SKIN_INGREDIENT_IDS = SKIN_INGREDIENTS_15.map(i => i.id);
export const SKIN_INGREDIENT_BY_INCI = new Map(SKIN_INGREDIENTS_15.map(i => [i.inciNormalized, i]));
export const SKIN_INGREDIENT_BY_ACTIF = new Map(SKIN_INGREDIENTS_15.map(i => [i.boutiqueActif, i]));
