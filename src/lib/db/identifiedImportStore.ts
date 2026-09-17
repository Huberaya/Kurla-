/**
 * CHANTIER 13 — persistance de l'import identifié.
 *
 * Écrit `sourcing_fond_positions` et `sourcing_product_candidates`.
 * N'importe pas le catalogue Hair. N'exporte aucune constante (bindDomain).
 */
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { listCandidates, upsertCandidate } from './prospectStore';
import { listSourcingItems } from './sourcingStore';
import {
  applyResultFromPlan,
  commitIdentifiedImport,
  parseIdentifiedImportSource,
  type IdentifiedFondWrite,
  type IdentifiedImportApplyResult,
  type IdentifiedImportSource,
} from '../identifiedImport';
import { planIdentifiedImport } from '../identifiedProducts';
import { unifyCandidate, unifyFondPosition } from '../productLifecycle';

import type { SupabaseServerStore } from '../serverDb';

export type FondPositionRecord = {
  sourcingItemId: string;
  rang: number;
  marque: string;
  produit: string;
  format: string | null;
  prixConstateCents: number | null;
  statutPrix: string;
  fournisseurCanal: string;
  createdAt: string;
};

function mapFond(row: any): FondPositionRecord {
  return {
    sourcingItemId: String(row.sourcing_item_id ?? row.sourcingItemId),
    rang: Number(row.rang),
    marque: String(row.marque ?? ''),
    produit: String(row.produit ?? ''),
    format: row.format ?? null,
    prixConstateCents: row.prix_constate_cents ?? row.prixConstateCents ?? null,
    statutPrix: String(row.statut_prix ?? row.statutPrix ?? ''),
    fournisseurCanal: String(row.fournisseur_canal ?? row.fournisseurCanal ?? ''),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  };
}

export async function listFondPositions(store: SupabaseServerStore): Promise<FondPositionRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('sourcing_fond_positions').select('*');
    ensureDatabaseSuccess('lecture des positions de fond', error);
    return (data || []).map(mapFond);
  }
  return (store.inMemoryFondPositions || []).map(mapFond);
}

async function insertFondPosition(store: SupabaseServerStore, row: IdentifiedFondWrite): Promise<void> {
  const record: FondPositionRecord = {
    sourcingItemId: row.sourcingItemId,
    rang: row.rang,
    marque: row.marque,
    produit: row.produit,
    format: row.format,
    prixConstateCents: row.prixConstateCents,
    statutPrix: row.statutPrix,
    fournisseurCanal: row.fournisseurCanal,
    createdAt: new Date().toISOString(),
  };
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('sourcing_fond_positions').insert({
      sourcing_item_id: record.sourcingItemId,
      rang: record.rang,
      marque: record.marque,
      produit: record.produit,
      format: record.format,
      prix_constate_cents: record.prixConstateCents,
      statut_prix: record.statutPrix,
      fournisseur_canal: record.fournisseurCanal,
    });
    if (error && (error as { code?: string }).code === '23505') return;
    ensureDatabaseSuccess('écriture d’une position de fond', error);
    return;
  }
  const exists = store.inMemoryFondPositions.some(
    entry => entry.sourcingItemId === record.sourcingItemId && entry.rang === record.rang,
  );
  if (!exists) store.inMemoryFondPositions.push(record);
}

export async function applyIdentifiedImport(
  store: SupabaseServerStore,
  adminId: string,
  input: IdentifiedImportSource & { dryRun?: boolean },
): Promise<IdentifiedImportApplyResult> {
  const drafts = parseIdentifiedImportSource(input || {});
  const [fond, candidates, items] = await Promise.all([
    listFondPositions(store),
    listCandidates(store),
    listSourcingItems(store),
  ]);
  const existing = [
    ...fond.map(row => unifyFondPosition({
      sourcingItemId: row.sourcingItemId,
      rang: row.rang,
      marque: row.marque,
      produit: row.produit,
      fournisseur_canal: row.fournisseurCanal,
      prix_constate_cents: row.prixConstateCents,
    })),
    ...candidates.map(row => unifyCandidate({
      id: row.id,
      brand: row.brand,
      product: row.product,
      category: row.category,
      public_price_cents: row.publicPriceCents,
      draft_product_id: (row as { draftProductId?: string | null }).draftProductId,
    })),
  ];
  const plan = planIdentifiedImport(drafts, existing);
  const dryRun = input?.dryRun === true;
  if (dryRun) return applyResultFromPlan(plan, null, true);

  const occupiedRangs = new Map<string, Set<number>>();
  for (const row of fond) {
    const set = occupiedRangs.get(row.sourcingItemId) || new Set<number>();
    set.add(row.rang);
    occupiedRangs.set(row.sourcingItemId, set);
  }

  const commit = await commitIdentifiedImport(plan, {
    existingItemIds: new Set(items.map(item => item.id)),
    occupiedRangs,
    writeFond: (row) => insertFondPosition(store, row),
    writeCandidate: async (row) => {
      const candidate = await upsertCandidate(store, adminId, {
        brand: row.brand,
        product: row.product,
        category: row.category,
        notes: row.notes,
        publicPriceCents: row.publicPriceCents,
      });
      return { id: candidate.id };
    },
  });
  return applyResultFromPlan(plan, commit, false);
}
