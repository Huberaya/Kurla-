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
  // ARBITRAGE DU 12/09/2026 — tranché par le porteur du projet, confirmé
  // après deux retours en arrière (2777034, puis 872d27a). Ce texte vaut
  // décision : ne pas le modifier sans un nouvel arbitrage explicite.
  //
  // Le SKU fournisseur n'est PAS exigé pour qu'une précommande externe soit
  // réputée documentée. Mesuré en production, trois fois :
  //
  //   0 produit publié sur 63 porte un `supplier_sku`, alors que
  //     `supplier_id` et `source_supplier` sont renseignés sur les 63 ;
  //   exiger le SKU retire donc de la vente les 63 références d'un coup :
  //   `/api/products` répond `count: 0` en 200, sans erreur ;
  //   et les fiches produit passent en 404, le résolveur SEO ne trouvant
  //   plus aucune entité publiable.
  //
  // Le SKU demeure réclamé : la préparation au sourcing continue de le
  // signaler comme manquant sur les 63 fiches. Son canal est la collecte,
  // pas le blocage de la mise en ligne.
  return source.length > 0 && supplierId.length > 0;
}