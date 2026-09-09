/**
 * Scoring sourcing segmenté par pays — KURLA 2026-09-10
 * Source de vérité pour l'admin : chaque pays-fournisseur est noté /40 sur 10 critères pondérés.
 * Décision = Vague 1 (≥30), Vague 2 (24-29), Vague 3 (<24). Aucune ouverture sans 8 gates verts fichier+date.
 */

export type SourcingTrack = 'A_resale' | 'B_make';

export type SourcingCountry = {
  id: string;
  label: string;
  countryCode: string; // ISO2
  track: SourcingTrack;
  score: number; // /40
  rank: number;
  wave: 1 | 2 | 3;
  model: string;
  moqTarget: string;
  leadTimeFr: string;
  marginTargetHt: string;
  prospects: string[]; // ids sourcing_prospects
  requiresRp: boolean;
  gates: string[];
};

export const SOURCING_COUNTRIES: SourcingCountry[] = [
  {
    id: 'FR',
    label: 'France — revente directe marques texturées',
    countryCode: 'FR',
    track: 'A_resale',
    score: 34,
    rank: 1,
    wave: 1,
    model: 'Revente directe marque — stock léger 12 pcs/réf',
    moqTarget: '≤12 pcs/réf',
    leadTimeFr: '2–5 j',
    marginTargetHt: '≥34% (cible 45% après négoce)',
    prospects: ['c01','c02','c03','c04','c05','c06','c07','c12','c15'],
    requiresRp: true,
    gates: ['tarif_gros_écrit','moq_12','delai_5j','marge_34','cpnp_rp','inci_visuels','echantillon_4C','franco_chiffré'],
  },
  {
    id: 'NL',
    label: 'Pays-Bas — grossistes multimarques',
    countryCode: 'NL',
    track: 'A_resale',
    score: 30,
    rank: 2,
    wave: 1,
    model: 'Distributeur gros — stock centralisé Benelux',
    moqTarget: '≤12 pcs/réf, paliers gros',
    leadTimeFr: '48–72 h',
    marginTargetHt: '≥34%',
    prospects: ['c15_distri_NL_afro_wholesale','c15_distri_NL_africanfabs','c15'],
    requiresRp: true,
    gates: ['grille_gros','moq_12','delai_72h','marge_34','cpnp_rp_par_SKU','rupture_<10%'],
  },
  {
    id: 'UK',
    label: 'Royaume-Uni — boucles',
    countryCode: 'GB',
    track: 'A_resale',
    score: 28,
    rank: 3,
    wave: 2,
    model: 'Distributeur UE agréé / importateur FR — pas d’import direct sans RP',
    moqTarget: '≤12 via importateur',
    leadTimeFr: '≤7 j',
    marginTargetHt: '≥34% après douane',
    prospects: ['c08','c09','c10','c11'],
    requiresRp: true,
    gates: ['rp_UE_attesté','cout_douane_chiffré','delai_7j','marge_34_apres_douane'],
  },
  {
    id: 'DE',
    label: 'Allemagne — demi-gros',
    countryCode: 'DE',
    track: 'A_resale',
    score: 26,
    rank: 4,
    wave: 2,
    model: 'Demi-gros via distributeur DE',
    moqTarget: '≤24',
    leadTimeFr: '3–6 j',
    marginTargetHt: '≥34%',
    prospects: [],
    requiresRp: true,
    gates: ['rp_UE','etiquetage_FR','delai_7j'],
  },
  {
    id: 'GH',
    label: 'Ghana / Afrique Ouest — matière karité',
    countryCode: 'GH',
    track: 'B_make',
    score: 26,
    rank: 5,
    wave: 1, // sourcing matière vague 1, vente vague 3
    model: 'Partenariat coopérative — matière pour marque propre (pas revente directe)',
    moqTarget: '100 kg matière',
    leadTimeFr: '4–6 sem (matière)',
    marginTargetHt: '45–55% sur fini karité si coût ≤4,50€',
    prospects: [],
    requiresRp: false,
    gates: ['eudr_geoloc','prix_kg_rendu_UE','attestation_coop'],
  },
  {
    id: 'US',
    label: 'États-Unis — SPF mélanine',
    countryCode: 'US',
    track: 'A_resale',
    score: 18,
    rank: 6,
    wave: 3,
    model: 'Import vérifié seulement si RP UE — sinon via Dina Afro Shop FR',
    moqTarget: 'refus direct sans RP',
    leadTimeFr: '>10 j + douane 12% + TVA 20%',
    marginTargetHt: '≥34% après douane (rare)',
    prospects: ['c13','c14'],
    requiresRp: true,
    gates: ['rp_UE','cpnp','spf_iso24444','uva_iso24443','cout_douane_chiffré'],
  },
  {
    id: 'BG_make',
    label: 'Bulgarie — façonnage UE (Noesis)',
    countryCode: 'BG',
    track: 'B_make',
    score: 32,
    rank: 1,
    wave: 1,
    model: 'Façonnage UE petit MOQ 500 — PIF+CPSR+CPNP fournis',
    moqTarget: '500 / 1000 / 5000',
    leadTimeFr: 'échantillon 3 sem, prod 8 sem',
    marginTargetHt: 'Cible héros 13–18€ TTC',
    prospects: ['c18'],
    requiresRp: true,
    gates: ['iso22716','pif','cpsr','cpnp','microplastic_free','coa','eudr_si_karite'],
  },
  {
    id: 'FR_make',
    label: 'France — façonnage (Lessonia/Carmel/Hair Liss/CAPIBEAUTY)',
    countryCode: 'FR',
    track: 'B_make',
    score: 31,
    rank: 2,
    wave: 1,
    model: 'Made in France — traçabilité karité EUDR',
    moqTarget: '500 / 1000 / 5000',
    leadTimeFr: 'échantillon 3–4 sem, prod 8–12 sem',
    marginTargetHt: 'Cible héros 11–16€ / 13–18€',
    prospects: ['c16','c17','c19','c20','c21'],
    requiresRp: true,
    gates: ['iso22716','pif','cpsr','cpnp','microplastic_free','eudr_karite'],
  },
];

// Portes chiffrées — la même logique que PLAN_CONQUETE §27 mais pour le sourcing
export const SOURCING_GATES = [
  { id: 'G1', label: 'Tarif gros HT écrit (PDF)', forWave: [1,2,3] as const },
  { id: 'G2', label: 'MOQ ≤12 pcs/réf (revente) ou paliers 500/1000/5000 (façonnage)', forWave: [1,2] as const },
  { id: 'G3', label: 'Délai FR ≤7j (≤5j FR, ≤3j NL)', forWave: [1,2] as const },
  { id: 'G4', label: 'Marge HT ≥34% (cible 45%)', forWave: [1,2,3] as const },
  { id: 'G5', label: 'CPNP + Personne Responsable UE (fichier+date)', forWave: [1,2,3] as const },
  { id: 'G6', label: 'INCI + visuels autorisés (fichier)', forWave: [1,2] as const },
  { id: 'G7', label: 'Échantillon validé texture 4C / SPF 0 trace blanche', forWave: [1] as const },
  { id: 'G8', label: 'Franco / port chiffré', forWave: [1,2] as const },
] as const;

export function sourcingWaveLabel(w: SourcingCountry['wave']): string {
  return w === 1 ? 'Vague 1 — nous allons commencer par ce pays' : w === 2 ? 'Vague 2 — après 30 commandes FR à marge positive' : 'Vague 3 — seulement sur preuves RP + marge après douane';
}

export function isSourcingCountryBlocked(score: number): boolean { return score < 24; }
