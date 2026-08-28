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
  { id: "need_hydrater_peau", taxonomy: "need", code: "hydrater_peau", labelFr: "Hydrater la peau", labelEn: "Moisturise skin", synonyms: ["hydratation", "peau sèche"], sortOrder: 12 },
  { id: "need_peau_sensible", taxonomy: "need", code: "peau_sensible", labelFr: "Peau sensible", labelEn: "Sensitive skin", synonyms: ["sensible", "réactive", "sensitive"], sortOrder: 13 },
  { id: "need_imperfections_acne", taxonomy: "need", code: "imperfections_acne", labelFr: "Imperfections et acné", labelEn: "Blemishes and acne", synonyms: ["acné", "bouton", "imperfection"], sortOrder: 14 },
  { id: "need_taches_hyperpigmentation", taxonomy: "need", code: "taches_hyperpigmentation", labelFr: "Taches et hyperpigmentation", labelEn: "Dark spots", synonyms: ["taches", "hyperpigmentation", "mélasma"], sortOrder: 15 },
  { id: "need_protection_solaire", taxonomy: "need", code: "protection_solaire", labelFr: "Protection solaire", labelEn: "Sun protection", synonyms: ["spf", "soleil", "uv"], sortOrder: 16 },
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
] as const;

/**
 * Champs produit rattachés à une taxonomie. Vit ici plutôt que dans la couche
 * store : `bindDomain` n'accepte que des fonctions.
 */
export const PRODUCT_VOCABULARY_FIELDS: ReadonlyArray<{ field: string; taxonomy: string; label: string }> = [
  { field: 'concerns', taxonomy: 'need', label: 'besoins' },
  { field: 'needs', taxonomy: 'need', label: 'besoins' },
  { field: 'hairTypes', taxonomy: 'texture', label: 'textures capillaires' },
  { field: 'routineSteps', taxonomy: 'routine_step', label: 'étapes de routine' },
  { field: 'countryAvailability', taxonomy: 'market', label: 'marchés' },
  { field: 'toneDepths', taxonomy: 'tone_depth', label: 'profondeurs de ton' }
];
