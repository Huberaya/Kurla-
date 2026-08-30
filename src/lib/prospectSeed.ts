/**
 * Liste d'amorçage des prospects de sourcing (route hybride, décision du
 * 30/08/2026). Ce ne sont pas des fournisseurs vérifiés : ce sont les cibles
 * réelles issues de `docs/sourcing/PLAN_SOURCING_HYBRIDE.md`, à contacter.
 *
 * Discipline du projet : aucun contact, prix, MOQ ou document n'est inventé.
 * Tout ce qui n'est pas encore connu est `null` et sera rempli au fil des
 * échanges. Cette liste est notre plan de prospection, pas une preuve.
 */

export type ProspectRoute = 'A' | 'B';

export interface ProspectSeed {
  id: string;
  name: string;
  route: ProspectRoute;
  contactType: string;
  specialty: string;
  sourceUrl: string;
}

export interface CandidateSeed {
  id: string;
  prospectId: string;
  brand: string;
  product: string;
  routineStep: string;
  category: string;
}

export const PROSPECT_CONTACT_TYPES = [
  'brand_fr',
  'brand_eu',
  'skin_solar',
  'distributor',
  'contract_manufacturer',
] as const;

export const PROSPECT_STATUSES = [
  'to_contact',
  'emailed',
  'followed_up',
  'replied',
  'in_negotiation',
  'samples_sent',
  'agreed',
  'declined',
  'no_response',
] as const;

export const TRI_STATES = ['pending', 'yes', 'no', 'na'] as const;

export const CANDIDATE_GOVERNANCE = [
  'blocked',
  'waiting_inci',
  'in_progress',
  'ready',
  'published',
] as const;

export const DEFAULT_PROSPECTS: ProspectSeed[] = [
  // --- Piste A : revente, marques cheveux France ---
  { id: 'c01', name: 'Nappy Queen', route: 'A', contactType: 'brand_fr', specialty: 'Après-shampoing karité/jojoba, masque ricin, gamme enfant', sourceUrl: 'nappyboucles.fr/115-nappy-queen' },
  { id: 'c02', name: 'Activilong (Actiforce/Actikids)', route: 'A', contactType: 'brand_fr', specialty: 'Leave-in, crème soufflée, huiles karité/macadamia, enfant', sourceUrl: 'nappyboucles.fr/98-activilong' },
  { id: 'c03', name: 'Les Secrets de Loly', route: 'A', contactType: 'brand_fr', specialty: 'Soins nourrissants, packs boucles/crépus', sourceUrl: 'nappyboucles.fr (top 10 FR)' },
  { id: 'c04', name: 'Soarn', route: 'A', contactType: 'brand_fr', specialty: 'Shampoing Boost’r revitalisant, soins ciblés', sourceUrl: 'nappyboucles.fr (top 10 FR)' },
  { id: 'c05', name: 'Kalia Nature', route: 'A', contactType: 'brand_fr', specialty: 'Marque naturelle cheveux texturés', sourceUrl: 'nappyboucles.fr (top 10 FR)' },
  { id: 'c06', name: 'Carolina B', route: 'A', contactType: 'brand_fr', specialty: 'Packs enfant/adulte douceur et démêlage', sourceUrl: 'nappyboucles.fr (top 10 FR)' },
  { id: 'c07', name: 'Musoya', route: 'A', contactType: 'brand_fr', specialty: 'Marque afro/crépus/locks ET distributeur (Paris, livraison Europe)', sourceUrl: 'europages.fr (Musoya)' },
  // --- Piste A : marques bouclées UE (UK) ---
  { id: 'c08', name: 'Bouclème', route: 'A', contactType: 'brand_eu', specialty: 'Gels/crèmes boucles à crépus, 100% CG, vegan', sourceUrl: 'kurlify.com/en/brands/boucleme' },
  { id: 'c09', name: 'Flora & Curl', route: 'A', contactType: 'brand_eu', specialty: 'Mousses et gels « juicy clumps »', sourceUrl: 'curlmaven.ie' },
  { id: 'c10', name: 'Curlsmith', route: 'A', contactType: 'brand_eu', specialty: 'Fixation, gels sans protéine, large distribution UE', sourceUrl: 'hanzcurls.com' },
  { id: 'c11', name: 'Only Curls London', route: 'A', contactType: 'brand_eu', specialty: 'Gamme bouclée complète', sourceUrl: 'hanzcurls.com' },
  // --- Piste A : peaux mélanines & solaire ---
  { id: 'c12', name: 'IN’OYA — SUN’OYA', route: 'A', contactType: 'skin_solar', specialty: 'Fluide SPF50 sans trace blanche peaux noires (remplace p6)', sourceUrl: 'inoya-laboratoire.com/fr/sun-oya' },
  { id: 'c13', name: 'Eadem', route: 'A', contactType: 'skin_solar', specialty: 'Sérum anti-taches Milk Marvel, gamme mélanine (Black-owned)', sourceUrl: 'référence p14' },
  { id: 'c14', name: 'Black Girl Sunscreen', route: 'A', contactType: 'skin_solar', specialty: 'SPF30 sans trace blanche (import UE à vérifier)', sourceUrl: 'référence p15' },
  // --- Piste A : distributeur multimarque ---
  { id: 'c15', name: 'Dina Afro Shop', route: 'A', contactType: 'distributor', specialty: 'Gros multimarques : As I Am, Aunt Jackie’s, Cantu, Shea Moisture, Camille Rose…', sourceUrl: 'dinafroshop.com' },
  // --- Piste B : façonniers ---
  { id: 'c16', name: 'Carmel Cosmetics Labs', route: 'B', contactType: 'contract_manufacturer', specialty: 'Spécialiste marque blanche cheveux crépus/afro', sourceUrl: 'europages.fr (Carmel Cosmetics Labs)' },
  { id: 'c17', name: 'Hair Liss / Liss Creation', route: 'B', contactType: 'contract_manufacturer', specialty: 'Laboratoire capillaire marque blanche (Choisy-le-Roi), livraison Europe', sourceUrl: 'doc CHANTIER_16 §C.1' },
  { id: 'c18', name: 'Noesis', route: 'B', contactType: 'contract_manufacturer', specialty: 'MOQ dès 500, fournit PIF+CPSR+CPNP (Bulgarie, UE)', sourceUrl: 'noesiscosmetics.com' },
  { id: 'c19', name: 'CAPIBEAUTY', route: 'B', contactType: 'contract_manufacturer', specialty: 'Produits cheveux bouclés/frisés/crépus, marque blanche', sourceUrl: 'europages.fr (CAPIBEAUTY)' },
  { id: 'c20', name: 'Lessonia', route: 'B', contactType: 'contract_manufacturer', specialty: 'Full-service ISO 22716, Made in France (Finistère)', sourceUrl: 'doc CHANTIER_16 §C.1' },
  { id: 'c21', name: 'ABC Texture', route: 'B', contactType: 'contract_manufacturer', specialty: 'R&D et sous-traitance, ISO 22716', sourceUrl: 'doc CHANTIER_16 §C.1' },

  // --- Accessoires : satin / protection nocturne & outils (recherche achats du 30/08/2026) ---
  // Grossistes multimarques accessoires (bonnets satin, taies, peignes, brosses),
  // puis marques françaises premium en revente/co-branding. Contacts publics vérifiés
  // sur les sites officiels ; aucun tarif/MOQ inventé.
  { id: 'c22', name: 'AfricanFabs B.V.', route: 'A', contactType: 'distributor', specialty: 'Grossiste PB : bonnets satin & doublure satin, taies, scrunchies, accessoires wax. Wholesale explicite. Edam (NL), livraison UE. Contact public : info@africanfabs.com', sourceUrl: 'africanfabs.com/pages/contact-us' },
  { id: 'c23', name: 'Afro Wholesale (B&F Company)', route: 'A', contactType: 'distributor', specialty: 'Grossiste B2B afro/cheveux texturés (produits ET accessoires : bonnets, peignes, mèches). Heinenoord (NL), livraison UE. Contact public : support@afrowholesale.eu', sourceUrl: 'afrowholesale.eu' },
  { id: 'c24', name: 'Curly Nights', route: 'A', contactType: 'brand_fr', specialty: 'Bonnets satin et taies faits main à Lyon (FR), réglables/enfants, wax. Contact via site + Instagram @curly.nights', sourceUrl: 'curlynights.com/fr/contact' },
  { id: 'c25', name: 'Studio Boucle Paris', route: 'A', contactType: 'brand_fr', specialty: 'Bonnet satin adulte 100% satin intérieur/extérieur, marque française (Paris). Accessoires de protection nocturne', sourceUrl: 'studioboucleparis.com' },
];

export const DEFAULT_CANDIDATES: CandidateSeed[] = [
  { id: 'r01', prospectId: 'c01', brand: 'Nappy Queen', product: 'Après-shampoing rincé au karité & jojoba', routineStep: 'Après-shampoing', category: 'hair' },
  { id: 'r02', prospectId: 'c01', brand: 'Nappy Queen', product: 'Shampoing doux enfants', routineStep: 'Shampoing', category: 'kids' },
  { id: 'r03', prospectId: 'c01', brand: 'Nappy Queen', product: 'Masque réparateur au ricin', routineStep: 'Masque', category: 'hair' },
  { id: 'r04', prospectId: 'c01', brand: 'Nappy Queen', product: 'Shampoing doux (adulte)', routineStep: 'Shampoing', category: 'hair' },
  { id: 'r05', prospectId: 'c02', brand: 'Activilong', product: 'Crème hydratante Leave-In Actiforce', routineStep: 'Leave-in', category: 'hair' },
  { id: 'r06', prospectId: 'c02', brand: 'Activilong', product: 'Crème soufflée Actiforce (98% naturelle)', routineStep: 'Coiffage', category: 'hair' },
  { id: 'r07', prospectId: 'c02', brand: 'Activilong', product: 'Huile de karité 100% pure', routineStep: 'Huile', category: 'hair' },
  { id: 'r08', prospectId: 'c02', brand: 'Activilong', product: 'Gamme Actikids (enfant)', routineStep: 'Enfant', category: 'kids' },
  { id: 'r09', prospectId: 'c03', brand: 'Les Secrets de Loly', product: 'Pack soin nourrissant', routineStep: 'Routine/Kit', category: 'hair' },
  { id: 'r10', prospectId: 'c12', brand: 'IN’OYA', product: 'Fluide solaire SPF50 SUN’OYA (0 trace blanche)', routineStep: 'Solaire', category: 'solar' },
  { id: 'r11', prospectId: 'c08', brand: 'Bouclème', product: 'Curl Defining Gel', routineStep: 'Fixation', category: 'hair' },
  { id: 'r12', prospectId: 'c08', brand: 'Bouclème', product: 'Crème hydratante boucles', routineStep: 'Leave-in', category: 'hair' },
  { id: 'r13', prospectId: 'c09', brand: 'Flora & Curl', product: 'Mousse coiffante boucles/crépus', routineStep: 'Fixation', category: 'hair' },
  { id: 'r14', prospectId: 'c10', brand: 'Curlsmith', product: 'Shine Gel sans protéine', routineStep: 'Fixation', category: 'hair' },
  { id: 'r15', prospectId: 'c15', brand: 'Multimarques (via Dina Afro Shop)', product: 'As I Am / Aunt Jackie’s / Cantu / Shea Moisture / Camille Rose', routineStep: 'Divers', category: 'hair' },

  // --- Accessoires (satin & outils) — recherche achats du 30/08/2026 ---
  { id: 'r16', prospectId: 'c22', brand: 'AfricanFabs', product: 'Bonnet satin extra-large (tresses/locks) en gros', routineStep: 'Accessoire', category: 'tools' },
  { id: 'r17', prospectId: 'c22', brand: 'AfricanFabs', product: 'Set satin : bonnet + taie d’oreiller + scrunchie (gros)', routineStep: 'Accessoire', category: 'tools' },
  { id: 'r18', prospectId: 'c23', brand: 'Afro Wholesale', product: 'Peigne afro dents larges & brosses démêlantes (gros B2B)', routineStep: 'Accessoire', category: 'tools' },
  { id: 'r19', prospectId: 'c23', brand: 'Afro Wholesale', product: 'Bonnet de nuit wax/satin (multimarque, gros)', routineStep: 'Accessoire', category: 'tools' },
  { id: 'r20', prospectId: 'c24', brand: 'Curly Nights', product: 'Bonnet satin réglable fait main (Lyon) — revente/co-branding', routineStep: 'Accessoire', category: 'tools' },
  { id: 'r21', prospectId: 'c25', brand: 'Studio Boucle Paris', product: 'Bonnet satin 100% adulte (marque française)', routineStep: 'Accessoire', category: 'tools' },
];
