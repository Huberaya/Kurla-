import React, { useEffect, useState } from 'react';
import { Shield, Users, ShoppingBag, Sparkles, Lock, LogOut, CheckCircle2, RotateCcw, MessageSquare, AlertTriangle, TrendingUp, DollarSign, Package, Clock, RefreshCw, Send, Check, X, Truck, Gauge, Boxes, LayoutDashboard, BarChart3, Store, Settings, Target, ListChecks, Factory, MailWarning, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CatalogAdminPanel } from '../components/CatalogAdminPanel';
import { SupplierAdminPanel } from '../components/SupplierAdminPanel';
import { FulfillmentContactPanel } from '../components/FulfillmentContactPanel';
import { TamponOrderPanel } from '../components/TamponOrderPanel';
import { SourcingProspectsPanel } from '../components/SourcingProspectsPanel';
import { SourcingCountryStrategyPanel } from '../components/SourcingCountryStrategyPanel';
import { ProductSupplierPanel } from '../components/ProductSupplierPanel';
import { OperationsCockpitPanel } from '../components/OperationsCockpitPanel';
import { BatchAdminPanel } from '../components/BatchAdminPanel';
import { AdminOperationsPanel } from '../components/AdminOperationsPanel';
import { StrategyCockpitPanel } from '../components/StrategyCockpitPanel';
import { GrowthControlCenterPanel } from '../components/GrowthControlCenterPanel';
import { DropshipGuidePanel } from '../components/DropshipGuidePanel';
import { KittingAdminPanel } from '../components/KittingAdminPanel';
import { PeauSourcingCahierPanel } from '../components/PeauSourcingCahierPanel';
import { PeauKitsCoutServiPanel } from '../components/PeauKitsCoutServiPanel';
import { PeauDemandStockGapPanel } from '../components/PeauDemandStockGapPanel';
import { PeauGatesCockpitPanel } from '../components/PeauGatesCockpitPanel';
import { PeauCatalogPublishPanel } from '../components/PeauCatalogPublishPanel';
import { PeauQAFatouC21Panel } from '../components/PeauQAFatouC21Panel';
import { PeauJ0MailTrackingPanel } from '../components/PeauJ0MailTrackingPanel';
import { PeauJ3J7WhitecastLotPanel } from '../components/PeauJ3J7WhitecastLotPanel';
import { PeauFacturationSuiviPanel } from '../components/PeauFacturationSuiviPanel';
import { PeauGoLiveC24Panel } from '../components/PeauGoLiveC24Panel';
import { PeauC25ToutPanel } from '../components/PeauC25ToutPanel';
import { PeauC26FinalPanel } from '../components/PeauC26FinalPanel';
import { PeauC27ScalePanel } from '../components/PeauC27ScalePanel';
import { PeauC28ToutPanel } from '../components/PeauC28ToutPanel';
import { ConversionFunnelPanel } from '../components/ConversionFunnelPanel';

type AdminWorkspace = 'skin' | 'hair';
type AdminTab = 'analytics' | 'strategy' | 'growth' | 'cockpit' | 'orders' | 'returns' | 'support' | 'pros' | 'catalog' | 'suppliers' | 'batches' | 'operations' | 'demand' | 'guide_dropship' | 'skin_overview' | 'skin_readiness' | 'skin_catalog' | 'skin_sourcing' | 'skin_batches' | 'skin_demand' | 'skin_pros';

const initialAdminWorkspace = (): AdminWorkspace | null => {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('base');
  return value === 'skin' || value === 'hair' ? value : null;
};

const KpiCell: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({ label, value, hint, tone = 'text-kurla-cream' }) => (
  <div className="p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-1">
    <span className="text-[11px] uppercase tracking-wider text-kurla-cream/50 block">{label}</span>
    <strong className={`text-xl font-bold block ${tone}`}>{value}</strong>
    {hint && <span className="text-[10px] text-kurla-cream/40 block leading-snug">{hint}</span>}
  </div>
);

export const AdminDashboardPage: React.FC = () => {
  const { user, profile, session, signOut } = useAuth();
  const isAuthenticated = Boolean(
    user && session?.access_token && profile && ['admin', 'superadmin'].includes(profile.role)
  );
  
  /**
   * Santé de la livraison des e-mails, affichée quel que soit l'onglet.
   *
   * Une clé d'API invalide ne casse aucune page : les commandes sont
   * enregistrées, les paiements encaissés, et la confirmation ne part jamais.
   * Sans bandeau, la panne n'existe pour personne. Il est donc placé sur le
   * tableau de bord, là où l'administration arrive en premier — pas dans un
   * onglet secondaire qu'il faudrait savoir ouvrir.
   */
  const [emailHealth, setEmailHealth] = useState<{
    provider: string;
    isRealProvider: boolean;
    counts: { sent: number; failed: number; logged: number; total: number };
    outage: boolean;
    lastError: string | null;
    lastAttemptAt: string | null;
    from?: string | null;
    cause?: string | null;
    what?: string | null;
    fix?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/admin/email-health', { headers: adminHeaders });
        if (!response.ok) return;
        if (!cancelled) setEmailHealth(await response.json());
      } catch {
        // Un bandeau de santé qui échoue ne doit jamais bloquer le tableau de bord.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const [workspace, setWorkspace] = useState<AdminWorkspace | null>(initialAdminWorkspace);
  const [activeTab, setActiveTab] = useState<AdminTab>(() => initialAdminWorkspace() === 'skin' ? 'skin_overview' : 'analytics');

  const selectWorkspace = (next: AdminWorkspace) => {
    setWorkspace(next);
    setActiveTab(next === 'skin' ? 'skin_overview' : 'analytics');
    setProsFilter(next === 'skin' ? 'peau' : 'all');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('base', next);
      window.history.replaceState({}, '', url.toString());
    }
  };
  
  const [metrics, setMetrics] = useState<any>(null);
  // CAC : dépenses d'acquisition cumulées, saisies par l'admin (aucune valeur
  // inventée). Persistées localement sur le poste d'administration ; le CAC
  // affiché = dépenses saisies / clients uniques ayant commandé.
  const [adSpend, setAdSpend] = useState<string>(() => {
    try { return localStorage.getItem('kurla_admin_ad_spend') || ''; } catch { return ''; }
  });
  const adSpendValue = Number(adSpend.replace(',', '.'));
  const cacValue = Number.isFinite(adSpendValue) && adSpendValue > 0 && metrics?.uniqueCustomers > 0
    ? adSpendValue / metrics.uniqueCustomers
    : null;
  const handleAdSpendChange = (value: string) => {
    setAdSpend(value);
    try { localStorage.setItem('kurla_admin_ad_spend', value); } catch { /* noop */ }
  };
  const [adminDashboard, setAdminDashboard] = useState<any>(null);
  const [serverOrders, setServerOrders] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [returnHistories, setReturnHistories] = useState<Record<string, any[]>>({});
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [professionalApplications, setProfessionalApplications] = useState<any[]>([]);
  const [professionalStatusDrafts, setProfessionalStatusDrafts] = useState<Record<string, string>>({});
  const [professionalComments, setProfessionalComments] = useState<Record<string, string>>({});
  const [prosFilter, setProsFilter] = useState<'all' | 'peau' | 'cheveux' | 'pending'>('all');
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [statusUpdateReason, setStatusUpdateReason] = useState('');

  // Expédition (transporteur + n° de suivi) — panneau dédié.
  const [shippingOrder, setShippingOrder] = useState<any>(null);
  const [shippingForm, setShippingForm] = useState({ carrier: 'colissimo', status: 'shipped', trackingNumber: '', trackingUrl: '', estimatedDelivery: '' });
  const [shippingSaving, setShippingSaving] = useState(false);

  // Demande précommandes (sourcing du premier lot).
  const [demand, setDemand] = useState<any>(null);
  const [demandFilter, setDemandFilter] = useState<'all' | 'kits' | 'components'>('components');
  const fetchDemand = () => {
    fetch('/api/admin/preorder-demand', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.products && setDemand(data))
      .catch(err => console.error('Error preorder demand:', err));
  };
  
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [ticketEvents, setTicketEvents] = useState<any[]>([]);
  const [ticketAttachments, setTicketAttachments] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const adminHeaders: HeadersInit = {
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    'Content-Type': 'application/json'
  };

  const loadData = () => {
    setLoading(true);
    // 1. Fetch Analytics Metrics
    fetch('/api/admin/metrics', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.metrics && setMetrics(data.metrics))
      .catch(err => console.error('Error metrics:', err));

    // 2. Fetch the admin-only operational read model
    fetch('/api/admin/dashboard', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.dashboard && setAdminDashboard(data.dashboard))
      .catch(err => console.error('Error admin dashboard:', err));

    // 3. Fetch Orders
    fetch('/api/orders', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.orders && setServerOrders(data.orders))
      .catch(err => console.error('Error orders:', err));

    // 3. Fetch Returns
    fetch('/api/returns', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => {
        if (!data.returns) return;
        setReturnsList(data.returns);
        data.returns.forEach((item: any) => fetch(`/api/returns/${item.id}/history`, { headers: adminHeaders }).then(res => res.json()).then(history => setReturnHistories(prev => ({ ...prev, [item.id]: history.history || [] }))));
      })
      .catch(err => console.error('Error returns:', err));

    // 4. Fetch Support Tickets
    fetch('/api/support/tickets', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.tickets && setSupportTickets(data.tickets))
      .catch(err => console.error('Error tickets:', err));

    // 5b. Demande précommandes (sourcing)
    fetch('/api/admin/preorder-demand', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.products && setDemand(data))
      .catch(err => console.error('Error demand:', err));

    // 6. Fetch persisted KURLA Pro applications
    fetch('/api/admin/professional-applications', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.applications && setProfessionalApplications(data.applications))
      .catch(err => console.error('Error professional applications:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await signOut();
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ status: newStatus, reason: statusUpdateReason || 'Mise à jour par administrateur' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec du changement de statut');
      setActionSuccess(`Statut de la commande #${orderId} mis à jour vers ${newStatus.toUpperCase()}`);
      setStatusUpdateReason('');
      loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        fetchHistory(orderId);
      }
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const fetchHistory = (orderId: string) => {
    fetch(`/api/admin/orders/${orderId}/history`, { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.history && setOrderHistory(data.history));
  };

  // Liens de suivi publics des transporteurs les plus courants (FR).
  const CARRIER_TRACK_URL: Record<string, (n: string) => string> = {
    colissimo: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(n)}`,
    mondial_relay: (n) => `https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition=${encodeURIComponent(n)}`,
    chronopost: (n) => `https://www.chronopost.fr/fr/suivi-colis?${encodeURIComponent(n)}`,
    dhl: (n) => `https://www.dhl.com/fr-fr/home/tracking.html?submit=1&tracking-id=${encodeURIComponent(n)}`
  };
  const CARRIER_LABELS: Record<string, string> = {
    manual: 'Remise en main propre', colissimo: 'Colissimo', mondial_relay: 'Mondial Relay',
    chronopost: 'Chronopost', dhl: 'DHL', autre: 'Autre transporteur'
  };

  const openShippingPanel = async (ord: any) => {
    setShippingOrder(ord);
    // Pré-remplissage si un envoi existe déjà.
    try {
      const res = await fetch(`/api/shipments/${ord.id}`, { headers: adminHeaders });
      if (res.ok) {
        const data = await res.json();
        const sh = data.shipment;
        if (sh) {
          setShippingForm({
            carrier: sh.carrier || 'colissimo',
            status: sh.status === 'delivered' ? 'delivered' : (sh.shippedAt ? 'shipped' : 'label_created'),
            trackingNumber: sh.trackingNumber || '',
            trackingUrl: sh.trackingUrl || '',
            estimatedDelivery: sh.estimatedDelivery ? sh.estimatedDelivery.slice(0, 10) : ''
          });
          return;
        }
      }
    } catch (err) { /* pas d'envoi : formulaire vierge */ }
    setShippingForm({ carrier: 'colissimo', status: 'shipped', trackingNumber: '', trackingUrl: '', estimatedDelivery: '' });
  };

  const handleShipmentSave = async () => {
    if (!shippingOrder) return;
    if (shippingForm.carrier !== 'manual' && shippingForm.carrier !== 'autre' && !shippingForm.trackingNumber.trim()) {
      alert('Renseigne le numéro de suivi du transporteur (ou choisis « Remise en main propre »).');
      return;
    }
    setShippingSaving(true);
    // URL de suivi auto si laissée vide et transporteur connu.
    const autoUrl = !shippingForm.trackingUrl.trim() && CARRIER_TRACK_URL[shippingForm.carrier] && shippingForm.trackingNumber.trim()
      ? CARRIER_TRACK_URL[shippingForm.carrier](shippingForm.trackingNumber.trim())
      : shippingForm.trackingUrl.trim();
    try {
      const res = await fetch(`/api/admin/shipments/${shippingOrder.id}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          carrier: shippingForm.carrier,
          status: shippingForm.status,
          trackingNumber: shippingForm.trackingNumber.trim(),
          trackingUrl: autoUrl,
          estimatedDelivery: shippingForm.estimatedDelivery ? new Date(shippingForm.estimatedDelivery).toISOString() : undefined,
          shippedAt: ['shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(shippingForm.status)
            ? (shippingForm.status === 'delivered' ? undefined : new Date().toISOString()) : undefined,
          deliveredAt: shippingForm.status === 'delivered' ? new Date().toISOString() : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l’enregistrement de l’expédition.');
      setActionSuccess(`Expédition #${shippingOrder.id} enregistrée (${CARRIER_LABELS[shippingForm.carrier] || shippingForm.carrier}, statut commande : ${data.orderStatus}).`);
      setShippingOrder(null);
      loadData();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setShippingSaving(false);
    }
  };

  const handleReturnDecision = async (returnId: string, status: 'approved' | 'rejected', adminComment: string) => {
    try {
      const res = await fetch(`/api/admin/returns/${returnId}/status`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ status, adminComment })
      });
      if (res.ok) {
        setActionSuccess(`Retour #${returnId} ${status === 'approved' ? 'approuvé' : 'rejeté'}.`);
        loadData();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const handleTriggerRefund = async (orderId: string, returnId?: string, amount?: number) => {
    if (!confirm(`Confirmer le remboursement test Stripe de la commande #${orderId} ?`)) return;
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ orderId, returnId, amount, reason: 'Remboursement admin dashboard' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur remboursement');
      setActionSuccess(`Remboursement de ${data.refund.amount} EUR émis pour #${orderId}.`);
      loadData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const loadTicketMessages = (ticket: any) => {
    setSelectedTicket(ticket);
    fetch(`/api/support/tickets/${ticket.id}/messages`, { headers: adminHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.messages) setTicketMessages(data.messages);
        setTicketEvents(Array.isArray(data.events) ? data.events : []);
        setTicketAttachments(Array.isArray(data.attachments) ? data.attachments : []);
      });
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ message: replyText })
      });
      if (res.ok) {
        setReplyText('');
        loadTicketMessages(selectedTicket);
        loadData();
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const handleTicketStatusChange = async (ticketId: string, status: string) => {
    try {
      await fetch(`/api/admin/support/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ status })
      });
      loadData();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const handleTicketPriorityChange = async (ticketId: string, priority: string) => {
    const response = await fetch(`/api/admin/support/tickets/${ticketId}/priority`, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({ priority })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.error || 'Impossible de modifier la priorité.');
      return;
    }
    loadData();
    if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, priority });
  };

  const handleTicketAssignmentChange = async (ticketId: string, assignedAgentId: string) => {
    const response = await fetch(`/api/admin/support/tickets/${ticketId}/assignment`, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({ assignedAgentId: assignedAgentId || null })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.error || 'Impossible d’affecter le ticket.');
      return;
    }
    loadData();
    if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, assignedAgentId: assignedAgentId || undefined });
  };

  const handleProfessionalStatusChange = async (application: any) => {
    const status = professionalStatusDrafts[application.id] || application.status;
    const adminComment = professionalComments[application.id] || '';
    try {
      const response = await fetch(`/api/admin/professional-applications/${application.id}/status`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ status, adminComment })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossible de modifier la candidature.');
      setActionSuccess(`Candidature de ${application.name} mise à jour : ${status === 'under_review' ? 'en examen' : status === 'approved' ? 'approuvée' : status === 'rejected' ? 'refusée' : 'reçue'}.`);
      loadData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-kurla-ink text-kurla-cream flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-kurla-espresso border border-rose-500/30 shadow-2xl space-y-5 text-center">
          <Lock className="w-8 h-8 mx-auto text-rose-400" />
          <h1 className="text-2xl font-serif-title font-bold">Authentification administrateur requise</h1>
          <p className="text-xs text-kurla-cream/60">
            Connectez-vous avec Supabase Auth. Les mots de passe locaux et les clés administrateur partagées sont désactivés.
          </p>
          <a href="/account" className="inline-flex px-5 py-3 rounded-xl bg-kurla-copper text-white text-xs font-bold">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-kurla-ink text-kurla-cream flex items-center">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-[2rem] bg-kurla-espresso border border-kurla-cream/10 shadow-2xl">
            <div className="text-center max-w-2xl mx-auto">
              <Shield className="w-10 h-10 mx-auto text-kurla-copper mb-4" />
              <p className="text-[11px] uppercase tracking-[0.3em] text-kurla-amber font-bold">Espace administration</p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-serif-title font-bold text-kurla-cream">Choisir votre base KURLA</h1>
              <p className="mt-3 text-sm text-kurla-cream/60">Les deux espaces sont séparés : choisissez la ligne métier à piloter.</p>
            </div>
            <div className="mt-10 grid md:grid-cols-2 gap-5">
              <button onClick={() => selectWorkspace('skin')} className="group text-left p-6 rounded-3xl bg-emerald-950/35 border border-emerald-400/25 hover:border-emerald-300/70 hover:bg-emerald-950/55 transition-all">
                <div className="flex items-center justify-between gap-4"><span className="text-2xl">✦</span><span className="px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/25 text-[10px] uppercase tracking-wider text-emerald-200 font-bold">C1 · C5</span></div>
                <h2 className="mt-6 text-2xl font-serif-title font-bold text-emerald-100">KURLA Skin</h2>
                <p className="mt-2 text-sm leading-relaxed text-emerald-100/65">Peau, teint, phototypes, sous-tons, SPF, preuves C1/C5 et sourcing skincare.</p>
                <span className="inline-flex mt-6 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-100 text-xs font-bold group-hover:bg-emerald-500/35">Ouvrir KURLA Skin →</span>
              </button>
              <button onClick={() => selectWorkspace('hair')} className="group text-left p-6 rounded-3xl bg-amber-950/30 border border-kurla-copper/30 hover:border-kurla-amber/75 hover:bg-amber-950/50 transition-all">
                <div className="flex items-center justify-between gap-4"><span className="text-2xl">◒</span><span className="px-2.5 py-1 rounded-full bg-kurla-copper/20 border border-kurla-copper/30 text-[10px] uppercase tracking-wider text-kurla-amber font-bold">Catalogue actuel</span></div>
                <h2 className="mt-6 text-2xl font-serif-title font-bold text-kurla-cream">KURLA Hair</h2>
                <p className="mt-2 text-sm leading-relaxed text-kurla-cream/65">Cheveux, textures, routines, ventes, commandes, stock et opérations commerciales.</p>
                <span className="inline-flex mt-6 px-4 py-2 rounded-xl bg-kurla-copper/25 text-kurla-cream text-xs font-bold group-hover:bg-kurla-copper/45">Ouvrir KURLA Hair →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-kurla-ink text-kurla-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header Bar */}
        <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-kurla-cream flex items-center gap-3">
              <Shield className={`w-7 h-7 ${workspace === 'skin' ? 'text-emerald-300' : 'text-kurla-copper'}`} /> {workspace === 'skin' ? 'KURLA Skin — Administration' : 'KURLA Hair — Administration & Operations'}
            </h1>
            <p className="text-xs text-kurla-cream/60">{workspace === 'skin' ? 'Pilotage séparé peau & teint : preuves C1/C5, catalogue skincare et sourcing.' : 'Supervision des commandes, expéditions, retours, support et métriques cheveux.'}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={() => selectWorkspace('skin')} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-colors ${workspace === 'skin' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50' : 'bg-kurla-ink text-kurla-cream/55 border-kurla-cream/10 hover:border-emerald-400/40'}`}>KURLA SKIN</button>
            <button onClick={() => selectWorkspace('hair')} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-colors ${workspace === 'hair' ? 'bg-kurla-copper/25 text-kurla-cream border-kurla-copper/60' : 'bg-kurla-ink text-kurla-cream/55 border-kurla-cream/10 hover:border-kurla-copper/50'}`}>KURLA HAIR</button>
            <button
              onClick={loadData}
              className="p-2.5 rounded-full bg-kurla-ink hover:bg-kurla-bark text-kurla-amber border border-kurla-copper/30 transition-colors"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> SuperAdmin Connecté
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-kurla-ink hover:bg-kurla-bark text-kurla-cream/70 hover:text-white border border-kurla-cream/10 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" /> {actionSuccess}
          </div>
        )}

        {emailHealth && (emailHealth.outage || !emailHealth.isRealProvider) && (
          <div className="p-4 rounded-2xl bg-[#2A0F0F] border border-red-500/40 flex items-start gap-3 animate-fadeIn">
            <MailWarning className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-red-200">
                Les e-mails ne partent pas — {emailHealth.outage ? 'aucune tentative réussie' : 'fournisseur non configuré'}
              </p>
              {emailHealth.what && (
                <p className="text-xs font-semibold text-red-100">{emailHealth.what}</p>
              )}
              {emailHealth.fix && (
                <p className="text-xs text-red-100/85 leading-relaxed bg-red-950/50 border border-red-500/25 rounded-lg px-2.5 py-2">
                  <span className="font-semibold">Réparation : </span>{emailHealth.fix}
                </p>
              )}
              <p className="text-[11px] text-red-200/70">
                Fournisseur déclaré : <span className="font-mono">{emailHealth.provider || 'aucun'}</span>
                {' · expéditeur : '}
                <span className="font-mono">{emailHealth.from ?? 'non configuré'}</span>
                {emailHealth.counts.total > 0 && <> · {emailHealth.counts.failed} échec(s), {emailHealth.counts.sent} envoi(s) réussi(s) sur {emailHealth.counts.total} tentative(s)</>}
                {emailHealth.lastAttemptAt && <> · dernière tentative le {new Date(emailHealth.lastAttemptAt).toLocaleString('fr-FR')}</>}
              </p>
              {emailHealth.lastError && (
                <p className="text-[11px] font-mono text-red-300/90 break-all">{emailHealth.lastError}</p>
              )}
              <p className="text-[11px] text-red-200/70">
                Les commandes sont encaissées normalement, mais la cliente ne reçoit rien : ni confirmation, ni suivi d’expédition, ni réinitialisation de mot de passe.
              </p>
            </div>
          </div>
        )}

        {/* Navigation — familles fonctionnelles + sous-onglets */}
        {(() => {
          const navGroups = workspace === 'skin' ? [
            {
              id: 'skin-overview', label: 'KURLA Skin', icon: LayoutDashboard,
              tabs: [
                { id: 'skin_overview', label: 'Vue d’ensemble peau', icon: TrendingUp },
                { id: 'skin_readiness', label: 'Gates C1 / C5', icon: Shield },
              ],
            },
            {
              id: 'skin-catalog', label: 'Catalogue Skin', icon: Store,
              tabs: [
                { id: 'skin_catalog', label: 'Fiches peau', icon: Package },
                { id: 'skin_batches', label: 'Kits & lots', icon: Boxes },
              ],
            },
            {
              id: 'skin-supply', label: 'Sourcing Skin', icon: Truck,
              tabs: [
                { id: 'skin_sourcing', label: 'Preuves & fournisseurs', icon: Truck },
                { id: 'skin_demand', label: 'Demande peau', icon: ListChecks, badge: demand?.totals?.firmOrders || undefined },
              ],
            },
            {
              id: 'skin-people', label: 'Professionnels', icon: Users,
              tabs: [
                { id: 'pros', label: 'Professionnels peau', icon: Users },
              ],
            },
          ] : [
            {
              id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard,
              tabs: [
                { id: 'analytics', label: 'Tableau de bord commercial', icon: TrendingUp },
                { id: 'growth', label: '🚀 Growth Command Center', icon: Target },
                { id: 'strategy', label: 'Business Control Center (référentiel)', icon: Target },
              ],
            },
            {
              id: 'sales', label: 'Ventes & Clients', icon: BarChart3,
              tabs: [
                { id: 'orders', label: 'Commandes', icon: ShoppingBag, badge: serverOrders.length },
                { id: 'returns', label: 'Retours & Remboursements', icon: RotateCcw, badge: returnsList.length },
                { id: 'support', label: 'Support Client', icon: MessageSquare, badge: supportTickets.length },
                { id: 'pros', label: 'Certifications Pro', icon: Users },
              ],
            },
            {
              id: 'catalog', label: 'Catalogue & Stock', icon: Store,
              tabs: [
                { id: 'cockpit', label: 'Pilotage catalogue', icon: Gauge },
                { id: 'catalog', label: 'Catalogue produits', icon: Package },
                { id: 'batches', label: 'Lots & traçabilité', icon: Boxes },
                { id: 'guide_dropship', label: 'Guide dropship 0 carton', icon: BookOpen },
              ],
            },
            {
              id: 'supply', label: 'Approvisionnement', icon: Truck,
              tabs: [
                { id: 'demand', label: 'Demande précommandes', icon: ListChecks, badge: demand?.totals?.firmOrders || undefined },
                { id: 'suppliers', label: 'Fournisseurs & sourcing', icon: Truck },
              ],
            },
            {
              id: 'settings', label: 'Gestion & Contenu', icon: Settings,
              tabs: [
                { id: 'operations', label: 'Gestion quotidienne', icon: Shield },
              ],
            },
          ];
          const activeGroup = navGroups.find(g => g.tabs.some(t => t.id === activeTab)) ?? navGroups[0];
          const GroupIcon = activeGroup.icon;

          return (
            <div className="space-y-3">
              {/* Familles */}
              <div className="flex overflow-x-auto gap-2">
                {navGroups.map(group => {
                  const GIcon = group.icon;
                  const isActiveGroup = group.id === activeGroup.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => setActiveTab(group.tabs[0].id as any)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                        isActiveGroup
                          ? 'bg-kurla-copper text-white shadow-lg'
                          : 'bg-transparent text-kurla-cream/55 hover:text-kurla-cream border border-kurla-cream/10 hover:border-kurla-cream/25'
                      }`}
                    >
                      <GIcon className="w-4 h-4" />
                      {group.label}
                    </button>
                  );
                })}
              </div>
              {/* Sous-onglets de la famille active */}
              <div className="flex overflow-x-auto gap-2 border-b border-kurla-cream/10 pb-3">
                <span className="flex items-center gap-1.5 px-3 text-[10px] uppercase tracking-wider text-kurla-amber/80 font-bold whitespace-nowrap">
                  <GroupIcon className="w-3.5 h-3.5" />
                  {activeGroup.label}
                </span>
                {activeGroup.tabs.map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                        active
                          ? 'bg-kurla-espresso text-kurla-cream border border-kurla-copper/60 shadow'
                          : 'bg-transparent text-kurla-cream/60 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                      {typeof tab.badge === 'number' && tab.badge > 0 && (
                        <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-kurla-copper text-white' : 'bg-kurla-cream/10 text-kurla-cream/70'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* KURLA SKIN — espace dédié, séparé du dashboard Hair */}
        {activeTab === 'skin_overview' && workspace === 'skin' && (
          <div className="space-y-8">
            <div className="p-8 rounded-3xl bg-emerald-950/30 border border-emerald-400/20 shadow-xl">
              <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 font-bold">Base KURLA Skin</p>
              <h2 className="mt-2 text-2xl font-serif-title font-bold text-emerald-100">Peau & teint sous gouvernance C1/C5</h2>
              <p className="mt-2 max-w-3xl text-sm text-emerald-100/65">Cet espace ne mélange pas les fiches cheveux. Il centralise les preuves peau, les phototypes, les sous-tons, la photoprotection, les kits et le sourcing skincare.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCell label="Fiches peau" value="—" hint="Lire le rapport C1 pour la valeur réelle" tone="text-emerald-300" />
              <KpiCell label="Ready to buy" value="0 sans preuves" hint="Aucun SKU ne franchit la Truth Layer sans dossier" tone="text-amber-300" />
              <KpiCell label="SPF / C5" value="Contrôlé" hint="Whitecast, IV–VI, sous-tons et lumière visible" tone="text-sky-300" />
              <KpiCell label="Formulations cibles" value="Séparées" hint="Jamais présentées comme du stock" tone="text-violet-300" />
            </div>
            <PeauGatesCockpitPanel headers={adminHeaders} />
          </div>
        )}

        {activeTab === 'skin_readiness' && workspace === 'skin' && (
          <div className="space-y-10">
            <PeauGatesCockpitPanel headers={adminHeaders} />
            <PeauQAFatouC21Panel headers={adminHeaders} />
            <PeauFacturationSuiviPanel headers={adminHeaders} />
            <PeauGoLiveC24Panel headers={adminHeaders} />
            <PeauC25ToutPanel headers={adminHeaders} />
            <PeauC26FinalPanel headers={adminHeaders} />
            <PeauC27ScalePanel headers={adminHeaders} />
            <PeauC28ToutPanel headers={adminHeaders} />
          </div>
        )}

        {activeTab === 'skin_catalog' && workspace === 'skin' && (
          <div className="space-y-10">
            <PeauCatalogPublishPanel headers={adminHeaders} onSuccess={(m)=>{ setActionSuccess(m); setTimeout(()=>setActionSuccess(''),4000); }} />
            <CatalogAdminPanel
              scope="skin"
              headers={adminHeaders}
              onSuccess={(message) => { setActionSuccess(message); loadData(); setTimeout(() => setActionSuccess(''), 4000); }}
              onOpenGuide={() => setActiveTab('skin_sourcing')}
            />
          </div>
        )}

        {activeTab === 'skin_sourcing' && workspace === 'skin' && (
          <div className="space-y-10">
            <PeauSourcingCahierPanel />
            <PeauJ0MailTrackingPanel headers={adminHeaders} />
            <PeauJ3J7WhitecastLotPanel headers={adminHeaders} />
            <SourcingCountryStrategyPanel headers={adminHeaders} />
            <ProductSupplierPanel headers={adminHeaders} onSuccess={(message) => { setActionSuccess(message); setTimeout(() => setActionSuccess(''), 5000); }} />
            <SupplierAdminPanel headers={adminHeaders} onSuccess={(message) => { setActionSuccess(message); setTimeout(() => setActionSuccess(''), 5000); }} />
          </div>
        )}

        {activeTab === 'skin_batches' && workspace === 'skin' && (
          <div className="space-y-10">
            <PeauKitsCoutServiPanel headers={adminHeaders} />
            <KittingAdminPanel />
            <BatchAdminPanel headers={adminHeaders} onSuccess={(message) => { setActionSuccess(message); loadData(); setTimeout(() => setActionSuccess(''), 5000); }} />
          </div>
        )}

        {/* TAB 1: COMMERCIAL DASHBOARD ANALYTICS */}
        {activeTab === 'analytics' && workspace === 'hair' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-kurla-amber">
                  <span className="text-xs font-semibold">Chiffre d'Affaires Test</span>
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-kurla-cream block">
                  {metrics ? `${metrics.revenueTest.toFixed(2)} €` : '—'}
                </span>
                <span className="text-[11px] text-kurla-cream/50 block">Commandes réglées, moins les remboursements persistés</span>
              </div>

              <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-semibold">Panier Moyen (AOV)</span>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-kurla-cream block">
                  {metrics ? `${metrics.avgOrderValue.toFixed(2)} €` : '—'}
                </span>
                <span className="text-[11px] text-kurla-cream/50 block">Valeur moyenne par commande payée</span>
              </div>

              <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-semibold">Commandes Totales</span>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-kurla-cream block">
                  {metrics ? metrics.totalOrders : '—'}
                </span>
                <span className="text-[11px] text-kurla-cream/50 block">{metrics ? metrics.todayOrdersCount : '—'} aujourd'hui</span>
              </div>

              <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-sky-400">
                  <span className="text-xs font-semibold">Tickets Support Ouverts</span>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-kurla-cream block">
                  {metrics ? metrics.openTicketsCount : '—'}
                </span>
                <span className="text-[11px] text-kurla-cream/50 block">En cours de traitement</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-1 shadow-xl"><span className="text-xs text-rose-300">Remboursements persistés</span><strong className="text-2xl block">{metrics ? metrics.refundsCount : '—'}</strong><span className="text-[11px] text-kurla-cream/45">Transactions pending ou finalisées</span></div>
              <div className="p-5 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-1 shadow-xl"><span className="text-xs text-amber-300">Recherches sans résultat</span><strong className="text-2xl block">{metrics ? metrics.searchesWithoutResultsCount : '—'}</strong><span className="text-[11px] text-kurla-cream/45">Événements persistés, requêtes ≥ 2 caractères</span></div>
              <div className="p-5 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-1 shadow-xl"><span className="text-xs text-sky-300">Utilisation IA</span><strong className="text-2xl block">{metrics?.aiUsageRate == null ? (metrics ? 'Non calculable' : '—') : `${metrics.aiUsageRate.toFixed(1)} %`}</strong><span className="text-[11px] text-kurla-cream/45">Utilisateurs inscrits ayant utilisé l’IA</span></div>
              <div className="p-5 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-1 shadow-xl"><span className="text-xs text-emerald-300">Produits populaires</span><strong className="text-2xl block">{metrics ? (metrics.popularProducts?.length || 0) : '—'}</strong><span className="text-[11px] text-kurla-cream/45">Classement issu des lignes de commandes réglées</span></div>
            </div>

            {/* ── Pilotage économique : marge / LTV / CAC / acquisition ── */}
            <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-serif-title font-bold text-kurla-cream">Pilotage économique</h2>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${metrics?.stripeMode === 'live' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                  Stripe : {metrics?.stripeMode === 'live' ? 'LIVE (encaissements réels)' : metrics?.stripeMode === 'test' ? 'MODE TEST (aucun euro réel)' : 'non configuré'}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCell label="Marge estimée" value={metrics ? `${metrics.estimatedMargin.toFixed(2)} €` : '—'} hint="CA net − coûts d'achat cibles − port" tone="text-emerald-300" />
                <KpiCell label="Taux de marge estimé" value={metrics?.estimatedMarginRate == null ? (metrics ? '—' : '—') : `${metrics.estimatedMarginRate.toFixed(0)} %`} hint="Sur coûts cibles du plan" tone="text-emerald-300" />
                <KpiCell label="Clients uniques" value={metrics ? metrics.uniqueCustomers : '—'} hint="Emails distincts ayant commandé" tone="text-kurla-cream" />
                <KpiCell label="Taux de réachat" value={metrics?.repeatRate == null ? '—' : `${metrics.repeatRate.toFixed(0)} %`} hint="Clients avec ≥ 2 commandes" tone="text-sky-300" />
                <KpiCell label="LTV proxy" value={metrics?.ltvProxy == null ? '—' : `${metrics.ltvProxy.toFixed(2)} €`} hint="CA net / clients uniques" tone="text-kurla-amber" />
                <KpiCell
                  label="CAC"
                  value={cacValue == null ? '—' : `${cacValue.toFixed(2)} €`}
                  hint={cacValue == null ? 'Saisir les dépenses d’acquisition ci-dessous' : `${adSpendValue.toFixed(0)} € dépensés / ${metrics.uniqueCustomers} clients`}
                  tone={cacValue == null ? 'text-kurla-cream/70' : (metrics?.ltvProxy != null && cacValue > metrics.ltvProxy / 3 ? 'text-rose-300' : 'text-emerald-300')}
                />
                <KpiCell label="Liste d'attente (emails)" value={metrics ? metrics.waitlistCount : '—'} hint="Emails capturés sur la home" tone="text-rose-300" />
                <KpiCell label="Inscrits (comptes)" value={metrics ? metrics.registeredUsersCount : '—'} hint="Profils créés" tone="text-kurla-cream/70" />
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label htmlFor="admin-ad-spend" className="text-xs text-kurla-cream/60 font-semibold">Dépenses d’acquisition cumulées (€)</label>
                <input
                  id="admin-ad-spend"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  value={adSpend}
                  onChange={e => handleAdSpendChange(e.target.value)}
                  placeholder="ex. 900"
                  className="w-32 px-3 py-1.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-sm text-kurla-cream focus:outline-none focus:border-kurla-copper/60"
                />
                <span className="text-[11px] text-kurla-cream/40">Créateurs + publicité + barters. Le CAC ci-dessus = ce montant / clients uniques ayant commandé.</span>
              </div>
              <p className="text-[11px] text-kurla-cream/40 leading-relaxed">
                Marge et LTV sont des estimations de pilotage basées sur les coûts d'achat cibles du plan de lancement (non comptables) ; la marge est calculée sur le CA net de TVA.
                Cible <strong className="text-kurla-cream/60">CAC &lt; LTV / 3</strong> et ROAS &gt; 2,5 avant toute publicité payante (le CAC passe en rouge si la cible est dépassée).
                En mode TEST, tous les montants correspondent à des commandes fictives.
              </p>
            </div>

            {(metrics?.topZeroResultSearches?.length > 0 || metrics?.popularProducts?.length > 0) && <div className="grid lg:grid-cols-2 gap-6">
              {metrics?.topZeroResultSearches?.length > 0 && <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 shadow-xl"><h2 className="text-sm font-bold mb-4">Requêtes à examiner</h2><div className="flex flex-wrap gap-2">{metrics.topZeroResultSearches.map((item: any) => <span key={item.query} className="px-3 py-2 rounded-xl bg-kurla-ink text-xs text-kurla-amber">{item.query} · {item.count}</span>)}</div></div>}
              {metrics?.popularProducts?.length > 0 && <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 shadow-xl"><h2 className="text-sm font-bold mb-4">Produits populaires</h2><div className="space-y-2">{metrics.popularProducts.map((item: any) => <div key={item.productId} className="flex justify-between text-xs"><span>{item.name}</span><span className="font-mono text-emerald-300">{item.quantity} vendus</span></div>)}</div></div>}
            </div>}

            {/* L3 — Funnel de conversion (diagnostic → routine → panier → payé) */}
            <ConversionFunnelPanel headers={adminHeaders} />

            {/* Inventory Stock Alerts */}
            <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-6 shadow-xl">
              <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Alertes Stock & Inventaire
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-kurla-ink border border-amber-500/20 space-y-3">
                  <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider">Stock Faible (&lt; 5 unités)</h3>
                  {metrics?.lowStockProducts?.length === 0 ? (
                    <p className="text-xs text-kurla-cream/40 italic">Aucune alerte de stock faible.</p>
                  ) : (
                    <div className="space-y-2">
                      {metrics?.lowStockProducts?.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-kurla-cream/5">
                          <span className="font-medium text-kurla-cream">{p.name}</span>
                          <span className="font-mono text-amber-400 font-bold">{p.stockQuantity} restants</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-kurla-ink border border-rose-500/20 space-y-3">
                  <h3 className="text-xs font-bold uppercase text-rose-400 tracking-wider">Rupture de Stock (0 unité)</h3>
                  {metrics?.outOfStockProducts?.length === 0 ? (
                    <p className="text-xs text-kurla-cream/40 italic">Aucun produit en rupture totale.</p>
                  ) : (
                    <div className="space-y-2">
                      {metrics?.outOfStockProducts?.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-kurla-cream/5">
                          <span className="font-medium text-kurla-cream">{p.name}</span>
                          <span className="font-mono text-rose-400 font-bold">Rupture</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT WITH STATUS HISTORY & TRANSITION CONTROLS */}
        {activeTab === 'orders' && (
          <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-6 shadow-xl">
            <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-kurla-copper" /> Commandes et Suivi Opérationnel
            </h2>

            {serverOrders.length === 0 ? (
              <p className="text-xs text-kurla-cream/50 italic">Aucune commande enregistrée dans la base.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-kurla-cream/10 text-kurla-amber uppercase tracking-wider">
                      <th className="py-3 px-4">N° Commande</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Statut Actuel</th>
                      <th className="py-3 px-4">Changer Statut</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kurla-cream/5">
                    {serverOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-kurla-ink/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-kurla-cream">{ord.id}</td>
                        <td className="py-3 px-4 text-kurla-cream/80">{ord.customerEmail}</td>
                        <td className="py-3 px-4 font-bold text-kurla-cream">{Number(ord.total).toFixed(2)} €</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            ord.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            ord.status === 'shipped' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                            ord.status === 'delivered' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            ord.status === 'refunded' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={ord.status}
                            onChange={(e) => handleOrderStatusChange(ord.id, e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-kurla-ink border border-kurla-cream/20 text-xs text-kurla-cream focus:outline-none focus:border-kurla-copper"
                          >
                            <option value="pending_payment">pending_payment</option>
                            <option value="payment_pending_webhook">payment_pending_webhook</option>
                            <option value="paid">paid</option>
                            <option value="processing">processing</option>
                            <option value="packed">packed</option>
                            <option value="shipped">shipped</option>
                            <option value="delivered">delivered</option>
                            <option value="cancelled">cancelled</option>
                            <option value="refunded">refunded</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 flex items-center gap-2">
                          <button
                            onClick={() => openShippingPanel(ord)}
                            className="px-3 py-1 rounded-full bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300"
                          >
                            Expédier
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(ord); fetchHistory(ord.id); }}
                            className="px-3 py-1 rounded-full bg-kurla-ink hover:bg-kurla-bark border border-kurla-cream/10 text-[11px] font-medium text-kurla-amber"
                          >
                            Historique
                          </button>
                          <button
                            onClick={() => handleTriggerRefund(ord.id)}
                            className="px-3 py-1 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-[11px] font-medium text-rose-300"
                          >
                            Rembourser
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Panneau Expédition : transporteur + numéro de suivi */}
            {shippingOrder && (
              <div className="p-6 rounded-3xl bg-kurla-ink border border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between border-b border-kurla-cream/10 pb-3">
                  <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                    📦 Expédier la commande <span className="font-mono">{shippingOrder.id}</span>
                  </h3>
                  <button onClick={() => setShippingOrder(null)} className="text-xs text-kurla-cream/50 hover:text-white">Fermer</button>
                </div>
                <p className="text-[11px] text-kurla-cream/50">
                  Client : {shippingOrder.customerEmail} • Total {Number(shippingOrder.total).toFixed(2)} €.
                  Le statut de la commande est mis à jour automatiquement (préparation → emballé → expédié → livré) et la cliente voit le suivi sur sa page de suivi.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-kurla-cream/70 space-y-1 block">
                    Transporteur
                    <select
                      value={shippingForm.carrier}
                      onChange={(e) => setShippingForm(f => ({ ...f, carrier: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-cream/20 text-xs text-kurla-cream focus:outline-none focus:border-indigo-400"
                    >
                      {Object.entries(CARRIER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-kurla-cream/70 space-y-1 block">
                    Statut d'acheminement
                    <select
                      value={shippingForm.status}
                      onChange={(e) => setShippingForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-cream/20 text-xs text-kurla-cream focus:outline-none focus:border-indigo-400"
                    >
                      <option value="preparing">Préparation (commande → processing)</option>
                      <option value="label_created">Étiquette créée (→ packed)</option>
                      <option value="shipped">Expédiée (→ shipped)</option>
                      <option value="in_transit">En transit (→ shipped)</option>
                      <option value="out_for_delivery">En cours de livraison (→ shipped)</option>
                      <option value="delivered">Livrée (→ delivered)</option>
                    </select>
                  </label>
                  <label className="text-xs text-kurla-cream/70 space-y-1 block">
                    Numéro de suivi
                    <input
                      type="text"
                      value={shippingForm.trackingNumber}
                      onChange={(e) => setShippingForm(f => ({ ...f, trackingNumber: e.target.value }))}
                      placeholder="Ex : 8L0123456789FR"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-cream/20 text-xs text-kurla-cream font-mono focus:outline-none focus:border-indigo-400"
                    />
                  </label>
                  <label className="text-xs text-kurla-cream/70 space-y-1 block">
                    Date de livraison estimée
                    <input
                      type="date"
                      value={shippingForm.estimatedDelivery}
                      onChange={(e) => setShippingForm(f => ({ ...f, estimatedDelivery: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-cream/20 text-xs text-kurla-cream focus:outline-none focus:border-indigo-400"
                    />
                  </label>
                  <label className="text-xs text-kurla-cream/70 space-y-1 block sm:col-span-2">
                    Lien de suivi (laisser vide pour le générer automatiquement selon le transporteur)
                    <input
                      type="url"
                      value={shippingForm.trackingUrl}
                      onChange={(e) => setShippingForm(f => ({ ...f, trackingUrl: e.target.value }))}
                      placeholder="https://…"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-cream/20 text-xs text-kurla-cream font-mono focus:outline-none focus:border-indigo-400"
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setShippingOrder(null)} className="px-4 py-2 rounded-full bg-kurla-espresso border border-kurla-cream/15 text-xs text-kurla-cream/70">Annuler</button>
                  <button
                    onClick={handleShipmentSave}
                    disabled={shippingSaving}
                    className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold"
                  >
                    {shippingSaving ? 'Enregistrement…' : 'Enregistrer l’expédition'}
                  </button>
                </div>
              </div>
            )}

            {/* Selected Order Audit History Drawer */}
            {selectedOrder && (
              <div className="p-6 rounded-3xl bg-kurla-ink border border-kurla-copper/40 space-y-4">
                <div className="flex items-center justify-between border-b border-kurla-cream/10 pb-3">
                  <h3 className="text-sm font-bold text-kurla-amber flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Traçabilité Audit Trail - Commande #{selectedOrder.id}
                  </h3>
                  <button onClick={() => setSelectedOrder(null)} className="text-xs text-kurla-cream/50 hover:text-white">Fermer</button>
                </div>

                <div className="space-y-3">
                  {orderHistory.length === 0 ? (
                    <p className="text-xs text-kurla-cream/40 italic">Aucun changement de statut archivé.</p>
                  ) : (
                    orderHistory.map((h, i) => (
                      <div key={i} className="p-3 rounded-xl bg-kurla-espresso border border-kurla-cream/5 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-kurla-cream">{h.oldStatus || 'Création'} &rarr; <span className="text-kurla-copper">{h.newStatus}</span></span>
                          <p className="text-[10px] text-kurla-cream/50 mt-0.5">Par {h.changedBy || 'système'} ({h.source}) • Raison: {h.reason || 'N/A'}</p>
                        </div>
                        <span className="font-mono text-[10px] text-kurla-cream/40">{new Date(h.createdAt).toLocaleString('fr-FR')}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'skin_demand' && workspace === 'skin' && (
          <div className="space-y-10">
            <PeauDemandStockGapPanel headers={adminHeaders} />
          </div>
        )}

        {/* TAB DEMANDE PRÉCOMMANDES (sourcing premier lot) — KURLA Hair */}
        {activeTab === 'demand' && workspace === 'hair' && (
          <div className="space-y-10">
          <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
                  <Factory className="w-5 h-5 text-kurla-copper" /> Demande précommandes — sourcing du premier lot
                </h2>
                <p className="text-xs text-kurla-cream/55 mt-1 max-w-2xl">
                  Quantités fermement réservées (commandes réglées) sur les précommandes, avec le déroulage des kits en composants pour caler les quantités à commander aux fournisseurs.
                </p>
              </div>
              <button onClick={fetchDemand} className="px-4 py-2 rounded-full bg-kurla-ink hover:bg-kurla-bark border border-kurla-cream/15 text-[11px] font-semibold text-kurla-amber flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Actualiser
              </button>
            </div>

            {demand?.stripeMode !== 'live' && (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Stripe est en mode <strong>TEST</strong> : ces commandes sont des simulations de paiement, pas des encaissements réels. Les quantités indiquent la demande, pas encore une trésorerie certaine.
              </div>
            )}

            {!demand ? (
              <p className="text-xs text-kurla-cream/50 italic">Chargement de la demande…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-kurla-ink border border-emerald-500/25">
                    <p className="text-[11px] text-emerald-300 font-bold uppercase">Commandes fermes</p>
                    <p className="text-2xl font-bold text-kurla-cream mt-1">{demand.totals.firmOrders}</p>
                    <p className="text-[10px] text-kurla-cream/45">{demand.totals.preorderFirmOrders} contenant une précommande</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-kurla-ink border border-amber-500/25">
                    <p className="text-[11px] text-amber-300 font-bold uppercase">En attente paiement</p>
                    <p className="text-2xl font-bold text-kurla-cream mt-1">{demand.totals.pendingOrders}</p>
                    <p className="text-[10px] text-kurla-cream/45">intentions non confirmées</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/10">
                    <p className="text-[11px] text-kurla-amber font-bold uppercase">CA commandes fermes</p>
                    <p className="text-2xl font-bold text-kurla-cream mt-1">{Number(demand.totals.firmRevenue).toFixed(2)} €</p>
                    <p className="text-[10px] text-kurla-cream/45">toutes commandes réglées (TTC)</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-kurla-ink border border-indigo-500/25">
                    <p className="text-[11px] text-indigo-300 font-bold uppercase">Unités à sourcer</p>
                    <p className="text-2xl font-bold text-kurla-cream mt-1">{demand.totals.totalUnitsToSource}</p>
                    <p className="text-[10px] text-kurla-cream/45">SKU + composants kits (hors kits)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {([['components', 'Composants à sourcer'], ['kits', 'Kits'], ['all', 'Tout']] as const).map(([id, label]) => (
                    <button key={id} onClick={() => setDemandFilter(id)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-bold border ${demandFilter === id ? 'bg-kurla-copper border-kurla-copper text-white' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-kurla-cream/10 text-kurla-amber uppercase tracking-wider">
                        <th className="py-3 px-3">Produit</th>
                        <th className="py-3 px-3 text-center">Type</th>
                        <th className="py-3 px-3 text-center">Qté ferme</th>
                        <th className="py-3 px-3 text-center">En attente</th>
                        <th className="py-3 px-3 text-center">Via kits</th>
                        <th className="py-3 px-3 text-center font-bold">À sourcer</th>
                        <th className="py-3 px-3 text-right">CA ferme</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kurla-cream/5">
                      {demand.products
                        .filter((p: any) => demandFilter === 'all' ? true : demandFilter === 'kits' ? p.isKit : !p.isKit)
                        .map((p: any) => (
                        <tr key={p.productId} className="hover:bg-kurla-ink/40">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-kurla-cream">{p.name}</span>
                            {p.componentOfKits?.length > 0 && (
                              <p className="text-[10px] text-indigo-300/70 mt-0.5">composant de {p.componentOfKits.length} kit(s)</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {p.isKit
                              ? <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">KIT</span>
                              : <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[10px] font-bold">SKU</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-300">{p.qtyFirm}</td>
                          <td className="py-2.5 px-3 text-center text-amber-300">{p.qtyPending}</td>
                          <td className="py-2.5 px-3 text-center text-indigo-300">{p.qtyFromKits || '—'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block min-w-[2ch] px-2.5 py-1 rounded-full bg-kurla-copper/20 text-[#F3C9A4] border border-kurla-copper/40 font-bold">{p.qtyToSource}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-kurla-amber">{Number(p.revenueFirm).toFixed(2)} €</td>
                        </tr>
                      ))}
                      {demand.products.filter((p: any) => demandFilter === 'all' ? true : demandFilter === 'kits' ? p.isKit : !p.isKit).length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-kurla-cream/45 italic">Aucune demande pour ce filtre pour le moment.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-kurla-cream/40">
                  « À sourcer » = quantités fermes + en attente + unités induites par les kits (un kit vendu = 1 unité de chacun de ses composants). Appliquez votre marge de sécurité (MOQ / casse) avant de passer commande fournisseur.
                </p>
              </>
            )}
          </div>
          </div>
        )}

        {/* TAB 3: RETURNS & REFUNDS */}
        {activeTab === 'returns' && (
          <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-6 shadow-xl">
            <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-kurla-copper" /> Demandes de Retour & Remboursements Stripe
            </h2>

            {returnsList.length === 0 ? (
              <p className="text-xs text-kurla-cream/50 italic">Aucune demande de retour enregistrée.</p>
            ) : (
              <div className="space-y-4">
                {returnsList.map(ret => (
                  <div key={ret.id} className="p-5 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-kurla-cream/5 pb-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-kurla-cream">Retour #{ret.id}</span>
                        <p className="text-xs text-kurla-amber">Commande #{ret.orderId} • Motif: {ret.reason}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ret.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        ret.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {ret.status.toUpperCase()}
                      </span>
                    </div>

                    {ret.comment && <p className="text-xs text-kurla-cream/70 italic">"{ret.comment}"</p>}
                    <p className="text-xs text-kurla-cream/60">Lignes : {Array.isArray(ret.items) && ret.items.length > 0 ? ret.items.map((item: any) => `${item.productId || item.product_id || 'produit non renseigné'} × ${item.quantity}`).join(' · ') : 'lignes non renseignées — réconciliation requise'}</p>
                    {returnHistories[ret.id]?.length > 0 && <div className="p-3 rounded-xl bg-kurla-espresso border border-kurla-cream/5 text-[10px] text-kurla-cream/55 space-y-1">{returnHistories[ret.id].map((event: any) => <p key={event.id}><span className="font-mono">{new Date(event.createdAt).toLocaleString('fr-FR')}</span> · {event.actorRole} · {event.oldStatus || 'création'} → {event.newStatus}{event.comment ? ` · ${event.comment}` : ''}</p>)}</div>}

                    <div className="flex items-center gap-3 pt-2">
                      {ret.status === 'requested' && (
                        <>
                          <button
                            onClick={() => handleReturnDecision(ret.id, 'approved', 'Retour validé par le SAV KURLA')}
                            className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                          >
                            <Check className="w-3.5 h-3.5" /> Accepter le Retour
                          </button>
                          <button
                            onClick={() => handleReturnDecision(ret.id, 'rejected', 'Produit hors délai de rétractation')}
                            className="px-4 py-1.5 rounded-full bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" /> Refuser
                          </button>
                        </>
                      )}
                      {ret.status === 'approved' && (
                        <button
                          onClick={async () => { const response = await fetch(`/api/admin/returns/${ret.id}/status`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ status: 'received', adminComment: 'Réception physique confirmée par le SAV.' }) }); if (response.ok) loadData(); }}
                          className="px-4 py-1.5 rounded-full bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold shadow"
                        >
                          Confirmer la réception physique
                        </button>
                      )}
                      {ret.status === 'received' && (
                        <button
                          onClick={() => handleTriggerRefund(ret.orderId, ret.id)}
                          className="px-4 py-1.5 rounded-full bg-kurla-copper hover:bg-[#B3632F] text-white text-xs font-bold shadow"
                        >
                          Émettre Remboursement Stripe
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SUPPORT CLIENT TICKETS */}
        {activeTab === 'support' && (
          <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-6 shadow-xl">
            <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-kurla-copper" /> Helpdesk Support Client
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tickets List */}
              <div className="space-y-3 lg:col-span-1">
                {supportTickets.length === 0 ? (
                  <p className="text-xs text-kurla-cream/40 italic">Aucun ticket ouvert.</p>
                ) : (
                  supportTickets.map(tkt => (
                    <div
                      key={tkt.id}
                      onClick={() => loadTicketMessages(tkt)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        selectedTicket?.id === tkt.id
                          ? 'bg-kurla-bark/40 border-kurla-copper'
                          : 'bg-kurla-ink border-kurla-cream/5 hover:border-kurla-cream/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-kurla-cream truncate">{tkt.subject}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tkt.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {tkt.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-kurla-amber">Catégorie: {tkt.subjectCategory} · Priorité: {tkt.priority || 'normal'}</p>
                      <p className="text-[10px] text-kurla-cream/45">{tkt.assignedAgentId ? `Affecté à ${tkt.assignedAgentId}` : 'Non affecté'}</p>
                      <span className="text-[10px] text-kurla-cream/40 block mt-1 font-mono">#{tkt.id}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Message Thread */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-4">
                {!selectedTicket ? (
                  <div className="h-64 flex items-center justify-center text-xs text-kurla-cream/40 italic">
                    Sélectionnez un ticket pour consulter la conversation et répondre.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-kurla-cream/10 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-kurla-cream">{selectedTicket.subject}</h3>
                        <p className="text-xs text-kurla-amber">Client ID: {selectedTicket.userId} • Catégorie: {selectedTicket.subjectCategory}</p>
                        <p className="text-[11px] text-kurla-cream/45 mt-1">Historique conservé : {ticketEvents.length} événement(s) · {selectedTicket.assignedAgentId ? `agent ${selectedTicket.assignedAgentId}` : 'non affecté'}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end">
                        <select value={selectedTicket.priority || 'normal'} onChange={(e) => handleTicketPriorityChange(selectedTicket.id, e.target.value)} className="px-3 py-1 rounded-xl bg-kurla-espresso border border-kurla-cream/20 text-xs text-kurla-cream">
                          <option value="low">low</option><option value="normal">normal</option><option value="high">high</option><option value="urgent">urgent</option>
                        </select>
                        <select value={selectedTicket.assignedAgentId || ''} onChange={(e) => handleTicketAssignmentChange(selectedTicket.id, e.target.value)} className="max-w-44 px-3 py-1 rounded-xl bg-kurla-espresso border border-kurla-cream/20 text-xs text-kurla-cream">
                          <option value="">Non affecté</option>
                          {(adminDashboard?.users || []).filter((candidate: any) => ['support', 'admin', 'superadmin'].includes(candidate.role)).map((candidate: any) => <option key={candidate.id} value={candidate.id}>{candidate.email || candidate.id}</option>)}
                        </select>
                        <select
                        value={selectedTicket.status}
                        onChange={(e) => handleTicketStatusChange(selectedTicket.id, e.target.value)}
                        className="px-3 py-1 rounded-xl bg-kurla-espresso border border-kurla-cream/20 text-xs text-kurla-cream"
                      >
                        <option value="open">open</option>
                        <option value="in_progress">in_progress</option>
                        <option value="resolved">resolved</option>
                        <option value="closed">closed</option>
                      </select>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {ticketMessages.map(m => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-2xl max-w-[80%] text-xs space-y-1 ${
                            m.senderRole === 'admin'
                              ? 'ml-auto bg-kurla-copper/20 border border-kurla-copper/40 text-kurla-cream'
                              : 'bg-kurla-espresso border border-kurla-cream/10 text-kurla-cream/90'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px] opacity-70">
                            <span className="font-bold uppercase">{m.senderRole}</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p>{m.message}</p>
                        </div>
                      ))}
                      {ticketAttachments.length > 0 && <div className="border-t border-kurla-cream/10 pt-3 space-y-1"><p className="text-[10px] text-kurla-cream/45 uppercase font-bold">Pièces jointes</p>{ticketAttachments.map(file => file.signedUrl ? <a key={file.id} href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-kurla-copper hover:underline">{file.fileName} · {(file.sizeBytes / 1024).toFixed(0)} Ko</a> : <p key={file.id} className="text-xs text-kurla-cream/45">{file.fileName} · URL temporaire indisponible</p>)}</div>}
                    </div>

                    <form onSubmit={handleSendAdminReply} className="flex gap-2 pt-3 border-t border-kurla-cream/10">
                      <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Rédigez votre réponse officielle KURLA..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-kurla-espresso border border-kurla-cream/15 text-xs text-kurla-cream focus:outline-none focus:border-kurla-copper"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-kurla-copper hover:bg-[#B3632F] text-white text-xs font-bold flex items-center gap-1.5 shadow"
                      >
                        <Send className="w-3.5 h-3.5" /> Envoyer
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5D: GUIDE DROPSHIP 0 CARTON — fiche opérationnelle intégrée */}
        {activeTab === 'guide_dropship' && (
          <DropshipGuidePanel onCreateTool={() => setActiveTab('catalog')} />
        )}

        {/* TAB 5: PRODUCT CATALOG — C20 peau publication TEST contrôlée */}
        {activeTab === 'catalog' && workspace === 'hair' && (
          <div className="space-y-10">
            <CatalogAdminPanel
              scope="hair"
              headers={adminHeaders}
              onSuccess={(message) => {
                setActionSuccess(message);
                loadData();
                setTimeout(() => setActionSuccess(''), 4000);
              }}
              onOpenGuide={() => setActiveTab('guide_dropship')}
            />
          </div>
        )}

        {/* TAB 1B: PILOTAGE CATALOGUE ET APPROVISIONNEMENT — chantier 15B */}
        {activeTab === 'growth' && (
          <GrowthControlCenterPanel headers={adminHeaders} />
        )}

        {activeTab === 'strategy' && (
          <StrategyCockpitPanel headers={adminHeaders} />
        )}

        {activeTab === 'cockpit' && workspace === 'hair' && (
          <div className="space-y-10">
            <OperationsCockpitPanel
              headers={adminHeaders}
              onSuccess={(message) => {
                setActionSuccess(message);
                setTimeout(() => setActionSuccess(''), 5000);
              }}
            />
          </div>
        )}

        {/* TAB 5B: APPROVISIONNEMENT — C16 cahier + C22 P1 J0 5 mails + C22 P2 J+3/J+7 + 16B + A3 tampon + B2 kitting + matrice pays */}
        {activeTab === 'suppliers' && workspace === 'hair' && (
          <div className="space-y-10">
            <SourcingCountryStrategyPanel headers={adminHeaders} />
            <TamponOrderPanel />
            <FulfillmentContactPanel />
            <KittingAdminPanel />
            <ProductSupplierPanel
              headers={adminHeaders}
              onSuccess={(message) => {
                setActionSuccess(message);
                setTimeout(() => setActionSuccess(''), 5000);
              }}
            />
            <SourcingProspectsPanel
              headers={adminHeaders}
              onSuccess={(message) => {
                setActionSuccess(message);
                setTimeout(() => setActionSuccess(''), 5000);
              }}
            />
            <div className="border-t border-kurla-cream/10 pt-8">
              <SupplierAdminPanel
                headers={adminHeaders}
                onSuccess={(message) => {
                  setActionSuccess(message);
                  setTimeout(() => setActionSuccess(''), 5000);
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 5C: LOTS ET TRAÇABILITÉ — écran du chantier 16D */}
        {activeTab === 'batches' && workspace === 'hair' && (
          <div className="space-y-10">
            <BatchAdminPanel
              headers={adminHeaders}
              onSuccess={(message) => {
                setActionSuccess(message);
                loadData();
                setTimeout(() => setActionSuccess(''), 5000);
              }}
            />
          </div>
        )}

        {/* TAB 6: DAILY OPERATIONS */}
        {activeTab === 'operations' && (
          <AdminOperationsPanel dashboard={adminDashboard} headers={adminHeaders} onReload={loadData} />
        )}

        {/* TAB 7: CERTIFICATIONS PROS — C15 peau : filtre Peau/Cheveux + vérif HPI/SPF */}
        {activeTab === 'pros' && (() => {
          const isPeauProfession = (prof: string) => /skincare|peau|dermat|esthét/i.test(prof || '');
          const peauCount = professionalApplications.filter(a => isPeauProfession(a.profession)).length;
          const cheveuxCount = professionalApplications.length - peauCount;
          const pendingCount = professionalApplications.filter(a => a.status === 'submitted' || a.status === 'under_review').length;
          const filtered = professionalApplications.filter(a => {
            if (prosFilter === 'peau') return isPeauProfession(a.profession);
            if (prosFilter === 'cheveux') return !isPeauProfession(a.profession);
            if (prosFilter === 'pending') return a.status === 'submitted' || a.status === 'under_review';
            return true;
          });
          return (
          <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
                <Users className="w-5 h-5 text-kurla-copper" /> Candidatures KURLA Pro — C15 peau & cheveux
              </h2>
              <p className="text-xs text-kurla-cream/55 mt-2">Les candidatures sont chargées depuis le stockage serveur. Une validation admin ne crée pas automatiquement un compte professionnel — le Trust Score (identité + qualification + avis sur prestation réelle) reste la porte d’entrée vers l’annuaire public.</p>
              <div className="mt-3 p-3 rounded-2xl bg-kurla-ink border border-emerald-500/20 flex flex-wrap gap-2 text-[11px] leading-relaxed">
                <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">Peau riche en mélanine</span>
                <span className="text-kurla-cream/60">Vérifier pour <strong className="text-kurla-cream">Experte Skincare / Dermato / Esthéticienne peau</strong> : formation HPI (hyperpigmentation), conseils SPF <em>sans trace blanche</em> testés phototypes V–VI, barrière hydratation. Demander portfolio / diplôme / cas avant/après si doute. Vocabulaire : <strong className="text-kurla-cream">uniformiser ≠ éclaircir</strong>.</span>
              </div>
            </div>

            {/* Stats rapides */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-cream/10 text-center"><p className="text-[10px] uppercase tracking-wider text-kurla-cream/50 font-bold">Total</p><p className="text-xl font-bold text-kurla-cream">{professionalApplications.length}</p></div>
              <div className="p-3 rounded-2xl bg-kurla-ink border border-emerald-500/25 text-center"><p className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Peau</p><p className="text-xl font-bold text-emerald-300">{peauCount}</p><p className="text-[10px] text-kurla-cream/40">{peauCount ? 'skincare / peau' : '0 peau'}</p></div>
              <div className="p-3 rounded-2xl bg-kurla-ink border border-amber-500/25 text-center"><p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">Cheveux</p><p className="text-xl font-bold text-amber-300">{cheveuxCount}</p></div>
              <div className="p-3 rounded-2xl bg-kurla-ink border border-sky-500/25 text-center"><p className="text-[10px] uppercase tracking-wider text-sky-300 font-bold">En attente</p><p className="text-xl font-bold text-sky-300">{pendingCount}</p><p className="text-[10px] text-kurla-cream/40">à traiter</p></div>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap items-center gap-2">
              {(['all','peau','cheveux','pending'] as const).map(id => {
                const labels: Record<string,string> = { all:`Tous · ${professionalApplications.length}`, peau:`Peau · ${peauCount}`, cheveux:`Cheveux · ${cheveuxCount}`, pending:`En attente · ${pendingCount}` };
                const active = prosFilter===id;
                return (
                  <button key={id} onClick={()=>setProsFilter(id)} className={`px-3 py-1.5 rounded-full border text-xs font-bold ${active ? 'bg-kurla-cream text-kurla-espresso border-kurla-cream' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/70 hover:text-white hover:border-kurla-cream/30'}`}>{labels[id]}</button>
                );
              })}
              <a href="/professionnels?cat=peau" target="_blank" rel="noreferrer" className="ml-auto px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25">Voir annuaire peau →</a>
              <a href="/peau/guide" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/10 text-xs font-semibold hover:border-kurla-copper">Guide peau</a>
            </div>

            {professionalApplications.length === 0 ? (
              <div className="p-8 rounded-2xl bg-kurla-ink border border-kurla-cream/5 text-center space-y-2">
                <p className="text-sm text-kurla-cream/55">Aucune candidature enregistrée.</p>
                <p className="text-xs text-kurla-cream/35">Astuce peau : partager <span className="font-mono text-kurla-amber">/professionnels/rejoindre</span> avec spécialité « Experte Skincare Peaux Mélaninées » — les candidatures peau apparaîtront ici avec le badge Peau.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 rounded-2xl bg-kurla-ink border border-kurla-cream/5 text-center text-sm text-kurla-cream/55">
                Aucune candidature pour le filtre « {prosFilter} ».
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((application: any) => {
                  const draftStatus = professionalStatusDrafts[application.id] || application.status;
                  const statusLabel = application.status === 'under_review'
                    ? 'En examen'
                    : application.status === 'approved'
                      ? 'Approuvée'
                      : application.status === 'rejected' ? 'Refusée' : 'Soumise';
                  const isPeau = isPeauProfession(application.profession);
                  return (
                    <div key={application.id} className={`p-5 rounded-2xl bg-kurla-ink border space-y-4 ${isPeau ? 'border-emerald-500/30' : 'border-kurla-cream/5'}`}>
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-serif-title font-bold text-kurla-cream">{application.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${isPeau ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>{isPeau ? 'Peau' : 'Cheveux'} · {application.profession}</span>
                            <span className="px-2 py-1 rounded-full bg-kurla-copper/15 text-kurla-amber text-[10px] font-semibold border border-kurla-copper/20">{statusLabel}</span>
                          </div>
                          <p className="text-xs text-kurla-cream/70 mt-1">{application.experience} • {application.city} {isPeau && <span className="text-emerald-300">• HPI / SPF sans trace à vérifier</span>}</p>
                          <p className="text-xs text-kurla-cream/60 mt-1">{application.email} • {application.phone}</p>
                          {application.portfolioUrl && (
                            <a href={application.portfolioUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-300 hover:text-sky-200 underline break-all">Voir le portfolio</a>
                          )}
                          <p className="text-[11px] text-kurla-cream/40 mt-1">Reçue le {new Date(application.createdAt).toLocaleString('fr-FR')}</p>
                          {isPeau && (
                            <p className="mt-2 text-[11px] leading-relaxed p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-200">
                              Checklist peau : diplôme / attestation HPI ou cas taches ? SPF conseillé testé V–VI sans trace blanche ? Routine barrière (céramides/niacinamide) maîtrisée ? Si documents manquants → passer en <em>En examen</em> et demander pièces.
                            </p>
                          )}
                        </div>

                        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select
                            value={draftStatus}
                            onChange={e => setProfessionalStatusDrafts({ ...professionalStatusDrafts, [application.id]: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-cream/15 text-kurla-cream text-xs focus:outline-none focus:border-kurla-copper"
                            aria-label={`Statut de la candidature de ${application.name}`}
                          >
                            <option value="submitted">Soumise</option>
                            <option value="under_review">En examen</option>
                            <option value="approved">Approuvée</option>
                            <option value="rejected">Refusée</option>
                          </select>
                          <button onClick={() => handleProfessionalStatusChange(application)} className="px-4 py-2 rounded-xl bg-kurla-copper hover:bg-kurla-amber text-white text-xs font-semibold shadow">
                            Enregistrer
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={professionalComments[application.id] ?? application.adminComment ?? ''}
                        onChange={e => setProfessionalComments({ ...professionalComments, [application.id]: e.target.value })}
                        maxLength={1000}
                        rows={2}
                        placeholder={isPeau ? "Commentaire interne peau : HPI / SPF testé V-VI / barrière — pièces reçues ?" : "Commentaire interne (facultatif)"}
                        className="w-full p-3 rounded-xl bg-kurla-espresso border border-kurla-cream/10 text-kurla-cream text-xs focus:outline-none focus:border-kurla-copper"
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-kurla-cream/35 leading-relaxed">C15 : filtre Peau/Cheveux + badge + checklist HPI/SPF. Une candidature approuvée devient publique seulement si identité + qualification vérifiées (Trust Score) — l’annuaire peau reste vide tant qu’aucun pro n’est approuvé, c’est voulu.</p>
          </div>
          ); })()}

      </div>
    </div>
  );
};
