import React, { useCallback, useEffect, useState } from 'react';
import { Mail, CheckCircle2, Clock, RefreshCw, Copy, Check, AlertTriangle, Send, Eye, Package, Truck } from 'lucide-react';

type Prospect = { id: string; name: string; status: string; contactEmail?: string; decision?: string };

const J0_FIVE = [
  { id: 'j0-naturcos', name: 'Laboratoire Naturcos', pays: 'FR Lyon', spe: 'White label bio céramides', moq: '50', cibleHT: '<22€ kit Essentielle', delai: '48h échantillon · 3–5j prod', doc: 'ISO 22716 + CPNP/RP/CPSR', contact: 'naturcos.fr/contact', group: 'UE J0' },
  { id: 'j0-cosmetic', name: 'Cosmetic Factory', pays: 'FR Toulouse', spe: 'Fluide SPF 50 hybride invisible V-VI', moq: '100', cibleHT: '<22€ SPF 40ml', delai: '5j', doc: 'ISO 24444/24443 + CPNP', contact: 'cosmeticfactory.fr', group: 'UE J0 SPF' },
  { id: 'j0-biosphere', name: 'BioSphère Lab', pays: 'BE Bruxelles', spe: 'Niacinamide 5% + HA 30ml airless', moq: '50', cibleHT: '<30€ kit Équilibrée', delai: '5j', doc: 'PIF/CPSR + sans parfum', contact: 'biospherelab.be', group: 'UE J0' },
  { id: 'j0-atelier', name: 'Atelier des Sens', pays: 'FR Nantes', spe: 'Hub log Nantes 24–48h outils', moq: '50', cibleHT: 'stock tampon 75', delai: '24–48h hub IDF/Nantes', doc: 'OEKO-TEX si textile', contact: 'atelierdessens.fr', group: 'UE J0 log' },
  { id: 'j0-dakar', name: 'Dakar Lab Cosmetique', pays: 'SN Dakar', spe: 'White label Dakar céramides', moq: '50', cibleHT: '<22€ SN hub Wave', delai: '5–7j Dakar·Wave', doc: 'CN/CPSR SN + français', contact: 'dakarlab.sn', group: 'SN J0 prio' },
];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  to_contact: { label: 'À contacter', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  emailed: { label: 'Emailed', cls: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  replied: { label: 'Réponse', cls: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
  samples_sent: { label: 'Échantillon', cls: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  agreed: { label: 'Accord', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  no_response: { label: 'Sans réponse', cls: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  in_negotiation: { label: 'Négociation', cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  followed_up: { label: 'Relancé', cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
};

function mailFor(supplier: typeof J0_FIVE[number]){
  return `Objet: KURLA — kits peau V-VI safe 49,70/62/84,90€ (MOQ 50, précommande) — ${supplier.name}

Bonjour l'équipe ${supplier.name},

KURLA lance son pôle peau peaux riches en mélanine (phototypes IV–VI, HPI). 15 actifs documentés V-VI safe (preuves A/B, INCI normalisé, CosIng fichier+date), 3 kits en précommande 3–5j lun/jeu 18h (0 stock Paris, Stripe TEST).

Votre profil : ${supplier.spe} — ${supplier.pays} — MOQ cible ${supplier.moq} (1er run 50–100, pas 500).

Besoin 1 kit complet échantillon + test whitecast phototype V–VI en lumière du jour avant commande fournisseur.

Questions rapides :
1. MOQ et prix HT par kit (50 et 100 unités) ? Cible HT : Essentielle <22€ / Équilibrée <30€ / Experte <40€
2. Délai échantillon et délai prod 50/100 ?
3. Certificats : ISO 22716, PIF/CPSR/CPNP, ${supplier.doc}
4. SPF si concerné : ISO 24444/24443, white cast faible testé V–VI, hybride/organique > minéral pur
5. Sans parfum possible + INCI + allergènes déclarés (containsFragrance booléen) ?

Cahier joint (15 actifs + kits). Retour attendu sous 7j (J0 → J+3 relance si silence).

Bien à vous,
KURLA — pôle peau — ${supplier.contact}
Préco 3–5j · Stripe TEST · MOQ 50 — nous allons commencer par 5 mails J0, pas 20 d'un coup.`;
}

export const PeauJ0MailTrackingPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string|null>(null);

  const load = useCallback(async ()=>{
    setLoading(true); setError('');
    try{
      const res = await fetch('/api/admin/sourcing/prospects', { headers });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Prospects indisponibles');
      setProspects((data.prospects||[]) as Prospect[]);
    }catch(e:any){ setError(e.message||'Chargement impossible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  const prospectByName = new Map(prospects.map(p=>[p.name.toLowerCase(), p]));
  const getStatus = (name:string)=>{
    const p = prospectByName.get(name.toLowerCase());
    return p?.status || 'to_contact';
  };

  const counts = {
    toContact: J0_FIVE.filter(j=> getStatus(j.name)==='to_contact').length,
    emailed: J0_FIVE.filter(j=> ['emailed','followed_up','replied','in_negotiation','samples_sent','agreed'].includes(getStatus(j.name))).length,
    replied: J0_FIVE.filter(j=> ['replied','in_negotiation','samples_sent','agreed'].includes(getStatus(j.name))).length,
    agreed: J0_FIVE.filter(j=> getStatus(j.name)==='agreed' || prospectByName.get(j.name.toLowerCase())?.decision==='accepted').length,
  };
  const j0Progress = Math.round((counts.emailed/5)*100);

  const copy = async (id:string, text:string)=>{
    try{ await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(()=>setCopiedId(null), 2200); }catch{}
  };

  return (
    <div className="rounded-3xl bg-kurla-espresso border border-emerald-500/20 p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400" /> C22 P1 — 5 mails J0 + échantillons + 1er lot peau
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">J0 : 5 mails pas 20</span>
          </h3>
          <p className="text-xs text-kurla-cream/60 mt-1 max-w-3xl leading-relaxed">
            <strong className="text-kurla-cream">Nous allons commencer par 5 mails J0</strong> (3 UE peau + 1 hub log + 1 SN prio), pas 20 d’un coup. <strong className="text-emerald-300">J+3 relance</strong> si silence, <strong className="text-sky-300">J+7 KPI &gt;30% réponse (2/5)</strong>, 1 whitecast V–VI validé lumière du jour. Prospect créé = <code className="px-1 py-0.5 rounded bg-kurla-ink border border-kurla-cream/10">to_contact → emailed</code> dans le suivi sourcing — un gate ne passe au vert que sur <strong>réponse fichier+date</strong>.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream/70 flex items-center gap-1.5 hover:border-kurla-copper">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error} · <span className="text-kurla-cream/60">Le panel reste utilisable en mode doc (5 fiches statiques, mail type copiable) même si l’API prospects est vide.</span></div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-kurla-ink border border-amber-500/20 text-center"><p className="text-[10px] uppercase tracking-wider font-bold text-amber-300">À contacter</p><p className="text-xl font-bold text-kurla-cream">{counts.toContact}/5</p></div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-sky-500/20 text-center"><p className="text-[10px] uppercase tracking-wider font-bold text-sky-300">Emailed</p><p className="text-xl font-bold text-sky-300">{counts.emailed}/5 <span className="text-[11px] font-normal text-kurla-cream/40">{j0Progress}%</span></p></div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-cyan-500/20 text-center"><p className="text-[10px] uppercase tracking-wider font-bold text-cyan-300">Réponses</p><p className="text-xl font-bold text-cyan-300">{counts.replied}/5</p><p className="text-[10px] text-kurla-cream/40">cible J+7 ≥2</p></div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-emerald-500/20 text-center"><p className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">Accords</p><p className="text-xl font-bold text-emerald-300">{counts.agreed}/5</p><p className="text-[10px] text-kurla-cream/40">fichier+date</p></div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-kurla-ink border border-kurla-cream/10 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${j0Progress}%` }} />
        </div>
        <span className="text-xs font-bold text-emerald-300">{j0Progress}% J0 envoyés</span>
        <span className="hidden sm:inline text-[11px] text-kurla-cream/45">J0 5 mails → J+3 relance → J+7 bilan → J+10 échantillons → J+14 lot 50–100</span>
      </div>

      <div className="space-y-3">
        {J0_FIVE.map(j=>{
          const status = getStatus(j.name);
          const tone = STATUS_LABEL[status] || STATUS_LABEL.to_contact;
          const isEmailed = status!=='to_contact';
          return (
            <div key={j.id} className={`rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${isEmailed ? 'bg-emerald-950/15 border-emerald-500/20' : 'bg-kurla-ink border-kurla-cream/10'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-kurla-cream">{j.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-kurla-espresso border border-kurla-cream/10 text-[10px] text-kurla-cream/60">{j.pays} · {j.group}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${tone.cls}`}>{tone.label}</span>
                </div>
                <p className="text-xs text-kurla-cream/70 mt-1">{j.spe}</p>
                <p className="text-[11px] text-kurla-cream/45 mt-0.5">MOQ {j.moq} · {j.cibleHT} · {j.delai} · {j.doc} · <span className="font-mono text-sky-300">{j.contact}</span></p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button onClick={()=>copy(j.id, mailFor(j))} className="px-3 py-1.5 rounded-full bg-kurla-copper hover:bg-kurla-amber text-white text-xs font-bold flex items-center gap-1.5">
                  {copiedId===j.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiedId===j.id?'Copié':'Copier mail J0'}
                </button>
                <a href={`mailto:?subject=${encodeURIComponent(`KURLA — kits peau V-VI safe 49,70/62/84,90€ (MOQ 50, précommande) — ${j.name}`)}&body=${encodeURIComponent(mailFor(j))}`} className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/15 text-xs font-semibold flex items-center gap-1 hover:border-kurla-copper"><Mail className="w-3.5 h-3.5" /> Ouvrir mail</a>
                <span className="px-2 py-1 rounded-full bg-kurla-ink border border-kurla-cream/10 text-[10px] text-kurla-cream/50 flex items-center gap-1"><Clock className="w-3 h-3" /> {isEmailed?'Suivi dans prospects':'À créer dans prospects = to_contact'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 flex gap-2"><Eye className="w-4 h-4 text-sky-300 shrink-0" /><span className="text-sky-100 leading-relaxed"><strong>Échantillon J+10 :</strong> 1 kit complet + photo whitecast V–VI lumière du jour (faible/modéré/élevé) → gate échantillon vert.</span></div>
        <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" /><span className="text-emerald-100 leading-relaxed"><strong>1er lot J+14 :</strong> 50–100 unités / réf (pas 500) → lot reçu → coût servi → gate marge vert.</span></div>
        <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex gap-2"><Package className="w-4 h-4 text-amber-300 shrink-0" /><span className="text-amber-100 leading-relaxed"><strong>Relance J+3 :</strong> si silence, relance + suivi <code>followed_up</code> → KPI J+7 &gt;30% sinon pivot J1 6 mails.</span></div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/10 text-kurla-cream/60 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Préco 3–5j lun/jeu 18h · FR82/BE76 LIVE si sk_live</span>
        <span className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">Cible J+7 : 2 réponses / 5 mails + 1 accord fichier+date</span>
        <a href="/admin" onClick={e=>{e.preventDefault(); const el=document.querySelector('[data-tab=prospects]'); el?.scrollIntoView();}} className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Suivi prospects →</a>
      </div>

      <p className="text-[10px] text-kurla-cream/35 text-center leading-relaxed">C22 P1 — source statique <span className="text-kurla-amber">fournisseurs_20.md</span> (J0 5 mails : 1 Naturcos +2 Cosmetic Factory/BioSphère +8 Atelier +13 Dakar SN prio) + live <span className="text-kurla-amber">/api/admin/sourcing/prospects</span> (to_contact→emailed→replied→agreed). Mail type copiable avec cahier 15 actifs + kits 49,70/62/84,90€ + MOQ 50 + whitecast V-VI + PIF/CPSR/CPNP/ISO. Aucun fournisseur inventé : statut réel depuis prospects, 0 = à créer.</p>
    </div>
  );
};
