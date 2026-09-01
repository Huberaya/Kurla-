import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock, ArrowRight, BookOpen, ExternalLink, ShieldAlert, ShieldCheck, Video } from 'lucide-react';
import { Article } from '../types';
import { fetchPublishedArticle } from '../services/articleService';
import { contentTypeLabel, topicLabel } from '../lib/educationalContent';
import { NotFoundPage } from './NotFoundPage';

interface ArticleDetailPageProps { slug: string; }

const evidenceLabel = (value?: Article['evidenceLevel']) => ({
  low: 'faible',
  moderate: 'modéré',
  high: 'élevé',
  expert_consensus: 'consensus d’experts',
  not_provided: 'non renseigné'
}[value || 'not_provided'] || 'non renseigné');

export const ArticleDetailPage: React.FC<ArticleDetailPageProps> = ({ slug }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublishedArticle(slug).then(value => { if (active) { setArticle(value); setSelectedLanguage(value?.language || ''); } }).catch(() => { if (active) setArticle(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const translation = useMemo(() => article?.translations?.[selectedLanguage], [article, selectedLanguage]);
  if (loading) return <div className="min-h-screen pt-40 bg-[#050403] text-[#FFF7EF] text-center text-sm">Chargement du contenu…</div>;
  if (!article) return <NotFoundPage />;

  const availableLanguages = Array.from(new Set([article.language, ...Object.keys(article.translations || {})].filter(Boolean))) as string[];
  const title = translation?.title || article.title;
  const excerpt = translation?.excerpt || article.excerpt;
  const body = translation?.content || article.content;
  const warning = translation?.medicalWarning || article.medicalWarning;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <a href="/journal" className="inline-flex items-center gap-2 text-xs font-semibold text-[#D49A63] hover:text-[#FFF7EF] mb-8"><ArrowLeft className="w-4 h-4" /> Retour au Journal</a>

        <div className="space-y-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-[#3A2218] text-[#D49A63] text-xs font-semibold border border-[#C8753D]/30">{contentTypeLabel(article.contentType || 'article')}</span>
            {article.topic && <span className="px-3 py-1 rounded-full bg-[#3A2218] text-[#FFF7EF]/75 text-xs border border-[#FFF7EF]/10">{topicLabel(article.topic)}</span>}
            {article.readTime && <span className="text-xs text-[#FFF7EF]/50 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#C8753D]" /> {article.readTime}</span>}
            <span className="text-xs text-[#FFF7EF]/40">• {article.date ? new Date(article.date).toLocaleDateString('fr-FR') : 'Date non renseignée'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF] leading-tight">{title}</h1>
          <p className="text-base text-[#D49A63] font-serif-title italic">Par {article.author || 'Auteur non renseigné'}</p>
          <p className="text-xs text-[#FFF7EF]/50">Créé le {article.createdAt ? new Date(article.createdAt).toLocaleDateString('fr-FR') : 'date non renseignée'} · Mis à jour le {article.updatedAt ? new Date(article.updatedAt).toLocaleDateString('fr-FR') : 'date non renseignée'} · Langue : {article.language || 'non renseignée'}</p>
        </div>

        {availableLanguages.length > 1 && <div className="flex flex-wrap items-center gap-2 mb-8" aria-label="Traductions disponibles">
          <span className="text-xs text-[#FFF7EF]/55">Lire dans :</span>
          {availableLanguages.map(language => <button key={language} type="button" onClick={() => setSelectedLanguage(language)} className={`rounded-full px-3 py-1 text-xs border ${selectedLanguage === language ? 'border-[#C8753D] text-[#FFF7EF] bg-[#3A2218]' : 'border-[#FFF7EF]/15 text-[#FFF7EF]/60'}`}>{language}</button>)}
        </div>}

        <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-[#FFF7EF]/10 mb-12 shadow-2xl">
          {article.image ? <img loading="lazy" decoding="async" src={article.image} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#3A2218] flex items-center justify-center">{article.contentType === 'video' ? <Video className="w-12 h-12 text-[#C8753D]" /> : <BookOpen className="w-12 h-12 text-[#C8753D]" />}</div>}
        </div>

        {article.contentType === 'video' && article.mediaUrl && <div className="mb-10 rounded-2xl bg-[#1A0F0A] border border-[#C8753D]/30 p-5">
          <p className="text-sm text-[#FFF7EF] mb-3 flex items-center gap-2"><Video className="w-4 h-4 text-[#C8753D]" /> Vidéo{article.duration ? ` · ${article.duration}` : ''}</p>
          <video controls className="w-full rounded-xl bg-black" src={article.mediaUrl}>La vidéo n’est pas lisible dans ce navigateur.</video>
          <a href={article.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-[#D49A63] mt-3">Ouvrir le média <ExternalLink className="w-3.5 h-3.5" /></a>
        </div>}

        <div className="mb-10 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex gap-2 items-start"><ShieldCheck className="w-4 h-4 mt-0.5 text-[#C8753D]" /><span>Niveau de preuve : <strong className="text-[#FFF7EF]">{evidenceLabel(article.evidenceLevel)}</strong></span></div>
          <div className="flex gap-2 items-start"><BookOpen className="w-4 h-4 mt-0.5 text-[#C8753D]" /><span>{article.sources?.length || 0} source{(article.sources?.length || 0) > 1 ? 's' : ''} éditoriale{(article.sources?.length || 0) > 1 ? 's' : ''}</span></div>
        </div>

        {warning && <aside className="mb-10 p-5 rounded-2xl bg-amber-950/40 border border-amber-400/30 text-amber-100 text-sm flex gap-3"><ShieldAlert className="w-5 h-5 shrink-0 text-amber-300" /><div><strong className="block mb-1">Avertissement</strong>{warning}</div></aside>}

        <div className="prose prose-invert max-w-none text-[#FFF7EF]/85 text-base sm:text-lg font-light leading-relaxed space-y-6">
          {excerpt && <p className="font-normal text-xl text-[#FFF7EF] leading-relaxed">{excerpt}</p>}
          <div className="whitespace-pre-wrap">{body}</div>
          {article.faq && article.faq.length > 0 && <div className="p-6 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-4"><h2 className="text-xl font-serif-title font-bold text-[#FFF7EF]">Questions fréquentes</h2>{article.faq.map((item, index) => <div key={`${item.question}-${index}`} className="space-y-1"><h3 className="text-sm font-semibold text-[#D49A63]">{item.question}</h3><p className="text-sm">{item.answer}</p></div>)}</div>}
        </div>

        <section className="mt-12 p-6 rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><h2 className="text-xl font-serif-title font-bold mb-4">Sources et transparence</h2><div className="space-y-3">{(article.sources || []).map((source, index) => <div key={`${source.label}-${index}`} className="text-sm text-[#FFF7EF]/75"><span className="font-semibold text-[#FFF7EF]">{source.label}</span>{source.publisher && ` · ${source.publisher}`}{source.accessedAt && ` · consultée le ${source.accessedAt}`}{source.note && <span className="block text-xs text-[#FFF7EF]/50 mt-1">{source.note}</span>}{source.url && <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#D49A63] mt-1">Voir la source <ExternalLink className="w-3 h-3" /></a>}</div>)}</div></section>

        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-[#1A0F0A] to-[#3A2218] border border-[#C8753D]/40 text-center space-y-4 shadow-2xl">
          <h3 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">Besoin d'une routine sur mesure pour tes cheveux ?</h3>
          <p className="text-sm text-[#FFF7EF]/70 max-w-md mx-auto font-light">Découvre tes besoins exacts en 3 minutes grâce à notre diagnostic IA gratuit.</p>
          <a href="/diagnostic/cheveux" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-lg transition-all">Faire mon diagnostic <ArrowRight className="w-4 h-4" /></a>
        </div>
      </div>
    </div>
  );
};
