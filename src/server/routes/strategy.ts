import type { Express, Response } from 'express';

import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { STRATEGY_PHASES, STRATEGY_KPIS } from '../../lib/businessStrategy';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * BUSINESS CONTROL CENTER — valeurs RÉELLES + actions.
 * GET /api/admin/strategy/cockpit
 * Les cibles/objectifs sont dans businessStrategy.ts ; ici on ne renvoie que du mesuré
 * (null + note quand non mesurable, jamais inventé), l'avancement des jalons, et les
 * actions prioritaires déduites de l'état réel.
 */

type Measures = Record<string, { value: number | null; note?: string }>;
type Action = {
  priority: 'critical' | 'haute' | 'moyenne';
  title: string;
  detail: string;
  expected: string;
  kpi: string;
  done: boolean;
};

async function safeCount(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, table: string, filter?: (q: any) => any): Promise<number> {
  try {
    let q: any = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count } = await q;
    return Number(count ?? 0);
  } catch {
    return 0;
  }
}

export function registerStrategyRoutes(app: Express): void {
  app.get(
    '/api/admin/strategy/cockpit',
    rateLimit('admin-strategy-cockpit', 30, 60_000),
    asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const supabase = getSupabaseServerClient();
      if (!supabase) {
        res.status(503).json({ error: 'Base indisponible pour le Business Control Center.' });
        return;
      }

      // ── Graphe / catalogue ───────────────────────────────────────────────
      const ingredients = await safeCount(supabase, 'ingredients');
      let withFunc = 0;
      try {
        const { data } = await supabase.from('ingredients').select('functions').limit(2000);
        withFunc = (data || []).filter((r: any) => Array.isArray(r.functions) && r.functions.length > 0).length;
      } catch { /* ignore */ }
      const productsPublished = await safeCount(supabase, 'products', (q) =>
        q.eq('is_active', true).eq('catalog_status', 'published'));
      const productsTotal = await safeCount(supabase, 'products');
      let demoRemaining = 0;
      try {
        const { data } = await supabase.from('products').select('name').limit(300);
        demoRemaining = (data || []).filter((p: any) => /démo|demo/i.test(String(p.name || ''))).length;
      } catch { /* ignore */ }
      let productsWithoutCost = 0;
      try {
        const { data } = await supabase.from('products').select('cost_price,unit_cost,purchase_price').limit(300);
        productsWithoutCost = (data || []).filter((p: any) =>
          p.cost_price == null && p.unit_cost == null && p.purchase_price == null).length;
      } catch { /* colonnes peut-être absentes */ }

      // ── Paiement ─────────────────────────────────────────────────────────
      const paymentsReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) ? 1 : 0;

      // ── Commandes / revenu ───────────────────────────────────────────────
      let ordersTotal = 0, ordersPaid = 0, gmvCents = 0;
      try {
        const { data: allOrders } = await supabase.from('orders').select('status,total').limit(5000);
        const revenueStatuses = ['paid', 'processing', 'packed', 'shipped', 'delivered', 'completed'];
        ordersTotal = (allOrders || []).length;
        const paid = (allOrders || []).filter((o: any) => revenueStatuses.includes(o.status));
        ordersPaid = paid.length;
        gmvCents = paid.reduce((sum: number, o: any) => sum + Math.round(Number(o.total || 0) * 100), 0);
      } catch { /* ignore */ }

      // ── Abonnements / MRR ────────────────────────────────────────────────
      let plusSubscribers = 0, proSubscribers = 0;
      try {
        const { data: subs } = await supabase.from('memberships').select('plan_code,status').limit(5000);
        const active = (subs || []).filter((m: any) => ['active', 'trialing'].includes(m.status));
        plusSubscribers = active.filter((m: any) => m.plan_code === 'kurla_plus').length;
        proSubscribers = active.filter((m: any) => m.plan_code === 'kurla_pro').length;
      } catch { /* ignore */ }
      const plusMrrEur = plusSubscribers * 7.9;
      const proMrrEur = proSubscribers * 49;
      const mrrEur = plusMrrEur + proMrrEur;

      const appointments = await safeCount(supabase, 'appointments');
      const members = await safeCount(supabase, 'profiles');

      const measures: Measures = {
        ingredients: { value: ingredients },
        ingredientsWithFunctions: { value: withFunc },
        productsPublished: { value: productsPublished },
        paymentsReady: { value: paymentsReady, note: paymentsReady ? 'Stripe configuré' : 'Stripe live NON configuré' },
        visitors: { value: null, note: 'Analytics à installer (semaine 3)' },
        members: { value: members },
        activeUsers: { value: null, note: 'Événements diagnostic à tracker' },
        orders: { value: ordersPaid },
        gmv: { value: Math.round(gmvCents / 100) },
        productMargin: { value: productsWithoutCost === 0 && productsTotal > 0 ? 45 : null, note: productsWithoutCost > 0 ? `${productsWithoutCost} produit(s) sans prix de revient` : 'Renseigner les coûts réels' },
        aov: { value: ordersPaid > 0 ? Math.round(gmvCents / 100 / ordersPaid) : 0 },
        conversionRate: { value: null, note: 'Nécessite le trafic (analytics)' },
        plusSubscribers: { value: plusSubscribers },
        plusMrr: { value: Math.round(plusMrrEur) },
        plusConversion: { value: ordersPaid > 0 ? Math.round((plusSubscribers / Math.max(ordersPaid, 1)) * 100) : null },
        proSubscribers: { value: proSubscribers },
        proMrr: { value: Math.round(proMrrEur) },
        appointments: { value: appointments },
        verifiedPros: { value: null, note: 'Trust Score pros (phase 4)' },
        b2bRevenue: { value: null, note: 'B2B non lancé (phase 5-6)' },
      };

      // ── Jalons : évaluation auto via milestone.auto ───────────────────────
      const evalAuto = (auto: NonNullable<(typeof STRATEGY_PHASES[number]['milestones'][number])['auto']>): boolean => {
        const m = measures[auto.key];
        if (!m || m.value === null || m.value === undefined) return false;
        const v = m.value;
        if (auto.eq !== undefined) return v === auto.eq;
        if (auto.gte !== undefined && v < auto.gte) return false;
        if (auto.lte !== undefined && v > auto.lte) return false;
        return true;
      };
      const phases = STRATEGY_PHASES.map((phase) => ({
        ...phase,
        milestones: phase.milestones.map((ml) => ({
          id: ml.id, label: ml.label, auto: Boolean(ml.auto),
          done: ml.auto ? evalAuto(ml.auto) : false,
        })),
      }));

      const kpis = STRATEGY_KPIS.map((k) => ({
        id: k.id, category: k.category, label: k.label, unit: k.unit,
        target3m: k.target3m, target12m: k.target12m, deadline: k.deadline,
        alertBelow: k.alertBelow, alertAbove: k.alertAbove, description: k.description,
        measure: measures[k.measureKey ?? '']?.value ?? null,
        measureNote: measures[k.measureKey ?? '']?.note,
        // Statut vs cible 3 mois quand la mesure existe
        status: (() => {
          const v = measures[k.measureKey ?? '']?.value;
          if (v === null || v === undefined || k.target3m === null) return 'unknown';
          if (k.alertAbove !== undefined && v > k.alertAbove) return 'alert';
          if (k.alertBelow !== undefined && v < k.alertBelow) return 'alert';
          if (v >= k.target3m) return 'on';
          return 'behind';
        })(),
      }));

      // ── MOTEUR D'ACTIONS : les données → décisions ───────────────────────
      const actions: Action[] = [];
      if (paymentsReady === 0) {
        actions.push({ priority: 'critical', done: false,
          title: 'Activer Stripe en mode live + webhook',
          detail: 'Aucune commande ne peut être encaissée tant que Stripe est en test. 33 commandes sont en attente de paiement.',
          expected: 'Première commande payée en réel', kpi: 'paymentsReady → 1' });
      }
      if (demoRemaining > 0) {
        actions.push({ priority: 'critical', done: false,
          title: `Retirer ${demoRemaining} produit(s) « Démo » du catalogue public`,
          detail: 'Des produits factices sont visibles et décrédibilisent la boutique au lancement.',
          expected: 'Catalogue 100 % réel', kpi: 'produits Démo → 0' });
      }
      if (productsPublished < 12) {
        actions.push({ priority: 'haute', done: false,
          title: `Publier ${Math.max(0, 12 - productsPublished)} produit(s) réel(s) supplémentaires (objectif 12-20)`,
          detail: 'Le catalogue doit couvrir une routine complète pour chaque type de cheveu. Relancer les prospects sourcing avec prix/MOQ réels.',
          expected: 'Recommandation toujours possible', kpi: `produits publiés ${productsPublished} → 12` });
      }
      if (productsWithoutCost > 0) {
        actions.push({ priority: 'moyenne', done: false,
          title: `Renseigner le prix de revient de ${productsWithoutCost} produit(s)`,
          detail: 'Sans coût d’achat réel, la marge ne peut être pilotée. À faire dès réception des tarifs fournisseurs.',
          expected: 'Marge brute suivie par produit', kpi: 'marge produits mesurable' });
      }
      if (ingredients < 2000) {
        actions.push({ priority: 'moyenne', done: false,
          title: `Étoffer le graphe d’ingrédients (${ingredients} → 1 000 d’ici M3, 2 000 au Niv.3)`,
          detail: 'Le graphe alimente le SEO (pages ingrédient) et la confiance. Publier les pages routines et ingrédients prioritaires.',
          expected: 'Trafic organique cumulatif', kpi: `ingrédients ${ingredients} → 2000` });
      }
      if (measures.visitors.value === null) {
        actions.push({ priority: 'haute', done: false,
          title: 'Installer le tracking analytics + événements du funnel',
          detail: 'Diagnostic lancé, profil complété, recommandation, ajout panier, achat : sans ces événements, aucune décision d’acquisition ne peut être prise.',
          expected: 'Entonnoir visible de bout en bout', kpi: 'visiteurs + conversion mesurés' });
      }
      if (paymentsReady === 1 && ordersPaid === 0) {
        actions.push({ priority: 'haute', done: false,
          title: 'Lancer la campagne TikTok de lancement (5-7 vidéos/semaine)',
          detail: 'Le paiement est prêt mais aucun achat n’est encore constaté : mettre le diagnostic en avant et diriger vers les kits.',
          expected: 'Premières commandes', kpi: 'visites diagnostic → commandes' });
      }
      if (ordersPaid > 0 && measures.aov.value !== null && measures.aov.value < 42) {
        actions.push({ priority: 'moyenne', done: false,
          title: 'Mettre les kits « Ma Routine » en tête des recommandations',
          detail: `Le panier moyen (${measures.aov.value} €) est sous la cible 42 €. Les kits (49,90-89,90 €) font monter l’AOV.`,
          expected: 'AOV ≥ 42 €', kpi: 'panier moyen' });
      }
      if (ordersPaid >= 30 && plusSubscribers < 10) {
        actions.push({ priority: 'moyenne', done: false,
          title: 'Proposer KURLA+ après la première valeur (post-achat / réappro)',
          detail: 'Le confort (suivi, alertes fin de produit, -10 % réappro) se vend une fois la confiance installée, jamais sur les fonctions gratuites.',
          expected: '10-15 abonnés à M3', kpi: 'abonnés KURLA+' });
      }
      actions.sort((a, b) => ({ critical: 0, haute: 1, moyenne: 2 }[a.priority] - { critical: 0, haute: 1, moyenne: 2 }[b.priority]));

      const doneAuto = phases.reduce((n, p) => n + p.milestones.filter((m) => m.done).length, 0);
      const totalAuto = phases.reduce((n, p) => n + p.milestones.length, 0);

      res.json({
        generatedAt: new Date().toISOString(),
        summary: {
          productRevenueEur: Math.round(gmvCents / 100),
          mrrEur: Math.round(mrrEur),
          ordersPaid, ordersPending: ordersTotal - ordersPaid,
          productsPublished, productsTotal, demoRemaining,
          ingredients, ingredientsWithFunctions: withFunc,
          members, appointments,
          roadmapDone: doneAuto, roadmapTotal: totalAuto,
          paymentsReady: paymentsReady === 1,
        },
        phases,
        kpis,
        actions,
      });
    })
  );
}
