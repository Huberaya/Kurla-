/**
 * VUE SOURCING CONSOLIDÉE — les 242 lignes (produits publiables + candidats)
 * avec prix, fournisseur, contact et e-mail prêt à envoyer.
 *
 * Aucune donnée inventée : le prix affiché est soit le prix catalogue/constaté
 * de la fiche, soit « à obtenir » ; l'e-mail « prêt » est soit un RFQ existant
 * (`rfqs.content`), soit un e-mail généré à partir des seules données réelles
 * (liste des références du fournisseur, conditions publiques constatées,
 * demandes : prix pro, MOQ, INCI, CPNP/RP UE, droits visuels).
 */

export type ConsolidatedRow = {
  kind: 'product' | 'candidate';
  id: string;
  name: string;
  brand: string | null;
  priceEur: number | null;
  priceLabel: 'prix catalogue' | 'prix public constaté' | 'à obtenir';
  supplierName: string | null;
  supplierContact: string | null;
  supplierWebsite: string | null;
  emailState: 'pret' | 'a_preparer';
};

export type SupplierEmailBlock = {
  key: string;
  name: string;
  contact: string | null;
  website: string | null;
  rowCount: number;
  emailState: 'pret' | 'a_preparer';
  /** Corps de l'e-mail : RFQ existant ou généré depuis les données réelles. */
  emailSubject: string;
  emailBody: string;
  knownTerms: string[];
};

export type ConsolidatedSourcing = {
  generatedAt: string;
  total: number;
  products: number;
  candidates: number;
  rows: ConsolidatedRow[];
  supplierBlocks: SupplierEmailBlock[];
};

type AnyRecord = Record<string, any>;

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function priceFromCents(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n / 100 : null;
}

/** Conditions publiques constatées en sessions des 13–14/09/2026 — jamais inventées. */
const KNOWN_TERMS: Record<string, string[]> = {
  ankorstore: ['minimum 100 €/marque', 'franco 300 €', 'paiement 60 jours', '0 % commission réassorts (janv. 2026)'],
  qudo: ['MOQ 300 € total, aucun MOQ par référence', 'port offert dès 500 €', 'CPNP + RP UE + INCI déclarés par écrit'],
  eolys: ['page revendeur publique', 'prix pro derrière connexion revendeur'],
  blacketique: ['stock France déclaré', 'offre réservée aux pros'],
  distristar: ['grossiste afro Bobigny', 'vitrine Red One/X-Pression/TCB — nos marques à confirmer'],
  aquarius: ['prix publics 0,98–4,40 €/unité constatés'],
  deciem: ['prix publics theordinary.com = plafond'],
};

function knownTermsFor(name: string): string[] {
  const low = String(name || '').toLowerCase();
  for (const [key, terms] of Object.entries(KNOWN_TERMS)) {
    if (low.includes(key)) return terms;
  }
  return [];
}

function buildEmail(subject: string, supplierName: string, rows: ConsolidatedRow[], terms: string[]): string {
  const lines: string[] = [];
  lines.push(`Objet : ${subject}`);
  lines.push('');
  lines.push('Madame, Monsieur,');
  lines.push('');
  lines.push(`KURLA, boutique française de soins cheveux & peau (peaux mélaninées comprises), prépare en année 1 un référencement sans stock (affiliation / dropship / 3PL) et souhaite ouvrir un compte revendeur chez ${supplierName}.`);
  lines.push('');
  lines.push(`Références visées chez vous (${rows.length}) :`);
  for (const row of rows.slice(0, 40)) {
    const price = row.priceEur != null ? ` — prix public constaté : ${row.priceEur.toFixed(2).replace('.', ',')} €` : ' — prix à obtenir';
    lines.push(`- ${row.name}${row.brand ? ` (${row.brand})` : ''}${price}`);
  }
  if (rows.length > 40) lines.push(`- … et ${rows.length - 40} autres références listées en pièce jointe de notre registre.`);
  lines.push('');
  if (terms.length > 0) {
    lines.push('Conditions publiques constatées vous concernant :');
    for (const term of terms) lines.push(`- ${term}`);
    lines.push('');
  }
  lines.push('Pour chaque référence, nous attendons :');
  lines.push('- prix revendeur et MOQ (ou confirmation de l’absence de MOQ par référence) ;');
  lines.push('- liste INCI complète et DDM/PAO ;');
  lines.push('- preuve de notification CPNP et nom de la Personne Responsable UE pour le marché visé ;');
  lines.push('- autorisation écrite de revente en ligne et droits d’usage des visuels produits ;');
  lines.push('- délai et lieu de stockage (UE ou pays tiers).');
  lines.push('');
  lines.push('Un devis partiel est acceptable ; nous ne complétons rien à votre place.');
  lines.push('');
  lines.push('Cordialement,');
  lines.push('L’équipe KURLA');
  return lines.join('\n');
}

export function buildConsolidatedSourcing(args: {
  products: AnyRecord[];
  candidates: AnyRecord[];
  prospects: AnyRecord[];
  suppliers: AnyRecord[];
  rfqs: AnyRecord[];
}): ConsolidatedSourcing {
  const { products, candidates, prospects, suppliers, rfqs } = args;
  const supplierById = new Map<string, AnyRecord>((suppliers || []).map(s => [String(s.id), s]));
  const prospectById = new Map<string, AnyRecord>((prospects || []).map(p => [String(p.id), p]));

  const rows: ConsolidatedRow[] = [];

  for (const product of products || []) {
    const status = String(product.catalogStatus ?? product.catalog_status ?? '');
    if (status === 'unavailable') continue; // les 17 fiches retirées ne font pas partie de la vue
    const supplier = product.supplierId ? supplierById.get(String(product.supplierId)) : undefined;
    const price = Number(product.basePrice ?? product.price);
    rows.push({
      kind: 'product',
      id: String(product.id),
      name: String(product.name || product.id),
      brand: str(product.brand) ,
      priceEur: Number.isFinite(price) && price > 0 ? price : null,
      priceLabel: Number.isFinite(price) && price > 0
        ? (product.isTestListing || product.is_test_listing ? 'prix public constaté' : 'prix catalogue')
        : 'à obtenir',
      supplierName: supplier ? str(supplier.legal_name) || str(supplier.trade_name) : str(product.sourceSupplier) ,
      supplierContact: supplier ? str(supplier.contact_email) : null,
      supplierWebsite: supplier ? str(supplier.website) : null,
      emailState: 'a_preparer',
    });
  }

  for (const candidate of candidates || []) {
    const prospect = prospectById.get(String(candidate.prospect_id));
    const price = priceFromCents(candidate.public_price_cents);
    rows.push({
      kind: 'candidate',
      id: String(candidate.id),
      name: String(candidate.product || candidate.id),
      brand: str(candidate.brand),
      priceEur: price,
      priceLabel: price != null ? 'prix public constaté' : 'à obtenir',
      supplierName: prospect ? str(prospect.name) : null,
      supplierContact: prospect ? str(prospect.contact_email) : null,
      supplierWebsite: prospect ? str(prospect.source_url) : null,
      emailState: 'a_preparer',
    });
  }

  // Blocs fournisseur : regroupement des lignes par fournisseur nommé.
  const blocks = new Map<string, { name: string; contact: string | null; website: string | null; rows: ConsolidatedRow[] }>();
  for (const row of rows) {
    const name = row.supplierName || 'Fournisseur à qualifier';
    const key = name.toLowerCase();
    const block = blocks.get(key) || { name, contact: null, website: null, rows: [] };
    if (!block.contact && row.supplierContact) block.contact = row.supplierContact;
    if (!block.website && row.supplierWebsite) block.website = row.supplierWebsite;
    block.rows.push(row);
    blocks.set(key, block);
  }

  const supplierBlocks: SupplierEmailBlock[] = [];
  for (const block of blocks.values()) {
    const rfq = (rfqs || []).find(r => {
      const content = str(r.content);
      if (!content) return false;
      const sup = r.supplier_id ? supplierById.get(String(r.supplier_id)) : undefined;
      const supName = sup ? String(sup.legal_name || '').toLowerCase() : '';
      return supName === block.name.toLowerCase() || content.toLowerCase().includes(block.name.toLowerCase());
    });
    const terms = knownTermsFor(block.name);
    const subject = `[KURLA] Compte revendeur + devis — ${block.rows.length} référence${block.rows.length > 1 ? 's' : ''}`;
    supplierBlocks.push({
      key: block.name.toLowerCase(),
      name: block.name,
      contact: block.contact,
      website: block.website,
      rowCount: block.rows.length,
      emailState: rfq ? 'pret' : 'a_preparer',
      emailSubject: rfq ? subject : subject,
      emailBody: rfq ? String(rfq.content) : buildEmail(subject, block.name, block.rows, terms),
      knownTerms: terms,
    });
    // Les lignes d'un bloc ayant un RFQ prêt héritent de l'état « pret ».
    if (rfq) for (const row of block.rows) row.emailState = 'pret';
  }
  supplierBlocks.sort((a, b) => b.rowCount - a.rowCount);

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    products: rows.filter(r => r.kind === 'product').length,
    candidates: rows.filter(r => r.kind === 'candidate').length,
    rows,
    supplierBlocks,
  };
}
