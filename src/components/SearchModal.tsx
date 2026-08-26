import React, { useState } from 'react';
import { Search, X, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { MOCK_ROUTINES, MOCK_PROS } from '../data/mockData';
import { useProducts } from '../services/productService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { products, loading } = useProducts();
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filteredProducts = query
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase()) || p.brand.toLowerCase().includes(query.toLowerCase()))
    : [];

  const filteredRoutines = query
    ? MOCK_ROUTINES.filter(r => r.title.toLowerCase().includes(query.toLowerCase()) || r.subtitle.toLowerCase().includes(query.toLowerCase()))
    : [];

  const filteredPros = query
    ? MOCK_PROS.filter(pr => pr.name.toLowerCase().includes(query.toLowerCase()) || pr.city.toLowerCase().includes(query.toLowerCase()) || pr.specialties.some(s => s.toLowerCase().includes(query.toLowerCase())))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-[#050403]/85 backdrop-blur-md" />

      <div className="relative w-full max-w-2xl bg-[#1A0F0A] border border-[#FFF7EF]/15 rounded-3xl p-6 z-10 shadow-2xl space-y-6">
        {/* Search Bar */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#FFF7EF]/10">
          <Search className="w-5 h-5 text-[#C8753D]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit (leave-in, SPF), une routine, un pro (braider Paris)..."
            autoFocus
            className="flex-1 bg-transparent text-[#FFF7EF] placeholder-[#FFF7EF]/40 text-base focus:outline-none font-light"
          />
          <button onClick={onClose} className="p-1 rounded-full text-[#FFF7EF]/60 hover:text-[#FFF7EF]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        {query ? (
          <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-1">
            {filteredProducts.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold mb-3">Produits ({filteredProducts.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map(p => (
                    <a key={p.id} href={`/produit/${p.slug}`} onClick={onClose} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#050403] hover:border-[#C8753D]/40 border border-[#FFF7EF]/10">
                      <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <p className="text-xs font-serif-title font-bold text-[#FFF7EF] truncate">{p.name}</p>
                        <p className="text-[11px] text-[#C8753D] font-medium">{p.price.toFixed(2)} €</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {filteredRoutines.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold mb-3">Routines ({filteredRoutines.length})</h4>
                <div className="space-y-2">
                  {filteredRoutines.map(r => (
                    <a key={r.id} href={`/routines/${r.slug}`} onClick={onClose} className="flex items-center justify-between p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 hover:border-[#C8753D]/40">
                      <div>
                        <p className="text-sm font-serif-title font-bold text-[#FFF7EF]">{r.title}</p>
                        <p className="text-xs text-[#FFF7EF]/60">{r.subtitle}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#C8753D]" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {filteredPros.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold mb-3">Professionnels Certifiés ({filteredPros.length})</h4>
                <div className="space-y-2">
                  {filteredPros.map(pr => (
                    <a key={pr.id} href={`/professionnels/profil/${pr.slug}`} onClick={onClose} className="flex items-center justify-between p-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/10 hover:border-[#C8753D]/40">
                      <div className="flex items-center gap-3">
                        <img src={pr.avatar} alt={pr.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <p className="text-sm font-serif-title font-bold text-[#FFF7EF]">{pr.name} ({pr.city})</p>
                          <p className="text-xs text-[#D49A63]">{pr.title}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#C8753D]" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {filteredProducts.length === 0 && filteredRoutines.length === 0 && filteredPros.length === 0 && (
              <p className="text-center py-8 text-sm text-[#FFF7EF]/60">Aucun résultat pour "{query}". Essaie "Leave-In", "Braids" ou "SPF".</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold block">Recherches suggérées</span>
            <div className="flex flex-wrap gap-2">
              {['Cheveux crépus 4C', 'Knotless Braids Paris', 'SPF 50 sans trace blanche', 'Demêlage enfant', 'Départ de Locks', 'Sérum marques'].map((term, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(term)}
                  className="px-3.5 py-1.5 rounded-full bg-[#050403] hover:bg-[#C8753D]/20 text-xs text-[#FFF7EF] border border-[#FFF7EF]/15 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
