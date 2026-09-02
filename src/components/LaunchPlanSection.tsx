import React from 'react';
import {
  LAUNCH_PRODUCTS, LAUNCH_KITS, LAUNCH_ROUTINES, LAUNCH_TOOLS,
  FIRST_CLIENTS, FINANCE_SCENARIOS, LAUNCH_ACTIONS, SOURCING_PLAN,
} from '../lib/launchCatalog';
import { Package, Boxes, ListOrdered, Wrench, Users, Wallet, Truck, ListChecks } from 'lucide-react';

const eur = (v: number) => `${v.toLocaleString('fr-FR').replace(',', ',')} €`;

function BlockTitle({ icon: Icon, title, sub }: { icon: any; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-[#C8753D]" />
      <div>
        <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold">{title}</h3>
        {sub && <p className="text-[11px] text-[#FFF7EF]/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5 ${className}`}>{children}</div>;
}
const prod = (id: string) => LAUNCH_PRODUCTS.find(p => p.id === id);

export function LaunchPlanSection() {
  return (
    <div className="space-y-8">
      {/* CATALOGUE PRODUITS */}
      <div id="catalogue">
        <BlockTitle icon={Package} title="Catalogue de lancement — 18 SKU décidés" sub="Marque = cible de sourcing (à contacter) · coût = objectif d’achat HT (cible de négoce, pas un devis) · statut = à sourcer/vérifier." />
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-[11px] min-w-[820px]">
            <thead>
              <tr className="text-left text-[#FFF7EF]/45 border-b border-[#FFF7EF]/10">
                <th className="px-3 py-2 font-medium">Produit</th>
                <th className="px-3 py-2 font-medium">Cat.</th>
                <th className="px-3 py-2 font-medium">Marque cible</th>
                <th className="px-3 py-2 font-medium">Cheveux</th>
                <th className="px-3 py-2 font-medium text-right">Vente</th>
                <th className="px-3 py-2 font-medium text-right">Coût*</th>
                <th className="px-3 py-2 font-medium text-right">Marge</th>
                <th className="px-3 py-2 font-medium">Réachat</th>
              </tr>
            </thead>
            <tbody>
              {LAUNCH_PRODUCTS.map(p => (
                <tr key={p.id} className="border-b border-[#FFF7EF]/5 last:border-0 align-top">
                  <td className="px-3 py-2">
                    <p className="font-bold text-[#FFF7EF]">{p.name}</p>
                    <p className="text-[10px] text-[#FFF7EF]/55">{p.problem}</p>
                    <p className="text-[9px] text-[#D49A63]/80 italic mt-0.5">{p.strategic}</p>
                  </td>
                  <td className="px-3 py-2 text-[#FFF7EF]/65">{p.category}</td>
                  <td className="px-3 py-2 text-[#FFF7EF]/65">{p.brandTarget}</td>
                  <td className="px-3 py-2 text-[#FFF7EF]/65 whitespace-nowrap">{p.hairType}</td>
                  <td className="px-3 py-2 text-right font-bold text-[#FFF7EF] whitespace-nowrap">{eur(p.retailPriceEur)}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/55 whitespace-nowrap">{eur(p.targetCostEur)}</td>
                  <td className="px-3 py-2 text-right text-emerald-300/90">{p.marginPct}%</td>
                  <td className="px-3 py-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${p.repurchase === 'fort' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-[#FFF7EF]/10 text-[#FFF7EF]/60'}`}>{p.repurchase}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-[10px] text-[#FFF7EF]/40 mt-2 italic">* Marge brute réelle calculée sur le prix HT (TVA 20 % déduite) : les objectifs de coût donnent ~34 % sur les soins et ~56-60 % sur les accessoires. Pour viser 45 % de marge HT réelle, les coûts d’achat doivent être renégociés (~46 % du prix TTC). Le coût réel est saisi à réception de la grille fournisseur. Aucun produit n’est publié avant fiche ingrédient + conformité UE (Règl. 1223/2009).</p>
      </div>

      {/* KITS */}
      <div id="kits">
        <BlockTitle icon={Boxes} title="6 kits de lancement" sub="Le kit réduit la décision et fait monter le panier moyen ; remise client ~10-15 % vs prix séparés." />
        <div className="grid md:grid-cols-2 gap-3">
          {LAUNCH_KITS.map(k => {
            const saving = Math.round((k.retailPriceEur - k.kitPriceEur) * 100) / 100;
            return (
              <Card key={k.id} className="!p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#FFF7EF]">{k.name}</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${k.tier === 'PREMIUM' ? 'bg-[#D49A63]/25 text-[#D49A63]' : k.tier === 'CORE' ? 'bg-[#C8753D]/20 text-[#D49A63]' : 'bg-[#FFF7EF]/10 text-[#FFF7EF]/70'}`}>{k.tier}</span>
                </div>
                <p className="text-[10px] text-[#FFF7EF]/50 mt-0.5">Cheveux {k.hairType} · {k.clientTarget}</p>
                <ol className="mt-2 space-y-0.5">
                  {k.productIds.map(pid => {
                    const pr = prod(pid);
                    return pr ? <li key={pid} className="text-[11px] text-[#FFF7EF]/70 flex justify-between gap-2"><span>{pr.name}</span><span className="text-[#FFF7EF]/40 whitespace-nowrap">{eur(pr.retailPriceEur)}</span></li> : null; })}
                </ol>
                <div className="mt-3 pt-2 border-t border-[#FFF7EF]/10 grid grid-cols-3 gap-1 text-center">
                  <div><p className="text-[9px] text-[#FFF7EF]/45">Séparément</p><p className="text-[11px] text-[#FFF7EF]/50 line-through">{eur(k.retailPriceEur)}</p></div>
                  <div><p className="text-[9px] text-[#FFF7EF]/45">Kit</p><p className="text-sm font-bold text-[#FFF7EF]">{eur(k.kitPriceEur)}</p></div>
                  <div><p className="text-[9px] text-[#FFF7EF]/45">Marge KURLA</p><p className="text-sm font-bold text-emerald-300">{eur(k.marginEur)}</p></div>
                </div>
                <p className="text-[10px] text-emerald-300/80 mt-1 text-center">Client économise {eur(saving)}</p>
                <p className="text-[10px] text-[#D49A63]/90 mt-2">{k.strategic} Complément : {k.complement}.</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ROUTINES */}
      <div id="routines">
        <BlockTitle icon={ListOrdered} title="5 routines concrètes" sub="Chaque étape pointe un produit du catalogue ; total = prix des produits au détail." />
        <div className="grid md:grid-cols-2 gap-3">
          {LAUNCH_ROUTINES.map(r => (
            <Card key={r.id} className="!p-4">
              <p className="text-sm font-bold text-[#FFF7EF]">{r.name}</p>
              <p className="text-[10px] text-[#FFF7EF]/50">{r.profile} · objectif : {r.goal}</p>
              <ol className="mt-2 space-y-1">
                {r.steps.map((st, i) => {
                  const pr = prod(st.productId);
                  return <li key={i} className="text-[11px] text-[#FFF7EF]/70 flex gap-2"><span className="text-[#C8753D] font-bold">{i + 1}.</span><span className="flex-1">{st.step} — <span className="text-[#FFF7EF]">{pr?.name}</span></span><span className="text-[#FFF7EF]/40">{pr ? eur(pr.retailPriceEur) : ''}</span></li>;
                })}
              </ol>
              <div className="mt-2 pt-2 border-t border-[#FFF7EF]/10 flex items-center justify-between">
                <p className="text-[11px] text-[#FFF7EF]/60">Total détail</p>
                <p className="text-sm font-bold text-[#FFF7EF]">{eur(r.totalPriceEur)}</p>
              </div>
              <p className="text-[10px] text-[#FFF7EF]/55 mt-1">Éco : {r.budgetAlt}</p>
              <p className="text-[10px] text-[#D49A63]/90">Premium : {r.premiumAlt}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* OUTILS */}
      <div id="outils">
        <BlockTitle icon={Wrench} title="Outils KURLA — au lancement vs plus tard" sub="Les fonctions de confiance (diagnostic, transparence) sont gratuites à jamais." />
        <div className="grid md:grid-cols-2 gap-2">
          {LAUNCH_TOOLS.map(t => (
            <Card key={t.id} className="!p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#FFF7EF]">{t.name}</p>
                <div className="flex gap-1 shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.price === 'gratuit' ? 'bg-emerald-500/15 text-emerald-300' : t.price === 'Plus' ? 'bg-[#D49A63]/25 text-[#D49A63]' : 'bg-sky-400/20 text-sky-200'}`}>{t.price === 'gratuit' ? 'GRATUIT' : t.price}</span>
                  {!t.atLaunch && <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FFF7EF]/10 text-[#FFF7EF]/60">Phase {t.phase}</span>}
                  {t.atLaunch && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#C8753D]/25 text-[#C8753D]">JOUR 1</span>}
                </div>
              </div>
              <p className="text-[10px] text-[#FFF7EF]/60 mt-1">{t.problem}</p>
              <p className="text-[10px] text-[#FFF7EF]/50 mt-0.5"><b className="text-[#FFF7EF]/75">Valeur business :</b> {t.businessValue}</p>
              <p className="text-[10px] text-[#FFF7EF]/50"><b className="text-[#FFF7EF]/75">KPI :</b> {t.kpi} · <b className="text-[#FFF7EF]/75">Quand :</b> {t.moment}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* PREMIERS CLIENTS */}
      <div id="clients">
        <BlockTitle icon={Users} title="Les premiers clients — de 10 à 10 000" />
        <div className="grid md:grid-cols-2 gap-3">
          {FIRST_CLIENTS.map(c => (
            <Card key={c.milestone} className="!p-4">
              <p className="text-sm font-bold text-[#FFF7EF]">{c.milestone}</p>
              <p className="text-[11px] text-[#FFF7EF]/70 mt-1"><b className="text-[#D49A63]">Comment :</b> {c.how}</p>
              <p className="text-[11px] text-[#FFF7EF]/70 mt-1"><b className="text-[#D49A63]">Offre :</b> {c.offer}</p>
              <p className="text-[11px] text-[#FFF7EF]/70 mt-1"><b className="text-[#D49A63]">Message :</b> « {c.message} »</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px]">
                <span className="text-[#FFF7EF]/55">Canal : {c.channel}</span>
                <span className="text-[#FFF7EF]/55">Budget : {c.budget}</span>
              </div>
              <p className="text-[10px] text-emerald-300/90 mt-1 font-bold">Objectif : {c.objective}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* SCÉNARIOS FINANCIERS */}
      <div id="scenarios">
        <BlockTitle icon={Wallet} title="Modèle financier — pour 1 000 visiteurs/mois (base M3)" sub="Le scénario CENTRAL est notre référence de pilotage." />
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-[11px] min-w-[680px]">
            <thead>
              <tr className="text-left text-[#FFF7EF]/45 border-b border-[#FFF7EF]/10">
                <th className="px-3 py-2 font-medium">Scénario</th>
                <th className="px-3 py-2 font-medium text-right">Conversion</th>
                <th className="px-3 py-2 font-medium text-right">Commandes</th>
                <th className="px-3 py-2 font-medium text-right">AOV</th>
                <th className="px-3 py-2 font-medium text-right">CA produits</th>
                <th className="px-3 py-2 font-medium text-right">Marge brute</th>
                <th className="px-3 py-2 font-medium text-right">Coût acquisition</th>
                <th className="px-3 py-2 font-medium text-right">+ MRR</th>
                <th className="px-3 py-2 font-medium text-right">Résultat net*</th>
              </tr>
            </thead>
            <tbody>
              {FINANCE_SCENARIOS.map(s => (
                <tr key={s.id} className={`border-b border-[#FFF7EF]/5 last:border-0 ${s.reference ? 'bg-[#C8753D]/10' : ''}`}>
                  <td className="px-3 py-2 font-bold text-[#FFF7EF]">{s.label}{s.reference && <span className="ml-1 text-[9px] text-[#C8753D]">◀ pilotage</span>}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/70">{(s.purchaseRate * 100).toFixed(1).replace('.', ',')} %</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/70">{s.orders}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/70">{eur(s.aov)}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]">{eur(s.productRevenue)}</td>
                  <td className="px-3 py-2 text-right text-emerald-300/90">{eur(s.grossMargin)}</td>
                  <td className="px-3 py-2 text-right text-rose-300/80">{eur(s.acquisitionCost)}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/70">{eur(s.mrr)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${s.netResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{eur(s.netResult)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-[10px] text-[#FFF7EF]/40 mt-2 italic">* Après marge brute + MRR − coût d’acquisition − ~700 € de frais fixes/tech mensuels. La leçon : à 1 000 visiteurs, seuls les scénarios central/ambitieux approchent l’équilibre → d’où la priorité absolue sur le trafic (TikTok/SEO) et l’AOV (kits).</p>
      </div>

      {/* APPROVISIONNEMENT */}
      <div id="sourcing">
        <BlockTitle icon={Truck} title="Stratégie d’approvisionnement & conformité" />
        <Card className="text-[12px] space-y-2 text-[#FFF7EF]/75">
          <p><b className="text-[#D49A63]">Décision :</b> {SOURCING_PLAN.decision}</p>
          <p><b className="text-[#D49A63]">Marques cibles :</b> {SOURCING_PLAN.brands.join(', ')}.</p>
          <p><b className="text-[#D49A63]">Premier lot :</b> {SOURCING_PLAN.firstOrder}</p>
          <p><b className="text-[#D49A63]">MOQ/tarifs :</b> {SOURCING_PLAN.moq}</p>
          <p><b className="text-[#D49A63]">Stockage :</b> {SOURCING_PLAN.storage}</p>
          <p><b className="text-[#D49A63]">Livraison :</b> {SOURCING_PLAN.delivery}</p>
          <p><b className="text-[#D49A63]">Retours :</b> {SOURCING_PLAN.returns}</p>
          <p className="rounded-lg bg-rose-500/8 border border-rose-500/25 p-2 text-[11px] text-rose-100"><b>Conformité :</b> {SOURCING_PLAN.compliance}</p>
        </Card>
      </div>

      {/* 20 ACTIONS */}
      <div id="launch-actions">
        <BlockTitle icon={ListChecks} title="File d’exécution — les 20 premières actions" sub="Le moteur d’actions du BCC suit les blocants en temps réel ; ceci est le plan ordonnancé." />
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-[11px] min-w-[640px]">
            <thead>
              <tr className="text-left text-[#FFF7EF]/45 border-b border-[#FFF7EF]/10">
                <th className="px-3 py-2 font-medium">Sem.</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Resp.</th>
                <th className="px-3 py-2 font-medium">Dépendance</th>
                <th className="px-3 py-2 font-medium">KPI</th>
              </tr>
            </thead>
            <tbody>
              {LAUNCH_ACTIONS.map(a => (
                <tr key={a.id} className="border-b border-[#FFF7EF]/5 last:border-0">
                  <td className="px-3 py-2 font-bold text-[#C8753D]">S{a.week}</td>
                  <td className="px-3 py-2 text-[#FFF7EF]">{a.title}</td>
                  <td className="px-3 py-2 text-[#FFF7EF]/60">{a.owner}</td>
                  <td className="px-3 py-2 text-[#FFF7EF]/50">{a.dep}</td>
                  <td className="px-3 py-2 text-[#FFF7EF]/60">{a.kpi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
