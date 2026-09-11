import React from 'react';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { usePublishedArticles } from '../services/articleService';
import { contentTypeLabel, topicLabel } from '../lib/educationalContent';

export const JournalSection: React.FC = () => {
  const { articles, loading } = usePublishedArticles();
  return (
    <section className="py-24 bg-kurla-ivory text-kurla-carbon relative border-t border-kurla-stone">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-[520px]">
            <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold flex items-center gap-1.5 block mb-2">
              <BookOpen className="w-3.5 h-3.5 text-kurla-copper" /> Journal & Conseils d'Experts
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-kurla-carbon mb-3">
              Comprendre avant d’acheter.
            </h2>
            <p className="text-sm sm:text-base text-kurla-carbon/75 font-light leading-relaxed">
              Des guides clairs et sourcés pour comprendre votre porosité, choisir vos produits et bâtir vos routines.
            </p>
          </div>

          <a
            href="/journal"
            className="inline-flex items-center gap-2 text-sm font-semibold text-kurla-copper hover:text-kurla-cocoa transition-colors"
          >
            Tous les articles <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* 3 Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading && <p className="md:col-span-3 text-sm text-kurla-carbon/55">Chargement des articles…</p>}
          {!loading && articles.length === 0 && <p className="md:col-span-3 text-sm text-kurla-carbon/55">De nouveaux articles arrivent très bientôt.</p>}
          {articles.slice(0, 3).map((article) => (
            <article
              key={article.id}
              className="rounded-3xl bg-kurla-sand border border-kurla-stone hover:border-kurla-copper transition-all overflow-hidden shadow-xs hover:shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-56 overflow-hidden">
                  {article.image ? <img loading="lazy" decoding="async"
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  /> : <div className="w-full h-full bg-kurla-stone flex items-center justify-center"><BookOpen className="w-10 h-10 text-kurla-copper" /></div>}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-kurla-ivory/90 backdrop-blur-md text-[11px] font-semibold text-kurla-carbon border border-kurla-stone">
                      {contentTypeLabel(article.contentType || 'article')}
                    </span>
                    {article.topic && <span className="px-3 py-1 rounded-full bg-kurla-ivory/90 backdrop-blur-md text-[11px] text-kurla-carbon border border-kurla-stone">
                      {topicLabel(article.topic)}
                    </span>}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-kurla-carbon/60">
                    <span>{article.date}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-kurla-copper" /> {article.readTime}
                    </span>
                  </div>

                  <h3 className="text-xl font-serif-title font-bold text-kurla-carbon group-hover:text-kurla-copper transition-colors line-clamp-2">
                    {article.title}
                  </h3>

                  <p className="text-xs text-kurla-carbon/75 font-light leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <a
                  href={`/journal/${article.slug}`}
                  className="inline-flex items-center gap-2 text-xs font-bold text-kurla-copper hover:text-kurla-cocoa transition-colors"
                >
                  Lire l'article complet <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
};
