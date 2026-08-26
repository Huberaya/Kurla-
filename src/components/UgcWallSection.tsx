import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { HERO_IMAGE, PROTECTIVE_IMAGE, MELANIN_SKIN_IMAGE, STYLIST_IMAGE } from '../data/mockData';

export const UgcWallSection: React.FC = () => {
  const posts = [
    {
      name: 'Nadia M.',
      city: 'Paris',
      tag: 'Texture 4C',
      comment: 'Enfin une routine qui ne ment pas sur la porosité forte. Le Leave-In Cacao a sauvé mon démêlage du dimanche.',
      image: HERO_IMAGE,
      likes: 42,
    },
    {
      name: 'Kenza T.',
      city: 'Bruxelles',
      tag: 'Protective Style',
      comment: 'Le spray menthe sous mes knotless braids est magique. Plus aucune démangeaison dès le 2e jour.',
      image: PROTECTIVE_IMAGE,
      likes: 38,
    },
    {
      name: 'Fatou K.',
      city: 'Lyon',
      tag: 'Skincare SPF 50',
      comment: 'Premier écran solaire qui ne me laisse pas un teint de fantôme gris sur ma peau foncée !',
      image: MELANIN_SKIN_IMAGE,
      likes: 56,
    },
    {
      name: 'Awa D.',
      city: 'Nantes',
      tag: 'KURLA Certified Pro',
      comment: 'En tant que coiffeuse afro, faire partie du réseau KURLA Pro me connecte avec des clientes qui cherchent du vrai soin.',
      image: STYLIST_IMAGE,
      likes: 61,
    },
  ];

  return (
    <section className="py-24 bg-[#F8F2EC] text-[#111111] relative border-t border-[#E8E1DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-[520px] mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold flex items-center justify-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> Retours de membres de la communauté bêta KURLA
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-[#111111] mb-3">
            La bêta KURLA en action.
          </h2>
          <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
            Fais partie des premières personnes à tester le diagnostic, les routines certifiées et à partager tes retours authentiques.
          </p>
        </div>

        {/* UGC Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((post, idx) => (
            <div
              key={idx}
              className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] p-5 flex flex-col justify-between hover:border-[#C8753D] transition-all shadow-xs hover:shadow-xl group"
            >
              <div>
                <div className="relative h-48 rounded-2xl overflow-hidden mb-4">
                  <img
                    src={post.image}
                    alt={post.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#FFFDF9]/90 backdrop-blur-md text-[10px] font-semibold text-[#111111] border border-[#E8E1DA]">
                    {post.tag}
                  </span>
                </div>

                <p className="text-xs text-[#111111]/85 italic font-light leading-relaxed mb-4">
                  "{post.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-[#E8E1DA] flex items-center justify-between text-xs text-[#111111]/70">
                <div>
                  <span className="font-bold text-[#111111]">{post.name}</span> ({post.city})
                </div>
                <div className="flex items-center gap-1 text-[#C8753D] font-semibold">
                  <Heart className="w-3.5 h-3.5 fill-current" /> {post.likes}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
