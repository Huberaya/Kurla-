/**
 * VOCABULAIRES CONTRÔLÉS — référence miroir de la migration
 * `supabase/migrations/20260847000000_kurla_taxonomy_terms.sql`.

 * Ce fichier est GÉNÉRÉ depuis la migration : ne pas éditer à la main. Le banc
 * `tests/kurla_taxonomy.test.ts` relit le SQL et fait tomber la suite si les
 * deux divergent — c'est ce qui empêche le vocabulaire du code de dériver de
 * celui de la base.
 */

export interface TaxonomyReferenceTerm {
  id: string;
  taxonomy: string;
  code: string;
  labelFr: string;
  labelEn: string;
  synonyms: string[];
  sortOrder: number;
}

export const TAXONOMY_REFERENCE: ReadonlyArray<{ id: string; label: string; description: string }> = [
  { id: "need", label: "Besoins", description: "Le besoin que le produit doit couvrir. Clé du moteur de recommandation." },
  { id: "texture", label: "Textures", description: "Classification de la fibre capillaire." },
  { id: "routine_step", label: "Étapes", description: "Position dans la routine. Détermine les doublons et les trous." },
  { id: "market", label: "Marchés", description: "Juridictions de commercialisation, base du filtrage réglementaire." },
  { id: "tone_depth", label: "Profondeurs de ton", description: "Profondeur de mélanine, sans jugement de valeur." },
  { id: "skin_type", label: "Types de peau", description: "Typologie de peau pour le diagnostic et les filtres peau." },
  { id: "skin_concern", label: "Préoccupations peau", description: "Préoccupations cutanées pour le moteur de reco peau." },
  { id: "skin_objective", label: "Objectifs peau", description: "Objectifs utilisateur pour la routine peau." },
] as const;

export const TAXONOMY_TERMS: readonly TaxonomyReferenceTerm[] = [
  { id: "need_hydrater_cheveux", taxonomy: "need", code: "hydrater_cheveux", labelFr: "Hydrater les cheveux", labelEn: "Moisturise hair", synonyms: ["sec", "sèche", "déshydraté", "moisture", "dry"], sortOrder: 1 },
  { id: "need_reduire_casse", taxonomy: "need", code: "reduire_casse", labelFr: "Réduire la casse", labelEn: "Reduce breakage", synonyms: ["casse", "fragile", "breakage"], sortOrder: 2 },
  { id: "need_definir_boucles", taxonomy: "need", code: "definir_boucles", labelFr: "Définir les boucles", labelEn: "Define curls", synonyms: ["boucles", "définition", "curl"], sortOrder: 3 },
  { id: "need_reduire_frisottis", taxonomy: "need", code: "reduire_frisottis", labelFr: "Réduire les frisottis", labelEn: "Reduce frizz", synonyms: ["frisottis", "frizz"], sortOrder: 4 },
  { id: "need_cuir_chevelu", taxonomy: "need", code: "cuir_chevelu", labelFr: "Soin du cuir chevelu", labelEn: "Scalp care", synonyms: ["cuir chevelu", "démangeaison", "pellicule", "scalp"], sortOrder: 5 },
  { id: "need_apaiser_cuir_chevelu", taxonomy: "need", code: "apaiser_cuir_chevelu", labelFr: "Apaiser le cuir chevelu", labelEn: "Soothe scalp", synonyms: ["apaiser", "irritation", "sensitive scalp"], sortOrder: 6 },
  { id: "need_proteger_chaleur", taxonomy: "need", code: "proteger_chaleur", labelFr: "Protéger de la chaleur", labelEn: "Heat protection", synonyms: ["thermoprotecteur", "heat"], sortOrder: 7 },
  { id: "need_proteger_nuit", taxonomy: "need", code: "proteger_nuit", labelFr: "Protéger la nuit", labelEn: "Night protection", synonyms: ["bonnet", "satin", "night"], sortOrder: 8 },
  { id: "need_entretenir_tresses", taxonomy: "need", code: "entretenir_tresses", labelFr: "Entretenir les tresses", labelEn: "Maintain braids", synonyms: ["tresses", "braids", "knotless"], sortOrder: 9 },
  { id: "need_entretenir_locks", taxonomy: "need", code: "entretenir_locks", labelFr: "Entretenir les locks", labelEn: "Maintain locs", synonyms: ["locks", "dreadlocks", "locs"], sortOrder: 10 },
  { id: "need_entretenir_perruque", taxonomy: "need", code: "entretenir_perruque", labelFr: "Entretenir la perruque", labelEn: "Maintain wig", synonyms: ["perruque", "wig", "lace"], sortOrder: 11 },
  { id: "need_demeler_cheveux", taxonomy: "need", code: "demeler_cheveux", labelFr: "Démêler les cheveux", labelEn: "Detangle hair", synonyms: ["démêler", "demeler", "démêlage", "nœud", "detangle"], sortOrder: 12 },
  { id: "need_barbe", taxonomy: "need", code: "barbe", labelFr: "Barbe & grooming homme", labelEn: "Beard & grooming", synonyms: ["barbe", "grooming", "homme", "beard", "waves", "durag"], sortOrder: 13 },
  { id: "need_hydrater_peau", taxonomy: "need", code: "hydrater_peau", labelFr: "Hydrater la peau", labelEn: "Moisturise skin", synonyms: ["hydratation", "peau sèche"], sortOrder: 14 },
  { id: "need_peau_sensible", taxonomy: "need", code: "peau_sensible", labelFr: "Peau sensible", labelEn: "Sensitive skin", synonyms: ["sensible", "réactive", "sensitive"], sortOrder: 15 },
  { id: "need_imperfections_acne", taxonomy: "need", code: "imperfections_acne", labelFr: "Imperfections et acné", labelEn: "Blemishes and acne", synonyms: ["acné", "bouton", "imperfection"], sortOrder: 16 },
  { id: "need_taches_hyperpigmentation", taxonomy: "need", code: "taches_hyperpigmentation", labelFr: "Taches et hyperpigmentation", labelEn: "Dark spots", synonyms: ["taches", "hyperpigmentation", "mélasma"], sortOrder: 17 },
  { id: "need_protection_solaire", taxonomy: "need", code: "protection_solaire", labelFr: "Protection solaire", labelEn: "Sun protection", synonyms: ["spf", "soleil", "uv"], sortOrder: 18 },
  { id: "need_barriere_cutanee", taxonomy: "need", code: "barriere_cutanee", labelFr: "Barrière cutanée", labelEn: "Skin barrier", synonyms: ["barrière", "barriere", "tiraillement", "réactivité", "reactivite"], sortOrder: 19 },
  { id: "need_eclat_teint_terne", taxonomy: "need", code: "eclat_teint_terne", labelFr: "Éclat du teint", labelEn: "Radiance", synonyms: ["éclat", "eclat", "teint terne", "terne", "glow"], sortOrder: 20 },
  { id: "need_maturite_rides", taxonomy: "need", code: "maturite_rides", labelFr: "Maturité et rides", labelEn: "Maturity and wrinkles", synonyms: ["rides", "maturité", "maturite", "fermeté", "fermete"], sortOrder: 21 },
  { id: "texture_3a", taxonomy: "texture", code: "3A", labelFr: "Boucles larges 3A", labelEn: "Type 3A loose curls", synonyms: [], sortOrder: 1 },
  { id: "texture_3b", taxonomy: "texture", code: "3B", labelFr: "Boucles 3B", labelEn: "Type 3B curls", synonyms: [], sortOrder: 2 },
  { id: "texture_3c", taxonomy: "texture", code: "3C", labelFr: "Boucles serrées 3C", labelEn: "Type 3C tight curls", synonyms: [], sortOrder: 3 },
  { id: "texture_4a", taxonomy: "texture", code: "4A", labelFr: "Crépus 4A", labelEn: "Type 4A coily", synonyms: [], sortOrder: 4 },
  { id: "texture_4b", taxonomy: "texture", code: "4B", labelFr: "Crépus 4B", labelEn: "Type 4B coily", synonyms: [], sortOrder: 5 },
  { id: "texture_4c", taxonomy: "texture", code: "4C", labelFr: "Crépus 4C", labelEn: "Type 4C coily", synonyms: [], sortOrder: 6 },
  { id: "step_cleanse", taxonomy: "routine_step", code: "cleanse", labelFr: "Shampooing", labelEn: "Cleanse", synonyms: [], sortOrder: 1 },
  { id: "step_condition", taxonomy: "routine_step", code: "condition", labelFr: "Après-shampooing", labelEn: "Condition", synonyms: [], sortOrder: 2 },
  { id: "step_deep_condition", taxonomy: "routine_step", code: "deep_condition", labelFr: "Masque / soin profond", labelEn: "Deep condition", synonyms: [], sortOrder: 3 },
  { id: "step_protein_treatment", taxonomy: "routine_step", code: "protein_treatment", labelFr: "Soin protéiné", labelEn: "Protein treatment", synonyms: [], sortOrder: 4 },
  { id: "step_leave_in", taxonomy: "routine_step", code: "leave_in", labelFr: "Leave-in", labelEn: "Leave-in", synonyms: [], sortOrder: 5 },
  { id: "step_seal_oil", taxonomy: "routine_step", code: "seal_oil", labelFr: "Scellement à l’huile", labelEn: "Seal with oil", synonyms: [], sortOrder: 6 },
  { id: "step_styling_definer", taxonomy: "routine_step", code: "styling_definer", labelFr: "Définissant / coiffage", labelEn: "Styling definer", synonyms: [], sortOrder: 7 },
  { id: "step_scalp_treatment", taxonomy: "routine_step", code: "scalp_treatment", labelFr: "Soin du cuir chevelu", labelEn: "Scalp treatment", synonyms: [], sortOrder: 8 },
  { id: "step_skin_cleanser", taxonomy: "routine_step", code: "skin_cleanser", labelFr: "Nettoyant visage", labelEn: "Skin cleanser", synonyms: [], sortOrder: 9 },
  { id: "step_skin_treatment", taxonomy: "routine_step", code: "skin_treatment", labelFr: "Soin visage", labelEn: "Skin treatment", synonyms: [], sortOrder: 10 },
  { id: "step_skin_moisturizer", taxonomy: "routine_step", code: "skin_moisturizer", labelFr: "Hydratant visage", labelEn: "Skin moisturizer", synonyms: [], sortOrder: 11 },
  { id: "step_skin_spf", taxonomy: "routine_step", code: "skin_spf", labelFr: "Protection solaire visage", labelEn: "Skin SPF", synonyms: [], sortOrder: 12 },
  { id: "market_fr", taxonomy: "market", code: "FR", labelFr: "France", labelEn: "France", synonyms: [], sortOrder: 1 },
  { id: "market_be", taxonomy: "market", code: "BE", labelFr: "Belgique", labelEn: "Belgium", synonyms: [], sortOrder: 2 },
  { id: "market_ch", taxonomy: "market", code: "CH", labelFr: "Suisse", labelEn: "Switzerland", synonyms: [], sortOrder: 3 },
  { id: "market_ca", taxonomy: "market", code: "CA", labelFr: "Canada", labelEn: "Canada", synonyms: [], sortOrder: 4 },
  { id: "market_ci", taxonomy: "market", code: "CI", labelFr: "Côte d’Ivoire", labelEn: "Ivory Coast", synonyms: [], sortOrder: 5 },
  { id: "market_sn", taxonomy: "market", code: "SN", labelFr: "Sénégal", labelEn: "Senegal", synonyms: [], sortOrder: 6 },
  { id: "market_dom", taxonomy: "market", code: "DOM", labelFr: "Outre-mer français", labelEn: "French overseas territories", synonyms: [], sortOrder: 7 },
  { id: "market_afr", taxonomy: "market", code: "AFR", labelFr: "Afrique subsaharienne", labelEn: "Sub-Saharan Africa", synonyms: [], sortOrder: 8 },
  { id: "market_int", taxonomy: "market", code: "INT", labelFr: "International", labelEn: "International", synonyms: [], sortOrder: 9 },
  { id: "tone_fair", taxonomy: "tone_depth", code: "fair", labelFr: "Ton clair", labelEn: "Fair tone", synonyms: [], sortOrder: 1 },
  { id: "tone_light", taxonomy: "tone_depth", code: "light", labelFr: "Ton intermédiaire clair", labelEn: "Light tone", synonyms: [], sortOrder: 2 },
  { id: "tone_medium", taxonomy: "tone_depth", code: "medium", labelFr: "Ton intermédiaire", labelEn: "Medium tone", synonyms: [], sortOrder: 3 },
  { id: "tone_tan", taxonomy: "tone_depth", code: "tan", labelFr: "Ton mat", labelEn: "Tan tone", synonyms: [], sortOrder: 4 },
  { id: "tone_deep", taxonomy: "tone_depth", code: "deep", labelFr: "Ton profond", labelEn: "Deep tone", synonyms: [], sortOrder: 5 },
  { id: "tone_rich", taxonomy: "tone_depth", code: "rich", labelFr: "Ton très profond", labelEn: "Rich tone", synonyms: [], sortOrder: 6 },
  { id: "tone_unknown", taxonomy: "tone_depth", code: "unknown", labelFr: "Non déclaré", labelEn: "Not declared", synonyms: [], sortOrder: 99 },
  // --- Skin types (8) ---
  { id: "skin_type_normale", taxonomy: "skin_type", code: "normale", labelFr: "Normale", labelEn: "Normal", synonyms: ["normale", "equilibree"], sortOrder: 1 },
  { id: "skin_type_seche", taxonomy: "skin_type", code: "seche", labelFr: "Sèche", labelEn: "Dry", synonyms: ["seche", "tire", "rugueuse"], sortOrder: 2 },
  { id: "skin_type_tres_seche", taxonomy: "skin_type", code: "tres_seche", labelFr: "Très sèche", labelEn: "Very dry", synonyms: ["tres seche", "very dry", "squameuse"], sortOrder: 3 },
  { id: "skin_type_grasse", taxonomy: "skin_type", code: "grasse", labelFr: "Grasse", labelEn: "Oily", synonyms: ["grasse", "brillance", "sebum", "oily"], sortOrder: 4 },
  { id: "skin_type_mixte", taxonomy: "skin_type", code: "mixte", labelFr: "Mixte", labelEn: "Combination", synonyms: ["mixte", "zone T", "combination"], sortOrder: 5 },
  { id: "skin_type_sensible", taxonomy: "skin_type", code: "sensible", labelFr: "Sensible", labelEn: "Sensitive", synonyms: ["sensible", "reactive", "rougeur"], sortOrder: 6 },
  { id: "skin_type_deshydratee", taxonomy: "skin_type", code: "deshydratee", labelFr: "Déshydratée", labelEn: "Dehydrated", synonyms: ["deshydratee", "manque eau", "dehydrated"], sortOrder: 7 },
  { id: "skin_type_mature", taxonomy: "skin_type", code: "mature", labelFr: "Mature", labelEn: "Mature", synonyms: ["mature", "rides", "agee"], sortOrder: 8 },
  // --- Skin concerns (17) ---
  { id: "skin_concern_secheresse", taxonomy: "skin_concern", code: "secheresse", labelFr: "Sécheresse / tiraillements", labelEn: "Dryness", synonyms: ["secheresse", "tiraillement", "sec"], sortOrder: 1 },
  { id: "skin_concern_deshydratation", taxonomy: "skin_concern", code: "deshydratation", labelFr: "Déshydratation", labelEn: "Dehydration", synonyms: ["deshydratation", "manque eau"], sortOrder: 2 },
  { id: "skin_concern_teint_terne", taxonomy: "skin_concern", code: "teint_terne", labelFr: "Teint terne / manque d'éclat", labelEn: "Dullness", synonyms: ["terne", "eclat", "lumineux"], sortOrder: 3 },
  { id: "skin_concern_taches", taxonomy: "skin_concern", code: "taches", labelFr: "Taches / hyperpigmentation", labelEn: "Dark spots", synonyms: ["tache", "hyperpigmentation", "HPI", "melasma"], sortOrder: 4 },
  { id: "skin_concern_rougeurs", taxonomy: "skin_concern", code: "rougeurs", labelFr: "Rougeurs / irritations", labelEn: "Redness", synonyms: ["rougeur", "irritation", "sensible"], sortOrder: 5 },
  { id: "skin_concern_imperfections", taxonomy: "skin_concern", code: "imperfections", labelFr: "Imperfections / boutons", labelEn: "Blemishes", synonyms: ["imperfection", "bouton", "acne", "comedo"], sortOrder: 6 },
  { id: "skin_concern_points_noirs", taxonomy: "skin_concern", code: "points_noirs", labelFr: "Points noirs / pores dilatés", labelEn: "Blackheads", synonyms: ["point noir", "pore", "comedo"], sortOrder: 7 },
  { id: "skin_concern_grain_irregulier", taxonomy: "skin_concern", code: "grain_irregulier", labelFr: "Grain de peau irrégulier", labelEn: "Uneven texture", synonyms: ["grain", "texture", "rugueux"], sortOrder: 8 },
  { id: "skin_concern_cicatrices", taxonomy: "skin_concern", code: "cicatrices", labelFr: "Cicatrices post-acné", labelEn: "Scars", synonyms: ["cicatrice", "marque", "acne scar"], sortOrder: 9 },
  { id: "skin_concern_rides", taxonomy: "skin_concern", code: "rides", labelFr: "Rides / ridules", labelEn: "Wrinkles", synonyms: ["ride", "ridule", "age"], sortOrder: 10 },
  { id: "skin_concern_fermete", taxonomy: "skin_concern", code: "fermete", labelFr: "Perte de fermeté", labelEn: "Loss of firmness", synonyms: ["fermete", "relachement", "firmness"], sortOrder: 11 },
  { id: "skin_concern_cernes", taxonomy: "skin_concern", code: "cernes", labelFr: "Cernes / poches", labelEn: "Dark circles", synonyms: ["cerne", "poche", "eye"], sortOrder: 12 },
  { id: "skin_concern_levres", taxonomy: "skin_concern", code: "levres_seches", labelFr: "Lèvres sèches", labelEn: "Dry lips", synonyms: ["levre", "gercee", "lips"], sortOrder: 13 },
  { id: "skin_concern_corps", taxonomy: "skin_concern", code: "peau_corps", labelFr: "Peau du corps", labelEn: "Body skin", synonyms: ["corps", "keratose", "body"], sortOrder: 14 },
  { id: "skin_concern_spf", taxonomy: "skin_concern", code: "protection_solaire", labelFr: "Protection solaire", labelEn: "Sun protection", synonyms: ["spf", "solaire", "uv"], sortOrder: 15 },
  { id: "skin_concern_sensibilite", taxonomy: "skin_concern", code: "sensibilite", labelFr: "Sensibilité / réactivité", labelEn: "Sensitivity", synonyms: ["sensible", "reactive"], sortOrder: 16 },
  { id: "skin_concern_teint_non_uniforme", taxonomy: "skin_concern", code: "teint_non_uniforme", labelFr: "Teint non uniforme", labelEn: "Uneven tone", synonyms: ["uniforme", "heterogene", "teint"], sortOrder: 17 },
  // --- Skin objectives (12) ---
  { id: "skin_objective_hydrater", taxonomy: "skin_objective", code: "hydrater", labelFr: "Hydrater en profondeur", labelEn: "Deep hydration", synonyms: ["hydrater", "nourrir"], sortOrder: 1 },
  { id: "skin_objective_eclat", taxonomy: "skin_objective", code: "eclat", labelFr: "Retrouver de l'éclat", labelEn: "Glow", synonyms: ["eclat", "lumineux", "radiance"], sortOrder: 2 },
  { id: "skin_objective_uniformiser", taxonomy: "skin_objective", code: "uniformiser", labelFr: "Uniformiser le teint", labelEn: "Even tone", synonyms: ["uniformiser", "tache", "hyperpigmentation"], sortOrder: 3 },
  { id: "skin_objective_attenuer_taches", taxonomy: "skin_objective", code: "attenuer_taches", labelFr: "Atténuer les taches", labelEn: "Fade spots", synonyms: ["tache", "hyperpigmentation"], sortOrder: 4 },
  { id: "skin_objective_apaiser", taxonomy: "skin_objective", code: "apaiser", labelFr: "Apaiser la peau", labelEn: "Soothe", synonyms: ["apaiser", "calmer", "rougeur"], sortOrder: 5 },
  { id: "skin_objective_imperfections", taxonomy: "skin_objective", code: "reduire_imperfections", labelFr: "Réduire les imperfections", labelEn: "Clear blemishes", synonyms: ["imperfection", "bouton"], sortOrder: 6 },
  { id: "skin_objective_grain", taxonomy: "skin_objective", code: "affiner_grain", labelFr: "Affiner le grain de peau", labelEn: "Refine texture", synonyms: ["grain", "texture", "pore"], sortOrder: 7 },
  { id: "skin_objective_barriere", taxonomy: "skin_objective", code: "renforcer_barriere", labelFr: "Renforcer la barrière", labelEn: "Strengthen barrier", synonyms: ["barriere", "ceramide"], sortOrder: 8 },
  { id: "skin_objective_spf", taxonomy: "skin_objective", code: "proteger_spf", labelFr: "Protéger du soleil/pollution", labelEn: "Protect", synonyms: ["spf", "pollution", "uv"], sortOrder: 9 },
  { id: "skin_objective_anti_age", taxonomy: "skin_objective", code: "prevenir_age", labelFr: "Prévenir les signes de l'âge", labelEn: "Anti-aging", synonyms: ["age", "ride", "anti-age"], sortOrder: 10 },
  { id: "skin_objective_simplifier", taxonomy: "skin_objective", code: "simplifier", labelFr: "Simplifier la routine", labelEn: "Simplify", synonyms: ["simple", "minimaliste"], sortOrder: 11 },
  { id: "skin_objective_carnation", taxonomy: "skin_objective", code: "carnation", labelFr: "Produits adaptés à ma carnation", labelEn: "Shade match", synonyms: ["carnation", "teinte", "melanine"], sortOrder: 12 },
] as const;

/**
 * Champs produit rattachés à une taxonomie. Vit ici plutôt que dans la couche
 * store : `bindDomain` n'accepte que des fonctions.
 */
export const PRODUCT_VOCABULARY_FIELDS: ReadonlyArray<{ field: string; taxonomy: string; label: string }> = [
  { field: 'concerns', taxonomy: 'need', label: 'besoins' },
  { field: 'needs', taxonomy: 'need', label: 'besoins' },
  { field: 'hairTypes', taxonomy: 'texture', label: 'textures capillaires' },
  { field: 'skinTypes', taxonomy: 'skin_type', label: 'types de peau' },
  { field: 'skinConcerns', taxonomy: 'skin_concern', label: 'préoccupations peau' },
  { field: 'skinObjectives', taxonomy: 'skin_objective', label: 'objectifs peau' },
  { field: 'routineSteps', taxonomy: 'routine_step', label: 'étapes de routine' },
  { field: 'countryAvailability', taxonomy: 'market', label: 'marchés' },
  { field: 'toneDepths', taxonomy: 'tone_depth', label: 'profondeurs de ton' }
];
