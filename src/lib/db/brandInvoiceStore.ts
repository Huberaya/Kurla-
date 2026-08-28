import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { getBrandContract } from './brandContractStore';

import type { BrandInvoice } from './types';
import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 12 (bloc D2) — FACTURATION DU CONTRAT MARQUE.
 *
 * Quatre règles, vérifiées par `tests/kurla_brand_invoice.test.ts` :
 *
 *  1. **On ne facture qu'un contrat actif.** Facturer une marque qui n'a rien
 *     signé, ou dont le contrat est résilié, serait encaisser sans contrepartie.
 *  2. **Le montant vient du contrat.** Aucune facture ne peut être émise pour un
 *     autre montant que celui du contrat signé — sinon le prix affiché à la
 *     signature ne voudrait rien dire.
 *  3. **`paid` ne se déclare pas, il se prouve.** Le passage à `paid` exige un
 *     statut de paiement confirmé **et** un montant identique à celui émis.
 *  4. **Une seule facture en attente par contrat** : deux factures ouvertes pour
 *     la même prestation, c'est une double facturation qui attend d'arriver.
 *
 * Ce qui est payé ici est un service B2B (une étude k-anonyme). Ce n'est pas une
 * fonction essentielle mise derrière un péage artificiel : le membre, lui, ne
 * paie rien pour participer à un test ni pour lire ses propres données.
 */

function mapInvoiceRow(row: any): BrandInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number ?? row.invoiceNumber,
    contractId: row.contract_id ?? row.contractId,
    brandUserId: row.brand_user_id ?? row.brandUserId,
    amountCents: row.amount_cents ?? row.amountCents,
    currency: (row.currency ?? 'eur') as 'eur',
    status: row.status,
    issuedAt: row.issued_at ?? row.issuedAt,
    issuedBy: row.issued_by ?? row.issuedBy,
    stripeSessionId: row.stripe_session_id ?? row.stripeSessionId ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? row.stripePaymentIntentId ?? undefined,
    paidAt: row.paid_at ?? row.paidAt ?? undefined,
    voidedAt: row.voided_at ?? row.voidedAt ?? undefined,
    voidReason: row.void_reason ?? row.voidReason ?? undefined
  };
}

/** Numéro lisible et stable : ce que la marque mettra en comptabilité. */
function buildInvoiceNumber(issuedAt: string): string {
  const date = new Date(issuedAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `KURLA-B2B-${year}${month}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function issueBrandInvoice(
  store: SupabaseServerStore,
  adminId: string,
  contractId: string
): Promise<BrandInvoice> {
  const contract = await getBrandContract(store, contractId);
  if (!contract) throw new Error('Contrat introuvable.');
  if (contract.status !== 'active') {
    throw new Error(`Seul un contrat actif peut être facturé (statut actuel : « ${contract.status} »).`);
  }
  if (typeof contract.priceCents !== 'number' || contract.priceCents <= 0) {
    throw new Error('Ce contrat ne porte aucun prix : corrigez le contrat avant de facturer.');
  }

  const existing = await getBrandInvoicesForContract(store, contractId);
  if (existing.some(invoice => invoice.status === 'pending')) {
    throw new Error('Une facture est déjà en attente pour ce contrat : annulez-la ou attendez son règlement.');
  }

  const issuedAt = new Date().toISOString();
  const invoice: BrandInvoice = {
    id: randomUUID(),
    invoiceNumber: buildInvoiceNumber(issuedAt),
    contractId,
    brandUserId: contract.brandUserId,
    amountCents: contract.priceCents,
    currency: 'eur',
    status: 'pending',
    issuedAt,
    issuedBy: adminId
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('brand_invoices').insert({
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      contract_id: invoice.contractId,
      brand_user_id: invoice.brandUserId,
      amount_cents: invoice.amountCents,
      currency: invoice.currency,
      status: invoice.status,
      issued_at: invoice.issuedAt,
      issued_by: invoice.issuedBy
    });
    ensureDatabaseSuccess('émission de la facture marque', error);
  } else {
    store.inMemoryBrandInvoices.push(invoice);
  }

  return invoice;
}

export async function getBrandInvoicesForContract(store: SupabaseServerStore, contractId: string): Promise<BrandInvoice[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('brand_invoices').select('*').eq('contract_id', contractId).order('issued_at', { ascending: false });
    ensureDatabaseSuccess('lecture des factures du contrat', error);
    return (data || []).map(mapInvoiceRow);
  }
  return store.inMemoryBrandInvoices.filter(invoice => invoice.contractId === contractId);
}

export async function getBrandInvoicesForUser(store: SupabaseServerStore, brandUserId: string): Promise<BrandInvoice[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('brand_invoices').select('*').eq('brand_user_id', brandUserId).order('issued_at', { ascending: false });
    ensureDatabaseSuccess('lecture des factures de la marque', error);
    return (data || []).map(mapInvoiceRow);
  }
  return store.inMemoryBrandInvoices.filter(invoice => invoice.brandUserId === brandUserId);
}

export async function getBrandInvoice(store: SupabaseServerStore, invoiceId: string): Promise<BrandInvoice | undefined> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('brand_invoices').select('*').eq('id', invoiceId).maybeSingle();
    ensureDatabaseSuccess('lecture de la facture', error);
    return data ? mapInvoiceRow(data) : undefined;
  }
  const found = store.inMemoryBrandInvoices.find(invoice => invoice.id === invoiceId);
  return found ? { ...found } : undefined;
}

export interface BrandInvoiceSessionProof {
  invoiceId: string;
  /** `amount_total` de la session Stripe. */
  amountTotalCents: number | null;
  currency?: string | null;
  paymentStatus?: string | null;
  sessionId?: string | null;
  paymentIntentId?: string | null;
}

/**
 * Règlement d'une facture. N'accepte que des faits vérifiés côté Stripe :
 * statut `paid`, devise attendue, montant identique à celui émis. Un écart
 * lève une erreur — le webhook la journalise et ne marque rien.
 */
export async function markBrandInvoicePaidFromSession(
  store: SupabaseServerStore,
  proof: BrandInvoiceSessionProof
): Promise<BrandInvoice> {
  const invoice = await getBrandInvoice(store, proof.invoiceId);
  if (!invoice) throw new Error('Facture introuvable.');
  if (invoice.status === 'paid') return invoice;
  if (invoice.status === 'void') throw new Error('Cette facture a été annulée.');
  if (proof.paymentStatus !== 'paid') {
    throw new Error(`Paiement non confirmé (statut Stripe : ${proof.paymentStatus || 'absent'}).`);
  }
  if (proof.currency && proof.currency.toLowerCase() !== invoice.currency) {
    throw new Error(`Devise incohérente : facture en ${invoice.currency}, session en ${proof.currency}.`);
  }
  if (proof.amountTotalCents !== invoice.amountCents) {
    throw new Error(`Montant incohérent : facture ${invoice.amountCents} centimes, session ${proof.amountTotalCents ?? 'null'}.`);
  }

  invoice.status = 'paid';
  invoice.paidAt = new Date().toISOString();
  invoice.stripeSessionId = proof.sessionId ?? invoice.stripeSessionId;
  invoice.stripePaymentIntentId = proof.paymentIntentId ?? invoice.stripePaymentIntentId;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('brand_invoices').update({
      status: invoice.status,
      paid_at: invoice.paidAt,
      stripe_session_id: invoice.stripeSessionId ?? null,
      stripe_payment_intent_id: invoice.stripePaymentIntentId ?? null
    }).eq('id', invoice.id);
    ensureDatabaseSuccess('règlement de la facture marque', error);
  } else {
    const index = store.inMemoryBrandInvoices.findIndex(item => item.id === invoice.id);
    if (index >= 0) store.inMemoryBrandInvoices[index] = invoice;
  }

  return invoice;
}

/** Rattachement de la session de paiement à la facture, avant redirection. */
export async function attachBrandInvoiceCheckoutSession(
  store: SupabaseServerStore,
  invoiceId: string,
  sessionId: string
): Promise<BrandInvoice> {
  const invoice = await getBrandInvoice(store, invoiceId);
  if (!invoice) throw new Error('Facture introuvable.');
  invoice.stripeSessionId = sessionId;
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('brand_invoices').update({ stripe_session_id: sessionId }).eq('id', invoiceId);
    ensureDatabaseSuccess('rattachement de la session de paiement', error);
  } else {
    const index = store.inMemoryBrandInvoices.findIndex(item => item.id === invoiceId);
    if (index >= 0) store.inMemoryBrandInvoices[index] = invoice;
  }
  return invoice;
}

export async function voidBrandInvoice(store: SupabaseServerStore, invoiceId: string, reason: string): Promise<BrandInvoice> {
  const invoice = await getBrandInvoice(store, invoiceId);
  if (!invoice) throw new Error('Facture introuvable.');
  if (invoice.status === 'paid') throw new Error('Une facture réglée ne s’annule pas : passez par un remboursement tracé.');
  if (invoice.status === 'void') return invoice;
  const text = String(reason || '').trim();
  if (text.length < 5) throw new Error('Le motif d’annulation est requis (5 caractères minimum).');

  invoice.status = 'void';
  invoice.voidedAt = new Date().toISOString();
  invoice.voidReason = text;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('brand_invoices').update({
      status: 'void', voided_at: invoice.voidedAt, void_reason: text
    }).eq('id', invoiceId);
    ensureDatabaseSuccess('annulation de la facture', error);
  } else {
    const index = store.inMemoryBrandInvoices.findIndex(item => item.id === invoiceId);
    if (index >= 0) store.inMemoryBrandInvoices[index] = invoice;
  }

  return invoice;
}

/** Le rapport k-anonyme n'est livré qu'à une marque dont la facture est réglée. */
export async function resolveBrandReportAccess(
  store: SupabaseServerStore,
  contractId: string
): Promise<{ allowed: boolean; reason?: string; invoiceId?: string; amountCents?: number }> {
  const invoices = await getBrandInvoicesForContract(store, contractId);
  const paid = invoices.find(invoice => invoice.status === 'paid');
  if (paid) return { allowed: true, invoiceId: paid.id, amountCents: paid.amountCents };
  const pending = invoices.find(invoice => invoice.status === 'pending');
  if (pending) {
    return {
      allowed: false,
      invoiceId: pending.id,
      amountCents: pending.amountCents,
      reason: `Facture ${pending.invoiceNumber} en attente de règlement (${(pending.amountCents / 100).toFixed(2)} €).`
    };
  }
  return { allowed: false, reason: 'Aucune facture émise pour ce contrat : le rapport ne peut pas être livré.' };
}
