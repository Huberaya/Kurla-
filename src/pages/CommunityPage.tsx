import React, { useEffect, useState } from 'react';
import { Heart, MessageCircleQuestion, ArrowRight } from 'lucide-react';
import { UgcWallSection } from '../components/UgcWallSection';

/**
 * CHANTIER 11 (bloc C) — PAGE COMMUNAUTÉ, DÉSORMAIS BRANCHÉE.
 *
 * Deux mensonges ont été retirés, pas seulement reformulés :
 *   * « Rejoins des milliers de personnes » — aucun compteur ne le prouvait ;
 *   * la bannière « Événement Communautaire Actif / Challenge 30 Jours » —
 *     aucun code n'implémentait ce challenge. Annoncer un événement actif
 *     inexistant est une pratique commerciale trompeuse, pas une décoration.
 *
 * Ce qui reste est réel : les questions qui attendent une réponse, lues via
 * `GET /api/community/questions`. Pas de fil d'actualité, pas de likes, pas de
 * suivi de profils.
 */

interface OpenQuestion {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  question: string;
  askedAt: string;
}

export const CommunityPage: React.FC = () => {
  const [questions, setQuestions] = useState<OpenQuestion[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/community/questions?limit=12')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('indisponible'))))
      .then((data: { questions: OpenQuestion[] }) => { if (!cancelled) setQuestions(data.questions); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="pt-28 pb-24 bg-kurla-ivory text-kurla-carbon min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero — sans nombre inventé */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-kurla-copper/10 text-kurla-copper text-xs font-semibold mb-3">
            <Heart className="w-4 h-4" /> La Communauté KURLA Beauty
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-kurla-carbon mb-4">
            Entraide utile et traçable
          </h1>
          <p className="text-sm sm:text-base text-kurla-carbon/75 font-light leading-relaxed">
            Des questions posées par de vraies personnes, des réponses de membres et de
            professionnels vérifiés. Ni fil infini, ni likes, ni classement : seulement ce
            qui aide quelqu&apos;un à comprendre son produit.
          </p>
        </div>

        {/* Questions qui attendent une réponse */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-5">
            <MessageCircleQuestion className="w-5 h-5 text-kurla-copper" />
            <h2 className="text-xl sm:text-2xl font-serif-title font-bold">Questions en attente d&apos;aide</h2>
          </div>

          {failed && (
            <p className="text-sm text-kurla-carbon/60 px-6 py-8 rounded-3xl bg-kurla-sand border border-kurla-stone">
              Impossible de charger les questions. Réessaie dans un instant.
            </p>
          )}

          {!failed && questions === null && (
            <p className="text-sm text-kurla-carbon/50 px-6 py-8 rounded-3xl bg-kurla-sand border border-kurla-stone">
              Chargement…
            </p>
          )}

          {!failed && questions !== null && questions.length === 0 && (
            <div className="px-6 py-8 rounded-3xl bg-kurla-sand border border-kurla-stone">
              <p className="text-sm text-kurla-carbon/70">
                Aucune question n&apos;attend de réponse pour l&apos;instant. C&apos;est un bon signe — ou le
                signe qu&apos;il n&apos;y a pas encore assez de monde ici. Dans les deux cas, nous ne
                l&apos;inventerons pas.
              </p>
            </div>
          )}

          {!failed && questions !== null && questions.length > 0 && (
            <ul className="space-y-3">
              {questions.map(question => (
                <li key={question.id}>
                  <a
                    href={`/produit/${question.productSlug || question.productId}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-white border border-kurla-stone hover:border-kurla-copper transition-colors"
                  >
                    <span>
                      <span className="block text-xs uppercase tracking-widest text-kurla-copper/80 mb-1">
                        {question.productName || 'Produit KURLA'}
                      </span>
                      <span className="text-sm text-kurla-carbon/85">{question.question}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-kurla-copper shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mb-12">
          <UgcWallSection />
        </div>

      </div>
    </div>
  );
};
