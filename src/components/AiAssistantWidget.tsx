import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, ShieldAlert, Bot } from 'lucide-react';
import { AiDisclosureBadge } from './AiDisclosureBadge';
import { analytics } from '../lib/analytics';

export const AiAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: 'Bonjour ! Je suis l\'assistant conseil KURLA Beauty. Poser une question sur tes cheveux 4C, tes braids, ton cuir chevelu ou ta routine skincare !'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    'Ma fille a des cheveux 4C très secs, par quoi commencer ?',
    'J\'ai des braids depuis 3 semaines et mon cuir chevelu gratte',
    'Quel SPF 50 choisir pour éviter les traces blanches sur peau foncée ?'
  ];

  const handleSend = async (questionText?: string) => {
    try { analytics.aiAssistantMessage(); } catch { /* noop */ }
    const textToSend = questionText || input;
    if (!textToSend.trim() || loading) return;

    const newMessages = [...messages, { sender: 'user' as const, text: textToSend }];
    setMessages(newMessages);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/support-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: textToSend })
      });
      const data = await res.json();
      const replyText = data.answer || data.responseDraft || data.error || "Bonjour ! Merci pour ta question. Pour prendre soin de tes cheveux texturés ou de ta peau mélaninée, nous te recommandons de toujours commencer par de l'eau tiède ou un soin hydratant doux avant d'appliquer une huile ou un beurre scellant.";
      setMessages([...newMessages, { sender: 'assistant', text: replyText }]);
    } catch (e) {
      setMessages([...newMessages, {
        sender: 'assistant',
        text: 'Désolé, une petite erreur réseau est survenue. N\'hésite pas à réessayer.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-tr from-[#C8753D] to-[#D49A63] text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 group border border-[#FFF7EF]/20"
        aria-label="Discuter avec l'assistant KURLA"
      >
        <Sparkles className="w-5 h-5 text-white animate-pulse" />
        <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline">Assistant KURLA IA</span>
      </button>

      {/* Assistant Modal Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-h-[600px] h-[80vh] bg-[#1A0F0A] border border-[#FFF7EF]/20 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">

          {/* Header */}
          <div className="p-4 bg-[#050403] border-b border-[#FFF7EF]/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#C8753D]/20 text-[#C8753D] flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-serif-title font-bold text-[#FFF7EF]">Assistant Conseil KURLA</h3>
                <AiDisclosureBadge compact className="mt-1" />
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-[#FFF7EF]/60 hover:text-[#FFF7EF]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#C8753D] text-white font-medium rounded-br-none'
                      : 'bg-[#050403] text-[#FFF7EF]/90 border border-[#FFF7EF]/10 font-light rounded-bl-none space-y-2'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#D49A63] italic p-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#C8753D]" /> Rédaction du conseil KURLA en cours...
              </div>
            )}
          </div>

          {/* Suggested Prompts */}
          <div className="p-3 bg-[#050403]/80 border-t border-[#FFF7EF]/10 space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[#D49A63] font-semibold block px-1">Questions rapides :</span>
            <div className="flex flex-col gap-1">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-[#1A0F0A] hover:bg-[#3A2218] text-[#FFF7EF]/80 border border-[#FFF7EF]/10 truncate transition-colors"
                >
                  💡 {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#050403] border-t border-[#FFF7EF]/10">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pose ta question (ex: démangeaisons braids)..."
                className="flex-1 px-4 py-2.5 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/15 text-[#FFF7EF] placeholder-[#FFF7EF]/40 text-xs focus:outline-none focus:border-[#C8753D]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 flex flex-col items-center gap-1 text-[9px] text-[#FFF7EF]/40">
              <span className="font-semibold uppercase tracking-wider text-[#D49A63]">
                Vous échangez avec une intelligence artificielle, pas avec un humain.
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-[#D49A63]" />
                <span>Conseils beauté non médicaux. En cas de symptôme, consultez un professionnel de santé.</span>
              </span>
            </div>
          </div>

        </div>
      )}
    </>
  );
};
