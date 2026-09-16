/**
 * DOSSIER FOURNISSEUR — assembler ce qu'on sait de chaque fournisseur et
 * nommer ce qui manque.
 *
 * Pourquoi ce module existe : les 28 prospects ont un contact pour 3 d'entre
 * eux, aucune date de relance, aucun MOQ ni délai. Les routes d'écriture
 * existent déjà (PUT/POST prospects, fournisseurs) ; ce qui manquait, c'est
 * de **voir** l'état d'un fournisseur en un seul endroit, et de savoir
 * précisément quel champ appeler chez qui.
 *
 * Règle tenue partout, et c'est la seule défendable : **rien n'est déduit**.
 * Un contact n'est affiché que s'il est écrit dans le prospect ; s'il existe
 * ailleurs dans le système (vue consolidée), il est **proposé**, jamais
 * écrit — l'adoption reste un acte humain explicite. Un champ vide est
 * « inconnu », jamais « non ».
 */

import type { SourcingProspect, ProductCandidate, TriState } from './db/prospectStore';
import type { SupplierEmailBlock } from './sourcingConsolidated';

/** Les pièces qu'un acheteur doit réunir avant de mettre un produit en vente. */
export const PIECES = [
  { cle: 'wholesalePricing', libelle: 'tarif de gros' },
  { cle: 'moq', libelle: 'quantité minimale (MOQ)' },
  { cle: 'leadTimeFr', libelle: 'délai vers la France' },
  { cle: 'dropshipping', libelle: 'dropshipping possible' },
  { cle: 'inciProvided', libelle: 'INCI fournie' },
  { cle: 'euCompliance', libelle: 'conformité UE (CPNP/RP)' },
  { cle: 'visualsGranted', libelle: 'droits sur les visuels' },
  { cle: 'samplesReceived', libelle: 'échantillons reçus' },
] as const;

export type PieceCle = (typeof PIECES)[number]['cle'];
export type PieceState = 'oui' | 'non' | 'en_attente' | 'inconnu';

export type FollowUpState =
  | 'aucune_demarche'
  | 'a_relancer'
  | 'relance'
  | 'repondu'
  | 'sans_reponse'
  | 'decide';

export type ContactProposal = {
  email: string;
  /** D'où vient la proposition — jamais une invention, toujours une source. */
  source: string;
  /** Le prospect a-t-il déjà son propre e-mail ? Si oui, rien n'est proposé. */
  dejaRenseigne: false;
};

export type SupplierDossierRow = {
  id: string;
  name: string;
  route: string;
  contactType: string;
  specialty: string | null;
  website: string | null;
  status: string;
  contactName: string | null;
  /** E-mail réellement enregistré sur le prospect — null si absent. */
  contactEmail: string | null;
  /** Contact trouvé ailleurs dans le système : proposé, jamais écrit. */
  proposedContact: ContactProposal | null;
  pieces: Record<PieceCle, PieceState>;
  /**
   * Ce qu'il reste à obtenir, nommé **avec son état** — c'est la valeur du
   * dossier. « INCI fournie — en attente » (on a demandé) ne se traite pas
   * comme « INCI fournie — inconnu » (on n'a jamais demandé) : le premier se
   * relance, le second se demande.
   */
  missing: string[];
  /** Les mêmes manques, par clé, pour regrouper sans dépendre du libellé. */
  missingKeys: PieceCle[];
  completeness: { filled: number; expected: number; pct: number };
  candidates: { count: number; ids: string[] };
  followUp: { state: FollowUpState; sinceDays: number | null; overdue: boolean; nextOn: string | null };
  decision: string | null;
  decidedOn: string | null;
  message: { state: 'pret' | 'a_preparer' | 'aucun'; subject: string | null; rows: number };
};

export type SupplierDossierSummary = {
  suppliers: number;
  withContact: number;
  withoutContact: number;
  /** Combien de fournisseurs n'ont toujours aucun contact, contact proposé compris. */
  unreachable: number;
  completenessPct: number;
  overdue: number;
  neverContacted: number;
  /** Les pièces les plus souvent absentes, toutes fournisseurs confondus. */
  piecesManquantes: { cle: string; libelle: string; count: number }[];
  /** Les fournisseurs qui portent le plus de candidats : les prioritaires. */
  prioritized: { id: string; name: string; candidates: number; missing: number }[];
};

/** Normalisation stricte : accents et ponctuation ne doivent pas séparer deux noms. */
export function normalizeName(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function triState(value: unknown): PieceState {
  const v = String(value ?? '').trim();
  if (v === 'yes') return 'oui';
  if (v === 'no') return 'non';
  if (v === 'pending') return 'en_attente';
  if (v === 'na') return 'oui'; // « sans objet » : la pièce n'est pas requise
  return 'inconnu';
}

function daysBetween(from: string | null | undefined, now: Date): number | null {
  if (!from) return null;
  const t = Date.parse(from);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

function isFilled(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/**
 * Assemble le dossier. Tri : d'abord les fournisseurs qui portent le plus de
 * candidats (ceux dont le blocage coûte le plus cher), puis les plus
 * incomplets, puis par nom — l'ordre est donc stable et reproductible.
 */
export function buildSupplierDossier(args: {
  prospects: SourcingProspect[];
  candidates?: ProductCandidate[];
  supplierBlocks?: SupplierEmailBlock[];
  now?: Date;
}): SupplierDossierRow[] {
  const now = args.now ?? new Date();
  const prospects = args.prospects ?? [];
  const candidates = args.candidates ?? [];
  const blocks = args.supplierBlocks ?? [];

  /** Un manque se lit avec sa nuance : demandé, jamais demandé, ou refusé. */
  const etatLisible: Record<PieceState, string | null> = {
    oui: null,
    en_attente: 'en attente',
    non: 'refusé',
    inconnu: 'inconnu',
  };

  const rows: SupplierDossierRow[] = prospects.map((p) => {
    const pieces = {} as Record<PieceCle, PieceState>;
    const missing: string[] = [];
    const missingKeys: PieceCle[] = [];
    for (const piece of PIECES) {
      const raw = (p as unknown as Record<string, unknown>)[piece.cle];
      // `moq` et `leadTimeFr` sont du texte libre : non vides, ils sont obtenus.
      const state = (piece.cle === 'moq' || piece.cle === 'leadTimeFr')
        ? (isFilled(raw) ? 'oui' : 'inconnu')
        : triState(raw);
      pieces[piece.cle] = state;
      if (state !== 'oui') {
        const nuance = etatLisible[state];
        missing.push(nuance ? `${piece.libelle} — ${nuance}` : piece.libelle);
        missingKeys.push(piece.cle);
      }
    }

    const nomPropre = normalizeName(p.name);
    const bloc = blocks.find((b) => {
      const bn = normalizeName(b?.name);
      if (!bn || !nomPropre) return false;
      return bn === nomPropre || bn.includes(nomPropre) || nomPropre.includes(bn);
    });

    const contactEmail = isFilled(p.contactEmail) ? String(p.contactEmail).trim() : null;
    const proposedContact: ContactProposal | null =
      contactEmail === null && bloc && isFilled(bloc.contact)
        ? { email: String(bloc.contact).trim(), source: String(bloc.name), dejaRenseigne: false }
        : null;

    const rattachés = candidates.filter((c) => c?.prospectId === p.id);

    // Une relance est en retard si la date prévue est passée et qu'aucune
    // décision n'a été prise depuis.
    const followUpOn = isFilled(p.followUpOn) ? String(p.followUpOn) : null;
    const overdue = Boolean(followUpOn && Date.parse(followUpOn) < now.getTime() && !isFilled(p.decision));
    let state: FollowUpState = 'aucune_demarche';
    if (isFilled(p.decision)) state = 'decide';
    else if (p.followUpStatus === 'replied') state = 'repondu';
    else if (p.followUpStatus === 'no_response') state = 'sans_reponse';
    else if (p.followUpStatus === 'followed') state = 'relance';
    else if (p.followUpStatus === 'to_follow' || overdue) state = 'a_relancer';

    const expected = PIECES.length;
    const filled = expected - missing.length;

    return {
      id: p.id,
      name: p.name,
      route: p.route,
      contactType: p.contactType,
      specialty: isFilled(p.specialty) ? String(p.specialty) : null,
      website: isFilled(p.sourceUrl) ? String(p.sourceUrl) : null,
      status: p.status,
      contactName: isFilled(p.contactName) ? String(p.contactName) : null,
      contactEmail,
      proposedContact,
      pieces,
      missing,
      missingKeys,
      completeness: { filled, expected, pct: Math.round((filled / expected) * 100) },
      candidates: { count: rattachés.length, ids: rattachés.map((c) => c.id) },
      followUp: {
        state,
        sinceDays: daysBetween(p.firstContactedOn ?? null, now),
        overdue,
        nextOn: followUpOn,
      },
      decision: isFilled(p.decision) ? String(p.decision) : null,
      decidedOn: isFilled(p.decidedOn) ? String(p.decidedOn) : null,
      message: bloc
        ? { state: bloc.emailState === 'pret' ? 'pret' : 'a_preparer', subject: bloc.emailSubject ?? null, rows: bloc.rowCount ?? 0 }
        : { state: 'aucun' as const, subject: null, rows: 0 },
    };
  });

  return rows.sort(
    (a, b) =>
      b.candidates.count - a.candidates.count ||
      b.missing.length - a.missing.length ||
      a.name.localeCompare(b.name),
  );
}

export function summarizeSupplierDossier(rows: SupplierDossierRow[], limit = 8): SupplierDossierSummary {
  const total = rows.length;
  const withContact = rows.filter((r) => r.contactEmail !== null).length;
  const withoutContact = total - withContact;
  const unreachable = rows.filter((r) => r.contactEmail === null && r.proposedContact === null).length;

  // Regroupement par clé de pièce : les libellés portent désormais une
  // nuance (« en attente », « refusé ») qui les rendrait incomparables.
  const comptePieces = new Map<PieceCle, number>();
  for (const r of rows) {
    for (const c of r.missingKeys) comptePieces.set(c, (comptePieces.get(c) ?? 0) + 1);
  }
  const libelleParCle = new Map(PIECES.map(p => [p.cle as PieceCle, p.libelle]));

  const completude = total === 0
    ? 0
    : Math.round(rows.reduce((s, r) => s + r.completeness.pct, 0) / total);

  return {
    suppliers: total,
    withContact,
    withoutContact,
    unreachable,
    completenessPct: completude,
    overdue: rows.filter((r) => r.followUp.overdue).length,
    neverContacted: rows.filter((r) => r.followUp.state === 'aucune_demarche').length,
    piecesManquantes: [...comptePieces]
      .map(([cle, count]) => ({ cle, libelle: libelleParCle.get(cle) ?? String(cle), count }))
      .sort((a, b) => b.count - a.count || a.libelle.localeCompare(b.libelle))
      .slice(0, limit),
    prioritized: rows
      .slice()
      .sort(
        (a, b) =>
          b.candidates.count - a.candidates.count ||
          b.missing.length - a.missing.length ||
          a.name.localeCompare(b.name),
      )
      .slice(0, limit)
      .map((r) => ({ id: r.id, name: r.name, candidates: r.candidates.count, missing: r.missing.length })),
  };
}
