import {
  PEN_CAMPAIGNS,
  PEN_FIRST100,
  PEN_LADDER,
  PEN_MARKETS,
  PEN_MONTHLY,
  PEN_WEEKLY,
  type PenCampaign,
  type PenMarket,
} from './penetration';

export type GrowthTaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type GrowthPriority = 'P0' | 'P1' | 'P2';
export type GrowthCampaignStatus = 'planned' | 'active' | 'paused' | 'done';
export type GrowthMarketStatus = 'research' | 'test' | 'validation' | 'scale' | 'leadership' | 'expansion' | 'blocked';

export interface GrowthTask {
  id: string;
  title: string;
  owner: 'CEO' | 'Growth' | 'Content' | 'Partnerships' | 'Revenue' | 'Ops' | 'Product';
  priority: GrowthPriority;
  status: GrowthTaskStatus;
  deadline: string;
  week: number;
  market: string;
  kpi: string;
  expected: string;
  source: 'week_plan' | 'campaign' | 'manual';
  campaignId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthCampaign {
  id: string;
  name: string;
  market: string;
  segment: string;
  channel: string;
  offer: string;
  trackingCampaign: string;
  budgetEur: number;
  startDate: string;
  endDate: string;
  plannedClients: number;
  plannedRevenueEur: number;
  targetCacEur: number | null;
  kpi: string;
  status: GrowthCampaignStatus;
  actualClients: number | null;
  actualRevenueEur: number | null;
  actualSpendEur: number | null;
  hypothesis: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthMarket {
  id: string;
  region: PenMarket['region'];
  wave: number;
  country: string;
  status: GrowthMarketStatus;
  entrySegment: string;
  entryOffer: string;
  price: string;
  language: string;
  acquisition: string;
  influence: string;
  partners: string;
  logistics: string;
  regulation: string;
  budgetEur: number;
  plannedClients: number;
  validationWindow: string;
  successGate: string;
  failGate: string;
  trigger: string;
  actualClients: number | null;
  actualRevenueEur: number | null;
  actualSpendEur: number | null;
  openedAt?: string;
  hypothesis: boolean;
  updatedAt: string;
}

export interface GrowthMonthlyPlan {
  month: number;
  label: string;
  market: string;
  phase: string;
  cumulativeClients: number;
  newClients: number;
  orders: number;
  revenueEur: number;
  budgetEur: number;
  maxCacEur: number;
  contentPerWeek: number;
  kpi: string;
  decision: string;
  hypothesis: true;
}

export const GROWTH_OPERATING_MODEL = {
  yearOneOwnStock: false,
  acquisition: ['affiliation', 'dropshipping', '3PL'],
  fulfillment: 'SKU accepté par C1 et truth layer serveur uniquement ; expédition via fournisseur dropship ou 3PL selon la preuve de volume.',
  supplierProof: 'Aucun document fournisseur, prix, stock, claim, droit d’image ou conformité n’est déduit d’une URL ; validation SKU par SKU.',
  preorderBoundary: 'Une précommande externe documentée reste distincte de la formulation interne et du stock disponible.'
} as const;

export interface GrowthRung {
  clients: number;
  window: string;
  deadlineMonth: number;
  revenuePerMonthEur: number;
  ordersPerMonth: number;
  aovEur: number;
  visitToOrderPct: number;
  repeat90dPct: number;
  maxCacEur: number;
  marketingBudgetEur: number;
  newClientsPerMonth: number;
  contentPerWeek: number;
  activeCreators: number;
  partners: number;
  team: string;
  markets: string;
  channels: string[];
  features: string[];
  fulfillmentModel: string;
  segmentSharePct: number;
  segmentBasis: string;
  gate: string;
  failGate: string;
  hypothesis: true;
}

export const GROWTH_LADDER: GrowthRung[] = PEN_LADDER.map((rung, index) => ({
  clients: rung.clients,
  window: rung.window,
  deadlineMonth: [2, 6, 18, 36, 54, 84][index],
  revenuePerMonthEur: rung.monthlyRevenueEur,
  ordersPerMonth: Math.ceil(rung.monthlyRevenueEur / rung.aovEur),
  aovEur: rung.aovEur,
  visitToOrderPct: rung.convVisitToOrderPct,
  repeat90dPct: rung.repeatRate90dPct,
  maxCacEur: rung.maxCacEur,
  marketingBudgetEur: rung.penetrationBudgetEur,
  newClientsPerMonth: rung.newClientsPerMonth,
  contentPerWeek: rung.contentsPerWeek,
  activeCreators: rung.creatorsActive,
  partners: rung.localPartners,
  team: rung.team,
  markets: rung.markets,
  channels: rung.channels,
  features: rung.features,
  fulfillmentModel: GROWTH_OPERATING_MODEL.acquisition.join(' + ') + ' · aucun stock propre année 1',
  segmentSharePct: rung.segmentSharePct,
  segmentBasis: rung.segmentBasis,
  gate: rung.validationGate,
  failGate: rung.failGate,
  hypothesis: true
}));

/** France est conquise par phases : on n'ouvre pas le pays suivant avant le gate. */
export const GROWTH_FRANCE_PHASES = [
  { id: 'france-1', phase: 'FRANCE 1 · preuve initiale', zones: 'Île-de-France + Lyon', segment: 'Femmes 4C, 25–40', offer: 'Diagnostic gratuit → kit K02/K03 à 64,90–69,90 €', clients: 100, budgetEur: 1800, channels: 'TikTok organique, DM ciblés, 6 créateurs barter, 2 salons pilotes', kpi: '100 commandes + 20 avis + 10 UGC + CAC ≤ 20 €', decision: 'Passage au national uniquement si le gate est atteint.' },
  { id: 'france-2', phase: 'FRANCE 2 · répétition nationale', zones: 'France entière, priorité métropoles avec communautés texturées', segment: '4C national puis bouclées 3A–4A', offer: 'Kits 49,90–89,90 € + réachat −10 %', clients: 1000, budgetEur: 9000, channels: 'Créateurs, SEO long-tail, paid limité, emails, parrainage', kpi: '1 000 clients + conversion ≥ 1,2 % + CAC ≤ 15 € + réachat 90 j ≥ 20 %', decision: 'Pas de nouveau segment si marge contributive négative deux mois.' },
  { id: 'france-3', phase: 'FRANCE 3 · extension géographique et segments', zones: 'Paris, Lyon, Marseille, Lille, Toulouse, Bordeaux, Nantes puis national', segment: 'Bouclées, protectrices, enfants, hommes texturés', offer: 'Kits adaptés + accessoires + KURLA+ après valeur', clients: 10000, budgetEur: 90000, channels: 'Paid par segment, 60 créateurs, 15 salons/barbiers, YouTube, SEO', kpi: '10 000 cumulés + marge mensuelle positive + chaque segment ≥ 150 commandes test', decision: 'Les segments sous seuil sont gelés, pas subventionnés.' },
  { id: 'france-4', phase: 'FRANCE 4 · leadership du périmètre choisi', zones: 'France entière', segment: 'Base clients multi-segments + professionnels', offer: 'Catalogue curé, marque propre seulement après preuves C1, KURLA Pro', clients: 20000, budgetEur: 180000, channels: 'Mix rentable, partenariats, PR, ambassadeurs, KURLA Pro', kpi: 'LTV/CAC ≥ 3 + réachat ≥ 28 % + 20 salons actifs', decision: 'La Belgique est ouverte seulement quand la France garde ces ratios 90 jours.' }
] as const;

/** Carte de conquête exportée au dashboard : tous les montants sont des hypothèses de test. */
export const GROWTH_MARKET_SEEDS: Omit<GrowthMarket, 'updatedAt' | 'actualClients' | 'actualRevenueEur' | 'actualSpendEur'>[] = PEN_MARKETS.map((market) => ({
  id: market.id,
  region: market.region,
  wave: market.wave,
  country: market.country,
  status: market.id === 'fr-1' ? 'test' : 'research',
  entrySegment: market.entrySegment,
  entryOffer: market.entryOffer,
  price: market.price,
  language: market.language,
  acquisition: market.primaryChannel,
  influence: market.influence,
  partners: market.localPartners,
  logistics: `${market.logistics} · Modèle année 1 : affiliation/dropshipping fournisseur/3PL ; aucun stock propre.`,
  regulation: market.regulation,
  budgetEur: market.budgetEur,
  plannedClients: market.targetClients,
  validationWindow: market.validationWindow,
  successGate: market.successGate,
  failGate: market.failGate,
  trigger: market.trigger,
  hypothesis: true
}));

export const GROWTH_GLOBAL_GATES = [
  { from: 'France', to: 'Belgique/Luxembourg', trigger: '1 000 clients France, marge contributive positive, réachat 90 j ≥ 20 %', wave: 1 },
  { from: 'Belgique/Luxembourg', to: 'Royaume-Uni', trigger: '30 commandes BE/LU en 60 jours, CAC ≤ 18 €, équipe EN et conformité UK documentée', wave: 2 },
  { from: 'Royaume-Uni', to: 'Allemagne/Pays-Bas', trigger: '100 commandes UK en 90 jours, ROAS ≥ 1,8, logistique validée', wave: 3 },
  { from: 'Europe', to: 'Afrique du Sud', trigger: '50 000 clients cumulés, 3 marchés européens rentables, 3PL et conformité ZA validés', wave: 4 },
  { from: 'Afrique du Sud', to: 'Sénégal/Côte d’Ivoire/Nigeria', trigger: '50 commandes ZA en 90 jours et un distributeur ou marketplace signé', wave: 5 },
  { from: 'Afrique', to: 'Diaspora mondiale/Amérique du Nord/Moyen-Orient', trigger: '100 000 clients, 3 continents, marketplace ≥ 20 % du GMV ou décision DTC assumée', wave: 6 }
] as const;

export const GROWTH_MONTHLY_PLAN: GrowthMonthlyPlan[] = [
  ...PEN_MONTHLY.map(m => ({ month: m.month, label: m.label, market: m.market, phase: m.phase, cumulativeClients: m.cumClients, newClients: m.newClients, orders: m.ordersMo, revenueEur: m.revenueMoEur, budgetEur: m.budgetEur, maxCacEur: m.maxCacEur, contentPerWeek: m.contentsPerWeek, kpi: m.kpi, decision: m.decision, hypothesis: true as const })),
  { month: 13, label: 'M13 — Stabiliser rétention France', market: 'France multi-segments', phase: 'Scale', cumulativeClients: 7000, newClients: 1000, orders: 1000, revenueEur: 52000, budgetEur: 12000, maxCacEur: 17, contentPerWeek: 14, kpi: 'réachat 90 j ≥ 22 %, CAC ≤ 17 €', decision: 'Renforcer uniquement les segments avec marge positive.', hypothesis: true },
  { month: 14, label: 'M14 — Test Belgique/Luxembourg', market: 'France + BE/LU', phase: 'Test', cumulativeClients: 7800, newClients: 800, orders: 800, revenueEur: 42000, budgetEur: 9000, maxCacEur: 18, contentPerWeek: 14, kpi: 'BE/LU : 15 commandes/30 jours', decision: 'Continuer seulement si le pays atteint son rythme.', hypothesis: true },
  { month: 15, label: 'M15 — Industrialiser BE/LU ou retarder', market: 'France + BE/LU', phase: 'Validation', cumulativeClients: 8600, newClients: 800, orders: 800, revenueEur: 43000, budgetEur: 9000, maxCacEur: 18, contentPerWeek: 14, kpi: 'BE/LU : 30 commandes/60 jours', decision: 'Gate atteint = préparation UK ; sinon recentrage France.', hypothesis: true },
  { month: 16, label: 'M16 — Préparer localisation UK', market: 'France + BE/LU', phase: 'Validation', cumulativeClients: 9300, newClients: 700, orders: 700, revenueEur: 38500, budgetEur: 8000, maxCacEur: 18, contentPerWeek: 15, kpi: 'EN, £, conformité et 8 créateurs UK prêts', decision: 'Aucune dépense UK avant checklist complète.', hypothesis: true },
  { month: 17, label: 'M17 — Test UK limité', market: 'France + BE/LU + UK', phase: 'Test', cumulativeClients: 9700, newClients: 400, orders: 400, revenueEur: 23000, budgetEur: 7000, maxCacEur: 22, contentPerWeek: 16, kpi: 'UK : 30 commandes/90 jours', decision: 'Geler UK sous 30 commandes ou CAC > 30 €.', hypothesis: true },
  { month: 18, label: 'M18 — Gate 10 000 et revue Europe', market: 'France + BE/LU + UK test', phase: 'Validation', cumulativeClients: 10000, newClients: 300, orders: 300, revenueEur: 18000, budgetEur: 6000, maxCacEur: 22, contentPerWeek: 16, kpi: '10 000 clients + France rentable + décision UK', decision: 'Scale Europe uniquement si LTV/CAC ≥ 3.', hypothesis: true },
  { month: 19, label: 'M19 — Scale Europe gagnante', market: 'France + pays validés', phase: 'Scale', cumulativeClients: 10800, newClients: 800, orders: 800, revenueEur: 47000, budgetEur: 14000, maxCacEur: 22, contentPerWeek: 18, kpi: '2 pays hors France avec marge positive', decision: 'Doubler le meilleur pays, geler le plus faible.', hypothesis: true },
  { month: 20, label: 'M20 — Localisation seconde langue', market: 'Europe', phase: 'Scale', cumulativeClients: 11600, newClients: 800, orders: 800, revenueEur: 48000, budgetEur: 15000, maxCacEur: 22, contentPerWeek: 18, kpi: 'conversion locale ≥ 1,2 %', decision: 'Ne pas ouvrir DE/NL avant données locales.', hypothesis: true },
  { month: 21, label: 'M21 — 3PL européen conditionnel', market: 'Europe', phase: 'Scale', cumulativeClients: 12500, newClients: 900, orders: 900, revenueEur: 54000, budgetEur: 17000, maxCacEur: 22, contentPerWeek: 20, kpi: 'délai livraison et marge pays mesurés', decision: '3PL seulement si volume récurrent justifie le coût.', hypothesis: true },
  { month: 22, label: 'M22 — Partenariats professionnels', market: 'France + Europe', phase: 'Scale', cumulativeClients: 13500, newClients: 1000, orders: 1000, revenueEur: 60000, budgetEur: 18000, maxCacEur: 22, contentPerWeek: 20, kpi: '20 partenaires actifs', decision: 'Développer KURLA Pro après preuve d’usage.', hypothesis: true },
  { month: 23, label: 'M23 — Revue rentabilité', market: 'Europe', phase: 'Validation', cumulativeClients: 14700, newClients: 1200, orders: 1200, revenueEur: 72000, budgetEur: 20000, maxCacEur: 22, contentPerWeek: 20, kpi: 'LTV/CAC ≥ 3, marge positive', decision: 'Préparer la vague Afrique uniquement si les deux critères tiennent.', hypothesis: true },
  { month: 24, label: 'M24 — Décision Afrique', market: 'Europe + ZA en recherche', phase: 'Expansion', cumulativeClients: 16000, newClients: 1300, orders: 1300, revenueEur: 78000, budgetEur: 18000, maxCacEur: 22, contentPerWeek: 22, kpi: 'dossier ZA complet, pas de vente sans conformité', decision: 'Rechercher ZA ; ne pas lancer avant gate 50k de l’escalier.', hypothesis: true }
];

export const GROWTH_CHANNEL_EQUATIONS = {
  visitorsForOrders: 'visiteurs = nouveaux clients ÷ conversion visite→commande',
  diagnosticsForVisitors: 'diagnostics complétés = visiteurs × taux visite→diagnostic',
  budgetForClients: 'budget acquisition = nouveaux clients × CAC',
  revenue: 'CA première commande = commandes × panier moyen',
  ltvCac: 'LTV/CAC = valeur client observée ÷ CAC observé',
  breakEven: 'marge contributive par commande × commandes − dépenses acquisition ≥ 0'
} as const;

function iso(date: Date): string { return date.toISOString().slice(0, 10); }
function addDays(date: Date, days: number): Date { const copy = new Date(date); copy.setUTCDate(copy.getUTCDate() + days); return copy; }
function executionSafeAction(action: string): string {
  if (/1er lot kits commandé/i.test(action)) return 'Valider la disponibilité SKU chez un fournisseur accepté C1 et le flux dropshipping/3PL ; aucun stock propre année 1.';
  return action;
}
function ownerForAction(action: string): GrowthTask['owner'] {
  if (/stripe|paiement|prix de revient|réachat|email|parrainage/i.test(action)) return /stripe|prix de revient/i.test(action) ? 'Revenue' : 'Growth';
  if (/créat|vidéo|vidéos|ugc|SEO|contenu|carrousel|TikTok|email/i.test(action)) return 'Content';
  if (/salon|coiffe|barbier|parten/i.test(action)) return 'Partnerships';
  if (/analytics|landing|diagnostic|A\/B|utm|funnel/i.test(action)) return 'Product';
  if (/stock|3PL|expédier|lot/i.test(action)) return 'Ops';
  return 'CEO';
}

export function buildGrowthSeeds(anchor = new Date()): { tasks: GrowthTask[]; campaigns: GrowthCampaign[]; markets: GrowthMarket[] } {
  const createdAt = anchor.toISOString();
  const tasks: GrowthTask[] = [];
  PEN_WEEKLY.forEach((week) => week.actions.forEach((action, index) => {
    const id = `task-w${week.week}-${index + 1}`;
    tasks.push({
      id,
      title: executionSafeAction(action),
      owner: ownerForAction(action),
      priority: week.week <= 2 ? 'P0' : week.week <= 8 ? 'P1' : 'P2',
      status: 'todo',
      deadline: iso(addDays(anchor, (week.week - 1) * 7 + Math.min(index, 4))),
      week: week.week,
      market: week.week <= 8 ? 'France · IdF/Lyon · 4C' : 'France · national · 4C',
      kpi: week.kpi,
      expected: week.goal,
      source: 'week_plan',
      createdAt,
      updatedAt: createdAt
    });
  }));

  const campaigns: GrowthCampaign[] = PEN_CAMPAIGNS.filter(c => c.id !== 'c-total-100').map((campaign: PenCampaign) => ({
    id: campaign.id,
    name: campaign.name,
    market: campaign.window.includes('M1') || campaign.window.includes('M2') ? 'France · IdF/Lyon · 4C' : 'France · national · 4C',
    segment: campaign.segment,
    channel: campaign.channel,
    offer: campaign.offer,
    trackingCampaign: campaign.utmCampaign,
    budgetEur: campaign.budgetEur,
    startDate: iso(anchor),
    endDate: iso(addDays(anchor, campaign.window.includes('M1') || campaign.window.includes('M2') ? 56 : 180)),
    plannedClients: campaign.targetClients,
    plannedRevenueEur: campaign.targetRevenueEur,
    targetCacEur: campaign.targetCacEur,
    kpi: campaign.kpi,
    status: 'planned',
    actualClients: null,
    actualRevenueEur: null,
    actualSpendEur: null,
    hypothesis: true,
    createdAt,
    updatedAt: createdAt
  }));

  const markets: GrowthMarket[] = GROWTH_MARKET_SEEDS.map(seed => ({
    ...seed,
    actualClients: null,
    actualRevenueEur: null,
    actualSpendEur: null,
    updatedAt: createdAt
  }));
  return { tasks, campaigns, markets };
}

export function calculateGrowthPlan(input: { targetClients: number; conversionPct: number; diagnosticRatePct: number; cacEur: number; aovEur: number; repeat90dPct: number; grossMarginPct: number }) {
  const target = Math.max(0, input.targetClients);
  const conversion = Math.max(0.01, input.conversionPct) / 100;
  const diagnosticRate = Math.max(0, input.diagnosticRatePct) / 100;
  const visitors = Math.ceil(target / conversion);
  const diagnostics = Math.ceil(visitors * diagnosticRate);
  const budget = Math.round(target * Math.max(0, input.cacEur));
  const firstOrderRevenue = Math.round(target * Math.max(0, input.aovEur));
  const repeatOrders = Math.round(target * Math.max(0, input.repeat90dPct) / 100);
  const expected90dRevenue = Math.round((target + repeatOrders) * Math.max(0, input.aovEur));
  const contribution = Math.round(expected90dRevenue * Math.max(0, input.grossMarginPct) / 100 - budget);
  return { targetClients: target, visitors, diagnostics, budgetEur: budget, firstOrderRevenueEur: firstOrderRevenue, repeatOrders, expected90dRevenueEur: expected90dRevenue, contributionAfterAcquisitionEur: contribution, hypothesis: true as const };
}

export function ownerIsValid(value: unknown): value is GrowthTask['owner'] {
  return ['CEO', 'Growth', 'Content', 'Partnerships', 'Revenue', 'Ops', 'Product'].includes(String(value));
}
export function taskStatusIsValid(value: unknown): value is GrowthTaskStatus { return ['todo', 'in_progress', 'done', 'blocked'].includes(String(value)); }
export function campaignStatusIsValid(value: unknown): value is GrowthCampaignStatus { return ['planned', 'active', 'paused', 'done'].includes(String(value)); }
export function marketStatusIsValid(value: unknown): value is GrowthMarketStatus { return ['research', 'test', 'validation', 'scale', 'leadership', 'expansion', 'blocked'].includes(String(value)); }
