/**
 * CHANTIER A — LA CARTE DES CRITÈRES DE MISE EN VENTE.
 *
 * Source unique des critères que le moteur de publication-readiness évalue
 * (src/lib/db/catalogStore.ts : evaluateCatalogPublicationReadiness + porte
 * CPNP + porte de gouvernance sourcing), consommée par l'écran admin
 * « Critères » et par l'automate d'auto-publication (chantier E).
 *
 * Discipline : la carte DECRIE le comportement existant, elle ne le change
 * pas. Chaque entrée porte le `id` = clé de champ que le moteur émet réellement
 * (réconciliation exacte, figée par le banc `kurla_sales_criteria`). Une règle
 * qui change = version bump + banc revu + décision humaine.
 */
export type CriterionFamily = 'legale' | 'editoriale' | 'visuelle' | 'commerciale';
export type CriterionAppliesTo = 'tous' | 'cosmetiques' | 'produits_categorises';

export interface SalesCriterion {
  /** Clé de champ émise par le moteur (réconciliation, jamais un libellé libre). */
  id: string;
  /** Libellé canonique affiché dans l'écran et l'audit. */
  label: string;
  family: CriterionFamily;
  /** Règle en une phrase : ce qui doit être vrai pour que le critère passe. */
  rule: string;
  /** Source de donnée (table/champ, ou « dérivé »). */
  source: string;
  /** Portée : tous les produits / cosmétiques seulement / produits catégorisés. */
  appliesTo: CriterionAppliesTo;
  /** Variantes de libellé que le moteur peut émettre pour ce même critère
   *  (ids cités, état du fournisseur, documents expirés…) — même critère. */
  labelVariants?: string[];
}

export const CRITERION_FAMILIES: Record<CriterionFamily, string> = {
  legale: 'Légale',
  editoriale: 'Éditoriale',
  visuelle: 'Visuelle',
  commerciale: 'Commerciale',
};

/**
 * Version de la carte : inscrite dans chaque décision d'auto-publication
 * (journal d'audit du chantier E). Toute modification des ids/règles = bump.
 */
export const SALES_CRITERIA_VERSION = '1.0.0';

export const SALES_CRITERIA: readonly SalesCriterion[] = [
  // ————— Porte de base (tous les produits) —————
  {
    id: 'is_active',
    label: 'produit désactivé',
    family: 'commerciale',
    rule: 'Le produit doit être actif (is_active = true).',
    source: 'products.is_active',
    appliesTo: 'tous',
  },
  {
    id: 'ingredient_verification_status',
    label: 'composition non vérifié(e)',
    family: 'legale',
    rule: 'La vérification de la composition doit être « verified ».',
    source: 'products.ingredient_verification_status',
    appliesTo: 'tous',
  },
  {
    id: 'claims_validation_status',
    label: 'allégations non vérifié(e)',
    family: 'editoriale',
    rule: 'La vérification des allégations doit être « verified ».',
    source: 'products.claims_validation_status',
    appliesTo: 'tous',
  },
  {
    id: 'images_validation_status',
    label: 'visuels non vérifié(e)',
    family: 'visuelle',
    rule: 'La vérification des visuels doit être « verified ».',
    source: 'products.images_validation_status',
    appliesTo: 'tous',
  },
  {
    id: 'stock_validation_status',
    label: 'stock non vérifié(e)',
    family: 'commerciale',
    rule: 'La vérification du stock doit être « verified ».',
    source: 'products.stock_validation_status',
    appliesTo: 'tous',
    labelVariants: ['stock réel non vérifié'],
  },
  {
    id: 'certifications_validation_status',
    label: 'certifications non vérifié(e)',
    family: 'legale',
    rule: 'La vérification des certifications doit être « verified ».',
    source: 'products.certifications_validation_status',
    appliesTo: 'tous',
  },
  {
    id: 'translations_validation_status',
    label: 'traductions non vérifié(e)',
    family: 'editoriale',
    rule: 'La vérification des traductions doit être « verified ».',
    source: 'products.translations_validation_status',
    appliesTo: 'tous',
  },
  {
    id: 'brand_verification_status',
    label: 'marque non vérifié(e)',
    family: 'editoriale',
    rule: 'La vérification de la marque doit être « verified ».',
    source: 'products.brand_verification_status',
    appliesTo: 'tous',
  },
  {
    id: 'image_ownership_status',
    label: 'droits sur les visuels non établis (brand_provided ou licensed)',
    family: 'legale',
    rule: 'image_ownership_status doit être « brand_provided » ou « licensed ».',
    source: 'products.image_ownership_status',
    appliesTo: 'tous',
    labelVariants: ['droits sur la photo fournisseur non établis'],
  },
  {
    id: 'brand',
    label: 'marque absente',
    family: 'editoriale',
    rule: 'Le champ marque doit être renseigné.',
    source: 'products.brand',
    appliesTo: 'tous',
  },
  {
    id: 'ingredients',
    label: 'composition déclarée vide',
    family: 'legale',
    rule: 'Une liste d’ingrédients ou une chaîne INCI déclarée doit exister.',
    source: 'products.ingredients / products.inci',
    appliesTo: 'tous',
  },
  {
    id: 'images',
    label: 'aucun visuel exploitable',
    family: 'visuelle',
    rule: 'Au moins une image de galerie ou une URL d’image valide.',
    source: 'products.galleryImages / products.image',
    appliesTo: 'tous',
  },
  {
    id: 'country_availability',
    label: 'aucun marché renseigné',
    family: 'commerciale',
    rule: 'Au moins un pays de vente doit être renseigné.',
    source: 'products.country_availability',
    appliesTo: 'tous',
    labelVariants: ['pays de vente absents'],
  },
  {
    id: 'promotion',
    label: 'promotion annoncée mais inactive ou expirée',
    family: 'commerciale',
    rule: 'Une promotion annoncée (is_promo) doit être active à la date courante.',
    source: 'products.is_promo + dates de promotion',
    appliesTo: 'tous',
  },
  {
    id: 'catalog_truth',
    label: 'Incohérence truth layer',
    family: 'commerciale',
    rule: 'La sonde de publication de la truth layer doit être publiquement listable (filet anti-incohérence).',
    source: 'truth layer (dérivé — getCatalogTruth)',
    appliesTo: 'tous',
    labelVariants: ['truth layer : <blocages nommés>'],
  },

  // ————— Porte CPNP (cosmétiques — Règl. 1223/2009) —————
  {
    id: 'supplier_document:cpnp',
    label: 'CPNP+RP+CPSR manquants — aucun fournisseur rattaché',
    family: 'legale',
    rule: 'Un cosmétique doit avoir un fournisseur au titre duquel les trois documents CPNP/Personne Responsable/CPSR sont opposables (Règl. 1223/2009).',
    source: 'products.supplier_id (rapport de readiness)',
    appliesTo: 'cosmetiques',
    labelVariants: ['CPNP+RP+CPSR manquants — aucun fournisseur rattaché (Règl. 1223/2009)'],
  },
  {
    id: 'supplier_id',
    label: 'Fournisseur introuvable dans le référentiel',
    family: 'legale',
    rule: 'Le fournisseur référencé par le produit doit exister dans le référentiel.',
    source: 'products.supplier_id → suppliers',
    appliesTo: 'cosmetiques',
    labelVariants: [
      'Fournisseur « <id> » introuvable',
      'fournisseur non résolu dans le référentiel',
      'fournisseur déclaré mais introuvable dans le référentiel',
    ],
  },
  {
    id: 'supplier_verification_status',
    label: 'fournisseur non vérifié',
    family: 'legale',
    rule: 'Le fournisseur doit être vérifié (ses documents contrôlés) pour que ses preuves soient opposables.',
    source: 'suppliers.verification_status',
    appliesTo: 'cosmetiques',
    labelVariants: ['Fournisseur non vérifié — CPNP/RP/CPSR non opposables'],
  },
  {
    id: 'supplier_document:cpsr',
    label: 'Rapport de sécurité (CPSR) manquant',
    family: 'legale',
    rule: 'Le fournisseur doit détenir le CPSR du produit, non expiré.',
    source: 'supplier_documents (cpsr)',
    appliesTo: 'cosmetiques',
    labelVariants: [
      'Rapport de sécurité (CPSR) manquant — aucun fournisseur rattaché',
      'Rapport de sécurité (CPSR) — document expiré',
      'document fournisseur manquant : cpsr',
      'document fournisseur expiré : cpsr',
    ],
  },
  {
    id: 'supplier_document:cpnp_notification',
    label: 'Notification CPNP manquant',
    family: 'legale',
    rule: 'Le fournisseur doit détenir la preuve de notification CPNP, non expirée.',
    source: 'supplier_documents (cpnp_notification)',
    appliesTo: 'cosmetiques',
    labelVariants: [
      'Notification CPNP manquant — aucun fournisseur rattaché',
      'Notification CPNP — document expiré',
      'document fournisseur manquant : cpnp_notification',
      'document fournisseur expiré : cpnp_notification',
    ],
  },
  {
    id: 'supplier_document:responsible_person',
    label: 'Personne Responsable UE manquant',
    family: 'legale',
    rule: 'Le fournisseur doit détenir la preuve de la Personne Responsable UE, non expirée.',
    source: 'supplier_documents (responsible_person)',
    appliesTo: 'cosmetiques',
    labelVariants: [
      'Personne Responsable UE manquant — aucun fournisseur rattaché',
      'Personne Responsable UE — document expiré',
      'document fournisseur manquant : responsible_person',
      'document fournisseur expiré : responsible_person',
    ],
  },

  // ————— Porte de gouvernance sourcing (produits catégorisés) —————
  {
    id: 'source_supplier',
    label: 'provenance fournisseur déclarée absente',
    family: 'commerciale',
    rule: 'La provenance fournisseur déclarée (sourceSupplier) doit exister.',
    source: 'products.source_supplier',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'supplier_sku',
    label: 'SKU fournisseur absent',
    family: 'commerciale',
    rule: 'Le SKU fournisseur doit être renseigné (traçabilité commande).',
    source: 'products.supplier_sku',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'size_label',
    label: 'format/contenance absent',
    family: 'commerciale',
    rule: 'Le format/contenance doit être renseigné.',
    source: 'products.size_label',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'price',
    label: 'prix TTC absent ou invalide',
    family: 'commerciale',
    rule: 'Un prix TTC valide (> 0) doit être saisi.',
    source: 'products.price',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'price_includes_vat',
    label: 'prix TTC non confirmé',
    family: 'commerciale',
    rule: 'Le prix doit être confirmé comme TTC.',
    source: 'products.price_includes_vat',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'vat_rate',
    label: 'taux de TVA absent ou invalide',
    family: 'legale',
    rule: 'Un taux de TVA valide doit être renseigné.',
    source: 'products.vat_rate',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'variants',
    label: 'variantes annoncées mais non renseignées',
    family: 'commerciale',
    rule: 'Si des variantes sont annoncées, elles doivent être renseignées.',
    source: 'products.variants',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'lead_time_days',
    label: 'délai fournisseur absent',
    family: 'commerciale',
    rule: 'Le délai fournisseur doit être renseigné.',
    source: 'products.lead_time_days',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'returns_policy',
    label: 'politique de retours absente',
    family: 'commerciale',
    rule: 'Une politique de retours (texte ou objet) doit exister.',
    source: 'products.returns_policy',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'image',
    label: 'photo produit exploitable absente',
    family: 'visuelle',
    rule: 'Une photo produit exploitable doit exister.',
    source: 'products.image / products.gallery_images',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'inci',
    label: 'INCI/formule validée absente',
    family: 'legale',
    rule: 'Une INCI/formule validée doit être attachée au produit.',
    source: 'products.inci',
    appliesTo: 'produits_categorises',
  },
  {
    id: 'stock_quantity',
    label: 'stock disponible nul ou absent — produit non achetable maintenant',
    family: 'commerciale',
    rule: 'Un stock positif doit être disponible (produit, variante ou réservation).',
    source: 'products.stock_quantity / in_stock / variants',
    appliesTo: 'produits_categorises',
  },
];

const CRITERION_INDEX = new Map<string, SalesCriterion>(SALES_CRITERIA.map(c => [c.id, c]));

/** Critère par clé de champ moteur (null si la clé est inconnue de la carte). */
export function criterionById(id: string): SalesCriterion | null {
  return CRITERION_INDEX.get(id) || null;
}

/**
 * Réconciliation d'un libellé émis par le moteur avec la carte : le libellé
 * correspond au critère s'il est le libellé canonique, l'une de ses variantes,
 * ou s'il commence par une variante dynamique (« Fournisseur « X » introuvable »).
 */
export function matchCriterion(label: string): SalesCriterion | null {
  for (const criterion of SALES_CRITERIA) {
    if (label === criterion.label) return criterion;
    for (const variant of criterion.labelVariants || []) {
      if (label === variant) return criterion;
      // Variantes dynamiques : le libellé contient le motif (« Fournisseur « 123 » introuvable »).
      if (variant.includes('<') && label.includes(variant.slice(0, variant.indexOf('<')))) return criterion;
    }
  }
  return null;
}

/** Comptes de la carte par famille (pour l'écran). */
export function criteriaByFamily(): Array<{ family: CriterionFamily; label: string; count: number }> {
  const counts = new Map<CriterionFamily, number>();
  for (const c of SALES_CRITERIA) counts.set(c.family, (counts.get(c.family) || 0) + 1);
  return (Object.keys(CRITERION_FAMILIES) as CriterionFamily[])
    .filter(family => counts.has(family))
    .map(family => ({ family, label: CRITERION_FAMILIES[family], count: counts.get(family) || 0 }));
}
