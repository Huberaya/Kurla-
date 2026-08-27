import React from 'react';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { usePublishedArticles } from '../services/articleService';

export const JournalPage: React.FC = () => {
  const { articles, loading, error } = usePublishedArticles();
  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-[520px] mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">
            Le Journal Éditorial KURLA
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF] mb-3">
            Comprendre avant d’acheter.
          </h1>
          <p className="text-sm sm:text-base text-[#FFF7EF]/70 font-light leading-relaxed">
            Dossiers scientifiques et conseils pratiques rédigés pour démystifier la porosité, la photoprotection des carnations sombres et l’entretien des coiffures protectrices.
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading && <p className="md:col-span-3 text-center text-sm text-[#FFF7EF]/50">Chargement des articles publiés…</p>}
          {!loading && error && <p className="md:col-span-3 text-center text-sm text-rose-300">{error}</p>}
          {!loading && !error && articles.length === 0 && <p className="md:col-span-3 text-center text-sm text-[#FFF7EF]/50">Aucun article publié pour le moment.</p>}
          {articles.map((article) => (
            <article
              key={article.id}
              className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 hover:border-[#C8753D]/40 transition-all overflow-hidden shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-60 overflow-hidden">
                  {article.image ? <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  /> : <div className="w-full h-full bg-[#3A2218] flex items-center justify-center"><BookOpen className="w-10 h-10 text-[#C8753D]" /></div>}
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#050403]/80 backdrop-blur-md text-xs font-semibold text-[#D49A63]">
                    {article.category}
                  </span>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-[#FFF7EF]/50">
                    <span>{article.date}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#C8753D]" /> {article.readTime}
                    </span>
                  </div>

                  <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] group-hover:text-[#D49A63] transition-colors line-clamp-2">
                    {article.title}
                  </h2>

                  <p className="text-xs text-[#FFF7EF]/70 font-light leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <a
                  href={`/journal/${article.slug}`}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#C8753D] hover:text-[#FFF7EF] transition-colors"
                >
                  Lire l'article complet <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>

      </div>
    </div>
  );
};
