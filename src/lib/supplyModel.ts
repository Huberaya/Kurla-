/**
 * MODÈLE D'APPROVISIONNEMENT — cœur du système d'achat KURLA.
 *
 * Principe fondateur : **le produit commercial et sa source d'approvisionne-
 * ment sont deux objets distincts.** Un même produit peut être servi par un
 * fournisseur en dropshipping, un autre en 3PL, un troisième en affiliation.
 * KURLA choisit la source, elle ne la subit pas.
 *
 * Aucune donnée inventée : un coût inconnu reste `null`, une source sans
 * prix ne produit pas de marge fictive — elle remonte en alerte.
 */

export const SUPPLY_MODELS = ['dropshipping', 'affiliation', '3pl', 'stock_kurla', 'other'] as const;
export type SupplyModel = typeof SUPPLY_MODELS[number];

export const SUPPLY_MODEL_LABELS: Record<SupplyModel, string> = {
  dropshipping: 'Dropshipping',
  affiliation: 'Affiliation',
  '3pl': '3PL',
  stock_kurla: 'Stock KURLA',
  other: 'Autre',
};

export const isSupplyModel = (value: unknown): value is SupplyModel =>
  typeof value === 'string' && (SUPPLY_MODELS as readonly string[]).includes(value);

/**
 * Les 8 étapes du workflow produit. `refused` est un état terminal relatif :
 * un refus peut être reconsidéré (`evaluation`), jamais effacé — la trace
 * reste dans `sourcing_workflow_events`.
 */
export const SUPPLY_WORKFLOW_STATES = [
  'identified',
  'supplier_identified',
  'evaluation',
  'validated',
  'approved',
  'ready_to_publish',
  'published',
  'active',
  'refused',
] as const;
export type SupplyWorkflowState = typeof SUPPLY_WORKFLOW_STATES[number];

export const SUPPLY_WORKFLOW_LABELS: Record<SupplyWorkflowState, string> = {
  identified: '1. Produit identifié',
  supplier_identified: '2. Fournisseur identifié',
  evaluation: '3. En évaluation',
  validated: '4. Validé (critères KURLA)',
  approved: '5. Approuvé pour le catalogue',
  ready_to_publish: '6. Prêt à publier',
  published: '7. Publié',
  active: '8. Actif en vente',
  refused: 'Refusé',
};

const FORWARD_FLOW: Record<string, SupplyWorkflowState[]> = {
  identified: ['supplier_identified', 'evaluation', 'refused'],
  supplier_identified: ['evaluation', 'refused'],
  evaluation: ['validated', 'refused'],
  validated: ['approved', 'evaluation', 'refused'],
  approved: ['ready_to_publish', 'evaluation', 'refused'],
  ready_to_publish: ['published', 'evaluation', 'refused'],
  published: ['active', 'ready_to_publish'],
  active: ['published'],
  refused: ['evaluation'],
};

export function canTransitionSupplyWorkflow(from: SupplyWorkflowState, to: SupplyWorkflowState): boolean {
  return (FORWARD_FLOW[from] || []).includes(to);
}

/** Un refus exige une raison : c'est une décision, pas un clic. */
export function transitionRequiresReason(to: SupplyWorkflowState): boolean {
  return to === 'refused';
}

export type ProductSource = {
  id?: string;
  productId: string;
  supplierId: string | null;
  partnerName: string | null;
  model: SupplyModel;
  isPrimary: boolean;
  /** Coût d'achat fournisseur, en centimes. null = inconnu, jamais 0 par défaut. */
  costCents: number | null;
  feeCents: number | null;
  fulfillmentCostCents: number | null;
  /** Affiliation uniquement : commission en %. */
  commissionPct: number | null;
  affiliateUrl: string | null;
  cookieDays: number | null;
  leadTimeDays: number | null;
  shipsFrom: string | null;
  currency: string;
  available: boolean;
  notes: string | null;
};

export function mapProductSource(row: any): ProductSource {
  // Number(null) === 0 : sans cette garde, un coût inconnu devenait 0 —
  // une donnée inventée, exactement ce que le système interdit.
  const intOrNull = (value: unknown) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: row?.id != null ? String(row.id) : undefined,
    productId: String(row?.product_id ?? ''),
    supplierId: row?.supplier_id != null ? String(row.supplier_id) : null,
    partnerName: typeof row?.partner_name === 'string' && row.partner_name.trim() !== '' ? row.partner_name.trim() : null,
    model: isSupplyModel(row?.model) ? row.model : 'other',
    isPrimary: row?.is_primary === true,
    costCents: intOrNull(row?.cost_cents),
    feeCents: intOrNull(row?.fee_cents),
    fulfillmentCostCents: intOrNull(row?.fulfillment_cost_cents),
    commissionPct: intOrNull(row?.commission_pct),
    affiliateUrl: typeof row?.affiliate_url === 'string' && row.affiliate_url.trim() !== '' ? row.affiliate_url.trim() : null,
    cookieDays: intOrNull(row?.cookie_days),
    leadTimeDays: intOrNull(row?.lead_time_days),
    shipsFrom: typeof row?.ships_from === 'string' && row.ships_from.trim() !== '' ? row.ships_from.trim() : null,
    currency: typeof row?.currency === 'string' && row.currency.trim() !== '' ? row.currency.trim() : 'EUR',
    available: row?.available !== false,
    notes: typeof row?.notes === 'string' && row.notes.trim() !== '' ? row.notes.trim() : null,
  };
}

/**
 * La source principale est explicite (`is_primary`). À défaut, on prend une
 * source disponible — et si aucune ne l'est, on ne choisit pas : on renvoie
 * null et l'alerte « produit sans source disponible » remonte.
 */
export function selectPrimarySource(sources: ProductSource[]): ProductSource | null {
  if (!Array.isArray(sources) || sources.length === 0) return null;
  const primary = sources.find(s => s.isPrimary);
  if (primary) return primary;
  return sources.find(s => s.available) || null;
}

export type MarginBreakdown = {
  model: SupplyModel;
  /** null = rentabilité inconnue (données manquantes), jamais 0 inventé. */
  totalCostCents: number | null;
  marginCents: number | null;
  marginPct: number | null;
  /** Affiliation : la commission attendue remplace la logique de marge. */
  commissionCents: number | null;
  /** Ce qui manque pour pouvoir calculer — affiché tel quel à l'admin. */
  missing: string[];
};

/**
 * Prix fournisseur + frais + coût de fulfillment + commission éventuelle
 * = coût total estimé ; prix de vente − coût total = marge estimée.
 *
 * En affiliation, KURLA n'achète pas le produit : le revenu attendu est la
 * commission, il n'y a pas de marge au sens classique.
 */
export function evaluateMargin(args: {
  model: SupplyModel;
  salePriceCents: number | null;
  costCents: number | null;
  feeCents: number | null;
  fulfillmentCostCents: number | null;
  commissionPct: number | null;
}): MarginBreakdown {
  const { model, salePriceCents, costCents, feeCents, fulfillmentCostCents, commissionPct } = args;
  const missing: string[] = [];

  if (model === 'affiliation') {
    if (salePriceCents == null) missing.push('prix de vente');
    if (commissionPct == null) missing.push('taux de commission');
    const commissionCents = salePriceCents != null && commissionPct != null
      ? Math.round((salePriceCents * commissionPct) / 100)
      : null;
    return { model, totalCostCents: null, marginCents: commissionCents, marginPct: commissionPct, commissionCents, missing };
  }

  if (salePriceCents == null) missing.push('prix de vente');
  if (costCents == null) missing.push('coût fournisseur');
  // Frais et coût de fulfillment inconnus = 0 assumé MAIS signalé : c'est une
  // hypothèse, pas une donnée — l'admin doit la voir.
  if (feeCents == null) missing.push('frais');
  if (fulfillmentCostCents == null) missing.push('coût de fulfillment');

  const totalCostCents = costCents != null
    ? costCents + (feeCents ?? 0) + (fulfillmentCostCents ?? 0)
    : null;
  const marginCents = totalCostCents != null && salePriceCents != null ? salePriceCents - totalCostCents : null;
  const marginPct = marginCents != null && salePriceCents != null && salePriceCents > 0
    ? Math.round((marginCents / salePriceCents) * 1000) / 10
    : null;

  return { model, totalCostCents, marginCents, marginPct, commissionCents: null, missing };
}

export type FulfillmentRoute = {
  model: SupplyModel;
  /** Qui est responsable de l'expédition — la question à réponse immédiate. */
  responsible: string;
  responsibleKind: 'supplier' | '3pl' | 'affiliate_partner' | 'kurla' | 'unknown';
  sourceId: string | null;
  leadTimeDays: number | null;
  shipsFrom: string | null;
  /** null = routage impossible en l'état ; `blockers` dit pourquoi. */
  blockers: string[];
};

/**
 * ROUTAGE : comment cette commande sera exécutée, et par qui.
 *
 * - dropshipping → le fournisseur expédie au client ;
 * - 3pl → le logisticien prépare et expédie ;
 * - affiliation → le partenaire traite la commande, KURLA ne l'exécute pas ;
 * - stock_kurla → KURLA expédie.
 *
 * Sans source, ou avec une source indisponible, le routage est BLOQUÉ et le
 * motif est nommé — jamais de route inventée.
 */
export function routeFulfillment(args: {
  productName?: string;
  sources: ProductSource[];
  supplierNameById?: Record<string, string>;
}): FulfillmentRoute {
  const { sources, supplierNameById = {} } = args;
  const primary = selectPrimarySource(sources);
  if (!primary) {
    return {
      model: 'other',
      responsible: 'à déterminer',
      responsibleKind: 'unknown',
      sourceId: null,
      leadTimeDays: null,
      shipsFrom: null,
      blockers: sources.length === 0 ? ['aucune source d’approvisionnement'] : ['toutes les sources sont indisponibles'],
    };
  }
  if (!primary.available) {
    return {
      model: primary.model,
      responsible: 'à déterminer',
      responsibleKind: 'unknown',
      sourceId: primary.id || null,
      leadTimeDays: primary.leadTimeDays,
      shipsFrom: primary.shipsFrom,
      blockers: ['source principale indisponible'],
    };
  }

  const supplierName = primary.supplierId ? supplierNameById[primary.supplierId] || null : null;
  const name = supplierName || primary.partnerName;

  switch (primary.model) {
    case 'dropshipping':
      return {
        model: 'dropshipping',
        responsible: name || 'fournisseur à nommer',
        responsibleKind: name ? 'supplier' : 'unknown',
        sourceId: primary.id || null,
        leadTimeDays: primary.leadTimeDays,
        shipsFrom: primary.shipsFrom,
        blockers: name ? [] : ['fournisseur de la source non identifié'],
      };
    case '3pl':
      return {
        model: '3pl',
        responsible: name || 'logisticien 3PL à nommer',
        responsibleKind: name ? '3pl' : 'unknown',
        sourceId: primary.id || null,
        leadTimeDays: primary.leadTimeDays,
        shipsFrom: primary.shipsFrom,
        blockers: name ? [] : ['logisticien 3PL non identifié'],
      };
    case 'affiliation':
      return {
        model: 'affiliation',
        responsible: name || 'partenaire affilié à nommer',
        responsibleKind: name ? 'affiliate_partner' : 'unknown',
        sourceId: primary.id || null,
        leadTimeDays: primary.leadTimeDays,
        shipsFrom: primary.shipsFrom,
        blockers: [
          ...(name ? [] : ['partenaire affilié non identifié']),
          ...(primary.affiliateUrl ? [] : ['lien d’affiliation manquant']),
        ],
      };
    case 'stock_kurla':
      return {
        model: 'stock_kurla',
        responsible: 'KURLA',
        responsibleKind: 'kurla',
        sourceId: primary.id || null,
        leadTimeDays: primary.leadTimeDays,
        shipsFrom: primary.shipsFrom,
        blockers: [],
      };
    default:
      return {
        model: 'other',
        responsible: name || 'à déterminer',
        responsibleKind: 'unknown',
        sourceId: primary.id || null,
        leadTimeDays: primary.leadTimeDays,
        shipsFrom: primary.shipsFrom,
        blockers: ['modèle d’approvisionnement non reconnu'],
      };
  }
}

export type SupplyAlert = {
  kind: 'no_supplier' | 'no_source' | 'no_price' | 'no_cost' | 'not_compliant' | 'missing_info' | 'supplier_no_contact' | 'approved_not_published' | 'source_unavailable';
  severity: 'critical' | 'warning';
  subject: string;
  message: string;
};

/**
 * Alertes d'approvisionnement (§23). Chaque alerte nomme son sujet et son
 * motif ; aucune n'est générée sur une donnée supposée.
 */
export function evaluateSupplyAlerts(args: {
  products: Array<{ id: string; name: string; catalogStatus?: string; priceCents?: number | null; proofCompliant?: boolean; workflowState?: string }>;
  sourcesByProduct: Record<string, ProductSource[]>;
  suppliers?: Array<{ id: string; legalName?: string; contactEmail?: string | null }>;
}): SupplyAlert[] {
  const { products, sourcesByProduct, suppliers = [] } = args;
  const alerts: SupplyAlert[] = [];
  const supplierById = new Map(suppliers.map(s => [String(s.id), s]));

  for (const product of products) {
    const sources = sourcesByProduct[product.id] || [];
    const name = product.name || product.id;

    if (sources.length === 0) {
      alerts.push({ kind: 'no_source', severity: 'critical', subject: name, message: 'aucune source d’approvisionnement' });
    } else {
      const knownSuppliers = sources.filter(s => s.supplierId);
      if (knownSuppliers.length === 0) {
        alerts.push({ kind: 'no_supplier', severity: 'warning', subject: name, message: 'aucune source rattachée à un fournisseur enregistré' });
      }
      for (const source of knownSuppliers) {
        const supplier = supplierById.get(String(source.supplierId));
        if (supplier && !supplier.contactEmail) {
          alerts.push({ kind: 'supplier_no_contact', severity: 'warning', subject: `${name} → ${supplier.legalName || source.supplierId}`, message: 'fournisseur sans e-mail de contact' });
        }
      }
      if (!sources.some(s => s.available)) {
        alerts.push({ kind: 'source_unavailable', severity: 'critical', subject: name, message: 'toutes les sources sont indisponibles' });
      }
      const primary = selectPrimarySource(sources);
      if (primary && primary.model !== 'affiliation' && primary.costCents == null) {
        alerts.push({ kind: 'no_cost', severity: 'warning', subject: name, message: 'coût fournisseur inconnu — marge incalculable' });
      }
    }

    if (product.priceCents == null) {
      alerts.push({ kind: 'no_price', severity: 'critical', subject: name, message: 'prix de vente absent' });
    }
    if (product.proofCompliant === false) {
      alerts.push({ kind: 'not_compliant', severity: 'critical', subject: name, message: 'non conforme aux critères KURLA' });
    }
    if (product.workflowState === 'approved' && product.catalogStatus !== 'published') {
      alerts.push({ kind: 'approved_not_published', severity: 'warning', subject: name, message: 'approuvé mais non publié' });
    }
  }
  return alerts;
}
