import React, { useState } from 'react';
import { Bot, Sparkles, Send, ArrowRight, MessageSquare, ShieldCheck, CheckCircle2, User, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reveal } from '../motion/Reveal';
import { navigate } from '../../lib/router';

interface SampleQ {
  label: string;
  response: string;
  products: string[];
}

const SAMPLE_QUESTIONS: SampleQ[] = [
  {
    label: "Quelle routine pour mes cheveux crépus secs ?",
    response: "Pour des cheveux crépus 4C sujets à la sécheresse, nous recommandons la méthode LCO (Liquid, Cream, Oil) : 1. Eau florale ou Leave-in au Cacao, 2. Crème coiffante hydratante à la Mangue, 3. Sérum d'Huile de Carapate pour sceller l'hydratation sans étouffer le cuir chevelu.",
    products: ["Lait Capillaire Cacao & Mangue", "Sérum Carapate & Romarin"]
  },
  {
    label: "Comment prendre soin de mes taches d'hyperpigmentation ?",
    response: "La mélanine réagit fortement à l'inflammation (acné, frottements). Appliquez matin et soir un sérum à la Niacinamide (5%) associé à l'Acide Kojique, et protégez impérativement votre peau chaque matin avec un SPF30+ invisible sans voile blanc.",
    products: ["Sérum Éclat Niacinamide Smart Melanin™", "Écran Solaire SPF50 Invisible BGS"]
  },
  {
    label: "Quels produits utiliser après des tresses de protection ?",
    response: "Après avoir retiré vos braids, effectuez un soin clarifiant doux au Cuir Chevelu, suivi d'un bain d'huile chaude à la Sapote et d'un masque protéiné réparateur pour fortifier les racines fragilisées.",
    products: ["Shampooing Clarifiant Doux", "Bain d'Huile Réparateur Sapote"]
  },
  {
    label: "Quelle routine pour la barbe et les poils incarnés ?",
    response: "Nettoyez votre barbe chaque jour avec un gel nettoyant doux à l'Acide Salicylique. Appliquez une huile à la Nigelle pour adoucir le poil et exfoliez délicatement la mâchoire 2 fois par semaine pour prévenir le bouton de rasage.",
    products: ["Baume Apaisant Rasage & Barbe", "Huile de Nigelle & Argan Grooming"]
  },
  {
    label: "Quels produits sont adaptés à mon enfant de 4 ans ?",
    response: "Pour les enfants dès 3 ans, privilégiez un shampooing sans sulfates ni huiles essentielles au Karité brut, suivi d'un spray démêlant instantané à la guimauve. Le coiffage se fait sur cheveux humides avec un peigne à dents larges.",
    products: ["Shampooing Doux Kids Guimauve", "Spray Démêlant Sans Rincage Kids"]
  }
];

export const AIShowcase: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customInput, setCustomInput] = useState("");
  const currentQ = SAMPLE_QUESTIONS[selectedIndex];

  const handleAsk = (questionText: string) => {
    navigate(`/assistant-beaute?prompt=${encodeURIComponent(questionText)}`);
  };

  return (
    <section className="py-24 bg-[#050403] text-white relative overflow-hidden">
      {/* Glow Effects */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.12, 0.22, 0.12],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(200,117,61,0.25)_0%,transparent_70%)] pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A0F0A] border border-[#C8753D]/40 text-[#D49A63] text-xs font-semibold tracking-wider uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#D49A63] animate-pulse" />
              Assistant Beauté IA Intelligente
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-white leading-tight mb-4">
              Votre conseiller beauté personnel, disponible 24/7.
            </h2>
            <p className="text-base text-[#FFF7EF]/80 font-light leading-relaxed max-w-[580px] mx-auto">
              Posez vos questions sur vos cheveux, votre peau ou votre routine. Notre intelligence artificielle analyse vos besoins spécifiques et vous oriente vers les gestes et soins adaptés.
            </p>
          </Reveal>
        </div>

        {/* Interactive Chat Window & Preset Questions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Sample Questions Selector */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-[#D49A63] block mb-3">
              Exemples de questions fréquentes :
            </span>

            {SAMPLE_QUESTIONS.map((q, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.01, x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full p-4 rounded-2xl text-left transition-all border flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#1A0F0A] border-[#C8753D] shadow-lg shadow-[#C8753D]/20 text-white ring-1 ring-[#C8753D]/50'
                      : 'bg-[#111111]/80 border-white/10 hover:border-white/20 text-[#FFF7EF]/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      isSelected ? 'bg-[#C8753D] text-white' : 'bg-white/10 text-[#D49A63]'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="text-xs sm:text-sm font-medium leading-snug">
                      {q.label}
                    </span>
                  </div>
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#D49A63]' : 'text-white/40'}`} />
                </motion.button>
              );
            })}

            <div className="pt-2">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="/assistant-beaute"
                className="w-full py-3.5 rounded-2xl bg-[#1A0F0A] border border-[#C8753D]/40 text-[#D49A63] hover:bg-[#C8753D] hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Bot className="w-4 h-4" /> Ouvrir l'Assistant IA complet
              </motion.a>
            </div>
          </div>

          {/* Right Column: Live Chat Interface Preview */}
          <div className="lg:col-span-7 rounded-3xl bg-[#111111] border border-white/15 overflow-hidden shadow-2xl flex flex-col h-[520px]">
            
            {/* Chat Top Bar */}
            <div className="p-4 bg-[#1A0F0A] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-[#3A2218] via-[#C8753D] to-[#D49A63] flex items-center justify-center text-white font-bold text-sm shadow-md">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1A0F0A] animate-ping" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1A0F0A]" />
                </div>
                <div>
                  <h4 className="text-sm font-serif-title font-bold text-white flex items-center gap-2">
                    KURLA Beauty AI <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8753D]/30 text-[#D49A63] border border-[#C8753D]/40">En ligne</span>
                  </h4>
                  <p className="text-[11px] text-white/60 font-light">Conseils capillaires & cutanés certifiés</p>
                </div>
              </div>
              <button
                onClick={() => handleAsk(currentQ.label)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tester en direct
              </button>
            </div>

            {/* Chat Messages Body with AnimatePresence */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-[#111111] to-[#0A0705]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* User Bubble */}
                  <div className="flex justify-end">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="max-w-[80%] p-4 rounded-2xl rounded-tr-none bg-[#C8753D] text-white text-xs sm:text-sm font-medium shadow-md"
                    >
                      <div className="flex items-center gap-2 mb-1 text-[10px] text-white/80 font-semibold">
                        <User className="w-3 h-3" /> Vous
                      </div>
                      {currentQ.label}
                    </motion.div>
                  </div>

                  {/* AI Bubble */}
                  <div className="flex justify-start">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, delay: 0.1 }}
                      className="max-w-[85%] p-4 rounded-2xl rounded-tl-none bg-[#1A0F0A] border border-white/10 text-white text-xs sm:text-sm leading-relaxed space-y-3 shadow-md"
                    >
                      <div className="flex items-center gap-2 text-[10px] text-[#D49A63] font-semibold">
                        <Bot className="w-3.5 h-3.5" /> Reponse IA KURLA
                      </div>
                      <p className="text-[#FFF7EF]/90 font-light">
                        {currentQ.response}
                      </p>

                      {/* Recommended Products Chips inside Chat */}
                      <div className="pt-2 border-t border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#D49A63] block mb-1.5">
                          Soins recommandés pour cette réponse :
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {currentQ.products.map((p, i) => (
                            <a
                              key={i}
                              href="/boutique"
                              className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#C8753D]/30 text-[11px] text-white hover:border-[#C8753D] transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-[#D49A63]" /> {p}
                            </a>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 bg-[#1A0F0A] border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInput.trim()) {
                    handleAsk(customInput);
                  }
                }}
                placeholder="Posez votre question (ex: Quelle crème hydratante pour ma fille ?)..."
                className="flex-1 px-4 py-2.5 rounded-full bg-[#050403] border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#C8753D]"
              />
              <button
                onClick={() => {
                  if (customInput.trim()) handleAsk(customInput);
                  else handleAsk(currentQ.label);
                }}
                className="px-4 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shrink-0 transition-transform active:scale-95"
              >
                <span>Envoyer</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Disclaimer Note */}
        <div className="mt-8 text-center max-w-xl mx-auto">
          <p className="text-[11px] text-[#FFF7EF]/60 font-light flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D49A63] shrink-0" />
            L'assistant KURLA IA offre des conseils de soin bienveillants et personnalisés. Il ne constitue pas un diagnostic médical ou dermatologique.
          </p>
        </div>

      </div>
    </section>
  );
};

