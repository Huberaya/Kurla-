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

/** Pipeline 6 états de l'étude du 15/09/2026 (C2). */
export type PipelineState = 'identifie' | 'contacte' | 'source' | 'conforme' | 'publie' | 'en_vente';

/**
 * CHANTIER D — Le registre approvisionné.
 * Statut de registre par ligne, dérivé des données réelles, jamais supposé
 * (fail-closed : sans publication-readiness mesurée, aucune fiche n'est
 * « conforme »). L'ordre est monotone : une ligne est exactement dans un
 * des quatre stades.
 */
export type RegistryStage = 'identifie' | 'fiche_creee' | 'conforme' | 'publie';
export const REGISTRY_STAGE_LABELS: Record<RegistryStage, string> = {
  identifie: 'Identifié',
  fiche_creee: 'Fiche créée',
  conforme: 'Conforme',
  publie: 'Publié',
};
export const REGISTRY_STAGE_ORDER: RegistryStage[] = ['identifie', 'fiche_creee', 'conforme', 'publie'];

export type ConsolidatedRow = {
  kind: 'product' | 'candidate' | 'position';
  id: string;
  name: string;
  brand: string | null;
  priceEur: number | null;
  priceLabel: 'prix catalogue' | 'prix public constaté' | 'à obtenir';
  supplierName: string | null;
  supplierContact: string | null;
  supplierWebsite: string | null;
  emailState: 'pret' | 'a_preparer';
  state: PipelineState;
  /** Format/taille pour les positions de fond (ex. « 30 ml »), null sinon. */
  format: string | null;
  /** CHANTIER D — stade de registre dérivé (jamais supposé). */
  registryStage: RegistryStage;
  /** publication-readiness mesurée de la fiche (null = non mesurable, fail-closed). */
  ready: boolean | null;
  /** Critères manquants nommés (publication-readiness), vides sinon. */
  missing: string[];
  /** CHANTIER D — vague de sourcing (les positions via leur item, null sinon). */
  wave: string | null;
  /** Réconciliation avec le catalogue : id de la fiche (elle-même pour une fiche,
   *  la fiche créée pour un candidat, null pour une position sans fiche). */
  linkedProductId: string | null;
  /** Pour une fiche : le candidat sourcing d'où elle vient (null sinon). */
  linkedCandidateId: string | null;
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
  positions: number;
  /** Compte par état du pipeline — les KPI de la vue Appro unifiée. */
  pipeline: Record<PipelineState, number>;
  /** CHANTIER D — compte par stade de registre (les 4 stades somment au total). */
  registry: Record<RegistryStage, number>;
  /**
   * CHANTIER D — false quand la publication-readiness n'a pas pu être mesurée :
   * les fiches restent alors « Fiche créée » (fail-closed), jamais « Conformes ».
   * L'écran doit nommer cet état, pas le masquer.
   */
  readinessAvailable: boolean;
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

/**
 * Les attentes standard envoyées à chaque fournisseur — un seul texte,
 * partagé entre l'e-mail du bloc et l'e-mail d'une référence seule
 * (chantier D) : pas de variante inventée, pas de dérive.
 */
const STANDARD_ASKS: string[] = [
  'prix revendeur et MOQ (ou confirmation de l’absence de MOQ par référence) ;',
  'liste INCI complète et DDM/PAO ;',
  'preuve de notification CPNP et nom de la Personne Responsable UE pour le marché visé ;',
  'autorisation écrite de revente en ligne et droits d’usage des visuels produits ;',
  'délai et lieu de stockage (UE ou pays tiers).',
];

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
  for (const ask of STANDARD_ASKS) lines.push(`- ${ask}`);
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
  positions?: AnyRecord[];
  prospects: AnyRecord[];
  suppliers: AnyRecord[];
  rfqs: AnyRecord[];
  /**
   * CHANTIER D — publication-readiness mesurée (perProduct du rapport
   * catalogue). Absente = non mesurable : les fiches ne peuvent alors pas être
   * déclarées « conformes » (fail-closed), l'indicateur `readinessAvailable`
   * est false pour que l'écran nomme cet état.
   */
  readiness?: Array<{ productId: string; ready: boolean; missing?: string[]; catalogStatus?: string }> | null;
  /** CHANTIER D — sourcing_items (id, wave, title) pour la vague des positions. */
  items?: AnyRecord[] | null;
}): ConsolidatedSourcing {
  const { products, candidates, positions = [], prospects, suppliers, rfqs } = args;
  const supplierById = new Map<string, AnyRecord>((suppliers || []).map(s => [String(s.id), s]));
  const prospectById = new Map<string, AnyRecord>((prospects || []).map(p => [String(p.id), p]));
  const readinessById = new Map<string, { ready: boolean; missing: string[]; catalogStatus: string | null }>(
    (args.readiness || []).map(r => [String(r.productId), {
      ready: r.ready === true,
      missing: Array.isArray(r.missing) ? r.missing.filter(m => typeof m === 'string' && m.trim() !== '') : [],
      catalogStatus: typeof r.catalogStatus === 'string' && r.catalogStatus.trim() !== '' ? r.catalogStatus : null,
    }])
  );
  const readinessAvailable = (args.readiness || []).length > 0;
  const itemById = new Map<string, AnyRecord>((args.items || []).map(i => [String(i.id), i]));

  const rows: ConsolidatedRow[] = [];

  for (const product of products || []) {
    const status = String(product.catalogStatus ?? product.catalog_status ?? '');
    if (status === 'unavailable') continue; // les 17 fiches retirées ne font pas partie de la vue
    const supplier = product.supplierId ? supplierById.get(String(product.supplierId)) : undefined;
    const price = Number(product.basePrice ?? product.price);
    // CHANTIER D — registre : publié est un fait (statut catalogue) ; conforme
    // exige la readiness au vert ; sinon fiche créée (jamais supposé).
    const readinessEntry = readinessById.get(String(product.id)) || null;
    const published = status === 'published';
    const ready = readinessEntry ? readinessEntry.ready : null;
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
      // Pipeline : la vérité catalogue décide — achetable > publié > brouillon.
      state: product.truth?.isCheckoutEligible === true ? 'en_vente'
        : status === 'published' ? 'publie'
        : 'conforme',
      format: null,
      registryStage: published ? 'publie' : (ready === true ? 'conforme' : 'fiche_creee'),
      ready,
      missing: readinessEntry?.missing || [],
      wave: null,
      linkedProductId: String(product.id),
      linkedCandidateId: str(product.source_candidate_id ?? product.sourceCandidateId),
    });
  }

  for (const candidate of candidates || []) {
    const prospect = prospectById.get(String(candidate.prospect_id));
    const price = priceFromCents(candidate.public_price_cents);
    // CHANTIER D — réconciliation : si le candidat a une fiche créée
    // (draft_product_id, posé par la route d'import gardée), son stade de
    // registre est celui de la FICHE (même id des deux côtés), dérivé de la
    // readiness ; sans fiche, la référence reste « identifiée ».
    const draftProductId = str(candidate.draft_product_id);
    let registryStage: RegistryStage = 'identifie';
    let ready: boolean | null = null;
    let missing: string[] = [];
    if (draftProductId) {
      const linkedReadiness = readinessById.get(draftProductId) || null;
      const linkedPublished = linkedReadiness?.catalogStatus === 'published' || candidate.published_on != null;
      registryStage = linkedPublished ? 'publie'
        : (linkedReadiness?.ready === true ? 'conforme' : 'fiche_creee');
      ready = linkedReadiness ? linkedReadiness.ready : null;
      missing = linkedReadiness?.missing || [];
    }
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
      // Pipeline : publié > échantillon/prix pro obtenu (sourced) > identifié.
      state: candidate.published_on ? 'publie'
        : (candidate.sample_validated === true || priceFromCents(candidate.purchase_price_cents) != null) ? 'source'
        : 'identifie',
      format: null,
      registryStage,
      ready,
      missing,
      wave: null,
      linkedProductId: draftProductId,
      linkedCandidateId: null,
    });
  }

  // Positions du sourcing de fond (250 lignes, table sourcing_fond_positions).
  for (const position of positions || []) {
    const price = priceFromCents(position.prix_constate_cents);
    // CHANTIER D — la vague vient de l'item de sourcing (jamais supposée :
    // item inconnu = vague null, jamais une valeur par défaut).
    const item = itemById.get(String(position.sourcing_item_id));
    rows.push({
      kind: 'position',
      id: `pos-${position.sourcing_item_id ?? 'x'}-${position.rang ?? position.id}`,
      name: String(position.produit || position.id),
      brand: str(position.marque),
      priceEur: price,
      priceLabel: price != null ? 'prix public constaté' : 'à obtenir',
      supplierName: str(position.fournisseur_canal),
      supplierContact: null, // le canal n'a pas de contact direct : il passe par les prospects/fournisseurs
      supplierWebsite: null,
      emailState: 'a_preparer',
      state: price != null ? 'source' : 'identifie',
      format: str(position.format),
      registryStage: 'identifie', // une position n'a pas de fiche catalogue
      ready: null,
      missing: [],
      wave: item ? str(item.wave) : null,
      linkedProductId: null,
      linkedCandidateId: null,
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

  const pipeline: Record<PipelineState, number> = { identifie: 0, contacte: 0, source: 0, conforme: 0, publie: 0, en_vente: 0 };
  for (const row of rows) pipeline[row.state] += 1;

  const registry: Record<RegistryStage, number> = { identifie: 0, fiche_creee: 0, conforme: 0, publie: 0 };
  for (const row of rows) registry[row.registryStage] += 1;

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    products: rows.filter(r => r.kind === 'product').length,
    candidates: rows.filter(r => r.kind === 'candidate').length,
    positions: rows.filter(r => r.kind === 'position').length,
    pipeline,
    registry,
    readinessAvailable,
    rows,
    supplierBlocks,
  };
}

/**
 * CHANTIER D — FILTRE DU REGISTRE.
 * Fournisseur (nom exact ou 'sans' pour les lignes à qualifier), stade de
 * registre, vague ('sans' pour les lignes sans vague), recherche libre.
 * Cumulable ; une seule source de vérité = les lignes du registre.
 */
export type RegistryFilter = {
  search: string;
  supplier: string | null;
  stage: RegistryStage | 'all';
  wave: string | null;
};

export const emptyRegistryFilter = (): RegistryFilter => ({ search: '', supplier: null, stage: 'all', wave: null });

export function applyRegistryFilter(rows: ConsolidatedRow[], f: RegistryFilter): ConsolidatedRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter(row => {
    if (f.stage !== 'all' && row.registryStage !== f.stage) return false;
    if (f.supplier) {
      if (f.supplier === 'sans') { if (row.supplierName) return false; }
      else if (row.supplierName !== f.supplier) return false;
    }
    if (f.wave) {
      if (f.wave === 'sans') { if (row.wave) return false; }
      else if (row.wave !== f.wave) return false;
    }
    if (q) {
      const hay = `${row.name} ${row.brand || ''} ${row.supplierName || ''} ${row.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * CHANTIER D — OPTIONS DE FILTRE : ce que les données proposent vraiment.
 * Les fournisseurs et les vagues sont ceux des lignes (jamais un référentiel
 * supposé) ; chaque option porte son compte réel.
 */
export function registryFilterOptions(rows: ConsolidatedRow[]): {
  suppliers: Array<{ value: string; label: string; count: number }>;
  waves: Array<{ value: string; label: string; count: number }>;
  stages: Array<{ value: RegistryStage | 'all'; label: string; count: number }>;
} {
  const supplierCounts = new Map<string, number>();
  const waveCounts = new Map<string, number>();
  const stageCounts: Record<RegistryStage, number> = { identifie: 0, fiche_creee: 0, conforme: 0, publie: 0 };
  let withoutSupplier = 0;
  let withoutWave = 0;
  for (const row of rows) {
    stageCounts[row.registryStage] += 1;
    if (row.supplierName) supplierCounts.set(row.supplierName, (supplierCounts.get(row.supplierName) || 0) + 1);
    else withoutSupplier += 1;
    if (row.wave) waveCounts.set(row.wave, (waveCounts.get(row.wave) || 0) + 1);
    else withoutWave += 1;
  }
  const suppliers = [...supplierCounts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));
  if (withoutSupplier > 0) suppliers.push({ value: 'sans', label: 'Fournisseur à qualifier', count: withoutSupplier });
  const waves = [...waveCounts.entries()]
    .map(([value, count]) => ({ value, label: `Vague ${value}`, count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  if (withoutWave > 0) waves.push({ value: 'sans', label: 'Sans vague', count: withoutWave });
  const stages: Array<{ value: RegistryStage | 'all'; label: string; count: number }> = [
    { value: 'all', label: 'Tous', count: rows.length },
  ];
  for (const value of REGISTRY_STAGE_ORDER) stages.push({ value, label: REGISTRY_STAGE_LABELS[value], count: stageCounts[value] });
  return { suppliers, waves, stages };
}

/**
 * CHANTIER D — EXPORT CSV DU REGISTRE.
 * Sémicolons (compatibilité Excel FR), CRLF, BOM UTF-8, guillemets échappés.
 * Une seule source de vérité : les lignes passées. Les prix sont en euros
 * (virgule décimale, comme affichés) ; l'absence reste vide, jamais « 0 ».
 */
export function registryToCsv(rows: ConsolidatedRow[]): string {
  const esc = (value: string | null | number | undefined): string => {
    if (value == null) return '';
    const s = String(value);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const eur = (n: number | null): string => (n == null ? '' : n.toFixed(2).replace('.', ','));
  const header = ['type', 'id', 'nom', 'marque', 'format', 'prix_eur', 'prix_source', 'fournisseur', 'contact', 'site', 'e_mail', 'vague', 'statut_registre', 'statut_pipeline', 'critères_manquants', 'fiche_liee', 'candidat_lie'];
  const lines: string[] = [header.join(';')];
  for (const row of rows) {
    lines.push([
      row.kind, row.id, row.name, row.brand, row.format,
      eur(row.priceEur), row.priceLabel, row.supplierName, row.supplierContact,
      row.supplierWebsite, row.emailState, row.wave,
      REGISTRY_STAGE_LABELS[row.registryStage], row.state,
      row.missing.join(' | '), row.linkedProductId, row.linkedCandidateId,
    ].map(esc).join(';'));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

/**
 * CHANTIER D — E-MAIL D'UNE RÉFÉRENCE SEULE (par ligne).
 * Même discipline que l'e-mail du bloc : données réelles uniquement, mêmes
 * attentes standard. La ligne n'existe que via ses champs réels.
 */
export function buildRowEmail(row: ConsolidatedRow): { subject: string; body: string } {
  const supplierName = row.supplierName || 'votre société';
  const price = row.priceEur != null ? ` — prix public constaté : ${row.priceEur.toFixed(2).replace('.', ',')} €` : ' — prix à obtenir';
  const subject = `[KURLA] Devis ${row.name}${row.brand ? ` — ${row.brand}` : ''}`;
  const lines: string[] = [];
  lines.push(`Objet : ${subject}`);
  lines.push('');
  lines.push('Madame, Monsieur,');
  lines.push('');
  lines.push(`KURLA, boutique française de soins cheveux & peau (peaux mélaninées comprises), prépare en année 1 un référencement sans stock (affiliation / dropship / 3PL) et souhaite référencer chez ${supplierName} :`);
  lines.push('');
  lines.push(`Référence visée : ${row.name}${row.brand ? ` (${row.brand})` : ''}${row.format ? ` — ${row.format}` : ''}${price}`);
  lines.push('');
  lines.push('Pour cette référence, nous attendons :');
  for (const ask of STANDARD_ASKS) lines.push(`- ${ask}`);
  lines.push('');
  lines.push('Un devis partiel est acceptable ; nous ne complétons rien à votre place.');
  lines.push('');
  lines.push('Cordialement,');
  lines.push('L’équipe KURLA');
  return { subject, body: lines.join('\n') };
}
