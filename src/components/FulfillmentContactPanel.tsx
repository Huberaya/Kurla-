import React, { useState } from 'react';
import { Mail, Copy, ExternalLink, Check, Send, Clock, Building2, Package, Truck } from 'lucide-react';

type ContactMessage = {
  id: string;
  to: string;
  toLabel: string;
  subject: string;
  body: string;
};

function buildMessages(senderEmail: string, senderPhone: string): ContactMessage[] {
  const sig = `KURLA Beauty\nParis, France\n${senderEmail} | ${senderPhone}`.trim();
  return [
    {
      id: 'africanfabs',
      to: 'info@africanfabs.com',
      toLabel: 'AfricanFabs (NL) — grossiste UE',
      subject: 'Wholesale + dropship inquiry — KURLA Beauty (weekly pre-order, 3PL in France)',
      body: `Hello AfricanFabs team,

We are launching KURLA Beauty in France — a diagnostic-driven brand for textured hair (3A-4C) with curated kits (K02/K03).

Year 1 we operate without stock at home (Paris apartment) on a weekly pre-order model: we collect pre-orders, then place a grouped order 2×/week, delivered to our 3PL near Paris (who does kitting + shipping). No stock at our place.

Could you please confirm:

1. Do you offer wholesale to France and dropship per unit for tools/accessories (afro pick, scalp massager, twist sponge, etc.)? Price + picking fee per parcel?
2. For cosmetics (our 5 heroes: hydrating cream shampoo 250ml, detangling conditioner 400ml, rich leave-in for 4C 250ml, raw shea butter 200g, twist-out cream 227g), can you supply weekly grouped orders (approx. 20 units/order, 2×/week) to our 3PL in IDF? Lead time NL → FR?
3. Do you provide CPNP + EU Responsible Person documents for these 5 SKUs?
4. Do you do kitting (K02/K03) or should our 3PL do it?

Our 5 hero SKUs to quote (wholesale HT, MOQ, CPNP):
- Hydrating cream shampoo without sulfate 250ml
- Detangling hydrating conditioner 400ml
- Rich leave-in cream for 4C 250ml
- Raw shea butter 100% 200g
- Twist-out / braid-out defining cream 227g

And 12 tools: afro pick, detangling brush, scalp massager, twist sponge, edge brush, crocodile clips, satin bonnet, mist bottle, etc.

We aim to start with a 75-unit buffer at our 3PL (15× each hero) + 2 weekly batches.

Thank you — we can start with your existing brands (Aunt Jackie's, Cantu, Shea Moisture, As I Am, Camille Rose) before our own label.

Best regards,
${sig}`,
    },
    {
      id: 'afrowholesale',
      to: 'support@afrowholesale.eu',
      toLabel: 'Afro Wholesale (NL) — grossiste UE',
      subject: 'Wholesale + dropship inquiry — KURLA Beauty (weekly pre-order, 3PL in France)',
      body: `Hello Afro Wholesale team,

We are launching KURLA Beauty in France — diagnostic-driven brand for textured hair (3A-4C).

Year 1 we run without home stock on a weekly pre-order model (2 batches/week to our 3PL near Paris). Could you confirm the same 4 points:

1. Wholesale to France?
2. Dropship per unit for 12 tools?
3. Weekly grouped orders for our 5 heroes (hydrating shampoo 250ml, detangling conditioner 400ml, rich leave-in 4C 250ml, raw shea 200g, twist cream 227g) — lead time NL → FR?
4. CPNP + EU Responsible Person + kitting?

Thank you!
${sig}`,
    },
    {
      id: '3pl-etx',
      to: 'contact@etx-logistique.fr',
      toLabel: '3PL IDF — Etx Logistique (95) — à adapter pour Huboo/Cubyn',
      subject: 'Micro-stock + cross-dock hebdomadaire — KURLA Beauty (75 unités tampon + 2 réceptions/semaine)',
      body: `Bonjour,

Nous lançons KURLA Beauty (kits capillaires texturés) depuis Paris, sans stock à domicile.

Nous cherchons un partenaire 3PL IDF pour :

- Tampon initial : 75 unités (5 références × 15 unités, ~0,5m²) livrées direct chez vous, jamais chez nous
- Cross-dock hebdomadaire : 2 réceptions/semaine (mardi et vendredi, ~20 unités/réception depuis fournisseur NL)
- Kitting : assemblage de nos kits K02 (5 produits) / K03 (5 produits) / K05 (4 produits) à la demande
- Pick & pack + expédition : ~20 commandes/semaine au démarrage, 80–150/mois à 3 mois
- Stock consigné : pas de inStock catalogue chez nous, vous êtes notre micro-entrepôt

Pouvez-vous nous transmettre :
- Forfait mensuel stockage 0,5–2m²
- Coût réception, picking, kitting, emballage
- Délai réception → expédition
- Grille transport (Colissimo / Mondial Relay, FR 48h)

Volume démarrage : 75 unités tampon + 40 unités/semaine en flux.

Merci d'avance,
${sig}
SIRET en cours — catalogue intact (launchCatalog.ts non modifié)`,
    },
  ];
}

function mailtoHref(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function FulfillmentContactPanel() {
  const [senderEmail, setSenderEmail] = useState(() => {
    try { return localStorage.getItem('kurla_fulfillment_sender_email') || ''; } catch { return ''; }
  });
  const [senderPhone, setSenderPhone] = useState(() => {
    try { return localStorage.getItem('kurla_fulfillment_sender_phone') || ''; } catch { return ''; }
  });
  const [sent, setSent] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('kurla_fulfillment_sent') || '{}'); } catch { return {}; }
  });
  const [copied, setCopied] = useState<string | null>(null);

  const persistSender = (email: string, phone: string) => {
    try {
      localStorage.setItem('kurla_fulfillment_sender_email', email);
      localStorage.setItem('kurla_fulfillment_sender_phone', phone);
    } catch { /* ignore */ }
  };

  const toggleSent = (id: string) => {
    const next = { ...sent, [id]: !sent[id] };
    setSent(next);
    try { localStorage.setItem('kurla_fulfillment_sent', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const messages = buildMessages(senderEmail || '[ton email]', senderPhone || '[ton téléphone]');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#C8753D]/30 bg-[#C8753D]/10 p-4">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-[#C8753D]" />
          <h3 className="text-sm font-bold text-[#FFF7EF]">Contacts fournisseurs & 3PL — messages prêts à envoyer</h3>
        </div>
        <p className="text-[11px] text-[#FFF7EF]/70 mt-1.5 leading-relaxed">
          Catalogue intact (aucune modification de <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10 text-[10px]">launchCatalog.ts</code>). Ces 3 messages portent le modèle <b className="text-[#D49A63]">précommande 3–5 jours en 2 batchs/semaine + tampon 75 unités chez 3PL</b>. Renseigne ton email/tél, copie ou ouvre directement dans ton client mail — puis marque comme envoyé.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#D49A63]">Ton email (signature)</span>
            <input value={senderEmail} onChange={e => { setSenderEmail(e.target.value); persistSender(e.target.value, senderPhone); }} placeholder="ex: hello@kurla.eu" className="mt-1 w-full px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] placeholder:text-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#D49A63]">Ton téléphone (signature)</span>
            <input value={senderPhone} onChange={e => { setSenderPhone(e.target.value); persistSender(senderEmail, e.target.value); }} placeholder="ex: 06 12 34 56 78" className="mt-1 w-full px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] placeholder:text-[#FFF7EF]/30 focus:outline-none focus:border-[#C8753D]" />
          </label>
        </div>
        <p className="text-[10px] text-[#FFF7EF]/40 mt-2">Stocké en local sur ce navigateur uniquement. Pas d'envoi automatique : tu gardes le contrôle de l'envoi.</p>
      </div>

      <div className="grid gap-3">
        {messages.map(m => {
          const isSent = !!sent[m.id];
          return (
            <div key={m.id} className={`rounded-2xl border p-4 space-y-3 ${isSent ? 'bg-[#050403] border-emerald-500/25' : 'bg-[#1A0F0A] border-[#FFF7EF]/10'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-2 h-2 rounded-full ${isSent ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <p className="text-xs font-bold text-[#FFF7EF] flex items-center gap-1.5">
                      {m.id.startsWith('3pl') ? <Truck className="w-3.5 h-3.5 text-[#C8753D]" /> : m.id.includes('afro') || m.id.includes('african') ? <Building2 className="w-3.5 h-3.5 text-[#C8753D]" /> : <Mail className="w-3.5 h-3.5 text-[#C8753D]" />}
                      {m.toLabel}
                    </p>
                    {isSent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">Envoyé</span>}
                  </div>
                  <p className="text-[11px] text-[#D49A63] mt-0.5 font-mono">→ {m.to}</p>
                  <p className="text-xs font-semibold text-[#FFF7EF] mt-2">Objet : {m.subject}</p>
                </div>
                <button onClick={() => toggleSent(m.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${isSent ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-[#050403] text-[#FFF7EF]/70 border-[#FFF7EF]/15 hover:border-emerald-500/30'}`}>
                  <Check className="w-3.5 h-3.5" /> {isSent ? 'Marqué envoyé' : 'Marquer envoyé'}
                </button>
              </div>

              <div className="rounded-xl bg-[#050403] border border-[#FFF7EF]/10 p-3">
                <pre className="text-[11px] text-[#FFF7EF]/80 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-[220px] overflow-auto">{m.body}</pre>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => copy(m.subject, `${m.id}-subject`)} className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-[11px] text-[#FFF7EF]/80 hover:border-[#C8753D]/40 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> {copied === `${m.id}-subject` ? 'Copié !' : 'Copier l’objet'}
                </button>
                <button onClick={() => copy(m.body, `${m.id}-body`)} className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-[11px] text-[#FFF7EF]/80 hover:border-[#C8753D]/40 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> {copied === `${m.id}-body` ? 'Copié !' : 'Copier le corps'}
                </button>
                <a href={mailtoHref(m.to, m.subject, m.body)} className="px-3 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#D49A63] text-white text-[11px] font-bold flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Ouvrir dans ton mail
                </a>
                <a href={mailtoHref(m.to, m.subject, m.body)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/15 text-[11px] text-[#FFF7EF]/70 hover:text-[#FFF7EF] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Envoyer via Gmail
                </a>
              </div>

              {m.id === '3pl-etx' && (
                <p className="text-[10px] text-[#FFF7EF]/45">
                  Adapte le destinataire : remplace <code>contact@etx-logistique.fr</code> par <code>hello@huboo.fr</code> ou <code>sales@cubyn.com</code> pour dupliquer. Tampon 75u = 15× p01/p04/p08/p09/p12 — catalogue intact.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-4 flex items-start gap-2">
        <Clock className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" />
        <div className="text-[11px] text-[#FFF7EF]/65 leading-relaxed">
          <p className="font-bold text-[#FFF7EF]">Après envoi : J+3 sans réponse → relance courte. Dès 1 réponse positive → on cale l'adresse 3PL et on commande le tampon 75.</p>
          <p className="text-[#FFF7EF]/45 mt-1">Aucune modification de <code>launchCatalog.ts</code> — le fournisseur et le 3PL ne voient que le flux, pas le catalogue.</p>
        </div>
      </div>
    </div>
  );
}
