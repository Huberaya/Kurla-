import React from 'react';
import { Boxes, ScanSearch, MessageCircleHeart, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const BenefitStrip: React.FC = () => {
  const benefits = [
    {
      icon: Boxes,
      title: 'Tout au même endroit',
      text: '60+ soins, outils & innovations — du peigne afro au steamer, introuvables ailleurs.',
    },
    {
      icon: ScanSearch,
      title: 'Diagnostic IA gratuit',
      text: 'Votre routine sur-mesure en 3 min, sans abonnement ni carte bancaire.',
    },
    {
      icon: MessageCircleHeart,
      title: 'Des réponses d’expert',
      text: 'Un assistant qui explique vraiment : mécanisme, routine, erreurs à éviter.',
    },
    {
      icon: ShieldCheck,
      title: 'Achat sans risque',
      text: 'Précommande annulable & remboursée à tout moment avant l’envoi.',
    },
  ];

  return (
    <section className="bg-[#F8F2EC] border-y border-[#E8E1DA] py-10 relative z-20 text-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.12,
              },
            },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
                }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] shadow-xs hover:shadow-xl transition-all duration-300 group"
              >
                <motion.div
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  className="w-11 h-11 rounded-xl bg-[#C8753D]/10 text-[#C8753D] border border-[#C8753D]/20 flex items-center justify-center shrink-0 group-hover:bg-[#C8753D] group-hover:text-white transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <div>
                  <h3 className="text-base font-serif-title font-bold text-[#111111] mb-1 group-hover:text-[#C8753D] transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-xs text-[#111111]/75 leading-relaxed font-light">
                    {b.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Ruban catalogue : l'effet « ils ont tout » */}
        <div className="mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="animate-marquee gap-3">
            {[...ITEMS, ...ITEMS].map((it, i) => (
              <span
                key={i}
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] px-4 py-1.5 text-xs font-medium text-[#111111]/80"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8753D]" />
                {it}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ITEMS = [
  'Peigne afro', 'Steamer vapeur', 'Diffuseur', 'Bonnets satin', 'Karité brut',
  'Flexi rods', 'Curl sponge', 'Outils locs', 'Eau de romarin', 'Gel de lin',
  'Serviette microfibre', 'Sérum pousse', 'Bond builder', 'Thermo-protecteur',
  'Huile de ricin', 'African threading', 'Masseur cuir chevelu', 'Co-wash',
];
