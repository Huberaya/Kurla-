import React, { useMemo, useState } from 'react';
import { Bell, BookOpen, CircleDollarSign, FileText, FolderTree, Image, KeyRound, Layers3, ListChecks, MessageSquare, PackageCheck, Pencil, Plus, ReceiptText, Save, Send, ShieldCheck, Tag, Truck, UserCog, Users, X } from 'lucide-react';

type Props = {
  dashboard: any;
  headers: HeadersInit;
  onReload: () => void;
};

type OperationSection = 'brands' | 'categories' | 'payments' | 'shipments' | 'users' | 'articles' | 'ai' | 'reviews' | 'coupons' | 'notifications' | 'logs';

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF] text-xs placeholder:text-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]';
const buttonClass = 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#C8753D] hover:bg-[#D49A63] text-white text-xs font-semibold disabled:opacity-40';
const mutedButtonClass = 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 hover:border-[#C8753D]/60 text-[#FFF7EF]/80 text-xs font-semibold disabled:opacity-40';

function emptyArticle() {
  return { title: '', slug: '', category: '', excerpt: '', readTime: '', author: '', imageUrl: '', content: '', status: 'draft' };
}
function emptySource() {
  return { title: '', domains: '', sourceLabel: '', evidenceUrl: '', content: '', validationStatus: 'pending', active: false };
}
function emptyCoupon() {
  return { code: '', description: '', discountType: 'percentage', discountValue: '', minimumOrderAmount: '0', maxUses: '', startsAt: '', endsAt: '', active: false };
}

export const AdminOperationsPanel: React.FC<Props> = ({ dashboard, headers, onReload }) => {
  const [section, setSection] = useState<OperationSection>('brands');
  const [filter, setFilter] = useState('');
  const matches = (...values: any[]) => {
    const term = filter.trim().toLocaleLowerCase('fr-FR');
    return !term || values.filter(Boolean).some(value => String(value).toLocaleLowerCase('fr-FR').includes(term));
  };
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [brandForm, setBrandForm] = useState({ name: '', logoUrl: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' });
  const [articleForm, setArticleForm] = useState<any>(emptyArticle());
  const [sourceForm, setSourceForm] = useState<any>(emptySource());
  const [couponForm, setCouponForm] = useState<any>(emptyCoupon());
  const [notificationForm, setNotificationForm] = useState({ userId: '', type: 'account_created', title: '', message: '', link: '' });
  const [shipmentDrafts, setShipmentDrafts] = useState<Record<string, any>>({});
  const [shipmentHistories, setShipmentHistories] = useState<Record<string, any[]>>({});
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const rows = dashboard || {};
  const users = Array.isArray(rows.users) ? rows.users : [];
  const notifications = Array.isArray(rows.notifications) ? rows.notifications : [];
  const shipments = Array.isArray(rows.shipments) ? rows.shipments : [];

  const run = async (key: string, request: RequestInit & { url: string }, success = 'Modification enregistrée.') => {
    setBusy(key);
    setMessage('');
    try {
      const { url, ...init } = request;
      const mergedHeaders = new Headers(headers);
      if (request.headers) new Headers(request.headers).forEach((value, name) => mergedHeaders.set(name, value));
      const response = await fetch(url, { ...init, headers: mergedHeaders });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Opération refusée.');
      setMessage(success);
      onReload();
      return data;
    } catch (error: any) {
      setMessage(error.message || 'Opération refusée.');
      return null;
    } finally {
      setBusy('');
    }
  };

  const loadShipmentHistory = async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/shipments/${orderId}/history`, { headers });
      const data = await response.json();
      if (response.ok) setShipmentHistories(prev => ({ ...prev, [orderId]: data.history || [] }));
    } catch {
      setMessage('Historique de livraison indisponible.');
    }
  };

  const saveEntity = async (entity: string, value: any, id?: string) => {
    const result = await run(`save-${entity}`, {
      url: id ? `/api/admin/entities/${entity}/${id}` : `/api/admin/entities/${entity}`,
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(value)
    });
    if (result) {
      if (entity === 'article') setArticleForm(emptyArticle());
      if (entity === 'ai_source') setSourceForm(emptySource());
      if (entity === 'coupon') setCouponForm(emptyCoupon());
    }
  };

  const nav = [
    ['brands', 'Marques', Tag], ['categories', 'Catégories', FolderTree], ['payments', 'Paiements', CircleDollarSign],
    ['shipments', 'Livraisons', Truck], ['users', 'Utilisateurs & rôles', UserCog], ['articles', 'Articles', FileText],
    ['ai', 'Sources IA', BookOpen], ['reviews', 'Avis', MessageSquare], ['coupons', 'Coupons', ReceiptText],
    ['notifications', 'Notifications', Bell], ['logs', 'Logs', ListChecks]
  ] as const;

  const sectionTitle = nav.find(([id]) => id === section)?.[1] || 'Gestion';
  const renderEmpty = (text: string) => <p className="text-xs text-[#FFF7EF]/45 italic">{text}</p>;

  const renderBrands = () => (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-3">
        {rows.brands?.length ? rows.brands.filter((brand: any) => matches(brand.name, brand.description)).map((brand: any) => <div key={brand.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold">{brand.name}</p><p className="text-[11px] text-[#FFF7EF]/45">{brand.description || 'Description non renseignée.'}</p></div>
          <button className={mutedButtonClass} onClick={() => { setEditingBrand(brand); setBrandForm({ name: brand.name || '', logoUrl: brand.logo_url || '', description: brand.description || '' }); }}><Pencil className="w-3.5 h-3.5" /> Modifier</button>
        </div>) : renderEmpty('Aucune marque enregistrée dans Supabase.')}
      </div>
      <form className="p-5 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-3" onSubmit={e => { e.preventDefault(); saveEntity('brand', brandForm, editingBrand?.id); }}>
        <h3 className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-[#D49A63]" /> {editingBrand ? 'Modifier la marque' : 'Ajouter une marque'}</h3>
        <input className={inputClass} placeholder="Nom obligatoire" value={brandForm.name} onChange={e => setBrandForm({ ...brandForm, name: e.target.value })} />
        <input className={inputClass} placeholder="URL du logo (facultatif)" value={brandForm.logoUrl} onChange={e => setBrandForm({ ...brandForm, logoUrl: e.target.value })} />
        <textarea className={inputClass} rows={3} placeholder="Description non obligatoire" value={brandForm.description} onChange={e => setBrandForm({ ...brandForm, description: e.target.value })} />
        <div className="flex gap-2"><button className={buttonClass} disabled={busy === 'save-brand'}><Save className="w-3.5 h-3.5" /> Enregistrer</button>{editingBrand && <button type="button" className={mutedButtonClass} onClick={() => { setEditingBrand(null); setBrandForm({ name: '', logoUrl: '', description: '' }); }}><X className="w-3.5 h-3.5" /> Annuler</button>}</div>
      </form>
    </div>
  );

  const renderCategories = () => (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-3">
        {rows.categories?.length ? rows.categories.filter((category: any) => matches(category.name, category.slug, category.description)).map((category: any) => <div key={category.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{category.name}</p><p className="text-[11px] font-mono text-[#D49A63]">{category.slug}</p></div><button className={mutedButtonClass} onClick={() => { setEditingCategory(category); setCategoryForm({ name: category.name || '', slug: category.slug || '', description: category.description || '' }); }}><Pencil className="w-3.5 h-3.5" /> Modifier</button></div>) : renderEmpty('Aucune catégorie métier enregistrée.')}
      </div>
      <form className="p-5 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-3" onSubmit={e => { e.preventDefault(); saveEntity('category', categoryForm, editingCategory?.id); }}>
        <h3 className="text-sm font-semibold flex items-center gap-2"><FolderTree className="w-4 h-4 text-[#D49A63]" /> {editingCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'}</h3>
        <input className={inputClass} placeholder="Nom obligatoire" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} />
        <input className={inputClass} placeholder="slug-obligatoire" value={categoryForm.slug} onChange={e => setCategoryForm({ ...categoryForm, slug: e.target.value })} />
        <textarea className={inputClass} rows={3} placeholder="Description" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} />
        <div className="flex gap-2"><button className={buttonClass} disabled={busy === 'save-category'}><Save className="w-3.5 h-3.5" /> Enregistrer</button>{editingCategory && <button type="button" className={mutedButtonClass} onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', slug: '', description: '' }); }}><X className="w-3.5 h-3.5" /> Annuler</button>}</div>
      </form>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-3">{rows.payments?.length ? rows.payments.filter((payment: any) => matches(payment.id, payment.order_id, payment.status, payment.stripe_payment_intent_id)).map((payment: any) => <div key={payment.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 grid md:grid-cols-[1fr_auto_auto] items-center gap-3"><div><p className="text-sm font-semibold">{Number(payment.amount || 0).toFixed(2)} {payment.currency || 'EUR'}</p><p className="text-[11px] text-[#FFF7EF]/45 font-mono">Commande {payment.order_id || 'non renseignée'} · {payment.stripe_payment_intent_id || 'sans identifiant Stripe'}</p></div><span className="text-[11px] text-[#D49A63]">{payment.status}</span><select className={inputClass + ' md:w-44'} value={payment.status} onChange={e => run(`payment-${payment.id}`, { url: `/api/admin/payments/${payment.id}/status`, method: 'POST', body: JSON.stringify({ status: e.target.value }) })}><option value="pending">pending</option><option value="succeeded">succeeded</option><option value="failed">failed</option><option value="partially_refunded">partially_refunded</option><option value="refunded">refunded</option></select></div>) : renderEmpty('Aucun paiement persistant.')}</div>
  );

  const shipmentValue = (shipment: any) => shipmentDrafts[shipment.id] || {
    carrier: shipment.carrier || 'manual',
    status: shipment.status || 'preparing',
    method: shipment.method || 'standard',
    price: shipment.tariff ?? shipment.price ?? '',
    trackingNumber: shipment.tracking_number || shipment.trackingNumber || '',
    trackingUrl: shipment.tracking_url || shipment.trackingUrl || '',
    eventLocation: '',
    eventDescription: ''
  };
  const renderShipments = () => (
    <div className="space-y-3">{shipments.length ? shipments.filter((shipment: any) => matches(shipment.id, shipment.orderId, shipment.order_id, shipment.status, shipment.tracking_number, shipment.trackingNumber, shipment.country)).map((shipment: any) => { const draft = shipmentValue(shipment); const address = shipment.address || shipment.delivery_address; return <div key={shipment.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm font-semibold">Commande <span className="font-mono">{shipment.orderId || shipment.order_id}</span></p><p className="text-[11px] text-[#FFF7EF]/50">{address ? `${address.fullName}, ${address.street}, ${address.postalCode} ${address.city} · ${address.country}` : 'Adresse de livraison non renseignée.'}</p></div><span className="text-[11px] text-[#D49A63]">{shipment.status}</span></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2"><select className={inputClass} value={draft.carrier} onChange={e => setShipmentDrafts({ ...shipmentDrafts, [shipment.id]: { ...draft, carrier: e.target.value } })}><option value="manual">manual</option><option value="colissimo">colissimo</option><option value="mondial_relay">mondial_relay</option><option value="chronopost">chronopost</option><option value="dhl">dhl</option><option value="autre">autre</option></select><select className={inputClass} value={draft.status} onChange={e => setShipmentDrafts({ ...shipmentDrafts, [shipment.id]: { ...draft, status: e.target.value } })}><option value="preparing">preparing</option><option value="label_created">label_created</option><option value="shipped">shipped</option><option value="in_transit">in_transit</option><option value="out_for_delivery">out_for_delivery</option><option value="delivered">delivered</option><option value="failed">failed</option></select><input className={inputClass} placeholder="Méthode" value={draft.method} onChange={e => setShipmentDrafts({ ...shipmentDrafts, [shipment.id]: { ...draft, method: e.target.value } })} /><input className={inputClass} type="number" min="0" step="0.01" placeholder="Tarif (€)" value={draft.price} onChange={e => setShipmentDrafts({ ...shipmentDrafts, [shipment.id]: { ...draft, price: e.target.value } })} /><input className={inputClass} placeholder="N° réel de suivi" value={draft.trackingNumber} onChange={e => setShipmentDrafts({ ...shipmentDrafts, [shipment.id]: { ...draft, trackingNumber: e.target.value } })} /><input className={inputClass} placeholder="URL de suivi (facultative)" value={draft.trackingUrl} onChange={e => setShipmentDrafts({ ...shipmentDrafts, [shipment.id]: { ...draft, trackingUrl: e.target.value } })} /><input className={inputClass} placeholder="Lieu de l’événement" value={draft.eventLocation} onChange={e => setShipmentDrafts({ ...shipmentDrafts, [shipment.id]: { ...draft, eventLocation: e.target.value } })} /><input className={inputClass} placeholder="Description de l’événement" value={draft.eventDescription} onChange={e => setShipmentDrafts({ ...shipmentDrafts, [shipment.id]: { ...draft, eventDescription: e.target.value } })} /></div>
      {shipmentHistories[shipment.orderId || shipment.order_id] && <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-1"><p className="text-[10px] uppercase text-[#FFF7EF]/45 font-bold">Historique des événements</p>{shipmentHistories[shipment.orderId || shipment.order_id].map((event: any) => <p key={event.id} className="text-[11px] text-[#FFF7EF]/65"><span className="font-mono text-[#D49A63]">{new Date(event.createdAt).toLocaleString('fr-FR')}</span> · {event.status}{event.location ? ` · ${event.location}` : ''}{event.description ? ` — ${event.description}` : ''}</p>)}</div>}<div className="flex flex-wrap gap-2"><button type="button" className={mutedButtonClass} onClick={() => loadShipmentHistory(shipment.orderId || shipment.order_id)}>Voir l’historique</button><p className="text-[11px] text-[#FFF7EF]/45 self-center">Le statut expédié/en transit/livré exige le numéro réel saisi par l’opérateur. Aucun suivi n’est généré automatiquement.</p></div><button className={buttonClass} onClick={() => run(`shipment-${shipment.id}`, { url: `/api/admin/shipments/${shipment.orderId || shipment.order_id}`, method: 'PATCH', body: JSON.stringify(draft) })}><Truck className="w-3.5 h-3.5" /> Enregistrer et journaliser</button></div>; }) : renderEmpty('Aucune expédition enregistrée. Les expéditions sont créées depuis une commande.')}</div>
  );

  const renderUsers = () => (
    <div className="space-y-3">{users.length ? users.filter((user: any) => matches(user.email, user.full_name, user.role, user.id)).map((user: any) => <div key={user.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 grid md:grid-cols-[1fr_auto] items-center gap-3"><div><p className="text-sm font-semibold">{user.full_name || 'Nom non renseigné'}</p><p className="text-[11px] text-[#FFF7EF]/50">{user.email} · créé le {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'date absente'}</p></div><div className="flex items-center gap-2"><span className="text-[10px] text-[#FFF7EF]/45">{user.role}</span><select className={inputClass + ' w-40'} value={user.role} onChange={e => run(`user-${user.id}`, { url: `/api/admin/users/${user.id}/role`, method: 'POST', body: JSON.stringify({ role: e.target.value }) }, 'Rôle utilisateur mis à jour.') }><option value="customer">customer</option><option value="professional">professional</option><option value="support">support</option><option value="editor">editor</option><option value="admin">admin</option><option value="superadmin">superadmin</option></select></div></div>) : renderEmpty('Aucun profil utilisateur chargé.')}</div>
  );

  const renderArticles = () => (
    <div className="grid xl:grid-cols-[1fr_430px] gap-6"><div className="space-y-3">{rows.articles?.length ? rows.articles.filter((article: any) => matches(article.title, article.slug, article.status, article.category)).map((article: any) => <div key={article.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 flex justify-between gap-3"><div><p className="text-sm font-semibold">{article.title}</p><p className="text-[11px] text-[#D49A63]">/{article.slug} · {article.status}</p></div><button className={mutedButtonClass} onClick={() => setArticleForm({ ...article })}><Pencil className="w-3.5 h-3.5" /> Modifier</button></div>) : renderEmpty('Aucun article persistant. Créez un brouillon pour commencer.')}</div><form className="p-5 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2.5" onSubmit={e => { e.preventDefault(); saveEntity('article', { ...articleForm, relatedProductIds: articleForm.relatedProductIds || [] }, articleForm.id); }}><h3 className="text-sm font-semibold">{articleForm.id ? 'Modifier un article' : 'Nouvel article éditorial'}</h3><input className={inputClass} placeholder="Titre" value={articleForm.title} onChange={e => setArticleForm({ ...articleForm, title: e.target.value })} /><input className={inputClass} placeholder="slug-de-l-article" value={articleForm.slug} onChange={e => setArticleForm({ ...articleForm, slug: e.target.value })} /><div className="grid grid-cols-2 gap-2"><input className={inputClass} placeholder="Catégorie" value={articleForm.category} onChange={e => setArticleForm({ ...articleForm, category: e.target.value })} /><select className={inputClass} value={articleForm.status} onChange={e => setArticleForm({ ...articleForm, status: e.target.value })}><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></div><input className={inputClass} placeholder="Auteur (facultatif)" value={articleForm.author} onChange={e => setArticleForm({ ...articleForm, author: e.target.value })} /><input className={inputClass} placeholder="URL image facultative" value={articleForm.imageUrl} onChange={e => setArticleForm({ ...articleForm, imageUrl: e.target.value })} /><input className={inputClass} placeholder="Temps de lecture (facultatif)" value={articleForm.readTime} onChange={e => setArticleForm({ ...articleForm, readTime: e.target.value })} /><textarea className={inputClass} rows={2} placeholder="Extrait" value={articleForm.excerpt} onChange={e => setArticleForm({ ...articleForm, excerpt: e.target.value })} /><textarea className={inputClass} rows={8} placeholder="Contenu éditorial obligatoire" value={articleForm.content} onChange={e => setArticleForm({ ...articleForm, content: e.target.value })} /><div className="flex gap-2"><button className={buttonClass}><Save className="w-3.5 h-3.5" /> Enregistrer l’article</button>{articleForm.id && <button type="button" className={mutedButtonClass} onClick={() => setArticleForm(emptyArticle())}>Nouveau</button>}</div></form></div>
  );

  const renderSources = () => (
    <div className="grid xl:grid-cols-[1fr_430px] gap-6"><div className="space-y-3">{rows.aiSources?.length ? rows.aiSources.filter((source: any) => matches(source.title, source.sourceLabel, source.validationStatus, ...(source.domains || []))).map((source: any) => <div key={source.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 flex justify-between gap-3"><div><p className="text-sm font-semibold">{source.title}</p><p className="text-[11px] text-[#D49A63]">{source.sourceLabel} · {source.validationStatus}{source.active ? ' · active' : ''}</p><p className="text-[11px] text-[#FFF7EF]/40 mt-1">Domaines : {(source.domains || []).join(', ') || 'non renseignés'}</p></div><button className={mutedButtonClass} onClick={() => setSourceForm({ ...source, domains: (source.domains || []).join(', ') })}><Pencil className="w-3.5 h-3.5" /> Modifier</button></div>) : renderEmpty('Aucune source IA administrable. Les fiches statiques restent explicitement en revue interne.')}</div><form className="p-5 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2.5" onSubmit={e => { e.preventDefault(); saveEntity('ai_source', { ...sourceForm, domains: sourceForm.domains.split(',').map((item: string) => item.trim()).filter(Boolean) }, sourceForm.id); }}><h3 className="text-sm font-semibold">Source de connaissance IA</h3><input className={inputClass} placeholder="Titre" value={sourceForm.title} onChange={e => setSourceForm({ ...sourceForm, title: e.target.value })} /><input className={inputClass} placeholder="Domaines séparés par des virgules" value={sourceForm.domains} onChange={e => setSourceForm({ ...sourceForm, domains: e.target.value })} /><input className={inputClass} placeholder="Source / référence obligatoire" value={sourceForm.sourceLabel} onChange={e => setSourceForm({ ...sourceForm, sourceLabel: e.target.value })} /><input className={inputClass} placeholder="URL de preuve facultative" value={sourceForm.evidenceUrl} onChange={e => setSourceForm({ ...sourceForm, evidenceUrl: e.target.value })} /><textarea className={inputClass} rows={8} placeholder="Contenu source obligatoire" value={sourceForm.content} onChange={e => setSourceForm({ ...sourceForm, content: e.target.value })} /><div className="grid grid-cols-2 gap-2"><select className={inputClass} value={sourceForm.validationStatus} onChange={e => setSourceForm({ ...sourceForm, validationStatus: e.target.value, active: e.target.value !== 'validated' ? false : sourceForm.active })}><option value="pending">pending</option><option value="validated">validated</option><option value="rejected">rejected</option></select><label className="flex items-center gap-2 px-3 text-xs text-[#FFF7EF]/70"><input type="checkbox" checked={sourceForm.active === true} disabled={sourceForm.validationStatus !== 'validated'} onChange={e => setSourceForm({ ...sourceForm, active: e.target.checked })} /> Activer dans l’IA</label></div><button className={buttonClass}><Save className="w-3.5 h-3.5" /> Enregistrer la source</button></form></div>
  );

  const renderReviews = () => (
    <div className="space-y-3">{rows.reviews?.length ? rows.reviews.filter((review: any) => matches(review.id, review.product_id, review.productId, review.status, review.comment)).map((review: any) => <div key={review.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 grid md:grid-cols-[1fr_auto] gap-3"><div><p className="text-sm font-semibold">{review.rating}/5 · produit {review.product_id || review.productId}</p><p className="text-xs text-[#FFF7EF]/65 mt-1">{review.comment || 'Commentaire non renseigné.'}</p><p className="text-[11px] text-[#FFF7EF]/40 mt-1">{review.verified_purchase === true ? 'Achat vérifié' : 'Achat non vérifié — ne pas afficher comme vérifié'}</p></div><select className={inputClass + ' md:w-36'} value={review.status} onChange={e => run(`review-${review.id}`, { url: `/api/admin/reviews/${review.id}/status`, method: 'POST', body: JSON.stringify({ status: e.target.value }) }, 'Avis modéré.') }><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option></select></div>) : renderEmpty('Aucun avis à modérer.')}</div>
  );

  const renderCoupons = () => (
    <div className="grid xl:grid-cols-[1fr_430px] gap-6"><div className="space-y-3">{rows.coupons?.length ? rows.coupons.filter((coupon: any) => matches(coupon.code, coupon.description, coupon.active)).map((coupon: any) => <div key={coupon.code} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5 flex justify-between gap-3"><div><p className="text-sm font-mono font-semibold">{coupon.code} · {coupon.discountValue}{coupon.discountType === 'percentage' ? '%' : ` ${coupon.currency}`}</p><p className="text-[11px] text-[#FFF7EF]/45">Utilisations persistées : {coupon.usedCount} · {coupon.active ? 'actif' : 'inactif'}</p></div><button className={mutedButtonClass} onClick={() => setCouponForm({ ...coupon, maxUses: coupon.maxUses ?? '', startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : '', endsAt: coupon.endsAt ? coupon.endsAt.slice(0, 16) : '' })}><Pencil className="w-3.5 h-3.5" /> Modifier</button></div>) : renderEmpty('Aucun coupon persistant.')}</div><form className="p-5 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2.5" onSubmit={e => { e.preventDefault(); saveEntity('coupon', { ...couponForm, discountValue: Number(couponForm.discountValue), minimumOrderAmount: Number(couponForm.minimumOrderAmount || 0), maxUses: couponForm.maxUses === '' ? null : Number(couponForm.maxUses) }, couponForm.code && rows.coupons?.some((item: any) => item.code === couponForm.code) ? couponForm.code : undefined); }}><h3 className="text-sm font-semibold">Coupon</h3><input className={inputClass} placeholder="CODE" value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} /><input className={inputClass} placeholder="Description" value={couponForm.description} onChange={e => setCouponForm({ ...couponForm, description: e.target.value })} /><div className="grid grid-cols-2 gap-2"><select className={inputClass} value={couponForm.discountType} onChange={e => setCouponForm({ ...couponForm, discountType: e.target.value })}><option value="percentage">Pourcentage</option><option value="fixed_amount">Montant fixe</option></select><input className={inputClass} type="number" min="0.01" step="0.01" placeholder="Remise" value={couponForm.discountValue} onChange={e => setCouponForm({ ...couponForm, discountValue: e.target.value })} /></div><div className="grid grid-cols-2 gap-2"><input className={inputClass} type="number" min="0" step="0.01" placeholder="Minimum commande" value={couponForm.minimumOrderAmount} onChange={e => setCouponForm({ ...couponForm, minimumOrderAmount: e.target.value })} /><input className={inputClass} type="number" min="1" placeholder="Limite d’usage" value={couponForm.maxUses} onChange={e => setCouponForm({ ...couponForm, maxUses: e.target.value })} /></div><div className="grid grid-cols-2 gap-2"><input className={inputClass} type="datetime-local" value={couponForm.startsAt} onChange={e => setCouponForm({ ...couponForm, startsAt: e.target.value })} /><input className={inputClass} type="datetime-local" value={couponForm.endsAt} onChange={e => setCouponForm({ ...couponForm, endsAt: e.target.value })} /></div><label className="flex items-center gap-2 text-xs text-[#FFF7EF]/70"><input type="checkbox" checked={couponForm.active === true} onChange={e => setCouponForm({ ...couponForm, active: e.target.checked })} /> Activer ce coupon</label><button className={buttonClass}><Save className="w-3.5 h-3.5" /> Enregistrer le coupon</button></form></div>
  );

  const renderNotifications = () => (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6"><div className="space-y-3">{notifications.length ? notifications.filter((notification: any) => matches(notification.title, notification.message, notification.userId, notification.type)).slice(0, 100).map((notification: any) => <div key={notification.id} className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/5"><p className="text-sm font-semibold">{notification.title}</p><p className="text-xs text-[#FFF7EF]/60 mt-1">{notification.message}</p><p className="text-[10px] text-[#FFF7EF]/35 mt-2">Destinataire : {notification.userId} · {notification.read ? 'lue' : 'non lue'}</p></div>) : renderEmpty('Aucune notification persistante.')}</div><form className="p-5 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2.5" onSubmit={e => { e.preventDefault(); run('notification', { url: '/api/admin/notifications', method: 'POST', body: JSON.stringify(notificationForm) }, 'Notification envoyée.'); }}><h3 className="text-sm font-semibold">Envoyer une notification ciblée</h3><select className={inputClass} value={notificationForm.userId} onChange={e => setNotificationForm({ ...notificationForm, userId: e.target.value })}><option value="">Choisir un utilisateur</option>{users.map((user: any) => <option key={user.id} value={user.id}>{user.email}</option>)}</select><select className={inputClass} value={notificationForm.type} onChange={e => setNotificationForm({ ...notificationForm, type: e.target.value })}><option value="account_created">account_created</option><option value="payment_confirmed">payment_confirmed</option><option value="order_processing">order_processing</option><option value="order_shipped">order_shipped</option><option value="refund_created">refund_created</option><option value="support_reply">support_reply</option><option value="low_stock">low_stock</option><option value="routine_reminder">routine_reminder</option></select><input className={inputClass} placeholder="Titre" value={notificationForm.title} onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })} /><textarea className={inputClass} rows={5} placeholder="Message" value={notificationForm.message} onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })} /><input className={inputClass} placeholder="Lien interne facultatif" value={notificationForm.link} onChange={e => setNotificationForm({ ...notificationForm, link: e.target.value })} /><button className={buttonClass} disabled={busy === 'notification'}><Send className="w-3.5 h-3.5" /> Envoyer</button></form></div>
  );

  const renderLogs = () => (
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-[#FFF7EF]/10 text-[#D49A63]"><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Action</th><th className="py-3 pr-4">Administrateur</th><th className="py-3">Détails</th></tr></thead><tbody className="divide-y divide-[#FFF7EF]/5">{rows.logs?.length ? rows.logs.filter((log: any) => matches(log.action, log.user_id, log.userId, JSON.stringify(log.details))).map((log: any) => <tr key={log.id}><td className="py-3 pr-4 whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : log.createdAt}</td><td className="py-3 pr-4 font-mono text-[#D49A63]">{log.action}</td><td className="py-3 pr-4 font-mono text-[#FFF7EF]/55">{log.user_id || log.userId || 'système'}</td><td className="py-3 max-w-md truncate text-[#FFF7EF]/50">{JSON.stringify(log.details || {})}</td></tr>) : <tr><td colSpan={4} className="py-8 text-center text-[#FFF7EF]/45">Aucun log d’administration persistant.</td></tr>}</tbody></table></div>
  );

  const content = useMemo(() => {
    if (section === 'brands') return renderBrands();
    if (section === 'categories') return renderCategories();
    if (section === 'payments') return renderPayments();
    if (section === 'shipments') return renderShipments();
    if (section === 'users') return renderUsers();
    if (section === 'articles') return renderArticles();
    if (section === 'ai') return renderSources();
    if (section === 'reviews') return renderReviews();
    if (section === 'coupons') return renderCoupons();
    if (section === 'notifications') return renderNotifications();
    return renderLogs();
  }, [section, filter, rows, brandForm, categoryForm, articleForm, sourceForm, couponForm, notificationForm, shipmentDrafts, shipmentHistories, busy, message]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {nav.map(([id, label, Icon]) => <button key={id} onClick={() => setSection(id)} className={`px-3 py-2 rounded-xl text-[11px] font-semibold flex items-center gap-2 ${section === id ? 'bg-[#C8753D] text-white' : 'bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/65 hover:text-white'}`}><Icon className="w-3.5 h-3.5" />{label}</button>)}
      </div>
      <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-serif-title font-bold flex items-center gap-2"><Layers3 className="w-5 h-5 text-[#C8753D]" />{sectionTitle}</h2><p className="text-xs text-[#FFF7EF]/50 mt-1">Source : Supabase. Les mutations sensibles sont réservées aux rôles admin et journalisées.</p></div><div className="flex items-center gap-2"><input className={inputClass + ' sm:w-64'} placeholder="Filtrer cette section…" value={filter} onChange={e => setFilter(e.target.value)} />{message && <span className="text-xs text-[#D49A63] max-w-sm">{message}</span>}</div></div>
        {content}
      </div>
    </div>
  );
};
