import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
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
  const normalizedQuery = query.toLowerCase();
  const filteredProducts = normalizedQuery ? products.filter(product => [product.name, product.description, product.brand, ...(product.keyIngredients || [])].some(value => value?.toLowerCase().includes(normalizedQuery))) : [];
  const filteredRoutines = normalizedQuery ? routines.filter(routine => `${routine.title} ${routine.subtitle}`.toLowerCase().includes(normalizedQuery)) : [];

  return <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"><div onClick={onClose} className="absolute inset-0 bg-[#050403]/85 backdrop-blur-md" /><div className="relative w-full max-w-2xl bg-[#1A0F0A] border border-[#FFF7EF]/15 rounded-3xl p-6 z-10 shadow-2xl space-y-6"><div className="flex items-center gap-3 pb-4 border-b border-[#FFF7EF]/10"><Search className="w-5 h-5 text-[#C8753D]" /><input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un produit ou une routine" autoFocus className="flex-1 bg-transparent text-[#FFF7EF] placeholder-[#FFF7EF]/40 text-base focus:outline-none font-light" /><button onClick={onClose} className="p-1 rounded-full text-[#FFF7EF]/60 hover:text-[#FFF7EF]" aria-label="Fermer"><X className="w-5 h-5" /></button></div>{loading ? <div className="py-10 text-center"><Loader2 className="w-7 h-7 text-[#C8753D] animate-spin mx-auto" /></div> : query ? <div className="max-h-[60vh] overflow-y-auto space-y-6">{filteredProducts.length > 0 && <div><h4 className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold mb-3">Produits ({filteredProducts.length})</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{filteredProducts.map(product => <a key={product.id} href={`/produit/${product.slug}`} onClick={onClose} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 hover:border-[#C8753D]/40">{product.image ? <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-[#1A0F0A]" />}<div><p className="text-xs font-serif-title font-bold text-[#FFF7EF] truncate">{product.name}</p><p className="text-[11px] text-[#C8753D]">{product.price.toFixed(2)} €</p></div></a>)}</div></div>}{filteredRoutines.length > 0 && <div><h4 className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold mb-3">Routines ({filteredRoutines.length})</h4>{filteredRoutines.map(routine => <a key={routine.id} href={`/routines/${routine.slug}`} onClick={onClose} className="flex items-center justify-between p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 hover:border-[#C8753D]/40 mb-2"><div><p className="text-sm font-serif-title font-bold text-[#FFF7EF]">{routine.title}</p><p className="text-xs text-[#FFF7EF]/60">{routine.subtitle}</p></div><ArrowRight className="w-4 h-4 text-[#C8753D]" /></a>)}</div>}{filteredProducts.length === 0 && filteredRoutines.length === 0 && <p className="text-center py-8 text-sm text-[#FFF7EF]/60">Aucun résultat pour « {query} ».</p>}</div> : <div className="space-y-3"><span className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold block">Recherches suggérées</span><div className="flex flex-wrap gap-2">{['Cheveux crépus', 'SPF sans trace blanche', 'Démêlage enfant', 'Routine hydratation'].map(term => <button key={term} onClick={() => setQuery(term)} className="px-3.5 py-1.5 rounded-full bg-[#050403] hover:bg-[#C8753D]/20 text-xs text-[#FFF7EF] border border-[#FFF7EF]/15">{term}</button>)}</div></div>}</div></div>;
};
