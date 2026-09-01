import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, ShoppingBag } from 'lucide-react';
import { analytics } from '../lib/analytics';

interface OrderConfirmationPageProps {
  sessionId?: string;
  orderId?: string;
}

interface CheckoutStatus {
  order?: { id: string; total: number; status: string; createdAt: string };
  checkout?: { paymentStatus: string | null; status: string | null };
  error?: string;
}

const statusCopy: Record<string, { title: string; message: string; tone: 'success' | 'pending' | 'error' }> = {
  paid: {
    title: 'Paiement confirmé',
    message: 'Votre commande est confirmée. Vous recevrez les prochaines informations par email.',
    tone: 'success'
  },
  payment_pending_webhook: {
    title: 'Paiement en cours de confirmation',
    message: 'Votre paiement a été transmis. Nous finalisons la confirmation de la commande.',
    tone: 'pending'
  },
  payment_failed: {
    title: 'Paiement non confirmé',
    message: 'La commande n’a pas été confirmée. Aucun email de confirmation définitive ne doit être considéré comme envoyé.',
    tone: 'error'
  }
};

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({ sessionId, orderId }) => {
  const [result, setResult] = useState<CheckoutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!sessionId) {
      setRequestError('La session de paiement est absente ou invalide.');
      setLoading(false);
      return () => { cancelled = true; };
    }

    const loadStatus = async () => {
      try {
        const params = new URLSearchParams({ session_id: sessionId });
        if (orderId) params.set('order_id', orderId);
        const response = await fetch(`/api/stripe/checkout-session?${params.toString()}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Impossible de vérifier la commande.');
        if (!cancelled) setResult(data);
      } catch (error: any) {
        if (!cancelled) setRequestError(error?.message || 'Impossible de vérifier la commande.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStatus();
    return () => { cancelled = true; };
  }, [sessionId, orderId]);

  const orderStatus = result?.order?.status || '';

  // Conversion confirmée → événement purchase (GA4/Plausible), une seule fois.
  useEffect(() => {
    const order = result?.order;
    const paid = ['paid', 'processing', 'packed', 'shipped', 'delivered'].includes(order?.status || '');
    if (order && paid) {
      const key = `kurla_purchase_${order.id}`;
      try {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          analytics.purchase(order.id, Number(order.total) || undefined);
        }
      } catch { /* noop */ }
    }
  }, [result]);

  const copy = statusCopy[orderStatus] || {
    title: 'Commande reçue',
    message: 'Nous vérifions encore le statut de votre paiement. Cette page peut être actualisée dans quelques instants.',
    tone: 'pending' as const
  };

  return (
    <main className="min-h-screen pt-32 pb-24 bg-[#FFFDF9] text-[#111111] flex items-center">
      <div className="max-w-xl mx-auto w-full px-4">
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#E8E1DA] shadow-xl text-center">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center border ${
            copy.tone === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
            copy.tone === 'error' ? 'bg-rose-50 border-rose-200 text-rose-600' :
            'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : copy.tone === 'success' ? <CheckCircle2 className="w-8 h-8" /> : copy.tone === 'error' ? <AlertTriangle className="w-8 h-8" /> : <Clock3 className="w-8 h-8" />}
          </div>

          <span className="mt-6 block text-xs uppercase tracking-widest text-[#C8753D] font-bold">KURLA Beauty</span>
          <h1 className="mt-2 text-3xl font-serif-title font-bold">{loading ? 'Vérification du paiement…' : requestError ? 'Vérification impossible' : copy.title}</h1>
          <p className="mt-3 text-sm text-[#111111]/70 leading-relaxed">{requestError || copy.message}</p>

          {result?.order && !requestError && (
            <div className="mt-6 p-4 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] text-left text-sm space-y-2">
              <div className="flex items-center justify-between gap-4"><span className="text-[#111111]/60">Commande</span><strong>{result.order.id}</strong></div>
              <div className="flex items-center justify-between gap-4"><span className="text-[#111111]/60">Montant</span><strong>{Number(result.order.total).toFixed(2)} €</strong></div>
              <div className="flex items-center justify-between gap-4"><span className="text-[#111111]/60">Statut</span><strong className="capitalize">{result.order.status.replaceAll('_', ' ')}</strong></div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <a href="/boutique" className="px-5 py-3 rounded-full bg-[#111111] text-white text-xs font-semibold inline-flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Retour à la boutique
            </a>
            <a href={`/suivi-commande?order=${encodeURIComponent(result.order.id)}`} className="px-5 py-3 rounded-full bg-[#C8753D] text-white text-xs font-semibold">
              Suivre ma commande
            </a>
            <a href="/account" className="px-5 py-3 rounded-full border border-[#C8753D] text-[#C8753D] text-xs font-semibold">
              Mon espace client
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};
