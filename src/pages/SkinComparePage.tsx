import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, X, Sun, Droplets, Layers, Heart, Shield, Clock, FlaskConical, Info, ShoppingBag, ArrowLeft, Scale, Star, AlertTriangle } from 'lucide-react';
import { useProducts } from '../services/productService';
import { Product } from '../types';
import { findAlternatives } from '../lib/skinAlternatives';

function whitecastLabel(p: Product) {
  const hay = `${p.name} ${p.description} ${(p.badges||[]).join(' ')} ${(p.keyIngredients||[]).join(' ')}`.toLowerCase();
  const isSPF = /spf|solair|uv/i.test(hay) || (p.needs||[]).some(n=>/protection_solaire|spf/i.test(n));
  if (!isSPF) return { label: 'Non SPF', risk: '—', color: 'text-[#111111]/50' };
  const mineral = /titanium|zinc|minéral|mineral/i.test(hay);
  const invisible = /invisible|sans.*trace|hybride|organique|fluide invisible/i.test(hay);
  if (mineral && !invisible) return { label: 'Risque élevé', risk: 'Trace blanche probable', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  if (invisible) return { label: 'Invisible', risk: 'Adapté peaux foncées', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  return { label: 'Modéré', risk: 'À tester', color: 'text-[#C8753D] bg-[#F8F2EC] border-[#E8E1DA]' };
}

export const SkinComparePage: React.FC = () => {
  const { products } = useProducts();
  const skinProducts = useMemo(() => products.filter(p => p.category === 'peau'), [products]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const ids = sp.get('ids');
      if (ids) {
        const wanted = ids.split(',').map(s=>s.trim()).filter(Boolean).slice(0,4);
        const valid = wanted.filter(id=> skinProducts.some(p=>p.id===id||p.slug===id));
        if (valid.length) setSelected(valid.map(id=> skinProducts.find(p=>p.id===id||p.slug===id)!.id));
      } else {
        // pré-sélection guidée Fatou : 2 produits peau si dispo
        if (skinProducts.length>=2 && selected.length===0) setSelected(skinProducts.slice(0,2).map(p=>p.id));
      }
    } catch { /* ignore */ }
  }, [skinProducts.length]);

  const toggle = (id: string) => {
    setSelected(s=> s.includes(id) ? s.filter(v=>v!==id) : s.length>=4 ? s : [...s,id]);
  };

  const compared = useMemo(() => selected.map(id=> products.find(p=>p.id===id)!).filter(Boolean) as Product[], [selected, products]);

  const total = compared.reduce((s,p)=>s+p.price,0);
  const cheapest = compared.length ? Math.min(...compared.map(p=>p.price)) : 0;

  // Alternatives dynamiques par produit comparé (même famille, sans parfum si sensible)
  const guidedSansParfum = (()=>{ try{ const raw=localStorage.getItem('kurla_skin_answers')||sessionStorage.getItem('kurla_diagnostic_answers_skin'); if(!raw) return false; const j=JSON.parse(raw); return !!j?.sensitivities?.includes('parfum')|| j?.sensitivity==='elevee'; }catch{return false;} })();
  const altsById = useMemo(()=>{
    const m: Record<string, Product[]> = {};
    compared.forEach(p=>{ try{ m[p.id]=findAlternatives(p, products, { max:2, preferSansParfum: guidedSansParfum || !!p.containsFragrance, preferInvisible:true }); }catch{ m[p.id]=[]; } });
    return m;
  }, [compared.map(p=>p.id).join(','), products.length, guidedSansParfum]);

  const filteredPicker = skinProducts.filter(p=>{
    if (!search.trim()) return true;
    const q=search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.keyIngredients?.some(k=>k.toLowerCase().includes(q));
  }).slice(0,12);

  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#FFFDF9] text-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <a href="/boutique?cat=peau" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold mb-4 hover:underline"><ArrowLeft className="w-4 h-4"/> Retour boutique peau</a>
        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] text-[#D9A8A4] text-[10px] font-bold tracking-widest uppercase"><Scale className="w-3.5 h-3.5"/> KURLA SKIN · comparateur</span>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mt-3">Comparer 2 à 4 soins peau</h1>
          <p className="text-sm text-[#111111]/70 font-light mt-2 leading-relaxed">Texture, fini, SPF sans trace blanche, sans parfum, prix et étape routine — en 1 écran. Uniformiser ≠ éclaircir.</p>
        </div>

        {/* Picker */}
        <div className="p-5 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] mb-8">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
            <div className="flex-1 relative w-full sm:max-w-md">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un soin peau (niacinamide, SPF, céramides...)" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#E8E1DA] text-xs focus:outline-none focus:border-[#C8753D]" />
              <FlaskConical className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#111111]/40"/>
            </div>
            <span className="text-xs text-[#111111]/60">{selected.length}/4 sélectionnés · total {total.toFixed(2)} €</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredPicker.map(p=>{
              const active = selected.includes(p.id);
              const wc = whitecastLabel(p);
              return (
                <button key={p.id} onClick={()=>toggle(p.id)} className={`p-3 rounded-2xl border text-left transition-all ${active?'bg-[#111111] text-white border-[#111111] shadow':'bg-white border-[#E8E1DA] hover:border-[#C8753D] text-[#111111]'}`}>
                  <img src={p.image} alt="" className="w-full h-24 object-cover rounded-xl mb-2"/>
                  <p className="text-xs font-bold leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-[11px] opacity-70">{p.brand} · {p.price.toFixed(2)} €</p>
                  <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full border font-bold ${active?'bg-white/15 border-white/20 text-white':'bg-[#F8F2EC] border-[#E8E1DA] text-[#111111]/70'}`}>{wc.label}</span>
                </button>
              );
            })}
          </div>
          {skinProducts.length===0 && <div className="mt-4 p-4 rounded-xl bg-white border border-[#E8E1DA] text-xs text-center text-[#111111]/60">Aucun soin peau publié pour l’instant — le catalogue peau est en cours d’enrichissement (précommandes). Dès que les premiers soins passent “publié”, ils apparaîtront ici.</div>}
          {selected.length>0 && <div className="mt-4 flex gap-2"><button onClick={()=>setSelected([])} className="text-xs font-bold text-[#C8753D] hover:underline">Effacer</button><a href={`/peau/comparer?ids=${selected.join(',')}`} className="text-xs font-bold text-[#111111]/50">Lien partageable</a></div>}
        </div>

        {compared.length===0 ? (
          <div className="p-10 rounded-3xl bg-white border border-[#E8E1DA] text-center">
            <Scale className="w-8 h-8 text-[#C8753D] mx-auto mb-3"/>
            <p className="text-sm font-bold">Sélectionnez 2 à 4 soins peau ci-dessus</p>
            <p className="text-xs text-[#111111]/60 mt-1">Astuce Fatou : comparez un SPF invisible sans parfum vs un SPF minéral vs un sérum taches.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left p-3 bg-[#F8F2EC] border border-[#E8E1DA] rounded-tl-2xl text-[11px] uppercase tracking-wider font-bold">Critère</th>
                  {compared.map(p=> (
                    <th key={p.id} className="p-3 bg-[#111111] text-white border border-[#111111] text-center min-w-[180px]">
                      <img src={p.image} alt="" className="w-20 h-20 object-cover rounded-xl mx-auto mb-2"/>
                      <p className="text-xs font-bold leading-tight">{p.name}</p>
                      <p className="text-[11px] opacity-70">{p.brand}</p>
                      <a href={`/produit/${p.slug}`} className="text-[11px] text-[#D49A63] hover:underline">Voir fiche →</a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {[
                  { label: 'Prix', render: (p:Product)=> `${p.price.toFixed(2)} €${p.price===cheapest?' — le moins cher':''}` },
                  { label: 'Contenance / prix au 10ml', render: (p:Product)=> p.sizeLabel ? `${p.sizeLabel} · ${(p.price/ (parseInt(p.sizeLabel)||50)*10).toFixed(2)}€/10ml` : '—' },
                  { label: 'Texture / fini', render: (p:Product)=> `${p.texture||'—'} · ${ (p as any).finish || p.fragrance || '—'}` },
                  { label: 'Sans parfum', render: (p:Product)=> (p.containsFragrance? 'Contient parfum ⚠️' : 'Sans parfum ajouté ✓') },
                  { label: 'SPF · trace blanche', render: (p:Product)=> { const w=whitecastLabel(p); return <span className={`px-2 py-1 rounded-full border text-[11px] font-bold ${w.color}`}>{w.label} · {w.risk}</span>; } },
                  { label: 'Étape routine', render: (p:Product)=> p.routineStep || '—' },
                  { label: 'Key ingrédients', render: (p:Product)=> (p.keyIngredients||[]).slice(0,3).join(' · ') || '—' },
                  { label: 'Pour qui / pas idéal si', render: (p:Product)=> <><span className="block">{p.forWho||'—'}</span><span className="block text-[#111111]/50 mt-1">Pas idéal : {p.notIdealIf||'—'}</span></> },
                  { label: 'Avis vérifiés', render: (p:Product)=> p.verifiedReviewCount ? `${p.rating?.toFixed(1)} · ${p.verifiedReviewCount} avis` : 'Nouveau' },
                ].map(row=> (
                  <tr key={row.label}>
                    <td className="p-3 bg-[#F8F2EC] border border-[#E8E1DA] font-bold text-[11px] uppercase tracking-wider">{row.label}</td>
                    {compared.map(p=> <td key={p.id} className="p-3 border border-[#E8E1DA] text-center align-top">{typeof row.render(p)==='string'? row.render(p) as any : row.render(p)}</td>)}
                  </tr>
                ))}
                <tr>
                  <td className="p-3 bg-[#F8F2EC] border border-[#E8E1DA] font-bold">Alternatives</td>
                  {compared.map(p=> {
                    const alts = altsById[p.id]||[];
                    return (
                      <td key={p.id} className="p-3 border border-[#E8E1DA] text-center align-top">
                        {alts.length===0 ? (
                          <>
                            <a href={`/boutique?cat=peau&q=${encodeURIComponent((p.keyIngredients||['hydratant'])[0])}`} className="text-xs font-bold text-[#C8753D] hover:underline">Voir alternatives</a>
                            <p className="text-[11px] text-[#111111]/50 mt-1">{p.containsFragrance?'Proposer sans parfum':''}</p>
                          </>
                        ) : (
                          <div className="space-y-2">
                            {alts.map(a=> (
                              <a key={a.id} href={`/produit/${a.slug}`} className="block p-2 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-left">
                                <p className="text-xs font-bold leading-tight line-clamp-1">{a.name}</p>
                                <p className="text-[11px] text-[#111111]/60">{a.brand} · {a.price.toFixed(2)} € {a.containsFragrance?'· parfum':'· sans parfum ✓'}</p>
                              </a>
                            ))}
                            <a href={`/peau/comparer?ids=${p.id},${alts.map(a=>a.id).join(',')}`} className="text-[11px] font-bold text-[#111111]/60 hover:text-[#C8753D]">Comparer ces alternatives →</a>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {compared.length>0 && (
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a href="/boutique?cat=peau" className="px-6 py-3 rounded-full bg-[#111111] text-white text-xs font-bold">Retour boutique peau</a>
            <a href="/peau/routine" className="px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold">Voir ma routine →</a>
            <button onClick={()=>{ try{ navigator.clipboard.writeText(window.location.href); }catch{} }} className="px-6 py-3 rounded-full bg-white border border-[#E8E1DA] text-xs font-bold hover:border-[#C8753D]">Copier le lien comparatif</button>
          </div>
        )}

        <p className="text-[11px] text-[#111111]/45 text-center mt-6 flex items-center justify-center gap-1.5"><Info className="w-3.5 h-3.5"/> Comparateur informatif : prix et composition vérifiés, pas d’avis médical. White-cast évalué sur INCI/filtres, à confirmer à la lumière du jour.</p>
      </div>
    </div>
  );
};
