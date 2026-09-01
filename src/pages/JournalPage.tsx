import React, { useMemo, useState } from 'react';
import { BookOpen, Clock, ArrowRight, ShieldCheck, Video } from 'lucide-react';
import { usePublishedArticles } from '../services/articleService';
import { contentTypeLabel, topicLabel } from '../lib/educationalContent';

export const JournalPage: React.FC = () => {
  const { articles, loading, error } = usePublishedArticles();
  const [typeFilter, setTypeFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');

  const visibleArticles = useMemo(() => articles.filter(article =>
    (typeFilter === 'all' || article.contentType === typeFilter) &&
    (topicFilter === 'all' || article.topic === topicFilter)
  ), [articles, typeFilter, topicFilter]);

  const topics = Array.from(new Set(articles.map(article => article.topic).filter(Boolean))) as string[];
  const types = Array.from(new Set(articles.map(article => article.contentType).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-[620px] mx-auto mb-10">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">
            Le Journal Éditorial KURLA
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF] mb-3">
            Comprendre avant d’acheter.
          </h1>
          <p className="text-sm sm:text-base text-[#FFF7EF]/70 font-light leading-relaxed">
            Articles, vidéos, guides et fiches pratiques publiés après vérification éditoriale, avec leurs sources et leur niveau de preuve.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12" aria-label="Filtres du Journal">
          <label className="text-xs text-[#FFF7EF]/60 flex items-center gap-2">
            Type
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="rounded-full border border-[#FFF7EF]/15 bg-[#1A0F0A] px-4 py-2 text-[#FFF7EF] outline-none">
              <option value="all">Tous les formats</option>
              {types.map(type => <option key={type} value={type}>{contentTypeLabel(type)}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#FFF7EF]/60 flex items-center gap-2">
            Sujet
            <select value={topicFilter} onChange={event => setTopicFilter(event.target.value)} className="rounded-full border border-[#FFF7EF]/15 bg-[#1A0F0A] px-4 py-2 text-[#FFF7EF] outline-none">
              <option value="all">Tous les sujets</option>
              {topics.map(topic => <option key={topic} value={topic}>{topicLabel(topic)}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading && <p className="md:col-span-3 text-center text-sm text-[#FFF7EF]/50">Chargement des contenus publiés…</p>}
          {!loading && error && <p className="md:col-span-3 text-center text-sm text-rose-300">{error}</p>}
          {!loading && !error && visibleArticles.length === 0 && <p className="md:col-span-3 text-center text-sm text-[#FFF7EF]/50">Aucun contenu publié pour ces filtres.</p>}
          {visibleArticles.map((article) => (
            <article key={article.id} className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 hover:border-[#C8753D]/40 transition-all overflow-hidden shadow-xl flex flex-col justify-between group">
              <div>
                <div className="relative h-60 overflow-hidden">
                  {article.image ? <img loading="lazy" decoding="async" src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full bg-[#3A2218] flex items-center justify-center">{article.contentType === 'video' ? <Video className="w-10 h-10 text-[#C8753D]" /> : <BookOpen className="w-10 h-10 text-[#C8753D]" />}</div>}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#050403]/80 backdrop-blur-md text-xs font-semibold text-[#D49A63]">{contentTypeLabel(article.contentType || 'article')}</span>
                    {article.topic && <span className="px-3 py-1 rounded-full bg-[#050403]/80 backdrop-blur-md text-xs text-[#FFF7EF]/80">{topicLabel(article.topic)}</span>}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-[#FFF7EF]/50">
                    <span>{article.date ? new Date(article.date).toLocaleDateString('fr-FR') : 'Date non renseignée'}</span>
                    {article.readTime && <><span>•</span><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#C8753D]" /> {article.readTime}</span></>}
                  </div>
                  <h2 className="text-xl font-serif-title font-bold text-[#FFF7EF] group-hover:text-[#D49A63] transition-colors line-clamp-2">{article.title}</h2>
                  <p className="text-xs text-[#FFF7EF]/70 font-light leading-relaxed line-clamp-3">{article.excerpt || 'Description non renseignée.'}</p>
                  <div className="flex items-center gap-2 text-[11px] text-[#FFF7EF]/55"><ShieldCheck className="w-3.5 h-3.5 text-[#C8753D]" /> Niveau de preuve : {article.evidenceLevel === 'expert_consensus' ? 'consensus expert' : article.evidenceLevel === 'not_provided' ? 'non renseigné' : article.evidenceLevel}</div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <a href={`/journal/${article.slug}`} className="inline-flex items-center gap-2 text-xs font-bold text-[#C8753D] hover:text-[#FFF7EF] transition-colors">
                  Consulter le contenu <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
