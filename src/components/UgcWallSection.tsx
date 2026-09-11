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
    <section className="py-24 bg-kurla-sand text-kurla-carbon relative border-t border-kurla-stone">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold flex items-center justify-center gap-1.5 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-kurla-copper" /> La communauté KURLA
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-kurla-carbon mb-4">
          Une communauté qui se construit, avec vous.
        </h2>
        <p className="text-sm sm:text-base text-kurla-carbon/75 font-light leading-relaxed max-w-xl mx-auto">
          KURLA démarre : avis, questions et professionnels vérifiés apparaîtront ici au fur et à mesure, en chiffres réels. Chaque avis provient d&apos;un achat vérifié et chaque réponse d&apos;un membre identifié — jamais de témoignage inventé.
        </p>

        {!failed && (
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 px-2 sm:px-8 py-6 rounded-3xl bg-kurla-ivory border border-kurla-stone">
            {stats.map(stat => (
              <div key={stat.label} className="flex flex-col items-center gap-1.5 text-sm text-kurla-carbon/70">
                <stat.icon className="w-4 h-4 text-kurla-copper" />
                <span className="font-bold text-2xl text-kurla-carbon">{overview ? stat.value : '—'}</span>
                <span className="text-xs text-center leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/community"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-semibold shadow-md transition-all"
          >
            <Users className="w-4 h-4" /> Rejoindre la communauté
          </a>
          <a
            href="/professionnels/rejoindre"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-kurla-ivory hover:bg-kurla-sand border border-kurla-stone text-kurla-carbon text-xs font-semibold transition-all"
          >
            Être référencé comme pro
          </a>
        </div>
      </div>
    </section>
  );
};

export default UgcWallSection;
