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
  // ARBITRAGE DU 12/09/2026 — tranché par le porteur du projet, après deux
  // positions contradictoires (d0d6115 puis 2777034). Le texte ci-dessous
  // vaut décision : ne pas le modifier sans un nouvel arbitrage.
  //
  // Le SKU fournisseur n'est PAS exigé pour qu'une précommande externe soit
  // réputée documentée. Mesuré en production : 0 produit publié sur 63 porte
  // un `supplier_sku`, alors que `supplier_id` et `source_supplier` sont
  // renseignés sur les 63. L'exiger revient à retirer de la vente les 63
  // références d'un coup : `/api/products` répond `count: 0` en 200, sans
  // erreur, et la boutique ne vend plus rien.
  //
  // Documenter une précommande, c'est permettre au consommateur de situer
  // d'où vient l'article : le fournisseur et sa source y pourvoient, et les
  // deux sont présents. Le SKU est une référence commerciale interne au
  // grossiste — il n'est dû ni au consommateur ni à l'administration.
  //
  // Il n'est pas abandonné pour autant : la préparation au sourcing
  // (`evaluateCatalogSourcingReadiness`) continue de le signaler comme
  // manquant sur les 63 fiches. La donnée reste donc réclamée, avec son
  // canal propre — une alerte de collecte, pas un blocage de mise en ligne.
  //
  // Aucun SKU n'est déduit du slug, du nom ou d'une URL : rien n'est inventé,
  // on cesse seulement d'exiger ce qui n'existe pas encore.
  return source.length > 0 && supplierId.length > 0;
}
