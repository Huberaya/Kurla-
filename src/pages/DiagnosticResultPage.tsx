import React, { useEffect, useState } from 'react';
import { Sparkles, ShieldCheck, CheckCircle2, ArrowRight, ShoppingBag, AlertTriangle, Loader2 } from 'lucide-react';
import { AIRecommendationResult, Product } from '../types';
import { useProducts } from '../services/productService';

export const DiagnosticResultPage: React.FC = () => {
  const { products, loading, error, count } = useProducts();
  const [result, setResult] = useState<AIRecommendationResult | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem('kurla_diagnostic_result');
    if (cached) {
      try {
        setResult(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    } else {
      // No client-side product fallback: the API is the only authority for
      // in-stock, country-eligible diagnostic recommendations.
      setResult({
        summary: "Aucun résultat de diagnostic n’est disponible dans cette session.",
        recommendedRoutine: "Diagnostic KURLA à recommencer",
        reason: "Relancez le diagnostic pour obtenir une routine calculée à partir de vos réponses et du catalogue disponible.",
        steps: ["Relancer le diagnostic.", "Vérifier votre contexte et votre budget.", "Demander un avis professionnel en cas de symptôme."],
        warnings: ["Les recommandations KURLA sont des conseils beauté non médicaux."],
        productHandles: [],
        requiresHumanReview: false
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF] flex items-center justify-center">
        <div className="text-center p-8">
          <Loader2 className="w-10 h-10 text-[#C8753D] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#FFF7EF]/70">Analyse de vos recommandations avec le catalogue Supabase...</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const matchedProducts: Product[] = products.filter(p =>
    result.productHandles.includes(p.slug) || result.productHandles.includes(p.id)
  );

  const displayProducts = matchedProducts;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3A2218] text-[#D49A63] border border-[#C8753D]/30 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#C8753D]" /> Analyse KURLA supervisée
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF]">
            {result.recommendedRoutine}
          </h1>
          <p className="text-base text-[#FFF7EF]/80 max-w-xl mx-auto font-light leading-relaxed">
            {result.summary}
          </p>
        </div>

        {/* Human Review / Safety Warning Box */}
        {result.requiresHumanReview && (
          <div className="p-6 rounded-2xl bg-[#3A2218]/90 border border-amber-500/50 mb-8 flex items-start gap-4 text-amber-200">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">Avis spécialisé recommandé</h4>
              <p className="text-xs font-light leading-relaxed">
                Vos réponses indiquent des signes de tiraillement ou d'irritation. Nous vous suggérons de consulter un dermatologue ou de réserver un bilan d'écoute auprès d'un master loctician/styliste certifié KURLA Pro.
              </p>
            </div>
          </div>
        )}

        {/* Explanation Card */}
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-8 shadow-xl space-y-4">
          <h3 className="text-lg font-serif-title font-bold text-[#D49A63]">Pourquoi cette routine ?</h3>
          <p className="text-sm text-[#FFF7EF]/80 leading-relaxed font-light">
            {result.reason}
          </p>
        </div>

        {/* Steps Card */}
        <div className="p-8 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 mb-10 shadow-xl space-y-6">
          <h3 className="text-xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#C8753D]" /> Ordre d'application recommandé
          </h3>

          <div className="space-y-4">
            {result.steps.map((stepText, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-[#050403]/80 border border-[#FFF7EF]/5">
                <span className="w-8 h-8 rounded-full bg-[#C8753D] text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <p className="text-sm text-[#FFF7EF]/90 font-light leading-relaxed mt-1">
                  {stepText}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Products Showcase */}
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Produits indispensables recommandés</h3>
            <span className="text-xs text-[#D49A63] font-semibold">Formules concentrées</span>
          </div>

          {displayProducts.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayProducts.map((p) => (
              <div key={p.id} className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5 flex flex-col justify-between shadow-lg">
                <div>
                  <img loading="lazy" decoding="async" src={p.image} alt={p.name} className="w-full h-44 object-cover rounded-2xl mb-4" />
                  <span className="text-[10px] uppercase font-semibold text-[#D49A63] block mb-1">{p.brand}</span>
                  <h4 className="text-base font-serif-title font-bold text-[#FFF7EF] mb-2">{p.name}</h4>
                  <p className="text-xs text-[#FFF7EF]/70 line-clamp-2 font-light mb-4">{p.description}</p>
                </div>
                <div className="pt-4 border-t border-[#FFF7EF]/10 flex items-center justify-between">
                  <span className="text-lg font-bold text-[#FFF7EF]">{p.price.toFixed(2)} €</span>
                  <a href={`/produit/${p.slug}`} className="px-4 py-2 rounded-full bg-[#C8753D] text-white text-xs font-semibold hover:bg-[#b06330]">Voir le soin</a>
                </div>
              </div>
            ))}
          </div> : <div className="p-6 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-sm text-[#FFF7EF]/70">Aucun produit n’est affiché : le catalogue disponible ne contient pas de recommandation vérifiable pour ce diagnostic ou votre pays.</div>}
        </div>

        {/* Disclaimer Warning */}
        {result.warnings.map((w, i) => (
          <div key={i} className="p-4 rounded-xl bg-[#1A0F0A]/60 border border-[#FFF7EF]/10 text-xs text-[#FFF7EF]/50 mb-8">
            <strong>Disclaimer :</strong> {w}
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/boutique"
            className="px-8 py-4 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white font-semibold text-sm text-center shadow-xl"
          >
            Commander le kit recommandé
          </a>
          <a
            href="/professionnels"
            className="px-8 py-4 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/20 text-[#FFF7EF] font-medium text-sm text-center"
          >
            Prendre rendez-vous avec un pro certifié
          </a>
        </div>

      </div>
    </div>
  );
};
