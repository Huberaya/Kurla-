import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <main className="min-h-screen pt-32 pb-24 bg-kurla-ivory text-kurla-carbon flex items-center">
      <div className="max-w-xl mx-auto px-4 text-center">
        <span className="text-6xl font-serif-title font-bold text-kurla-copper">404</span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-serif-title font-bold">Cette page n’existe pas</h1>
        <p className="mt-3 text-sm text-kurla-carbon/70 leading-relaxed">
          Le lien a peut-être changé ou le contenu n’est plus disponible. Retrouvez un diagnostic, une routine ou un produit depuis les espaces KURLA.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <a href="/" className="px-5 py-3 rounded-full bg-kurla-carbon text-white text-xs font-semibold inline-flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour à l’accueil
          </a>
          <a href="/boutique" className="px-5 py-3 rounded-full bg-kurla-copper text-white text-xs font-semibold inline-flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> Explorer la boutique
          </a>
        </div>
      </div>
    </main>
  );
};
