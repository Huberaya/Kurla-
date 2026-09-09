import React from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, Clock, Package, Truck, Euro, Image as ImageIcon, ClipboardCheck, Sparkles, ExternalLink, ArrowRight, Shield, Boxes } from 'lucide-react';

export const DropshipGuidePanel: React.FC<{ onCreateTool?: () => void }> = ({ onCreateTool }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1A0F0A] to-[#050403] border border-emerald-500/30 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-emerald-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Fiche opérationnelle — sans stock Paris
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF] leading-tight">
              Comment placer un outil en dropshipping<br />
              <span className="text-emerald-300">24–48h — 0 carton chez toi</span>
            </h2>
            <p className="text-[11px] text-[#FFF7EF]/60 leading-relaxed max-w-2xl">
              La fiche complète affichée ici. Même contenu que <code className="px-1.5 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10 text-emerald-300">FICHE_PLACER_OUTILS_DROPSHIP.md</code> en dépôt.
              Objectif : ajouter un accessoire vendu depuis le partenaire UE (AfricanFabs / Afro Wholesale, NL) — marge 60–66% HT, panier mixte = 1 seul colis via 3PL à Etx 95.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> Autonome — toggle admin
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <Boxes className="w-5 h-5 mx-auto text-emerald-300" />
            <p className="text-[11px] font-bold text-emerald-200 mt-1">0 carton Paris</p>
            <p className="text-[10px] text-[#FFF7EF]/45">Appartement intact</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
            <Clock className="w-5 h-5 mx-auto text-indigo-300" />
            <p className="text-[11px] font-bold text-indigo-200 mt-1">24–48h</p>
            <p className="text-[10px] text-[#FFF7EF]/45">NL → 3PL → cliente</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <Euro className="w-5 h-5 mx-auto text-amber-300" />
            <p className="text-[11px] font-bold text-amber-200 mt-1">Marge 55–66%</p>
            <p className="text-[10px] text-[#FFF7EF]/45">HT, pas de CPNP</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#C8753D]/10 border border-[#C8753D]/20 text-center">
            <Truck className="w-5 h-5 mx-auto text-[#D49A63]" />
            <p className="text-[11px] font-bold text-[#F3C9A4] mt-1">1 seul colis</p>
            <p className="text-[10px] text-[#FFF7EF]/45">Mixte 3–5j via 3PL</p>
          </div>
        </div>

        {onCreateTool && (
          <div className="flex flex-wrap gap-2">
            <button onClick={onCreateTool} className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow">
              Créer un outil maintenant <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-[#FFF7EF]/45 self-center">Ouvre directement la fiche <code className="text-emerald-300">Catalogue produits</code> avec la case <code className="text-emerald-300">☑ Dropship 24–48h</code></span>
          </div>
        )}
        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-100 leading-relaxed">
            <strong>Oui, tu peux le faire seul — sans passer par le dev</strong> depuis <code className="px-1 py-0.5 rounded bg-[#050403] text-emerald-200">Admin → Catalogue & Stock → Guide dropship 0 carton</code> ou directement dans la fiche produit via la case verte <code className="px-1 py-0.5 rounded bg-[#050403] text-emerald-200">☑ Dropship 24–48h</code> (ajouté 2026-09-08). Le badge boutique passe au vert instantanément, sans redéploiement.
          </p>
        </div>
        <p className="text-[11px] text-[#FFF7EF]/35">Règle d’or Année 1 : <code className="font-mono">launchCatalog.ts</code> ne bouge jamais. Les outils dropship sont une <em>couche fulfillment</em> (<code className="font-mono">fulfillment.ts</code> + <code className="font-mono">badges</code>).</p>
      </div>

      {/* 1 — Critères */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 shadow-xl space-y-5">
        <h3 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-[#C8753D]" /> 1. Quand un outil est bon pour KURLA ?
        </h3>
        <p className="text-xs text-[#FFF7EF]/55">Coche les 5 cases — sinon passe :</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#FFF7EF]/10 text-[#D49A63] uppercase tracking-wider text-[10px]">
                <th className="py-2 px-3">Critère</th>
                <th className="py-2 px-3">OK si</th>
                <th className="py-2 px-3">Exemple</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FFF7EF]/5 text-[#FFF7EF]/80">
              <tr><td className="py-2.5 px-3 font-bold text-[#FFF7EF]">Usage réel 4C</td><td className="py-2.5 px-3">Geste bloquant (démêler, protéger nuit, définir, tresses/locs)</td><td className="py-2.5 px-3 text-emerald-300">Peigne afro → volume racines</td></tr>
              <tr><td className="py-2.5 px-3 font-bold text-[#FFF7EF]">Dropship à l’unité</td><td className="py-2.5 px-3">Fournisseur expédie 1 pièce, picking ≤2,50€, DPD 24–48h</td><td className="py-2.5 px-3 text-emerald-300">AfricanFabs : 2€/colis</td></tr>
              <tr><td className="py-2.5 px-3 font-bold text-[#FFF7EF]">Marge HT ≥55%</td><td className="py-2.5 px-3">TTC/1,20 – coût HT ≥55% de TTC/1,20</td><td className="py-2.5 px-3 text-emerald-300">12,90€ TTC → coût max 4,80€</td></tr>
              <tr><td className="py-2.5 px-3 font-bold text-[#FFF7EF]">Pas de CPNP</td><td className="py-2.5 px-3">Accessoire, pas cosmétique (1223/2009)</td><td className="py-2.5 px-3 text-emerald-300">Bonnet satin : aucun dossier</td></tr>
              <tr><td className="py-2.5 px-3 font-bold text-[#FFF7EF]">Photo exploitable</td><td className="py-2.5 px-3">HD fond clair + usage 4C</td><td className="py-2.5 px-3 text-emerald-300">Peigne afro sur cheveux 4C</td></tr>
            </tbody>
          </table>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20">
            <p className="text-[11px] font-bold text-emerald-300">Exemples — tous les accessoires en 24–48h</p>
            <ul className="text-[11px] text-[#FFF7EF]/70 mt-1.5 space-y-1">
              <li><code className="text-emerald-300">p35</code> Afro pick métal 4,90€ → 65%</li>
              <li><code className="text-emerald-300">p17</code> Bonnet satin + taie 12,90€ → 63%</li>
              <li><code className="text-emerald-300">p41</code> Éponge twist 8,90€ → 65%</li>
            </ul>
          </div>
          <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/20">
            <p className="text-[11px] font-bold text-rose-300">3 à éviter en dropship</p>
            <ul className="text-[11px] text-[#FFF7EF]/60 mt-1.5 space-y-1">
              <li>Steamer 42€ HT avec SAV électrique → précommande tampon</li>
              <li>Kit 7 outils 45€ HT → éclater en unités</li>
              <li>Sans photo 4C → retours x2</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2 — Workflow */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 shadow-xl space-y-6">
        <h3 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#C8753D]" /> 2. Workflow en 7 étapes (10 min si fournisseur OK)
        </h3>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2">
            <h4 className="text-xs font-bold text-[#D49A63] flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white grid place-items-center text-[11px]">1</span> Repérage (2 min)</h4>
            <p className="text-[11px] text-[#FFF7EF]/60">Note : nom fournisseur exact, réf + EAN, HT unitaire + grille 1/10/50, stock NL + délai.</p>
            <div className="p-2.5 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/5">
              <p className="text-[11px] font-mono text-[#D49A63]">Mail type (Admin → Fournisseurs) :</p>
              <p className="text-[11px] text-[#FFF7EF]/70 italic mt-1">“Hello AfricanFabs, do you dropship this tool per unit to our 3PL near Paris (Etx 95)? Price HT per unit + picking fee per parcel + lead time NL→FR? We need 1 unit test, then ~5–20/week. No CPNP (non-cosmetic).”</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2">
            <h4 className="text-xs font-bold text-[#D49A63] flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white grid place-items-center text-[11px]">2</span> Vérif prix/marge (1 min)</h4>
            <p className="text-[11px] text-[#FFF7EF]/60"><code className="text-[#D49A63]">marge HT = (TTC/1,20 – coût HT) / (TTC/1,20)</code> — 7,90€ TTC/1,20=6,58€ HT, si coût 2,70€ → 59% OK. Grille : impulsif 4,90–6,90€ · cœur 7,90–12,90€ · premium 12,90–14,90€.</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#050403] border border-emerald-500/20 space-y-2">
            <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-600 text-white grid place-items-center text-[11px]">3</span> Création fiche en admin (3 min)</h4>
            <p className="text-[11px] text-[#FFF7EF]/60"><code className="text-emerald-300">Admin → Catalogue & Stock → Catalogue produits → Créer produit</code></p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead><tr className="text-[#D49A63] uppercase text-[10px]"><th className="py-1 pr-2 text-left">Champ</th><th className="py-1 text-left">À remplir</th></tr></thead>
                <tbody className="divide-y divide-[#FFF7EF]/5 text-[#FFF7EF]/70">
                  <tr><td className="py-1.5 font-bold">Nom</td><td>Court + bénéfice — ex: <em>Brosse vapeur nano-mist (anti-frisottis, USB-C)</em></td></tr>
                  <tr><td className="py-1.5 font-bold">Marque</td><td>KURLA Essentials</td></tr>
                  <tr><td className="py-1.5 font-bold">Catégorie</td><td><code className="text-emerald-300">accessoires</code> / Outils</td></tr>
                  <tr><td className="py-1.5 font-bold">Prix TTC</td><td>Ton prix boutique (ex: 34,90€)</td></tr>
                  <tr><td className="py-1.5 font-bold">Image</td><td>HD fond blanc + 2e en usage + provenance <code>brand_provided</code></td></tr>
                  <tr><td className="py-1.5 font-bold">Description</td><td>2 phrases : problème + geste (voir modèles §3)</td></tr>
                  <tr><td className="py-1.5 font-bold">InStock</td><td>☑ oui — stock = 0 (chez partenaire)</td></tr>
                  <tr><td className="py-1.5 font-bold">Statut</td><td><code className="text-emerald-300">published</code></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
            <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-600 text-white grid place-items-center text-[11px]">4</span> Passage en dropship 24–48h (30 sec) — AUTONOME <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px]">sans code</span></h4>
            <ol className="list-decimal list-inside text-[11px] text-[#FFF7EF]/75 space-y-1.5">
              <li>Dans la fiche (<code className="text-emerald-300">Créer</code> ou <code className="text-emerald-300">Modifier</code>), coche la case verte :<br /><code className="inline-block mt-1 px-2 py-1 rounded bg-[#050403] border border-emerald-500/20 text-emerald-300">☑ Dropship 24–48h (partenaire UE) — 0 stock chez toi</code><br /><span className="text-[#FFF7EF]/45">→ Bloc <em>Stock de base / Pays</em>, juste sous <code>Pays (FR, BE)</code>.</span></li>
              <li><code className="text-emerald-300">Enregistrer</code> → badge <code className="text-emerald-300">dropship_24_48h</code> en base.</li>
              <li>Passe à <code className="text-emerald-300">published</code> → boutique affiche instantanément badge vert <code className="text-emerald-300">24–48h</code> (fiche + panier + guide), sans redéploiement Vercel.</li>
            </ol>
            <div className="p-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 text-[11px] text-[#FFF7EF]/55">
              <p><strong className="text-[#FFF7EF]">Technique :</strong> <code className="text-emerald-300">category === 'accessoires'</code> → automatiquement <code className="font-mono">TOOL_DISPATCH_SHORT</code> (0 carton Paris) sans cocher la case. Badge coché = fallback pour outils créés hors catégorie.</p>
              <p className="mt-1"><strong className="text-[#FFF7EF]">Historique :</strong> les 12 de base (<code>p35, p36, p41…</code>) restent codés dur dans <code className="font-mono">fulfillment.ts → DROPSHIP_TOOLS_IMMEDIATE</code> pour compatibilité. Nouveaux accessoires : rien à cocher, badge vert automatique.</p>
            </div>
            <p className="text-[11px] text-emerald-300 font-semibold">Vérif : <code className="text-[#FFF7EF]">Admin → Fiches produits</code> affiche un tag vert <code>24–48h dropship</code> à côté du nom.</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2">
            <h4 className="text-xs font-bold text-[#D49A63] flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white grid place-items-center text-[11px]">5</span> Vérif boutique (1 min)</h4>
            <ul className="text-[11px] text-[#FFF7EF]/60 space-y-1 list-disc list-inside">
              <li><code>/boutique?cat=accessoires</code> → carte badge vert <code className="text-emerald-300">24–48h</code> + ligne verte <em>En stock partenaire — expédié en 24–48h</em> + bouton <code>Ajouter</code></li>
              <li><code>/produit/ta-brosse</code> → même badge</li>
              <li>Panier : 1 soin + 1 outil → <em>“Panier mixte : outils 24–48h + soins 3–5j — 1 seul colis via 3PL (délai global 3–5j)”</em></li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2">
            <h4 className="text-xs font-bold text-[#D49A63] flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white grid place-items-center text-[11px]">6</span> Test commande (conseillé)</h4>
            <p className="text-[11px] text-[#FFF7EF]/60">Commande test 1€ Stripe TEST avec l’outil seul → <code>Admin → Commandes</code> = <code>paid</code> → bon fournisseur (portail B2B/email) → suivi DPD → 3PL si mixte.</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2">
            <h4 className="text-xs font-bold text-[#D49A63] flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#C8753D] text-white grid place-items-center text-[11px]">7</span> SAV & réassort</h4>
            <p className="text-[11px] text-[#FFF7EF]/60">Retour via 3PL (jamais chez toi). Rupture NL : décoche <code>InStock</code> → <code>Indisponible</code>. Flux tendu, commande à l’unité.</p>
          </div>
        </div>
      </div>

      {/* 3 — Modèles */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 shadow-xl space-y-5">
        <h3 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2">
          <Package className="w-5 h-5 text-[#C8753D]" /> 3. Modèles de fiches — copier-coller
        </h3>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#050403] border border-emerald-500/20 space-y-2">
            <p className="text-[11px] font-bold text-emerald-300">p21 — Brosse edges + peigne (réel)</p>
            <p className="text-[11px] text-[#D49A63] font-mono">5,90€ TTC (coût 2,00€ HT → 66%)</p>
            <p className="text-[11px] text-[#FFF7EF]/70"><strong>Courte (120c) :</strong> Bords et baby hair qui rebiquent ? Brosse douce + peigne fin pour plaquer sans casser. Format voyage.</p>
            <p className="text-[11px] text-[#FFF7EF]/50">Pour qui : 3A–4C, baby hair · Quand : fin de coiffage · 3 bénéfices : dessine sans traction · raies nettes · petit prix · Erreur : ne pas appuyer fort sur tempes.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#050403] border border-emerald-500/20 space-y-2">
            <p className="text-[11px] font-bold text-emerald-300">p17 — Bonnet satin + taie (réel)</p>
            <p className="text-[11px] text-[#D49A63] font-mono">12,90€ TTC (4,80€ HT → 63%)</p>
            <p className="text-[11px] text-[#FFF7EF]/70">Nuit = 8h de frottement. Satin double face qui garde l’hydratation. Élastique large.</p>
            <p className="text-[11px] text-[#FFF7EF]/50">Cross-sell : spray refresh p32 · Lien guide : <code>/outils#bonnet-satin</code></p>
          </div>
          <div className="p-4 rounded-2xl bg-[#050403] border border-amber-500/20 space-y-2">
            <p className="text-[11px] font-bold text-amber-300">Nouvel outil — Brosse vapeur 5-en-1 (à créer)</p>
            <p className="text-[11px] text-[#FFF7EF]/60">Repéré : Afro Wholesale <code>AW-VAPOR5</code> · Coût 15€ HT → 39,90€ TTC → 55% marge</p>
            <p className="text-[11px] text-[#FFF7EF]/50">Nom : <em>Brosse vapeur nano-mist (anti-frisottis, USB-C)</em> · 200ml · Brume 5µm · Recharge USB-C</p>
            <p className="text-[11px] text-[#FFF7EF]/40">Mail : “Hello, dropship SKU AW-VAPOR5 per unit to our 3PL Etx 95. Confirm 15€ + picking + 24–48h DPD. 1 test then 10/week.”</p>
          </div>
        </div>
      </div>

      {/* 4 — Checklist */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-emerald-400" /> 4. Checklist avant de publier
        </h3>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          {[
            'Fournisseur confirme dropship à l’unité + picking + délai NL→FR écrit',
            'Prix TTC → marge HT ≥55% (sinon ajuste)',
            'Photo HD + photo en usage 4C',
            'Fiche en accessoires/Outils, InStock ☑, published',
            'Case ☑ Dropship 24–48h cochée dans Admin → Catalogue',
            'Badge vert 24–48h visible boutique + fiche + panier mixte testé',
            'Description : problème + geste + 3 bénéfices + erreur',
            'Lien guide /outils#… ajouté si geste documenté',
          ].map(item => (
            <label key={item} className="flex items-start gap-2 p-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/5">
              <input type="checkbox" className="mt-0.5 accent-emerald-500" />
              <span className="text-[#FFF7EF]/70 leading-snug">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 5 — Erreurs */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0F0A] border border-rose-500/20 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> 5. Erreurs qui coûtent (vues en 2025)
        </h3>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/15 space-y-1">
            <p className="font-bold text-rose-300">Cosmétique en dropship 24–48h</p>
            <p className="text-[#FFF7EF]/60">Besoin CPNP/RP → blocage douane. Réservé aux accessoires.</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/15 space-y-1">
            <p className="font-bold text-rose-300">“Livraison directe 3PL” oublié</p>
            <p className="text-[#FFF7EF]/60">Colis arrive à Paris. Toujours : <code className="text-rose-200">Livraison à : [Adresse 3PL]</code></p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/15 space-y-1">
            <p className="font-bold text-rose-300">TVA oubliée</p>
            <p className="text-[#FFF7EF]/60">Toujours diviser TTC par 1,20. Sinon marge fausse.</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/15 space-y-1">
            <p className="font-bold text-rose-300">Photo générique sans 4C</p>
            <p className="text-[#FFF7EF]/60">Conversion /2. Exige photo 4C.</p>
          </div>
        </div>
      </div>

      {/* 6 — Où trouver */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-sky-300" /> 6. Où trouver les prochains outils ?
        </h3>
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <a href="https://africanfabs.com" target="_blank" rel="noreferrer" className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 hover:border-sky-500/30 transition-colors">
            <p className="font-bold text-sky-300">AfricanFabs B2B (NL)</p>
            <p className="text-[#FFF7EF]/55 mt-1">Tools & Accessories → 180 refs, filtre <code>In stock EU</code></p>
          </a>
          <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10">
            <p className="font-bold text-[#D49A63]">Afro Wholesale</p>
            <p className="text-[#FFF7EF]/55 mt-1">Hair Tools → meilleurs délais FR</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10">
            <p className="font-bold text-[#FFF7EF]">TikTok “hair tools 2025”</p>
            <p className="text-[#FFF7EF]/55 mt-1">Repère le viral (peigne LED), vérifie chez grossiste UE avant Chine (MOQ 500 KO)</p>
          </div>
        </div>
        <p className="text-[11px] text-[#FFF7EF]/40">Besoin d’un bon de commande ? Va dans <code className="text-[#D49A63]">Admin → Approvisionnement → Fournisseurs & sourcing → Tampon 75</code> : bloc “Bon de commande” pré-rempli — remplace les 5 lignes héros par ton outil à l’unité.</p>
        <p className="text-[10px] text-[#FFF7EF]/30">Source : <code>src/lib/fulfillment.ts</code> + <code>src/lib/preorderPromise.ts</code> — Catalogue <code>launchCatalog.ts</code> inchangé.</p>
      </div>
    </div>
  );
};
