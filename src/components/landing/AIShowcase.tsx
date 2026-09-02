import React, { useState } from 'react';
import { Bot, Sparkles, Send, ArrowRight, MessageSquare, ShieldCheck, CheckCircle2, User, RefreshCw, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reveal } from '../motion/Reveal';
import { navigate } from '../../lib/router';

interface SampleQ {
  label: string;
  response: string;
  products: string[];
  diag?: { label: string; href: string };
}

// Les réponses citent UNIQUEMENT des produits réellement au catalogue.
// Quand aucun produit ne correspond (ex. peau), on oriente vers le diagnostic
// plutôt que d'inventer une référence — c'est la règle d'honnêteté KURLA.
const SAMPLE_QUESTIONS: SampleQ[] = [
  {
    label: 'Quelle routine pour mes cheveux crépus très secs ?',
    response:
      'Sur du 4C sec, l’hydratation vient de l’EAU, pas du beurre. Appliquez la méthode LCO sur cheveux humides : 1) un leave-in hydratant (l’eau en premier), 2) une crème riche, 3) scellez avec du beurre de karité brut. Une fois par semaine, posez un masque nutritif sous la chaleur (bonnet chauffant ou steamer) : la chaleur ouvre les écailles et fait vraiment pénétrer le soin. Erreur fréquente : beurrer des cheveux secs — ça scelle la sécheresse.',
    products: ['Leave-in riche pour crépus', 'Beurre de karité brut 100%'],
  },
  {
    label: 'Comment atténuer mes taches d’hyperpigmentation ?',
    response:
      'La mélanine réagit à toute inflammation (acné, frottements) : le réflexe n°1 est la protection solaire chaque matin, sans quoi les taches reviennent. Associez un soin unifiant doux et de la patience (plusieurs semaines). Les soins visage arrivent bientôt dans la boutique ; en attendant, faites le diagnostic peau pour recevoir la routine adaptée à votre carnation. Si une tache change de forme, de couleur ou démange, consultez un dermatologue.',
    products: [],
    diag: { label: 'Faire le diagnostic peau', href: '/diagnostic/peau' },
  },
  {
    label: 'Que faire juste après avoir retiré mes tresses ?',
    response:
      'Après des semaines de coiffure protectrice, le cuir chevelu est chargé de résidus. Ne tirez pas sur les repousses : clarifiez en douceur avec un shampoing purifiant (ou le gommage cuir chevelu une fois), puis faites un masque protéiné reconstructeur pour redonner de la force à la fibre fragilisée par les tensions. Terminez par un leave-in hydratant. Évitez de remettre des tresses immédiatement : laissez souffler quelques jours.',
    products: ['Shampoing purifiant clarifiant', 'Masque protéiné reconstructeur'],
  },
  {
    label: 'Comment coiffer mes cheveux courts ou faire des twists (homme) ?',
    response:
      'Sur cheveux courts, l’éponge twist (curl sponge) est l’outil le plus rapide : sur cheveux humides et hydratés, appliquez une noisette de mousse twist & lock, puis tournez l’éponge en mouvements circulaires pour former des coils uniformes en quelques minutes. Le soir, un durag satin maintient la définition et évite les frisottis. Erreur à éviter : tourner dans les deux sens — gardez toujours le même mouvement.',
    products: ['Éponge twist / curl sponge', 'Mousse coiffante twist & lock'],
  },
  {
    label: 'Mes masques n’agissent pas sur mes cheveux très crépus…',
    response:
      'Quand les soins « ne prennent pas », c’est souvent que les écailles restent fermées (cheveu à faible porosité) : la vapeur est la solution. Un steamer portable délivre une vapeur tiède qui ouvre la cuticule et fait pénétrer le masque en 15–20 min ; alternative plus douce, le bonnet chauffant micro-ondable. Vous rinçez ensuite à l’eau tiède puis fraîche pour refermer. C’est le geste qui change vraiment la donne sur 4C — et il réutilise tous vos masques.',
    products: ['Steamer portable vapeur', 'Masque profond nutrition karité'],
  },
];

export const AIShowcase: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const currentQ = SAMPLE_QUESTIONS[selectedIndex];

  const handleAsk = (questionText: string) => {
    navigate(`/assistant-beaute?prompt=${encodeURIComponent(questionText)}`);
  };

  return (
    <section className="py-24 bg-[#050403] text-white relative overflow-hidden">
      {/* Glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(200,117,61,0.25)_0%,transparent_70%)] pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* En-tête */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A0F0A] border border-[#C8753D]/40 text-[#D49A63] text-xs font-semibold tracking-wider uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#D49A63] animate-pulse" />
              Assistant beauté IA
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-white leading-tight mb-4">
              Des réponses <em className="not-italic bg-gradient-to-r from-[#FFF7EF] via-[#D49A63] to-[#C8753D] bg-clip-text text-transparent">vraies</em>, pas des slogans.
            </h2>
            <p className="text-base text-[#FFF7EF]/80 font-light leading-relaxed max-w-[600px] mx-auto">
              Posez votre question : l’assistant explique le mécanisme, déroule une routine chiffrée, signale les erreurs à éviter — et ne recommande jamais un produit qu’on ne vend pas. Gratuit, sans abonnement.
            </p>
          </Reveal>
        </div>

        {/* Chat + questions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Colonne questions */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-[#D49A63] block mb-3">
              Essayez une question :
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
                    <span className="text-xs sm:text-sm font-medium leading-snug">{q.label}</span>
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
                <Bot className="w-4 h-4" /> Ouvrir l’assistant IA complet
              </motion.a>
            </div>
          </div>

          {/* Fenêtre de chat */}
          <div className="lg:col-span-7 rounded-3xl bg-[#111111] border border-white/15 overflow-hidden shadow-2xl flex flex-col h-[560px]">

            {/* Barre haute */}
            <div className="p-4 bg-[#1A0F0A] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-[#3A2218] via-[#C8753D] to-[#D49A63] flex items-center justify-center text-white font-bold text-sm shadow-md">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1A0F0A] animate-ping" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1A0F0A]" />
                </div>
                <div>
                  <h4 className="text-sm font-serif-title font-bold text-white flex items-center gap-2">
                    Assistant KURLA <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8753D]/30 text-[#D49A63] border border-[#C8753D]/40">En ligne</span>
                  </h4>
                  <p className="text-[11px] text-white/60 font-light">Réponses détaillées, bienveillantes &amp; honnêtes</p>
                </div>
              </div>
              <button
                onClick={() => handleAsk(currentQ.label)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tester en direct
              </button>
            </div>

            {/* Messages */}
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
                  {/* Bulle utilisateur */}
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

                  {/* Bulle IA */}
                  <div className="flex justify-start">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, delay: 0.1 }}
                      className="max-w-[90%] p-4 rounded-2xl rounded-tl-none bg-[#1A0F0A] border border-white/10 text-white text-xs sm:text-sm leading-relaxed space-y-3 shadow-md"
                    >
                      <div className="flex items-center gap-2 text-[10px] text-[#D49A63] font-semibold">
                        <Bot className="w-3.5 h-3.5" /> Réponse de l’assistant
                      </div>
                      <p className="text-[#FFF7EF]/90 font-light">{currentQ.response}</p>

                      {/* Produits réels recommandés */}
                      {currentQ.products.length > 0 && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D49A63] block mb-1.5">
                            Disponible en précommande :
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {currentQ.products.map((p) => (
                              <a
                                key={p}
                                href="/boutique"
                                className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#C8753D]/30 text-[11px] text-white hover:border-[#C8753D] transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3 text-[#D49A63]" /> {p}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Renvoi diagnostic quand aucun produit ne correspond */}
                      {currentQ.diag && (
                        <div className="pt-2 border-t border-white/10">
                          <a
                            href={currentQ.diag.href}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C8753D]/15 border border-[#C8753D]/40 text-[11px] font-semibold text-[#D49A63] hover:bg-[#C8753D] hover:text-white transition-colors"
                          >
                            <Stethoscope className="w-3.5 h-3.5" /> {currentQ.diag.label}
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Saisie */}
            <div className="p-4 bg-[#1A0F0A] border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInput.trim()) handleAsk(customInput);
                }}
                placeholder="Posez votre question (ex : mes cheveux 4C sont très secs…)"
                className="flex-1 px-4 py-2.5 rounded-full bg-[#050403] border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#C8753D]"
              />
              <button
                onClick={() => handleAsk(customInput.trim() || currentQ.label)}
                className="px-4 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shrink-0 transition-transform active:scale-95"
              >
                <span>Envoyer</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Avertissement */}
        <div className="mt-8 text-center max-w-xl mx-auto">
          <p className="text-[11px] text-[#FFF7EF]/60 font-light flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D49A63] shrink-0" />
            L’assistant donne des conseils de soin bienveillants et personnalisés ; il ne remplace pas un avis médical ou dermatologique.
          </p>
        </div>

      </div>
    </section>
  );
};
