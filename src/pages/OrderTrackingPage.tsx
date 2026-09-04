import React, { useEffect, useState } from 'react';
import { Loader2, Package, Search, CheckCircle2, Clock3, XCircle, Truck, MapPin, ShoppingBag, RotateCcw, Box } from 'lucide-react';
import { DISPATCH_LEGAL, DISPATCH_SENTENCE, DISPATCH_SHORT } from '../lib/preorderPromise';

interface TrackItem {
  name: string;
  slug?: string;
  quantity: number;
  amount?: number;
  isPreorder?: boolean;
}

interface TrackOrder {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: TrackItem[];
  shippingCost: number | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDelivery: string | null;
}

interface TimelineStep {
  status: string;
  at: string;
  reason: string | null;
}

const STATUS_FLOW: Array<{ key: string; label: string; desc: string; icon: React.ReactNode }> = [
  { key: 'paid', label: 'Paiement confirmé', desc: 'Ta commande est validée', icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: 'processing', label: 'En préparation', desc: 'Ton colis est préparé par l’équipe', icon: <Box className="w-4 h-4" /> },
  { key: 'packed', label: 'Emballé', desc: 'Colis prêt à être remis au transporteur', icon: <Package className="w-4 h-4" /> },
  { key: 'shipped', label: 'Expédié', desc: 'En route vers toi', icon: <Truck className="w-4 h-4" /> },
  { key: 'delivered', label: 'Livré', desc: 'Commande reçue', icon: <MapPin className="w-4 h-4" /> }
];

const STATUS_LABEL: Record<string, string> = {
  paid: 'Paiement confirmé',
  processing: 'En préparation',
  packed: 'Emballé',
  shipped: 'Expédié',
  delivered: 'Livré',
  cancelled: 'Commande annulée',
  payment_failed: 'Paiement non confirmé',
  payment_pending_webhook: 'Paiement en cours de confirmation',
  pending_payment: 'En attente de paiement',
  refunded: 'Remboursée',
  partially_refunded: 'Partiellement remboursée',
  returned: 'Retournée',
  return_requested: 'Retour demandé'
};

function currentStepIndex(status: string): number {
  const idx = STATUS_FLOW.findIndex(s => s.key === status);
  return idx;
}

function formatMoney(amount: number): string {
  return `${(amount ?? 0).toFixed(2).replace('.', ',')} €`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const OrderTrackingPage: React.FC<{ orderId?: string }> = ({ orderId }) => {
  const [orderInput, setOrderInput] = useState(orderId || '');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const track = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const id = orderInput.trim().toUpperCase();
    const mail = email.trim();
    if (!id || !mail) {
      setError('Renseigne ton numéro de commande et l’email utilisé.');
      return;
    }
    setLoading(true);
    setError(null);
    setSubmitted(true);
    try {
      const params = new URLSearchParams({ order: id, email: mail });
      const res = await fetch(`/api/orders/track?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Suivi indisponible.');
      setOrder(data.order);
      setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
    } catch (err: any) {
      setOrder(null);
      setError(err?.message || 'Impossible de trouver cette commande.');
    } finally {
      setLoading(false);
    }
  };

  // Si un numéro est fourni via l'URL, pré-remplir sans lancer (l'email reste requis).
  useEffect(() => {
    if (orderId) setOrderInput(orderId);
  }, [orderId]);

  const hasPreorder = order?.items?.some(i => i.isPreorder);
  const stepIdx = order ? currentStepIndex(order.status) : -1;
  const isProblem = order && ['cancelled', 'payment_failed', 'refunded'].includes(order.status);

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif-title font-bold text-[#111111]">Suivre ma commande</h1>
          <p className="text-sm text-[#111111]/60 mt-2">Entre ton numéro de commande (commence par <span className="font-mono font-semibold">ORD-…</span>) et l’email utilisé lors de l’achat.</p>
        </div>

        <form onSubmit={track} className="bg-white rounded-2xl border border-[#E8E1DA] p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">Numéro de commande</label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#111111]/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={orderInput}
                onChange={e => setOrderInput(e.target.value)}
                placeholder="ORD-XXXXXXXX"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E1DA] text-sm font-mono focus:outline-none focus:border-[#C8753D] uppercase"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">Email de la commande</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton.email@exemple.com"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]"
            />
          </div>
          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            {loading ? 'Recherche…' : 'Suivre ma commande'}
          </button>
        </form>

        {order && (
          <div className="mt-6 space-y-4">
            {/* En-tête + statut */}
            <div className="bg-white rounded-2xl border border-[#E8E1DA] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-[#111111]/50">Commande</p>
                  <p className="font-mono font-bold text-[#111111]">{order.id}</p>
                  <p className="text-xs text-[#111111]/50 mt-1">Passée le {formatDate(order.createdAt)}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  isProblem ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-[#C8753D]/10 text-[#C8753D] border border-[#C8753D]/25'
                }`}>
                  {isProblem ? <XCircle className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>

              {hasPreorder && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                  <Clock3 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-800">
                    Cette commande contient une ou plusieurs <strong>précommandes</strong>. {DISPATCH_SENTENCE} Tu seras notifié(e) par email dès l’expédition, avec le numéro de suivi. {DISPATCH_LEGAL}
                  </p>
                </div>
              )}

              {order.status === 'payment_pending_webhook' && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <Clock3 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">Ton paiement est en cours de confirmation. Cette page se mettra à jour automatiquement dans quelques instants.</p>
                </div>
              )}
            </div>

            {/* Frise de progression */}
            {stepIdx >= 0 && !isProblem && (
              <div className="bg-white rounded-2xl border border-[#E8E1DA] p-5 shadow-sm">
                <h2 className="text-sm font-bold text-[#111111] mb-5">Progression de la commande</h2>
                <ol className="relative space-y-6">
                  {STATUS_FLOW.map((step, i) => {
                    const done = i <= stepIdx;
                    const current = i === stepIdx;
                    return (
                      <li key={step.key} className="flex gap-3 relative">
                        {i < STATUS_FLOW.length - 1 && (
                          <span className={`absolute left-[15px] top-8 w-0.5 h-6 ${i < stepIdx ? 'bg-[#C8753D]' : 'bg-[#E8E1DA]'}`} />
                        )}
                        <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          done ? 'bg-[#C8753D] text-white' : 'bg-[#F2EDE7] text-[#111111]/30'
                        } ${current ? 'ring-4 ring-[#C8753D]/20' : ''}`}>
                          {done ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                        </span>
                        <div className="pt-1">
                          <p className={`text-sm font-semibold ${done ? 'text-[#111111]' : 'text-[#111111]/40'}`}>{step.label}</p>
                          <p className="text-xs text-[#111111]/50">{step.desc}</p>
                          {current && i === 0 && <p className="text-[11px] text-[#C8753D] mt-0.5">{formatDateTime(order.createdAt)}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* Suivi transporteur */}
            {order.status === 'shipped' && (
              <div className="bg-white rounded-2xl border border-[#E8E1DA] p-5 shadow-sm">
                <h2 className="text-sm font-bold text-[#111111] mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-[#C8753D]" /> Expédition</h2>
                {order.carrier && <p className="text-xs text-[#111111]/70 mb-1">Transporteur : <strong>{order.carrier}</strong></p>}
                {order.trackingNumber && (
                  <p className="text-xs text-[#111111]/70 mb-2">Numéro de suivi : <span className="font-mono font-semibold">{order.trackingNumber}</span></p>
                )}
                {order.trackingUrl ? (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8753D] hover:underline">
                    Suivre le colis sur le site du transporteur ↗
                  </a>
                ) : (
                  <p className="text-xs text-[#111111]/50">Le lien de suivi sera disponible dès la prise en charge par le transporteur.</p>
                )}
              </div>
            )}

            {/* Articles */}
            <div className="bg-white rounded-2xl border border-[#E8E1DA] p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#111111] mb-3 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-[#C8753D]" /> Articles ({order.items.reduce((n, i) => n + (i.quantity || 1), 0)})</h2>
              <ul className="divide-y divide-[#F2EDE7]">
                {order.items.map((item, i) => (
                  <li key={i} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-[#111111] truncate">
                        {item.slug ? <a href={`/produit/${item.slug}`} className="hover:underline">{item.name}</a> : item.name}
                      </p>
                      <p className="text-[11px] text-[#111111]/50">Qté {item.quantity}{item.isPreorder ? ' · Précommande' : ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#111111] shrink-0">{item.amount != null ? formatMoney(item.amount) : ''}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[#F2EDE7] mt-2 pt-3 flex justify-between text-sm">
                <span className="text-[#111111]/60">Total</span>
                <span className="font-bold text-[#111111]">{formatMoney(order.total)}</span>
              </div>
            </div>

            {/* Retour / aide */}
            <div className="bg-white rounded-2xl border border-[#E8E1DA] p-4 shadow-sm flex items-start gap-2">
              <RotateCcw className="w-4 h-4 text-[#111111]/40 mt-0.5 shrink-0" />
              <p className="text-xs text-[#111111]/60">
                Un souci avec ta commande ? Tu disposes de 30 jours pour retourner un article. Écris-nous et joins ton numéro <span className="font-mono">{order.id}</span>.
              </p>
            </div>
          </div>
        )}

        {submitted && !order && !loading && !error && null}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
