import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, BookOpen, Bot, Check, ExternalLink, Flag, Globe2, History, MessageSquare, RefreshCw, Send, ShieldCheck, ShoppingBag, Sparkles, UserCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAiHistory, getAiSessionHistory, queryBeautyAssistant, requestAiHumanReview, sendAiFeedback, deleteAiHistory } from '../lib/ai/assistant';
import { AssistantResponse } from '../lib/ai/contracts';

interface ConversationItem {
  user: string;
  response: AssistantResponse;
}

const quickCategories = [
  { label: 'Cheveux secs', query: 'Mes cheveux crépus restent secs malgré l’huile, pourquoi ?' },
  { label: 'Braids & tresses', query: 'Mes tresses font mal et me tirent la tête, que faire ?' },
  { label: 'Démêlage enfant', query: 'Comment démêler les cheveux de mon enfant sans douleur ?' },
  { label: 'SPF peau mélaninée', query: 'Quel SPF choisir pour peau noire sans traces blanches ?' },
  { label: 'Porosité 4C', query: 'Quelle routine pour cheveux 4C à forte porosité ?' },
  { label: 'Climat humide', query: 'Comment adapter ma routine à un climat chaud et humide ?' }
];

export const AiBeautyAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [objective, setObjective] = useState('');
  const [locale, setLocale] = useState('fr');
  const [country, setCountry] = useState('FR');
  const [memoryConsent, setMemoryConsent] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [history, setHistory] = useState<ConversationItem[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<number, string>>({});
  const [reviewState, setReviewState] = useState<Record<number, string>>({});
  const [savedSessions, setSavedSessions] = useState<Array<{ id: string; topic: string; locale: string; country: string; updatedAt: string; messageCount: number }>>([]);

  useEffect(() => {
    if (!user) {
      setSavedSessions([]);
      return;
    }
    getAiHistory().then(setSavedSessions);
  }, [user]);

  const loadSavedSession = async (id: string) => {
    const stored = await getAiSessionHistory(id);
    if (!stored) {
      setNotice('Impossible de charger cette session.');
      return;
    }
    const rebuilt: ConversationItem[] = [];
    let pendingQuestion: string | undefined;
    for (const message of stored.messages) {
      if (message.sender === 'user') pendingQuestion = message.message;
      if (message.sender === 'assistant' && pendingQuestion) {
        try {
          const parsed = JSON.parse(message.message);
          rebuilt.push({ user: pendingQuestion, response: { isMedicalRedirect: false, answer: parsed, disclaimer: 'Les réponses KURLA sont des informations et conseils cosmétiques.', sessionId: id, messageId: message.id, memorySaved: true } });
        } catch {
          rebuilt.push({ user: pendingQuestion, response: { isMedicalRedirect: message.metadata?.kind === 'medical_triage', medicalMessage: message.message, requiresHumanReview: message.metadata?.kind === 'medical_triage', disclaimer: 'Les réponses KURLA sont des informations et conseils cosmétiques.', sessionId: id, messageId: message.id, memorySaved: true } });
        }
        pendingQuestion = undefined;
      }
    }
    setHistory(rebuilt);
    setSessionId(id);
    setMemoryConsent(true);
    setNotice('Session mémorisée chargée. La case mémoire est activée pour poursuivre.');
  };

  const handleSend = async (userQueryText?: string) => {
    const textToSend = (userQueryText || query).trim();
    if (!textToSend || isThinking) return;
    if (memoryConsent && !user) {
      setNotice('Connectez-vous pour autoriser la mémorisation. Sans connexion, la conversation reste non enregistrée.');
      return;
    }
    setNotice(null);
    setIsThinking(true);
    setQuery('');
    try {
      const response = await queryBeautyAssistant(textToSend, {
        locale,
        country,
        objective: objective.trim() || undefined,
        memoryConsent,
        sessionId
      });
      if (response.sessionId) setSessionId(response.sessionId);
      setHistory(prev => [...prev, { user: textToSend, response }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleFeedback = async (index: number, rating: 'helpful' | 'incorrect' | 'unsafe') => {
    const response = history[index]?.response;
    if (!user) {
      setNotice('Connectez-vous pour signaler une réponse ou envoyer un feedback.');
      return;
    }
    const success = await sendAiFeedback({ rating, sessionId: response.sessionId, messageId: response.messageId });
    setFeedbackState(prev => ({ ...prev, [index]: success ? (rating === 'helpful' ? 'Merci, c’est noté.' : 'Merci, votre signalement a été enregistré.') : 'Impossible d’enregistrer pour le moment.' }));
  };

  const handleHumanReview = async (index: number) => {
    const item = history[index];
    if (!user || !item) {
      setNotice('Connectez-vous pour demander une revue humaine.');
      return;
    }
    const success = await requestAiHumanReview({
      reason: 'Réponse IA nécessitant une vérification humaine',
      sessionId: item.response.sessionId,
      messageId: item.response.messageId,
      payload: { question: item.user, answer: item.response.answer || item.response.medicalMessage || '' }
    });
    setReviewState(prev => ({ ...prev, [index]: success ? 'Demande envoyée à l’équipe KURLA.' : 'Impossible d’envoyer la demande pour le moment.' }));
  };

  const clearHistory = async () => {
    if (!user || !memoryConsent) {
      setHistory([]);
      setSessionId(undefined);
      return;
    }
    const success = await deleteAiHistory();
    if (success) {
      setHistory([]);
      setSessionId(undefined);
      setSavedSessions([]);
      setNotice('Votre historique IA mémorisé a été supprimé.');
    } else {
      setNotice('Impossible de supprimer l’historique pour le moment.');
    }
  };

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold border border-[#C8753D]/20 mb-4">
            <Sparkles className="w-4 h-4" /> KURLA AI · assistant explicable
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mb-4">Une routine structurée, pas une réponse générique.</h1>
          <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
            KURLA croise votre profil, votre objectif, votre contexte et le catalogue disponible. Chaque produit proposé doit être vérifiable ; aucune réponse ne remplace un avis médical.
          </p>
        </header>

        {/* Article 50(1) du règlement (UE) 2024/1689, applicable depuis le
            2 août 2026 : la nature artificielle de l'interlocuteur doit être
            perceptible dans l'interaction elle-même, pas seulement dans les
            CGU ni via un libellé ambigu. */}
        <div role="note" aria-live="polite" className="max-w-3xl mx-auto mb-8 flex items-start gap-3 p-4 rounded-2xl border border-[#C8753D]/30 bg-[#C8753D]/5">
          <Bot className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
          <p className="text-xs sm:text-[13px] leading-relaxed text-[#111111]/80">
            <strong className="font-semibold text-[#111111]">Vous échangez avec KURLA AI, un assistant d’intelligence artificielle.</strong>{' '}
            Ce n’est pas un humain, et ce n’est pas un professionnel de santé. Les réponses sont des conseils cosmétiques générés par une IA : elles ne constituent ni un diagnostic, ni une prescription.
          </p>
        </div>

        <section className="bg-[#F8F2EC] border border-[#E8E1DA] rounded-3xl p-4 sm:p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <label className="text-xs font-semibold text-[#111111]/70">
              Objectif actuel
              <input value={objective} onChange={e => setObjective(e.target.value)} placeholder="Ex. réduire la casse" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] font-normal text-sm focus:outline-none focus:border-[#C8753D]" />
            </label>
            <label className="text-xs font-semibold text-[#111111]/70">
              Langue
              <select value={locale} onChange={e => setLocale(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] font-normal text-sm focus:outline-none focus:border-[#C8753D]">
                <option value="fr">Français</option><option value="en">English</option><option value="es">Español</option><option value="pt">Português</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-[#111111]/70">
              Pays de livraison
              <select value={country} onChange={e => setCountry(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] font-normal text-sm focus:outline-none focus:border-[#C8753D]">
                <option value="FR">France</option><option value="BE">Belgique</option><option value="CH">Suisse</option><option value="CA">Canada</option><option value="SN">Sénégal</option><option value="CI">Côte d’Ivoire</option>
              </select>
            </label>
            <div className="text-xs text-[#111111]/70 flex flex-col justify-end">
              <a href="/account/kurla-id" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] font-semibold hover:border-[#C8753D] transition-colors">
                <UserCheck className="w-4 h-4 text-[#C8753D]" /> {user ? 'Voir mon KURLA ID' : 'Compléter KURLA ID'} <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E8E1DA]">
            <label className="flex items-start gap-2 text-xs text-[#111111]/75 cursor-pointer">
              <input type="checkbox" checked={memoryConsent} onChange={e => { setMemoryConsent(e.target.checked); if (!e.target.checked) setSessionId(undefined); }} className="mt-0.5 accent-[#C8753D]" />
              <span><strong className="text-[#111111]">J’autorise explicitement la mémoire.</strong> KURLA pourra conserver cette session pour suivre ma routine. Sans cette case, aucun échange n’est enregistré.</span>
            </label>
            <div className="flex items-center gap-2 text-[11px] text-[#111111]/55"><Globe2 className="w-3.5 h-3.5" /> {user ? 'Profil disponible après connexion' : 'Mode sans profil connecté'}</div>
          </div>
        </section>

        {notice && <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{notice}<button onClick={() => setNotice(null)} className="ml-auto"><X className="w-4 h-4" /></button></div>}

        <div className="mb-6">
          <span className="text-xs text-[#111111]/60 font-medium block mb-2 text-center">Commencer par un objectif :</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickCategories.map(category => <button key={category.label} onClick={() => handleSend(category.query)} className="px-3.5 py-1.5 rounded-full bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white border border-[#E8E1DA] text-xs font-medium transition-all">{category.label}</button>)}
          </div>
        </div>

        <div className="bg-[#F8F2EC] border border-[#E8E1DA] rounded-3xl p-4 sm:p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div><h2 className="font-serif-title font-bold text-lg">Votre espace de conseil</h2><p className="text-xs text-[#111111]/55 mt-1">Les recommandations sont recalculées à partir du contexte envoyé.</p></div>
            <div className="flex items-center gap-3">
              {history.length > 0 && <button onClick={clearHistory} className="text-xs text-[#111111]/60 hover:text-rose-700 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Effacer l’historique</button>}
            </div>
          </div>
          {savedSessions.length > 0 && <div className="mb-5 p-3 rounded-xl border border-[#E8E1DA] bg-[#FFFDF9] flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold text-[#111111]/70 mr-1">Sessions mémorisées :</span>{savedSessions.slice(0, 4).map(saved => <button key={saved.id} onClick={() => loadSavedSession(saved.id)} className="px-2.5 py-1.5 rounded-full bg-[#F8F2EC] hover:bg-[#E8E1DA] text-[10px] text-[#111111]/75">{saved.topic} · {saved.messageCount} message{saved.messageCount > 1 ? 's' : ''}</button>)}</div>}
          <div className="space-y-6">
            {history.length === 0 && !isThinking && <div className="text-center py-14 text-[#111111]/50 space-y-3"><MessageSquare className="w-12 h-12 text-[#C8753D] mx-auto opacity-60" /><p className="text-sm font-medium">Posez une question sur vos cheveux, votre peau ou votre routine.</p><p className="text-xs max-w-lg mx-auto">Ajoutez un objectif et complétez votre KURLA ID pour obtenir une réponse plus contextualisée.</p></div>}
            {history.map((item, index) => {
              const answer = item.response.answer;
              return <div key={`${index}-${item.user}`} className="space-y-3 animate-in fade-in duration-300">
                <div className="flex justify-end"><div className="bg-[#C8753D] text-white px-5 py-3 rounded-2xl rounded-tr-xs max-w-xl text-sm shadow-sm font-medium">{item.user}</div></div>
                <div className="flex justify-start"><div className="bg-[#FFFDF9] border border-[#E8E1DA] rounded-2xl rounded-tl-xs p-5 max-w-4xl text-sm shadow-xs w-full space-y-4">
                  {item.response.isMedicalRedirect ? <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-600 shrink-0" /><div><p className="font-semibold mb-1">Orientation professionnelle</p><p className="leading-relaxed">{item.response.medicalMessage}</p></div></div> : answer && <>
                    <div className="pb-3 border-b border-[#E8E1DA]"><span className="text-[10px] uppercase font-bold tracking-wider text-[#C8753D] block mb-1">Réponse courte</span><p className="font-semibold text-base leading-snug">{answer.shortAnswer}</p><div className="flex flex-wrap gap-2 mt-2 text-[10px] text-[#111111]/50">{item.response.profileAvailable && <span className="px-2 py-1 rounded-full bg-[#F8F2EC]">KURLA ID utilisé{item.response.profileConfidence ? ` · ${item.response.profileConfidence.overall}% de champs connus` : ''}</span>}<span className="px-2 py-1 rounded-full bg-[#F8F2EC]">{item.response.memorySaved ? 'Session mémorisée avec votre autorisation' : 'Session non mémorisée'}</span></div></div>
                    <div><span className="text-[10px] uppercase font-bold tracking-wider text-[#111111]/60 block mb-1">Explication simple</span><p className="text-xs text-[#111111]/80 leading-relaxed font-light">{answer.simpleExplanation}</p></div>
                    <div className="bg-[#F8F2EC] p-3.5 rounded-xl border border-[#E8E1DA]"><span className="text-[10px] uppercase font-bold tracking-wider text-[#C8753D] block mb-2">Plan de routine révisable</span><ol className="space-y-1.5 text-xs text-[#111111]/85">{(answer.routineSteps || answer.immediateActions).map((step, stepIndex) => <li key={stepIndex} className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-[#C8753D] text-white text-[10px] flex items-center justify-center shrink-0">{stepIndex + 1}</span><span>{step}</span></li>)}</ol></div>
                    {answer.usefulProducts.length > 0 && <div className="p-3 rounded-xl border border-[#E8E1DA] bg-[#FFFDF9]"><span className="text-[10px] uppercase font-bold tracking-wider text-[#111111]/70 block mb-2 flex items-center gap-1"><ShoppingBag className="w-3 h-3 text-[#C8753D]" /> Produits réellement disponibles</span><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{answer.usefulProducts.map(product => <div key={product.productSlug} className="p-3 rounded-lg bg-[#F8F2EC] border border-[#E8E1DA]"><a href={product.link} className="font-semibold text-xs hover:text-[#C8753D] flex items-center gap-1">{product.name} <ArrowRight className="w-3 h-3" /></a><p className="text-[11px] text-[#111111]/70 mt-1">{product.reason}</p>{product.evidence.length > 0 && <p className="text-[10px] text-[#111111]/50 mt-1">Données utilisées : {product.evidence.join(' · ')}</p>}</div>)}</div></div>}
                    {answer.usefulProducts.length === 0 && <p className="text-xs text-[#111111]/60 p-3 rounded-xl bg-[#F8F2EC]">Aucun produit n’est affiché : le catalogue disponible ne permet pas une recommandation suffisamment vérifiable pour cette demande.</p>}
                    {(answer.avoidCombinations.length > 0 || answer.errorsToAvoid.length > 0) && <div className="text-xs text-rose-900 bg-rose-50/70 p-3 rounded-xl border border-rose-200"><span className="font-bold block mb-1">Associations et gestes à éviter</span><ul className="list-disc list-inside space-y-0.5 text-[11px]">{[...answer.avoidCombinations, ...answer.errorsToAvoid].map((warning, warningIndex) => <li key={warningIndex}>{warning}</li>)}</ul></div>}
                    {answer.usefulTools.length > 0 && <div className="p-3 rounded-xl border border-[#E8E1DA] bg-[#FFFDF9] text-xs"><span className="font-bold flex items-center gap-1 mb-2"><BookOpen className="w-3 h-3 text-[#C8753D]" /> Outils utiles</span>{answer.usefulTools.map(tool => <div key={tool.name} className="mb-1"><strong>{tool.name}</strong><p className="text-[11px] text-[#111111]/60">{tool.description}</p></div>)}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"><div><span className="font-bold block mb-1">Quand consulter</span><p className="text-[#111111]/70 leading-relaxed">{answer.whenToConsultPro}</p></div><div><span className="font-bold block mb-1">Incertitude</span><p className="text-[#111111]/70 leading-relaxed">{answer.uncertainty}</p></div></div>
                    {answer.ctas.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{answer.ctas.map(cta => <a key={cta.href} href={cta.href} className="px-3 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-[10px] font-semibold flex items-center gap-1">{cta.label} <ArrowRight className="w-3 h-3" /></a>)}</div>}
                    {answer.sources.length > 0 && <div className="pt-3 border-t border-[#E8E1DA]"><span className="text-[10px] uppercase font-bold tracking-wider text-[#111111]/60 flex items-center gap-1 mb-2"><BookOpen className="w-3 h-3" /> Informations utilisées</span><div className="flex flex-wrap gap-2">{answer.sources.map(source => <span key={source.id} className="text-[10px] px-2 py-1 rounded-full border border-[#E8E1DA] bg-[#F8F2EC]" title={source.status === 'internal_review_pending' ? 'Fiche interne en attente de revue professionnelle' : 'Fiche validée'}>{source.label} · {source.status === 'validated' ? 'validée' : 'revue en attente'}</span>)}</div></div>}
                  </>}
                  <div className="pt-3 border-t border-[#E8E1DA]/60 flex flex-wrap items-center gap-2"><span className="text-[10px] text-[#111111]/45 mr-1">Cette réponse vous aide ?</span><button onClick={() => handleFeedback(index, 'helpful')} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] flex items-center gap-1"><Check className="w-3 h-3" /> Oui</button><button onClick={() => handleFeedback(index, 'incorrect')} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px]">À corriger</button><button onClick={() => handleFeedback(index, 'unsafe')} className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-[10px] flex items-center gap-1"><Flag className="w-3 h-3" /> Risquée</button>{item.response.requiresHumanReview && <button onClick={() => handleHumanReview(index)} className="px-2.5 py-1 rounded-full bg-[#C8753D]/10 text-[#8b4b24] text-[10px] flex items-center gap-1"><UserCheck className="w-3 h-3" /> Demander une revue</button>}<span className="text-[10px] text-[#111111]/50">{feedbackState[index] || reviewState[index]}</span></div>
                  <p className="text-[10px] text-[#111111]/40 italic">Réponse générée par une intelligence artificielle. {item.response.disclaimer}</p>
                </div></div>
              </div>;
            })}
            {isThinking && <div className="flex items-center gap-2 text-xs text-[#C8753D] font-medium p-4 bg-[#FFFDF9] rounded-2xl border border-[#E8E1DA]"><RefreshCw className="w-4 h-4 animate-spin" /> KURLA vérifie le profil, les sources et le catalogue disponible…</div>}
          </div>
          <form onSubmit={event => { event.preventDefault(); handleSend(); }} className="mt-6 pt-4 border-t border-[#E8E1DA] flex gap-2"><input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex. comment réduire la casse sous des tresses ?" className="flex-1 px-5 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-sm placeholder-[#111111]/40 focus:outline-none focus:border-[#C8753D]" /><button type="submit" disabled={!query.trim() || isThinking} className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 shrink-0"><Send className="w-4 h-4" /> Envoyer</button></form>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#111111]/70 flex items-start gap-3 shadow-xs"><ShieldCheck className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" /><div><p className="font-bold text-[#111111] mb-1">Transparence et sécurité</p><p className="font-light leading-relaxed">Les fiches affichées indiquent leur statut de revue. KURLA n’invente pas de produit lorsqu’il ne peut pas vérifier sa disponibilité. Une douleur intense, une lésion, une réaction allergique, une infection suspectée ou une chute soudaine nécessitent un professionnel de santé.</p></div></div>
      </div>
    </div>
  );
};
