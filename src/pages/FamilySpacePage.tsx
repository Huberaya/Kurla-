import React, { useEffect, useMemo, useState } from 'react';
import { Baby, CalendarDays, Check, Gift, Heart, LockKeyhole, Plus, Save, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FAMILY_AGE_BANDS, FAMILY_AGE_LABELS, FAMILY_PLAN_LABELS, familyAgeLabel, familyPlanLabel, isProductSuitableForAgeBand } from '../lib/familyProfiles';

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-[#111111] text-xs placeholder:text-[#111111]/35 focus:outline-none focus:border-[#C8753D]';
const buttonClass = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold disabled:opacity-40';
const mutedButtonClass = 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111]/75 text-xs font-semibold disabled:opacity-40';

type FamilyMember = {
  id: string;
  familyId: string;
  displayName: string;
  profileKind: 'adult' | 'child';
  ageBand: 'baby' | 'child' | 'teen' | 'adult';
  consentStatus: 'not_required' | 'pending' | 'granted' | 'revoked';
  consentAt?: string;
  carePreferences?: Record<string, string>;
};

type FamilyPlan = {
  id: string;
  familyId: string;
  title: string;
  planType: 'routine' | 'calendar' | 'gift';
  audience: 'shared' | 'selected';
  memberIds: string[];
  productIds: string[];
  schedule: Array<{ date?: string; label?: string; memberId?: string; status?: string }>;
  notes?: string;
  status: 'draft' | 'active' | 'archived';
};

const emptyMember = () => ({ displayName: '', profileKind: 'child', ageBand: 'child', parentalConsent: false, focus: '' });
const emptyPlan = (familyId: string) => ({ familyId, title: '', planType: 'routine', audience: 'shared', memberIds: [] as string[], productIds: [] as string[], scheduleText: '', notes: '', status: 'draft' });

export const FamilySpacePage: React.FC = () => {
  const { session } = useAuth();
  const [space, setSpace] = useState<any>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [plans, setPlans] = useState<FamilyPlan[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [memberForm, setMemberForm] = useState<any>(emptyMember());
  const [planForm, setPlanForm] = useState<any>(emptyPlan(''));
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const headers: HeadersInit = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  const minorMembers = members.filter(member => member.ageBand !== 'adult');
  const selectedPlanMembers = useMemo(() => planForm.audience === 'shared' ? members : members.filter(member => planForm.memberIds.includes(member.id)), [members, planForm.audience, planForm.memberIds]);
  const familyProducts = useMemo(() => products.filter(product => selectedPlanMembers.filter(member => member.ageBand !== 'adult').every(member => isProductSuitableForAgeBand(product, member.ageBand))), [products, selectedPlanMembers]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/family', { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Espace famille indisponible.');
      let nextSpace = data.spaces?.[0];
      if (!nextSpace) {
        const createResponse = await fetch('/api/family/spaces', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Ma famille' }) });
        const created = await createResponse.json();
        if (!createResponse.ok) throw new Error(created.error || 'Impossible de créer votre espace famille.');
        nextSpace = created.space;
      }
      setSpace(nextSpace);
      setMembers(data.spaces?.[0] ? (data.members || []).filter((member: FamilyMember) => member.familyId === nextSpace.id) : []);
      setPlans(data.spaces?.[0] ? (data.plans || []).filter((plan: FamilyPlan) => plan.familyId === nextSpace.id) : []);
      setPlanForm(current => ({ ...current, familyId: nextSpace.id }));
      const productResponse = await fetch('/api/family/products', { headers });
      const productData = await productResponse.json();
      if (productResponse.ok) setProducts(productData.products || []);
    } catch (error: any) {
      setMessage(error.message || 'Espace famille indisponible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session?.access_token]);

  const run = async (key: string, url: string, init: RequestInit, success: string) => {
    setBusy(key);
    setMessage('');
    try {
      const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}), 'Content-Type': 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Opération impossible.');
      setMessage(success);
      await load();
      return data;
    } catch (error: any) {
      setMessage(error.message || 'Opération impossible.');
      return null;
    } finally {
      setBusy('');
    }
  };

  const saveMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!space) return;
    const payload = { familyId: space.id, displayName: memberForm.displayName, profileKind: memberForm.profileKind, ageBand: memberForm.profileKind === 'adult' ? 'adult' : memberForm.ageBand, parentalConsent: memberForm.profileKind === 'child' ? memberForm.parentalConsent === true : false, carePreferences: memberForm.focus ? { focus: memberForm.focus } : {} };
    const result = await run('member', editingMemberId ? `/api/family/members/${editingMemberId}` : '/api/family/members', { method: editingMemberId ? 'PATCH' : 'POST', body: JSON.stringify(payload) }, 'Profil familial enregistré.');
    if (result) { setMemberForm(emptyMember()); setEditingMemberId(null); }
  };

  const editMember = (member: FamilyMember) => setMemberForm({ displayName: member.displayName, profileKind: member.profileKind, ageBand: member.ageBand, parentalConsent: member.consentStatus === 'granted', focus: member.carePreferences?.focus || '' });
  const revokeConsent = (member: FamilyMember) => run(`revoke-${member.id}`, `/api/family/members/${member.id}`, { method: 'PATCH', body: JSON.stringify({ familyId: member.familyId, displayName: member.displayName, profileKind: member.profileKind, ageBand: member.ageBand, parentalConsent: false, carePreferences: member.carePreferences || {} }) }, 'Consentement retiré. Les recommandations mineur sont verrouillées.');

  const togglePlanMember = (id: string) => setPlanForm((current: any) => ({ ...current, memberIds: current.memberIds.includes(id) ? current.memberIds.filter((item: string) => item !== id) : [...current.memberIds, id] }));
  const togglePlanProduct = (id: string) => setPlanForm((current: any) => ({ ...current, productIds: current.productIds.includes(id) ? current.productIds.filter((item: string) => item !== id) : [...current.productIds, id] }));

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    const schedule = String(planForm.scheduleText || '').split('\n').map((line: string) => {
      const [date, label, memberId] = line.split('|').map(item => item.trim());
      return { date, label, memberId, status: 'planned' };
    }).filter((item: any) => item.date || item.label || item.memberId);
    const result = await run('plan', editingPlanId ? `/api/family/plans/${editingPlanId}` : '/api/family/plans', { method: editingPlanId ? 'PATCH' : 'POST', body: JSON.stringify({ ...planForm, schedule }) }, 'Plan familial enregistré.');
    if (result) { setPlanForm(emptyPlan(space?.id || '')); setEditingPlanId(null); }
  };

  const editPlan = (plan: FamilyPlan) => setPlanForm({ ...emptyPlan(plan.familyId), ...plan, scheduleText: (plan.schedule || []).map(item => [item.date, item.label, item.memberId].filter(Boolean).join(' | ')).join('\n') });

  if (loading) return <div className="min-h-screen pt-40 bg-[#FFFDF9] text-[#111111] text-center text-sm">Chargement de l’espace famille…</div>;

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <header className="rounded-3xl bg-[#1A0F0A] text-[#FFF7EF] p-8 sm:p-12 shadow-xl">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#D49A63] font-bold"><Users className="w-4 h-4" /> KURLA Famille</span>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold">Une plateforme pour toute la maison.</h1>
            <p className="text-sm sm:text-base text-[#FFF7EF]/75 leading-relaxed">Des profils séparés pour les parents, les enfants et les ados. Des routines partagées quand c’est utile, sans mélanger les besoins ni les données.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
              <div className="rounded-2xl bg-white/10 p-4"><Baby className="w-5 h-5 text-[#D49A63] mb-2" /><strong className="block">Enfants protégés</strong><span className="text-[#FFF7EF]/60">Tranches d’âge, consentement et produits documentés.</span></div>
              <div className="rounded-2xl bg-white/10 p-4"><Heart className="w-5 h-5 text-[#D49A63] mb-2" /><strong className="block">Hommes visibles</strong><span className="text-[#FFF7EF]/60">Barbe, waves, rasage, peau et cuir chevelu.</span></div>
              <div className="rounded-2xl bg-white/10 p-4"><CalendarDays className="w-5 h-5 text-[#D49A63] mb-2" /><strong className="block">Rituels partagés</strong><span className="text-[#FFF7EF]/60">Calendriers, coffrets et routines parent-enfant.</span></div>
            </div>
          </div>
        </header>

        {message && <div role="status" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">{message}</div>}

        <section className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
          <div className="space-y-4">
            <div><span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold">Profils séparés</span><h2 className="text-2xl font-serif-title font-bold mt-1">Qui prend soin de lui ou d’elle ?</h2><p className="text-sm text-[#111111]/65 mt-2">Utilisez un prénom ou un surnom. Pour un mineur, KURLA conserve uniquement une tranche d’âge et l’état du consentement.</p></div>
            <div className="grid sm:grid-cols-2 gap-4">
              {members.map(member => <article key={member.id} className="rounded-2xl border border-[#E8E1DA] bg-[#F8F2EC] p-5 space-y-3"><div className="flex justify-between gap-2"><div><h3 className="font-semibold">{member.displayName}</h3><p className="text-xs text-[#111111]/60">{familyAgeLabel(member.ageBand)}</p></div><span className="w-9 h-9 rounded-full bg-[#C8753D]/15 flex items-center justify-center">{member.ageBand === 'adult' ? <Users className="w-4 h-4 text-[#C8753D]" /> : <Baby className="w-4 h-4 text-[#C8753D]" />}</span></div><div className="text-xs flex items-start gap-2">{member.ageBand === 'adult' ? <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> : member.consentStatus === 'granted' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <LockKeyhole className="w-4 h-4 text-amber-600 shrink-0" />}<span>{member.ageBand === 'adult' ? 'Profil adulte séparé.' : member.consentStatus === 'granted' ? 'Consentement parental enregistré.' : 'Recommandations mineur verrouillées jusqu’au consentement.'}</span></div><div className="flex gap-2 pt-1"><button className={mutedButtonClass} onClick={() => { setEditingMemberId(member.id); editMember(member); }}>Modifier</button>{member.ageBand !== 'adult' && member.consentStatus === 'granted' && <button className={mutedButtonClass} onClick={() => revokeConsent(member)} disabled={busy === `revoke-${member.id}`}>Retirer le consentement</button>}<button aria-label={`Supprimer ${member.displayName}`} className="p-2 rounded-xl border border-rose-200 text-rose-600" onClick={() => run(`delete-${member.id}`, `/api/family/members/${member.id}`, { method: 'DELETE' }, 'Profil supprimé.')}><Trash2 className="w-3.5 h-3.5" /></button></div></article>)}
              {!members.length && <div className="sm:col-span-2 p-6 rounded-2xl border border-dashed border-[#E8E1DA] text-sm text-[#111111]/55">Ajoutez le premier profil pour créer une routine ou un calendrier familial.</div>}
            </div>
          </div>

          <form className="p-5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] space-y-3" onSubmit={saveMember}><h3 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-[#C8753D]" /> {editingMemberId ? 'Modifier un profil' : 'Ajouter un profil'}</h3><input className={inputClass} required placeholder="Prénom ou surnom" value={memberForm.displayName} onChange={event => setMemberForm({ ...memberForm, displayName: event.target.value })} /><div className="grid grid-cols-2 gap-2"><select className={inputClass} value={memberForm.profileKind} onChange={event => setMemberForm({ ...memberForm, profileKind: event.target.value, ageBand: event.target.value === 'adult' ? 'adult' : 'child' })}><option value="child">Enfant / adolescent</option><option value="adult">Adulte</option></select><select className={inputClass} value={memberForm.ageBand} disabled={memberForm.profileKind === 'adult'} onChange={event => setMemberForm({ ...memberForm, ageBand: event.target.value })}>{FAMILY_AGE_BANDS.filter(age => memberForm.profileKind === 'adult' ? age === 'adult' : age !== 'adult').map(age => <option key={age} value={age}>{FAMILY_AGE_LABELS[age]}</option>)}</select></div><select className={inputClass} value={memberForm.focus} onChange={event => setMemberForm({ ...memberForm, focus: event.target.value })}><option value="">Besoin principal non renseigné</option><option value="demelage">Démêlage et douceur</option><option value="cuir_chevelu">Confort du cuir chevelu</option><option value="barbe">Barbe et rasage</option><option value="waves">Waves et cheveux courts</option><option value="soleil">Protection solaire</option></select>{memberForm.profileKind === 'child' && <label className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900"><input type="checkbox" checked={memberForm.parentalConsent === true} onChange={event => setMemberForm({ ...memberForm, parentalConsent: event.target.checked })} className="mt-0.5" /><span>Je suis le parent ou représentant légal et j’autorise KURLA à utiliser ce profil pour proposer des routines adaptées. Aucun âge exact, nom complet ou photo d’enfant n’est demandé.</span></label>}<div className="flex gap-2"><button className={buttonClass} disabled={busy === 'member'}><Save className="w-3.5 h-3.5" /> Enregistrer</button>{editingMemberId && <button type="button" className={mutedButtonClass} onClick={() => { setEditingMemberId(null); setMemberForm(emptyMember()); }}><X className="w-3.5 h-3.5" /> Annuler</button>}</div></form>
        </section>

        <section className="grid lg:grid-cols-[1fr_420px] gap-6 items-start">
          <div className="space-y-4"><div><span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold">Routines, cadeaux, calendrier</span><h2 className="text-2xl font-serif-title font-bold mt-1">Les rituels qui vivent ensemble.</h2><p className="text-sm text-[#111111]/65 mt-2">Une routine active impliquant un mineur ne peut utiliser que des produits dont l’âge, la sécurité mineur et l’image sont documentés.</p></div><div className="space-y-3">{plans.map(plan => <article key={plan.id} className="rounded-2xl border border-[#E8E1DA] bg-white p-5"><div className="flex justify-between gap-3"><div><span className="text-[11px] uppercase tracking-wider text-[#C8753D]">{familyPlanLabel(plan.planType)} · {plan.status}</span><h3 className="font-semibold mt-1">{plan.title}</h3></div><div className="flex gap-2"><button className={mutedButtonClass} onClick={() => { setEditingPlanId(plan.id); editPlan(plan); }}>Modifier</button><button className="p-2 rounded-xl border border-rose-200 text-rose-600" aria-label={`Supprimer ${plan.title}`} onClick={() => run(`delete-plan-${plan.id}`, `/api/family/plans/${plan.id}`, { method: 'DELETE' }, 'Plan supprimé.')}><Trash2 className="w-3.5 h-3.5" /></button></div></div><p className="text-xs text-[#111111]/60 mt-2">{plan.audience === 'shared' ? 'Tous les profils' : `${plan.memberIds.length} profil(s) sélectionné(s)`} · {plan.productIds.length} produit(s) associé(s) · {plan.schedule.length} entrée(s) calendrier</p>{plan.notes && <p className="text-xs text-[#111111]/60 mt-2">{plan.notes}</p>}</article>)}{!plans.length && <div className="p-6 rounded-2xl border border-dashed border-[#E8E1DA] text-sm text-[#111111]/55">Aucun plan familial. Commencez par un calendrier de lavage, un coffret cadeau ou une routine parent-enfant.</div>}</div></div>

          <form className="p-5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] space-y-3" onSubmit={savePlan}><h3 className="font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-[#C8753D]" /> {editingPlanId ? 'Modifier un plan' : 'Créer un plan familial'}</h3><input className={inputClass} required placeholder="Nom du plan" value={planForm.title} onChange={event => setPlanForm({ ...planForm, title: event.target.value })} /><div className="grid grid-cols-2 gap-2"><select className={inputClass} value={planForm.planType} onChange={event => setPlanForm({ ...planForm, planType: event.target.value })}>{Object.entries(FAMILY_PLAN_LABELS).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select><select className={inputClass} value={planForm.status} onChange={event => setPlanForm({ ...planForm, status: event.target.value })}><option value="draft">Brouillon</option><option value="active">Actif</option><option value="archived">Archivé</option></select></div><select className={inputClass} value={planForm.audience} onChange={event => setPlanForm({ ...planForm, audience: event.target.value })}><option value="shared">Tous les profils</option><option value="selected">Profils sélectionnés</option></select>{planForm.audience === 'selected' && <div className="space-y-2">{members.map(member => <label key={member.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={planForm.memberIds.includes(member.id)} onChange={() => togglePlanMember(member.id)} />{member.displayName} · {familyAgeLabel(member.ageBand)}</label>)}</div>}<div className="p-3 rounded-xl bg-white border border-[#E8E1DA] text-xs"><p className="font-semibold mb-2">Profils concernés</p>{selectedPlanMembers.length ? selectedPlanMembers.map(member => <span key={member.id} className="inline-block mr-2 mb-1 px-2 py-1 rounded-full bg-[#F8F2EC]">{member.displayName}</span>) : <span className="text-[#111111]/50">Aucun profil pour le moment</span>}</div><div className="p-3 rounded-xl bg-white border border-[#E8E1DA] text-xs space-y-2"><p className="font-semibold flex items-center gap-2">Produits associés <span className="font-normal text-[#111111]/50">({familyProducts.length} documentés pour les profils concernés)</span></p>{familyProducts.length > 0 ? <div className="max-h-40 overflow-y-auto space-y-2">{familyProducts.slice(0, 40).map(product => <label key={product.id} className="flex items-start gap-2"><input type="checkbox" checked={planForm.productIds.includes(product.id)} onChange={() => togglePlanProduct(product.id)} /><span>{product.name}<span className="block text-[10px] text-[#111111]/50">{product.recommendedAgeBand || 'âge recommandé non renseigné'}{product.minorSafetyStatus === 'verified' ? ' · sécurité mineur documentée' : ''}</span></span></label>)}</div> : <p className="text-[#111111]/50">Aucun produit publié et documenté pour les profils mineurs sélectionnés.</p>}</div><textarea className={inputClass} rows={3} placeholder="Calendrier, une entrée par ligne : 2026-09-01 | Lavage doux | id-profil" value={planForm.scheduleText} onChange={event => setPlanForm({ ...planForm, scheduleText: event.target.value })} /><textarea className={inputClass} rows={3} placeholder="Notes ou occasion du cadeau" value={planForm.notes} onChange={event => setPlanForm({ ...planForm, notes: event.target.value })} /><div className="flex gap-2"><button className={buttonClass} disabled={busy === 'plan'}>{planForm.planType === 'gift' ? <Gift className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} Enregistrer le plan</button>{editingPlanId && <button type="button" className={mutedButtonClass} onClick={() => { setEditingPlanId(null); setPlanForm(emptyPlan(space?.id || '')); }}>Nouveau</button>}</div></form>
        </section>

        <section className="rounded-2xl bg-[#1A0F0A] text-[#FFF7EF] p-6 flex gap-3 items-start"><ShieldCheck className="w-5 h-5 text-[#D49A63] shrink-0 mt-0.5" /><div><h2 className="font-semibold">Notre règle famille</h2><p className="text-xs text-[#FFF7EF]/65 mt-1 leading-relaxed">KURLA ne demande pas de date de naissance exacte ni de photo d’enfant pour faire fonctionner cet espace. Les données restent séparées par profil, le consentement peut être retiré et les produits non documentés pour les mineurs ne sont pas proposés dans une routine active.</p></div></section>
      </div>
    </div>
  );
};
