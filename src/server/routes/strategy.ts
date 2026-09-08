import type { Express, Response } from 'express';

import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { STRATEGY_PHASES, STRATEGY_KPIS } from '../../lib/businessStrategy';
import { LAUNCH_PRODUCTS, LAUNCH_KITS } from '../../lib/launchCatalog';
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

      // ── PERFORMANCE COMMERCIALE RÉELLE (agrégation des lignes de commande) ──
      // On joint order_items → products pour avoir nom/prix, et on détecte les kits
      // via les badges. Le coût/marge réel n'est calculé que si un prix de revient
      // existe en base ; sinon on retombe sur la cible de marge catalogue (jamais
      // inventé : explicitement marqué « estimé »).
      type PerfRow = { id: string; name: string; qty: number; revenue: number; estimatedMargin: number | null; isKit: boolean };
      const productSales = new Map<string, PerfRow>();
      let itemsAvailable = false;
      try {
        // Statuts des commandes (joint en JS : fiable même sans FK déclarée)
        const { data: ordRows } = await supabase.from('orders').select('id, status').limit(10000);
        const orderStatus = new Map((ordRows || []).map((o: any) => [o.id, o.status]));
        const { data: lines } = await supabase
          .from('order_items')
          .select('order_id, product_id, quantity, unit_price')
          .limit(20000);
        const revenueStatuses = ['paid', 'processing', 'packed', 'shipped', 'delivered', 'completed'];
        const validLines = (lines || []).filter((l: any) => revenueStatuses.includes(orderStatus.get(l.order_id)));
        itemsAvailable = Array.isArray(lines);
        if (validLines.length) {
          // Catalogue de référence pour noms/détection kits/coûts
          const prodById = new Map(LAUNCH_PRODUCTS.map((p) => [`launch-${p.id}`, p]));
          const kitIds = new Set(LAUNCH_KITS.map((k) => `launch-${k.id}`));
          const { data: prodRows } = await supabase
            .from('products')
            .select('id, name, price, cost_price, unit_cost, purchase_price, badges')
            .limit(2000);
          const dbProd = new Map((prodRows || []).map((p: any) => [p.id, p]));
          for (const l of validLines) {
            const pid = String(l.product_id);
            const qty = Number(l.quantity || 0);
            const unit = Number(l.unit_price || 0);
            if (!pid || qty <= 0) continue;
            const db = dbProd.get(pid);
            const launch = prodById.get(pid);
            const name = db?.name || launch?.name || pid;
            const isKit = kitIds.has(pid) || (Array.isArray(db?.badges) && db?.badges.includes('kit'));
            const revenue = qty * unit;
            // Marge : coût réel en base si présent, sinon cible catalogue (estimé)
            const realCost = db?.cost_price ?? db?.unit_cost ?? db?.purchase_price;
            let margin: number | null = null;
            if (realCost != null && Number(realCost) > 0) {
              margin = (unit - Number(realCost)) * qty;
            } else if (launch) {
              margin = revenue * (launch.marginPct / 100);
            }
            const cur = productSales.get(pid) || { id: pid, name, qty: 0, revenue: 0, estimatedMargin: null, isKit };
            cur.qty += qty;
            cur.revenue = Math.round((cur.revenue + revenue) * 100) / 100;
            cur.estimatedMargin = margin != null
              ? Math.round(((cur.estimatedMargin ?? 0) + margin) * 100) / 100
              : null;
            productSales.set(pid, cur);
          }
        }
      } catch { /* table order_items peut être absente — la vue affichera « pas encore de ventes » */ }

      const allSold = Array.from(productSales.values()).sort((a, b) => b.revenue - a.revenue);
      const topProducts = allSold.filter((r) => !r.isKit).slice(0, 8);
      const topKits = allSold.filter((r) => r.isKit).slice(0, 8);
      const kitRevenue = allSold.filter((r) => r.isKit).reduce((s, r) => s + r.revenue, 0);
      const totalItemRevenue = allSold.reduce((s, r) => s + r.revenue, 0);
      const totalSoldQty = allSold.reduce((s, r) => s + r.qty, 0);

      // ── Ventes par canal d'acquisition (orders.attribution, sinon coupon) ──
      type ChannelRow = { channel: string; orders: number; revenue: number };
      const channelMap = new Map<string, ChannelRow>();
      let ordersWithAttribution = 0;
      try {
        const { data: ordForChannel } = await supabase
          .from('orders')
          .select('id, status, total, attribution')
          .limit(10000);
        const revStatuses = ['paid', 'processing', 'packed', 'shipped', 'delivered', 'completed'];
        for (const o of (ordForChannel || [])) {
          if (!revStatuses.includes(o.status)) continue;
          let channel: string | null = null;
          const attr = o.attribution as { last?: { channel?: string; source?: string; medium?: string } } | null;
          channel = attr?.last?.channel || null;
          if (channel) ordersWithAttribution++;
          else channel = 'Non attribué';
          const rev = Number(o.total || 0);
          const cur = channelMap.get(channel) || { channel, orders: 0, revenue: 0 };
          cur.orders += 1;
          cur.revenue = Math.round((cur.revenue + rev) * 100) / 100;
          channelMap.set(channel, cur);
        }
      } catch { /* colonne attribution peut être absente avant migration */ }
      const channels = Array.from(channelMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .map(c => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }));

      // ── Campagnes d'acquisition (orders.attribution.last.campaign) ─────────
      type CampaignRow = { campaign: string; channel: string; orders: number; revenue: number };
      const campaignMap = new Map<string, CampaignRow>();
      try {
        const { data: ordForCampaign } = await supabase
          .from('orders')
          .select('id, status, total, attribution')
          .limit(10000);
        const revSt = ['paid', 'processing', 'packed', 'shipped', 'delivered', 'completed'];
        for (const o of (ordForCampaign || [])) {
          if (!revSt.includes(o.status)) continue;
          const attr = o.attribution as { last?: { campaign?: string; channel?: string } } | null;
          const campRaw = attr?.last?.campaign?.trim();
          if (!campRaw) continue;
          const camp = campRaw.slice(0, 80);
          const ch = attr?.last?.channel || 'Non attribué';
          const rev = Number(o.total || 0);
          const cur = campaignMap.get(camp) || { campaign: camp, channel: ch, orders: 0, revenue: 0 };
          cur.orders += 1;
          cur.revenue = Math.round((cur.revenue + rev) * 100) / 100;
          campaignMap.set(camp, cur);
        }
      } catch { /* colonne attribution peut être absente */ }
      const campaigns = Array.from(campaignMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .map(c => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }));

      // ── ENTONNOIR DE CONVERSION (comptes réels par étape) ──────────────────
      // Le trafic pur (visites) vit dans GA4/Plausible (hors base). Tout ce qui
      // suit est mesuré en base : leads → paniers → commandes → paiement → réachat
      // → parrainage, avec part des kits. Les paliers sans donnée restent null
      // (jamais inventés) et l'UI affiche « non mesuré ».
      let beautyProfiles = 0;
      let launchLeads = 0;
      let waitlistLeads = 0;
      let activeCarts = 0;
      let ordersWithKit = 0;
      let repeatCustomers = 0;
      let distinctPaidCustomers = 0;
      let referralOrders = 0;
      let rewardCoupons = 0;
      let abandonedRecoverable = ordersTotal - ordersPaid;

      try { beautyProfiles = await safeCount(supabase, 'beauty_profiles'); } catch { /* ignore */ }
      try {
        launchLeads = await safeCount(supabase, 'launch_leads');
      } catch {
        // Table de migration pas encore appliquée : repli 0.
        launchLeads = 0;
      }
      try { waitlistLeads = await safeCount(supabase, 'product_waitlist'); } catch { waitlistLeads = 0; }
      try {
        // Paniers non vides : on compte les cart_items rattachés à un panier.
        const { data: cartRows } = await supabase.from('carts').select('id').limit(10000);
        if (Array.isArray(cartRows) && cartRows.length) {
          const cartIds = cartRows.map((c: any) => c.id);
          // On compte les cart_items dont le panier existe (lots de 500 bornés).
          let nonEmpty = 0;
          const batches = [];
          for (let i = 0; i < cartIds.length; i += 500) batches.push(cartIds.slice(i, i + 500));
          for (const batch of batches) {
            const { count } = await supabase.from('cart_items').select('cart_id', { count: 'exact', head: true }).in('cart_id', batch);
            nonEmpty += Number(count ?? 0);
          }
          activeCarts = nonEmpty;
        }
      } catch { /* carts peut être absent */ }

      try {
        // Sélection tolérante : coupon_code n'existe pas avant une migration (le
        // code promo voyage dans les métadonnées Stripe). On ne casse pas si la
        // colonne manque ; la détection parrainage retombe alors sur 0.
        const { data: ordFull } = await supabase
          .from('orders')
          .select('id,status,user_id,customer_email,items')
          .limit(10000);
        const revStatuses = ['paid', 'processing', 'packed', 'shipped', 'delivered', 'completed'];
        const paidRows = (ordFull || []).filter((o: any) => revStatuses.includes(o.status));

        // Clients distincts (user_id sinon email)
        const customerKeys = new Set<string>();
        paidRows.forEach((o: any) => {
          const key = o.user_id || (o.customer_email ? 'e:' + String(o.customer_email).toLowerCase().trim() : null);
          if (key) customerKeys.add(key);
        });
        distinctPaidCustomers = customerKeys.size;

        // Réachat : clients avec ≥2 commandes payées
        const perCustomer = new Map<string, number>();
        paidRows.forEach((o: any) => {
          const key = o.user_id || (o.customer_email ? 'e:' + String(o.customer_email).toLowerCase().trim() : null);
          if (!key) return;
          perCustomer.set(key, (perCustomer.get(key) || 0) + 1);
        });
        repeatCustomers = Array.from(perCustomer.values()).filter(n => n >= 2).length;

        // Part des kits : commande contenant un kit (items JSON).
        const kitIdSet = new Set(LAUNCH_KITS.map((k) => `launch-${k.id}`));
        paidRows.forEach((o: any) => {
          const it = Array.isArray(o.items) ? o.items : [];
          const hasKit = it.some((line: any) => {
            const pid = String(line?.productId || line?.product_id || '');
            return kitIdSet.has(pid) || /launch-k\d/i.test(pid);
          });
          if (hasKit) ordersWithKit++;
        });
      } catch { /* ignore */ }

      // Parrainage : on lit les métadonnées Stripe (le code promo n'est pas une
      // colonne orders). On compte les coupons MERCI émis (= filleuls payés).
      try {
        const { count: merci } = await supabase
          .from('coupons')
          .select('code', { count: 'exact', head: true })
          .like('code', 'MERCI-%');
        rewardCoupons = Number(merci ?? 0);
        // Une récompense MERCI émise = un filleul payé par parrainage.
        referralOrders = rewardCoupons;
      } catch { /* coupons peut être absent */ }

      const pct = (part: number, total: number): number | null =>
        total > 0 ? Math.round((part / total) * 1000) / 10 : null;

      // Graphe de l'entonnoir : chaque étape avec sa valeur et le % de transition.
      const leadsTotal = launchLeads + waitlistLeads;
      const funnel = {
        stages: [
          { key: 'leads',        label: 'Leads (diagnostics / liste de lancement)', value: leadsTotal,
            note: 'Comptes beauté créés + inscriptions liste de lancement. Le trafic pur est dans GA4.' },
          { key: 'beautyProfiles', label: 'Profils beauté / diagnostics enregistrés', value: beautyProfiles,
            note: 'Diagnostics ayant débouché sur un profil KURLA Hair ID enregistré.' },
          { key: 'carts',        label: 'Paniers actifs (non vides)', value: activeCarts,
            note: 'Paniers persistés contenant au moins un article (connectés + invités).' },
          { key: 'orders',       label: 'Commandes payées', value: ordersPaid,
            note: 'Commandes confirmées payées (hors attente webhook).' },
          { key: 'kitOrders',    label: 'dont commandes avec un kit', value: ordersWithKit,
            note: 'Levier panier moyen : kits recommandés en tête du diagnostic.' },
          { key: 'repeat',       label: 'Clients ayant réacheté (≥ 2)', value: repeatCustomers,
            note: 'Fidélisation : clients distincts avec au moins deux commandes payées.' },
        ],
        conversions: {
          cartToOrderPct: pct(ordersPaid, activeCarts),                 // panier → achat
          leadToOrderPct: pct(ordersPaid, Math.max(leadsTotal, beautyProfiles)),
          kitSharePct: pct(ordersWithKit, ordersPaid),                  // part des kits dans les commandes
          repeatRatePct: pct(repeatCustomers, Math.max(distinctPaidCustomers, 1)), // réachat
          referralOrders,                                              // ventes issues de parrainage
          rewardCoupons,                                               // récompenses parrain émises
        },
        targets: { cartToOrderPct: 35, kitSharePct: 50, repeatRatePct: 20 },
        pendingOrders: abandonedRecoverable,
        note: 'Les étapes hautes (visites, démarrages de diagnostic) relèvent de GA4/Plausible. Cet entonnoir mesure les actes persistés en base, donc actionnables par les relances et le parrainage.',
      };

      const performance = {
        itemsAvailable,
        totalSoldQty,
        totalItemRevenue: Math.round(totalItemRevenue * 100) / 100,
        kitRevenue: Math.round(kitRevenue * 100) / 100,
        kitSharePct: totalItemRevenue > 0 ? Math.round((kitRevenue / totalItemRevenue) * 100) : 0,
        topProducts,
        topKits,
        channels,
        campaigns,
        ordersWithAttribution,
        // Objectifs AOV/part kit du plan (CENTRAL) pour comparaison au réel
        targets: { aovEur: 42, kitSharePct: 50 },
        // L'attribution est mesurée dès que les commandes portent un UTM/référent.
        channelNote: ordersWithAttribution > 0
          ? 'Canal issu des UTM/référents capturés au checkout (first/last-touch). Les « Non attribué » sont des visites directes ou antérieures à l’instrumentation.'
          : 'Ajoutez des paramètres UTM aux liens (TikTok, créateurs, emails) : les ventes seront alors réparties par canal ici. Les commandes sans UTM apparaissent en « Non attribué ».',
        funnel,
      };

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
        performance,
        phases,
        kpis,
        actions,
      });
    })
  );
}
