import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Play, TriangleAlert } from 'lucide-react';

/**
 * JONCTION COMMANDE → ROUTEUR — vue admin.
 *
 * La question à réponse immédiate : « QUI est responsable de l'expédition de
 * cette commande ? ». Les routes sont figées au paiement ; les commandes
 * payées avant la jonction (ou dont le figeage a échoué) apparaissent en
 * « à router » avec un bouton explicite — rien n'est deviné.
 */

const MODEL_LABELS: Record<string, string> = {
  dropshipping: 'Dropshipping',
  affiliation: 'Affiliation',
  '3pl': '3PL',
  stock_kurla: 'Stock KURLA',
  other: 'Autre',
};

export const OrderFulfillmentPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const response = await fetch('/api/admin/order-routes', { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Routes indisponibles.');
      setData(body);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement.');
    }
  };

  useEffect(() => {
    load();
  }, [headers]);

  const byOrder = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const route of data?.routes || []) {
      const key = String(route.order_id);
      groups.set(key, [...(groups.get(key) || []), route]);
    }
    return Array.from(groups.entries());
  }, [data]);

  const freeze = async (orderId: string) => {
    setBusy(orderId);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/order-routes/${orderId}/freeze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Figeage impossible.');
      setMessage(body.alreadyFrozen
        ? `Commande ${orderId} déjà routée.`
        : `Commande ${orderId} : ${body.frozen} ligne(s) routée(s)${body.blocked ? ' — BLOQUÉ, source absente ou indisponible' : ''}.`);
      await load();
    } catch (e: any) {
      setMessage(`Échec : ${e.message || 'erreur inconnue'}`);
    } finally {
      setBusy(null);
    }
  };

  if (error) return <div className="p-6 rounded-3xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;
  if (!data) return <div className="p-6 rounded-3xl bg-espresso border border-kurla-cream/10 text-xs text-kurla-cream/60">Chargement des routes…</div>;

  return (
    <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
      <h3 className="font-bold flex items-center gap-2"><Truck className="w-4 h-4 text-kurla-amber" /> Fulfillment — qui expédie ?</h3>

      {data.pendingRouting.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 space-y-2">
          <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1"><TriangleAlert className="w-3 h-3" /> {data.pendingRouting.length} commande(s) payée(s) non routée(s)</p>
          {data.pendingRouting.map((pending: any) => (
            <div key={pending.orderId} className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-semibold">{pending.orderId}</span>
              <span className="text-kurla-cream/55">{Number(pending.total || 0).toFixed(2).replace('.', ',')} €</span>
              <button type="button" onClick={() => freeze(pending.orderId)} disabled={busy === pending.orderId} className="px-2 py-0.5 rounded-lg bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-copper text-[9px] font-bold hover:bg-kurla-copper/25 disabled:opacity-40 flex items-center gap-1">
                <Play className="w-2.5 h-2.5" /> {busy === pending.orderId ? 'Routage…' : 'Router'}
              </button>
            </div>
          ))}
        </div>
      )}

      {message && <p className="text-[11px] text-kurla-cream/75">{message}</p>}

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {byOrder.map(([orderId, routes]) => {
          const blocked = routes.filter((r: any) => r.blockers);
          return (
            <div key={orderId} className={`px-3 py-2 rounded-xl border ${blocked.length > 0 ? 'bg-rose-950/20 border-rose-400/25' : 'bg-kurla-ink border-kurla-cream/5'}`}>
              <p className="text-[11px] font-bold">
                Commande {orderId}
                {blocked.length > 0 && <span className="ml-2 text-rose-300">⛔ {blocked.length} ligne(s) bloquée(s)</span>}
              </p>
              {routes.map((route: any, index: number) => (
                <p key={index} className="text-[11px] text-kurla-cream/70 mt-0.5">
                  · {route.product_name || route.product_id} ×{route.quantity} → <span className="font-bold text-kurla-cream">{route.responsible}</span>
                  {route.model && <span className="text-kurla-copper"> ({MODEL_LABELS[route.model] || route.model})</span>}
                  {route.lead_time_days != null && <span className="text-kurla-cream/45"> · {route.lead_time_days} j</span>}
                  {route.ships_from && <span className="text-kurla-cream/45"> · depuis {route.ships_from}</span>}
                  {route.blockers && <span className="text-rose-300"> — {route.blockers}</span>}
                </p>
              ))}
            </div>
          );
        })}
        {byOrder.length === 0 && data.pendingRouting.length === 0 && <p className="text-[11px] text-kurla-cream/45">Aucune commande payée à router.</p>}
      </div>
      <p className="text-[10px] text-kurla-cream/45">Les routes sont figées au paiement (snapshot) : changer la source d'un produit ensuite ne réécrit pas l'histoire des commandes.</p>
    </div>
  );
};
