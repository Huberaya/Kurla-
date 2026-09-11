import React, { useMemo, useState } from 'react';
import { Package, Copy, ExternalLink, Check, Truck, Boxes, Clock, AlertTriangle, FileText, Send } from 'lucide-react';
import { TAMPON_3PL, TAMPON_META, THREE_PL_SHORTLIST, FULFILLMENT_WORKFLOW } from '../lib/fulfillment';

function mailtoHref(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function TamponOrderPanel() {
  const [supplier, setSupplier] = useState<'AfricanFabs' | 'Afro Wholesale'>(() => {
    try { return (localStorage.getItem('kurla_tampon_supplier') as any) || 'AfricanFabs'; } catch { return 'AfricanFabs'; }
  });
  const [threePlName, setThreePlName] = useState(() => {
    try { return localStorage.getItem('kurla_tampon_3pl_name') || THREE_PL_SHORTLIST[0].name; } catch { return THREE_PL_SHORTLIST[0].name; }
  });
  const [threePlAddress, setThreePlAddress] = useState(() => {
    try { return localStorage.getItem('kurla_tampon_3pl_address') || '[Adresse 3PL à compléter après signature contrat]'; } catch { return '[Adresse 3PL à compléter]'; }
  });
  const [senderEmail, setSenderEmail] = useState(() => {
    try { return localStorage.getItem('kurla_tampon_sender_email') || localStorage.getItem('kurla_fulfillment_sender_email') || ''; } catch { return ''; }
  });
  const [senderPhone, setSenderPhone] = useState(() => {
    try { return localStorage.getItem('kurla_tampon_sender_phone') || localStorage.getItem('kurla_fulfillment_sender_phone') || ''; } catch { return ''; }
  });
  const [poNumber, setPoNumber] = useState(() => {
    try { return localStorage.getItem('kurla_tampon_po') || `KURLA-TAMPON-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-01`; } catch { return 'KURLA-TAMPON-001'; }
  });
  const [ordered, setOrdered] = useState(() => {
    try { return localStorage.getItem('kurla_tampon_ordered') === '1'; } catch { return false; }
  });
  const [received, setReceived] = useState(() => {
    try { return localStorage.getItem('kurla_tampon_received') === '1'; } catch { return false; }
  });
  const [copied, setCopied] = useState<string | null>(null);

  const persist = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

  const totalHt = useMemo(() => TAMPON_3PL.reduce((s, r) => s + r.qty * r.unitCostEur, 0), []);
  const totalTtc = Math.round(totalHt * 1.2 * 100) / 100; // approx 532.5
  const supplierEmail = supplier === 'AfricanFabs' ? 'info@africanfabs.com' : 'support@afrowholesale.eu';

  const bonDeCommande = useMemo(() => {
    const date = new Date().toLocaleDateString('fr-FR');
    const lines = TAMPON_3PL.map(r => `  • ${r.qty}× ${r.name} [${r.productId}] — ${r.unitCostEur.toFixed(2)}€ HT /u → ${(r.qty * r.unitCostEur).toFixed(2)}€ HT`).join('\n');
    return `BON DE COMMANDE — KURLA Beauty — ${poNumber}
Date : ${date}
Fournisseur : ${supplier} (${supplierEmail})
Contact KURLA : ${senderEmail || '[ton email]'} | ${senderPhone || '[ton tél]'} — Paris, France

OBJET : Tampon initial 75 unités — livraison DIRECTE chez 3PL (0 carton à Paris)

Livraison à :
  ${threePlName}
  ${threePlAddress}

LIGNES :
${lines}
  ──────────────────────────────────
  Total HT : ${totalHt.toFixed(2)} €  (≈ ${totalTtc.toFixed(2)}€ TTC)
  Stockage 3PL : 0,5m² (~20€/mois) + réception ~30€/batch + picking 2,20€/cmd (grille ${threePlName})

Conditions :
  • Livraison groupée, facturation HT, TVA 20% selon régime, paiement à réception/30j selon grille fournisseur
  • Merci de joindre pour ces 5 héros : CPNP + attestation Responsible Person UE + fiche INCI (obligatoire avant mise en vente)
  • Kitting : non — livraison en vrac, le 3PL fait l'assemblage K02/K03 à la demande
  • Étiquetage FR + DDM/lot + code-barres par référence
  • Transport NL → FR via DPD/Colissimo suivi — merci d'indiquer n° suivi dès expédition

Note : Ce tampon couvre 60% des commandes en 24–48h (le reste en cross-dock 3–5j). Pas de stock à domicile.

KURLA Beauty
SIRET en cours — boutique en précommande 3–5j (batch lun & jeu 18h)
`;
  }, [poNumber, supplier, supplierEmail, senderEmail, senderPhone, threePlName, threePlAddress, totalHt, totalTtc]);

  const mailToSupplierSubject = `Bon de commande tampon 75 unités — ${poNumber} — livraison directe 3PL IDF`;
  const mailTo3PlSubject = `[KURLA] Annonce réception tampon 75 unités — ${poNumber} — ${threePlName}`;
  const mailTo3PlBody = `Bonjour ${threePlName},

Notre tampon initial KURLA (75 unités, 5 références ×15) arrive chez vous cette semaine depuis ${supplier} (NL → FR, DPD suivi à suivre).

Réf : ${poNumber}
Contenu : 15× p01 (shampooing 250ml), 15× p04 (après-shampoing 400ml), 15× p08 (leave-in 4C 250ml), 15× p09 (karité brut 200g), 15× p12 (twist cream 227g) — total ~0,5m²

Merci de prévoir : réception, contrôle quantités + DDM/lot, stockage 0,5m², puis kitting K02/K03 à la demande.

Adresse de livraison fournisseur : 
${threePlAddress}

Je vous transfère le n° de suivi dès réception du fournisseur.

Bien à vous,
KURLA Beauty — ${senderEmail || '[email]'} | ${senderPhone || '[tél]'}
`;

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const toggleOrdered = () => {
    const next = !ordered;
    setOrdered(next);
    persist('kurla_tampon_ordered', next ? '1' : '0');
    if (!next) { setReceived(false); persist('kurla_tampon_received', '0'); }
  };
  const toggleReceived = () => {
    const next = !received;
    setReceived(next);
    persist('kurla_tampon_received', next ? '1' : '0');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Boxes className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-kurla-cream">A3 — Tampon 75 unités chez 3PL (0 carton à Paris) — prêt à commander</h3>
          {ordered && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">{received ? 'Reçu chez 3PL ✓' : 'Commandé'}</span>}
          {!ordered && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 text-[10px] font-bold">À commander après A2 (signature 3PL)</span>}
        </div>
        <p className="text-[11px] text-kurla-cream/70 mt-1.5 leading-relaxed">
          5 héros qui font 80% des ventes. Immobilisation <b className="text-kurla-cream">~485€ HT / 532,50€ TTC</b> + <b className="text-kurla-cream">20€/mois 0,5m²</b>. Effet : 60% expédiés en 24–48h, moyenne <b className="text-emerald-300">2,6j</b> vs 4,2j sans tampon. Livraison <b className="text-amber-300">DIRECT chez 3PL</b>, jamais à Paris.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Fournisseur</span>
            <select value={supplier} onChange={e => { setSupplier(e.target.value as any); persist('kurla_tampon_supplier', e.target.value); }} className="mt-1 w-full px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream focus:outline-none focus:border-emerald-500/40">
              <option value="AfricanFabs">AfricanFabs (NL)</option>
              <option value="Afro Wholesale">Afro Wholesale (NL)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">3PL choisi</span>
            <select value={threePlName} onChange={e => { setThreePlName(e.target.value); persist('kurla_tampon_3pl_name', e.target.value); }} className="mt-1 w-full px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream focus:outline-none focus:border-emerald-500/40">
              {THREE_PL_SHORTLIST.map(q => <option key={q.name} value={q.name}>{q.name} — {q.monthlyFixEur}€/mois + {q.perOrderEur}€/cmd</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Ton email</span>
            <input value={senderEmail} onChange={e => { setSenderEmail(e.target.value); persist('kurla_tampon_sender_email', e.target.value); }} placeholder="hello@kurla.eu" className="mt-1 w-full px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder:text-kurla-cream/30 focus:outline-none focus:border-emerald-500/40" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Ton tél</span>
            <input value={senderPhone} onChange={e => { setSenderPhone(e.target.value); persist('kurla_tampon_sender_phone', e.target.value); }} placeholder="06 12 34 56 78" className="mt-1 w-full px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder:text-kurla-cream/30 focus:outline-none focus:border-emerald-500/40" />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">N° bon de commande</span>
            <input value={poNumber} onChange={e => { setPoNumber(e.target.value); persist('kurla_tampon_po', e.target.value); }} className="mt-1 w-full px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs font-mono text-kurla-cream focus:outline-none focus:border-emerald-500/40" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Adresse 3PL (livraison directe)</span>
            <input value={threePlAddress} onChange={e => { setThreePlAddress(e.target.value); persist('kurla_tampon_3pl_address', e.target.value); }} placeholder="1 rue de l'Entrepôt, 95800 Cergy" className="mt-1 w-full px-3 py-2 rounded-xl bg-kurla-ink border border-amber-500/30 text-xs text-kurla-cream placeholder:text-kurla-cream/30 focus:outline-none focus:border-amber-500/60" />
          </label>
        </div>
        {threePlAddress.includes('à compléter') && (
          <p className="text-[10px] text-amber-300 flex items-center gap-1 mt-2"><AlertTriangle className="w-3.5 h-3.5" /> Complète l'adresse 3PL après signature A2 — ne commande pas vers Paris.</p>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl border border-kurla-cream/10 bg-kurla-espresso p-4">
          <h4 className="text-xs font-bold text-kurla-cream flex items-center gap-1.5"><Package className="w-4 h-4 text-kurla-copper" /> Détail tampon 75</h4>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] uppercase tracking-wider text-kurla-cream/45 border-b border-kurla-cream/10"><th className="py-1.5 pr-2">SKU</th><th className="py-1.5 pr-2">Produit</th><th className="py-1.5 text-right">Qté</th><th className="py-1.5 text-right">PU HT</th><th className="py-1.5 text-right">Total HT</th></tr></thead>
              <tbody className="divide-y divide-kurla-cream/5">
                {TAMPON_3PL.map(r => (
                  <tr key={r.productId} className="text-kurla-cream/85">
                    <td className="py-2 pr-2 font-mono text-[11px] text-kurla-amber">{r.productId}</td>
                    <td className="py-2 pr-2 leading-tight">{r.name}</td>
                    <td className="py-2 text-right font-bold">{r.qty}</td>
                    <td className="py-2 text-right">{r.unitCostEur.toFixed(2)}€</td>
                    <td className="py-2 text-right font-semibold text-kurla-cream">{(r.qty * r.unitCostEur).toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-kurla-cream/15 text-kurla-cream font-bold"><td colSpan={2} className="py-2 pr-2">Total 75 unités — 0,5m²</td><td className="py-2 text-right">{TAMPON_META.totalUnits}</td><td className="py-2 text-right"></td><td className="py-2 text-right text-emerald-300">{totalHt.toFixed(2)}€ HT</td></tr></tfoot>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl bg-kurla-ink border border-kurla-cream/10 p-2.5 text-center"><p className="text-kurla-cream/50 text-[10px] uppercase font-bold">TTC approx</p><p className="font-bold text-kurla-cream">{totalTtc.toFixed(2)}€</p></div>
            <div className="rounded-xl bg-kurla-ink border border-kurla-cream/10 p-2.5 text-center"><p className="text-kurla-cream/50 text-[10px] uppercase font-bold">Stockage</p><p className="font-bold text-kurla-cream">~20€/mois</p></div>
            <div className="rounded-xl bg-kurla-ink border border-kurla-cream/10 p-2.5 text-center"><p className="text-kurla-cream/50 text-[10px] uppercase font-bold">Écoulé en</p><p className="font-bold text-emerald-300">~10 jours</p><p className="text-[10px] text-kurla-cream/45">à 20 cmd/sem</p></div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-kurla-ink border border-kurla-cream/10 p-3">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-kurla-cream/65 leading-relaxed">Sans tampon : 4,2j moyen (1 batch) → <b className="text-kurla-cream">avec tampon 75 : 2,6j</b> (60% à 1,5j via stock 3PL + 40% à 4,2j en cross-dock). Batch 2×/sem (lun+jeu) → max 6j, moyenne 2,8j.</p>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-kurla-cream/10 bg-kurla-espresso p-4 flex flex-col">
          <h4 className="text-xs font-bold text-kurla-cream flex items-center gap-1.5"><FileText className="w-4 h-4 text-kurla-copper" /> Bon de commande prêt à envoyer</h4>
          <p className="text-[11px] text-kurla-cream/60 mt-1">Livraison <b className="text-amber-300">directe chez 3PL</b> — vérifie l'adresse avant d'envoyer. Le fournisseur ne livre jamais à Paris.</p>
          <div className="mt-3 rounded-xl bg-kurla-ink border border-kurla-cream/10 p-3 flex-1">
            <pre className="text-[11px] text-kurla-cream/80 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-[320px] overflow-auto">{bonDeCommande}</pre>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => copy(bonDeCommande, 'bon')} className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/15 text-[11px] text-kurla-cream/80 hover:border-kurla-copper/40 flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" /> {copied === 'bon' ? 'Copié !' : 'Copier le bon'}
            </button>
            <a href={mailtoHref(supplierEmail, mailToSupplierSubject, bonDeCommande)} className="px-3 py-1.5 rounded-full bg-kurla-copper hover:bg-kurla-amber text-white text-[11px] font-bold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Envoyer au fournisseur
            </a>
            <a href={mailtoHref(supplierEmail, mailToSupplierSubject, bonDeCommande)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-kurla-espresso border border-kurla-cream/15 text-[11px] text-kurla-cream/70 hover:text-kurla-cream flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Ouvrir dans Gmail
            </a>
          </div>
          <div className="mt-3 pt-3 border-t border-kurla-cream/10 space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Annonce réception au 3PL</p>
            <div className="rounded-xl bg-kurla-ink border border-kurla-cream/10 p-2.5">
              <pre className="text-[11px] text-kurla-cream/70 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-[120px] overflow-auto">{mailTo3PlBody}</pre>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copy(mailTo3PlBody, '3pl')} className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/15 text-[11px] text-kurla-cream/80 hover:border-kurla-copper/40 flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> {copied === '3pl' ? 'Copié !' : 'Copier'}</button>
              <a href={mailtoHref(threePlName.includes('@') ? threePlName : 'contact@etx-logistique.fr', mailTo3PlSubject, mailTo3PlBody)} className="px-3 py-1.5 rounded-full bg-kurla-espresso border border-kurla-cream/15 text-[11px] text-kurla-cream/70 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Envoyer au 3PL</a>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-espresso p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-kurla-cream/70 leading-relaxed">
            <p className="font-bold text-kurla-cream">Garde-fou : ne commande pas tant que A2 (contrat 3PL) et B1 (CPNP/RP) ne sont pas cochés.</p>
            <p className="mt-1 text-kurla-cream/50">Workflow : lun 18h batch → mar 10h commande groupée → jeu réception 3PL → jeu aprem expédition. Tampon = consigné chez 3PL, catalogue <code className="px-1 py-0.5 rounded bg-kurla-ink border border-kurla-cream/10 text-[10px]">launchCatalog.ts</code> inchangé.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={toggleOrdered} className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 ${ordered ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-kurla-ink text-kurla-cream/70 border-kurla-cream/15 hover:border-emerald-500/30'}`}>
            <Check className="w-4 h-4" /> {ordered ? 'Commandé ✓' : 'Marquer commandé'}
          </button>
          <button onClick={toggleReceived} disabled={!ordered} className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 ${received ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-kurla-ink text-kurla-cream/40 border-kurla-cream/10'} disabled:opacity-40`}>
            <Package className="w-4 h-4" /> {received ? 'Reçu ✓' : 'Marquer reçu'}
          </button>
        </div>
      </div>

      <details className="rounded-2xl border border-kurla-cream/10 bg-kurla-cream/[0.03] p-4">
        <summary className="text-xs font-bold text-kurla-cream cursor-pointer flex items-center gap-1.5"><Truck className="w-4 h-4 text-kurla-copper" /> Workflow 2×/semaine (détail)</summary>
        <div className="mt-3 space-y-1.5">
          {FULFILLMENT_WORKFLOW.map(step => (
            <div key={step.day} className="flex gap-3 text-[11px] text-kurla-cream/70"><span className="font-bold text-kurla-amber w-20 shrink-0">{step.day}</span><span className="w-24 shrink-0 text-kurla-cream/50">{step.actor}</span><span className="flex-1">{step.action}</span></div>
          ))}
        </div>
      </details>
    </div>
  );
}
