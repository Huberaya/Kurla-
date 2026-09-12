/**
 * Preuve minimale d'une précommande externe.
 *
 * Une précommande n'est pas un synonyme de formulation interne et ne doit
 * jamais être confondue avec du stock disponible. Ce module ne déduit aucun
 * fournisseur : il vérifie uniquement les identifiants explicitement portés
 * par la fiche.
 */

function value(product: any, camel: string, snake: string): string {
  const raw = product?.[camel] !== undefined ? product[camel] : product?.[snake];
  return typeof raw === 'string' ? raw.trim() : '';
}

export function isInternalFormulationSource(product: any): boolean {
  const source = value(product, 'sourceSupplier', 'source_supplier').toLowerCase();
  return source.includes('formulation interne')
    || source.includes('formulation cible')
    || source.includes('internal formulation');
}

export function hasDocumentedExternalPreorder(product: any): boolean {
  if (isInternalFormulationSource(product)) return false;
  const source = value(product, 'sourceSupplier', 'source_supplier');
  const supplierId = value(product, 'supplierId', 'supplier_id');
  const supplierSku = value(product, 'supplierSku', 'supplier_sku');
  // Une précommande externe n'est vérifiée que si les trois éléments sont
  // explicitement présents : source localisable, fournisseur et SKU. Le SKU
  // n'est pas déduit du slug, du nom ou d'une URL ; son absence bloque la
  // publication et le checkout jusqu'à ce que le dossier de sourcing soit
  // complété.
  return source.length > 0 && supplierId.length > 0 && supplierSku.length > 0;
}
