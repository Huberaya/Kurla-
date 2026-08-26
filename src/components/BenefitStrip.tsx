import React from 'react';
import { Sparkles, Layers, PackageCheck, Award } from 'lucide-react';
import { motion } from 'motion/react';

export const BenefitStrip: React.FC = () => {
  const benefits = [
    {
      icon: Sparkles,
      title: 'Diagnostic gratuit',
      text: 'Cheveux ou peau, en quelques minutes.',
    },
    {
      icon: Layers,
      title: 'Routines personnalisées',
      text: 'Des recommandations claires, sans surpromesse.',
    },
    {
      icon: PackageCheck,
      title: 'Produits sélectionnés',
      text: 'Pensés pour textures et peaux mélaninées.',
    },
    {
      icon: Award,
      title: 'Pros certifiés',
      text: 'Des spécialistes qui comprennent ta texture.',
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
      </div>
    </section>
  );
};

