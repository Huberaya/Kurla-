import React, { useState } from 'react';
import { Beaker, Eye, FlaskConical, Mail, Package, ShieldCheck, Sparkles, Truck, Copy, Check } from 'lucide-react';

/**
 * C16 — Sourcing peau V-VI safe
 * Cahier des charges 15 actifs + 3 kits + 20 fournisseurs cibles (12 UE + 8 Afrique)
 * Source statique : docs/sourcing/cahier_des_charges_peau.md + fournisseurs_20.md + src/lib/skinIngredients15.ts
 * Pas d'invention : MOQ 50–100, test whitecast V-VI lumière du jour, précommande 3–5j lun/jeu 18h, sans parfum exigé.
 */

const ACTIFS = [
  { inci: 'Niacinamide', famille: 'unifiant', preuve: 'B', vv: 'oui', role: 'HPI transfert mélanosome', kit: 'KPEAU-02' },
  { inci: 'Azelaic Acid', famille: 'unifiant', preuve: 'B', vv: 'oui', role: 'HPI soir 3×/sem', kit: 'KPEAU-03' },
  { inci: 'Sodium Ascorbyl Phosphate', famille: 'antiox.', preuve: 'B', vv: 'oui', role: 'SAP 10% éclat matin', kit: 'KPEAU-03' },
  { inci: 'Retinol 0,3%', famille: 'anti-âge', preuve: 'A', vv: 'oui*', role: 'soir + SPF, ≠ AHA même soir', kit: 'hebdo' },
  { inci: 'Glycolic Acid 5%', famille: 'AHA', preuve: 'A', vv: 'oui', role: '1×/sem, ≠ rétinol', kit: 'hebdo' },
  { inci: 'Lactic Acid', famille: 'AHA', preuve: 'B', vv: 'oui', role: 'doux si sensible', kit: 'hebdo' },
  { inci: 'Salicylic Acid 2%', famille: 'BHA', preuve: 'A', vv: 'oui', role: 'pores, ≤2%', kit: 'hebdo' },
  { inci: 'Ceramide NP + Squalane', famille: 'barrière', preuve: 'B', vv: 'oui', role: 'céramides + cholestérol', kit: 'KPEAU-01/02' },
  { inci: 'Sodium Hyaluronate', famille: 'humectant', preuve: 'B', vv: 'oui', role: 'HA sur peau humide', kit: 'KPEAU-02' },
  { inci: 'Glycerin', famille: 'humectant', preuve: 'A', vv: 'oui', role: 'nettoyant sans sulfates', kit: 'KPEAU-01' },
  { inci: 'Panthenol', famille: 'apaisant', preuve: 'B', vv: 'oui', role: 'sans parfum si sensible', kit: '—' },
  { inci: 'Allantoin', famille: 'apaisant', preuve: 'B', vv: 'oui', role: 'sensible', kit: '—' },
  { inci: 'Centella Asiatica', famille: 'apaisant', preuve: 'B', vv: 'oui', role: 'cica barrière', kit: '—' },
  { inci: 'Tocopherol', famille: 'antiox.', preuve: 'B', vv: 'oui', role: 'vit E conservateur', kit: '—' },
  { inci: 'Filtres SPF hybrides/organiques', famille: 'SPF', preuve: 'A', vv: 'oui', role: 'SPF 50 sans trace blanche, 2 doigts', kit: 'KPEAU-01' },
];

const KITS = [
  { name: 'Essentielle', price: '49,70 €', contenu: 'Nettoyant glycérine 150ml + Crème céramides/squalane 50ml + SPF 50 invisible fluide 40ml', exigence: 'SPF invisible testé V–VI, sans parfum, gel léger / riche option', achat: '<22 € HT' },
  { name: 'Équilibrée', price: '62,00 €', contenu: 'Essentielle + Sérum niacinamide 5% 30ml + Gel HA 30ml', exigence: 'Niacinamide 5% sweet spot, HA sur peau humide, sans parfum', achat: '<30 € HT' },
  { name: 'Experte', price: '84,90 €', contenu: 'Équilibrée + Exfoliant AHA 5% 100ml + Baume lèvres céramides 15ml', exigence: 'AHA 5% doux, max 2% BHA, rétinol hebdo optionnel', achat: '<40 € HT' },
];

const FOURNISSEURS_UE = [
  { n: 1, nom: 'Laboratoire Naturcos', pays: 'FR Lyon', spe: 'White label bio céramides', moq: '50', statut: 'J0', contact: 'naturcos.fr/contact' },
  { n: 2, nom: 'Cosmetic Factory', pays: 'FR Toulouse', spe: 'Fluide SPF hybride invisible', moq: '100', statut: 'J0', contact: 'cosmeticfactory.fr' },
  { n: 3, nom: 'BioSphère Lab', pays: 'BE Bruxelles', spe: 'Niacinamide 5% + HA', moq: '50', statut: 'J0', contact: 'biospherelab.be' },
  { n: 4, nom: 'Sakura Cosmetique', pays: 'FR Paris', spe: 'Gel nettoyant glycérine', moq: '50', statut: 'J1', contact: 'sakura-cosmetique.fr' },
  { n: 5, nom: 'Nordic Skin Lab', pays: 'NL Amsterdam', spe: 'AHA 5% doux', moq: '100', statut: 'J1', contact: 'nordicskinlab.nl' },
  { n: 6, nom: 'Iberian Derma', pays: 'ES Barcelone', spe: 'Baume céramides', moq: '50', statut: 'J1', contact: 'iberianderma.es' },
  { n: 7, nom: 'Swiss Derma PL', pays: 'CH Genève', spe: 'SPF teinté (option)', moq: '100', statut: 'Veille', contact: 'swissderma.ch' },
  { n: 8, nom: 'Atelier des Sens', pays: 'FR Nantes', spe: 'Hub log Nantes', moq: '50', statut: 'J0 log', contact: 'atelierdessens.fr' },
  { n: 9, nom: 'Green Labo', pays: 'FR Lille', spe: 'Allantoïne/panthénol', moq: '50', statut: 'J1', contact: 'greenlabo.fr' },
  { n: 10, nom: 'Centella Europe', pays: 'IT Milan', spe: 'Centella 5%', moq: '50', statut: 'J2', contact: 'centellaeurope.it' },
  { n: 11, nom: 'Pharma Cosmetique', pays: 'FR Marseille', spe: 'Vit C SAP 10%', moq: '50', statut: 'J2', contact: 'pharmacosmetique.fr' },
  { n: 12, nom: 'Azelaic Lab', pays: 'DE Berlin', spe: 'Azélaïque 10%', moq: '50', statut: 'J2', contact: 'azelaiclab.de' },
];

const FOURNISSEURS_AF = [
  { n: 13, nom: 'Dakar Lab Cosmetique', pays: 'SN Dakar', spe: 'White label Dakar céramides', moq: '50', statut: 'J0 prio SN', contact: 'dakarlab.sn' },
  { n: 14, nom: 'Abidjan Derma', pays: 'CI Abidjan', spe: 'SPF hybride peau foncée', moq: '50', statut: 'J0', contact: 'abidjanderma.ci' },
  { n: 15, nom: 'Casablanca Cosmetique', pays: 'MA Casablanca', spe: 'Squalane végétal', moq: '50', statut: 'J1', contact: 'casacosmetique.ma' },
  { n: 16, nom: 'Yaoundé Nature Lab', pays: 'CM Yaoundé', spe: 'Huiles/squalane', moq: '100', statut: 'Veille', contact: 'yaoundenature.cm' },
  { n: 17, nom: 'Afro Beauty Dakar', pays: 'SN Dakar', spe: 'Packaging afro premium', moq: '100', statut: 'J1', contact: 'afrobeautydakar.sn' },
  { n: 18, nom: 'Lagos Skin Hub', pays: 'NG Lagos', spe: 'Niacinamide (anglais)', moq: '100', statut: 'Veille', contact: 'lagoskinhub.ng' },
  { n: 19, nom: 'Tunis Derma', pays: 'TN Tunis', spe: 'AHA/BHA doux', moq: '50', statut: 'J2', contact: 'tunisderma.tn' },
  { n: 20, nom: 'Rabat Labo', pays: 'MA Rabat', spe: 'Log MA→FR', moq: '50', statut: 'J1', contact: 'rabatlabo.ma' },
];

const EMAIL_TEMPLATE = `Objet: KURLA — kits peau V-VI safe 49,70/62/84,90€ (MOQ 50, précommande)

Bonjour,

KURLA lance son pôle peau peaux riches en mélanine (phototypes IV–VI, HPI). 15 actifs documentés, 15 besoins, 3 kits en précommande 3–5j (lun/jeu 18h, 0 stock Paris, Stripe TEST).

Besoin échantillon 1 kit complet + test whitecast phototype V–VI en lumière du jour avant commande.

Questions :
- MOQ et prix HT par kit (50 et 100 unités) ?
- Délai échantillon et délai prod 50/100 ?
- Certificats ISO 22716, CosIng, INCI normalisé, sans parfum possible ?
- SPF 50 invisible : hybride/organique, white cast faible testé V–VI ?

Cahier joint (15 actifs + kits). Retour attendu sous 7j.

Bien à vous,
KURLA — pôle peau`;

export const PeauSourcingCahierPanel: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const copyMail = async () => {
    try { await navigator.clipboard.writeText(EMAIL_TEMPLATE); setCopied(true); setTimeout(()=>setCopied(false), 2500); } catch {}
  };
  return (
    <div className="rounded-3xl bg-kurla-espresso border border-kurla-cream/10 p-6 sm:p-8 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-kurla-copper" /> C16 — Sourcing peau V-VI safe
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">15 actifs + 20 fournisseurs</span>
          </h3>
          <p className="text-xs text-kurla-cream/60 mt-1 max-w-3xl leading-relaxed">
            Cahier des charges peau à envoyer aux façonniers : <strong className="text-kurla-cream">15 actifs documentés V-VI safe</strong> (preuves A/B), 3 kits 49,70/62/84,90€, <strong className="text-kurla-cream">MOQ 50–100</strong> (1er run, pas 500), test <strong className="text-emerald-300">whitecast V–VI lumière du jour</strong> obligatoire pour tout SPF, <strong className="text-kurla-cream">sans parfum exigé</strong> si sensible. Précommande 3–5j lun/jeu 18h, 0 stock Paris, Stripe TEST.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/docs/sourcing/cahier_des_charges_peau.md" target="_blank" className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/15 text-xs font-semibold hover:border-kurla-copper">Cahier .md</a>
          <a href="/docs/sourcing/fournisseurs_20.md" target="_blank" className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/15 text-xs font-semibold hover:border-kurla-copper">20 fournisseurs .md</a>
          <button onClick={copyMail} className="px-3 py-1.5 rounded-full bg-kurla-copper hover:bg-kurla-amber text-white text-xs font-bold flex items-center gap-1.5">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copié !' : 'Copier mail type'}
          </button>
        </div>
      </div>

      {/* Gardes */}
      <div className="grid sm:grid-cols-3 gap-3 text-[11px]">
        <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
          <span className="text-emerald-100 leading-relaxed"><strong>Uniformiser ≠ éclaircir</strong> · garde HPI : marques post-bouton, pas carnation. Aucun claim dépigmentant.</span>
        </div>
        <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/20 flex gap-2">
          <Eye className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <span className="text-amber-100 leading-relaxed"><strong>SPF : naturel 13 ≠ protection</strong> · 2 doigts, filtre déclaré, whitecast faible V–VI.</span>
        </div>
        <div className="p-3 rounded-2xl bg-sky-950/30 border border-sky-500/20 flex gap-2">
          <Beaker className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
          <span className="text-sky-100 leading-relaxed"><strong>Rétinol × AHA même soir bloqué</strong> · rétinol 0,3% 2×/sem, AHA 5% 1×/sem, alterner.</span>
        </div>
      </div>

      {/* 15 actifs */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-kurla-amber flex items-center gap-1.5 mb-2"><Sparkles className="w-3.5 h-3.5" /> 15 actifs documentés — source unique skinIngredients15.ts</h4>
        <div className="overflow-x-auto rounded-2xl border border-kurla-cream/10">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-kurla-ink text-kurla-amber uppercase tracking-wider text-[10px]">
              <tr><th className="px-2.5 py-2">#</th><th className="px-2.5 py-2">Actif (INCI)</th><th className="px-2.5 py-2">Famille</th><th className="px-2.5 py-2">Preuve</th><th className="px-2.5 py-2">V-VI</th><th className="px-2.5 py-2">Rôle HPI/barrière/SPF</th><th className="px-2.5 py-2">Kit</th></tr>
            </thead>
            <tbody className="divide-y divide-kurla-cream/5">
              {ACTIFS.map((a,i)=> (
                <tr key={a.inci} className="hover:bg-kurla-cream/[0.02]">
                  <td className="px-2.5 py-1.5 text-kurla-cream/40">{i+1}</td>
                  <td className="px-2.5 py-1.5 font-semibold text-kurla-cream">{a.inci}</td>
                  <td className="px-2.5 py-1.5 text-kurla-cream/70">{a.famille}</td>
                  <td className="px-2.5 py-1.5"><span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${a.preuve==='A'?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-sky-500/15 text-sky-300 border-sky-500/30'}`}>{a.preuve}</span></td>
                  <td className="px-2.5 py-1.5 text-emerald-300 font-bold">{a.vv}</td>
                  <td className="px-2.5 py-1.5 text-kurla-cream/60 leading-snug">{a.role}</td>
                  <td className="px-2.5 py-1.5 font-mono text-kurla-amber text-[10px]">{a.kit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-kurla-cream/40 mt-1.5">INCI normalisé, CosIng fichier+date, <code className="px-1 py-0.5 rounded bg-kurla-ink border border-kurla-cream/10">containsFragrance</code> booléen, <code>routineStep</code> matin 6/soir 8/hebdo 3. Prix achat cible : Essentielle &lt;22€, Équilibrée &lt;30€, Experte &lt;40€ HT.</p>
      </div>

      {/* Kits */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-kurla-amber flex items-center gap-1.5 mb-2"><Package className="w-3.5 h-3.5" /> 3 kits vente (pas achat) — prix publics</h4>
        <div className="grid md:grid-cols-3 gap-3">
          {KITS.map(k=> (
            <div key={k.name} className="p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-sm font-bold text-kurla-cream">{k.name}</span><span className="text-sm font-bold text-emerald-300">{k.price}</span></div>
              <p className="text-[11px] text-kurla-cream/70 leading-relaxed">{k.contenu}</p>
              <p className="text-[11px] text-kurla-amber leading-relaxed">{k.exigence}</p>
              <p className="text-[10px] font-mono text-kurla-cream/50">Achat cible {k.achat} HT — port 4,90€ Essentielle, gratuit 62/84,90</p>
            </div>
          ))}
        </div>
      </div>

      {/* 20 fournisseurs */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-kurla-amber flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> 20 fournisseurs cibles — 12 UE + 8 Afrique (MOQ 50–100, V-VI safe, ISO 22716)</h4>
        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-200">0 contact existant. Prospection à froid — <strong>J0 : 5 mails UE + SN prioritaire</strong> (1,2,3,8,13), <strong>J1 : 6 mails</strong> (4,5,6,9,15,17), <strong>J2 : 4 mails</strong> + relance J0 à J+3. <strong>KPI J+7 : &gt;30% réponse (6/20), 3 échantillons, 1 whitecast V–VI validé</strong>.</div>
        {[
          { title: 'UE — 12 cibles (stock partenaire 24–72h, précommande 3–5j)', rows: FOURNISSEURS_UE, tone: 'emerald' },
          { title: 'Afrique — 8 cibles (hub Dakar/Abidjan, Wave/MTN, français)', rows: FOURNISSEURS_AF, tone: 'sky' },
        ].map(group=> (
          <div key={group.title} className="overflow-x-auto rounded-2xl border border-kurla-cream/10">
            <div className={`px-3 py-2 text-[11px] font-bold ${group.tone==='emerald'?'bg-emerald-500/10 text-emerald-300':'bg-sky-500/10 text-sky-300'}`}>{group.title}</div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-kurla-ink text-kurla-cream/50 uppercase tracking-wider text-[10px]">
                <tr><th className="px-2.5 py-1.5">#</th><th className="px-2.5 py-1.5">Fournisseur</th><th className="px-2.5 py-1.5">Pays</th><th className="px-2.5 py-1.5">Spécialité</th><th className="px-2.5 py-1.5">MOQ</th><th className="px-2.5 py-1.5">Quand</th><th className="px-2.5 py-1.5">Contact</th></tr>
              </thead>
              <tbody className="divide-y divide-kurla-cream/5">
                {group.rows.map(r=> (
                  <tr key={r.n} className="hover:bg-kurla-cream/[0.02]">
                    <td className="px-2.5 py-1.5 text-kurla-cream/40">{r.n}</td>
                    <td className="px-2.5 py-1.5 font-semibold text-kurla-cream">{r.nom}</td>
                    <td className="px-2.5 py-1.5 text-kurla-cream/60">{r.pays}</td>
                    <td className="px-2.5 py-1.5 text-kurla-cream/70">{r.spe}</td>
                    <td className="px-2.5 py-1.5 font-mono text-kurla-amber">{r.moq}</td>
                    <td className="px-2.5 py-1.5"><span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${r.statut.includes('J0')?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30': r.statut==='Veille'?'bg-kurla-cream/5 text-kurla-cream/40 border-kurla-cream/10':'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>{r.statut}</span></td>
                    <td className="px-2.5 py-1.5 font-mono text-sky-300 text-[10px]">{r.contact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <a href="mailto:?subject=KURLA%20%E2%80%94%20kits%20peau%20V-VI%20safe&body=Bonjour%2C%0A%0AKURLA%20lance%20son%20p%C3%B4le%20peau..." className="px-3 py-1.5 rounded-full bg-kurla-copper text-white text-xs font-bold flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Mail type J0 (5 mails)</a>
          <span className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/10 text-xs text-kurla-cream/60">Objet : KURLA — kits peau V-VI safe 49,70/62/84,90€ (MOQ 50, précommande) — échantillon 1 kit + whitecast V–VI lumière du jour</span>
        </div>
      </div>

      <p className="text-[10px] text-kurla-cream/35 leading-relaxed text-center">C16 — doc sources : <span className="text-kurla-amber">cahier_des_charges_peau.md</span> + <span className="text-kurla-amber">fournisseurs_20.md</span> + <span className="text-kurla-amber">skinIngredients15.ts</span> + <span className="text-kurla-amber">peauKits.ts</span>. Aucun fournisseur contacté tant que précommandes non validées — « nous allons commencer par 5 mails J0 » (pas « nous pourrions »).</p>
    </div>
  );
};
