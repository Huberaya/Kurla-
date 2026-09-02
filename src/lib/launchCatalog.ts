/**
 * KURLA — CATALOGUE DE LANCEMENT DÉCIDÉ (plan de marchandisage JOUR 1).
 *
 * DÉCISION : on lance avec 18 SKU, pas 50 ni 100. Raison : (1) chaque type de
 * cheveu (3A→4C) doit pouvoir faire une routine complète sans choix paralysant ;
 * (2) 18 SKU = stock et trésorerie maîtrisés pour un premier lot (~4-6 k€ d'achat) ;
 * (3) on élargit dès que les ventes révèlent les best-sellers (data-driven).
 *
 * Règles d'honnêteté :
 *  - `brand` = MARQUE CIBLE de sourcing (à contacter), pas un fournisseur confirmé.
 *  - `costEur` = OBJECTIF de coût d'achat HT déduit du prix public visé (cible de
 *    marge ~45 %) ; ce n'est PAS un devis. Le coût réel sera saisi à réception de
 *    la grille tarifaire fournisseur (aucun chiffre inventé côté transaction).
 *  - Conformité : aucun produit n'est publié sans fiche ingrédient + vérification
 *    européenne (Règl. 1223/2009) ; le statut est `à sourcer/vérifier`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 18 PRODUITS DE LANCEMENT
// ─────────────────────────────────────────────────────────────────────────────

export type LaunchProduct = {
  id: string;
  name: string;
  category: 'Shampoing' | 'Après-shampoing' | 'Masque' | 'Leave-in' | 'Huile/Beurre' | 'Gel/Coiffant' | 'Co-wash' | 'Accessoire';
  brandTarget: string;
  hairType: string;          // types de cheveux cibles
  problem: string;           // problème résolu
  retailPriceEur: number;    // prix de vente public TTC
  targetCostEur: number;     // objectif coût d'achat HT (cible de négoce)
  marginPct: number;         // marge brute estimée
  repurchase: 'fort' | 'moyen';
  strategic: string;         // intérêt stratégique
  pairsWith: string[];       // ids produits complémentaires
};

export const LAUNCH_PRODUCTS: LaunchProduct[] = [
  // ── Hygiène & lavage ──
  { id: 'p01', name: 'Shampoing crème hydratant sans sulfate (250 ml)', category: 'Shampoing', brandTarget: 'Aunt Jackie’s / Cantu (gros)', hairType: '3A-4C', problem: 'Cheveux secs, frisottis après lavage, cuir chevelu sensible', retailPriceEur: 12.9, targetCostEur: 7.1, marginPct: 45, repurchase: 'fort', strategic: 'Entrée de gamme ENTRY, base de toutes les routines, fort réachat.', pairsWith: ['p04', 'p07', 'p13'] },
  { id: 'p02', name: 'Shampoing purifiant clarifiant (250 ml)', category: 'Shampoing', brandTarget: 'Kinky-Curly / As I Am', hairType: '3A-4C', problem: 'Accumulation de produits (build-up), cuir chevelu gras', retailPriceEur: 13.9, targetCostEur: 7.6, marginPct: 45, repurchase: 'moyen', strategic: 'Usage 1x/2 sem, complète la routine, éducatif (scalp care).', pairsWith: ['p01', 'p05'] },
  { id: 'p03', name: 'Co-wash nettoyant crème (450 ml)', category: 'Co-wash', brandTarget: 'As I Am Coconut Cowash', hairType: '3C-4C', problem: 'Cheveux très secs qui ne supportent pas le shampoing', retailPriceEur: 14.9, targetCostEur: 8.2, marginPct: 45, repurchase: 'fort', strategic: 'Best-seller communautaire afro, fidélise les 4C.', pairsWith: ['p06', 'p09'] },

  // ── Soin / nutrition ──
  { id: 'p04', name: 'Après-shampoing démêlant hydratant (400 ml)', category: 'Après-shampoing', brandTarget: 'Cantu Shea Butter / Aunt Jackie’s', hairType: '3A-4C', problem: 'Nœuds, casse au démêlage, manque de glisse', retailPriceEur: 11.9, targetCostEur: 6.5, marginPct: 45, repurchase: 'fort', strategic: 'Déclencheur du « ça marche enfin », bas coût, fort volume.', pairsWith: ['p01', 'p07'] },
  { id: 'p05', name: 'Masque profond nutrition beurre de karité (340 g)', category: 'Masque', brandTarget: 'Shea Moisture Raw Shea', hairType: '3C-4C', problem: 'Cheveux abîmés, déshydratés, cassants', retailPriceEur: 16.9, targetCostEur: 9.3, marginPct: 45, repurchase: 'moyen', strategic: 'Piège CORE/PREMIUM, soin « rendez-vous » du dimanche, monte le panier.', pairsWith: ['p02', 'p09', 'p11'] },
  { id: 'p06', name: 'Masque protéiné reconstructeur (340 g)', category: 'Masque', brandTarget: 'Aphogee / Shea Moisture JBCO', hairType: '3A-4C', problem: 'Cheveux fins, cassants, fourches, coloration abîmée', retailPriceEur: 17.9, targetCostEur: 9.8, marginPct: 45, repurchase: 'moyen', strategic: 'Répond au besoin « réparation », différencie des enseignes.', pairsWith: ['p05', 'p10'] },

  // ── Hydratation sans rinçage ──
  { id: 'p07', name: 'Leave-in crème hydratante légère (250 ml)', category: 'Leave-in', brandTarget: 'Kinky-Curly Knot Today / Aunt Jackie’s', hairType: '3A-3C', problem: 'Manque d’hydratation quotidienne, frisottis', retailPriceEur: 13.9, targetCostEur: 7.6, marginPct: 45, repurchase: 'fort', strategic: 'Produit du quotidien, réachat fréquent, cœur des routines bouclées.', pairsWith: ['p01', 'p04', 'p13'] },
  { id: 'p08', name: 'Leave-in riche « cream » pour crépus (250 ml)', category: 'Leave-in', brandTarget: 'Camille Rose / Mielle', hairType: '4A-4C', problem: 'Hydratation qui ne tient pas sur cheveu crépu', retailPriceEur: 15.9, targetCostEur: 8.7, marginPct: 45, repurchase: 'fort', strategic: 'Spécifique 4B/4C, répond à la cible prioritaire Aminata.', pairsWith: ['p03', 'p09', 'p12'] },

  // ── Nutrition / scellement ──
  { id: 'p09', name: 'Beurre de karité brut 100 % (200 g)', category: 'Huile/Beurre', brandTarget: 'Marque propre KURLA / sourcing Afrique de l’Ouest', hairType: '3C-4C', problem: 'Scellement de l’hydratation, nutrition profonde', retailPriceEur: 9.9, targetCostEur: 4.5, marginPct: 55, repurchase: 'moyen', strategic: 'Futur HÉROS marque propre (marge 55 %), ancrage sourcing éthique.', pairsWith: ['p05', 'p08', 'p11'] },
  { id: 'p10', name: 'Huile de ricin noire jamaïcaine (118 ml)', category: 'Huile/Beurre', brandTarget: 'Sunny Isle / Tropic Isle', hairType: '3A-4C', problem: 'Pousse, racines faibles, pointes sèches', retailPriceEur: 12.9, targetCostEur: 7.1, marginPct: 45, repurchase: 'moyen', strategic: 'Forte demande « pousse », bon contenu éducatif.', pairsWith: ['p06', 'p11'] },
  { id: 'p11', name: 'Sérum huiles nourricières multi-usages (100 ml)', category: 'Huile/Beurre', brandTarget: 'Mielle Rosemary Mint / Camille Rose', hairType: '3A-4C', problem: 'Brillance, frisottis, cuir chevelu, soin des pointes', retailPriceEur: 14.9, targetCostEur: 8.2, marginPct: 45, repurchase: 'fort', strategic: 'Complément à forte marge perçue, se glisse dans tous les paniers.', pairsWith: ['p07', 'p08'] },

  // ── Coiffage / définition ──
  { id: 'p12', name: 'Crème de définition twist-out / braid-out (227 g)', category: 'Gel/Coiffant', brandTarget: 'Camille Rose Almond Jai / Mielle', hairType: '3C-4C', problem: 'Pas de tenue des coiffures protectrices, manque de définition', retailPriceEur: 15.9, targetCostEur: 8.7, marginPct: 45, repurchase: 'fort', strategic: 'Indissociable des routines 4, pilier des kits.', pairsWith: ['p08', 'p14'] },
  { id: 'p13', name: 'Gel de lin définition sans croûtage (240 ml)', category: 'Gel/Coiffant', brandTarget: 'Kinky-Curly Curling Custard / Aunt Jackie’s', hairType: '3A-4A', problem: 'Boucles mal définies, gels qui dessèchent et durcissent', retailPriceEur: 16.9, targetCostEur: 9.3, marginPct: 45, repurchase: 'fort', strategic: 'Produit « définition » star pour bouclés, contenu TikTok parfait.', pairsWith: ['p07', 'p01'] },
  { id: 'p14', name: 'Gel de tenue forte edge & twist (227 g)', category: 'Gel/Coiffant', brandTarget: 'Eco Styler / Mielle', hairType: '3C-4C', problem: 'Coiffures qui ne tiennent pas, bords rebelles', retailPriceEur: 8.9, targetCostEur: 4.9, marginPct: 45, repurchase: 'fort', strategic: 'ENTRÉE de panier très bas prix, déclenche l’ajout (« add-on »).', pairsWith: ['p12', 'p08'] },
  { id: 'p15', name: 'Mousse coiffante légère définition (200 ml)', category: 'Gel/Coiffant', brandTarget: 'As I Am / Design Essentials', hairType: '3A-4A', problem: 'Volume sans frisottis, boucles souples', retailPriceEur: 11.9, targetCostEur: 6.5, marginPct: 45, repurchase: 'moyen', strategic: 'Alternative au gel pour les cheveux fins, complète la gamme.', pairsWith: ['p07', 'p13'] },

  // ── Accessoires à marge émotionnelle ──
  { id: 'p16', name: 'Peigne démêloir à dents larges (anti-casse)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Casse au démêlage', retailPriceEur: 6.9, targetCostEur: 2.5, marginPct: 64, repurchase: 'moyen', strategic: 'Accessoire à haute marge, ajout panier, renforce l’expertise routine.', pairsWith: ['p04', 'p07'] },
  { id: 'p17', name: 'Bonnet satin nuit + taie d’oreiller (set)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Frottements nocturnes, perte d’hydratation, frisottis', retailPriceEur: 12.9, targetCostEur: 4.8, marginPct: 63, repurchase: 'moyen', strategic: 'Marge ~63 %, très visuel en UGC, parfait en cadeau/kit.', pairsWith: ['p08', 'p12'] },
  { id: 'p18', name: 'Flacon vaporisateur brume continue (300 ml)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3C-4C', problem: 'Réhydratation quotidienne (refresh) impossible', retailPriceEur: 7.9, targetCostEur: 2.9, marginPct: 63, repurchase: 'moyen', strategic: 'Outil de la routine refresh, éducatif, add-on rentable.', pairsWith: ['p08', 'p18'] },

  // ── Outils & matériel (extension catalogue) — haute marge, forte demande ──
  { id: 'p19', name: 'Brosse démêlante 7 rangs type Denman (définition)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Boucles peu définies, nœuds au brush-styling', retailPriceEur: 12.9, targetCostEur: 4.6, marginPct: 64, repurchase: 'moyen', strategic: 'Best-seller outil, indispensable du curl-styling, marge ~64 %.', pairsWith: ['p07', 'p13'] },
  { id: 'p20', name: 'Brosse démêlante flexible dents picots (humide/sec)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Casse au brossage, cheveux emmêlés sous la douche', retailPriceEur: 11.9, targetCostEur: 4.2, marginPct: 65, repurchase: 'moyen', strategic: 'Démêlage sans douleur, add-on universel à fort taux d’ajout panier.', pairsWith: ['p04', 'p07'] },
  { id: 'p21', name: 'Brosse à edges + peigne de précision (baby hair)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Bords et baby hair non maîtrisés, tempes rebelles', retailPriceEur: 5.9, targetCostEur: 2.0, marginPct: 66, repurchase: 'moyen', strategic: 'Petit prix, ajout panier impulsif, marge très élevée.', pairsWith: ['p12', 'p13'] },
  { id: 'p22', name: 'Bigoudis satin heatless (lot de 6, boucles sans chaleur)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Boucles abîmées par la chaleur, manque de volume', retailPriceEur: 14.9, targetCostEur: 5.5, marginPct: 63, repurchase: 'moyen', strategic: 'Tendance « heatless curls », très partageable en UGC, cadeau.', pairsWith: ['p12', 'p17'] },
  { id: 'p23', name: 'Pinces de sectionnement crocodile (lot de 6)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Impossible de séparer les sections au wash day', retailPriceEur: 6.9, targetCostEur: 2.3, marginPct: 67, repurchase: 'moyen', strategic: 'Outil de base du wash day, lot économique, add-on fréquent.', pairsWith: ['p04', 'p05'] },
  { id: 'p24', name: 'Foulard headwrap satin premium (multi-usages)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Coiffure protectrice et frottements, style africain', retailPriceEur: 13.9, targetCostEur: 5.2, marginPct: 63, repurchase: 'moyen', strategic: 'Forte identité culturelle, marge élevée, se vend en plusieurs coloris.', pairsWith: ['p08', 'p17'] },
  { id: 'p25', name: 'Bonnet de douche réutilisable doublé satin', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Coiffure détruite par l’humidité sous la douche', retailPriceEur: 9.9, targetCostEur: 3.6, marginPct: 64, repurchase: 'moyen', strategic: 'Protège les coiffures protectrices, complète la gamme nuit.', pairsWith: ['p17', 'p24'] },
  { id: 'p26', name: 'Flacon applicateur embout précis (soin cuir chevelu, 200 ml)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Application des huiles/masques racine imprécise et salissante', retailPriceEur: 6.9, targetCostEur: 2.4, marginPct: 65, repurchase: 'moyen', strategic: 'Outil du soin du cuir chevelu, éducatif, add-on low-cost.', pairsWith: ['p10', 'p11'] },
  { id: 'p27', name: 'Filet de protection tresses & vanilles (nuit)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3C-4C', problem: 'Tresses défaites et frisottis pendant la nuit', retailPriceEur: 5.9, targetCostEur: 2.0, marginPct: 66, repurchase: 'moyen', strategic: 'Spécifique coiffures protectrices, complète bonnet satin.', pairsWith: ['p17', 'p25'] },

  // ── Soins complémentaires (comblent les manques de la routine) ──
  { id: 'p28', name: 'Sérum pousse & fortification racines (ricin, 50 ml)', category: 'Huile/Beurre', brandTarget: 'Private label KURLA', hairType: '3A-4C', problem: 'Pousse lente, racines faibles, tempes clairsemées', retailPriceEur: 15.9, targetCostEur: 5.9, marginPct: 63, repurchase: 'moyen', strategic: 'Forte demande « pousse », bouchon de gamme nutrition, marge élevée.', pairsWith: ['p10', 'p06'] },
  { id: 'p29', name: 'Gel de lin définition tenue forte sans flocons (250 ml)', category: 'Gel/Coiffant', brandTarget: 'Private label KURLA', hairType: '3A-4C', problem: 'Boucles qui ne tiennent pas, gels qui laissent des résidus blancs', retailPriceEur: 13.9, targetCostEur: 7.6, marginPct: 45, repurchase: 'fort', strategic: 'Répond au besoin « tenue sans cast blanc », cœur du styling.', pairsWith: ['p07', 'p13'] },
  { id: 'p30', name: 'Mousse coiffante twist & lock tenue souple (200 ml)', category: 'Gel/Coiffant', brandTarget: 'Private label KURLA', hairType: '3B-4C', problem: 'Twists/locks sans tenue, manque de volume définition', retailPriceEur: 12.9, targetCostEur: 7.1, marginPct: 45, repurchase: 'fort', strategic: 'Coiffants très vendeurs, élargit la gamme styling, fort réachat.', pairsWith: ['p12', 'p29'] },
  { id: 'p31', name: 'Huile de ricin noire jamaïcaine pure (100 ml)', category: 'Huile/Beurre', brandTarget: 'Private label KURLA', hairType: '3C-4C', problem: 'Cheveux cassants, bords clairsemés, cuir chevelu sec', retailPriceEur: 14.9, targetCostEur: 5.5, marginPct: 63, repurchase: 'fort', strategic: 'Produit emblématique communautaire, sourcing karité/huiles en place.', pairsWith: ['p10', 'p28'] },
  { id: 'p32', name: 'Spray refresh quotidien hydratation (200 ml)', category: 'Leave-in', brandTarget: 'Private label KURLA', hairType: '3B-4C', problem: 'Coiffure plate et sèche entre deux wash day', retailPriceEur: 10.9, targetCostEur: 6.0, marginPct: 45, repurchase: 'fort', strategic: 'Lié à la routine refresh et au vaporisateur p18, fort réachat.', pairsWith: ['p18', 'p08'] },
  { id: 'p33', name: 'Gommage cuir chevelu purifiant (150 ml)', category: 'Shampoing', brandTarget: 'Private label KURLA', hairType: '3A-4C', problem: 'Build-up, démangeaisons, cuir chevelu gras, shampoings clarifiants agressifs', retailPriceEur: 14.9, targetCostEur: 8.2, marginPct: 45, repurchase: 'moyen', strategic: 'Scalp care en tendance, usage 1x/2 sem, complète le clarifiant p02.', pairsWith: ['p02', 'p10'] },
  { id: 'p34', name: 'Crème de jour hydratante coiffage (leave-in riche, 250 ml)', category: 'Leave-in', brandTarget: 'Private label KURLA', hairType: '4A-4C', problem: 'Hydratation qui ne tient pas la journée sur cheveu crépu', retailPriceEur: 14.9, targetCostEur: 8.2, marginPct: 45, repurchase: 'fort', strategic: 'Élargit la gamme leave-in, fort réachat, cœur de routine 4C.', pairsWith: ['p08', 'p32'] },

  // ── Outils iconiques manquants (recherchés massivement par la communauté) ──
  { id: 'p35', name: 'Peigne afro métal (fro pick) — volume & racines', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3C-4C', problem: 'Manque de volume, racines plates, coiffure qui tombe', retailPriceEur: 4.9, targetCostEur: 1.7, marginPct: 65, repurchase: 'moyen', strategic: 'Outil emblématique afro, petit prix, ajout panier impulsif et culturel.', pairsWith: ['p23', 'p19'] },
  { id: 'p36', name: 'Brosse massage cuir chevelu silicone (shampoo brush)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Build-up, démangeaisons, cuir chevelu mal nettoyé, shampoing qui mousse peu', retailPriceEur: 7.9, targetCostEur: 2.7, marginPct: 66, repurchase: 'moyen', strategic: 'Viral (« scalp massager »), favorise la circulation et le nettoyage, add-on universel.', pairsWith: ['p01', 'p33'] },
  { id: 'p37', name: 'Serviette microfibre boucles (plopping, anti-frisottis)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Frisottis et casse au séchage avec une serviette éponge classique', retailPriceEur: 12.9, targetCostEur: 4.6, marginPct: 64, repurchase: 'moyen', strategic: 'Indispensable du plopping, remplace le coton agressif, très recommandé en routine.', pairsWith: ['p07', 'p43'] },
  { id: 'p38', name: 'Peigne à queue de rat métal (séparation tresses/raies)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Raies irrégulières et séparation difficile pour tresses/box braids', retailPriceEur: 5.9, targetCostEur: 2.0, marginPct: 66, repurchase: 'moyen', strategic: 'Outil de base du braiding, réclamé par la communauté tresses, add-on low-cost.', pairsWith: ['p23', 'p30'] },
  { id: 'p39', name: 'Flexi rods mousse (lot de 7, boucles sans chaleur)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Boucles serrées sans chaleur impossibles à obtenir seule', retailPriceEur: 11.9, targetCostEur: 4.2, marginPct: 65, repurchase: 'moyen', strategic: 'Heatless très populaire, complète les bigoudis satin, éducatif.', pairsWith: ['p29', 'p13'] },
  { id: 'p40', name: 'Perm rods / bigoudis froids (lot, coils définis)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3B-4C', problem: 'Coils et boucles spiralées sans fer à boucler', retailPriceEur: 10.9, targetCostEur: 3.9, marginPct: 64, repurchase: 'moyen', strategic: 'Classique du coil-out, permet des boucles nettes sans chaleur.', pairsWith: ['p12', 'p30'] },
  { id: 'p41', name: 'Éponge twist / curl sponge (cheveux courts, hommes, freeform)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '4A-4C', problem: 'Coiffage long et difficile des cheveux très courts / début de locs', retailPriceEur: 8.9, targetCostEur: 3.1, marginPct: 65, repurchase: 'moyen', strategic: 'Très forte demande hommes et cheveux courts, élargit la clientèle, best-seller TikTok.', pairsWith: ['p14', 'p29'] },
  { id: 'p42', name: 'Outil interlocking / aiguille d’entretien des locs', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '4A-4C', problem: 'Entretien des locks/vanilles coûteux en salon, repousses difficiles à resserrer', retailPriceEur: 9.9, targetCostEur: 3.5, marginPct: 65, repurchase: 'moyen', strategic: 'Innovation plébiscitée par la communauté locs, autonomie à la maison, niche peu servie.', pairsWith: ['p41', 'p27'] },
  { id: 'p43', name: 'Diffuseur universel pour sèche-cheveux (boucles définies)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Séchage agressif qui déconstruit les boucles et crée du frisottis', retailPriceEur: 14.9, targetCostEur: 5.5, marginPct: 63, repurchase: 'moyen', strategic: 'Attachement essentiel du curly hair, s’adapte à la plupart des sèche-cheveux.', pairsWith: ['p37', 'p13'] },
  { id: 'p44', name: 'Bonnet chauffant soin profond (thermal, micro-ondes)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Masques peu pénétrés, soin profond qui ne « prend » pas', retailPriceEur: 19.9, targetCostEur: 7.5, marginPct: 62, repurchase: 'moyen', strategic: 'Innovation wash day : chaleur indirecte pour ouvrir les écailles, booster des masques.', pairsWith: ['p05', 'p06'] },
  { id: 'p45', name: 'Chouchous satin & spirales sans casse (lot de 5)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Élastiques qui cassent et marquent les cheveux, ponytail qui tire', retailPriceEur: 6.9, targetCostEur: 2.4, marginPct: 65, repurchase: 'moyen', strategic: 'Petit prix, add-on fréquent, protège les longueurs, parfait en cadeau.', pairsWith: ['p17', 'p24'] },
  { id: 'p46', name: 'Durag satin (waves, protection nuit & traction)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '3A-4C', problem: 'Waves qui ne tiennent pas, frottements, coiffure non maintenue la nuit', retailPriceEur: 8.9, targetCostEur: 3.2, marginPct: 64, repurchase: 'moyen', strategic: 'Forte demande hommes/waves et lissage, complète bonnet et headwrap.', pairsWith: ['p27', 'p14'] },

  // ── Appareils & innovations (l’effet « waouh, ils ont ça ») ──
  { id: 'p47', name: 'Steamer portable cheveux (vapeur soin profond, rechargeable)', category: 'Accessoire', brandTarget: 'Device KURLA', hairType: '3A-4C', problem: 'Soins qui ne pénètrent pas sur cheveu très crépu, faible porosité', retailPriceEur: 99.9, targetCostEur: 42.0, marginPct: 58, repurchase: 'moyen', strategic: 'Produit vitrine (« ils ont même un steamer ! »), vapeur qui ouvre les écailles, ticket élevé et marge forte.', pairsWith: ['p05', 'p44'] },
  { id: 'p48', name: 'Brosse vapeur nano-mist électrique (anti-frisottis, USB-C)', category: 'Accessoire', brandTarget: 'Device KURLA', hairType: '3A-4C', problem: 'Frisottis et sécheresse entre deux lavages, hydratation qui ne tient pas', retailPriceEur: 34.9, targetCostEur: 15.0, marginPct: 57, repurchase: 'moyen', strategic: 'Innovation virale 2026 (brosse brume/vapeur), refresh et lissage sans chaleur forte.', pairsWith: ['p32', 'p18'] },
  { id: 'p49', name: 'Masseur cuir chevelu électrique 3-en-1 (vibration + applicateur huile)', category: 'Accessoire', brandTarget: 'Device KURLA', hairType: '3A-4C', problem: 'Application des huiles racine imprécise, cuir chevelu peu stimulé', retailPriceEur: 24.9, targetCostEur: 10.5, marginPct: 58, repurchase: 'moyen', strategic: 'Tendance scalp-care : distribue l’huile ET masse, étanche, rechargeable.', pairsWith: ['p28', 'p31'] },
  { id: 'p50', name: 'Kit African threading (fil coton + peigne, étirement sans chaleur)', category: 'Accessoire', brandTarget: 'Accessoire KURLA', hairType: '4A-4C', problem: 'Étirement des cheveux crépus sans défrisage ni chaleur', retailPriceEur: 11.9, targetCostEur: 4.0, marginPct: 66, repurchase: 'moyen', strategic: 'Technique africaine traditionnelle revisitée (tendance), forte identité culturelle, peu vendue en ligne EU.', pairsWith: ['p23', 'p08'] },

  // ── Soins tendance & innovations cosmétiques (consommables) ──
  { id: 'p51', name: 'Spray thermo-protecteur chaleur (200 ml, sans rinçage)', category: 'Leave-in', brandTarget: 'Private label KURLA', hairType: '3A-4C', problem: 'Cheveux abîmés par le diffuseur, fer ou brushing (silk press)', retailPriceEur: 12.9, targetCostEur: 7.1, marginPct: 45, repurchase: 'fort', strategic: 'Indissociable des outils chauffants (p43/p48), fort réachat, complète le styling.', pairsWith: ['p43', 'p48'] },
  { id: 'p52', name: 'Soin reconstructeur de liens (bond builder, 100 ml)', category: 'Masque', brandTarget: 'Private label KURLA', hairType: '3A-4C', problem: 'Cheveux très abîmés, cassants, sur-traités (colorations, chaleur)', retailPriceEur: 19.9, targetCostEur: 10.9, marginPct: 45, repurchase: 'moyen', strategic: 'Innovation type bond-repair (tendance Olaplex), bouchon de gamme soin, marge € forte.', pairsWith: ['p06', 'p05'] },
  { id: 'p53', name: 'Eau de romarin tonique pousse & cuir chevelu (150 ml)', category: 'Huile/Beurre', brandTarget: 'Private label KURLA', hairType: '3A-4C', problem: 'Pousse lente, cuir chevelu à stimuler, tempes clairsemées (tendance romarin)', retailPriceEur: 13.9, targetCostEur: 5.5, marginPct: 60, repurchase: 'fort', strategic: 'Produit viral (« rosemary water »), répond à la demande pousse, se vaporise au quotidien.', pairsWith: ['p28', 'p36'] },
  { id: 'p54', name: 'Rinçage purifiant vinaigre de cidre & aloe (scalp toner, 250 ml)', category: 'Shampoing', brandTarget: 'Private label KURLA', hairType: '3A-4C', problem: 'Cuir chevelu gras, résidus, démangeaisons, pH déséquilibré après shampoing', retailPriceEur: 12.9, targetCostEur: 7.1, marginPct: 45, repurchase: 'moyen', strategic: 'Soin du cuir chevelu en vogue (ACV rinse), usage 1x/2 sem, complète clarifiant et gommage.', pairsWith: ['p02', 'p33'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// CORRECTION AUDIT 2026-09-02 — MARGES RÉELLES (HT, TVA 20 % déduite).
// Les `marginPct` déclarés ci-dessus étaient calculés sur le PRIX TTC
// ((TTC − coût HT) / TTC ≈ 45 %). C'est faux : la TVA collectée (20 %) n'est
// pas de la marge. La marge brute réelle se calcule sur le prix HT :
//   marge = (TTC/1,20 − coût HT) / (TTC/1,20).
// Conséquence : les produits « 45 % » sont en réalité à ~34 %, les accessoires
// « 63-67 % » à ~56-60 %. Toute décision de pricing, de CAC cible et de
// scénario financier doit partir de ces valeurs corrigées — sinon chaque
// commande peut être vendue à perte sans que personne ne le voie.
// ─────────────────────────────────────────────────────────────────────────────
export const LAUNCH_VAT_RATE = 1.2;
LAUNCH_PRODUCTS.forEach(p => {
  const priceHt = p.retailPriceEur / LAUNCH_VAT_RATE;
  p.marginPct = Math.round(((priceHt - p.targetCostEur) / priceHt) * 100);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6 KITS DE LANCEMENT
// ─────────────────────────────────────────────────────────────────────────────

export type LaunchKit = {
  id: string; name: string; tier: 'ENTRY' | 'CORE' | 'PREMIUM';
  hairType: string; goal: string; clientTarget: string;
  productIds: string[]; retailPriceEur: number; kitPriceEur: number;
  marginEur: number; strategic: string; complement: string;
};

function kitFrom(ids: string[], price: number): { sumRetail: number; sumCost: number } {
  const rows = LAUNCH_PRODUCTS.filter(p => ids.includes(p.id));
  return {
    sumRetail: Math.round(rows.reduce((s, p) => s + p.retailPriceEur, 0) * 100) / 100,
    sumCost: Math.round(rows.reduce((s, p) => s + p.targetCostEur, 0) * 100) / 100,
  };
}

function makeKit(k: Omit<LaunchKit, 'retailPriceEur' | 'marginEur'>): LaunchKit {
  const { sumRetail, sumCost } = kitFrom(k.productIds, k.kitPriceEur);
  // CORRECTION AUDIT 2026-09-02 : la marge d'un kit se calcule sur le prix HT
  // (prix TTC / 1,20), pas sur le prix TTC — la TVA n'est pas de la marge.
  const kitPriceHt = k.kitPriceEur / LAUNCH_VAT_RATE;
  return { ...k, retailPriceEur: sumRetail, marginEur: Math.round((kitPriceHt - sumCost) * 100) / 100 };
}

export const LAUNCH_KITS: LaunchKit[] = [
  makeKit({
    id: 'k01', name: 'KIT 01 — Premiers pas bouclés (3A/3B)', tier: 'ENTRY',
    hairType: '3A-3B', goal: 'Lancer une routine simple sans assécher', clientTarget: 'Inès (curieuse, budget serré), novices',
    productIds: ['p01', 'p04', 'p07', 'p13'], kitPriceEur: 49.9,
    strategic: 'Porte d’entrée tarifaire, conversion des novices.', complement: 'p17 (bonnet satin), p11 (sérum)',
  }),
  makeKit({
    id: 'k02', name: 'KIT 02 — Hydratation & définition (3C/4A)', tier: 'CORE',
    hairType: '3C-4A', goal: 'Hydratation durable et boucles définies', clientTarget: 'Aminata débutante, bouclé-crépu',
    productIds: ['p01', 'p04', 'p08', 'p13', 'p11'], kitPriceEur: 64.9,
    strategic: 'Kit central, meilleur compromis marge/volume, star des reco.', complement: 'p16 (peigne), p17 (bonnet)',
  }),
  makeKit({
    id: 'k03', name: 'KIT 03 — Nutrition profonde crépue (4B/4C)', tier: 'CORE',
    hairType: '4B-4C', goal: 'Nourrir et sceller l’hydratation des cheveux très crépus', clientTarget: 'Aminata (cible n°1), 4C',
    productIds: ['p03', 'p05', 'p08', 'p09', 'p12'], kitPriceEur: 69.9,
    strategic: 'Répond au besoin le plus douloureux des 4C ; forte valeur perçue.', complement: 'p17, p10 (huile ricin)',
  }),
  makeKit({
    id: 'k04', name: 'KIT 04 — Réparation & pousse (cheveux abîmés)', tier: 'PREMIUM',
    hairType: '3A-4C', goal: 'Reconstruire cheveux cassants/fourches, soutenir la pousse', clientTarget: 'Camille & Aminata, cheveux abîmés',
    productIds: ['p06', 'p05', 'p10', 'p11', 'p07'], kitPriceEur: 74.9,
    strategic: 'Montée en gamme, panier premium, marge absolue élevée.', complement: 'p17 (bonnet), p18 (vaporisateur)',
  }),
  makeKit({
    id: 'k05', name: 'KIT 05 — Coiffures protectrices (twist/tresses)', tier: 'CORE',
    hairType: '3C-4C', goal: 'Réussir twist-out, braid-out et coiffures qui tiennent', clientTarget: 'Pros & clientes coiffures protectrices',
    productIds: ['p08', 'p12', 'p14', 'p17'], kitPriceEur: 49.9,
    strategic: 'Forte adéquation contenu TikTok (tutos coiffure).', complement: 'p18 (vaporisateur refresh)',
  }),
  makeKit({
    id: 'k06', name: 'KIT 06 — Routine complète 4C (toute la ligne)', tier: 'PREMIUM',
    hairType: '4A-4C', goal: 'La routine complète clé en main, zéro décision à prendre', clientTarget: 'Aminata « je veux que ça marche », cadeau',
    productIds: ['p03', 'p05', 'p08', 'p09', 'p12', 'p14', 'p17'], kitPriceEur: 89.9,
    strategic: 'Panier maximal, offre « cadeau », référence premium de la marque.', complement: 'KURLA+ (suivi de routine offert 1 mois)',
  }),
  makeKit({
    id: 'k07', name: 'KIT 07 — Outils wash day essentiels', tier: 'ENTRY',
    hairType: '3A-4C', goal: 'Tout le matériel pour un wash day sans casse et un brushing bouclé net', clientTarget: 'Novices et celles qui rachètent des outils à l’unité, cadeau',
    productIds: ['p16', 'p19', 'p20', 'p21', 'p23', 'p18', 'p17'], kitPriceEur: 49.9,
    strategic: 'Assemble 7 accessoires à haute marge (65,30 € à l’unité → 49,90 €), marge ~53 %. Porte d’entrée matériel, parfait en cadeau et en montée de panier.', complement: 'p25 (bonnet douche), p24 (foulard), p22 (bigoudis heatless)',
  }),
  makeKit({
    id: 'k08', name: 'KIT 08 — Entretien locs, vanilles & cheveux courts', tier: 'CORE',
    hairType: '4A-4C', goal: 'Resserrer et coiffer ses locs/twists soi-même, les protéger la nuit', clientTarget: 'Hommes et femmes en locs/freeform/vanilles, début de loc',
    productIds: ['p42', 'p41', 'p38', 'p46', 'p27', 'p14'], kitPriceEur: 44.9,
    strategic: 'Niche peu servie en ligne EU (locs + hommes), outils à forte marge ; positionne KURLA comme guichet unique des coiffures protectrices.', complement: 'p49 (masseur électrique), p53 (eau de romarin)',
  }),
  makeKit({
    id: 'k09', name: 'KIT 09 — Boucles sans chaleur (heatless styling)', tier: 'CORE',
    hairType: '3A-4C', goal: 'Obtenir boucles, coils et volume sans fer ni chaleur, de jour comme de nuit', clientTarget: 'Curly qui veulent éviter la chaleur, adepte du heatless',
    productIds: ['p39', 'p40', 'p22', 'p45', 'p35', 'p21'], kitPriceEur: 39.9,
    strategic: 'Tendance heatless + outils à 64-66 % de marge ; éducatif et très partageable sur les réseaux.', complement: 'p43 (diffuseur), p51 (thermo-protecteur si chaleur)',
  }),
  makeKit({
    id: 'k10', name: 'KIT 10 — Soin profond premium (vapeur & scalp care)', tier: 'PREMIUM',
    hairType: '3C-4C', goal: 'Maximiser la pénétration des soins et prendre soin du cuir chevelu', clientTarget: 'Cheveux très secs/faible porosité, clientes prêtes à investir',
    productIds: ['p44', 'p47', 'p36', 'p37', 'p52'], kitPriceEur: 149.9,
    strategic: 'Kit vitrine avec steamer (effet « waouh »), ticket élevé et marge solide ; différencie radicalement de la concurrence.', complement: 'p53 (eau de romarin), p49 (masseur électrique)',
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 5 ROUTINES
// ─────────────────────────────────────────────────────────────────────────────

export type LaunchRoutine = {
  id: string; name: string; profile: string; goal: string;
  steps: { step: string; productId: string }[];
  totalPriceEur: number; budgetAlt: string; premiumAlt: string;
};

export const LAUNCH_ROUTINES: LaunchRoutine[] = [
  {
    id: 'r01', name: 'Routine cheveux secs / déshydratés', profile: '3C-4C, cheveux rêches, manque d’hydratation', goal: 'Hydrater en profondeur et sceller',
    steps: [
      { step: 'Laver', productId: 'p01' }, { step: 'Démêler', productId: 'p04' },
      { step: 'Soin hebdo', productId: 'p05' }, { step: 'Hydrater sans rinçage', productId: 'p08' },
      { step: 'Sceller', productId: 'p09' },
    ],
    totalPriceEur: 0, budgetAlt: 'Remplacer p05 par p04 en usage quotidien (économie ~8 €)', premiumAlt: 'Ajouter p11 sérum (+14,90 €)',
  },
  {
    id: 'r02', name: 'Routine définition boucles (3A/3B/3C)', profile: 'Cheveux bouclés, manque de définition, frisottis', goal: 'Des boucles dessinées sans croûtage',
    steps: [
      { step: 'Laver', productId: 'p01' }, { step: 'Hydrater (leave-in)', productId: 'p07' },
      { step: 'Définir (gel de lin)', productId: 'p13' }, { step: 'Brillance', productId: 'p11' },
    ],
    totalPriceEur: 0, budgetAlt: 'p15 mousse au lieu du gel (−5 €)', premiumAlt: 'Kit K02 complet (64,90 €)',
  },
  {
    id: 'r03', name: 'Routine cheveux crépus 4C (nutrition)', profile: '4B/4C, très secs, besoin de nutrition', goal: 'Nutrir, hydrater et protéger',
    steps: [
      { step: 'Co-wash', productId: 'p03' }, { step: 'Masque nutritif', productId: 'p05' },
      { step: 'Leave-in riche', productId: 'p08' }, { step: 'Beurre de karité', productId: 'p09' },
      { step: 'Coiffage', productId: 'p12' },
    ],
    totalPriceEur: 0, budgetAlt: 'Kit K03 (69,90 €, tout inclus)', premiumAlt: 'Kit K06 routine complète (89,90 €)',
  },
  {
    id: 'r04', name: 'Routine réparation / pousse', profile: 'Cheveux cassants, fourches, chute', goal: 'Reconstruire et stimuler',
    steps: [
      { step: 'Clarifier (1x/2 sem)', productId: 'p02' }, { step: 'Masque protéiné', productId: 'p06' },
      { step: 'Huile de ricin (racines)', productId: 'p10' }, { step: 'Leave-in', productId: 'p07' },
    ],
    totalPriceEur: 0, budgetAlt: 'p05 au lieu de p06 (−1 €) en entretien', premiumAlt: 'Kit K04 (74,90 €)',
  },
  {
    id: 'r05', name: 'Routine refresh / entretien coiffure', profile: 'Tous types, entre deux lavages', goal: 'Raviver hydratation et définition au quotidien',
    steps: [
      { step: 'Vaporiser (eau + leave-in dilué)', productId: 'p18' }, { step: 'Ré-hydrater', productId: 'p08' },
      { step: 'Redéfinir / tenir', productId: 'p14' }, { step: 'Protéger la nuit', productId: 'p17' },
    ],
    totalPriceEur: 0, budgetAlt: 'p07 leave-in léger pour les 3A-3C', premiumAlt: 'Ajouter p11 sérum brillance (+14,90 €)',
  },
];

// Calcul des totaux de routine
LAUNCH_ROUTINES.forEach(r => {
  r.totalPriceEur = Math.round(
    r.steps.reduce((s, st) => s + (LAUNCH_PRODUCTS.find(p => p.id === st.productId)?.retailPriceEur ?? 0), 0) * 100
  ) / 100;
});

// ─────────────────────────────────────────────────────────────────────────────
// OUTILS KURLA — disponibilité au lancement
// ─────────────────────────────────────────────────────────────────────────────

export type LaunchTool = {
  id: string; name: string; atLaunch: boolean; phase: number;
  user: string; problem: string; howItWorks: string;
  userValue: string; businessValue: string; price: 'gratuit' | 'Plus' | 'Pro';
  kpi: string; moment: string;
};

export const LAUNCH_TOOLS: LaunchTool[] = [
  { id: 't01', name: 'Diagnostic cheveux IA', atLaunch: true, phase: 1, user: 'Tous', problem: 'Ne sait pas son type de cheveu ni par où commencer', howItWorks: '5 questions → type de cheveu + besoins + routine recommandée', userValue: 'Un point de départ clair et personnalisé', businessValue: 'Aimant à leads + moteur de recommandation produit', price: 'gratuit', kpi: 'Diagnostics complétés, taux diagnostic→reco', moment: 'Première visite (haut de funnel)' },
  { id: 't02', name: 'Analyse & transparence ingrédients', atLaunch: true, phase: 1, user: 'Tous (Camille)', problem: 'Peur des substances, greenwashing', howItWorks: 'Fiche ingrédient : fonction, restrictions réglementaires, sources', userValue: 'Confiance par la preuve', businessValue: 'Différenciation n°1 + SEO (pages ingrédient)', price: 'gratuit', kpi: 'Pages ingrédient vues, temps passé', moment: 'Avant achat (réassurance)' },
  { id: 't03', name: 'Générateur de routine', atLaunch: true, phase: 1, user: 'Tous', problem: 'Sélection paralysante', howItWorks: 'Recommande une routine + kit concret selon le diagnostic', userValue: 'Zéro décision à prendre', businessValue: 'Dirige vers les kits (AOV élevé)', price: 'gratuit', kpi: 'Taux reco→panier', moment: 'Après le diagnostic' },
  { id: 't04', name: 'Recherche intelligente (ingrédients/produits)', atLaunch: true, phase: 1, user: 'Tous', problem: 'Trouver le bon produit/ingrédient', howItWorks: 'Recherche sémantique cheveu + ingrédient', userValue: 'Réponse immédiate', businessValue: 'Rétention + SEO', price: 'gratuit', kpi: 'Recherches, taux de clic résultat', moment: 'Tout le parcours' },
  { id: 't05', name: 'Beauty Advisor (conseiller IA conversationnel)', atLaunch: true, phase: 1, user: 'Tous', problem: 'Questions précises sans humain disponible 24/7', howItWorks: 'Chat qui conseille sur la base du graphe ingrédients (cité ses sources)', userValue: 'Réponse honnête instantanée', businessValue: 'Confiance + conversion assistée', price: 'gratuit', kpi: 'Conversations, satisfaction, conversion assistée', moment: 'Hésitation / comparaison' },
  { id: 't06', name: 'Suivi des résultats & historique', atLaunch: false, phase: 2, user: 'Clients actifs', problem: 'Ne sait pas si la routine marche', howItWorks: 'Journal de routine, photos, rappels produits', userValue: 'Progression visible', businessValue: 'Réachat + abonnement KURLA+', price: 'Plus', kpi: 'Rétention, réachat 90 j', moment: 'Post-achat' },
  { id: 't07', name: 'Alertes fin de produit & réappro −10 %', atLaunch: false, phase: 2, user: 'Clients', problem: 'Oubli de racheter, rupture de routine', howItWorks: 'Notification/email quand le produit doit être terminé', userValue: 'Ne jamais tomber à court', businessValue: 'Réachat automatisé', price: 'Plus', kpi: 'Taux de réappro', moment: '6-8 semaines après achat' },
  { id: 't08', name: 'Comparateur de produits', atLaunch: false, phase: 2, user: 'Tous', problem: 'Hésite entre 2 produits', howItWorks: 'Comparaison ingrédients, prix, avis, adaptation cheveu', userValue: 'Choix éclairé', businessValue: 'Réduit l’abandon', price: 'gratuit', kpi: 'Comparaisons → achat', moment: 'Comparaison' },
  { id: 't09', name: 'Diagnostic en fauteuil (pro)', atLaunch: false, phase: 4, user: 'Coiffeurs (Fatou)', problem: 'Conseil à refaire par cliente', howItWorks: 'Outil pro de diagnostic + fiches clientes', userValue: 'Gain de temps, crédibilité', businessValue: 'Abonnement KURLA Pro 49 €/mois', price: 'Pro', kpi: 'Salons abonnés', moment: 'Phase 4' },
  { id: 't10', name: 'Recherche de professionnels', atLaunch: false, phase: 4, user: 'Clientes', problem: 'Trouver un coiffeur compétent cheveu texturé', howItWorks: 'Annuaire de pros vérifiés géolocalisé', userValue: 'Confiance d’adresse', businessValue: 'Marketplace services (commission 15-25 %)', price: 'gratuit', kpi: 'Rendez-vous pris', moment: 'Besoin de prestation' },
  { id: 't11', name: 'Analyse photo du cheveu', atLaunch: false, phase: 3, user: 'Tous', problem: 'Doute sur son type de cheveu', howItWorks: 'Analyse d’image pour affiner le diagnostic', userValue: 'Diagnostic plus précis', businessValue: 'Engagement + data', price: 'gratuit', kpi: 'Utilisation, complétion profil', moment: 'Diagnostic' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ÉCHELLE DES PREMIERS CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

export const FIRST_CLIENTS = [
  {
    milestone: '10 premiers clients', how: 'Réseau direct (fondateur + beta-testeuses communautés cheveux texturés : groupes Facebook « Cheveux crépus », Discord, connaissances).',
    offer: 'Kit K02/K03 à prix de lancement −20 % + diagnostic offert + remboursé si non satisfait à 30 j.', message: '« Je lance KURLA : dis-moi ton type de cheveu, je te prépare ta routine et je te rembourse si ça ne marche pas. »',
    channel: 'DM personnalisés + 10 entretiens utilisateurs', budget: 0, objective: '10 commandes + 10 retours honnêtes + 10 UGC/avis',
  },
  {
    milestone: '100 premiers clients', how: 'TikTok organique (5-7 vidéos/sem) + 4-8 micro-créateurs (2k-50k ab.) en barter/affilié + parrainage 10/10 €.',
    offer: 'Offre de lancement kit −15 % + livraison offerte dès 49 € + 1 mois KURLA+ offert.', message: '« Arrête d’acheter au hasard : 5 questions, ta routine, des produits qui marchent. »',
    channel: 'TikTok/IG + créateurs', budget: '~900 € (créateurs + petit boost)', objective: '100 commandes en 60 j, 20 avis, CAC < 15 €',
  },
  {
    milestone: '1 000 clients', how: 'Système qui tourne : SEO routines/ingrédients (trafic cumulatif) + paid scaling sur les créas UGC validées (ROAS > 2,5) + parrainage.',
    offer: 'Parcours diagnostic→kit optimisé, réachat email, KURLA+ post-achat.', message: 'Le diagnostic comme hook, le kit comme solution.',
    channel: 'SEO + TikTok Ads + créateurs + referral', budget: '~4 000 €/mois à plein régime', objective: '1 000 clients d’ici M6, conversion > 1,5 %',
  },
  {
    milestone: '10 000 clients', how: 'Marque + marché : contenu organique dominant, marque propre (karité KURLA), marketplace tiers, B2B naissant.',
    offer: 'Gamme élargie data-driven, abonnements, programmes de fidélité.', message: 'La référence honnête du cheveu texturé.',
    channel: 'Omnicanal + marque + SEO massif (>100k pages)', budget: '~25 k€/mois', objective: '10 000 clients d’ici M18-24, rentable',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCÉNARIOS FINANCIERS (1 000 visiteurs de base, mensuel, à M3)
// ─────────────────────────────────────────────────────────────────────────────

export type FinanceScenario = {
  id: string; label: string;
  visitors: number; diagRate: number; purchaseRate: number; // purchaseRate = part des visiteurs qui achètent
  orders: number; aov: number; productRevenue: number;
  grossMargin: number; acquisitionCost: number; mrr: number; netResult: number;
  note: string; reference?: boolean;
};

function scen(id: string, label: string, visitors: number, purchaseRate: number, aov: number, marginPct: number, cac: number, mrr: number, note: string, reference = false): FinanceScenario {
  const orders = Math.round(visitors * purchaseRate);
  const productRevenue = Math.round(orders * aov);
  // CORRECTION AUDIT 2026-09-02 : l'AOV est TTC ; la marge brute se calcule
  // sur le revenu HT (TTC / 1,20). `marginPct` est désormais la marge brute
  // réelle sur prix HT (mix kits ≈ 30-34 %, pas 45 %).
  const netRevenue = productRevenue / LAUNCH_VAT_RATE;
  const grossMargin = Math.round(netRevenue * marginPct);
  const acquisitionCost = Math.round(orders * cac);
  const fixed = 700; // tech + frais fixes mensuels d’amorçage
  const netResult = grossMargin + mrr - acquisitionCost - fixed;
  return { id, label, visitors, diagRate: 0.2, purchaseRate, orders, aov, productRevenue, grossMargin, acquisitionCost, mrr, netResult, note, ...(reference ? { reference: true } : {}) };
}

export const FINANCE_SCENARIOS: FinanceScenario[] = [
  scen('pru', 'PRUDENT', 1000, 0.008, 40, 0.30, 18, 30, 'Conversion 0,8 %, AOV 40 € TTC, marge HT réelle 30 % (mix kits remisés), CAC 18 €. Le funnel fuit et chaque commande détruit de la valeur.', false),
  scen('cen', 'CENTRAL (référence)', 1000, 0.013, 42, 0.34, 14, 60, 'Conversion 1,3 %, AOV 42 € TTC, marge HT réelle 34 %, CAC 14 €. Même ce scénario reste déficitaire à 1 000 visiteurs : la rentabilité exige plus de trafic, un AOV plus haut ou des coûts d’achat renégociés.', true),
  scen('amb', 'AMBITIEUX', 1000, 0.022, 46, 0.38, 12, 90, 'Conversion 2,2 %, AOV 46 € TTC, marge HT 38 % (plus d’accessoires/devices au panier), CAC 12 €.', false),
];

// ─────────────────────────────────────────────────────────────────────────────
// 20 ACTIONS DE LANCEMENT (file d’exécution du BCC)
// ─────────────────────────────────────────────────────────────────────────────

export const LAUNCH_ACTIONS = [
  { id: 'a01', week: 1, title: 'Activer Stripe live + webhook', owner: 'tech', dep: 'externe (clés Stripe)', kpi: '1 commande payée réelle' },
  { id: 'a02', week: 1, title: 'Dépublier les produits Démo', owner: 'tech', dep: 'validation admin', kpi: '0 produit Démo public' },
  { id: 'a03', week: 1, title: 'Créer la shortlist 6 marques cibles + envoyer 20 demandes de gros (tarifs/MOQ)', owner: 'ops', dep: 'interne', kpi: '20 demandes envoyées' },
  { id: 'a04', week: 2, title: 'Saisir les 18 SKU comme brouillons catalogue (fiche ingrédient + conformité UE)', owner: 'ops/tech', dep: 'grille tarifaire reçue', kpi: '18 SKU en brouillon vérifiés' },
  { id: 'a05', week: 2, title: 'Construire les 6 kits + 5 routines comme offres achetables', owner: 'tech', dep: 'a04', kpi: '6 kits achetables' },
  { id: 'a06', week: 2, title: 'Commander le premier lot (mix kits, ~4-6 k€) après 3 devis comparés', owner: 'ops', dep: 'devis reçus', kpi: 'stock réceptionné' },
  { id: 'a07', week: 3, title: 'Installer analytics + événements funnel (diag/reco/panier/achat)', owner: 'tech', dep: 'interne', kpi: 'entonnoir mesuré' },
  { id: 'a08', week: 3, title: 'Raccourcir le diagnostic à 5 questions + hook en home', owner: 'tech', dep: 'interne', kpi: 'diagRate > 18 %' },
  { id: 'a09', week: 3, title: 'Mettre les kits K02/K03 en tête des recommandations', owner: 'tech', dep: 'a05', kpi: 'part des kits dans les ventes' },
  { id: 'a10', week: 4, title: 'Produire 10 vidéos de démonstration (banque de contenu)', owner: 'marketing', dep: 'interne', kpi: '10 vidéos prêtes' },
  { id: 'a11', week: 4, title: 'Ouvrir la liste de lancement (landing + email) avec offre −15 %', owner: 'marketing/tech', dep: 'interne', kpi: '100-200 emails' },
  { id: 'a12', week: 4, title: 'Recruter 10 beta-testeuses (réseau) pour les 10 premières commandes', owner: 'marketing', dep: 'a06', kpi: '10 commandes + avis' },
  { id: 'a13', week: 5, title: 'Lancer TikTok 5-7 vidéos/semaine (démos diag + routines)', owner: 'marketing', dep: 'a10', kpi: 'vues → visites' },
  { id: 'a14', week: 5, title: 'Lancer l’offre de lancement (kit −15 % + livraison offerte dès 49 €)', owner: 'marketing', dep: 'a05', kpi: '30-60 commandes' },
  { id: 'a15', week: 6, title: 'Contacter 20 micro-créateurs, signer 4-8 barters/affiliés', owner: 'marketing', dep: 'a10', kpi: 'ventes par code' },
  { id: 'a16', week: 7, title: 'Emails panier abandonné + relances (séquence 3 emails)', owner: 'marketing/tech', dep: 'a07', kpi: 'reprise panier > 10 %' },
  { id: 'a17', week: 8, title: 'Collecter avis + UGC, publier avant/après, répondre aux DM', owner: 'marketing', dep: 'commandes', kpi: '20 avis, 10 UGC' },
  { id: 'a18', week: 9, title: 'Activer parrainage 10/10 € + proposer KURLA+ post-achat', owner: 'tech/marketing', dep: 'a07', kpi: '1ers filleuls, 10-15 Plus' },
  { id: 'a19', week: 10, title: 'Tester 3 créas UGC en paid (petit budget), couper les non-rentables', owner: 'marketing', dep: 'a15', kpi: 'ROAS > 2 sur 1 créa' },
  { id: 'a20', week: 12, title: 'Bilan CAC/LTV par canal, doubler le canal rentable, réassort', owner: 'fondateur', dep: 'data', kpi: 'CAC < LTV/3' },
];

// ─────────────────────────────────────────────────────────────────────────────
// APPROVISIONNEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const SOURCING_PLAN = {
  decision: 'Hybride : revente de marques reconnues (rapide, crédibilité immédiate) + 1 futur héros marque propre (beurre de karité, marge 55 %, sourcing Afrique de l’Ouest) dès que le volume le justifie.',
  brands: ['Aunt Jackie’s', 'Cantu', 'Shea Moisture', 'As I Am', 'Mielle', 'Kinky-Curly', 'Camille Rose', 'Aphogee / Sunny Isle'],
  firstOrder: 'Premier lot ~4-6 k€ HT, focalisé sur les 6 kits (kits = prédiction de la demande, donc risque de stock minimisé). Quantités : 2-3 unités par SKU accessoire, 6-10 par SKU cœur de kit.',
  moq: 'MOQ et tarifs à confirmer auprès des distributeurs/grossistes (ex. AfricanFabs, Afro Wholesale identifiés ; aucune condition inventée).',
  storage: 'Stockage initial en interne (fulfillment maison) pour maîtriser coûts et qualité ; passage à un logisticien (3PL) dès ~150 commandes/mois.',
  delivery: 'Livraison suivie FR ; offerte dès 49 € ; points relais + domicile.',
  compliance: 'Chaque SKU exige : fiche ingrédient complète, vérification Règl. (CE) 1223/2009 + Annexes, étiquetage FR, responsabilité personne responsable UE. Aucun produit publié avant vérification (conformité = fichier + date).',
  returns: 'Retours 30 jours satisfait-ou-remboursé sur les 100 premières commandes (outil de confiance + retour d’expérience).',
};
