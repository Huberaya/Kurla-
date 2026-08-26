import React, { useState, useEffect } from 'react';
import { User, ShoppingBag, Sparkles, MapPin, Calendar, CheckCircle2, Heart, Clock, AlertCircle, Save, LogOut, ShieldCheck, Bell, MessageSquare, RotateCcw, Truck, Send, Check, Trash2, Settings, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

interface ServerOrder {
  id: string;
  items: any[];
  total: number;
  status: string;
  customerEmail?: string;
  createdAt: string;
  stripeSessionId?: string;
}

export const CustomerAccountPage: React.FC = () => {
  const { user, profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'commandes' | 'notifications' | 'support' | 'preferences' | 'profil'>('commandes');
  
  const [serverOrders, setServerOrders] = useState<ServerOrder[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<any>({
    emailOrderUpdates: true,
    emailPromotions: true,
    emailSupportReplies: true,
    inAppAlerts: true
  });
  
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [newTicketForm, setNewTicketForm] = useState({ subject: '', category: 'order', message: '', orderId: '' });
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [showReturnModal, setShowReturnModal] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('defect');
  const [returnComment, setReturnComment] = useState('');

  const [shipmentsMap, setShipmentsMap] = useState<Record<string, any>>({});

  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [missingSessionError, setMissingSessionError] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Profile Form State
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    first_name: '',
    last_name: '',
    phone: '',
    country: 'FR',
    age_range: '25-34',
    hair_type: '4C',
    texture: 'crepue',
    density: 'forte',
    scalp_condition: 'sec',
    skin_type: 'mixte',
    sensitivity: 'moyenne',
    budget: '40_70',
  });

  const [saving, setSaving] = useState(false);

  const userId = user?.id || profile?.id || '';
  const userEmail = user?.email || profile?.email || 'client@kurla-beauty.com';

  const authHeaders = {
    'x-user-id': userId,
    'x-user-email': userEmail,
    'Authorization': `Bearer ${userId || userEmail}`
  };

  const loadUserData = () => {
    // 1. Load Orders
    fetch('/api/orders', { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data && data.orders) {
          setServerOrders(data.orders);
          // Fetch shipments for shipped/delivered orders
          data.orders.forEach((o: any) => {
            fetch(`/api/shipments/${o.id}`)
              .then(r => r.json())
              .then(sd => {
                if (sd.shipment) {
                  setShipmentsMap(prev => ({ ...prev, [o.id]: sd.shipment }));
                }
              });
          });
        }
      });

    // 2. Load Notifications
    fetch('/api/notifications', { headers: authHeaders })
      .then(res => res.json())
      .then(data => data.notifications && setNotifications(data.notifications));

    // 3. Load Notification Preferences
    fetch('/api/notification-preferences', { headers: authHeaders })
      .then(res => res.json())
      .then(data => data.preferences && setNotifPrefs(data.preferences));

    // 4. Load Support Tickets
    fetch('/api/support/tickets', { headers: authHeaders })
      .then(res => res.json())
      .then(data => data.tickets && setSupportTickets(data.tickets));

    // 5. Load Returns
    fetch('/api/returns', { headers: authHeaders })
      .then(res => res.json())
      .then(data => data.returns && setReturnsList(data.returns));
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        country: profile.country || 'FR',
        age_range: profile.age_range || '25-34',
        hair_type: profile.hair_type || '4C',
        texture: profile.texture || 'crepue',
        density: profile.density || 'forte',
        scalp_condition: profile.scalp_condition || 'sec',
        skin_type: profile.skin_type || 'mixte',
        sensitivity: profile.sensitivity || 'moyenne',
        budget: profile.budget || '40_70',
      });
    }
  }, [profile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderSuccess = params.get('order_success') === 'true';
    const sId = params.get('session_id');

    if (orderSuccess || sId) {
      if (!sId) {
        setMissingSessionError(true);
      } else {
        setIsOrderSuccess(true);
        setSessionId(sId);
      }
      setActiveTab('commandes');
    }

    loadUserData();
  }, [user, profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateProfile(formData);
    setSaving(false);
    if (res.success) {
      setActionMessage('Votre profil public.profiles a été mis à jour dans Supabase !');
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleMarkNotifRead = async (notifId: string) => {
    await fetch(`/api/notifications/${notifId}/read`, { method: 'POST', headers: authHeaders });
    loadUserData();
  };

  const handleDeleteNotif = async (notifId: string) => {
    await fetch(`/api/notifications/${notifId}`, { method: 'DELETE', headers: authHeaders });
    loadUserData();
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/notification-preferences', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(notifPrefs)
    });
    setActionMessage('Préférences de notification enregistrées avec succès.');
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketForm.subject || !newTicketForm.message) return;
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: newTicketForm.subject,
        category: newTicketForm.category,
        orderId: newTicketForm.orderId || undefined,
        message: newTicketForm.message
      })
    });
    if (res.ok) {
      setShowNewTicketModal(false);
      setNewTicketForm({ subject: '', category: 'order', message: '', orderId: '' });
      loadUserData();
      setActionMessage('Votre ticket support a été soumis. Notre équipe vous répondra rapidement.');
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const loadTicketMessages = (tkt: any) => {
    setSelectedTicket(tkt);
    fetch(`/api/support/tickets/${tkt.id}/messages`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => data.messages && setTicketMessages(data.messages));
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: replyText })
    });
    if (res.ok) {
      setReplyText('');
      loadTicketMessages(selectedTicket);
    }
  };

  const handleRequestReturn = async (orderId: string) => {
    const order = serverOrders.find(o => o.id === orderId);
    if (!order) return;
    const items = order.items.map((i: any) => ({
      productId: i.productId || i.id,
      quantity: i.quantity,
      reason: returnReason
    }));

    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        reason: returnReason,
        comment: returnComment,
        items
      })
    });
    if (res.ok) {
      setShowReturnModal(null);
      setReturnComment('');
      loadUserData();
      setActionMessage(`Demande de retour pour la commande #${orderId} enregistrée.`);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (user?.email?.split('@')[0] || 'Client KURLA');
  const userInitials = profile?.first_name ? profile.first_name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'K');
  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Missing Session Error Banner */}
        {missingSessionError && (
          <div className="p-6 rounded-3xl bg-rose-950/80 border border-rose-500/40 space-y-3 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-300">
              <AlertCircle className="w-6 h-6 shrink-0 text-rose-400" />
              <h2 className="text-lg font-serif-title font-bold text-white">Erreur de retour de commande</h2>
            </div>
            <p className="text-sm text-rose-200/90 leading-relaxed font-light">
              L'identifiant de session Stripe (session_id) est manquant. La commande n'a pas pu être associée à une session valide.
            </p>
          </div>
        )}

        {/* Payment Confirmation Status Banner */}
        {isOrderSuccess && (
          <div className="p-6 rounded-3xl bg-[#1D170E] border border-[#C8753D]/40 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#D49A63]">
              <Clock className="w-6 h-6 shrink-0 text-[#C8753D]" />
              <h2 className="text-lg font-serif-title font-bold text-[#FFF7EF]">Paiement transmis (Mode Test)</h2>
            </div>
            <p className="text-sm text-[#FFF7EF]/90 leading-relaxed font-light">
              « Votre paiement de test a été transmis. La confirmation définitive de la commande sera activée lorsque le webhook Stripe sera configuré. »
            </p>
            {sessionId && (
              <p className="text-xs font-mono text-[#D49A63] bg-[#050403] px-3 py-1.5 rounded-lg inline-block border border-[#FFF7EF]/10">
                Session Stripe: {sessionId}
              </p>
            )}
          </div>
        )}

        {actionMessage && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" /> {actionMessage}
          </div>
        )}

        {/* Profile Card Header */}
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#3A2218] via-[#C8753D] to-[#D49A63] flex items-center justify-center text-white font-serif-title font-bold text-2xl border-2 border-[#FFF7EF]/20 shadow-lg">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">{displayName}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#C8753D]/20 text-[#D49A63] text-[10px] font-mono font-bold uppercase border border-[#C8753D]/30">
                  {profile?.role || 'customer'}
                </span>
              </div>
              <p className="text-xs text-[#D49A63] mt-1">
                Diagnostic Capillaire ({formData.hair_type || '4C'}) • Peau ({formData.skin_type || 'mixte'})
              </p>
              <p className="text-xs text-[#FFF7EF]/50 mt-0.5">{userEmail}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/diagnostic/cheveux"
              className="px-4 py-2.5 rounded-full bg-[#050403] hover:bg-[#C8753D] text-xs font-semibold text-[#FFF7EF] border border-[#FFF7EF]/15 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#C8753D]" /> Refaire Diagnostic
            </a>
            <button
              onClick={signOut}
              className="px-4 py-2.5 rounded-full bg-rose-950/40 hover:bg-rose-900/60 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" /> Déconnexion
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#FFF7EF]/10 pb-3 overflow-x-auto">
          {[
            { id: 'commandes', label: `Commandes (${serverOrders.length})`, icon: ShoppingBag },
            { id: 'notifications', label: `Notifications (${unreadNotifsCount})`, icon: Bell },
            { id: 'support', label: `Support Client (${supportTickets.length})`, icon: MessageSquare },
            { id: 'preferences', label: 'Préférences Emails', icon: Settings },
            { id: 'profil', label: 'Mon Profil Capillaire', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? 'bg-[#C8753D] text-white shadow-lg'
                    : 'bg-[#1A0F0A] text-[#FFF7EF]/60 hover:text-white border border-[#FFF7EF]/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: COMMANDES WITH TRACKING & RETURN REQUESTS */}
        {activeTab === 'commandes' && (
          <div className="space-y-6">
            {serverOrders.length > 0 ? (
              <div className="space-y-4">
                {serverOrders.map((order) => {
                  const shipment = shipmentsMap[order.id];
                  const returnReq = returnsList.find(r => r.orderId === order.id);

                  return (
                    <div key={order.id} className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FFF7EF]/5 pb-3">
                        <div>
                          <span className="text-xs text-[#D49A63] font-semibold font-mono">{order.id}</span>
                          <p className="text-xs text-[#FFF7EF]/50 mt-0.5">
                            Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} • {Number(order.total).toFixed(2)} €
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            order.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            order.status === 'shipped' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                            order.status === 'delivered' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            order.status === 'refunded' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs text-[#FFF7EF]/90 py-1">
                            <span>{item.quantity}x {item.name || 'Soin Capillaire KURLA'}</span>
                            <span className="font-mono text-[#D49A63]">{item.price ? Number(item.price).toFixed(2) : '0.00'} €</span>
                          </div>
                        ))}
                      </div>

                      {/* Shipment Tracking Info */}
                      {shipment && (
                        <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#D49A63] flex items-center gap-1.5">
                              <Truck className="w-4 h-4 text-[#C8753D]" /> Suivi Colis Transporteur ({shipment.carrier?.toUpperCase()})
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">{shipment.status}</span>
                          </div>
                          {shipment.trackingNumber && (
                            <p className="text-[11px] text-[#FFF7EF]/70 font-mono">
                              N° Suivi: {shipment.trackingNumber}
                            </p>
                          )}
                          {shipment.trackingUrl && shipment.trackingUrl !== '#' && (
                            <a
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#C8753D] hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              Suivre mon colis sur le site du transporteur <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Return Request Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#FFF7EF]/5">
                        {returnReq ? (
                          <span className="text-xs font-semibold text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/30">
                            Demande de retour #{returnReq.id} ({returnReq.status})
                          </span>
                        ) : (
                          (order.status === 'delivered' || order.status === 'shipped' || order.status === 'paid') && (
                            <button
                              onClick={() => setShowReturnModal(order.id)}
                              className="px-4 py-1.5 rounded-full bg-[#050403] hover:bg-[#3A2218] border border-[#FFF7EF]/15 text-xs text-[#D49A63] font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Effectuer une demande de retour / remboursement
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-center space-y-3 shadow-xl">
                <ShoppingBag className="w-12 h-12 text-[#C8753D] mx-auto opacity-70" />
                <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF]">Aucune commande effectuée</h3>
                <p className="text-xs text-[#FFF7EF]/60 max-w-sm mx-auto">
                  Découvrez notre boutique de soins naturels adaptés à votre texture capillaire.
                </p>
                <div className="pt-2">
                  <a href="/boutique" className="px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#B3632F] text-white text-xs font-bold uppercase tracking-wider inline-block shadow-lg">
                    Visiter la Boutique KURLA
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IN-APP NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
            <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#C8753D]" /> Mes Notifications & Alertes Commande
            </h2>

            {notifications.length === 0 ? (
              <p className="text-xs text-[#FFF7EF]/40 italic">Aucune notification pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                      n.isRead ? 'bg-[#050403] border-[#FFF7EF]/5 opacity-70' : 'bg-[#1D170E] border-[#C8753D]/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-[#FFF7EF]">{n.title}</h4>
                      <p className="text-xs text-[#FFF7EF]/80">{n.message}</p>
                      <span className="text-[10px] text-[#D49A63] font-mono block">
                        {new Date(n.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkNotifRead(n.id)}
                          className="p-1.5 rounded-full bg-[#050403] hover:bg-[#3A2218] text-emerald-400 border border-emerald-500/30 text-xs"
                          title="Marquer comme lu"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotif(n.id)}
                        className="p-1.5 rounded-full bg-[#050403] hover:bg-rose-950 text-rose-400 border border-rose-500/30 text-xs"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CUSTOMER SUPPORT TICKETS */}
        {activeTab === 'support' && (
          <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#FFF7EF]/10 pb-4">
              <div>
                <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#C8753D]" /> Support Client & Réclamations
                </h2>
                <p className="text-xs text-[#FFF7EF]/60">Discutez directement avec l'équipe support KURLA.</p>
              </div>

              <button
                onClick={() => setShowNewTicketModal(true)}
                className="px-5 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#B3632F] text-white text-xs font-bold shadow flex items-center gap-1.5"
              >
                + Nouveau Ticket
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tickets list */}
              <div className="space-y-3 lg:col-span-1">
                {supportTickets.length === 0 ? (
                  <p className="text-xs text-[#FFF7EF]/40 italic">Aucun ticket créé.</p>
                ) : (
                  supportTickets.map(tkt => (
                    <div
                      key={tkt.id}
                      onClick={() => loadTicketMessages(tkt)}
                      className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                        selectedTicket?.id === tkt.id
                          ? 'bg-[#3A2218]/40 border-[#C8753D]'
                          : 'bg-[#050403] border-[#FFF7EF]/5 hover:border-[#FFF7EF]/20'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-[#FFF7EF] truncate">{tkt.subject}</h4>
                      <p className="text-[11px] text-[#D49A63]">Statut: {tkt.status}</p>
                      <span className="text-[10px] text-[#FFF7EF]/40 font-mono block mt-1">#{tkt.id}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Message thread */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-4">
                {!selectedTicket ? (
                  <div className="h-48 flex items-center justify-center text-xs text-[#FFF7EF]/40 italic">
                    Sélectionnez un ticket pour afficher les échanges.
                  </div>
                ) : (
                  <>
                    <div className="border-b border-[#FFF7EF]/10 pb-3">
                      <h3 className="text-sm font-bold text-[#FFF7EF]">{selectedTicket.subject}</h3>
                      <p className="text-xs text-[#D49A63]">Catégorie: {selectedTicket.subjectCategory} • Statut: {selectedTicket.status}</p>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {ticketMessages.map(m => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-2xl max-w-[80%] text-xs ${
                            m.senderRole === 'customer'
                              ? 'ml-auto bg-[#C8753D]/20 border border-[#C8753D]/40 text-[#FFF7EF]'
                              : 'bg-[#1A0F0A] border border-[#FFF7EF]/10 text-[#FFF7EF]/90'
                          }`}
                        >
                          <div className="text-[10px] opacity-70 mb-0.5 font-bold uppercase">{m.senderRole}</div>
                          <p>{m.message}</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendReply} className="flex gap-2 pt-3 border-t border-[#FFF7EF]/10">
                      <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Répondre au ticket..."
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

        {/* TAB 4: NOTIFICATION PREFERENCES */}
        {activeTab === 'preferences' && (
          <form onSubmit={handleSavePreferences} className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
            <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#C8753D]" /> Préférences de Communication & Email
            </h2>

            <div className="space-y-4 max-w-xl">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[#FFF7EF] block">Emails de Suivi de Commande</span>
                  <span className="text-[11px] text-[#FFF7EF]/50">Recevez les confirmations et étapes de livraison.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.emailOrderUpdates}
                  onChange={e => setNotifPrefs({ ...notifPrefs, emailOrderUpdates: e.target.checked })}
                  className="w-4 h-4 accent-[#C8753D]"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[#FFF7EF] block">Réponses Support Client</span>
                  <span className="text-[11px] text-[#FFF7EF]/50">Notification email lorsque l'équipe répond à vos tickets.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.emailSupportReplies}
                  onChange={e => setNotifPrefs({ ...notifPrefs, emailSupportReplies: e.target.checked })}
                  className="w-4 h-4 accent-[#C8753D]"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[#FFF7EF] block">Notifications In-App</span>
                  <span className="text-[11px] text-[#FFF7EF]/50">Alertes visuelles directement dans votre espace client.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.inAppAlerts}
                  onChange={e => setNotifPrefs({ ...notifPrefs, inAppAlerts: e.target.checked })}
                  className="w-4 h-4 accent-[#C8753D]"
                />
              </label>
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#C8753D] hover:bg-[#B3632F] text-white text-xs font-bold uppercase tracking-wider shadow"
            >
              Enregistrer les Préférences
            </button>
          </form>
        )}

        {/* TAB 5: PROFILE FORM */}
        {activeTab === 'profil' && (
          <form onSubmit={handleSaveProfile} className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-6 shadow-xl">
            <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF]">Éditer mon Profil Supabase</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#D49A63] mb-1">Prénom</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#D49A63] mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-[#C8753D] hover:bg-[#B3632F] text-white text-xs font-bold uppercase tracking-wider shadow"
            >
              {saving ? 'Enregistrement...' : 'Sauvegarder le profil'}
            </button>
          </form>
        )}

        {/* NEW TICKET MODAL */}
        {showNewTicketModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="max-w-md w-full p-6 rounded-3xl bg-[#1A0F0A] border border-[#C8753D]/40 space-y-4 shadow-2xl">
              <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF]">Ouvrir un Ticket Support</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#D49A63] mb-1 font-semibold">Sujet</label>
                  <input
                    type="text"
                    required
                    value={newTicketForm.subject}
                    onChange={e => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                    placeholder="Ex: Question sur la livraison de ma commande"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF]"
                  />
                </div>
                <div>
                  <label className="block text-[#D49A63] mb-1 font-semibold">Catégorie</label>
                  <select
                    value={newTicketForm.category}
                    onChange={e => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF]"
                  >
                    <option value="order">Commande & Suivi</option>
                    <option value="shipping">Livraison & Colis</option>
                    <option value="returns">Retour & Remboursement</option>
                    <option value="routine_advice">Conseil Routine Beauté</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#D49A63] mb-1 font-semibold">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={newTicketForm.message}
                    onChange={e => setNewTicketForm({ ...newTicketForm, message: e.target.value })}
                    placeholder="Décrivez votre demande..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTicketModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#050403] text-[#FFF7EF]/70 border border-[#FFF7EF]/10"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#C8753D] hover:bg-[#B3632F] text-white font-bold"
                  >
                    Soumettre le Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RETURN REQUEST MODAL */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="max-w-md w-full p-6 rounded-3xl bg-[#1A0F0A] border border-[#C8753D]/40 space-y-4 shadow-2xl">
              <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF]">Demande de Retour - #{showReturnModal}</h3>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#D49A63] mb-1 font-semibold">Raison du retour</label>
                  <select
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF]"
                  >
                    <option value="defect">Produit endommagé / défectueux</option>
                    <option value="wrong_item">Mauvais article reçu</option>
                    <option value="changed_mind">Rétractation (changement d'avis)</option>
                    <option value="other">Autre motif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#D49A63] mb-1 font-semibold">Commentaire explicatif</label>
                  <textarea
                    rows={3}
                    value={returnComment}
                    onChange={e => setReturnComment(e.target.value)}
                    placeholder="Précisez le problème..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(null)}
                    className="px-4 py-2 rounded-xl bg-[#050403] text-[#FFF7EF]/70 border border-[#FFF7EF]/10"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestReturn(showReturnModal)}
                    className="px-5 py-2 rounded-xl bg-[#C8753D] font-bold text-white"
                  >
                    Confirmer la Demande
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
