import React, { useState, useEffect } from 'react';
import { Shield, Users, ShoppingBag, Sparkles, Lock, LogOut, CheckCircle2, RotateCcw, MessageSquare, AlertTriangle, TrendingUp, DollarSign, Package, Clock, RefreshCw, Send, Check, X } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('kurla_admin_session') === 'active_kurla_2026';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'returns' | 'support' | 'pros'>('analytics');
  
  const [metrics, setMetrics] = useState<any>(null);
  const [serverOrders, setServerOrders] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [statusUpdateReason, setStatusUpdateReason] = useState('');
  
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const adminHeaders = {
    'x-admin-key': 'kurla2026',
    'Content-Type': 'application/json'
  };

  const loadData = () => {
    setLoading(true);
    // 1. Fetch Analytics Metrics
    fetch('/api/admin/metrics', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.metrics && setMetrics(data.metrics))
      .catch(err => console.error('Error metrics:', err));

    // 2. Fetch Orders
    fetch('/api/orders', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.orders && setServerOrders(data.orders))
      .catch(err => console.error('Error orders:', err));

    // 3. Fetch Returns
    fetch('/api/returns', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.returns && setReturnsList(data.returns))
      .catch(err => console.error('Error returns:', err));

    // 4. Fetch Support Tickets
    fetch('/api/support/tickets', { headers: adminHeaders })
      .then(res => res.json())
      .then(data => data.tickets && setSupportTickets(data.tickets))
      .catch(err => console.error('Error tickets:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === 'kurla2026' || passwordInput.trim() === 'admin') {
      localStorage.setItem('kurla_admin_session', 'active_kurla_2026');
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Mot de passe administrateur incorrect.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kurla_admin_session');
    setIsAuthenticated(false);
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
      .then(data => data.messages && setTicketMessages(data.messages));
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#1A0F0A] border border-[#C8753D]/30 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#C8753D]/20 border border-[#C8753D]/40 flex items-center justify-center mx-auto text-[#D49A63]">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Espace Administration Sécurisé</h1>
            <p className="text-xs text-[#FFF7EF]/60">Veuillez vous authentifier avec votre mot de passe SuperAdmin KURLA.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#D49A63] mb-1.5">Clé d'accès Administrateur</label>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Saisissez votre mot de passe admin"
                className="w-full px-4 py-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-sm focus:outline-none focus:border-[#C8753D]"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#C8753D] hover:bg-[#B3632F] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg"
            >
              Se Connecter en Mode Admin
            </button>
          </form>

          <p className="text-[11px] text-center text-[#FFF7EF]/40 font-mono">
            Accès réservé aux équipes internes & modérateurs certifiés KURLA.
          </p>
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
            { id: 'orders', label: `Commandes (${serverOrders.length})`, icon: ShoppingBag },
            { id: 'returns', label: `Retours & Remboursements (${returnsList.length})`, icon: RotateCcw },
            { id: 'support', label: `Support Client (${supportTickets.length})`, icon: MessageSquare },
            { id: 'pros', label: 'Certifications Pros', icon: Users }
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
                  {metrics?.revenueTest?.toFixed(2) || '0.00'} €
                </span>
                <span className="text-[11px] text-[#FFF7EF]/50 block">Cumul des commandes au statut PAID</span>
              </div>

              <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-semibold">Panier Moyen (AOV)</span>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-[#FFF7EF] block">
                  {metrics?.avgOrderValue?.toFixed(2) || '0.00'} €
                </span>
                <span className="text-[11px] text-[#FFF7EF]/50 block">Valeur moyenne par commande payée</span>
              </div>

              <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-semibold">Commandes Totales</span>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-[#FFF7EF] block">
                  {metrics?.totalOrders || 0}
                </span>
                <span className="text-[11px] text-[#FFF7EF]/50 block">{metrics?.todayOrdersCount || 0} aujourd'hui</span>
              </div>

              <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-sky-400">
                  <span className="text-xs font-semibold">Tickets Support Ouverts</span>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-[#FFF7EF] block">
                  {metrics?.openTicketsCount || 0}
                </span>
                <span className="text-[11px] text-[#FFF7EF]/50 block">En cours de traitement</span>
              </div>
            </div>

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
                      <p className="text-[11px] text-[#D49A63]">Catégorie: {tkt.subjectCategory}</p>
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
                      </div>

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

        {/* TAB 5: CERTIFICATIONS PROS */}
        {activeTab === 'pros' && (
          <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
            <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C8753D]" /> Candidatures KURLA Pro (Validation Bêta)
            </h2>

            <div className="space-y-4">
              {[
                { name: 'Kadiatou Diallo', city: 'Paris (75010)', specialty: 'Loctician Microlocks', experience: '6 ans' },
                { name: 'Fatouma S.', city: 'Lyon', specialty: 'Experte Skincare Peaux Mélaninées', experience: '4 ans' },
              ].map((cand, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-serif-title font-bold text-[#FFF7EF]">{cand.name} ({cand.city})</h3>
                    <p className="text-xs text-[#D49A63]">{cand.specialty} • {cand.experience} d'expérience</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow">
                      Valider & Certifier
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-[#1A0F0A] hover:bg-[#3A2218] text-xs font-medium text-[#FFF7EF]/70 border border-[#FFF7EF]/10">
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
