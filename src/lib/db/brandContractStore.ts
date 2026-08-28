import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { BRAND_CONTRACT_TERMS_TEXT, BRAND_CONTRACT_TERMS_VERSION, brandContractTermsHash } from '../brandContractTerms';

import type { BrandContract, BrandContractStatus } from './types';
import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 12 (bloc D) — CONTRAT MARQUE SIGNÉ.
 *
 * Quatre règles, toutes vérifiées par `tests/kurla_brand_contract.test.ts` :
 *
 *  1. **Deux signatures, dans l'ordre.** La marque signe d'abord le texte
 *     qu'elle accepte ; KURLA contresigne ensuite. Sans les deux, le contrat
 *     n'est pas `active` et la marque ne peut rien demander.
 *  2. **On signe un texte, pas une intention.** La signature porte sur
 *     `termsHash`. Si le texte change de version, les signatures existantes ne
 *     couvrent plus rien : il faut resigner.
 *  3. **Les clauses ne sont pas présumées.** La marque doit accepter
 *     explicitement la clause « agrégats uniquement » et la clause « aucune
 *     donnée personnelle cédée ». Un accord implicite n'est pas un accord.
 *  4. **Une marque ne signe que son contrat.** Un contrat émis pour une marque
 *     ne peut être signé par une autre.
 */

function mapContractRow(row: any): BrandContract {
  return {
    id: row.id,
    brandUserId: row.brand_user_id ?? row.brandUserId,
    brandName: row.brand_name ?? row.brandName,
    contactEmail: row.contact_email ?? row.contactEmail,
    termsVersion: row.terms_version ?? row.termsVersion,
    termsHash: row.terms_hash ?? row.termsHash,
    status: row.status,
    priceCents: row.price_cents ?? row.priceCents ?? null,
    issuedAt: row.issued_at ?? row.issuedAt,
    issuedBy: row.issued_by ?? row.issuedBy,
    signedByBrandAt: row.signed_by_brand_at ?? row.signedByBrandAt ?? undefined,
    signedByKurlaAt: row.signed_by_kurla_at ?? row.signedByKurlaAt ?? undefined,
    terminatedAt: row.terminated_at ?? row.terminatedAt ?? undefined,
    terminationReason: row.termination_reason ?? row.terminationReason ?? undefined
  };
}

export interface IssueBrandContractInput {
  brandUserId: string;
  brandName: string;
  contactEmail: string;
  priceCents?: number | null;
}

/** Émission par l'administration : le contrat existe, il n'engage encore personne. */
export async function issueBrandContract(
  store: SupabaseServerStore,
  adminId: string,
  input: IssueBrandContractInput
): Promise<BrandContract> {
  const brandName = String(input.brandName || '').trim();
  const contactEmail = String(input.contactEmail || '').trim();
  if (brandName.length < 2) throw new Error('Le nom de la marque est requis.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) throw new Error('Adresse de contact invalide.');

  const contract: BrandContract = {
    id: randomUUID(),
    brandUserId: input.brandUserId,
    brandName,
    contactEmail,
    termsVersion: BRAND_CONTRACT_TERMS_VERSION,
    termsHash: brandContractTermsHash(),
    status: 'issued',
    priceCents: typeof input.priceCents === 'number' ? input.priceCents : null,
    issuedAt: new Date().toISOString(),
    issuedBy: adminId
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('brand_contracts').insert({
      id: contract.id,
      brand_user_id: contract.brandUserId,
      brand_name: contract.brandName,
      contact_email: contract.contactEmail,
      terms_version: contract.termsVersion,
      terms_hash: contract.termsHash,
      status: contract.status,
      price_cents: contract.priceCents,
      issued_at: contract.issuedAt,
      issued_by: contract.issuedBy
    });
    ensureDatabaseSuccess('émission du contrat marque', error);
  } else {
    store.inMemoryBrandContracts.push(contract);
  }

  return contract;
}

async function loadContract(store: SupabaseServerStore, id: string): Promise<BrandContract | undefined> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('brand_contracts').select('*').eq('id', id).maybeSingle();
    ensureDatabaseSuccess('lecture du contrat marque', error);
    return data ? mapContractRow(data) : undefined;
  }
  const found = store.inMemoryBrandContracts.find(contract => contract.id === id);
  return found ? { ...found } : undefined;
}

async function persistContract(store: SupabaseServerStore, contract: BrandContract): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('brand_contracts').update({
      status: contract.status,
      signed_by_brand_at: contract.signedByBrandAt ?? null,
      signed_by_kurla_at: contract.signedByKurlaAt ?? null,
      terminated_at: contract.terminatedAt ?? null,
      termination_reason: contract.terminationReason ?? null
    }).eq('id', contract.id);
    ensureDatabaseSuccess('mise à jour du contrat marque', error);
    return;
  }
  const index = store.inMemoryBrandContracts.findIndex(item => item.id === contract.id);
  if (index >= 0) store.inMemoryBrandContracts[index] = contract;
}

export interface SignBrandContractInput {
  /** Clause 2 : la marque reconnaît ne recevoir que des agrégats k-anonymes. */
  acceptsAggregateOnly: boolean;
  /** Clause 3 : la marque reconnaît qu'aucune donnée personnelle ne lui est cédée. */
  acceptsNoPersonalDataTransfer: boolean;
  /** La marque atteste avoir lu le texte de la version indiquée. */
  confirmsTermsVersionRead: boolean;
}

/** Signature par la marque. Les clauses sont exigées une par une. */
export async function signBrandContract(
  store: SupabaseServerStore,
  brandUserId: string,
  contractId: string,
  input: SignBrandContractInput
): Promise<BrandContract> {
  const contract = await loadContract(store, contractId);
  if (!contract) throw new Error('Contrat introuvable.');
  if (contract.brandUserId !== brandUserId) throw new Error('Ce contrat n’a pas été émis pour votre compte.');
  if (contract.status !== 'issued') throw new Error(`Un contrat au statut « ${contract.status} » ne peut plus être signé.`);
  if (contract.termsHash !== brandContractTermsHash()) {
    throw new Error('Le texte du contrat a changé depuis son émission : une nouvelle émission est nécessaire.');
  }
  if (input.acceptsAggregateOnly !== true) throw new Error('La clause « agrégats k-anonymes uniquement » doit être acceptée explicitement.');
  if (input.acceptsNoPersonalDataTransfer !== true) throw new Error('La clause « aucune donnée personnelle cédée » doit être acceptée explicitement.');
  if (input.confirmsTermsVersionRead !== true) throw new Error('La lecture de la version signée doit être confirmée.');

  contract.signedByBrandAt = new Date().toISOString();
  await persistContract(store, contract);
  return contract;
}

/** Contreseing KURLA : c'est à ce moment que le contrat engage les deux parties. */
export async function countersignBrandContract(
  store: SupabaseServerStore,
  adminId: string,
  contractId: string
): Promise<BrandContract> {
  const contract = await loadContract(store, contractId);
  if (!contract) throw new Error('Contrat introuvable.');
  if (!contract.signedByBrandAt) throw new Error('La marque n’a pas encore signé : KURLA ne contresigne pas un texte que l’autre partie n’a pas accepté.');
  if (contract.status === 'active') throw new Error('Contrat déjà actif.');
  if (contract.status === 'terminated') throw new Error('Contrat résilié.');
  if (contract.termsHash !== brandContractTermsHash()) {
    throw new Error('Le texte du contrat a changé depuis sa signature : une nouvelle émission est nécessaire.');
  }

  /**
   * Un seul contrat actif par marque : deux textes « actifs » pour la même
   * marque laisseraient croire que deux versions différentes l'engagent. La
   * base l'interdit par index unique partiel ; le store l'interdit aussi, pour
   * que le mode mémoire ne se comporte pas différemment de la production.
   */
  const others = await getBrandContractsForUser(store, contract.brandUserId);
  if (others.some(item => item.status === 'active' && item.id !== contract.id)) {
    throw new Error('Cette marque a déjà un contrat actif : résiliez-le avant d’en activer un autre.');
  }

  contract.signedByKurlaAt = new Date().toISOString();
  contract.status = 'active';
  await persistContract(store, contract);
  return contract;
}

/** Résiliation : plus aucune nouvelle demande de test, les rapports remis restent acquis. */
export async function terminateBrandContract(
  store: SupabaseServerStore,
  contractId: string,
  reason: string
): Promise<BrandContract> {
  const contract = await loadContract(store, contractId);
  if (!contract) throw new Error('Contrat introuvable.');
  if (contract.status === 'terminated') return contract;
  const text = String(reason || '').trim();
  if (text.length < 5) throw new Error('Le motif de résiliation est requis (5 caractères minimum).');

  contract.status = 'terminated';
  contract.terminatedAt = new Date().toISOString();
  contract.terminationReason = text;
  await persistContract(store, contract);
  return contract;
}

export async function getBrandContract(store: SupabaseServerStore, id: string): Promise<BrandContract | undefined> {
  return loadContract(store, id);
}

export async function getBrandContractsForUser(store: SupabaseServerStore, brandUserId: string): Promise<BrandContract[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('brand_contracts').select('*').eq('brand_user_id', brandUserId).order('issued_at', { ascending: false });
    ensureDatabaseSuccess('lecture des contrats marque', error);
    return (data || []).map(mapContractRow);
  }
  return store.inMemoryBrandContracts.filter(contract => contract.brandUserId === brandUserId);
}

export interface BrandContractGate {
  eligible: boolean;
  reason?: string;
  contractId?: string;
  termsVersion?: string;
  termsText?: string;
}

/**
 * Le portier : une marque peut-elle demander un test ?
 *
 * Exige un contrat **actif**, signé par les deux parties, portant sur la
 * version de texte en vigueur. Un contrat signé pour une version périmée ne
 * suffit pas — sinon modifier le texte ne servirait à rien.
 */
export async function resolveBrandContractEligibility(
  store: SupabaseServerStore,
  brandUserId: string
): Promise<BrandContractGate> {
  const contracts = await getBrandContractsForUser(store, brandUserId);
  const active = contracts.find(contract => contract.status === 'active');
  if (!active) {
    return {
      eligible: false,
      reason: contracts.length
        ? 'Aucun contrat actif : la signature de la marque et le contreseing KURLA sont tous deux nécessaires.'
        : 'Aucun contrat émis : l’administration doit d’abord émettre un contrat pour cette marque.'
    };
  }
  if (active.termsVersion !== BRAND_CONTRACT_TERMS_VERSION) {
    return {
      eligible: false,
      contractId: active.id,
      reason: `Contrat signé pour la version ${active.termsVersion}, texte en vigueur ${BRAND_CONTRACT_TERMS_VERSION} : une nouvelle signature est requise.`
    };
  }
  return {
    eligible: true,
    contractId: active.id,
    termsVersion: active.termsVersion,
    termsText: BRAND_CONTRACT_TERMS_TEXT
  };
}
