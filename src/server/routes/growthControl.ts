import type { Express, Response } from 'express';

import {
  GROWTH_CHANNEL_EQUATIONS,
  GROWTH_FRANCE_PHASES,
  GROWTH_GLOBAL_GATES,
  GROWTH_LADDER,
  GROWTH_OPERATING_MODEL,
  GROWTH_MONTHLY_PLAN,
  calculateGrowthPlan,
  campaignStatusIsValid,
  marketStatusIsValid,
  ownerIsValid,
  taskStatusIsValid,
} from '../../lib/growthControl';
import { PEN_DEPTH, PEN_FIRST100, PEN_INFLUENCE, PEN_PARTNERS, PEN_WEEKLY } from '../../lib/penetration';
import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { requireAdmin } from '../auth';
import type { AuthenticatedRequest } from '../types';

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateIsValid(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function realGrowthMetrics(
  campaigns: Awaited<ReturnType<typeof serverDb.listGrowthCampaigns>>,
  attribution: Awaited<ReturnType<typeof serverDb.getGrowthAttribution>>,
  funnel: Awaited<ReturnType<typeof serverDb.getGrowthFunnelMetrics>>
) {
  const metrics = await serverDb.getAdminAnalyticsMetrics();
  const trackedCampaigns = campaigns.filter(campaign => campaign.actualClients !== null && campaign.actualSpendEur !== null);
  const attributedClients = attribution.reduce((sum, campaign) => sum + Number(campaign.orders || 0), 0);
  const attributedRevenueEur = attribution.reduce((sum, campaign) => sum + Number(campaign.revenueEur || 0), 0);
  const manuallyMeasuredRevenueEur = trackedCampaigns.reduce((sum, campaign) => sum + Number(campaign.actualRevenueEur || 0), 0);
  const attributedSpendEur = trackedCampaigns.reduce((sum, campaign) => sum + Number(campaign.actualSpendEur || 0), 0);
  const actualCac = trackedCampaigns.reduce((sum, campaign) => sum + Number(campaign.actualClients || 0), 0) > 0 ? attributedSpendEur / trackedCampaigns.reduce((sum, campaign) => sum + Number(campaign.actualClients || 0), 0) : null;
  const nextRung = GROWTH_LADDER.find(rung => rung.clients > Number(metrics.uniqueCustomers || 0)) || GROWTH_LADDER[GROWTH_LADDER.length - 1];
  const existingClients = Number(metrics.uniqueCustomers || 0);
  const targetNewClients = Math.max(0, nextRung.clients - existingClients);
  const plan = calculateGrowthPlan({
    targetClients: targetNewClients || nextRung.clients,
    conversionPct: nextRung.visitToOrderPct,
    diagnosticRatePct: 35,
    cacEur: nextRung.maxCacEur,
    aovEur: nextRung.aovEur,
    repeat90dPct: nextRung.repeat90dPct,
    grossMarginPct: 45
  });
  return {
    source: 'persisted_orders_plus_admin_campaign_measurements',
    clients: existingClients,
    attributedClients,
    attributedSpendEur: trackedCampaigns.length ? attributedSpendEur : null,
    attributedRevenueEur: trackedCampaigns.length ? attributedRevenueEur : null,
    campaignRoiPct: attributedSpendEur > 0 && trackedCampaigns.some(campaign => campaign.actualRevenueEur !== null) ? Math.round(((manuallyMeasuredRevenueEur / attributedSpendEur) - 1) * 1000) / 10 : null,
    orders: Number(metrics.paidOrdersCount || 0),
    revenueEur: Number(metrics.revenueTest || 0),
    aovEur: Number(metrics.avgOrderValue || 0),
    repeatRatePct: metrics.repeatRate === null || metrics.repeatRate === undefined ? null : Number(metrics.repeatRate),
    ltvEur: metrics.ltvProxy === null || metrics.ltvProxy === undefined ? null : Number(metrics.ltvProxy),
    cacEur: actualCac,
    marginEur: Number(metrics.estimatedMargin || 0),
    marginRatePct: metrics.estimatedMarginRate === null || metrics.estimatedMarginRate === undefined ? null : Number(metrics.estimatedMarginRate),
    traffic: funnel.pageViews,
    uniqueSessions: funnel.uniqueSessions,
    diagnosticStarts: funnel.diagnosticStarts,
    diagnosticCompletionRatePct: funnel.diagnosticCompletionRatePct,
    funnel,
    nextRung: { clients: nextRung.clients, targetNewClients, maxCacEur: nextRung.maxCacEur, aovEur: nextRung.aovEur },
    calculator: plan,
    unknowns: [
      ...(funnel.pageViews === 0 ? ['visiteurs'] : []),
      ...(funnel.diagnosticStarts === 0 ? ['diagnostics'] : []),
      ...(actualCac === null ? ['CAC réel consolidé'] : []),
      ...(funnel.pageViews === 0 ? ['conversion visite→commande'] : [])
    ]
  };
}

function computeAlerts(real: Awaited<ReturnType<typeof realGrowthMetrics>>, campaigns: Awaited<ReturnType<typeof serverDb.listGrowthCampaigns>>, tasks: Awaited<ReturnType<typeof serverDb.listGrowthTasks>>) {
  const alerts: Array<{ level: 'red' | 'amber' | 'green' | 'gray'; title: string; detail: string; action: string }> = [];
  if (real.orders === 0) alerts.push({ level: 'red', title: 'Aucune commande payée mesurée', detail: 'Le moteur n’a pas encore de preuve de conversion réelle.', action: 'Exécuter les tâches P0 France 1 : offre, 50 créateurs, 10 salons et tracking.' });
  if (real.cacEur === null) alerts.push({ level: 'gray', title: 'CAC réel non calculable', detail: 'Aucune dépense d’acquisition réelle n’est consolidée dans le serveur.', action: 'Renseigner le spend réel par campagne et conserver les UTM.' });
  if (real.cacEur !== null && real.cacEur > real.nextRung.maxCacEur) alerts.push({ level: 'red', title: 'CAC au-dessus du seuil du palier', detail: `${Math.round(real.cacEur)} € réel contre ${real.nextRung.maxCacEur} € maximum.`, action: 'Mettre en pause le canal le plus cher, isoler la créa gagnante et retravailler l’offre avant de scaler.' });
  if (real.campaignRoiPct !== null && real.campaignRoiPct < 0) alerts.push({ level: 'red', title: 'ROI campagnes négatif', detail: `${real.campaignRoiPct}% sur les campagnes avec CA réel saisi.`, action: 'Couper ou pivoter la campagne avant toute augmentation de budget.' });
  if (real.aovEur > 0 && real.aovEur < real.nextRung.aovEur) alerts.push({ level: 'red', title: 'Panier moyen sous l’hypothèse du palier', detail: `${Math.round(real.aovEur)} € réel contre ${real.nextRung.aovEur} € planifiés.`, action: 'Mettre le kit en sortie du diagnostic et mesurer les add-ons ; ne pas augmenter le paid.' });
  if (real.repeatRatePct !== null && real.repeatRatePct < 20 && real.clients >= 30) alerts.push({ level: 'red', title: 'Réachat 90 jours sous le seuil', detail: `${real.repeatRatePct}% réel ; seuil de passage 20%.`, action: 'Corriger onboarding, qualité produit et séquence J7/J30 avant d’ouvrir un marché.' });
  if (campaigns.some(c => c.status === 'active' && c.actualClients !== null && c.actualSpendEur !== null && c.actualClients === 0)) alerts.push({ level: 'red', title: 'Campagne active sans client', detail: 'Une campagne active a consommé du budget sans client renseigné.', action: 'Mettre en pause la campagne et vérifier l’UTM, la landing et l’offre.' });
  const nextTask = tasks.find(task => task.status !== 'done' && task.priority === 'P0');
  if (nextTask) alerts.push({ level: 'amber', title: 'Action P0 en attente', detail: nextTask.title, action: `Assigner ${nextTask.owner} et la terminer avant le ${nextTask.deadline}.` });
  if (real.clients >= 100 && real.aovEur >= real.nextRung.aovEur && (real.repeatRatePct === null || real.repeatRatePct >= 20)) alerts.push({ level: 'green', title: 'Gate de répétition proche', detail: 'Les mesures connues ne bloquent pas le palier suivant.', action: 'Renseigner les données manquantes puis décider GO/PIVOT en revue hebdomadaire.' });
  return alerts;
}

export function registerGrowthControlRoutes(app: Express): void {
  app.get('/api/admin/growth/command-center', rateLimit('admin-growth-control', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const seeded = await serverDb.seedGrowthControl();
      const tasks = seeded.tasks;
      const campaigns = seeded.campaigns;
      const attribution = await serverDb.getGrowthAttribution();
      const funnel = await serverDb.getGrowthFunnelMetrics(30);
      const measuredCampaigns = campaigns.map(campaign => {
        const measured = attribution.find(row => row.campaign === campaign.trackingCampaign);
        return { ...campaign, measuredOrders: measured?.orders || 0, measuredRevenueEur: measured?.revenueEur || 0, measuredChannel: measured?.channel || null };
      });
      const real = await realGrowthMetrics(campaigns, attribution, funnel);
      const markets = seeded.markets;
      const alerts = computeAlerts(real, campaigns, tasks);
      const decisionRecommended = alerts.some(alert => alert.level === 'red')
        ? 'STOP / PIVOT : traiter les alertes rouges avant toute hausse de budget ou ouverture de marché.'
        : tasks.some(task => task.status !== 'done' && task.priority === 'P0')
          ? 'EXECUTE : terminer les actions P0 de la semaine, puis mesurer le gate avant de scaler.'
          : 'MEASURE / SCALE PRUDENTLY : aucune alerte rouge connue ; compléter les champs réels manquants avant décision.';
      res.json({
        generatedAt: new Date().toISOString(),
        planStatus: 'hypotheses_explicitly_separated_from_real',
        operatingModel: GROWTH_OPERATING_MODEL,
        real,
        ladder: GROWTH_LADDER.map(rung => ({ ...rung, actualClients: real.clients, status: real.clients >= rung.clients ? 'reached' : real.clients >= (GROWTH_LADDER[GROWTH_LADDER.indexOf(rung) - 1]?.clients || 0) ? 'current' : 'locked' })),
        francePhases: GROWTH_FRANCE_PHASES,
        globalGates: GROWTH_GLOBAL_GATES,
        monthlyPlan: GROWTH_MONTHLY_PLAN,
        equations: GROWTH_CHANNEL_EQUATIONS,
        first100: PEN_FIRST100,
        weeklyPlan: PEN_WEEKLY,
        influence: PEN_INFLUENCE,
        partners: PEN_PARTNERS,
        depthPlan: PEN_DEPTH,
        tasks,
        campaigns: measuredCampaigns,
        markets,
        today: tasks.filter(task => task.status !== 'done').slice(0, 10),
        alerts,
        decisionRecommended,
        attribution: { campaignActuals: attribution.length ? 'persisted_orders_utm_last_touch' : 'manual_admin_until_utm_exists', campaigns: attribution, traffic: 'not_configured', disclaimer: 'Les champs planifiés sont des hypothèses. Les champs réels viennent des commandes persistées ou restent null.' },
        seeded: seeded.seeded,
        adminId: admin.id
      });
    } catch (error) {
      res.status(503).json({ error: safeApiError(error, 'Growth Control Center indisponible. Appliquer la migration growth_control_center.') });
    }
  }));

  app.post('/api/admin/growth/tasks', rateLimit('admin-growth-task-create', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const body = req.body || {};
    if (typeof body.title !== 'string' || !body.title.trim() || !ownerIsValid(body.owner) || !['P0', 'P1', 'P2'].includes(body.priority) || !taskStatusIsValid(body.status) || !dateIsValid(body.deadline)) return res.status(400).json({ error: 'Tâche invalide : titre, responsable, priorité, statut et deadline sont obligatoires.' });
    try {
      const task = await serverDb.createGrowthTask({ title: body.title, owner: body.owner, priority: body.priority, status: body.status, deadline: body.deadline, week: Number(body.week || 0), market: String(body.market || ''), kpi: String(body.kpi || ''), expected: String(body.expected || ''), source: 'manual', campaignId: typeof body.campaignId === 'string' ? body.campaignId : undefined });
      await serverDb.recordAdminAudit(admin.id, 'growth_task_created', { taskId: task.id });
      res.status(201).json({ task });
    } catch (error) { res.status(400).json({ error: safeApiError(error, 'Impossible de créer la tâche.') }); }
  }));

  app.patch('/api/admin/growth/tasks/:id', rateLimit('admin-growth-task-update', 120, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const patch: any = {};
    if (req.body?.status !== undefined) { if (!taskStatusIsValid(req.body.status)) return res.status(400).json({ error: 'Statut de tâche invalide.' }); patch.status = req.body.status; }
    if (req.body?.owner !== undefined) { if (!ownerIsValid(req.body.owner)) return res.status(400).json({ error: 'Responsable invalide.' }); patch.owner = req.body.owner; }
    if (req.body?.priority !== undefined) { if (!['P0', 'P1', 'P2'].includes(req.body.priority)) return res.status(400).json({ error: 'Priorité invalide.' }); patch.priority = req.body.priority; }
    if (req.body?.deadline !== undefined) { if (!dateIsValid(req.body.deadline)) return res.status(400).json({ error: 'Deadline invalide.' }); patch.deadline = req.body.deadline; }
    try {
      const task = await serverDb.updateGrowthTask(String(req.params.id), patch);
      if (!task) return res.status(404).json({ error: 'Tâche growth introuvable.' });
      await serverDb.recordAdminAudit(admin.id, 'growth_task_updated', { taskId: task.id, patch });
      res.json({ task });
    } catch (error) { res.status(400).json({ error: safeApiError(error, 'Impossible de modifier la tâche.') }); }
  }));

  app.patch('/api/admin/growth/campaigns/:id', rateLimit('admin-growth-campaign-update', 120, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const body = req.body || {};
    if (body.status !== undefined && !campaignStatusIsValid(body.status)) return res.status(400).json({ error: 'Statut de campagne invalide.' });
    const patch: any = {};
    if (body.status !== undefined) patch.status = body.status;
    for (const key of ['actualClients', 'actualRevenueEur', 'actualSpendEur', 'budgetEur']) if (body[key] !== undefined) { const value = body[key] === null ? null : numberOrNull(body[key]); if (body[key] !== null && (value === null || value < 0)) return res.status(400).json({ error: `${key} doit être un nombre positif ou null.` }); patch[key] = value; }
    if (body.startDate !== undefined) { if (!dateIsValid(body.startDate)) return res.status(400).json({ error: 'Date de début invalide.' }); patch.startDate = body.startDate; }
    if (body.endDate !== undefined) { if (!dateIsValid(body.endDate)) return res.status(400).json({ error: 'Date de fin invalide.' }); patch.endDate = body.endDate; }
    try {
      const campaign = await serverDb.updateGrowthCampaign(String(req.params.id), patch);
      if (!campaign) return res.status(404).json({ error: 'Campagne growth introuvable.' });
      await serverDb.recordAdminAudit(admin.id, 'growth_campaign_updated', { campaignId: campaign.id, patch });
      res.json({ campaign });
    } catch (error) { res.status(400).json({ error: safeApiError(error, 'Impossible de modifier la campagne.') }); }
  }));

  app.patch('/api/admin/growth/markets/:id', rateLimit('admin-growth-market-update', 120, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const body = req.body || {};
    if (body.status !== undefined && !marketStatusIsValid(body.status)) return res.status(400).json({ error: 'Statut de marché invalide.' });
    const patch: any = {};
    if (body.status !== undefined) patch.status = body.status;
    for (const key of ['actualClients', 'actualRevenueEur', 'actualSpendEur']) if (body[key] !== undefined) { const value = body[key] === null ? null : numberOrNull(body[key]); if (body[key] !== null && (value === null || value < 0)) return res.status(400).json({ error: `${key} doit être un nombre positif ou null.` }); patch[key] = value; }
    if (body.openedAt !== undefined) { if (body.openedAt !== null && !dateIsValid(body.openedAt)) return res.status(400).json({ error: 'Date d’ouverture invalide.' }); patch.openedAt = body.openedAt; }
    try {
      const market = await serverDb.updateGrowthMarket(String(req.params.id), patch);
      if (!market) return res.status(404).json({ error: 'Marché growth introuvable.' });
      await serverDb.recordAdminAudit(admin.id, 'growth_market_updated', { marketId: market.id, patch });
      res.json({ market });
    } catch (error) { res.status(400).json({ error: safeApiError(error, 'Impossible de modifier le marché.') }); }
  }));
}
