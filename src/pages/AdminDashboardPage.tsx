import React, { useState, useEffect } from 'react';
import { Shield, Users, ShoppingBag, Sparkles, Lock, LogOut, CheckCircle2, RotateCcw, MessageSquare, AlertTriangle, TrendingUp, DollarSign, Package, Clock, RefreshCw, Send, Check, X, Truck, Gauge, Boxes } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CatalogAdminPanel } from '../components/CatalogAdminPanel';
import { SupplierAdminPanel } from '../components/SupplierAdminPanel';
import { OperationsCockpitPanel } from '../components/OperationsCockpitPanel';
import { BatchAdminPanel } from '../components/BatchAdminPanel';
import { AdminOperationsPanel } from '../components/AdminOperationsPanel';

export const AdminDashboardPage: React.FC = () => {
  const { user, profile, session, signOut } = useAuth();
  const isAuthenticated = Boolean(
    user && session?.access_token && profile && ['admin', 'superadmin'].includes(profile.role)
  );
  
  const [activeTab, setActiveTab] = useState<'analytics' | 'cockpit' | 'orders' | 'returns' | 'support' | 'pros' | 'catalog' | 'suppliers' | 'batches' | 'operations'>('analytics');
  
  const [metrics, setMetrics] = useState<any>(null);
  const [adminDashboard, setAdminDashboard] = useState<any>(null);
  const [serverOrders, setServerOrders] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [returnHistories, setReturnHistories] = useState<Record<string, any[]>>({});
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [professionalApplications, setProfessionalApplications] = useState<any[]>([]);
  const [professionalStatusDrafts, setProfessionalStatusDrafts] = useState<Record<string, string>>({});
  const [professionalComments, setProfessionalComments] = useState<Record<string, string>>({});
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [statusUpdateReason, setStatusUpdateReason] = useState('');
  
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
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#1A0F0A] border border-rose-500/30 shadow-2xl space-y-5 text-center">
          <Lock className="w-8 h-8 mx-auto text-rose-400" />
          <h1 className="text-2xl font-serif-title font-bold">Authentification administrateur requise</h1>
          <p className="text-xs text-[#FFF7EF]/60">
            Connectez-vous avec Supabase Auth. Les mots de passe locaux et les clés administrateur partagées sont désactivés.
          </p>
          <a href="/account" className="inline-flex px-5 py-3 rounded-xl bg-[#C8753D] text-white text-xs font-bold">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header Bar */}
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-3">
              <Shield className="w-7 h-7 text-[#C8753D]" /> Administration & Operations Commerciales
            </h1>
            <p className="text-xs text-[#FFF7EF]/60">Supervision en temps réel des commandes, expéditions, retours, support et métriques commerciales.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 rounded-full bg-[#050403] hover:bg-[#3A2218] text-[#D49A63] border border-[#C8753D]/30 transition-colors"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> SuperAdmin Connecté
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-[#050403] hover:bg-[#3A2218] text-[#FFF7EF]/70 hover:text-white border border-[#FFF7EF]/10 transition-colors"
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

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-[#FFF7EF]/10 pb-4">
          {[
            { id: 'analytics', label: 'Tableau de Bord Commercial', icon: TrendingUp },
            { id: 'cockpit', label: 'Pilotage catalogue', icon: Gauge },
            { id: 'orders', label: `Commandes (${serverOrders.length})`, icon: ShoppingBag },
            { id: 'returns', label: `Retours & Remboursements (${returnsList.length})`, icon: RotateCcw },
            { id: 'support', label: `Support Client (${supportTickets.length})`, icon: MessageSquare },
            { id: 'pros', label: 'Certifications Pros', icon: Users },
            { id: 'catalog', label: 'Catalogue produits', icon: Package },
            { id: 'suppliers', label: 'Approvisionnement', icon: Truck },
            { id: 'batches', label: 'Lots et traçabilité', icon: Boxes },
            { id: 'operations', label: 'Gestion quotidienne', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? 'bg-[#C8753D] text-white shadow-lg'
                    : 'bg-[#1A0F0A] text-[#FFF7EF]/70 hover:text-white border border-[#FFF7EF]/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: COMMERCIAL DASHBOARD ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-[#D49A63]">
                  <span className="text-xs font-semibold">Chiffre d'Affaires Test</span>
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-[#FFF7EF] block">
                  {metrics ? `${metrics.revenueTest.toFixed(2)} €` : '—'}
                </span>
                <span className="text-[11px] text-[#FFF7EF]/50 block">Commandes réglées, moins les remboursements persistés</span>
              </div>

              <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-semibold">Panier Moyen (AOV)</span>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-[#FFF7EF] block">
                  {metrics ? `${metrics.avgOrderValue.toFixed(2)} €` : '—'}
                </span>
                <span className="text-[11px] text-[#FFF7EF]/50 block">Valeur moyenne par commande payée</span>
              </div>

              <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-semibold">Commandes Totales</span>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-[#FFF7EF] block">
                  {metrics ? metrics.totalOrders : '—'}
                </span>
                <span className="text-[11px] text-[#FFF7EF]/50 block">{metrics ? metrics.todayOrdersCount : '—'} aujourd'hui</span>
              </div>

              <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-sky-400">
                  <span className="text-xs font-semibold">Tickets Support Ouverts</span>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-[#FFF7EF] block">
                  {metrics ? metrics.openTicketsCount : '—'}
                </span>
                <span className="text-[11px] text-[#FFF7EF]/50 block">En cours de traitement</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-1 shadow-xl"><span className="text-xs text-rose-300">Remboursements persistés</span><strong className="text-2xl block">{metrics ? metrics.refundsCount : '—'}</strong><span className="text-[11px] text-[#FFF7EF]/45">Transactions pending ou finalisées</span></div>
              <div className="p-5 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-1 shadow-xl"><span className="text-xs text-amber-300">Recherches sans résultat</span><strong className="text-2xl block">{metrics ? metrics.searchesWithoutResultsCount : '—'}</strong><span className="text-[11px] text-[#FFF7EF]/45">Événements persistés, requêtes ≥ 2 caractères</span></div>
              <div className="p-5 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-1 shadow-xl"><span className="text-xs text-sky-300">Utilisation IA</span><strong className="text-2xl block">{metrics?.aiUsageRate == null ? (metrics ? 'Non calculable' : '—') : `${metrics.aiUsageRate.toFixed(1)} %`}</strong><span className="text-[11px] text-[#FFF7EF]/45">Utilisateurs inscrits ayant utilisé l’IA</span></div>
              <div className="p-5 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-1 shadow-xl"><span className="text-xs text-emerald-300">Produits populaires</span><strong className="text-2xl block">{metrics ? (metrics.popularProducts?.length || 0) : '—'}</strong><span className="text-[11px] text-[#FFF7EF]/45">Classement issu des lignes de commandes réglées</span></div>
            </div>

            {(metrics?.topZeroResultSearches?.length > 0 || metrics?.popularProducts?.length > 0) && <div className="grid lg:grid-cols-2 gap-6">
              {metrics?.topZeroResultSearches?.length > 0 && <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 shadow-xl"><h2 className="text-sm font-bold mb-4">Requêtes à examiner</h2><div className="flex flex-wrap gap-2">{metrics.topZeroResultSearches.map((item: any) => <span key={item.query} className="px-3 py-2 rounded-xl bg-[#050403] text-xs text-[#D49A63]">{item.query} · {item.count}</span>)}</div></div>}
              {metrics?.popularProducts?.length > 0 && <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 shadow-xl"><h2 className="text-sm font-bold mb-4">Produits populaires</h2><div className="space-y-2">{metrics.popularProducts.map((item: any) => <div key={item.productId} className="flex justify-between text-xs"><span>{item.name}</span><span className="font-mono text-emerald-300">{item.quantity} vendus</span></div>)}</div></div>}
            </div>}

            {/* Inventory Stock Alerts */}
            <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
              <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Alertes Stock & Inventaire
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-[#050403] border border-amber-500/20 space-y-3">
                  <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider">Stock Faible (&lt; 5 unités)</h3>
                  {metrics?.lowStockProducts?.length === 0 ? (
                    <p className="text-xs text-[#FFF7EF]/40 italic">Aucune alerte de stock faible.</p>
                  ) : (
                    <div className="space-y-2">
                      {metrics?.lowStockProducts?.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[#FFF7EF]/5">
                          <span className="font-medium text-[#FFF7EF]">{p.name}</span>
                          <span className="font-mono text-amber-400 font-bold">{p.stockQuantity} restants</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-[#050403] border border-rose-500/20 space-y-3">
                  <h3 className="text-xs font-bold uppercase text-rose-400 tracking-wider">Rupture de Stock (0 unité)</h3>
                  {metrics?.outOfStockProducts?.length === 0 ? (
                    <p className="text-xs text-[#FFF7EF]/40 italic">Aucun produit en rupture totale.</p>
                  ) : (
                    <div className="space-y-2">
                      {metrics?.outOfStockProducts?.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[#FFF7EF]/5">
                          <span className="font-medium text-[#FFF7EF]">{p.name}</span>
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
          <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
            <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#C8753D]" /> Commandes et Suivi Opérationnel
            </h2>

            {serverOrders.length === 0 ? (
              <p className="text-xs text-[#FFF7EF]/50 italic">Aucune commande enregistrée dans la base.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#FFF7EF]/10 text-[#D49A63] uppercase tracking-wider">
                      <th className="py-3 px-4">N° Commande</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Statut Actuel</th>
                      <th className="py-3 px-4">Changer Statut</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FFF7EF]/5">
                    {serverOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-[#050403]/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#FFF7EF]">{ord.id}</td>
                        <td className="py-3 px-4 text-[#FFF7EF]/80">{ord.customerEmail}</td>
                        <td className="py-3 px-4 font-bold text-[#FFF7EF]">{Number(ord.total).toFixed(2)} €</td>
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
                            className="px-3 py-1.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/20 text-xs text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]"
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
                            onClick={() => { setSelectedOrder(ord); fetchHistory(ord.id); }}
                            className="px-3 py-1 rounded-full bg-[#050403] hover:bg-[#3A2218] border border-[#FFF7EF]/10 text-[11px] font-medium text-[#D49A63]"
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

            {/* Selected Order Audit History Drawer */}
            {selectedOrder && (
              <div className="p-6 rounded-3xl bg-[#050403] border border-[#C8753D]/40 space-y-4">
                <div className="flex items-center justify-between border-b border-[#FFF7EF]/10 pb-3">
                  <h3 className="text-sm font-bold text-[#D49A63] flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Traçabilité Audit Trail - Commande #{selectedOrder.id}
                  </h3>
                  <button onClick={() => setSelectedOrder(null)} className="text-xs text-[#FFF7EF]/50 hover:text-white">Fermer</button>
                </div>

                <div className="space-y-3">
                  {orderHistory.length === 0 ? (
                    <p className="text-xs text-[#FFF7EF]/40 italic">Aucun changement de statut archivé.</p>
                  ) : (
                    orderHistory.map((h, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/5 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-[#FFF7EF]">{h.oldStatus || 'Création'} &rarr; <span className="text-[#C8753D]">{h.newStatus}</span></span>
                          <p className="text-[10px] text-[#FFF7EF]/50 mt-0.5">Par {h.changedBy || 'système'} ({h.source}) • Raison: {h.reason || 'N/A'}</p>
                        </div>
                        <span className="font-mono text-[10px] text-[#FFF7EF]/40">{new Date(h.createdAt).toLocaleString('fr-FR')}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RETURNS & REFUNDS */}
        {activeTab === 'returns' && (
          <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
            <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[#C8753D]" /> Demandes de Retour & Remboursements Stripe
            </h2>

            {returnsList.length === 0 ? (
              <p className="text-xs text-[#FFF7EF]/50 italic">Aucune demande de retour enregistrée.</p>
            ) : (
              <div className="space-y-4">
                {returnsList.map(ret => (
                  <div key={ret.id} className="p-5 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#FFF7EF]/5 pb-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-[#FFF7EF]">Retour #{ret.id}</span>
                        <p className="text-xs text-[#D49A63]">Commande #{ret.orderId} • Motif: {ret.reason}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ret.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        ret.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {ret.status.toUpperCase()}
                      </span>
                    </div>

                    {ret.comment && <p className="text-xs text-[#FFF7EF]/70 italic">"{ret.comment}"</p>}
                    <p className="text-xs text-[#FFF7EF]/60">Lignes : {Array.isArray(ret.items) && ret.items.length > 0 ? ret.items.map((item: any) => `${item.productId || item.product_id || 'produit non renseigné'} × ${item.quantity}`).join(' · ') : 'lignes non renseignées — réconciliation requise'}</p>
                    {returnHistories[ret.id]?.length > 0 && <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/5 text-[10px] text-[#FFF7EF]/55 space-y-1">{returnHistories[ret.id].map((event: any) => <p key={event.id}><span className="font-mono">{new Date(event.createdAt).toLocaleString('fr-FR')}</span> · {event.actorRole} · {event.oldStatus || 'création'} → {event.newStatus}{event.comment ? ` · ${event.comment}` : ''}</p>)}</div>}

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
                          className="px-4 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#B3632F] text-white text-xs font-bold shadow"
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
          <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
            <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#C8753D]" /> Helpdesk Support Client
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tickets List */}
              <div className="space-y-3 lg:col-span-1">
                {supportTickets.length === 0 ? (
                  <p className="text-xs text-[#FFF7EF]/40 italic">Aucun ticket ouvert.</p>
                ) : (
                  supportTickets.map(tkt => (
                    <div
                      key={tkt.id}
                      onClick={() => loadTicketMessages(tkt)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        selectedTicket?.id === tkt.id
                          ? 'bg-[#3A2218]/40 border-[#C8753D]'
                          : 'bg-[#050403] border-[#FFF7EF]/5 hover:border-[#FFF7EF]/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-[#FFF7EF] truncate">{tkt.subject}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tkt.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {tkt.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#D49A63]">Catégorie: {tkt.subjectCategory} · Priorité: {tkt.priority || 'normal'}</p>
                      <p className="text-[10px] text-[#FFF7EF]/45">{tkt.assignedAgentId ? `Affecté à ${tkt.assignedAgentId}` : 'Non affecté'}</p>
                      <span className="text-[10px] text-[#FFF7EF]/40 block mt-1 font-mono">#{tkt.id}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Message Thread */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-4">
                {!selectedTicket ? (
                  <div className="h-64 flex items-center justify-center text-xs text-[#FFF7EF]/40 italic">
                    Sélectionnez un ticket pour consulter la conversation et répondre.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-[#FFF7EF]/10 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#FFF7EF]">{selectedTicket.subject}</h3>
                        <p className="text-xs text-[#D49A63]">Client ID: {selectedTicket.userId} • Catégorie: {selectedTicket.subjectCategory}</p>
                        <p className="text-[11px] text-[#FFF7EF]/45 mt-1">Historique conservé : {ticketEvents.length} événement(s) · {selectedTicket.assignedAgentId ? `agent ${selectedTicket.assignedAgentId}` : 'non affecté'}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end">
                        <select value={selectedTicket.priority || 'normal'} onChange={(e) => handleTicketPriorityChange(selectedTicket.id, e.target.value)} className="px-3 py-1 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/20 text-xs text-[#FFF7EF]">
                          <option value="low">low</option><option value="normal">normal</option><option value="high">high</option><option value="urgent">urgent</option>
                        </select>
                        <select value={selectedTicket.assignedAgentId || ''} onChange={(e) => handleTicketAssignmentChange(selectedTicket.id, e.target.value)} className="max-w-44 px-3 py-1 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/20 text-xs text-[#FFF7EF]">
                          <option value="">Non affecté</option>
                          {(adminDashboard?.users || []).filter((candidate: any) => ['support', 'admin', 'superadmin'].includes(candidate.role)).map((candidate: any) => <option key={candidate.id} value={candidate.id}>{candidate.email || candidate.id}</option>)}
                        </select>
                        <select
                        value={selectedTicket.status}
                        onChange={(e) => handleTicketStatusChange(selectedTicket.id, e.target.value)}
                        className="px-3 py-1 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/20 text-xs text-[#FFF7EF]"
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
                              ? 'ml-auto bg-[#C8753D]/20 border border-[#C8753D]/40 text-[#FFF7EF]'
                              : 'bg-[#1A0F0A] border border-[#FFF7EF]/10 text-[#FFF7EF]/90'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px] opacity-70">
                            <span className="font-bold uppercase">{m.senderRole}</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p>{m.message}</p>
                        </div>
                      ))}
                      {ticketAttachments.length > 0 && <div className="border-t border-[#FFF7EF]/10 pt-3 space-y-1"><p className="text-[10px] text-[#FFF7EF]/45 uppercase font-bold">Pièces jointes</p>{ticketAttachments.map(file => file.signedUrl ? <a key={file.id} href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#C8753D] hover:underline">{file.fileName} · {(file.sizeBytes / 1024).toFixed(0)} Ko</a> : <p key={file.id} className="text-xs text-[#FFF7EF]/45">{file.fileName} · URL temporaire indisponible</p>)}</div>}
                    </div>

                    <form onSubmit={handleSendAdminReply} className="flex gap-2 pt-3 border-t border-[#FFF7EF]/10">
                      <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Rédigez votre réponse officielle KURLA..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#B3632F] text-white text-xs font-bold flex items-center gap-1.5 shadow"
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

        {/* TAB 5: PRODUCT CATALOG */}
        {activeTab === 'catalog' && (
          <CatalogAdminPanel
            headers={adminHeaders}
            onSuccess={(message) => {
              setActionSuccess(message);
              loadData();
              setTimeout(() => setActionSuccess(''), 4000);
            }}
          />
        )}

        {/* TAB 1B: PILOTAGE CATALOGUE ET APPROVISIONNEMENT — chantier 15B */}
        {activeTab === 'cockpit' && (
          <OperationsCockpitPanel
            headers={adminHeaders}
            onSuccess={(message) => {
              setActionSuccess(message);
              setTimeout(() => setActionSuccess(''), 5000);
            }}
          />
        )}

        {/* TAB 5B: APPROVISIONNEMENT — chantier 16B */}
        {activeTab === 'suppliers' && (
          <SupplierAdminPanel
            headers={adminHeaders}
            onSuccess={(message) => {
              setActionSuccess(message);
              setTimeout(() => setActionSuccess(''), 5000);
            }}
          />
        )}

        {/* TAB 5C: LOTS ET TRAÇABILITÉ — écran du chantier 16D */}
        {activeTab === 'batches' && (
          <BatchAdminPanel
            headers={adminHeaders}
            onSuccess={(message) => {
              setActionSuccess(message);
              loadData();
              setTimeout(() => setActionSuccess(''), 5000);
            }}
          />
        )}

        {/* TAB 6: DAILY OPERATIONS */}
        {activeTab === 'operations' && (
          <AdminOperationsPanel dashboard={adminDashboard} headers={adminHeaders} onReload={loadData} />
        )}

        {/* TAB 7: CERTIFICATIONS PROS */}
        {activeTab === 'pros' && (
          <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C8753D]" /> Candidatures KURLA Pro
              </h2>
              <p className="text-xs text-[#FFF7EF]/55 mt-2">Les candidatures sont chargées depuis le stockage serveur. Une validation admin ne crée pas automatiquement un compte professionnel.</p>
            </div>

            {professionalApplications.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 text-center text-sm text-[#FFF7EF]/55">
                Aucune candidature enregistrée.
              </div>
            ) : (
              <div className="space-y-4">
                {professionalApplications.map((application: any) => {
                  const draftStatus = professionalStatusDrafts[application.id] || application.status;
                  const statusLabel = application.status === 'under_review'
                    ? 'En examen'
                    : application.status === 'approved'
                      ? 'Approuvée'
                      : application.status === 'rejected' ? 'Refusée' : 'Soumise';
                  return (
                    <div key={application.id} className="p-5 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 space-y-4">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-serif-title font-bold text-[#FFF7EF]">{application.name}</h3>
                            <span className="px-2 py-1 rounded-full bg-[#C8753D]/15 text-[#D49A63] text-[10px] font-semibold">{statusLabel}</span>
                          </div>
                          <p className="text-xs text-[#D49A63] mt-1">{application.profession} • {application.experience} • {application.city}</p>
                          <p className="text-xs text-[#FFF7EF]/60 mt-1">{application.email} • {application.phone}</p>
                          {application.portfolioUrl && (
                            <a href={application.portfolioUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-300 hover:text-sky-200 underline break-all">Voir le portfolio</a>
                          )}
                          <p className="text-[11px] text-[#FFF7EF]/40 mt-1">Reçue le {new Date(application.createdAt).toLocaleString('fr-FR')}</p>
                        </div>

                        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select
                            value={draftStatus}
                            onChange={e => setProfessionalStatusDrafts({ ...professionalStatusDrafts, [application.id]: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/15 text-[#FFF7EF] text-xs focus:outline-none focus:border-[#C8753D]"
                            aria-label={`Statut de la candidature de ${application.name}`}
                          >
                            <option value="submitted">Soumise</option>
                            <option value="under_review">En examen</option>
                            <option value="approved">Approuvée</option>
                            <option value="rejected">Refusée</option>
                          </select>
                          <button onClick={() => handleProfessionalStatusChange(application)} className="px-4 py-2 rounded-xl bg-[#C8753D] hover:bg-[#D49A63] text-white text-xs font-semibold shadow">
                            Enregistrer
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={professionalComments[application.id] ?? application.adminComment ?? ''}
                        onChange={e => setProfessionalComments({ ...professionalComments, [application.id]: e.target.value })}
                        maxLength={1000}
                        rows={2}
                        placeholder="Commentaire interne (facultatif)"
                        className="w-full p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-[#FFF7EF] text-xs focus:outline-none focus:border-[#C8753D]"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
