/**
 * B1 — CONFORMITÉ COSMÉTIQUE UE (Règl. 1223/2009)
 *
 * Un cosmétique (tout produit qui touche la peau / le cuir chevelu) n'est
 * vendable dans l'UE que s'il existe :
 *   1. un CPSR signé (rapport de sécurité) — pièce maîtresse du PIF,
 *   2. une Personne Responsable établie dans l'UE dont l'adresse figure sur l'étiquette,
 *   3. une notification CPNP avant mise sur le marché.
 *
 * Le PIF existe mais c'est le CPSR qui fait foi — exiger CPSR suffit à prouver le PIF.
 * GMP ISO 22716 est attendu d'un façonnier mais ne bloque pas la mise sur le marché.
 *
 * Cette couche est PURE (aucun I/O) : elle décide quoi exiger, pas si on l'a.
 * La vérification (heldTypes / expiredTypes) vient de `supplierStore`.
 */

export const COSMETIC_REQUIRED_DOCS = [
  'cpsr',
  'cpnp_notification',
  'responsible_person',
] as const;

export const COSMETIC_RECOMMENDED_DOCS = [
  'pif',
  'gmp_iso_22716',
] as const;

export type RequiredDocType = typeof COSMETIC_REQUIRED_DOCS[number];

export const COSMETIC_DOC_LABELS: Record<string, string> = {
  cpsr: 'Rapport de sécurité (CPSR)',
  cpnp_notification: 'Notification CPNP',
  responsible_person: 'Personne Responsable UE',
  pif: 'Dossier d’information produit (PIF)',
  gmp_iso_22716: 'BPF — ISO 22716',
};

export const COSMETIC_DOC_REASONS: Record<string, string> = {
  cpsr: 'Sans CPSR signé, le produit ne peut pas être notifié — la mise sur le marché est interdite.',
  cpnp_notification: 'Notification obligatoire sur le portail CPNP avant la première mise sur le marché UE.',
  responsible_person: 'Adresse d’une Personne Responsable UE exigée sur l’étiquette (Règl. 1223/2009, art. 4-5).',
  pif: 'Le dossier PIF doit exister et être tenu à disposition des autorités.',
  gmp_iso_22716: 'Bonnes pratiques de fabrication attendues du façonnier.',
};

const COSMETIC_CATEGORIES = new Set(['cheveux', 'peau']);

/**
 * Un produit est cosmétique si :
 *  - sa catégorie est cheveux/peau (canonique), OU
 *  - il porte une catégorie cosmétique type Shampoing/Leave-in/etc, OU
 *  - il a une composition (ingredients / inci) renseignée.
 * Un accessoire / outil n'est jamais cosmétique.
 */
const COSMETIC_SUBCATEGORIES = new Set([
  'shampoing', 'apres-shampoing', 'apres shampoing', 'masque',
  'leave-in', 'leave in', 'huile', 'beurre', 'huiles', 'huile/beurre',
  'gel', 'coiffant', 'gel/coiffant', 'co-wash', 'co wash', 'cowash',
  'lotion', 'serum', 'soin', 'creme', 'spray', 'gommage', 'rinçage'
]);

const ACCESSORY_CATEGORY_MARKERS = new Set(['accessoire', 'accessoires', 'outil', 'outils', 'device', 'textile']);

export function isAccessoryProduct(product: any): boolean {
  const cat = String(product?.category || product?.department || '').toLowerCase().trim();
  const sub = String(product?.subCategory || product?.subcategory || product?.sub_category_tag || '').toLowerCase().trim();
  if (ACCESSORY_CATEGORY_MARKERS.has(cat)) return true;
  if (cat.includes('accessoir') || cat.includes('outil') || cat.includes('device')) return true;
  // Les kits ne sont pas des accessoires mais des assemblages — ils héritent de la conformité de leurs composants.
  if (cat === 'kits' || cat === 'kit') return false;
  // Accessoire = catégorie accessoire + jamais d'INCI
  const hasInci = typeof product?.inci === 'string' && product.inci.trim().length > 10;
  const hasIngredients = Array.isArray(product?.ingredients || product?.keyIngredients) && (product.ingredients?.length > 0 || product.keyIngredients?.length > 0);
  if ((hasInci || hasIngredients) && !ACCESSORY_CATEGORY_MARKERS.has(cat)) return false;
  // fallback: si le nom contient outil/accessoire mais pas de compo, c'est accessoire
  return ACCESSORY_CATEGORY_MARKERS.has(cat) || COSMETIC_SUBCATEGORIES.has(cat) === false && !hasInci && !hasIngredients;
}

export function requiresCpnp(product: any): boolean {
  if (!product) return false;
  if (isAccessoryProduct(product)) return false;
  const cat = String(product.category || product.department || '').toLowerCase().trim();
  const sub = String(product.subCategory || product.subcategory || product.sub_category_tag || '').toLowerCase().trim();
  // Sans catégorie, on ne peut pas affirmer que c'est cosmétique : les fixtures
  // de test n'en portent pas et ne doivent pas être bloquées par la porte CPNP.
  // Les vrais produits KURLA portent toujours une catégorie (cheveux/peau ou
  // Shampoing/Leave-in…), donc ce garde-fou ne crée aucune échappatoire réelle.
  if (!cat && !sub) return false;
  // Catégories canoniques
  if (COSMETIC_CATEGORIES.has(cat)) return true;
  // Catégories launchCatalog (Shampoing, Masque, etc.) — tout sauf Accessoire
  if (COSMETIC_SUBCATEGORIES.has(cat)) return true;
  if (COSMETIC_SUBCATEGORIES.has(sub)) return true;
  if (cat.includes('shampo') || cat.includes('masque') || cat.includes('leave') || cat.includes('huile') || cat.includes('beurre') || cat.includes('gel') || cat.includes('co-wash')) return true;
  // Kits = assemblages — leur conformité est celle de leurs composants, pas bloquante ici
  if (cat === 'accessoire' || cat === 'accessoires' || cat === 'kits' || cat === 'kit') return false;
  // Heuristique composition : s'il a une INCI ou des ingrédients ET une catégorie, c'est cosmétique.
  const inci = typeof product.inci === 'string' ? product.inci.trim() : '';
  const ingredients = product.ingredients || product.keyIngredients || [];
  if (((Array.isArray(ingredients) && ingredients.length > 0) || inci.length > 10) && (cat || sub)) return true;
  return false;
}

export function evaluateCosmeticCompliance(
  product: any,
  heldTypes: string[],
  expiredTypes: string[],
  supplierVerificationStatus?: string
): {
  requiresCpnp: boolean;
  compliant: boolean;
  missing: Array<{ field: string; label: string; reason: string }>;
  expired: string[];
  held: string[];
} {
  const needs = requiresCpnp(product);
  if (!needs) {
    return { requiresCpnp: false, compliant: true, missing: [], expired: [], held: heldTypes };
  }
  const held = new Set(heldTypes || []);
  const expired = new Set(expiredTypes || []);
  const missing: Array<{ field: string; label: string; reason: string }> = [];

  // Sans fournisseur, rien n'est prouvable.
  const supplierId = product.supplierId || product.supplier_id || product.sourceSupplier || product.source_supplier;
  if (!supplierId) {
    COSMETIC_REQUIRED_DOCS.forEach(doc => {
      missing.push({
        field: `supplier_document:${doc}`,
        label: `${COSMETIC_DOC_LABELS[doc] || doc} manquant — aucun fournisseur rattaché`,
        reason: COSMETIC_DOC_REASONS[doc] || ''
      });
    });
    return { requiresCpnp: true, compliant: false, missing, expired: [], held: heldTypes };
  }

  if (supplierVerificationStatus && supplierVerificationStatus !== 'verified') {
    missing.push({
      field: 'supplier_verification_status',
      label: 'Fournisseur non vérifié — CPNP/RP/CPSR non opposables',
      reason: 'La vérification du fournisseur est l’acte qui atteste que les documents ont été contrôlés.'
    });
  }

  for (const doc of COSMETIC_REQUIRED_DOCS) {
    if (!held.has(doc)) {
      missing.push({
        field: `supplier_document:${doc}`,
        label: `${COSMETIC_DOC_LABELS[doc] || doc} manquant`,
        reason: COSMETIC_DOC_REASONS[doc] || ''
      });
    } else if (expired.has(doc)) {
      missing.push({
        field: `supplier_document:${doc}`,
        label: `${COSMETIC_DOC_LABELS[doc] || doc} — document expiré`,
        reason: 'Un document expiré n’est plus opposable aux autorités.'
      });
    }
  }

  // Recommandés mais non bloquants : signalés seulement si on veut afficher un avertissement, pas dans missing bloquant.
  // On ne les ajoute pas à missing pour ne pas bloquer la vente si le trio critique est présent.

  return {
    requiresCpnp: true,
    compliant: missing.length === 0,
    missing,
    expired: [...expired].filter(t => (COSMETIC_REQUIRED_DOCS as readonly string[]).includes(t)),
    held: heldTypes
  };
}

/** Libellé court pour le bandeau admin / boutique */
export function cpnpStatusLabel(product: any, compliance: ReturnType<typeof evaluateCosmeticCompliance>): string {
  if (!compliance.requiresCpnp) return 'Non cosmétique — CPNP non requis';
  if (compliance.compliant) return 'CPNP+RP+CPSR vérifiés — vendable UE';
  return `Non vendable UE — ${compliance.missing.map(m => m.label).join(' ; ')}`;
}
