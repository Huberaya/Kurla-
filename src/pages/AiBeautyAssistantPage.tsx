import React, { useState } from 'react';
import { Sparkles, Send, ShieldCheck, Bookmark, ArrowRight, RefreshCw, MessageSquare, BookOpen, AlertCircle, ShoppingBag, UserCheck } from 'lucide-react';
import { queryBeautyAssistant, AssistantResponse } from '../lib/ai/assistant';

export const AiBeautyAssistantPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<{ user: string; response: AssistantResponse }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<string[]>([]);

  const quickCategories = [
    { label: 'Cheveux secs', query: 'Mes cheveux crépus restent secs malgré l’huile, pourquoi ?' },
    { label: 'Braids & Tresses', query: 'Mes tresses font mal et me tirent la tête, que faire ?' },
    { label: 'Démêlage Enfant', query: 'Comment démêler les cheveux de mon enfant sans douleur ?' },
    { label: 'SPF Peau Noire', query: 'Quel SPF choisir pour peau noire sans traces blanches ?' },
    { label: 'Porosité 4C', query: 'Quelle routine pour cheveux crépus 4C à forte porosité ?' },
    { label: 'Cuir Chevelu', query: 'Quel produit utiliser pour un cuir chevelu qui gratte sous mes braids ?' },
    { label: 'Débutante', query: 'Je débute totalement dans le soin naturel afro, par quoi commencer ?' },
    { label: 'Climat Hiver Europe', query: 'Quelle routine capillaire adopter en hiver en Europe avec le calcaire ?' }
  ];

  const handleSend = async (userQueryText?: string) => {
    const textToSend = userQueryText || query;
    if (!textToSend.trim()) return;

    setIsThinking(true);
    setQuery('');

    try {
      const res = await queryBeautyAssistant(textToSend);
      setHistory(prev => [...prev, { user: textToSend, response: res }]);
    } catch (error) {
      console.error('Error querying beauty assistant:', error);
    } finally {
      setIsThinking(false);
    }
  };

  const toggleSaveAnswer = (idx: number) => {
    const key = `ans-${idx}`;
    if (savedAnswers.includes(key)) {
      setSavedAnswers(savedAnswers.filter(k => k !== key));
    } else {
      setSavedAnswers([...savedAnswers, key]);
    }
  };

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold border border-[#C8753D]/20 mb-4">
            <Sparkles className="w-4 h-4 text-[#C8753D]" /> Assistant Beauté IA Central KURLA
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111] mb-4">
            Pose ta question. Reçois une réponse claire.
          </h1>

          <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
            Conseil cosmétique instantané, structuré et sans jargon pour cheveux crépus, frisés, bouclés, peaux mélaninées, enfants et protective styles.
          </p>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="mb-8">
          <span className="text-xs text-[#111111]/60 font-medium block mb-2 text-center">
            Questions fréquentes par thème :
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickCategories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(cat.query)}
                className="px-3.5 py-1.5 rounded-full bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white border border-[#E8E1DA] text-xs font-medium transition-all shadow-xs"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Conversation Container */}
        <div className="bg-[#F8F2EC] border border-[#E8E1DA] rounded-3xl p-4 sm:p-6 mb-8 shadow-sm min-h-[420px] flex flex-col justify-between">
          <div className="space-y-6">
            {history.length === 0 ? (
              <div className="text-center py-16 text-[#111111]/50 space-y-3">
                <MessageSquare className="w-12 h-12 text-[#C8753D] mx-auto opacity-60" />
                <p className="text-sm font-medium">
                  Aucune question posée pour le moment.
                </p>
                <p className="text-xs text-[#111111]/40 max-w-md mx-auto">
                  Exemple : "Mes cheveux 4C sont très cassants, comment faire ?", "Quel est le meilleur moment pour mettre du gelée d'aloe ?", "Routine enfant 3 ans".
                </p>
              </div>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className="space-y-4 animate-in fade-in duration-300">
                  {/* User Question Bubble */}
                  <div className="flex justify-end">
                    <div className="bg-[#C8753D] text-white px-5 py-3 rounded-2xl rounded-tr-xs max-w-xl text-sm shadow-sm font-medium">
                      {item.user}
                    </div>
                  </div>

                  {/* AI Answer Bubble */}
                  <div className="flex justify-start">
                    <div className="bg-[#FFFDF9] border border-[#E8E1DA] rounded-2xl rounded-tl-xs p-5 max-w-3xl text-sm text-[#111111] shadow-xs w-full space-y-4">
                      {item.response.isMedicalRedirect ? (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold mb-1">Attention - Conseil Médical requis</p>
                            <p className="leading-relaxed">{item.response.medicalMessage}</p>
                          </div>
                        </div>
                      ) : item.response.answer && (
                        <>
                          {/* 1. Short Answer */}
                          <div className="pb-3 border-b border-[#E8E1DA]">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#C8753D] block mb-1">
                              1. Réponse courte
                            </span>
                            <p className="font-semibold text-base text-[#111111] leading-snug">
                              {item.response.answer.shortAnswer}
                            </p>
                          </div>

                          {/* 2. Simple Explanation */}
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#111111]/60 block mb-1">
                              2. Explication simple
                            </span>
                            <p className="text-xs text-[#111111]/80 leading-relaxed font-light">
                              {item.response.answer.simpleExplanation}
                            </p>
                          </div>

                          {/* 3. Immediate Actions */}
                          <div className="bg-[#F8F2EC] p-3.5 rounded-xl border border-[#E8E1DA]">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#C8753D] block mb-2">
                              3. Ce que tu peux faire maintenant
                            </span>
                            <ul className="space-y-1.5 text-xs text-[#111111]/85 font-medium">
                              {item.response.answer.immediateActions.map((act, aIdx) => (
                                <li key={aIdx} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8753D] shrink-0 mt-1.5" />
                                  <span>{act}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 4 & 5. Products & Tools */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {/* Products */}
                            <div className="p-3 rounded-xl border border-[#E8E1DA] bg-[#FFFDF9]">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-[#111111]/70 block mb-2 flex items-center gap-1">
                                <ShoppingBag className="w-3 h-3 text-[#C8753D]" /> Produits utiles — à vérifier dans KURla ID
                              </span>
                              <div className="space-y-2">
                                {item.response.answer.usefulProducts.map((p, pIdx) => (
                                  <a
                                    key={pIdx}
                                    href={p.link}
                                    className="flex items-center justify-between p-2 rounded-lg bg-[#F8F2EC] hover:bg-[#E8E1DA] transition-colors text-xs text-[#111111]"
                                  >
                                    <span className="font-semibold line-clamp-1">{p.name}</span>
                                    <span className="text-[10px] bg-[#C8753D] text-white px-2 py-0.5 rounded-full shrink-0">
                                      Voir KURla ID
                                    </span>
                                  </a>
                                ))}
                              </div>
                            </div>

                            {/* Tools */}
                            <div className="p-3 rounded-xl border border-[#E8E1DA] bg-[#FFFDF9]">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-[#111111]/70 block mb-2 flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-[#C8753D]" /> Outils Utiles
                              </span>
                              <div className="space-y-1.5">
                                {item.response.answer.usefulTools.map((t, tIdx) => (
                                  <div key={tIdx} className="text-xs">
                                    <span className="font-bold text-[#111111]">{t.name}</span>
                                    <p className="text-[11px] text-[#111111]/60 font-light">{t.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 6. Errors to avoid */}
                          <div className="text-xs text-rose-900 bg-rose-50/70 p-3 rounded-xl border border-rose-200">
                            <span className="font-bold block mb-1">❌ Erreurs à éviter absolument :</span>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                              {item.response.answer.errorsToAvoid.map((err, eIdx) => (
                                <li key={eIdx}>{err}</li>
                              ))}
                            </ul>
                          </div>

                          {/* 7. CTAs */}
                          <div className="pt-3 border-t border-[#E8E1DA] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                              {item.response.answer.ctas.map((cta, cIdx) => (
                                <a
                                  key={cIdx}
                                  href={cta.href}
                                  className="px-3 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                                >
                                  {cta.label} <ArrowRight className="w-3 h-3" />
                                </a>
                              ))}
                            </div>

                            <button
                              onClick={() => toggleSaveAnswer(idx)}
                              className={`p-2 rounded-full border text-xs font-medium transition-colors flex items-center gap-1 ${
                                savedAnswers.includes(`ans-${idx}`)
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                  : 'bg-[#F8F2EC] border-[#E8E1DA] text-[#111111]/70 hover:bg-[#E8E1DA]'
                              }`}
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                              {savedAnswers.includes(`ans-${idx}`) ? 'Sauvegardé' : 'Sauvegarder'}
                            </button>
                          </div>
                        </>
                      )}

                      {/* Disclaimer */}
                      <p className="text-[10px] text-[#111111]/40 pt-2 border-t border-[#E8E1DA]/60 italic font-light">
                        {item.response.disclaimer}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-[#C8753D] font-medium p-4 bg-[#FFFDF9] rounded-2xl border border-[#E8E1DA]">
                <RefreshCw className="w-4 h-4 animate-spin text-[#C8753D]" />
                L'Assistant KURLA synthétise la base de connaissance cosmétique...
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="mt-6 pt-4 border-t border-[#E8E1DA]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pose ta question beauté (ex: casse, pores, braids, enfant, SPF)..."
                className="flex-1 px-5 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-sm text-[#111111] placeholder-[#111111]/40 focus:outline-none focus:border-[#C8753D] shadow-xs"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shrink-0 shadow-md shadow-[#C8753D]/20"
              >
                <Send className="w-4 h-4" /> Envoyer
              </button>
            </form>
          </div>
        </div>

        {/* Security & Non-Medical Guardrails Banner */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#111111]/70 flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#111111] mb-0.5">Charte d'Éthique & Conseil Non Médical KURLA</p>
            <p className="font-light leading-relaxed">
              Toutes les réponses générées s'appuient sur notre base de connaissance certifiée pour la fibre texturée et les peaux mélaninées. L'assistant ne remplace en aucun cas un avis médical ou dermatologique.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
