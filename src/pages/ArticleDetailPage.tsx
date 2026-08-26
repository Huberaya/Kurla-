import React from 'react';
import { ArrowLeft, Clock, Share2, Sparkles, ArrowRight } from 'lucide-react';
import { MOCK_ARTICLES } from '../data/mockData';

interface ArticleDetailPageProps {
  slug: string;
}

export const ArticleDetailPage: React.FC<ArticleDetailPageProps> = ({ slug }) => {
  const article = MOCK_ARTICLES.find(a => a.slug === slug) || MOCK_ARTICLES[0];

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
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article Body */}
        <div className="prose prose-invert max-w-none text-[#FFF7EF]/85 text-base sm:text-lg font-light leading-relaxed space-y-6">
          <p className="font-normal text-xl text-[#FFF7EF] leading-relaxed">
            {article.excerpt}
          </p>

          <p>
            Comprendre la structure de sa fibre capillaire ou de son épiderme est la première étape vers une beauté sereine. Sur cheveux 4A à 4C, la forme hélicoïdale de la spirale empêche le sébum naturel produit par le cuir chevelu d'irriguer facilement jusqu'aux pointes.
          </p>

          <h3 className="text-2xl font-serif-title font-bold text-[#FFF7EF] pt-4">
            1. Le rôle déterminant de la porosité
          </h3>
          <p>
            Lorsque les cuticules sont très ouvertes (porosité forte), l'eau pénètre instantanément mais s'évapore tout aussi vite au contact de l'air ambiant. C'est pourquoi l'utilisation d'une méthode structurée de scellage (Leave-in Crème + Élixir d'huiles pures) est indispensable pour verrouiller l'hydratation.
          </p>

          <h3 className="text-2xl font-serif-title font-bold text-[#FFF7EF] pt-4">
            2. Les erreurs courantes à éviter
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-sm text-[#FFF7EF]/80">
            <li>Appliquer de l'huile pure sur un cheveu complètement sec. L'huile isole et empêche l'eau de pénétrer ultérieurement.</li>
            <li>Employer des shampoings clarifiants trop agressifs sans masque reconstituant après chaque lavage.</li>
            <li>Démêler les cheveux crépus 4C à sec sans leave-in ni eau tiède.</li>
          </ul>

          <div className="p-6 rounded-2xl bg-[#1A0F0A] border border-[#C8753D]/30 my-8 space-y-2">
            <h4 className="text-sm font-serif-title font-bold text-[#D49A63] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C8753D]" /> Conseil de l'expert KURLA
            </h4>
            <p className="text-xs text-[#FFF7EF]/80 italic">
              « Privilégiez toujours un démêlage aux doigts doux en humidifiant au préalable par sections. Ne forcez jamais sur un nœud. »
            </p>
          </div>
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
