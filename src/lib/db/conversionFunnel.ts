/**
 * KURLA — L3 « Dashboard de conversion » : agrégateur de funnel, pur et testable.
 * ==============================================================================
 *
 * Promesse du plan de chantiers : l'admin voit 4 étapes × 2 pôles (diagnostic →
 * routine → panier → payé, séparable cheveux/peau) avec des taux, et une chute
 * de −20 % sur une étape est visible sans requêter la base.
 *
 * Sources (tables réelles, rien d'inventé — le « tracking analytics » client
 * GA4/Plausible n'est pas persisté en base et n'est PAS utilisé ici) :
 *   - diagnostic : beauty_profiles (profil complété en fin de diagnostic) ;
 *   - routine    : routine_plans actifs (plan de routine généré) ;
 *   - panier     : carts + cart_items (panier persisté, remplacement atomique) ;
 *   - payé       : orders au statut post-paiement + order_items.
 *
 * Règles d'attribution :
 *   - au niveau utilisateur (user_id Supabase) : paniers invités et commandes
 *     sans compte ne sont pas attribués (note renvoyée à l'admin) ;
 *   - pôle du diagnostic/routine : déduit du profil beauté (section remplie,
 *     au moins un champ ≠ « inconnu ») ; un profil peut alimenter les deux
 *     pôles ; sans profil, le compte n'entre que dans « tous » ;
 *   - pôle du panier/paiement : déduit de la catégorie des produits
 *     ('cheveux' | 'peau') ; un panier/panier mixte alimente les deux pôles.
 *
 * La fonction est pure : aucune dépendance Supabase, horloge injectable — le
 * banc la verrouille directement (convention des bancs KURLA).
 */

export type FunnelDomainKey = 'tous' | 'cheveux' | 'peau';
export type FunnelStepKey = 'diagnostic' | 'routine' | 'panier' | 'paye';

/** Statuts de commande considérés « payés » (cycle de vie post-paiement). */
export const PAID_ORDER_STATUSES: readonly string[] = [
  'paid',
  'processing',
  'packed',
  'shipped',
  'delivered'
];

export const FUNNEL_STEP_KEYS: readonly FunnelStepKey[] = ['diagnostic', 'routine', 'panier', 'paye'];

const STEP_LABELS: Record<FunnelStepKey, string> = {
  diagnostic: 'Diagnostic complété',
  routine: 'Routine générée',
  panier: 'Panier constitué',
  paye: 'Commande payée'
};

const DOMAIN_LABELS: Record<FunnelDomainKey, string> = {
  tous: 'Tous pôles',
  cheveux: 'Pôle cheveux',
  peau: 'Pôle peau'
};

export interface ConversionFunnelInput {
  beautyProfiles: Array<{ user_id?: string | null; profile?: unknown; created_at?: string | null; updated_at?: string | null }>;
  routinePlans: Array<{ user_id?: string | null; status?: string | null; created_at?: string | null }>;
  carts: Array<{ id?: string | null; user_id?: string | null; updated_at?: string | null }>;
  cartItems: Array<{ cart_id?: string | null; product_id?: string | null }>;
  orders: Array<{ id?: string | null; user_id?: string | null; status?: string | null; created_at?: string | null }>;
  orderItems: Array<{ order_id?: string | null; product_id?: string | null }>;
  /** product id → catégorie catalogue ('cheveux' | 'peau' | autre). */
  productCategories: Record<string, string | undefined>;
  /** Disponibilité réelle de chaque source (table lisible en base). */
  sourceAvailable?: Partial<Record<FunnelStepKey, boolean>>;
  /** Horloge injectable (ms) — défaut : Date.now(). */
  nowMs?: number;
  /** Durée de la période courante en jours (défaut 30). */
  periodDays?: number;
}

export interface FunnelStep {
  key: FunnelStepKey;
  label: string;
  /** Utilisateurs distincts ayant atteint l'étape sur la période courante (null : source indisponible). */
  count: number | null;
  /** % de la première étape (null si étape 1 vide ou source indisponible). */
  rateFromTopPct: number | null;
  /** % de l'étape précédente (100 pour la première). */
  stepConversionPct: number | null;
  /** Chute vs l'étape précédente en points de pourcentage (null si non calculable). */
  dropFromPreviousPct: number | null;
  /** Compte sur la période précédente (30 j avant la courante). */
  previousCount: number | null;
  /** Variation relative vs période précédente en % (null si période précédente vide). */
  deltaPct: number | null;
  /** True quand deltaPct ≤ −20 : la chute est visible, pas d'interrogation requise. */
  flagged: boolean;
  /** Source indisponible pour cette étape. */
  available: boolean;
}

export interface FunnelDomainResult {
  available: boolean;
  reason: string | null;
  steps: FunnelStep[];
  /** Conversion globale diagnostic → payé en % (null si non calculable). */
  topToBottomPct: number | null;
}

export interface ConversionFunnelResponse {
  generatedAt: string;
  periodDays: number;
  periods: {
    current: { from: string; to: string };
    previous: { from: string; to: string };
  };
  funnels: Record<FunnelDomainKey, FunnelDomainResult>;
  /** Alertes lisibles (chutes ≥ 20 % vs période précédente). */
  flags: string[];
  /** Limites de mesure honnêtes (attribution, snapshot panier, déduction de pôle). */
  notes: string[];
}

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

const UNKNOWN_VALUES = new Set(['inconnu', '', 'unknown', 'none', 'null']);

const round1 = (value: number): number => Math.round(value * 10) / 10;

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Une section de profil est « remplie » si au moins un champ porte une valeur connue. */
function sectionFilled(section: unknown): boolean {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return false;
  for (const value of Object.values(section as Record<string, unknown>)) {
    if (typeof value === 'string' && !UNKNOWN_VALUES.has(value.trim().toLowerCase())) return true;
    if (typeof value === 'number' && Number.isFinite(value)) return true;
    if (Array.isArray(value) && value.length > 0) return true;
    if (value && typeof value === 'object' && sectionFilled(value)) return true;
  }
  return false;
}

/** Pôles alimentés par un profil beauté (un profil peut alimenter les deux). */
function profileDomains(profile: unknown): Set<'cheveux' | 'peau'> {
  const domains = new Set<'cheveux' | 'peau'>();
  if (!profile || typeof profile !== 'object') return domains;
  const record = profile as Record<string, unknown>;
  if (sectionFilled(record.hair)) domains.add('cheveux');
  if (sectionFilled(record.skin)) domains.add('peau');
  return domains;
}

function inPeriod(ms: number | null, fromMs: number, toMs: number): boolean {
  return ms !== null && ms >= fromMs && ms < toMs;
}

interface Period {
  fromMs: number;
  toMs: number;
}

const FUNNEL_DOMAIN_KEYS: readonly FunnelDomainKey[] = ['tous', 'cheveux', 'peau'];

/** Comptes bruts (par domaine et par période) pour les quatre étapes. */
function stepCounts(input: ConversionFunnelInput, period: Period): Record<FunnelDomainKey, Record<FunnelStepKey, number>> {
  const result: Record<FunnelDomainKey, Record<FunnelStepKey, number>> = {
    tous: { diagnostic: 0, routine: 0, panier: 0, paye: 0 },
    cheveux: { diagnostic: 0, routine: 0, panier: 0, paye: 0 },
    peau: { diagnostic: 0, routine: 0, panier: 0, paye: 0 }
  };

  // Pôles par utilisateur (beauty_profiles : une ligne par utilisateur).
  const domainsByUser = new Map<string, Set<'cheveux' | 'peau'>>();
  for (const row of input.beautyProfiles) {
    const userId = typeof row?.user_id === 'string' ? row.user_id : null;
    if (!userId) continue;
    domainsByUser.set(userId, profileDomains(row.profile));
  }

  // Étape 1 — diagnostic : profil rempli, touché sur la période.
  const diagnosticUsers: Record<FunnelDomainKey, Set<string>> = { tous: new Set(), cheveux: new Set(), peau: new Set() };
  for (const row of input.beautyProfiles) {
    const userId = typeof row?.user_id === 'string' ? row.user_id : null;
    if (!userId) continue;
    const touchedAt = toMs(row.updated_at) ?? toMs(row.created_at);
    if (!inPeriod(touchedAt, period.fromMs, period.toMs)) continue;
    const domains = profileDomains(row.profile);
    for (const domain of domains) {
      diagnosticUsers[domain].add(userId);
      diagnosticUsers.tous.add(userId);
    }
  }
  for (const key of FUNNEL_DOMAIN_KEYS) {
    result[key].diagnostic = diagnosticUsers[key].size;
  }

  // Étape 2 — routine : plan actif généré sur la période ; pôle via le profil.
  const routineUsers = new Set<string>();
  for (const row of input.routinePlans) {
    const userId = typeof row?.user_id === 'string' ? row.user_id : null;
    if (!userId) continue;
    if (row.status !== 'active') continue;
    if (!inPeriod(toMs(row.created_at), period.fromMs, period.toMs)) continue;
    routineUsers.add(userId);
  }
  for (const userId of routineUsers) {
    const domains = domainsByUser.get(userId) ?? new Set<'cheveux' | 'peau'>();
    result.tous.routine += 1;
    if (domains.has('cheveux')) result.cheveux.routine += 1;
    if (domains.has('peau')) result.peau.routine += 1;
  }

  // Étape 3 — panier : panier utilisateur touché sur la période, non vide.
  const cartIdByUserId = new Map<string, Set<string>>();
  for (const cart of input.carts) {
    const userId = typeof cart?.user_id === 'string' ? cart.user_id : null;
    const cartId = typeof cart?.id === 'string' ? cart.id : null;
    if (!userId || !cartId) continue;
    if (!inPeriod(toMs(cart.updated_at), period.fromMs, period.toMs)) continue;
    const known = cartIdByUserId.get(userId);
    if (known) known.add(cartId);
    else cartIdByUserId.set(userId, new Set([cartId]));
  }
  const cartOwner = new Map<string, string>();
  for (const [userId, cartIds] of cartIdByUserId) for (const cartId of cartIds) cartOwner.set(cartId, userId);
  const cartHasProduct = new Set<string>(); // panier avec au moins un produit → « panier constitué »
  const cartDomainsByUserId = new Map<string, Set<'cheveux' | 'peau'>>();
  for (const item of input.cartItems) {
    const cartId = typeof item?.cart_id === 'string' ? item.cart_id : null;
    const userId = cartId ? cartOwner.get(cartId) : undefined;
    if (!cartId || !userId) continue;
    cartHasProduct.add(userId);
    const category = input.productCategories[item.product_id ?? ''];
    if (category === 'cheveux' || category === 'peau') {
      const domains = cartDomainsByUserId.get(userId) ?? new Set<'cheveux' | 'peau'>();
      domains.add(category);
      cartDomainsByUserId.set(userId, domains);
    }
  }
  for (const userId of cartHasProduct) {
    result.tous.panier += 1;
    const domains = cartDomainsByUserId.get(userId);
    if (domains?.has('cheveux')) result.cheveux.panier += 1;
    if (domains?.has('peau')) result.peau.panier += 1;
  }

  // Étape 4 — payé : commande payée créée sur la période, imputée par produits.
  const paidOrderIds = new Set<string>();
  const domainsByOrderId = new Map<string, Set<'cheveux' | 'peau'>>();
  for (const row of input.orders) {
    const orderId = typeof row?.id === 'string' ? row.id : null;
    const userId = typeof row?.user_id === 'string' ? row.user_id : null;
    if (!orderId || !userId) continue;
    if (!PAID_ORDER_STATUSES.includes(row.status ?? '')) continue;
    if (!inPeriod(toMs(row.created_at), period.fromMs, period.toMs)) continue;
    paidOrderIds.add(orderId);
  }
  for (const item of input.orderItems) {
    const orderId = typeof item?.order_id === 'string' ? item.order_id : null;
    if (!orderId || !paidOrderIds.has(orderId)) continue;
    const domains = domainsByOrderId.get(orderId) ?? new Set<'cheveux' | 'peau'>();
    const category = input.productCategories[item.product_id ?? ''];
    if (category === 'cheveux') domains.add('cheveux');
    else if (category === 'peau') domains.add('peau');
    domainsByOrderId.set(orderId, domains);
  }
  // « Commande payée » = l'utilisateur a une commande payée (vue « tous ») ;
  // le pôle est imputé par les produits de la commande.
  const paidUsers = new Set<string>();
  const paidDomainsByUser = new Map<string, Set<'cheveux' | 'peau'>>();
  for (const row of input.orders) {
    const orderId = typeof row?.id === 'string' ? row.id : null;
    const userId = typeof row?.user_id === 'string' ? row.user_id : null;
    if (!orderId || !userId || !paidOrderIds.has(orderId)) continue;
    if (paidUsers.has(userId)) continue;
    paidUsers.add(userId);
    result.tous.paye += 1;
    const domains = domainsByOrderId.get(orderId);
    if (domains && domains.size > 0) {
      const merged = paidDomainsByUser.get(userId) ?? new Set<'cheveux' | 'peau'>();
      for (const domain of domains) merged.add(domain);
      paidDomainsByUser.set(userId, merged);
    }
  }
  for (const domains of paidDomainsByUser.values()) {
    if (domains.has('cheveux')) result.cheveux.paye += 1;
    if (domains.has('peau')) result.peau.paye += 1;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Agrégation principale
// ---------------------------------------------------------------------------

export function aggregateConversionFunnel(input: ConversionFunnelInput): ConversionFunnelResponse {
  const nowMs = input.nowMs ?? Date.now();
  const periodDays = input.periodDays ?? 30;
  const dayMs = 86_400_000;
  const current: Period = { fromMs: nowMs - periodDays * dayMs, toMs: nowMs };
  const previous: Period = { fromMs: nowMs - 2 * periodDays * dayMs, toMs: nowMs - periodDays * dayMs };

  const currentCounts = stepCounts(input, current);
  const previousCounts = stepCounts(input, previous);

  const sourceAvailable: Record<FunnelStepKey, boolean> = {
    diagnostic: input.sourceAvailable?.diagnostic !== false,
    routine: input.sourceAvailable?.routine !== false,
    panier: input.sourceAvailable?.panier !== false,
    paye: input.sourceAvailable?.paye !== false
  };

  const flags: string[] = [];

  const buildFunnel = (domain: FunnelDomainKey): FunnelDomainResult => {
    const missingSources = FUNNEL_STEP_KEYS.filter(key => !sourceAvailable[key]);
    const topCount = sourceAvailable.diagnostic ? currentCounts[domain].diagnostic : null;
    if (topCount === null) {
      return {
        available: false,
        reason: 'Source diagnostic indisponible (table beauty_profiles).',
        steps: buildSteps(domain, currentCounts, previousCounts, sourceAvailable),
        topToBottomPct: null
      };
    }
    if (topCount === 0) {
      return {
        available: false,
        reason: 'Aucun diagnostic complété sur la période : le funnel n\'est pas mesurable.',
        steps: buildSteps(domain, currentCounts, previousCounts, sourceAvailable),
        topToBottomPct: null
      };
    }
    if (missingSources.length > 0) {
      return {
        available: false,
        reason: `Sources indisponibles : ${missingSources.map(key => STEP_LABELS[key].toLowerCase()).join(', ')}.`,
        steps: buildSteps(domain, currentCounts, previousCounts, sourceAvailable),
        topToBottomPct: null
      };
    }
    const topToBottom = sourceAvailable.paye
      ? round1((currentCounts[domain].paye / topCount) * 100)
      : null;
    return {
      available: true,
      reason: null,
      steps: buildSteps(domain, currentCounts, previousCounts, sourceAvailable),
      topToBottomPct: topToBottom
    };
  };

  const buildSteps = (
    domain: FunnelDomainKey,
    counts: Record<FunnelDomainKey, Record<FunnelStepKey, number>>,
    prevCounts: Record<FunnelDomainKey, Record<FunnelStepKey, number>>,
    availability: Record<FunnelStepKey, boolean>
  ): FunnelStep[] => {
    const steps: FunnelStep[] = [];
    let previousStepCount: number | null = null;
    for (const key of FUNNEL_STEP_KEYS) {
      const available = availability[key];
      const count = available ? counts[domain][key] : null;
      const previousCount = available ? prevCounts[domain][key] : null;
      const isTop = key === 'diagnostic';
      const topCount = available ? (isTop ? count : counts[domain].diagnostic) : null;
      const rateFromTopPct = !available || topCount === null || topCount === 0 || count === null
        ? null
        : round1((count / topCount) * 100);
      const stepConversionPct = !available || count === null
        ? null
        : isTop
          ? 100
          : previousStepCount === null || previousStepCount === 0
            ? null
            : round1((count / previousStepCount) * 100);
      const dropFromPreviousPct =
        stepConversionPct === null ? null : round1(100 - stepConversionPct);
      const deltaPct =
        available && count !== null && previousCount !== null && previousCount > 0
          ? round1(((count - previousCount) / previousCount) * 100)
          : null;
      const flagged = deltaPct !== null && deltaPct <= -20;
      if (flagged && deltaPct !== null && count !== null && previousCount !== null) {
        flags.push(
          `${DOMAIN_LABELS[domain]} · ${STEP_LABELS[key]} : ${deltaPct <= 0 ? '−' : ''}${Math.abs(deltaPct).toLocaleString('fr-FR')} % vs période précédente (${count} vs ${previousCount} utilisateurs).`
        );
      }
      // Étape indisponible : on conserve le dernier compte connu pour les conversions suivantes.
      if (count !== null) previousStepCount = count;
      steps.push({
        key,
        label: STEP_LABELS[key],
        count,
        rateFromTopPct,
        stepConversionPct,
        dropFromPreviousPct,
        previousCount,
        deltaPct,
        flagged,
        available
      });
    }
    return steps;
  };

  const funnels: Record<FunnelDomainKey, FunnelDomainResult> = {
    tous: buildFunnel('tous'),
    cheveux: buildFunnel('cheveux'),
    peau: buildFunnel('peau')
  };

  return {
    generatedAt: new Date(nowMs).toISOString(),
    periodDays,
    periods: {
      current: { from: new Date(current.fromMs).toISOString(), to: new Date(current.toMs).toISOString() },
      previous: { from: new Date(previous.fromMs).toISOString(), to: new Date(previous.toMs).toISOString() }
    },
    funnels,
    flags,
    notes: [
      'Funnel au niveau utilisateur connecté (user_id) : les paniers invités et les commandes sans compte ne sont pas attribués.',
      'Étape « Panier » : état courant du panier persisté (remplacement atomique à chaque sauvegarde), pas un historique d’ajouts.',
      'Pôle déduit du profil beauté pour le diagnostic et la routine (section remplie) ; déduit de la catégorie des produits pour le panier et le paiement.'
    ]
  };
}
