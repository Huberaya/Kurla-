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
  // Le SKU fournisseur n'est volontairement PAS exigé ici.
  //
  // Mesuré le 12/09/2026 : 0 produit publié sur 63 portait un `supplier_sku`,
  // alors que `supplier_id` et `source_supplier` étaient renseignés sur les
  // 63. Exiger le SKU revenait donc à masquer l'intégralité du catalogue :
  // `/api/products` répondait `{"products":[],"count":0}` en 200, sans
  // erreur, pendant que la base comptait 63 références publiées.
  //
  // Documenter une précommande, c'est identifier le fournisseur et sa source :
  // les deux sont présents. Le SKU est une référence commerciale interne, pas
  // une information due au consommateur. Il reste signalé comme manquant par
  // la préparation au sourcing (`evaluateCatalogSourcingReadiness`), qui est
  // son vrai canal — une alerte, jamais un blocage de mise en ligne.
  return source.length > 0 && supplierId.length > 0;
}
