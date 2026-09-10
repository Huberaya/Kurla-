/**
 * GAMME PEAU KURLA — source de vérité des fiches produits « formulation interne »
 * =============================================================================
 *
 * Pourquoi ce fichier existe, et pourquoi il est en TypeScript et non en SQL :
 *
 * Le catalogue peau publié comptait 3 références (nettoyant, crème, SPF), alors
 * que l'application recommande 7 produits différents (`PEAU_KITS`) et que les
 * profils de connaissance (`knowledge/skin.ts`) en citent 7 autres. Quatre des
 * produits recommandés n'existaient nulle part dans la boutique : la
 * recommandation était non achetable par construction, quel que soit le
 * sourcing.
 *
 * Cette gamme complète donc les étapes manquantes — traitement (niacinamide,
 * azélaïque, tranexamique, vitamine C, rétinol doux), exfoliation, hydratation
 * légère, soin local, SPF teinté — pour que chaque grande préoccupation
 * (acné, taches, sécheresse, sensibilité, maturité, éclat) dispose d'une
 * routine complète nettoyant → traitement → SPF.
 *
 * Les fiches sont décrites ici (typées, testables) et la migration SQL en est
 * dérivée par `scripts/generate-skin-range-sql.ts`. Une fois la migration
 * appliquée, la base redevient la source de vérité à l'exécution : ce fichier
 * sert de référence et de banc de test, jamais de lecture en production.
 *
 * Deux règles tenues dans ces fiches, par choix :
 *
 * 1. Aucune allégation thérapeutique. « Atténue », « uniformise », « protège »,
 *    jamais « traite », « guérit », « élimine ». Une crème n'est pas un
 *    médicament et le règlement cosmétique européen (CE 1223/2009) l'interdit.
 *
 * 2. Les INCI ci-dessous sont des formules cibles, pas des formules
 *    industrialisées. Tant que le lot n'est pas fabriqué, `source_supplier`
 *    le dit explicitement. Un INCI n'est pas une preuve d'existence.
 */

export type SkinRangeStepGroup = 'nettoyant' | 'traitement' | 'hydratant' | 'spf';

export interface SkinRangeProduct {
  /** Identifiant stable, dans la continuité de `peau-ess-001/002/003`. */
  id: string;
  slug: string;
  name: string;
  brand: string;
  /** Prix TTC en euros. */
  price: number;
  subcategory: string;
  routineStep: string;
  stepGroup: SkinRangeStepGroup;
  sizeLabel: string;
  texture: string;
  usageFrequency: string;
  benefitPrimary: string;
  description: string;
  howToUse: string;
  forWho: string;
  notIdealIf: string;
  /** Formule cible en nomenclature INCI. */
  inci: string;
  keyIngredients: string[];
  /** Codes de besoins reconnus par `RECOGNIZED_NEED_CODES` (kurlaFit). */
  concerns: string[];
  skinTypes: string[];
  badges: string[];
  /** Mention de prudence affichée telle quelle. Absente = aucune. */
  warnings?: string;
}

/** Préfixe commun aux produits non encore fabriqués. */
const SUPPLIER = 'KURLA Skincare — formulation interne (précommande)';

export const KURLA_SKIN_RANGE: SkinRangeProduct[] = [
  {
    id: 'peau-ess-004',
    slug: 'eau-micellaire-apaisante-sans-parfum-200ml',
    name: 'Eau Micellaire Apaisante Sans Parfum — 200ml',
    brand: 'KURLA Skincare',
    price: 11.9,
    subcategory: 'Nettoyage',
    routineStep: 'Nettoyant doux',
    stepGroup: 'nettoyant',
    sizeLabel: '200ml',
    texture: 'Liquide aqueux, aucun film après passage',
    usageFrequency: 'Matin et soir',
    benefitPrimary: 'Démaquille et nettoie sans frotter ni décapper',
    description:
      'Nettoyage sans rinçage, sans parfum ni alcool : les micelles captent maquillage et filtres solaires sans décoller la barrière cutanée. Panthénol et allantoïne limitent l’échauffement après le passage du coton, ce qui compte sur les peaux réactives.',
    howToUse:
      'Imbiber un coton, passer sans frotter, renouveler jusqu’à ce que le coton reste propre. Sans rinçage. Peut précéder le gel nettoyant le soir en cas de SPF ou de maquillage.',
    forWho: 'Peaux sensibles, réactives ou sèches ; yeux sensibles ; routines doubles nettoyages.',
    notIdealIf: 'Maquillage très couvrant ou SPF résistant à l’eau : préférer un démaquillage huileux.',
    inci: 'Aqua, Glycerin, Polyglyceryl-4 Caprate, Panthenol, Allantoin, Bisabolol, Sodium Benzoate, Citric Acid',
    keyIngredients: ['Glycérine Végétale', 'Panthénol', 'Allantoïne', 'Bisabolol'],
    concerns: ['hydrater_peau', 'peau_sensible'],
    skinTypes: ['mixte', 'seche', 'sensible'],
    badges: ['preorder', 'sans-parfum'],
  },
  {
    id: 'peau-ess-005',
    slug: 'exfoliant-aha-bha-1x-semaine-30ml',
    name: 'Exfoliant AHA/BHA 1×/semaine — 30ml',
    brand: 'KURLA Skincare',
    price: 17.9,
    subcategory: 'Exfoliation',
    routineStep: 'Exfoliant doux',
    stepGroup: 'traitement',
    sizeLabel: '30ml',
    texture: 'Liquide fluide, absorption rapide',
    usageFrequency: 'Une fois par semaine, le soir',
    benefitPrimary: 'Désépaissit le grain et atténue les marques en surface',
    description:
      'Glycolique et lactique travaillent en surface, l’acide salicylique dégage le pore. Sur peau mélaninée, l’enjeu n’est pas la puissance mais la retenue : une exfoliation agressive déclenche une inflammation, et l’inflammation est précisément ce qui fabrique les taches. Une fois par semaine, pas davantage.',
    howToUse:
      'Le soir, sur peau sèche et propre. Attendre 10 minutes avant le sérum hydratant. Ne jamais associer le même soir au rétinol ou à la vitamine C. SPF 50 obligatoire le lendemain.',
    forWho: 'Grain irrégulier, marques post-imperfections, teint terne, pores visibles.',
    notIdealIf: 'Peau sensible ou irritée, barrière abîmée, grossesse (acide salicylique), avant une exposition solaire.',
    inci: 'Aqua, Glycolic Acid, Lactic Acid, Salicylic Acid, Glycerin, Panthenol, Sodium Hydroxide, Allantoin, Xanthan Gum, Phenoxyethanol',
    keyIngredients: ['Acide Glycolique', 'Acide Lactique', 'Acide Salicylique', 'Panthénol'],
    concerns: ['eclat_teint_terne', 'taches_hyperpigmentation', 'imperfections_acne'],
    skinTypes: ['mixte', 'grasse'],
    badges: ['preorder', 'sans-parfum', 'actif-doux'],
    warnings:
      'Actif exfoliant : une fois par semaine au départ, jamais le même soir qu’un rétinol. Photosensibilisant — SPF 50 quotidien indispensable.',
  },
  {
    id: 'peau-ess-006',
    slug: 'serum-niacinamide-5-30ml',
    name: 'Sérum Niacinamide 5% — 30ml',
    brand: 'KURLA Skincare',
    price: 15.9,
    subcategory: 'Traitement',
    routineStep: 'Sérum niacinamide',
    stepGroup: 'traitement',
    sizeLabel: '30ml',
    texture: 'Sérum aqueux léger, fini non gras',
    usageFrequency: 'Matin et soir',
    benefitPrimary: 'Apaise les imperfections et resserre le grain',
    description:
      'La niacinamide à 5 % — volontairement sous les 10 % courants, mieux tolérés par les peaux réactives — associée au zinc, qui régule l’excès de sébum. C’est l’actif le mieux documenté sur les peaux riches en mélanine pour les marques post-inflammatoires, sans photosensibilisation.',
    howToUse:
      '3 à 4 gouttes sur peau propre et légèrement humide, avant la crème. Matin et soir. Compatible avec tous les autres actifs de la gamme.',
    forWho: 'Imperfections, pores visibles, brillance, marques post-acné, peaux qui supportent mal les acides.',
    notIdealIf: 'Aucune contre-indication particulière ; une sensation de picotement passagère est possible.',
    inci: 'Aqua, Niacinamide, Glycerin, Zinc PCA, Panthenol, Betaine, Sodium Hyaluronate, Xanthan Gum, Phenoxyethanol',
    keyIngredients: ['Niacinamide 5%', 'Zinc PCA', 'Panthénol', 'Bétaïne'],
    concerns: ['imperfections_acne', 'taches_hyperpigmentation', 'eclat_teint_terne'],
    skinTypes: ['mixte', 'grasse', 'sensible'],
    badges: ['preorder', 'sans-parfum'],
  },
  {
    id: 'peau-ess-007',
    slug: 'serum-acide-azelaique-10-30ml',
    name: 'Sérum Acide Azélaïque 10% — 30ml',
    brand: 'KURLA Skincare',
    price: 18.9,
    subcategory: 'Traitement',
    routineStep: 'Sérum acide azélaïque',
    stepGroup: 'traitement',
    sizeLabel: '30ml',
    texture: 'Sérum-crème, fini naturel',
    usageFrequency: 'Matin et soir',
    benefitPrimary: 'Imperfections et marques pigmentaires, sans irritation',
    description:
      'L’acide azélaïque cumule trois effets utiles sur les peaux mélaninées : il calme l’inflammation des boutons, il freine la production de mélanine (donc les marques qui suivent) et il n’est pas photosensibilisant. C’est l’actif le plus sûr quand il faut agir sans abîmer.',
    howToUse:
      'Une noisette sur peau propre, matin et soir, avant la crème. Peut s’utiliser sur l’ensemble du visage ou en local. Pas de contre-indication avec le SPF.',
    forWho: 'Imperfections associées à des marques, rougeurs, peaux sensibles qui ne tolèrent pas les acides exfoliants.',
    notIdealIf: 'Peau très réactive en poussée : introduire un soir sur deux pendant deux semaines.',
    inci: 'Aqua, Azelaic Acid, Glycerin, Propanediol, Squalane, Niacinamide, Panthenol, Xanthan Gum, Phenoxyethanol',
    keyIngredients: ['Acide Azélaïque 10%', 'Squalane Végétal', 'Niacinamide', 'Panthénol'],
    concerns: ['imperfections_acne', 'taches_hyperpigmentation', 'peau_sensible'],
    skinTypes: ['mixte', 'grasse', 'sensible', 'seche'],
    badges: ['preorder', 'sans-parfum'],
  },
  {
    id: 'peau-ess-008',
    slug: 'serum-acide-tranexamique-3-alpha-arbutine-2-30ml',
    name: 'Sérum Acide Tranexamique 3% + Alpha-Arbutine 2% — 30ml',
    brand: 'KURLA Skincare',
    price: 24.9,
    subcategory: 'Éclat & Uniformité',
    routineStep: 'Sérum anti-taches',
    stepGroup: 'traitement',
    sizeLabel: '30ml',
    texture: 'Sérum fluide, fini mat',
    usageFrequency: 'Matin et soir',
    benefitPrimary: 'Atténue les taches installées sans agresser',
    description:
      'L’acide tranexamique agit en amont de la tache, sur le signal qui déclenche la production de mélanine ; l’alpha-arbutine ralentit l’enzyme qui la fabrique. Ce couple travaille là où l’hydroquinone — interdite en cosmétique en Europe — n’est pas une option, et sans la photosensibilisation des acides exfoliants.',
    howToUse:
      '4 gouttes matin et soir sur peau propre, sur l’ensemble du visage ou sur les zones marquées. Les résultats se mesurent en semaines, pas en jours : compter 8 à 12 semaines.',
    forWho: 'Taches installées, marques post-imperfections persistantes, teint non uniforme.',
    notIdealIf: 'Aucune contre-indication ; sans effet sur les taches très anciennes et profondes, qui relèvent d’un avis dermatologique.',
    inci: 'Aqua, Tranexamic Acid, Alpha-Arbutin, Glycerin, Niacinamide, Sodium Hyaluronate, Panthenol, Glycyrrhiza Glabra Root Extract, Xanthan Gum, Phenoxyethanol',
    keyIngredients: ['Acide Tranexamique 3%', 'Alpha-Arbutine 2%', 'Extrait de Réglisse', 'Niacinamide'],
    concerns: ['taches_hyperpigmentation', 'eclat_teint_terne'],
    skinTypes: ['mixte', 'grasse', 'seche', 'sensible'],
    badges: ['preorder', 'sans-parfum'],
    warnings:
      'Les résultats sont progressifs : 8 à 12 semaines d’usage régulier. Une tache qui change d’aspect, de taille ou de couleur relève d’un avis médical, pas d’un soin.',
  },
  {
    id: 'peau-ess-009',
    slug: 'serum-vitamine-c-stabilisee-10-30ml',
    name: 'Sérum Vitamine C Stabilisée 10% — 30ml',
    brand: 'KURLA Skincare',
    price: 22.9,
    subcategory: 'Éclat & Uniformité',
    routineStep: 'Sérum vitamine C',
    stepGroup: 'traitement',
    sizeLabel: '30ml',
    texture: 'Sérum aqueux, fini sec',
    usageFrequency: 'Le matin',
    benefitPrimary: 'Éclat, teint uniforme, antioxydant sous le SPF',
    description:
      'Forme stabilisée de vitamine C (3-O-éthyl ascorbique), qui ne s’oxyde pas à la lumière comme l’acide ascorbique pur — un point décisif pour un produit vendu en flacon transparent. Associée à l’acide férulique et à la vitamine E, elle renforce l’action du SPF contre les UV, ce qui est la vraie raison de la mettre le matin.',
    howToUse:
      '4 gouttes le matin, sur peau propre et sèche, avant la crème et le SPF. Introduire un matin sur deux la première semaine. À conserver à l’abri de la lumière.',
    forWho: 'Teint terne, manque d’éclat, teint non uniforme, exposition urbaine et solaire.',
    notIdealIf: 'Peau irritée ou barrière abîmée : attendre la réparation avant d’introduire un antioxydant acide.',
    inci: 'Aqua, 3-O-Ethyl Ascorbic Acid, Glycerin, Ferulic Acid, Tocopherol, Sodium Hyaluronate, Panthenol, Sodium Metabisulfite, Xanthan Gum, Phenoxyethanol',
    keyIngredients: ['Vitamine C Stabilisée 10%', 'Acide Férulique', 'Vitamine E', 'Acide Hyaluronique'],
    concerns: ['eclat_teint_terne', 'taches_hyperpigmentation', 'maturite_rides'],
    skinTypes: ['mixte', 'grasse', 'normale'],
    badges: ['preorder', 'sans-parfum'],
    warnings:
      'Le matin uniquement, toujours suivi d’un SPF 50. Une légère sensation de picotement à l’application est fréquente les premiers jours.',
  },
  {
    id: 'peau-ess-010',
    slug: 'serum-retinol-doux-03-capsule-30ml',
    name: 'Sérum Rétinol Doux 0,3% Capsulé — 30ml',
    brand: 'KURLA Skincare',
    price: 26.9,
    subcategory: 'Traitement',
    routineStep: 'Sérum rétinol doux',
    stepGroup: 'traitement',
    sizeLabel: '30ml',
    texture: 'Sérum-crème onctueux, fini confortable',
    usageFrequency: 'Le soir, 2 soirs par semaine au départ',
    benefitPrimary: 'Rides, grain, marques — avec une tolérance progressive',
    description:
      'Rétinol encapsulé : la libération est lente, ce qui réduit les picotements et la desquamation sans renoncer à l’effet. Le dosage à 0,3 % est un dosage d’entrée, pas un dosage d’entretien — c’est délibéré, la majorité des abandons de rétinol viennent d’une montée trop rapide.',
    howToUse:
      'Le soir uniquement, sur peau sèche, 2 soirs par semaine pendant 3 semaines, puis augmenter d’un soir toutes les 3 semaines selon tolérance. Hydrater généreusement. SPF 50 impératif chaque matin.',
    forWho: 'Rides et ridules, grain irrégulier, marques pigmentaires installées, imperfections persistantes.',
    notIdealIf:
      'Grossesse et allaitement (contre-indication absolue). Peau sensible en poussée. À ne jamais associer le même soir à un exfoliant AHA/BHA.',
    inci: 'Aqua, Glycerin, Caprylic/Capric Triglyceride, Retinol, Hydroxypinacolone Retinoate, Ceramide NP, Squalane, Tocopherol, Polysorbate 20, Phenoxyethanol',
    keyIngredients: ['Rétinol Encapsulé 0,3%', 'Céramides NP', 'Squalane Végétal', 'Vitamine E'],
    concerns: ['maturite_rides', 'taches_hyperpigmentation', 'imperfections_acne'],
    skinTypes: ['mixte', 'grasse', 'normale', 'seche'],
    badges: ['preorder', 'sans-parfum', 'actif-doux'],
    warnings:
      'Contre-indiqué pendant la grossesse et l’allaitement. Le soir uniquement, jamais le même soir qu’un AHA/BHA. Desquamation possible les premières semaines : espacer les applications plutôt qu’arrêter.',
  },
  {
    id: 'peau-ess-011',
    slug: 'gel-acide-hyaluronique-30ml',
    name: 'Gel Acide Hyaluronique — 30ml',
    brand: 'KURLA Skincare',
    price: 14.9,
    subcategory: 'Hydratation',
    routineStep: 'Gel hydratant',
    stepGroup: 'traitement',
    sizeLabel: '30ml',
    texture: 'Gel frais, fini non gras, sans effet collant',
    usageFrequency: 'Matin et soir',
    benefitPrimary: 'Hydrate sans graisser ni charger les pores',
    description:
      'Acide hyaluronique de deux poids moléculaires : le haut poids moléculaire retient l’eau en surface, le bas poids moléculaire pénètre davantage. Sans corps gras, ce qui en fait l’hydratant des peaux à imperfections qui ne supportent pas les crèmes riches.',
    howToUse:
      '2 à 3 pressions sur peau humide — l’acide hyaluronique a besoin d’eau pour fonctionner, sinon il assèche. Refermer aussitôt avec la crème.',
    forWho: 'Peaux mixtes à grasses, déshydratées, à imperfections, ou toute peau en climat chaud et humide.',
    notIdealIf: 'Peau très sèche en hiver : insuffisant seul, à associer à la crème céramides.',
    inci: 'Aqua, Sodium Hyaluronate, Glycerin, Panthenol, Betaine, Allantoin, Xanthan Gum, Phenoxyethanol',
    keyIngredients: ['Acide Hyaluronique', 'Glycérine Végétale', 'Panthénol', 'Allantoïne'],
    concerns: ['hydrater_peau', 'barriere_cutanee', 'imperfections_acne'],
    skinTypes: ['mixte', 'grasse', 'sensible', 'seche'],
    badges: ['preorder', 'sans-parfum'],
    warnings:
      'Toujours appliquer sur peau humide et refermer avec une crème : seul sur peau sèche, un gel d’acide hyaluronique peut accentuer la déshydratation.',
  },
  {
    id: 'peau-ess-012',
    slug: 'creme-riche-ceramides-peaux-tres-seches-50ml',
    name: 'Crème Riche Céramides Peaux Très Sèches — 50ml',
    brand: 'KURLA Skincare',
    price: 19.9,
    subcategory: 'Hydratation',
    routineStep: 'Hydratant céramides',
    stepGroup: 'hydratant',
    sizeLabel: '50ml',
    texture: 'Baume fondant, fini nourrissant sans film gras',
    usageFrequency: 'Matin et soir',
    benefitPrimary: 'Restaure la barrière et stoppe les tiraillements',
    description:
      'Trois céramides, cholestérol et squalane dans les proportions du ciment lipidique cutané, plus du beurre de karité pour l’occlusion. Sans parfum, parce qu’une peau qui tiraille est une peau dont la barrière est perméable — et donc réactive au parfum.',
    howToUse:
      'Une noisette matin et soir, sur peau légèrement humide. Peut s’appliquer en couche épaisse le soir en cas de tiraillements marqués.',
    forWho: 'Peaux très sèches à atopiques, tiraillements, desquamation, peaux matures, climats froids et secs.',
    notIdealIf: 'Peaux grasses à imperfections : préférer le gel acide hyaluronique.',
    inci: 'Aqua, Glycerin, Caprylic/Capric Triglyceride, Ceramide NP, Ceramide AP, Cholesterol, Squalane, Butyrospermum Parkii Butter, Panthenol, Tocopherol, Phenoxyethanol',
    keyIngredients: ['Céramides NP & AP', 'Cholestérol', 'Beurre de Karité', 'Squalane Végétal'],
    concerns: ['hydrater_peau', 'barriere_cutanee', 'peau_sensible'],
    skinTypes: ['seche', 'tres_seche', 'sensible'],
    badges: ['preorder', 'sans-parfum'],
  },
  {
    id: 'peau-ess-013',
    slug: 'baume-levres-ceramides-10ml',
    name: 'Baume Lèvres Céramides — 10ml',
    brand: 'KURLA Skincare',
    price: 8.9,
    subcategory: 'Hydratation',
    routineStep: 'Baume lèvres',
    stepGroup: 'hydratant',
    sizeLabel: '10ml',
    texture: 'Baume onctueux, fini satiné non collant',
    usageFrequency: 'Aussi souvent que nécessaire',
    benefitPrimary: 'Répare les lèvres gercées durablement',
    description:
      'Les lèvres n’ont pas de glandes sébacées : elles ne se réparent pas seules. Céramides et squalane pour le ciment lipidique, cire d’abeille pour l’occlusion, ricin pour le glissant. Sans menthol ni camphre, deux irritants courants qui entretiennent le cycle « je mets du baume, je remets du baume ».',
    howToUse:
      'Appliquer au besoin, en couche épaisse le soir. Aussi en contour des lèvres.',
    forWho: 'Lèvres gercées, sèches, ou asséchées par un traitement (rétinol, isotrétinoïne).',
    notIdealIf: 'Aucune contre-indication.',
    inci: 'Ricinus Communis Seed Oil, Butyrospermum Parkii Butter, Cera Alba, Ceramide NP, Squalane, Tocopherol',
    keyIngredients: ['Céramides NP', 'Cire d’Abeille', 'Beurre de Karité', 'Squalane Végétal'],
    concerns: ['barriere_cutanee', 'hydrater_peau'],
    skinTypes: ['seche', 'tres_seche', 'sensible'],
    badges: ['preorder', 'sans-parfum'],
  },
  {
    id: 'peau-ess-014',
    slug: 'spf-50-invisible-teinte-40ml',
    name: 'SPF 50+ Invisible Teinté — 40ml',
    brand: 'KURLA Skincare',
    price: 22.9,
    subcategory: 'Protection Solaire',
    routineStep: 'SPF 50+ invisible',
    stepGroup: 'spf',
    sizeLabel: '40ml',
    texture: 'Fluide teinté, fini naturel sans trace blanche',
    usageFrequency: 'Chaque matin, toute l’année',
    benefitPrimary: 'Protège sans trace blanche sur les peaux foncées',
    description:
      'Filtres organiques de nouvelle génération, sans filtre minéral en surface : c’est le trio avobenzone/oxyde de zinc qui produit le voile gris sur les peaux foncées, et il est absent ici. Les oxydes de fer apportent la teinte et protègent aussi contre la lumière visible — celle qui entretient les taches sur les peaux riches en mélanine, et que les SPF classiques ne filtrent pas.',
    howToUse:
      'Deux doigts de produit en dernière étape de la routine du matin, avant le maquillage. Renouveler toutes les 2 heures en cas d’exposition directe.',
    forWho: 'Peaux moyennes à foncées, taches en cours de traitement, exposition quotidienne urbaine.',
    notIdealIf: 'Peaux très claires : la teinte unique peut être trop soutenue.',
    inci: 'Aqua, Ethylhexyl Triazone, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Glycerin, Iron Oxides (CI 77491, CI 77492, CI 77499), Squalane, Tocopherol, Phenoxyethanol',
    keyIngredients: ['Filtres UVA/UVB Nouvelle Génération', 'Oxydes de Fer', 'Squalane Végétal', 'Vitamine E'],
    concerns: ['protection_solaire', 'taches_hyperpigmentation'],
    skinTypes: ['mixte', 'grasse', 'seche', 'sensible', 'foncee'],
    badges: ['preorder', 'sans-parfum', 'invisible'],
    warnings:
      'Aucun produit solaire ne protège à 100 %. Renouveler l’application toutes les 2 heures en exposition directe. Une tache qui évolue relève d’un avis médical.',
  },
  {
    id: 'peau-ess-015',
    slug: 'soin-local-imperfections-bha-2-zinc-15ml',
    name: 'Soin Local Imperfections BHA 2% + Zinc — 15ml',
    brand: 'KURLA Skincare',
    price: 12.9,
    subcategory: 'Traitement',
    routineStep: 'Soin local',
    stepGroup: 'traitement',
    sizeLabel: '15ml',
    texture: 'Gel transparent, séchage rapide',
    usageFrequency: 'Le soir, sur le bouton uniquement',
    benefitPrimary: 'Assèche le bouton sans agresser la zone autour',
    description:
      'Acide salicylique à 2 % et zinc en application localisée, pour ne pas exfolier le reste du visage. Le geste compte autant que la formule : un soin local s’applique sur le bouton, pas sur la joue, et un bouton qu’on perce laisse une marque qui met des mois à s’estomper — c’est le mécanisme principal des taches post-inflammatoires.',
    howToUse:
      'Une touche le soir, sur le bouton propre et sec. Ne pas étaler sur l’ensemble du visage. Laisser sécher.',
    forWho: 'Imperfections localisées, pores obstrués, poussées ponctuelles.',
    notIdealIf: 'Peau irritée autour de la zone, grossesse (acide salicylique), usage sur une grande surface.',
    inci: 'Aqua, Salicylic Acid, Zinc PCA, Niacinamide, Glycerin, Panthenol, Allantoin, Xanthan Gum, Phenoxyethanol',
    keyIngredients: ['Acide Salicylique 2%', 'Zinc PCA', 'Niacinamide', 'Allantoïne'],
    concerns: ['imperfections_acne'],
    skinTypes: ['mixte', 'grasse'],
    badges: ['preorder', 'sans-parfum'],
    warnings:
      'Usage localisé uniquement. Ne pas percer ni triturer : la marque laissée met plusieurs mois à s’estomper, contre quelques jours pour le bouton.',
  },
  {
    id: 'peau-ess-016',
    slug: 'masque-apaisant-barriere-50ml',
    name: 'Masque Apaisant Barrière — 50ml',
    brand: 'KURLA Skincare',
    price: 18.9,
    subcategory: 'Masques',
    routineStep: 'Masque apaisant',
    stepGroup: 'hydratant',
    sizeLabel: '50ml',
    texture: 'Crème épaisse, rinçage facile',
    usageFrequency: '1 à 2 fois par semaine',
    benefitPrimary: 'Calme les irritations et recharge la barrière',
    description:
      'Centella, bisabolol et panthénol pour l’apaisement immédiat, céramides pour la reconstruction lipidique. Pensé pour les soirs où la peau tiraille après un actif un peu trop enthousiaste — c’est le produit de rattrapage de la gamme, pas un soin d’entretien.',
    howToUse:
      'Couche moyenne sur peau propre, 10 minutes, rincer à l’eau tiède. Peut s’utiliser en couche fine laissée toute la nuit sur les zones irritées.',
    forWho: 'Peaux sensibles, réactives, irritées par les actifs (rétinol, acides) ou par le climat.',
    notIdealIf: 'Aucune contre-indication ; sans effet sur les imperfections actives.',
    inci: 'Aqua, Glycerin, Squalane, Ceramide NP, Panthenol, Allantoin, Bisabolol, Centella Asiatica Extract, Butyrospermum Parkii Butter, Phenoxyethanol',
    keyIngredients: ['Centella Asiatica', 'Céramides NP', 'Bisabolol', 'Panthénol'],
    concerns: ['peau_sensible', 'barriere_cutanee', 'hydrater_peau'],
    skinTypes: ['seche', 'sensible', 'mixte'],
    badges: ['preorder', 'sans-parfum'],
  },
];

/** Les six préoccupations que B-01 exige de couvrir. */
export const SKIN_CONCERN_COVERAGE = [
  'imperfections_acne',
  'taches_hyperpigmentation',
  'hydrater_peau',
  'peau_sensible',
  'maturite_rides',
  'eclat_teint_terne',
] as const;

/**
 * Les trois fiches déjà publiées, complétées par cette gamme. Elles vivent en
 * base ; elles sont rappelées ici uniquement pour que le banc de couverture
 * raisonne sur la gamme entière et non sur les seules nouveautés.
 */
export interface SkinRangeEntry {
  id: string;
  name: string;
  routineStep: string;
  stepGroup: SkinRangeStepGroup;
  concerns: string[];
}

export const EXISTING_SKIN_PRODUCTS: SkinRangeEntry[] = [
  { id: 'peau-ess-001', name: 'Gel Nettoyant Doux Sans Parfum — 150ml', routineStep: 'Nettoyant doux', stepGroup: 'nettoyant', concerns: ['hydrater_peau', 'peau_sensible', 'barriere_cutanee'] },
  { id: 'peau-ess-002', name: 'Crème Hydratante Céramides Sans Parfum — 50ml', routineStep: 'Hydratant céramides', stepGroup: 'hydratant', concerns: ['hydrater_peau', 'barriere_cutanee', 'peau_sensible'] },
  { id: 'peau-ess-003', name: 'SPF 50 Invisible Fluide Sans Parfum — 40ml', routineStep: 'SPF 50+ invisible', stepGroup: 'spf', concerns: ['protection_solaire', 'taches_hyperpigmentation', 'hydrater_peau'] },
];

/** Gamme complète : fiches déjà publiées + nouveautés. */
export const FULL_SKIN_RANGE: SkinRangeEntry[] = [
  ...EXISTING_SKIN_PRODUCTS,
  ...KURLA_SKIN_RANGE.map(p => ({ id: p.id, name: p.name, routineStep: p.routineStep, stepGroup: p.stepGroup, concerns: p.concerns })),
];
