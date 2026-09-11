import React from 'react';
import { Bookmark, ShoppingBag, BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';

export const SavedPage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-kurla-ivory text-kurla-carbon min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <a href="/account/kurla-id" className="inline-flex items-center gap-1.5 text-xs text-kurla-copper font-semibold mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à mon KURLA ID
        </a>

        <div className="mb-8">
          <span className="text-xs font-semibold text-kurla-copper uppercase tracking-widest block mb-1">
            Mes Favoris Personnel
          </span>
          <h1 className="text-3xl font-serif-title font-bold text-kurla-carbon">
            Éléments Sauvegardés
          </h1>
          <p className="text-sm text-kurla-carbon/75 font-light mt-1">
            Retrouve ici tes routines, articles du journal, fiches produits et réponses de l'Assistant IA mis en favoris.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-8">
          Aperçu de démonstration : les favoris et routines présentés ici ne sont pas encore reliés à une persistance KURla ID.
        </div>

        <div className="space-y-8">
          {/* Saved Routines */}
          <div className="bg-kurla-sand p-6 rounded-3xl border border-kurla-stone">
            <h2 className="text-base font-serif-title font-bold text-kurla-carbon mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-kurla-copper" /> Routines Sauvegardées
            </h2>
            <div className="p-4 rounded-2xl bg-kurla-ivory border border-kurla-stone flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-kurla-copper">Exemple de routine</span>
                <h3 className="text-xs font-bold text-kurla-carbon">Routine 3 Étapes "Hydratation & Scellage 4C"</h3>
              </div>
              <a href="/routines/routine-hydratation-4c" className="px-3 py-1.5 rounded-full bg-kurla-copper text-white text-xs font-semibold flex items-center gap-1">
                Voir <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Saved Products */}
          <div className="bg-kurla-sand p-6 rounded-3xl border border-kurla-stone">
            <h2 className="text-base font-serif-title font-bold text-kurla-carbon mb-4 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-kurla-copper" /> Produits Mis de Côté
            </h2>
            <div className="p-4 rounded-2xl bg-kurla-ivory border border-kurla-stone flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600">Exemple de produit</span>
                <h3 className="text-xs font-bold text-kurla-carbon">Beurre de Cacao & Karité Grand Cru</h3>
              </div>
              <a href="/produit/beurre-de-cacao-karite" className="px-3 py-1.5 rounded-full bg-kurla-carbon text-white text-xs font-semibold flex items-center gap-1">
                Voir produit <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
