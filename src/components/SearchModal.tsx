import React, { useEffect, useState, useMemo } from 'react';
import { ArrowRight, Loader2, Search, X, Sun, Droplets } from 'lucide-react';
import { RoutineBundle } from '../types';
import { useProducts } from '../services/productService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { products, loading } = useProducts();
  const [routines, setRoutines] = useState<RoutineBundle[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/routines').then(response => response.ok ? response.json() : { routines: [] }).then(data => setRoutines(Array.isArray(data.routines) ? data.routines : [])).catch(() => setRoutines([]));
  }, [isOpen]);

  if (!isOpen) return null;
  const normalizedQuery = query.toLowerCase().trim();
  const filteredProductsRaw = normalizedQuery ? products.filter(product => [product.name, product.description, product.brand, ...(product.keyIngredients || []), (product as any).inci, (product.category || '')].some(value => value?.toLowerCase().includes(normalizedQuery))) : [];

  // C6 — Search peau : si la requête évoque un actif peau, on remonte les soins peau en premier
  const isPeauQuery = /niacinamide|azela|vitamine c|ascorb|retinol|aha|bha|ceramide|squalane|hyaluron|spf|taches|barriere|eclat/i.test(normalizedQuery);
  const filteredProducts = useMemo(() => {
    const arr = [...filteredProductsRaw];
    if (isPeauQuery) {
      arr.sort((a, b) => {
        const aSkin = a.category === 'peau' || a.category === 'kits' ? 1 : 0;
        const bSkin = b.category === 'peau' || b.category === 'kits' ? 1 : 0;
        return bSkin - aSkin;
      });
    }
    return arr.slice(0, 12);
  }, [filteredProductsRaw, isPeauQuery]);

  const filteredRoutines = normalizedQuery ? routines.filter(routine => `${routine.title} ${routine.subtitle}`.toLowerCase().includes(normalizedQuery)) : [];

  return <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"><div onClick={onClose} className="absolute inset-0 bg-kurla-ink/85 backdrop-blur-md" /><div className="relative w-full max-w-2xl bg-kurla-espresso border border-kurla-cream/15 rounded-3xl p-6 z-10 shadow-2xl space-y-6"><div className="flex items-center gap-3 pb-4 border-b border-kurla-cream/10"><Search className="w-5 h-5 text-kurla-copper" /><input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un produit, un actif peau (niacinamide, SPF) ou une routine" autoFocus className="flex-1 bg-transparent text-kurla-cream placeholder-kurla-cream/40 text-base focus:outline-none font-light" /><button onClick={onClose} className="p-1 rounded-full text-kurla-cream/60 hover:text-kurla-cream" aria-label="Fermer"><X className="w-5 h-5" /></button></div>{loading ? <div className="py-10 text-center"><Loader2 className="w-7 h-7 text-kurla-copper animate-spin mx-auto" /></div> : query ? <div className="max-h-[65vh] overflow-y-auto space-y-6">{filteredProducts.length > 0 && <div><h4 className="text-xs uppercase tracking-widest text-kurla-amber font-semibold mb-3 flex items-center gap-2">{isPeauQuery ? <Sun className="w-3.5 h-3.5" /> : <Droplets className="w-3.5 h-3.5" />}Produits ({filteredProducts.length}) {isPeauQuery && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-kurla-copper text-white">peau prioritaire</span>}</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{filteredProducts.map(product => <a key={product.id} href={`/produit/${product.slug}`} onClick={onClose} className="flex items-center gap-3 p-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/10 hover:border-kurla-copper/40"><div className="relative shrink-0">{product.image ? <img loading="lazy" decoding="async" src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-kurla-espresso" />}{product.category === 'peau' && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-kurla-copper text-white flex items-center justify-center"><Sun className="w-2.5 h-2.5" /></span>}</div><div className="min-w-0"><p className="text-xs font-serif-title font-bold text-kurla-cream truncate">{product.name}</p><p className="text-[11px] text-kurla-cream/60 truncate">{product.brand} · {product.category === 'peau' ? 'Peau' : product.category === 'kits' ? 'Kit' : 'Cheveux'}</p><p className="text-[11px] text-kurla-copper">{product.price.toFixed(2)} €</p></div></a>)}</div>{filteredProducts.length >= 12 && <a href={`/boutique?q=${encodeURIComponent(query)}&cat=peau`} onClick={onClose} className="mt-3 inline-flex text-xs text-kurla-amber hover:underline">Voir tout dans la boutique peau →</a>}</div>}{filteredRoutines.length > 0 && <div><h4 className="text-xs uppercase tracking-widest text-kurla-amber font-semibold mb-3">Routines ({filteredRoutines.length})</h4>{filteredRoutines.map(routine => <a key={routine.id} href={`/routines/${routine.slug}`} onClick={onClose} className="flex items-center justify-between p-3 rounded-xl bg-kurla-ink border border-kurla-cream/10 hover:border-kurla-copper/40 mb-2"><div><p className="text-sm font-serif-title font-bold text-kurla-cream">{routine.title}</p><p className="text-xs text-kurla-cream/60">{routine.subtitle}</p></div><ArrowRight className="w-4 h-4 text-kurla-copper" /></a>)}</div>}{filteredProducts.length === 0 && filteredRoutines.length === 0 && <div className="text-center py-8"><p className="text-sm text-kurla-cream/60">Aucun résultat pour « {query} ».</p><div className="mt-3 flex flex-wrap gap-2 justify-center">{['niacinamide', 'SPF sans trace blanche', 'céramides', 'acide hyaluronique'].map(term => <button key={term} onClick={() => setQuery(term)} className="px-3 py-1.5 rounded-full bg-kurla-copper/20 text-xs text-kurla-cream border border-kurla-copper/30">{term}</button>)}</div><a href={`/boutique?q=${encodeURIComponent(query)}`} onClick={onClose} className="mt-3 inline-block text-xs text-kurla-amber hover:underline">Chercher “{query}” dans la boutique</a></div>}</div> : <div className="space-y-4"><div><span className="text-xs uppercase tracking-widest text-kurla-amber font-semibold block mb-2">Recherches peau populaires</span><div className="flex flex-wrap gap-2">{['Niacinamide 5%', 'SPF sans trace blanche', 'Céramides NP', 'Acide hyaluronique', 'Glycolique AHA'].map(term => <button key={term} onClick={() => setQuery(term)} className="px-3.5 py-1.5 rounded-full bg-kurla-copper/15 hover:bg-kurla-copper/25 text-xs text-kurla-cream border border-kurla-copper/30 flex items-center gap-1"><Sun className="w-3 h-3" />{term}</button>)}</div></div><div><span className="text-xs uppercase tracking-widest text-kurla-amber font-semibold block mb-2">Cheveux & univers</span><div className="flex flex-wrap gap-2">{['Cheveux crépus', 'Démêlage enfant', 'Routine hydratation', 'Barbe homme'].map(term => <button key={term} onClick={() => setQuery(term)} className="px-3.5 py-1.5 rounded-full bg-kurla-ink hover:bg-kurla-cream/10 text-xs text-kurla-cream border border-kurla-cream/15">{term}</button>)}</div></div><div className="pt-2 border-t border-kurla-cream/10 flex gap-2 text-xs"><a href="/peau" onClick={onClose} className="text-kurla-amber hover:underline">Pôle peau →</a><a href="/guides/ingredients" onClick={onClose} className="text-kurla-amber hover:underline">15 fiches peau →</a><a href="/boutique?cat=peau" onClick={onClose} className="text-kurla-amber hover:underline">Boutique peau →</a></div></div>}</div></div>;
};
