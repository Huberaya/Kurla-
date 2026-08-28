import React, { useEffect, useState } from 'react';
import { MessageSquareQuote, Sparkles, Users, HelpCircle } from 'lucide-react';

/**
 * MUR UGC — chiffres réels, lus dans la base.
 *
 * Cette section affichait autrefois quatre témoignages fabriqués. La première
 * correction a consisté à la vider. La correction complète consiste à afficher
 * l'état réel, lu via `GET /api/community` : si KURLA compte zéro avis, la page
 * dit zéro, et ce zéro est calculé, pas écrit en dur.
 *
 * Aucun témoignage n'est inventé, aucun compteur de likes n'existe.
 */

interface CommunityOverview {
  reviewsApproved: number;
  questionsAsked: number;
  questionsWithAnswer: number;
  openQuestions: number;
  memberAnswers: number;
  verifiedProfessionals: number;
}

export const UgcWallSection: React.FC = () => {
  const [overview, setOverview] = useState<CommunityOverview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/community')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('indisponible'))))
      .then((data: CommunityOverview) => { if (!cancelled) setOverview(data); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { icon: Users, label: 'Avis publiés', value: overview?.reviewsApproved },
    { icon: HelpCircle, label: 'Questions posées', value: overview?.questionsAsked },
    { icon: MessageSquareQuote, label: 'Réponses apportées', value: overview?.memberAnswers },
    { icon: Sparkles, label: 'Professionnels vérifiés', value: overview?.verifiedProfessionals }
  ];

  return (
    <section className="py-24 bg-[#F8F2EC] text-[#111111] relative border-t border-[#E8E1DA]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold flex items-center justify-center gap-1.5 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> État réel de la communauté
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-[#111111] mb-4">
          Aucun témoignage inventé.
        </h2>
        <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed max-w-xl mx-auto">
          Les chiffres ci-dessous sont lus dans la base au chargement de cette page.
          Quand une valeur est nulle, c&apos;est qu&apos;elle l&apos;est vraiment : KURLA ne remplace
          pas le silence par de la preuve sociale fabriquée.
        </p>

        {failed ? (
          <p className="mt-10 text-sm text-[#111111]/60">
            Les compteurs n&apos;ont pas pu être chargés. Plutôt que d&apos;afficher des nombres
            approximatifs, cette section reste vide.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 px-2 sm:px-8 py-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
            {stats.map(stat => (
              <div key={stat.label} className="flex flex-col items-center gap-1.5 text-sm text-[#111111]/70">
                <stat.icon className="w-4 h-4 text-[#C8753D]" />
                <span className="font-bold text-2xl text-[#111111]">{overview ? stat.value : '—'}</span>
                <span className="text-xs text-center leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-[#111111]/50 max-w-lg mx-auto">
          Un avis publié ici provient d&apos;un achat réel. Une réponse provient d&apos;un membre
          identifié ; le badge « professionnel vérifié » n&apos;est accordé qu&apos;après validation du
          dossier, jamais sur déclaration.
        </p>
      </div>
    </section>
  );
};

export default UgcWallSection;
