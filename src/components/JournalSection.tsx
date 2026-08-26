import React from 'react';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { MOCK_ARTICLES } from '../data/mockData';

export const JournalSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] relative border-t border-[#E8E1DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-[520px]">
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold flex items-center gap-1.5 block mb-2">
              <BookOpen className="w-3.5 h-3.5 text-[#C8753D]" /> Journal & Conseils d'Experts
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-[#111111] mb-3">
              Comprendre avant d’acheter.
            </h2>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              Guides simples et scientifiques pour mieux comprendre ta porosité, choisir tes produits et tes routines.
            </p>
          </div>

          <a
            href="/journal"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#C8753D] hover:text-[#b06330] transition-colors"
          >
            Tous les articles <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* 3 Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {MOCK_ARTICLES.map((article) => (
            <article
              key={article.id}
              className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] hover:border-[#C8753D] transition-all overflow-hidden shadow-xs hover:shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#FFFDF9]/90 backdrop-blur-md text-[11px] font-semibold text-[#111111] border border-[#E8E1DA]">
                    {article.category}
                  </span>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-[#111111]/60">
                    <span>{article.date}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#C8753D]" /> {article.readTime}
                    </span>
                  </div>

                  <h3 className="text-xl font-serif-title font-bold text-[#111111] group-hover:text-[#C8753D] transition-colors line-clamp-2">
                    {article.title}
                  </h3>

                  <p className="text-xs text-[#111111]/75 font-light leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <a
                  href={`/journal/${article.slug}`}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#C8753D] hover:text-[#b06330] transition-colors"
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
