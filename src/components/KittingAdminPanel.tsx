import React, { useMemo, useState } from 'react';
import { Package, Box, Clock, Euro, Truck, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react';
import { KITTING_SPECS, compareKittingEconomics } from '../lib/kitting';
import { CATALOG_GUARD_EXPECTED } from '../lib/catalogGuard';

export const KittingAdminPanel: React.FC = () => {
  const [qty, setQty] = useState<Record<string, number>>({ k02: 100, k03: 100 });

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#C8753D]/30 shadow-xl space-y-3">
        <h2 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2">
          <Box size={18} className="text-[#C8753D]" /> Kitting K02 / K03 — figé chez 3PL
        </h2>
        <p className="text-xs text-[#FFF7EF]/60 leading-relaxed max-w-3xl">
          Contenu exact, carton et coût <strong className="text-[#FFF7EF]">figés par devis 3PL n°3</strong> (IDF). Le kitting n'est pas un lot promo :
          c'est un assemblage physique facturé à l'unité. Sans carton ni coût figés, chaque commande est une surprise.
          La comparaison grossiste est documentée — on garde le 3PL pour le flux à la demande, le grossiste pour un réassort planifié &ge;100 kits.
        </p>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Statut : FIGÉ 2026-09-08</span>
          <span className="px-2 py-1 rounded-full bg-[#FFF7EF]/10 text-[#FFF7EF]/70 border border-[#FFF7EF]/15">Flux 3PL : précommande 3–5j (batch lun/jeu 18h)</span>
          <span className="px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">Garde-fou : launchCatalog.ts intact ({CATALOG_GUARD_EXPECTED.products} SKU / {CATALOG_GUARD_EXPECTED.kits} kits)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {KITTING_SPECS.map(spec => {
          const econ = compareKittingEconomics(spec.kitId, qty[spec.kitId] || 100);
          return (
            <div key={spec.kitId} className="rounded-3xl bg-[#050403] border border-[#FFF7EF]/10 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#FFF7EF]">{spec.name}</h3>
                  <p className="text-[11px] text-[#D49A63] mt-1">{spec.components.length} composants · carton {spec.carton.dimensionsCm} · {spec.carton.weightKg} kg · {spec.carton.cartonRef}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${spec.status === 'figé' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>{spec.status}</span>
              </div>

              <div className="rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#D49A63]">Contenu exact (×1 chacun)</p>
                <ul className="text-[11px] text-[#FFF7EF]/70 space-y-1">
                  {spec.components.map(c => (
                    <li key={c.launchProductId} className="flex justify-between gap-2">
                      <span>{c.qty}× <strong className="text-[#FFF7EF]">{c.launchProductId}</strong> — {c.name}</span>
                      <span className="text-[#FFF7EF]/40">{c.format}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-[#FFF7EF]/40 mt-2">Calage : {spec.carton.calage} · Validé {spec.validatedAt} par {spec.validatedBy}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-center">
                  <Euro className="w-3.5 h-3.5 mx-auto text-[#C8753D] mb-1" />
                  <p className="font-bold text-[#FFF7EF]">{spec.costing.kittingFeeEur.toFixed(2)} €</p>
                  <p className="text-[10px] text-[#FFF7EF]/40">kitting</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-center">
                  <Package className="w-3.5 h-3.5 mx-auto text-[#D49A63] mb-1" />
                  <p className="font-bold text-[#FFF7EF]">{spec.costing.cartonCostEur.toFixed(2)} €</p>
                  <p className="text-[10px] text-[#FFF7EF]/40">carton + calage</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
                  <Calculator className="w-3.5 h-3.5 mx-auto text-emerald-300 mb-1" />
                  <p className="font-bold text-emerald-300">{spec.costing.totalHandlingEur.toFixed(2)} €</p>
                  <p className="text-[10px] text-emerald-300/70">total / kit HT</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#FFF7EF]/55">
                <Clock className="w-3.5 h-3.5" /> {spec.timing.prepSecondsPerKit}s / kit — {spec.timing.dailyCapacityKits} kits/j/opérateur
                <span className="ml-auto text-[10px] text-[#FFF7EF]/30">+ étiquette {spec.costing.etiquetteTransportEur.toFixed(2)} € incluse</span>
              </div>

              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-2">
                <p className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Alternative grossiste — comparé, pas choisi</p>
                <p className="text-[11px] text-indigo-200/70 leading-relaxed">{spec.costing.grossisteAlternative.note}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#FFF7EF]/60">Volume à comparer :</span>
                  <input type="number" min={1} value={qty[spec.kitId] || 100} onChange={e => setQty({ ...qty, [spec.kitId]: Number(e.target.value) || 0 })} className="w-20 px-2 py-1 rounded-lg bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]" />
                  <span className="text-[11px] text-[#FFF7EF]/40">kits</span>
                </div>
                {econ && (
                  <div className="text-[11px] space-y-1">
                    <p className="text-[#FFF7EF]/70">3PL : <strong className="text-[#FFF7EF]">{econ.tplTotal.toFixed(2)} €</strong> · Grossiste : <strong className="text-[#FFF7EF]">{econ.grossisteTotal?.toFixed(2)} €</strong> {econ.savingGrossiste != null && econ.savingGrossiste > 0 ? <span className="text-emerald-300">(−{econ.savingGrossiste.toFixed(2)} €)</span> : null}</p>
                    <p className="text-[10px] text-indigo-200/60 leading-relaxed">{econ.recommendation}</p>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-[#FFF7EF]/35 leading-relaxed">{spec.notes}</p>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed text-amber-200/80">
          <p className="font-bold text-amber-200">Ce qui est figé vs ce qui reste ouvert</p>
          <p className="mt-1"><CheckCircle2 className="inline w-3 h-3 text-emerald-400 mr-1" />Figé : contenu K02/K03, cartons C30/C32, coûts kitting 1,50/1,60 € + 2,20/2,36 € total — devis 3PL comparés (n°3 retenu).</p>
          <p className="mt-1">Ouvert : choix définitif 3PL (après validation tampon A4 + commande test), MOQ grossiste à confirmer par devis signé — aucun kitting grossiste commandé sans échantillon carton.</p>
          <p className="mt-1 text-amber-300/60">Le flux 3PL n'écrit jamais dans <code className="px-1 py-0.5 rounded bg-[#050403] border border-amber-500/20">launchCatalog.ts</code> — uniquement dans <code className="px-1 py-0.5 rounded bg-[#050403] border border-amber-500/20">fulfillment.ts</code> + tables Supabase.</p>
        </div>
      </div>
    </div>
  );
};
