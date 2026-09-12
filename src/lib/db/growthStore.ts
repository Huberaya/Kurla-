import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import type { SupabaseServerStore } from '../serverDb';
import type { GrowthCampaign, GrowthCampaignStatus, GrowthMarket, GrowthMarketStatus, GrowthTask, GrowthTaskStatus, GrowthPriority } from '../growthControl';
import { buildGrowthSeeds } from '../growthControl';

export interface GrowthTaskInput {
  title: string;
  owner: GrowthTask['owner'];
  priority: GrowthPriority;
  status: GrowthTaskStatus;
  deadline: string;
  week: number;
  market: string;
  kpi: string;
  expected: string;
  source?: GrowthTask['source'];
  campaignId?: string;
}

export interface GrowthCampaignPatch {
  status?: GrowthCampaignStatus;
  actualClients?: number | null;
  actualRevenueEur?: number | null;
  actualSpendEur?: number | null;
  budgetEur?: number;
  startDate?: string;
  endDate?: string;
}

export interface GrowthMarketPatch {
  status?: GrowthMarketStatus;
  actualClients?: number | null;
  actualRevenueEur?: number | null;
  actualSpendEur?: number | null;
  openedAt?: string | null;
}

function mapTask(row: any): GrowthTask {
  return {
    id: String(row.id), title: String(row.title), owner: row.owner, priority: row.priority,
    status: row.status, deadline: String(row.deadline), week: Number(row.week || 0), market: String(row.market || ''),
    kpi: String(row.kpi || ''), expected: String(row.expected || ''), source: row.source || 'manual',
    campaignId: row.campaign_id ?? row.campaignId ?? undefined,
    createdAt: String(row.created_at ?? row.createdAt), updatedAt: String(row.updated_at ?? row.updatedAt)
  };
}
function mapCampaign(row: any): GrowthCampaign {
  return {
    id: String(row.id), name: String(row.name), market: String(row.market || ''), segment: String(row.segment || ''),
    channel: String(row.channel || ''), offer: String(row.offer || ''), trackingCampaign: String(row.tracking_campaign ?? row.trackingCampaign ?? ''), budgetEur: Number(row.budget_eur ?? row.budgetEur ?? 0),
    startDate: String(row.start_date ?? row.startDate), endDate: String(row.end_date ?? row.endDate),
    plannedClients: Number(row.planned_clients ?? row.plannedClients ?? 0), plannedRevenueEur: Number(row.planned_revenue_eur ?? row.plannedRevenueEur ?? 0),
    targetCacEur: row.target_cac_eur ?? row.targetCacEur ?? null, kpi: String(row.kpi || ''), status: row.status,
    actualClients: row.actual_clients ?? row.actualClients ?? null, actualRevenueEur: row.actual_revenue_eur ?? row.actualRevenueEur ?? null,
    actualSpendEur: row.actual_spend_eur ?? row.actualSpendEur ?? null, hypothesis: row.hypothesis !== false,
    createdAt: String(row.created_at ?? row.createdAt), updatedAt: String(row.updated_at ?? row.updatedAt)
  };
}
function mapMarket(row: any): GrowthMarket {
  return {
    id: String(row.id), region: row.region, wave: Number(row.wave || 0), country: String(row.country), status: row.status,
    entrySegment: String(row.entry_segment ?? row.entrySegment ?? ''), entryOffer: String(row.entry_offer ?? row.entryOffer ?? ''), price: String(row.price || ''),
    language: String(row.language || ''), acquisition: String(row.acquisition || ''), influence: String(row.influence || ''), partners: String(row.partners || ''),
    logistics: String(row.logistics || ''), regulation: String(row.regulation || ''), budgetEur: Number(row.budget_eur ?? row.budgetEur ?? 0),
    plannedClients: Number(row.planned_clients ?? row.plannedClients ?? 0), validationWindow: String(row.validation_window ?? row.validationWindow ?? ''),
    successGate: String(row.success_gate ?? row.successGate ?? ''), failGate: String(row.fail_gate ?? row.failGate ?? ''), trigger: String(row.trigger || ''),
    actualClients: row.actual_clients ?? row.actualClients ?? null, actualRevenueEur: row.actual_revenue_eur ?? row.actualRevenueEur ?? null,
    actualSpendEur: row.actual_spend_eur ?? row.actualSpendEur ?? null, openedAt: row.opened_at ?? row.openedAt ?? undefined,
    hypothesis: row.hypothesis !== false, updatedAt: String(row.updated_at ?? row.updatedAt)
  };
}

export async function listGrowthTasks(store: SupabaseServerStore): Promise<GrowthTask[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('growth_tasks').select('*').order('deadline').order('priority');
    ensureDatabaseSuccess('lecture des tâches growth', error);
    return (data || []).map(mapTask);
  }
  return [...store.inMemoryGrowthTasks].sort((a, b) => a.deadline.localeCompare(b.deadline) || a.priority.localeCompare(b.priority));
}

export async function listGrowthCampaigns(store: SupabaseServerStore): Promise<GrowthCampaign[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('growth_campaigns').select('*').order('start_date').order('name');
    ensureDatabaseSuccess('lecture des campagnes growth', error);
    return (data || []).map(mapCampaign);
  }
  return [...store.inMemoryGrowthCampaigns].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
}

export async function listGrowthMarkets(store: SupabaseServerStore): Promise<GrowthMarket[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('growth_markets').select('*').order('wave').order('country');
    ensureDatabaseSuccess('lecture des marchés growth', error);
    return (data || []).map(mapMarket);
  }
  return [...store.inMemoryGrowthMarkets].sort((a, b) => a.wave - b.wave || a.country.localeCompare(b.country));
}

export async function seedGrowthControl(store: SupabaseServerStore): Promise<{ seeded: boolean; tasks: GrowthTask[]; campaigns: GrowthCampaign[]; markets: GrowthMarket[] }> {
  const [tasks, campaigns, markets] = await Promise.all([listGrowthTasks(store), listGrowthCampaigns(store), listGrowthMarkets(store)]);
  const seeds = buildGrowthSeeds(new Date());
  if (tasks.length === 0) for (const task of seeds.tasks) await createGrowthTask(store, task);
  if (campaigns.length === 0) for (const campaign of seeds.campaigns) await upsertGrowthCampaign(store, campaign);
  if (markets.length === 0) for (const market of seeds.markets) await upsertGrowthMarket(store, market);
  return {
    seeded: tasks.length === 0 || campaigns.length === 0 || markets.length === 0,
    tasks: await listGrowthTasks(store), campaigns: await listGrowthCampaigns(store), markets: await listGrowthMarkets(store)
  };
}

export async function createGrowthTask(store: SupabaseServerStore, input: GrowthTaskInput & { id?: string; createdAt?: string; updatedAt?: string }): Promise<GrowthTask> {
  const now = input.updatedAt || new Date().toISOString();
  const task: GrowthTask = {
    id: input.id || randomUUID(), title: input.title.trim().slice(0, 240), owner: input.owner, priority: input.priority, status: input.status,
    deadline: input.deadline, week: Math.max(0, Math.round(input.week)), market: input.market.trim().slice(0, 160), kpi: input.kpi.trim().slice(0, 240),
    expected: input.expected.trim().slice(0, 240), source: input.source || 'manual', campaignId: input.campaignId, createdAt: input.createdAt || now, updatedAt: now
  };
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('growth_tasks').upsert({ id: task.id, title: task.title, owner: task.owner, priority: task.priority, status: task.status, deadline: task.deadline, week: task.week, market: task.market, kpi: task.kpi, expected: task.expected, source: task.source, campaign_id: task.campaignId || null, created_at: task.createdAt, updated_at: task.updatedAt }, { onConflict: 'id' }).select('*').single();
    ensureDatabaseSuccess('enregistrement de la tâche growth', error);
    return mapTask(data);
  }
  const index = store.inMemoryGrowthTasks.findIndex(item => item.id === task.id);
  if (index >= 0) store.inMemoryGrowthTasks[index] = task; else store.inMemoryGrowthTasks.push(task);
  return task;
}

export async function updateGrowthTask(store: SupabaseServerStore, id: string, patch: Partial<Pick<GrowthTask, 'status' | 'owner' | 'priority' | 'deadline'>>): Promise<GrowthTask | undefined> {
  const existing = (await listGrowthTasks(store)).find(item => item.id === id);
  if (!existing) return undefined;
  return createGrowthTask(store, { ...existing, ...patch, updatedAt: new Date().toISOString() });
}

export async function upsertGrowthCampaign(store: SupabaseServerStore, campaign: GrowthCampaign): Promise<GrowthCampaign> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('growth_campaigns').upsert({ id: campaign.id, name: campaign.name, market: campaign.market, segment: campaign.segment, channel: campaign.channel, offer: campaign.offer, tracking_campaign: campaign.trackingCampaign, budget_eur: campaign.budgetEur, start_date: campaign.startDate, end_date: campaign.endDate, planned_clients: campaign.plannedClients, planned_revenue_eur: campaign.plannedRevenueEur, target_cac_eur: campaign.targetCacEur, kpi: campaign.kpi, status: campaign.status, actual_clients: campaign.actualClients, actual_revenue_eur: campaign.actualRevenueEur, actual_spend_eur: campaign.actualSpendEur, hypothesis: campaign.hypothesis, created_at: campaign.createdAt, updated_at: campaign.updatedAt }, { onConflict: 'id' }).select('*').single();
    ensureDatabaseSuccess('enregistrement de la campagne growth', error);
    return mapCampaign(data);
  }
  const index = store.inMemoryGrowthCampaigns.findIndex(item => item.id === campaign.id);
  if (index >= 0) store.inMemoryGrowthCampaigns[index] = campaign; else store.inMemoryGrowthCampaigns.push(campaign);
  return campaign;
}

export async function updateGrowthCampaign(store: SupabaseServerStore, id: string, patch: GrowthCampaignPatch): Promise<GrowthCampaign | undefined> {
  const campaign = (await listGrowthCampaigns(store)).find(item => item.id === id);
  if (!campaign) return undefined;
  return upsertGrowthCampaign(store, { ...campaign, ...patch, updatedAt: new Date().toISOString() });
}

export async function upsertGrowthMarket(store: SupabaseServerStore, market: GrowthMarket): Promise<GrowthMarket> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('growth_markets').upsert({ id: market.id, region: market.region, wave: market.wave, country: market.country, status: market.status, entry_segment: market.entrySegment, entry_offer: market.entryOffer, price: market.price, language: market.language, acquisition: market.acquisition, influence: market.influence, partners: market.partners, logistics: market.logistics, regulation: market.regulation, budget_eur: market.budgetEur, planned_clients: market.plannedClients, validation_window: market.validationWindow, success_gate: market.successGate, fail_gate: market.failGate, trigger: market.trigger, actual_clients: market.actualClients, actual_revenue_eur: market.actualRevenueEur, actual_spend_eur: market.actualSpendEur, opened_at: market.openedAt || null, hypothesis: market.hypothesis, updated_at: market.updatedAt }, { onConflict: 'id' }).select('*').single();
    ensureDatabaseSuccess('enregistrement du marché growth', error);
    return mapMarket(data);
  }
  const index = store.inMemoryGrowthMarkets.findIndex(item => item.id === market.id);
  if (index >= 0) store.inMemoryGrowthMarkets[index] = market; else store.inMemoryGrowthMarkets.push(market);
  return market;
}

export async function updateGrowthMarket(store: SupabaseServerStore, id: string, patch: GrowthMarketPatch): Promise<GrowthMarket | undefined> {
  const market = (await listGrowthMarkets(store)).find(item => item.id === id);
  if (!market) return undefined;
  return upsertGrowthMarket(store, { ...market, ...patch, updatedAt: new Date().toISOString() });
}

export interface GrowthAttributionRow {
  campaign: string;
  channel: string;
  orders: number;
  revenueEur: number;
}

export async function getGrowthAttribution(store: SupabaseServerStore): Promise<GrowthAttributionRow[]> {
  const revenueStatuses = new Set(['paid', 'processing', 'packed', 'shipped', 'delivered', 'completed', 'return_requested', 'returned', 'partially_refunded', 'refunded']);
  const source: Array<{ status: string; total: number; attribution?: any }> = [];
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('orders').select('status,total,attribution').limit(10000);
    if (error) return [];
    source.push(...(data || []).map(row => ({ status: String(row.status), total: Number(row.total || 0), attribution: row.attribution })));
  } else {
    source.push(...store.inMemoryOrders.map(order => ({ status: order.status, total: Number(order.total || 0), attribution: order.attribution })));
  }
  const byCampaign = new Map<string, GrowthAttributionRow>();
  for (const order of source) {
    if (!revenueStatuses.has(order.status)) continue;
    const last = order.attribution?.last || {};
    const campaign = typeof last.campaign === 'string' ? last.campaign.trim().slice(0, 120) : '';
    if (!campaign) continue;
    const channel = typeof last.channel === 'string' && last.channel.trim() ? last.channel.trim().slice(0, 80) : 'Non attribué';
    const current = byCampaign.get(campaign) || { campaign, channel, orders: 0, revenueEur: 0 };
    current.orders += 1;
    current.revenueEur = Math.round((current.revenueEur + order.total) * 100) / 100;
    byCampaign.set(campaign, current);
  }
  return [...byCampaign.values()].sort((a, b) => b.revenueEur - a.revenueEur);
}

export type GrowthFunnelEventName =
  | 'page_view' | 'view_item' | 'view_item_list' | 'diagnostic_start'
  | 'diagnostic_complete' | 'select_promotion' | 'add_to_cart'
  | 'begin_checkout' | 'purchase' | 'generate_lead' | 'sign_up'
  | 'search' | 'ai_assistant_message';

export interface GrowthFunnelEvent {
  id: string;
  eventName: GrowthFunnelEventName;
  sessionId: string;
  path: string;
  props: Record<string, string | number | boolean>;
  occurredAt: string;
}

export interface GrowthFunnelMetrics {
  source: 'persisted_funnel_events' | 'memory_funnel_events';
  sinceDays: number;
  pageViews: number;
  uniqueSessions: number;
  diagnosticStarts: number;
  diagnosticCompletes: number;
  diagnosticCompletionRatePct: number | null;
  recommendationViews: number;
  addToCarts: number;
  checkouts: number;
  leads: number;
  eventCount: number;
}

export async function recordGrowthFunnelEvent(store: SupabaseServerStore, event: GrowthFunnelEvent): Promise<GrowthFunnelEvent> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('growth_funnel_events').upsert({
      id: event.id,
      event_name: event.eventName,
      session_id: event.sessionId,
      path: event.path,
      props: event.props,
      occurred_at: event.occurredAt
    }, { onConflict: 'id', ignoreDuplicates: true }).select('*').maybeSingle();
    ensureDatabaseSuccess('enregistrement de l’événement funnel', error);
    if (data) return {
      id: String(data.id), eventName: data.event_name, sessionId: String(data.session_id),
      path: String(data.path), props: data.props || {}, occurredAt: String(data.occurred_at)
    };
    return event;
  }
  const existing = store.inMemoryGrowthFunnelEvents.find(item => item.id === event.id);
  if (existing) return existing;
  store.inMemoryGrowthFunnelEvents.push(event);
  return event;
}

export async function getGrowthFunnelMetrics(store: SupabaseServerStore, sinceDays = 30): Promise<GrowthFunnelMetrics> {
  const since = new Date(Date.now() - Math.max(1, Math.min(365, sinceDays)) * 24 * 60 * 60 * 1000);
  let events: GrowthFunnelEvent[];
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('growth_funnel_events')
      .select('id,event_name,session_id,path,props,occurred_at')
      .gte('occurred_at', since.toISOString())
      .order('occurred_at', { ascending: false })
      .limit(100000);
    ensureDatabaseSuccess('lecture des événements funnel', error);
    events = (data || []).map(row => ({
      id: String(row.id), eventName: row.event_name, sessionId: String(row.session_id),
      path: String(row.path), props: row.props || {}, occurredAt: String(row.occurred_at)
    }));
  } else {
    events = store.inMemoryGrowthFunnelEvents.filter(event => new Date(event.occurredAt) >= since);
  }
  const count = (names: GrowthFunnelEventName[]) => events.filter(event => names.includes(event.eventName)).length;
  const diagnosticStarts = count(['diagnostic_start']);
  const diagnosticCompletes = count(['diagnostic_complete']);
  return {
    source: supabase ? 'persisted_funnel_events' : 'memory_funnel_events',
    sinceDays: Math.max(1, Math.min(365, sinceDays)),
    pageViews: count(['page_view']),
    uniqueSessions: new Set(events.map(event => event.sessionId)).size,
    diagnosticStarts,
    diagnosticCompletes,
    diagnosticCompletionRatePct: diagnosticStarts > 0 ? Math.round((diagnosticCompletes / diagnosticStarts) * 1000) / 10 : null,
    recommendationViews: count(['select_promotion']),
    addToCarts: count(['add_to_cart']),
    checkouts: count(['begin_checkout']),
    leads: count(['generate_lead', 'sign_up']),
    eventCount: events.length
  };
}
