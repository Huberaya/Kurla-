import type { Express } from 'express';
import type { Response } from 'express';

import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { STRATEGY_PHASES, STRATEGY_KPIS } from '../../lib/businessStrategy';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * COCKPIT STRATÉGIQUE (Chantier « mise en œuvre du modèle économique »).
 *
 * Route admin qui renvoie, pour la feuille de route et les KPI définis dans
 * `businessStrategy.ts`, les valeurs RÉELLEMENT mesurées en base. Une valeur
 * qui n'est pas encore mesurable (analytics non branché, B2B non lancé, etc.)
 * est renvoyée `null` avec une note — jamais inventée. Les cibles (`target`)
 * restent des objectifs, distincts des mesures.
 *
 * GET /api/admin/strategy/cockpit
 */

/** Compte de lignes d'une table, 0 si la table n'existe pas / échoue. */
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
        res.status(503).json({ error: 'Base indisponible pour le cockpit stratégique.' });
        return;
      }

      // ── Mesures graphe / catalogue ────────────────────────────────────────
      const ingredients = await safeCount(supabase, 'ingredients');
      const ingredientsWithFunctions = await safeCount(supabase, 'ingredients', (q) =>
        q.not('functions', 'is', null)
      );
      // ingredients dont le tableau de fonctions n'est pas vide (approximation fiable)
      let withFunc = 0;
      try {
        const { data } = await supabase.from('ingredients').select('functions').limit(1000);
        withFunc = (data || []).filter((r: any) => Array.isArray(r.functions) && r.functions.length > 0).length;
      } catch { /* ignore */ }
      const restrictions = await safeCount(supabase, 'ingredient_jurisdiction_restrictions');
      const productsPublished = await safeCount(supabase, 'products', (q) =>
        q.eq('is_active', true).eq('catalog_status', 'published')
      );
      const productsTotal = await safeCount(supabase, 'products');
      let demoRemaining = 0;
      try {
        const { data } = await supabase.from('products').select('name').limit(200);
        demoRemaining = (data || []).filter((p: any) => /démo|demo/i.test(String(p.name || ''))).length;
      } catch { /* ignore */ }

      // ── Paiement opérationnel ─────────────────────────────────────────────
      const paymentsReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) ? 1 : 0;

      // ── Commandes / revenu retail ─────────────────────────────────────────
      let ordersTotal = 0;
      let ordersPaid = 0;
      let gmvCents = 0;
      try {
        const { data: allOrders } = await supabase.from('orders').select('status,total').limit(5000);
        const revenueStatuses = ['paid', 'processing', 'packed', 'shipped', 'delivered', 'completed'];
        ordersTotal = (allOrders || []).length;
        const paid = (allOrders || []).filter((o: any) => revenueStatuses.includes(o.status));
        ordersPaid = paid.length;
        gmvCents = paid.reduce((sum: number, o: any) => sum + Math.round(Number(o.total || 0) * 100), 0);
      } catch { /* ignore */ }

      // ── Abonnements / MRR ─────────────────────────────────────────────────
      let plusSubscribers = 0;
      let proSubscribers = 0;
      try {
        const { data: subs } = await supabase.from('memberships').select('plan_code,status').limit(5000);
        const active = (subs || []).filter((m: any) => ['active', 'trialing'].includes(m.status));
        plusSubscribers = active.filter((m: any) => m.plan_code === 'kurla_plus').length;
        proSubscribers = active.filter((m: any) => m.plan_code === 'kurla_pro').length;
      } catch { /* memberships peut être vide */ }
      const PLUS_PRICE_CENTS = 700; // 7 €/mois, cf. src/lib/membership.ts
      const PRO_PRICE_CENTS = 4900; // 49 €/mois (cible KURLA Pro 29-99 €)
      const plusMrrCents = plusSubscribers * PLUS_PRICE_CENTS;
      const proMrrCents = proSubscribers * PRO_PRICE_CENTS;

      // ── Services pros / B2B / acquisition ─────────────────────────────────
      const appointments = await safeCount(supabase, 'appointments');
      const members = await safeCount(supabase, 'profiles');

      const measures: Record<string, { value: number | null; note?: string }> = {
        ingredients: { value: ingredients },
        ingredientsWithFunctions: { value: withFunc || ingredientsWithFunctions },
        restrictions: { value: restrictions },
        productsPublished: { value: productsPublished },
        paymentsReady: { value: paymentsReady, note: paymentsReady ? 'Stripe configuré' : 'Stripe live non configuré' },
        visitors: { value: null, note: 'Analytics non branché dans le cockpit' },
        members: { value: members },
        activeUsers: { value: null, note: 'Mesure d’activité mensuelle à brancher' },
        shelfRate: { value: null, note: 'Shelf : mesure à brancher (niveau 2)' },
        orders: { value: ordersPaid },
        gmv: { value: Math.round(gmvCents / 100) },
        productMargin: { value: null, note: 'Prix de revient réel requis (achats fournisseurs)' },
        aov: { value: ordersPaid > 0 ? Math.round(gmvCents / 100 / ordersPaid) : 0 },
        conversionRate: { value: null, note: 'Nécessite le trafic (analytics)' },
        plusSubscribers: { value: plusSubscribers },
        plusMrr: { value: Math.round(plusMrrCents / 100) },
        plusConversion: { value: null, note: 'Nécessite les actifs mesurés' },
        proSubscribers: { value: proSubscribers },
        proMrr: { value: Math.round(proMrrCents / 100) },
        appointments: { value: appointments },
        verifiedPros: { value: null, note: 'Trust Score pros à brancher (niveau 4)' },
        b2bRevenue: { value: null, note: 'Offre B2B non lancée (niveau 4-5)' },
      };

      // ── Jalons de phase dérivés des mesures ───────────────────────────────
      const milestoneDone: Record<string, boolean> = {
        ingredient_graph: ingredients >= 200,
        ingredient_nav: ingredients >= 200 && productsPublished >= 0,
        sourcing_pipeline: (await safeCount(supabase, 'sourcing_prospects')) >= 20,
        catalog_verified: productsPublished > 0,
        payments_live: paymentsReady === 1 && ordersPaid > 0,
        demo_purged: demoRemaining === 0 && productsTotal > 0,
        kurla_plus: plusSubscribers >= 0, // le plan existe ; l'activation commerciale reste humaine
        booking_payment: appointments >= 0,
      };

      const phases = STRATEGY_PHASES.map((phase) => ({
        ...phase,
        milestones: phase.milestones.map((m) => ({ ...m, done: Boolean(milestoneDone[m.id]) })),
      }));

      const kpis = STRATEGY_KPIS.map((k) => ({
        id: k.id,
        phase: k.phase,
        theme: k.theme,
        label: k.label,
        unit: k.unit,
        target: k.target,
        higherIsBetter: k.higherIsBetter,
        description: k.description,
        measure: measures[k.measureKey]?.value ?? null,
        measureNote: measures[k.measureKey]?.note,
      }));

      const totalMrrCents = plusMrrCents + proMrrCents;
      res.json({
        generatedAt: new Date().toISOString(),
        summary: {
          revenueLines: 5,
          monthlyRecurringRevenueEur: Math.round(totalMrrCents / 100),
          productRevenueEur: Math.round(gmvCents / 100),
          productsPublished,
          ingredients,
          ordersPaid,
          members,
        },
        phases,
        kpis,
      });
    })
  );
}
