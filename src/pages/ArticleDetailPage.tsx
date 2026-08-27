import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Share2, Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import { Article } from '../types';
import { fetchPublishedArticle } from '../services/articleService';
import { NotFoundPage } from './NotFoundPage';

interface ArticleDetailPageProps {
  slug: string;
}

export const ArticleDetailPage: React.FC<ArticleDetailPageProps> = ({ slug }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublishedArticle(slug).then(value => { if (active) setArticle(value); }).catch(() => { if (active) setArticle(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);
  if (loading) return <div className="min-h-screen pt-40 bg-[#050403] text-[#FFF7EF] text-center text-sm">Chargement de l’article…</div>;
  if (!article) return <NotFoundPage />;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <a href="/journal" className="inline-flex items-center gap-2 text-xs font-semibold text-[#D49A63] hover:text-[#FFF7EF] mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour au Journal
        </a>

        {/* Header */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-[#3A2218] text-[#D49A63] text-xs font-semibold border border-[#C8753D]/30">
              {article.category}
            </span>
            <span className="text-xs text-[#FFF7EF]/50 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#C8753D]" /> {article.readTime}
            </span>
            <span className="text-xs text-[#FFF7EF]/40">• {article.date}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF] leading-tight">
            {article.title}
          </h1>

          <p className="text-base text-[#D49A63] font-serif-title italic">
            Par {article.author}
          </p>
        </div>

        {/* Featured Image */}
        <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-[#FFF7EF]/10 mb-12 shadow-2xl">
          {article.image ? <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          /> : <div className="w-full h-full bg-[#3A2218] flex items-center justify-center"><BookOpen className="w-12 h-12 text-[#C8753D]" /></div>}
        </div>

        {/* Article Body */}
        <div className="prose prose-invert max-w-none text-[#FFF7EF]/85 text-base sm:text-lg font-light leading-relaxed space-y-6">
          <p className="font-normal text-xl text-[#FFF7EF] leading-relaxed">
            {article.excerpt}
          </p>
          <div className="whitespace-pre-wrap">{article.content}</div>
          {article.faq && article.faq.length > 0 && (
            <div className="p-6 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4">
              <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF]">Questions fréquentes</h2>
              {article.faq.map((item, index) => (
                <div key={`${item.question}-${index}`} className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#D49A63]">{item.question}</h3>
                  <p className="text-sm">{item.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA Diagnostic */}
        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-[#1A0F0A] to-[#3A2218] border border-[#C8753D]/40 text-center space-y-4 shadow-2xl">
          <h3 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Besoin d'une routine sur mesure pour tes cheveux ?</h3>
          <p className="text-sm text-[#FFF7EF]/70 max-w-md mx-auto font-light">
            Découvre tes besoins exacts en 3 minutes grâce à notre diagnostic IA gratuit.
          </p>
          <a
            href="/diagnostic/cheveux"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-lg transition-all"
          >
            Faire mon diagnostic <ArrowRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </div>
  );
};
