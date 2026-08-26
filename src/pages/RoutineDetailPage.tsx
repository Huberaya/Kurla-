import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, PackageOpen, ShieldAlert, ShoppingBag } from 'lucide-react';
import { Product, ProductVariant, RoutineBundle } from '../types';
import { NotFoundPage } from './NotFoundPage';

interface RoutineDetailPageProps {
  slug: string;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
}

export const RoutineDetailPage: React.FC<RoutineDetailPageProps> = ({ slug, onAddToCart }) => {
  const [routine, setRoutine] = useState<RoutineBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/routines/${encodeURIComponent(slug)}`)
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 404) { setNotFound(true); return; }
        if (!response.ok) throw new Error(data?.error || 'Routine indisponible.');
        if (!cancelled) setRoutine(data.routine || null);
      })
      .catch(() => { if (!cancelled) setRoutine(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const validProducts = useMemo(() => routine?.products || [], [routine]);

  if (loading) return <div className="min-h-screen pt-32 bg-[#050403] text-[#FFF7EF] flex items-center justify-center"><div className="text-center"><Loader2 className="w-9 h-9 text-[#C8753D] animate-spin mx-auto mb-4" /><p className="text-sm text-[#FFF7EF]/65">Chargement de la routine publiée…</p></div></div>;
  if (notFound || !routine) return <NotFoundPage />;

  const handleAddBundle = () => {
    validProducts.forEach(product => {
      const step = routine.steps.find(item => item.productId === product.id);
      const variant = step?.variantId && product.variants?.find((item: any) => item.id === step.variantId);
      onAddToCart(product, variant as ProductVariant | undefined);
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  return <div className="min-h-screen pt-28 pb-24 bg-[#050403] text-[#FFF7EF]"><div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"><a href="/routines" className="inline-flex items-center gap-2 text-xs text-[#FFF7EF]/60 hover:text-[#FFF7EF] mb-6"><ArrowLeft className="w-4 h-4" /> Toutes les routines</a><div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start"><div>{routine.image ? <img src={routine.image} alt={routine.title} className="w-full aspect-[4/5] rounded-3xl object-cover border border-[#FFF7EF]/10" /> : <div className="w-full aspect-[4/5] rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 flex items-center justify-center text-sm text-[#FFF7EF]/50"><PackageOpen className="w-5 h-5 mr-2" /> Image non renseignée</div>}</div><div className="space-y-6"><span className="text-xs uppercase tracking-widest text-[#D49A63]">{routine.badge || 'Routine publiée'}</span><h1 className="text-3xl sm:text-5xl font-serif-title font-bold leading-tight">{routine.title}</h1><p className="text-base text-[#FFF7EF]/75 leading-relaxed">{routine.subtitle || 'Description non renseignée'}</p><div className="flex flex-wrap gap-4 text-xs text-[#FFF7EF]/65">{routine.benefit && <span className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#C8753D]" /> {routine.benefit}</span>}{routine.duration && <span className="flex gap-2"><Clock className="w-4 h-4 text-[#D49A63]" /> {routine.duration}</span>}{routine.frequency && <span>{routine.frequency}</span>}</div><div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5 flex items-center justify-between gap-4"><div><span className="text-3xl font-bold">{routine.products.reduce((total, product) => total + product.price, 0).toFixed(2)} €</span><span className="block text-[10px] text-[#FFF7EF]/50">Prix calculé par le catalogue</span></div><button onClick={handleAddBundle} disabled={!validProducts.length} className="px-6 py-3 rounded-full bg-[#C8753D] text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-40"><ShoppingBag className="w-4 h-4" />{added ? 'Routine ajoutée' : 'Ajouter la routine'}</button></div><div className="rounded-2xl border border-[#FFF7EF]/10 p-4 text-xs text-[#FFF7EF]/65 flex gap-2"><ShieldAlert className="w-4 h-4 text-[#D49A63] shrink-0" />La routine ne garantit pas un résultat individuel. Les produits inclus restent consultables séparément avec leurs informations de composition et de livraison.</div></div></div><section className="mt-14"><h2 className="text-2xl font-serif-title font-bold mb-6">Étapes et produits inclus</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{routine.steps.map(step => { const product = validProducts.find(item => item.id === step.productId); return <article key={`${step.number}-${step.productId}`} className="rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5 flex gap-4"><span className="text-2xl font-serif-title font-bold text-[#C8753D]">{String(step.number).padStart(2, '0')}</span><div><h3 className="font-semibold">{step.title}</h3><p className="text-xs text-[#FFF7EF]/65 mt-1">{step.description || 'Instruction non renseignée'}</p><p className="text-xs text-[#D49A63] mt-3">{product?.name || 'Produit non renseigné'}{step.quantity > 1 ? ` · quantité ${step.quantity}` : ''}</p></div><ArrowRight className="w-4 h-4 text-[#FFF7EF]/35 ml-auto mt-1 shrink-0" /></article>; })}</div></section></div></div>;
};
