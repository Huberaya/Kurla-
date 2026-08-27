import React from 'react';
import { MessageSquareQuote, Sparkles, Users } from 'lucide-react';

/**
 * MUR UGC — vidé de son contenu inventé.
 *
 * Cette section affichait quatre témoignages fabriqués (noms, villes, notes,
 * compteurs de likes). C'est exactement ce que KURLA reproche au marché : de la
 * preuve sociale inventée.
 *
 * Le parti pris : plutôt que de remplacer par d'autres faux avis, la section
 * dit la vérité sur son état. Un mur de témoignages vide est un actif de
 * crédibilité ; un mur de témoignages inventés est une faute.
 *
 * Quand les avis réels existeront (table `reviews` + consentement), ce composant
 * lira l'API au lieu de coder des constantes en dur.
 */
export const UgcWallSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#F8F2EC] text-[#111111] relative border-t border-[#E8E1DA]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold flex items-center justify-center gap-1.5 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> Retours de la communauté
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-[#111111] mb-4">
          Cette section est volontairement vide.
        </h2>
        <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed max-w-xl mx-auto">
          Nous n&apos;affichons aucun témoignage pour l&apos;instant. KURLA ne publiera ici que des
          retours réels, vérifiés et consentis — pas de prénoms inventés, pas de notes
          fabriquées, pas de compteurs de likes fictifs.
        </p>

        <div className="mt-10 inline-flex flex-col sm:flex-row items-center gap-6 px-8 py-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
          <div className="flex items-center gap-2.5 text-sm text-[#111111]/70">
            <Users className="w-4 h-4 text-[#C8753D]" />
            <span>Avis réels publiés</span>
            <span className="font-bold text-[#111111]">0</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-[#111111]/70">
            <MessageSquareQuote className="w-4 h-4 text-[#C8753D]" />
            <span>Témoignages inventés</span>
            <span className="font-bold text-[#111111]">0</span>
          </div>
        </div>

        <p className="mt-6 text-xs text-[#111111]/50 max-w-lg mx-auto">
          Les avis apparaîtront ici dès qu&apos;un acheteur aura laissé un retour vérifié sur un
          achat réel. En attendant, KURLA préfère le silence à la fiction.
        </p>
      </div>
    </section>
  );
};

export default UgcWallSection;
