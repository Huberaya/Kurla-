/**
 * CORRECTION CHANTIER 2 — RECOMMANDATIONS PRODUITS & MATÉRIELS PAR BESOIN
 * 
 * Constat audit 09/09/2026 : 28/64 produits tagués identiquement `proteger_nuit + reduire_casse`,
 * 0 produit pour `entretenir_locks` et `entretenir_perruque`, 2 seulement pour `demeler_cheveux`.
 * L'utilisateur sélectionnait "Entretenir mes locks" → 0 résultat, "Démêler" → 2 résultats.
 * 
 * Ce fichier est la source unique corrigée. Il est appliqué à la lecture (catalogStore)
 * sans attendre une migration DB, et sert de référence pour la migration SQL permanente.
 * 
 * Taxonomie : utilise les codes `kurla_taxonomy_terms` + 2 ajouts (demeler_cheveux, barbe).
 */

export const CORRECTED_PRODUCT_NEEDS: Record<string, string[]> = {
  // ── Soins (p01-p15, p28-p34, p51-p54) ──
  'launch-p01': ['hydrater_cheveux', 'reduire_casse'], // Shampoing crème hydratant
  'launch-p02': ['cuir_chevelu', 'apaiser_cuir_chevelu'], // Shampoing purifiant clarifiant
  'launch-p03': ['hydrater_cheveux', 'reduire_casse'], // Co-wash
  'launch-p04': ['hydrater_cheveux', 'reduire_casse'], // Après-shampoing démêlant
  'launch-p05': ['hydrater_cheveux', 'reduire_casse'], // Masque karité
  'launch-p06': ['reduire_casse', 'apaiser_cuir_chevelu'], // Masque protéiné
  'launch-p07': ['hydrater_cheveux', 'definir_boucles'], // Leave-in léger
  'launch-p08': ['hydrater_cheveux', 'reduire_casse'], // Leave-in riche 4C
  'launch-p09': ['hydrater_cheveux', 'proteger_nuit'], // Beurre karité scellement
  'launch-p10': ['cuir_chevelu', 'reduire_casse'], // Huile ricin JBCO
  'launch-p11': ['hydrater_cheveux', 'definir_boucles'], // Sérum huiles
  'launch-p12': ['definir_boucles', 'entretenir_tresses'], // Crème twist-out
  'launch-p13': ['definir_boucles', 'reduire_frisottis'], // Gel lin sans croûtage
  'launch-p14': ['definir_boucles', 'entretenir_tresses'], // Gel tenue forte edge
  'launch-p15': ['definir_boucles', 'reduire_frisottis'], // Mousse légère

  // ── Accessoires cœur (p16-p27) ──
  'launch-p16': ['reduire_casse', 'demeler_cheveux'], // Peigne dents larges
  'launch-p17': ['proteger_nuit', 'hydrater_cheveux', 'entretenir_perruque'], // Bonnet satin + taie — perruque aussi
  'launch-p18': ['hydrater_cheveux', 'definir_boucles'], // Vaporisateur brume
  'launch-p19': ['definir_boucles', 'reduire_casse'], // Brosse Denman 7 rangs
  'launch-p20': ['reduire_casse', 'demeler_cheveux'], // Brosse flexible picots
  'launch-p21': ['definir_boucles', 'entretenir_tresses', 'barbe'], // Brosse edges — barbe aussi
  'launch-p22': ['definir_boucles', 'proteger_chaleur'], // Bigoudis heatless
  'launch-p23': ['entretenir_tresses', 'reduire_casse'], // Pinces crocodile
  'launch-p24': ['proteger_nuit', 'entretenir_tresses', 'entretenir_perruque'], // Headwrap — perruque aussi
  'launch-p25': ['proteger_nuit', 'entretenir_tresses', 'entretenir_perruque'], // Bonnet douche — perruque
  'launch-p26': ['cuir_chevelu', 'apaiser_cuir_chevelu'], // Flacon applicateur
  'launch-p27': ['proteger_nuit', 'entretenir_locks', 'entretenir_perruque'], // Filet — perruque/locks

  // ── Soins complémentaires ──
  'launch-p28': ['cuir_chevelu', 'hydrater_cheveux'], // Sérum pousse
  'launch-p29': ['definir_boucles', 'reduire_frisottis'], // Gel lin tenue forte
  'launch-p30': ['definir_boucles', 'entretenir_locks'], // Mousse twist & lock
  'launch-p31': ['cuir_chevelu', 'reduire_casse'], // Huile ricin pure
  'launch-p32': ['hydrater_cheveux', 'definir_boucles'], // Spray refresh
  'launch-p33': ['cuir_chevelu', 'apaiser_cuir_chevelu'], // Gommage cuir chevelu
  'launch-p34': ['hydrater_cheveux', 'definir_boucles'], // Crème jour hydratante

  // ── Outils iconiques ──
  'launch-p35': ['definir_boucles', 'entretenir_tresses', 'barbe'], // Afro pick — barbe/volume
  'launch-p36': ['cuir_chevelu', 'apaiser_cuir_chevelu'], // Brosse massage silicone
  'launch-p37': ['definir_boucles', 'reduire_frisottis'], // Serviette microfibre
  'launch-p38': ['entretenir_tresses', 'definir_boucles'], // Peigne queue de rat
  'launch-p39': ['definir_boucles', 'proteger_chaleur'], // Flexi rods
  'launch-p40': ['definir_boucles', 'proteger_chaleur'], // Perm rods
  'launch-p41': ['entretenir_locks', 'definir_boucles', 'barbe'], // Éponge twist — homme waves/barbe
  'launch-p42': ['entretenir_locks', 'reduire_casse'], // Interlocking
  'launch-p43': ['definir_boucles', 'proteger_chaleur'], // Diffuseur universel
  'launch-p44': ['hydrater_cheveux', 'cuir_chevelu'], // Bonnet chauffant
  'launch-p45': ['proteger_nuit', 'entretenir_tresses'], // Chouchous satin
  'launch-p46': ['proteger_nuit', 'entretenir_locks', 'barbe'], // Durag — barbe/waves
  'launch-p47': ['hydrater_cheveux', 'cuir_chevelu'], // Steamer portable
  'launch-p48': ['hydrater_cheveux', 'reduire_frisottis'], // Brosse vapeur nano-mist
  'launch-p49': ['cuir_chevelu', 'apaiser_cuir_chevelu'], // Masseur 3-en-1 électrique
  'launch-p50': ['entretenir_tresses', 'proteger_chaleur'], // African threading
  'launch-p51': ['proteger_chaleur', 'definir_boucles'], // Spray thermo-protecteur
  'launch-p52': ['reduire_casse', 'hydrater_cheveux'], // Bond builder
  'launch-p53': ['cuir_chevelu', 'hydrater_cheveux'], // Eau romarin
  'launch-p54': ['cuir_chevelu', 'apaiser_cuir_chevelu'], // Vinaigre cidre toner

  // ── 23 innovations GAP (p55-p77) ──
  'launch-p55': ['entretenir_tresses', 'reduire_casse'], // Machine à tresser auto
  'launch-p56': ['entretenir_locks', 'reduire_casse'], // Machine locs auto 2 aiguilles
  'launch-p57': ['definir_boucles', 'proteger_chaleur'], // Headband heatless Slik
  'launch-p58': ['hydrater_cheveux', 'reduire_frisottis'], // Brosse vapeur 2026
  'launch-p59': ['definir_boucles', 'reduire_casse'], // Root clips
  'launch-p60': ['proteger_nuit', 'entretenir_tresses'], // Silk scrunchies
  'launch-p61': ['reduire_casse', 'demeler_cheveux'], // Seashore Pik eco
  'launch-p62': ['cuir_chevelu', 'apaiser_cuir_chevelu'], // Analyzer WiFi
  'launch-p63': ['cuir_chevelu', 'apaiser_cuir_chevelu'], // Microscope 1600X
  'launch-p64': ['cuir_chevelu', 'apaiser_cuir_chevelu'], // API 202 pro
  'launch-p65': ['proteger_chaleur', 'definir_boucles'], // AirLight Pro
  'launch-p66': ['proteger_chaleur', 'definir_boucles'], // Dyson Supersonic r
  'launch-p67': ['proteger_chaleur', 'definir_boucles'], // T3 Aire iQ
  'launch-p68': ['proteger_chaleur', 'definir_boucles'], // Shark FlexFusion
  'launch-p69': ['proteger_chaleur', 'definir_boucles'], // Dyson Corrale
  'launch-p70': ['proteger_chaleur', 'definir_boucles'], // ghd Duet
  'launch-p71': ['proteger_chaleur', 'definir_boucles'], // Laifen Mini
  'launch-p72': ['cuir_chevelu', 'proteger_chaleur'], // Dreame Pilot 20 AI
  'launch-p73': ['proteger_chaleur', 'definir_boucles'], // L'Oréal Light Straight
  'launch-p74': ['reduire_casse', 'demeler_cheveux'], // Ultrasonic brush
  'launch-p75': ['proteger_chaleur', 'definir_boucles'], // 6-en-1 hot air brush
  'launch-p76': ['hydrater_cheveux', 'cuir_chevelu'], // Steamer salon pro
  'launch-p77': ['entretenir_locks', 'reduire_casse'], // Dreadlock maker 3 needles

  // ── Kits (k01-k10) — multi-besoins, mis en avant selon reco ──
  'launch-k01': ['hydrater_cheveux', 'definir_boucles'], // Premiers pas bouclés
  'launch-k02': ['hydrater_cheveux', 'definir_boucles'], // Hydratation définition 3C/4A
  'launch-k03': ['hydrater_cheveux', 'reduire_casse'], // Nutrition profonde 4C
  'launch-k04': ['reduire_casse', 'cuir_chevelu'], // Réparation pousse
  'launch-k05': ['entretenir_tresses', 'definir_boucles'], // Protectrices
  'launch-k06': ['hydrater_cheveux', 'reduire_casse'], // Routine complète 4C
  'launch-k07': ['reduire_casse', 'demeler_cheveux'], // Outils wash day
  'launch-k08': ['entretenir_locks', 'proteger_nuit'], // Locs vanilles
  'launch-k09': ['definir_boucles', 'proteger_chaleur'], // Heatless
  'launch-k10': ['cuir_chevelu', 'hydrater_cheveux'], // Soin profond premium
};

// Alias boutique → taxonomy — garde-fou si un produit n'a qu'un des deux synonymes proches.
// La plupart des produits portent déjà les deux tags, l'alias ne sert qu'en fallback.
// C8 : ajoute alias spf/ingredient pour aligner SkinLandingPage (spf, ingredient) avec boutique (protection_solaire, par_ingredient)
export const BOUTIQUE_NEED_ALIAS: Record<string, string[]> = {
  'demeler_cheveux': ['demeler_cheveux'],
  'prendre_soin_barbe': ['barbe'],
  'cuir_chevelu': ['cuir_chevelu', 'apaiser_cuir_chevelu'],
  'proteger_nuit': ['proteger_nuit'],
  // KURLA SKIN — 15 familles peau (ids needsHub = boutique peau)
  'hydrater': ['hydrater_peau', 'hydrater', 'hydrater_cheveux'],
  'eclat': ['eclat', 'teint_terne', 'hydrater_peau'],
  'taches': ['taches_hyperpigmentation', 'taches', 'attenuer_taches', 'teint_non_uniforme'],
  'seche': ['secheresse', 'peau_seche', 'deshydratation'],
  'grasse': ['peau_grasse', 'imperfections_acne', 'points_noirs'],
  'imperfections': ['imperfections_acne', 'imperfections', 'points_noirs'],
  'sensible': ['peau_sensible', 'sensibilite', 'rougeurs'],
  'protection_solaire': ['protection_solaire', 'proteger_spf', 'spf'],
  'spf': ['protection_solaire', 'proteger_spf', 'spf'],
  'anti_age': ['rides', 'fermete', 'prevenir_age', 'anti_age'],
  'contour_yeux': ['cernes', 'contour_yeux', 'poches'],
  'levres': ['levres_seches', 'levres'],
  'corps': ['peau_corps', 'soin_corps', 'corps'],
  'cicatrices': ['cicatrices', 'grain_irregulier'],
  'barriere': ['barriere', 'renforcer_barriere', 'hydrater_peau'],
  'par_ingredient': ['par_ingredient', 'ingredient'],
  'ingredient': ['par_ingredient', 'ingredient'],
};

export function getCorrectedNeeds(productId: string, fallback: string[]): string[] {
  return CORRECTED_PRODUCT_NEEDS[productId] || fallback;
}

// Vérif couverture par besoin (pour tests)
export function getCoverageByNeed(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const needs of Object.values(CORRECTED_PRODUCT_NEEDS)) {
    for (const n of needs) map[n] = (map[n] || 0) + 1;
  }
  return map;
}
