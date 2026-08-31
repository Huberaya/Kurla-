/**
 * CHANTIER 1, lot 2 — FONCTIONS COSMÉTIQUES (vocabulaire contrôlé CosIng)
 * et RESTRICTIONS UE (Règlement (CE) n°1223/2009, Annexes II/III/V/VI).
 *
 * Règle d'or du chantier : une fonction cosmétique n'est JAMAIS déduite de la
 * chimie (formule/CAS). Elle provient d'un vocabulaire réglementaire. Ce
 * fichier encode le vocabulaire officiel **CosIng** (base publique de la
 * Commission européenne) et les annexes du Règlement cosmétiques.
 *
 * Pourquoi une table maintenue à la main plutôt qu'un import en direct :
 *  - l'export bulk historique CosIng a été retiré du portail data.europa.eu ;
 *  - l'API de l'application CosIng est servie sur un hôte backend non routable
 *    depuis notre chaîne de build (grapi.access-to-commodity-goods.ec.europa.eu) ;
 *  - nous n'utilisons aucun miroir tiers non fiable : les fonctions doivent
 *    rester attribuables à la source officielle.
 * On encode donc le vocabulaire CONTRÔLÉ (les libellés de fonction CosIng sont
 * fixes et publics) et les seules restrictions touchant des ingrédients
 * RÉELLEMENT présents dans le graphe. Chaque fait pointe vers sa source.
 * Quand un ingrédient n'est pas listé ici, `functions` reste vide jusqu'à
 * vérification dans CosIng : aucune fonction n'est inventée.
 */

/** Source officielle de référence (constantes pour la traçabilité). */
export const COSING_SOURCE = {
  label:
    "CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques)",
  url: "https://ec.europa.eu/growth/tools-databases/cosing/",
} as const;

export const EU_REGULATION_SOURCE = {
  label:
    "Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)",
  url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801",
} as const;

/**
 * Libellés FR du vocabulaire contrôlé CosIng que nous utilisons. Jeu restreint
 * et exact (entrées réelles du thésaurus « cosmetic functions » de CosIng).
 */
export const COSMETIC_FUNCTION_VOCABULARY = [
  "agent d'entretien de la peau", // SKIN CONDITIONING
  "humectant", // HUMECTANT
  "solvant", // SOLVENT
  "émollient", // EMOLLIENT
  "émulsifiant", // EMULSIFYING
  "tensioactif", // SURFACTANT
  "nettoyant", // CLEANSING
  "agent de contrôle de la viscosité", // VISCOSITY CONTROLLING
  "stabilisateur d'émulsion", // EMULSION STABILISING
  "conservateur", // PRESERVATIVE
  "antioxydant", // ANTIOXIDANT
  "chélateur", // CHELATING
  "séquestrant", // SEQUESTERING
  "tampon", // BUFFERING
  "ajusteur de pH", // pH adjuster
  "agent masquant", // MASKING
  "parfum", // FRAGRANCE / PERFUMING
  "protecteur cutané", // SKIN PROTECTING
  "apaisant cutané", // SOOTHING
  "conditionneur capillaire", // HAIR CONDITIONING
  "antistatique", // ANTISTATIC
  "opacifiant", // OPACIFYING
  "perlant", // PEARLESCENT
  "colorant", // COSMETIC COLORANT
  "filtre UV", // UV FILTER / UV ABSORBER
  "abrasif", // ABRASIVE
  "absorbant", // ABSORBENT
  "liant", // BINDER
  "filmogène", // FILM FORMING
  "kératolytique", // KERATOLYTIC
  "denaturant", // DENATURANT
  "hydrotrope", // HYDROTROPE
  "antipelliculaire", // ANTIDANDRUFF
  "déodorant", // DEODORANT
  "astringent", // ASTRINGENT
  "tonique", // TONIC
  "refroidissant", // REFRIGERANT
] as const;

export type CosmeticFunction = (typeof COSMETIC_FUNCTION_VOCABULARY)[number];

/**
 * Restriction UE applicable à un ingrédient du graphe.
 *  - II : interdit ; III : restreint (conditions/limites) ; V : conservateur
 *    listé (limite) ; VI : filtre UV listé (autorisé sous conditions).
 */
export interface EuRestriction {
  annex: "II" | "III" | "IV" | "V" | "VI";
  /** État stocké en base (cf. contrainte SQL allowed/restricted/prohibited). */
  status: "restricted" | "prohibited" | "allowed";
  limitPercent: number | null;
  note: string;
  entry?: string;
}

export interface CosingIngredientFacts {
  /** Id de l'ingrédient tel qu'en base (public.ingredients.id). */
  ingredientId: string;
  /** Fonctions CosIng principales (libellés FR du vocabulaire contrôlé). */
  functions: CosmeticFunction[];
  /** Allergène à déclaration obligatoire (Annexe III + Règl. (UE) 2023/1545). */
  regulatedAllergen?: boolean;
  /** Restriction UE éventuelle. */
  restriction?: EuRestriction;
}

/**
 * Faits CosIng / Règlement 1223/2009 pour les ingrédients présents en base.
 * Fonctions = entrées « Functions » de CosIng ; restrictions = Annexes.
 * Périmètre exact du graphe : aucun ingrédient hors base, aucune fonction
 * inventée.
 */
export const COSING_FACTS: CosingIngredientFacts[] = [
  // -------------------------------------------- eau, humectants, solvants
  { ingredientId: "aqua", functions: ["solvant"] },
  { ingredientId: "glycerin", functions: ["humectant", "agent d'entretien de la peau", "solvant"] },
  { ingredientId: "e422", functions: ["humectant", "solvant"] }, // glycérol (E422)
  { ingredientId: "propylene-glycol", functions: ["humectant", "solvant", "agent d'entretien de la peau"] },
  { ingredientId: "butylene-glycol", functions: ["humectant", "solvant", "agent d'entretien de la peau"] },
  { ingredientId: "pentylene-glycol", functions: ["humectant", "solvant", "agent d'entretien de la peau"] },
  { ingredientId: "propanediol", functions: ["humectant", "solvant", "agent d'entretien de la peau"] },
  { ingredientId: "isopropyl-alcohol", functions: ["solvant", "antioxydant"] },

  // -------------------------------------------- émollients, alcools gras, esters
  { ingredientId: "cetyl-alcohol", functions: ["émollient", "stabilisateur d'émulsion", "agent de contrôle de la viscosité", "opacifiant"] },
  { ingredientId: "stearyl-alcohol", functions: ["émollient", "stabilisateur d'émulsion", "agent de contrôle de la viscosité", "opacifiant"] },
  { ingredientId: "cetearyl-alcohol", functions: ["émollient", "stabilisateur d'émulsion", "agent de contrôle de la viscosité", "opacifiant"] },
  { ingredientId: "isopropyl-myristate", functions: ["émollient", "liant"] },
  { ingredientId: "capric-triglyceride", functions: ["émollient", "solvant", "agent d'entretien de la peau"] },
  { ingredientId: "squalane", functions: ["émollient", "agent d'entretien de la peau"] },
  { ingredientId: "stearic-acid", functions: ["émulsifiant", "stabilisateur d'émulsion", "agent de contrôle de la viscosité", "émollient"] },
  { ingredientId: "glyceryl-stearate", functions: ["émulsifiant", "stabilisateur d'émulsion"] },
  { ingredientId: "glycol-distearate", functions: ["opacifiant", "perlant", "stabilisateur d'émulsion", "agent de contrôle de la viscosité"] },
  { ingredientId: "lecithin", functions: ["émulsifiant", "stabilisateur d'émulsion", "agent d'entretien de la peau"] },

  // -------------------------------------------- beurres / huiles botaniques
  { ingredientId: "shea", functions: ["émollient", "agent d'entretien de la peau"] },
  { ingredientId: "shea-butter", functions: ["émollient", "agent d'entretien de la peau"] },
  { ingredientId: "butyrospermum_parkii", functions: ["émollient", "agent d'entretien de la peau"] },
  { ingredientId: "mangifera_indica", functions: ["émollient", "agent d'entretien de la peau"] },
  { ingredientId: "simmondsia_chinensis", functions: ["émollient", "agent d'entretien de la peau", "conditionneur capillaire"] },
  { ingredientId: "helianthus_annuus", functions: ["émollient", "agent d'entretien de la peau"] },
  { ingredientId: "argania_spinosa", functions: ["émollient", "agent d'entretien de la peau", "conditionneur capillaire"] },
  { ingredientId: "persea_gratissima", functions: ["émollient", "agent d'entretien de la peau"] },
  { ingredientId: "ricinus_communis", functions: ["émollient", "conditionneur capillaire", "agent de contrôle de la viscosité", "filmogène", "parfum"] },
  { ingredientId: "coconut-oil", functions: ["émollient", "agent d'entretien de la peau", "conditionneur capillaire"] },
  { ingredientId: "camelina_sativa", functions: ["émollient", "agent d'entretien de la peau"] },
  { ingredientId: "aloe_barbadensis", functions: ["agent d'entretien de la peau", "apaisant cutané", "humectant"] },
  { ingredientId: "althaea_officinalis", functions: ["agent d'entretien de la peau", "apaisant cutané"] },
  { ingredientId: "avena_sativa", functions: ["agent d'entretien de la peau", "apaisant cutané", "absorbant"] },
  { ingredientId: "theobroma_cacao", functions: ["émollient", "agent d'entretien de la peau", "parfum"] },
  { ingredientId: "hydrolyzed_rice", functions: ["agent d'entretien de la peau", "antistatique", "conditionneur capillaire", "filmogène"] },

  // -------------------------------------------- tensioactifs / nettoyants
  { ingredientId: "sodium-lauryl-sulfate", functions: ["tensioactif", "nettoyant", "émulsifiant"] },
  { ingredientId: "sodium-laureth-sulfate", functions: ["tensioactif", "nettoyant", "émulsifiant"] },
  { ingredientId: "coco-glucoside", functions: ["tensioactif", "nettoyant", "émulsifiant", "stabilisateur d'émulsion"] },
  { ingredientId: "decyl-glucoside", functions: ["tensioactif", "nettoyant", "émulsifiant"] },
  { ingredientId: "lauryl-glucoside", functions: ["tensioactif", "nettoyant", "émulsifiant", "stabilisateur d'émulsion"] },
  { ingredientId: "cocamidopropyl_betaine", functions: ["tensioactif", "nettoyant", "antistatique", "conditionneur capillaire", "stabilisateur d'émulsion"] },
  { ingredientId: "sodium-xylenesulfonate", functions: ["tensioactif", "hydrotrope", "agent de contrôle de la viscosité"] },

  // -------------------------------------------- conditionneurs capillaires / silicones
  { ingredientId: "behentrimonium-chloride", functions: ["antistatique", "conditionneur capillaire", "émulsifiant"] },
  { ingredientId: "cetrimonium-chloride", functions: ["antistatique", "conditionneur capillaire", "conservateur", "émulsifiant"] },
  { ingredientId: "stearamidopropyl-dimethylamine", functions: ["antistatique", "conditionneur capillaire", "émulsifiant"] },
  { ingredientId: "cyclopentasiloxane", functions: ["émollient", "conditionneur capillaire", "solvant", "agent d'entretien de la peau"] },
  { ingredientId: "dimethiconol", functions: ["émollient", "conditionneur capillaire", "filmogène", "agent d'entretien de la peau"] },

  // -------------------------------------------- conservateurs (Annexe V) + autres fonctions
  {
    ingredientId: "phenoxyethanol",
    functions: ["conservateur"],
    restriction: { annex: "V", status: "restricted", limitPercent: 1.0, note: "Conservateur listé à l'Annexe V. Concentration maximale 1,0 % dans les produits finis.", entry: "V/29" },
  },
  {
    ingredientId: "benzyl-alcohol",
    functions: ["conservateur", "solvant", "parfum", "agent masquant"],
    restriction: { annex: "V", status: "restricted", limitPercent: 1.0, note: "Conservateur (Annexe V) : max 1,0 % comme conservateur ; aussi utilisé comme parfum/solvant.", entry: "V/34" },
  },
  {
    ingredientId: "benzoic-acid",
    functions: ["conservateur"],
    restriction: { annex: "V", status: "restricted", limitPercent: 0.5, note: "Conservateur (Annexe V, entrée 1) : max 0,5 % (exprimé en acide) selon le type de produit.", entry: "V/1" },
  },
  {
    ingredientId: "sodium-benzoate",
    functions: ["conservateur"],
    restriction: { annex: "V", status: "restricted", limitPercent: 0.5, note: "Sel de l'acide benzoïque (Annexe V/1) : compté en acide, mêmes limites que l'acide benzoïque.", entry: "V/1" },
  },
  { ingredientId: "e211", functions: ["conservateur"] }, // benzoate de sodium (E211)
  {
    ingredientId: "potassium-sorbate",
    functions: ["conservateur"],
    restriction: { annex: "V", status: "restricted", limitPercent: 0.6, note: "Conservateur (Annexe V/4, acide sorbique) : max 0,6 % exprimé en acide.", entry: "V/4" },
  },
  {
    ingredientId: "dehydroacetic-acid",
    functions: ["conservateur"],
    restriction: { annex: "V", status: "restricted", limitPercent: 0.6, note: "Conservateur (Annexe V/13) : max 0,6 % exprimé en acide déhydroacétique.", entry: "V/13" },
  },
  {
    ingredientId: "salicylic-acid",
    functions: ["conservateur", "agent d'entretien de la peau", "kératolytique", "agent masquant"],
    // Restriction déjà en base (Annexe III, usage actif) ; conservateur V/3.
  },
  {
    ingredientId: "sodium-salicylate",
    functions: ["conservateur", "agent masquant", "agent d'entretien de la peau"],
    restriction: { annex: "V", status: "restricted", limitPercent: 0.5, note: "Sel de l'acide salicylique (Annexe V/3) : mêmes limites en acide.", entry: "V/3" },
  },
  {
    ingredientId: "methylisothiazolinone",
    functions: ["conservateur"],
    // Limite exacte 0,0015 % (15 ppm), sous la précision de limit_percent
    // NUMERIC(6,3) : on laisse NULL et porte la valeur exacte dans la note.
    restriction: { annex: "V", status: "restricted", limitPercent: null, note: "Conservateur Annexe V/57 : max 0,0015 % (15 ppm) en produits rincés ; interdit dans les produits non rincés.", entry: "V/57" },
  },
  {
    ingredientId: "methylchloroisothiazolinone",
    functions: ["conservateur"],
    restriction: { annex: "V", status: "restricted", limitPercent: null, note: "Mélange CMIT/MIT (Annexe V/39) : max 0,0015 % (15 ppm) en produits rincés (rapport 3:1) ; interdit en non rincé.", entry: "V/39" },
  },
  {
    ingredientId: "piroctone-olamine",
    functions: ["conservateur", "antipelliculaire"],
    restriction: { annex: "V", status: "restricted", limitPercent: 1.0, note: "Conservateur Annexe V/41 (max 1,0 % rincé / 0,5 % non rincé) ; aussi antipelliculaire (Annexe III).", entry: "V/41" },
  },
  {
    ingredientId: "magnesium-nitrate",
    functions: [],
    restriction: { annex: "V", status: "restricted", limitPercent: null, note: "Stabilisant du système conservateur chlorure de magnésium/nitrate de magnésium associé au MIT (Annexe V).", entry: "V/9" },
  },
  { ingredientId: "caprylyl-glycol", functions: ["humectant", "agent d'entretien de la peau", "émollient"] },
  { ingredientId: "ethylhexylglycerin", functions: ["conditionneur capillaire", "agent d'entretien de la peau", "déodorant"] },

  // -------------------------------------------- chélateurs / tampons / pH
  { ingredientId: "disodium-edta", functions: ["chélateur", "séquestrant"] },
  { ingredientId: "tetrasodium-edta", functions: ["chélateur", "séquestrant"] },
  { ingredientId: "disodium-etidronate", functions: ["chélateur", "séquestrant"] },
  { ingredientId: "tetrasodium-glutamate-diacetate", functions: ["chélateur", "séquestrant"] },
  { ingredientId: "citric-acid", functions: ["ajusteur de pH", "chélateur", "tampon", "parfum"] },
  { ingredientId: "e330", functions: ["ajusteur de pH", "chélateur", "tampon"] }, // acide citrique (E330)
  { ingredientId: "sodium-citrate", functions: ["tampon", "ajusteur de pH", "chélateur"] },
  { ingredientId: "lactic-acid", functions: ["humectant", "agent d'entretien de la peau", "ajusteur de pH", "kératolytique"] },
  { ingredientId: "sodium-hydroxide", functions: ["ajusteur de pH", "denaturant"] },
  { ingredientId: "histidine", functions: ["agent d'entretien de la peau", "antistatique", "chélateur"] },
  { ingredientId: "arginine", functions: ["agent d'entretien de la peau", "ajusteur de pH", "antistatique", "conditionneur capillaire"] },

  // -------------------------------------------- sels / minéraux / colorants / filtres UV
  { ingredientId: "sodium-chloride", functions: ["agent de contrôle de la viscosité"] },
  { ingredientId: "magnesium-chloride", functions: ["agent de contrôle de la viscosité", "agent d'entretien de la peau"] },
  { ingredientId: "mica", functions: ["opacifiant", "abrasif", "liant"] },
  { ingredientId: "ci-77891", functions: ["colorant", "opacifiant"] }, // dioxyde de titane (CI 77891)
  { ingredientId: "ci-19140", functions: ["colorant"] }, // tartrazine
  { ingredientId: "ci-42090", functions: ["colorant"] }, // bleu brillant FCF
  { ingredientId: "ci-17200", functions: ["colorant"] }, // rouge
  {
    ingredientId: "titanium-dioxide",
    functions: ["filtre UV", "colorant", "opacifiant"],
    restriction: { annex: "VI", status: "allowed", limitPercent: 25.0, note: "Filtre UV listé (Annexe VI/27) et colorant (Annexe IV/142) ; la forme nanoparticulaire est soumise à conditions et étiquetage (nano).", entry: "VI/27" },
  },
  {
    ingredientId: "zinc-oxide",
    functions: ["filtre UV", "protecteur cutané"],
    restriction: { annex: "VI", status: "allowed", limitPercent: 25.0, note: "Filtre UV listé (Annexe VI/26) ; la forme nanoparticulaire est soumise à conditions et étiquetage (nano).", entry: "VI/26" },
  },
  { ingredientId: "zinc_pca", functions: ["humectant", "agent d'entretien de la peau", "astringent"] },

  // -------------------------------------------- actifs soin
  { ingredientId: "niacinamide", functions: ["agent d'entretien de la peau"] },
  { ingredientId: "panthenol", functions: ["agent d'entretien de la peau", "antistatique", "conditionneur capillaire"] },
  { ingredientId: "allantoin", functions: ["agent d'entretien de la peau", "apaisant cutané", "protecteur cutané"] },
  { ingredientId: "sodium-pca", functions: ["humectant", "agent d'entretien de la peau", "antistatique", "conditionneur capillaire"] },
  { ingredientId: "ascorbic-acid", functions: ["antioxydant", "agent d'entretien de la peau", "ajusteur de pH"] },
  { ingredientId: "tocopherol", functions: ["antioxydant", "agent d'entretien de la peau"] },
  { ingredientId: "tocopheryl-acetate", functions: ["antioxydant", "agent d'entretien de la peau"] },
  { ingredientId: "vitamin-e", functions: ["antioxydant", "agent d'entretien de la peau"] },
  { ingredientId: "ceramide-np", functions: ["agent d'entretien de la peau", "conditionneur capillaire"] },
  { ingredientId: "tranexamic_acid", functions: ["agent d'entretien de la peau", "astringent"] },
  { ingredientId: "menthol", functions: ["parfum", "agent masquant", "denaturant", "refroidissant"] },
  { ingredientId: "mentha_piperita", functions: ["parfum", "agent masquant", "agent d'entretien de la peau"] },
  { ingredientId: "melaleuca_alternifolia", functions: ["parfum", "agent masquant", "agent d'entretien de la peau"] },
  { ingredientId: "rosmarinus_officinalis", functions: ["parfum", "antioxydant", "tonique", "agent d'entretien de la peau"] },
  { ingredientId: "hydroxyethylcellulose", functions: ["agent de contrôle de la viscosité", "stabilisateur d'émulsion", "liant", "filmogène", "émulsifiant"] },
  { ingredientId: "e415", functions: ["agent de contrôle de la viscosité", "stabilisateur d'émulsion", "liant", "filmogène"] }, // gomme xanthane (E415)

  // -------------------------------------------- parfums / allergènes à déclarer
  { ingredientId: "parfum", functions: ["parfum", "agent masquant"] },
  { ingredientId: "linalool", functions: ["parfum"], regulatedAllergen: true },
  { ingredientId: "limonene", functions: ["parfum", "solvant"], regulatedAllergen: true },
  { ingredientId: "citronellol", functions: ["parfum"], regulatedAllergen: true },
  { ingredientId: "geraniol", functions: ["parfum"], regulatedAllergen: true },
  { ingredientId: "citral", functions: ["parfum"], regulatedAllergen: true },
  { ingredientId: "coumarin", functions: ["parfum", "agent masquant"], regulatedAllergen: true },
  { ingredientId: "benzyl-benzoate", functions: ["solvant", "parfum"], regulatedAllergen: true },
  { ingredientId: "benzyl-salicylate", functions: ["filtre UV", "parfum", "agent masquant"], regulatedAllergen: true },
  { ingredientId: "hexyl-cinnamal", functions: ["parfum"], regulatedAllergen: true },
  { ingredientId: "alpha-isomethyl-ionone", functions: ["parfum"], regulatedAllergen: true },
  { ingredientId: "butylphenyl-methylpropional", functions: ["parfum"], regulatedAllergen: true },
  { ingredientId: "hydroxycitronellal", functions: ["parfum", "agent masquant"], regulatedAllergen: true },
  { ingredientId: "linalyl-acetate", functions: ["parfum", "agent masquant"], regulatedAllergen: false },

  // -------------------------------------------- interdits / restreints notoires (déjà en base pour la plupart)
  {
    ingredientId: "hydroquinone",
    functions: [],
    restriction: { annex: "II", status: "prohibited", limitPercent: null, note: "Interdit (Annexe II) dans les cosmétiques, à l'exception des systèmes de faux-ongles sous stricte condition (Annexe III).", entry: "II/1338" },
  },
  {
    ingredientId: "retinol",
    functions: ["agent d'entretien de la peau"],
    restriction: { annex: "III", status: "restricted", limitPercent: 0.3, note: "Substances à activité vitamine A restreintes (Règl. délégué (UE) 2022/2125) : max 0,3 % RE visage, 0,05 % RE corps.", entry: "III" },
  },
];

/** Recherche des faits CosIng d'un ingrédient par id. */
export function cosingFactsFor(ingredientId: string): CosingIngredientFacts | undefined {
  return COSING_FACTS.find((f) => f.ingredientId === ingredientId);
}
