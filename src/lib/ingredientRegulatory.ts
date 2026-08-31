/**
 * DONNÉES RÉGLEMENTAIRES & FONCTIONNELLES DES INGRÉDIENTS (sources 100 % gratuites, tracées).
 *
 * Principe directeur du Chantier 1 : aucun fait n'est inscrit sans une source
 * qui le dise. Ce module ne contient PAS de fonctions déduites de la chimie.
 *
 * Sources de ce lot :
 *  - **CosIng** (base de la Commission européenne, règlement (CE) n°1223/2009) :
 *    fonctions cosmétiques déclarées (vocabulaire contrôlé des fonctions),
 *    statut réglementaire (conservateurs annexe V, filtres UV annexe VI,
 *    colorants annexe IV) — https://ec.europa.eu/growth/tools-databases/cosing/
 *  - **Règlement (CE) n°1223/2009**, annexes II (interdits) et III (restreints) :
 *    https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra
 *  - **Règlement (UE) 2023/1545** (modifie l'annexe III : 26 allergènes historiques
 *    + 56 allergènes supplémentaires, seuils d'étiquetage 0,001 % leave-on /
 *    0,01 % rinse-off, applicables au plus tard le 31/07/2026) :
 *    https://eur-lex.europa.eu/eli/reg/2023/1545/oj/fra
 *  - Liste de référence des 26 allergènes historiques : EMA, « European Union
 *    list of fragrance allergens requiring labelling » (CAS en regard).
 *
 * Les fonctions sont libellées en français, dans le vocabulaire déjà utilisé
 * par la table `ingredients.functions`. Les identifiants (`id`) correspondent
 * aux clés de la table `ingredients` ; seuls des ingrédients réels y figurent.
 */

/** Statut juridictionnel UE, aligné sur la contrainte SQL de la table. */
export type EuStatus = 'allowed' | 'restricted' | 'prohibited' | 'unknown';

export interface IngredientRegulatoryFact {
  /** Clé de `ingredients.id`. */
  id: string;
  /**
   * Fonctions cosmétiques selon le vocabulaire CosIng (libellés FR déjà
   * présents en base). Vide si aucune fonction certaine.
   */
  functions: string[];
  /** `true` si la substance est un allergène à étiquetage obligatoire (annexe III). */
  allergen?: boolean;
  /** Restriction UE éventuelle. */
  restriction?: {
    status: EuStatus;
    /** Concentration maximale en % (quand l'annexe la fixe numériquement). */
    limitPercent?: number;
    /** Annexe du règlement (CE) n°1223/2009. */
    annex: 'II' | 'III' | 'IV' | 'V' | 'VI';
    /** Référence lisible, tracée. */
    reference: string;
    note?: string;
  };
}

const REG_1223 = 'Règlement (CE) n°1223/2009';
const REG_1545 = 'Règlement (UE) 2023/1545 (modifie l’annexe III)';

/**
 * Vocabulaire des fonctions CosIng, libellés FR (ceux déjà en base).
 * Référence : CosIng > Reference data > Functions.
 */
const F = {
  emollient: 'émollient',
  skinConditioning: "agent d'entretien de la peau",
  humectant: 'humectant',
  solvent: 'solvant',
  viscosity: 'agent de contrôle de la viscosité',
  emulsifier: 'émulsifiant',
  emulsionStab: "stabilisateur d'émulsion",
  surfactant: 'tensioactif',
  cleansing: 'nettoyant',
  preservative: 'conservateur',
  antioxidant: 'antioxydant',
  phAdjuster: 'ajusteur de pH',
  chelating: 'chélateur',
  fragrance: 'parfum',
  masking: 'agent masquant',
  hairConditioning: 'conditionneur capillaire',
  antistatic: 'antistatique',
  filmForming: 'filmogène',
  uvFilter: 'filtre UV',
  colorant: 'colorant',
  binder: 'liant',
  opacifying: 'opacifiant',
  abrasive: 'abrasif',
  absorbent: 'absorbant',
  bulking: 'agent de remplissage',
  denaturant: 'denaturant',
  astringent: 'astringent',
  tonic: 'tonique',
  soothing: 'apaisant cutané',
  skinProtecting: 'protecteur cutané',
  buffering: 'tampon',
  hydrotrope: 'hydrotrope',
  deodorant: 'déodorant',
  antiDandruff: 'antipelliculaire',
  keratolytic: 'kératolytique',
};

/**
 * Faits réglementaires et fonctionnels, par ingrédient.
 * Chaque ligne est vérifiable dans CosIng / les annexes. Les fonctions
 * correspondent à la déclaration CosIng de la substance (jamais déduites).
 */
export const INGREDIENT_REGULATORY: IngredientRegulatoryFact[] = [
  // ---- Conservateurs (annexe V) et apparentés ----
  { id: 'methylparaben', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 0.4, reference: `${REG_1223}, annexe V (esters de p-hydroxybenzoate)`, note: '0,4 % par ester ; 0,8 % en mélange de parabènes.' } },
  { id: 'sorbic-acid', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 0.6, reference: `${REG_1223}, annexe V (acide sorbique et sorbates)` } },
  { id: 'dmdm-hydantoin', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 0.6, reference: `${REG_1223}, annexe V (DMDM hydantoïne, libérateur de formaldéhyde)` } },
  { id: 'chlorphenesin', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 0.3, reference: `${REG_1223}, annexe V (chlorphénésine)` } },
  { id: 'zinc-pyrithione', functions: [F.antiDandruff, F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 1.0, reference: `${REG_1223}, annexe V (pyrithione de zinc)`, note: 'Autorisé dans les produits capillaires rincés ; interdit sous forme aérosol.' } },
  { id: 'chlorhexidine-digluconate', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 0.3, reference: `${REG_1223}, annexe V (digluconate de chlorhexidine)` } },
  { id: 'hydroxyacetophenone', functions: [F.antioxidant, F.preservative] },
  { id: 'sodium-anisate', functions: [F.preservative] },
  { id: 'levulinic-acid', functions: [F.preservative, F.skinConditioning] },
  { id: 'sodium-levulinate', functions: [F.preservative] },
  { id: 'glyceryl-caprylate', functions: [F.emollient, F.emulsifier, F.preservative] },
  { id: 'sodium-benzoate', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 0.5, reference: `${REG_1223}, annexe V (benzoate de sodium)`, note: '0,5 % calculé en acide benzoïque (usage conservateur).' } },
  { id: 'benzoic-acid', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 0.5, reference: `${REG_1223}, annexe V (acide benzoïque)`, note: '0,5 % calculé en acide (usage conservateur).' } },
  { id: 'potassium-sorbate', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 0.6, reference: `${REG_1223}, annexe V (sorbate de potassium)` } },
  { id: 'phenoxyethanol', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', limitPercent: 1.0, reference: `${REG_1223}, annexe V (phénoxyéthanol)` } },

  // ---- Filtres UV (annexe VI) ----
  { id: 'ethylhexyl-methoxycinnamate', functions: [F.uvFilter], restriction: { status: 'allowed', annex: 'VI', limitPercent: 10.0, reference: `${REG_1223}, annexe VI (octinoxate)` } },
  { id: 'butyl-methoxydibenzoylmethane', functions: [F.uvFilter], restriction: { status: 'allowed', annex: 'VI', limitPercent: 5.0, reference: `${REG_1223}, annexe VI (avobenzone)` } },
  { id: 'octocrylene', functions: [F.uvFilter], restriction: { status: 'allowed', annex: 'VI', limitPercent: 10.0, reference: `${REG_1223}, annexe VI (octocrylène)` } },
  { id: 'benzophenone-4', functions: [F.uvFilter], restriction: { status: 'allowed', annex: 'VI', limitPercent: 5.0, reference: `${REG_1223}, annexe VI (sulisobenzone)` } },
  { id: 'ethylhexyl-salicylate', functions: [F.uvFilter], restriction: { status: 'allowed', annex: 'VI', limitPercent: 5.0, reference: `${REG_1223}, annexe VI (octisalate)` } },
  { id: 'ethylhexyl-triazone', functions: [F.uvFilter], restriction: { status: 'allowed', annex: 'VI', limitPercent: 5.0, reference: `${REG_1223}, annexe VI (éthylhexyl triazone)` } },
  { id: 'diethylamino-hydroxybenzoyl-hexyl-benzoate', functions: [F.uvFilter], restriction: { status: 'allowed', annex: 'VI', limitPercent: 10.0, reference: `${REG_1223}, annexe VI (Uvinul A Plus)` } },
  { id: 'titanium-dioxide', functions: [F.uvFilter, F.colorant], restriction: { status: 'allowed', annex: 'VI', limitPercent: 25.0, reference: `${REG_1223}, annexes IV/VI (dioxyde de titane)` } },
  { id: 'zinc-oxide', functions: [F.uvFilter, F.skinProtecting], restriction: { status: 'allowed', annex: 'VI', limitPercent: 25.0, reference: `${REG_1223}, annexe VI (oxyde de zinc, filtre minéral)` } },

  // ---- Colorants (annexe IV) : codes CI ----
  ...['ci-14700','ci-15985','ci-16035','ci-16255','ci-47005','ci-77491','ci-77492','e110','e133','red-33','red-4','yellow-5','caramel','illite']
    .map((id): IngredientRegulatoryFact => ({
      id,
      functions: [F.colorant],
      restriction: { status: 'allowed', annex: 'IV', reference: `${REG_1223}, annexe IV (colorants autorisés)` },
    })),
  { id: 'silica', functions: [F.absorbent, F.bulking, F.viscosity, F.abrasive] },
  { id: 'e551', functions: [F.absorbent, F.bulking], restriction: { status: 'allowed', annex: 'IV', reference: `${REG_1223}, annexe IV (dioxyde de silicium, E551)` } },

  // ---- Allergènes parfumants (annexe III ; 26 historiques + réglementation 2023/1545) ----
  { id: 'eugenol', functions: [F.fragrance, F.masking, F.soothing], allergen: true, restriction: { status: 'restricted', annex: 'III', reference: `${REG_1223}, annexe III — ${REG_1545}`, note: 'Allergène à étiquetage au-delà des seuils (0,001 % leave-on / 0,01 % rinse-off).' } },
  { id: 'amyl-cinnamal', functions: [F.fragrance], allergen: true, restriction: { status: 'restricted', annex: 'III', reference: `${REG_1223}, annexe III — ${REG_1545}` } },
  { id: 'benzyl-alcohol', functions: [F.solvent, F.preservative, F.fragrance], allergen: true, restriction: { status: 'restricted', annex: 'V', limitPercent: 1.0, reference: `${REG_1223}, annexe V (conservateur, 1 %) ; allergène annexe III — ${REG_1545}` } },
  { id: 'linalool', functions: [F.fragrance], allergen: true, restriction: { status: 'restricted', annex: 'III', reference: `${REG_1223}, annexe III — ${REG_1545}` } },
  { id: 'limonene', functions: [F.fragrance, F.solvent], allergen: true, restriction: { status: 'restricted', annex: 'III', reference: `${REG_1223}, annexe III — ${REG_1545}` } },
  { id: 'terpineol', functions: [F.fragrance, F.viscosity], allergen: false },
  { id: 'hexamethylindanopyran', functions: [F.fragrance], allergen: true, restriction: { status: 'restricted', annex: 'III', reference: `${REG_1545} (Galaxolide, allergène supplémentaire)` } },
  { id: 'bisabolol', functions: [F.soothing, F.skinConditioning, F.fragrance] },

  // ---- Tensioactifs / nettoyants ----
  { id: 'ammonium-lauryl-sulfate', functions: [F.surfactant, F.cleansing] },
  { id: 'sodium-c14-16-olefin-sulfonate', functions: [F.surfactant, F.cleansing] },
  { id: 'sodium-cocoyl-glutamate', functions: [F.surfactant, F.cleansing, F.hairConditioning] },
  { id: 'sodium-stearoyl-glutamate', functions: [F.surfactant, F.emulsifier, F.skinConditioning] },
  { id: 'capryl-glucoside', functions: [F.surfactant, F.cleansing, F.emulsifier] },
  { id: 'cetearyl-glucoside', functions: [F.emulsifier, F.surfactant, F.skinConditioning] },
  { id: 'sorbitan-oleate', functions: [F.emulsifier, F.surfactant] },
  { id: 'potassium-cetyl-phosphate', functions: [F.emulsifier, F.surfactant] },
  { id: 'sodium-laurate', functions: [F.surfactant, F.cleansing, F.emulsifier] },
  { id: 'sodium-stearate', functions: [F.surfactant, F.emulsifier, F.viscosity] },
  { id: 'sodium-sulfate', functions: [F.viscosity, F.bulking] },
  { id: 'sea-salt', functions: [F.viscosity, F.abrasive, F.bulking] },
  { id: 'triethanolamine', functions: [F.phAdjuster, F.buffering, F.emulsifier, F.fragrance] },
  { id: 'potassium-hydroxide', functions: [F.phAdjuster, F.buffering], restriction: { status: 'restricted', annex: 'III', reference: `${REG_1223}, annexe III (hydroxyde de potassium, réserve alcaline)`, note: 'Concentration d’usage selon pH final ; réserves pour les produits destinés aux contacts cutanés.' } },

  // ---- Émollients / alcools gras / esters ----
  { id: 'behenyl-alcohol', functions: [F.emollient, F.viscosity, F.emulsionStab, F.hairConditioning] },
  { id: 'myristyl-alcohol', functions: [F.emollient, F.viscosity, F.emulsionStab] },
  { id: 'cetyl-palmitate', functions: [F.emollient, F.skinConditioning] },
  { id: 'myristyl-myristate', functions: [F.emollient, F.skinConditioning] },
  { id: 'isopropyl-palmitate', functions: [F.emollient, F.skinConditioning, F.binder] },
  { id: 'octyldodecanol', functions: [F.emollient, F.skinConditioning] },
  { id: 'dicaprylyl-carbonate', functions: [F.emollient, F.skinConditioning] },
  { id: 'dicaprylyl-ether', functions: [F.emollient, F.skinConditioning] },
  { id: 'propylene-glycol-dicaprylate', functions: [F.emollient, F.skinConditioning] },
  { id: 'oleic-acid', functions: [F.emollient, F.skinConditioning, F.emulsifier] },
  { id: 'palmitic-acid', functions: [F.emollient, F.emulsifier, F.skinConditioning] },
  { id: 'lauric-acid', functions: [F.emollient, F.emulsifier, F.surfactant] },
  { id: 'caprylic', functions: [F.emollient, F.emulsifier] },
  { id: 'caprate', functions: [F.emollient, F.emulsifier] },
  { id: 'laureth-2', functions: [F.emulsifier, F.surfactant, F.skinConditioning] },
  { id: 'peg', functions: [F.humectant, F.solvent, F.binder] },

  // ---- Humectants / polyols / solvants ----
  { id: 'sorbitol', functions: [F.humectant, F.skinConditioning, F.solvent] },
  { id: 'sodium-lactate', functions: [F.humectant, F.skinConditioning, F.buffering] },
  { id: 'betaine', functions: [F.humectant, F.skinConditioning, F.antistatic, F.viscosity] },
  { id: 'urea', functions: [F.humectant, F.skinConditioning, F.keratolytic] },
  { id: 'trehalose', functions: [F.humectant, F.skinConditioning] },
  { id: 'glucose', functions: [F.humectant, F.skinConditioning] },
  { id: 'glycine', functions: [F.skinConditioning, F.hairConditioning, F.antistatic] },
  { id: 'serine', functions: [F.skinConditioning, F.hairConditioning, F.antistatic] },
  { id: 'hexylene-glycol', functions: [F.solvent, F.viscosity, F.humectant] },
  { id: 'dipropylene-glycol', functions: [F.solvent, F.viscosity, F.fragrance] },
  { id: 'triethylene-glycol', functions: [F.solvent, F.humectant] },
  { id: 'methylpropanediol', functions: [F.solvent, F.humectant, F.viscosity] },
  { id: 'e420', functions: [F.humectant, F.skinConditioning, F.solvent] },
  { id: 'e1519', functions: [F.solvent, F.humectant] },
  { id: 'e1510', functions: [F.solvent, F.denaturant] },
  { id: 'alcohol', functions: [F.solvent, F.astringent, F.viscosity, F.deodorant], restriction: { status: 'restricted', annex: 'III', reference: `${REG_1223}, annexe III (alcool éthylique dénaturé)`, note: 'Éthanol : teneur encadrée ; dénaturation obligatoire.' } },
  { id: 'e490', functions: [F.emollient, F.skinConditioning] },
  { id: 'panthenyl-ethyl-ether', functions: [F.hairConditioning, F.skinConditioning, F.humectant] },
  { id: 'biotin', functions: [F.hairConditioning, F.skinConditioning] },
  { id: 'caffeine', functions: [F.skinConditioning, F.soothing] },

  // ---- Actifs / antioxydants / pH / chélateurs ----
  { id: 'ascorbyl-glucoside', functions: [F.antioxidant, F.skinConditioning] },
  { id: 'ascorbyl-palmitate', functions: [F.antioxidant] },
  { id: 'e321', functions: [F.antioxidant] },
  { id: 'bht', functions: [F.antioxidant, F.fragrance], restriction: { status: 'restricted', annex: 'III', reference: `${REG_1223}, annexe III (BHT)`, note: '0,8 % en mélange.' } },
  { id: 'retinyl-palmitate', functions: [F.skinConditioning, F.antioxidant] },
  { id: 'glycolic-acid', functions: [F.phAdjuster, F.buffering, F.keratolytic, F.skinConditioning], restriction: { status: 'restricted', annex: 'III', reference: `${REG_1223}, annexe III (acides alpha-hydroxylés)`, note: 'Concentration et pH encadrés pour les usages kératolytiques.' } },
  { id: 'acetic-acid', functions: [F.phAdjuster, F.buffering] },
  { id: 'e270', functions: [F.phAdjuster, F.buffering, F.humectant] },
  { id: 'e265', functions: [F.phAdjuster, F.buffering] },
  { id: 'e325', functions: [F.antioxidant, F.skinConditioning] },
  { id: 'e210', functions: [F.preservative], restriction: { status: 'restricted', annex: 'V', reference: `${REG_1223}, annexe V (acide benzoïque E210)` } },
  { id: 'e487', functions: [F.surfactant, F.emulsifier] },
  { id: 'gluconolactone', functions: [F.chelating, F.keratolytic, F.humectant] },
  { id: 'sodium-gluconate', functions: [F.chelating] },
  { id: 'sodium-phytate', functions: [F.chelating] },
  { id: 'etidronic-acid', functions: [F.chelating, F.viscosity] },
  { id: 'tetrasodium-etidronate', functions: [F.chelating, F.viscosity] },
  { id: 'trisodium-ethylenediamine-disuccinate', functions: [F.chelating] },
  { id: 'magnesium-nitrate', functions: [F.preservative, F.viscosity] },
  { id: 'sodium-phosphate', functions: [F.buffering, F.phAdjuster, F.chelating] },
  { id: 'triethyl-citrate', functions: [F.filmForming, F.deodorant, F.solvent] },
  { id: 'sodium', functions: [F.phAdjuster] },

  // ---- Polymères / filmogènes / épaississants ----
  { id: 'ammonium-acryloyldimethyltaurate', functions: [F.viscosity, F.emulsionStab, F.filmForming] },
  { id: 'hydroxyethyl-acrylate', functions: [F.viscosity, F.filmForming, F.emulsionStab] },
  { id: 'behentrimonium-methosulfate', functions: [F.hairConditioning, F.antistatic, F.surfactant] },
  { id: 'glyceryl-stearate-se', functions: [F.emulsifier, F.skinConditioning, F.surfactant] },

  // ---- Divers / à ne pas surétiqueter ----
  { id: 'styrene', functions: [F.viscosity, F.filmForming] },
];

/**
 * Récupère les faits réglementaires d'un ingrédient (par clé `ingredients.id`).
 */
export function regulatoryFor(id: string): IngredientRegulatoryFact | undefined {
  return INGREDIENT_REGULATORY.find((f) => f.id === id);
}

/** Liste des ids présents dans ce module (pour les tests). */
export const REGULATORY_IDS = INGREDIENT_REGULATORY.map((f) => f.id);
