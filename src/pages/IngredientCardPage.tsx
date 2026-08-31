import React, { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, ExternalLink, Loader2, ShieldAlert, ShoppingBag } from 'lucide-react';
import { fetchIngredientCard } from '../services/intelligenceService';

const cardClass = 'bg-white border border-[#E8E1DA] rounded-2xl p-5';

const EVIDENCE_LABELS: Record<string, string> = {
  A: 'Niveau A — preuve solide',
  B: 'Niveau B — preuve correcte',
  C: 'Niveau C — preuve limitée',
  D: 'Niveau D — preuve faible',
  not_established: 'Non établi'
};

const SOURCE_LABELS: Record<string, string> = {
  regulatory: 'Source réglementaire',
  peer_reviewed: 'Publication scientifique évaluée par les pairs',
  consensus: 'Consensus d’experts',
  expert: 'Avis d’expert',
  commercial: 'Source commerciale',
  not_provided: 'Source non fournie'
};

/**
 * FICHE INGRÉDIENT PUBLIQUE — « transparence par ingrédient × archétype ».
 *
 * Publique et sans authentification, contrairement à la vue personnelle :
 * quelqu'un qui cherche « glycérine cheveux crépus » doit pouvoir atterrir ici
 * depuis un moteur de recherche sans créer de compte. C'est aussi la page qui
 * rend le graphe lisible — jusqu'ici il n'était lu par aucune interface.
 *
 * Ce que la page refuse de faire : transformer un niveau de preuve en promesse
 * d'effet, et laisser croire qu'une absence de restriction vaut conformité.
 */
export const IngredientCardPage: React.FC<{ ingredientId: string }> = ({ ingredientId }) => {
  const [card, setCard] = useState<Awaited<ReturnType<typeof fetchIngredientCard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchIngredientCard(ingredientId)
      .then(response => {
        if (!active) return;
        if (response.error) {
          setError(response.error);
          setCard(null);
        } else {
          setCard(response);
        }
      })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Fiche indisponible.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ingredientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] px-4 py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#C8753D]" />
      </div>
    );
  }

  if (error || !card || !card.ingredient) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className={`${cardClass} flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#111111] mb-1">Fiche indisponible</p>
              <p className="text-sm text-[#666666]">
                {error || 'Cet ingrédient n’est pas encore documenté dans le graphe KURLA.'}
              </p>
              <p className="text-xs text-[#999999] mt-3">
                KURLA ne fabrique pas de fiche approximative : mieux vaut une absence assumée qu'une
                information inventée sur un ingrédient appliqué sur la peau.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ingredient = card.ingredient as any;
  const best = card.bestEvidence;

  return (
    <div className="min-h-screen bg-[#FFFDF9] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-5">

        <header className={cardClass}>
          <p className="text-[11px] font-semibold text-[#C8753D] uppercase tracking-widest mb-1">
            Fiche ingrédient
          </p>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">
            {ingredient.display_name_fr || ingredient.inci_name}
          </h1>
          {ingredient.common_names_fr?.length > 0 && (
            <p className="text-sm text-[#666666] mt-1">
              Aussi appelé : {ingredient.common_names_fr.join(', ')}
            </p>
          )}
          {ingredient.functions?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {ingredient.functions.map((fn: string) => (
                <span key={fn} className="px-3 py-1 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#666666]">
                  {fn}
                </span>
              ))}
            </div>
          )}
          {ingredient.safety_notes_fr && (
            <p className="text-sm text-[#666666] mt-4 leading-relaxed">{ingredient.safety_notes_fr}</p>
          )}
        </header>

        {/* Preuve la plus solide, avec sa transposabilité explicite */}
        <section className={cardClass}>
          <h2 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Ce que disent les données
          </h2>

          {card.evidence.length === 0 ? (
            <p className="text-sm text-[#666666]">
              Aucune preuve n’est encore documentée pour cet ingrédient dans le graphe KURLA.
              Cela ne signifie pas qu’il est inefficace : cela signifie que KURLA ne le sait pas encore.
            </p>
          ) : (
            <div className="space-y-3">
              {card.evidence.map((evidence: any) => {
                const level = evidence.evidenceLevel || evidence.evidence_level;
                const isBest = best?.evidence?.id === evidence.id;
                return (
                  <div
                    key={evidence.id}
                    className={`rounded-xl border p-4 ${isBest ? 'border-[#C8753D]/40 bg-[#FBF7F0]' : 'border-[#E8E1DA]'}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-xs font-semibold text-[#111111]">
                        {EVIDENCE_LABELS[level] || level}
                      </span>
                      {isBest && (
                        <span className="text-[10px] font-semibold text-[#C8753D] uppercase tracking-wider">
                          Preuve retenue
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#111111] leading-relaxed">{evidence.claim}</p>

                    <p className="text-xs text-[#666666] mt-2">
                      {SOURCE_LABELS[evidence.sourceKind || evidence.source_kind] || 'Source inconnue'}
                      {evidence.sourceReference ? ` — ${evidence.sourceReference}` : ''}
                    </p>

                    {(evidence.sourceUrl) && (
                      <a
                        href={evidence.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] hover:underline mt-2"
                      >
                        Consulter la source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {evidence.populationsStudied?.length > 0 && (
                      <p className="text-xs text-[#666666] mt-2">
                        Populations étudiées : {evidence.populationsStudied.join(', ')}
                      </p>
                    )}
                  </div>
                );
              })}

              {best && !best.transposable && (
                <div className="rounded-xl bg-[#FFF7ED] border border-[#FED7AA] p-4 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#111111] mb-1">
                      Preuve non transposable à votre profil
                    </p>
                    <p className="text-xs text-[#666666] leading-relaxed">
                      {best.caveat ||
                        'La population étudiée ne correspond pas aux textures ou aux carnations riches en mélanine. Une efficacité démontrée ailleurs ne s’applique pas mécaniquement ici.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Restrictions réglementaires */}
        {card.restrictions.length > 0 && (
          <section className={cardClass}>
            <h2 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Restrictions réglementaires connues
            </h2>
            <div className="space-y-3">
              {card.restrictions.map((restriction: any) => (
                <div key={restriction.id} className="rounded-xl border border-[#E8E1DA] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-[#F5F1EB] text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                      {restriction.jurisdiction}
                    </span>
                    <span className="text-xs font-semibold text-[#111111]">
                      {restriction.max_concentration_pct != null
                        ? `Concentration maximale ${restriction.max_concentration_pct} %`
                        : 'Restriction'}
                    </span>
                  </div>
                  {restriction.basis && (
                    <p className="text-xs text-[#666666] leading-relaxed">{restriction.basis}</p>
                  )}
                </div>
              ))}
              <p className="text-xs text-[#999999] leading-relaxed">
                Cette liste recense les restrictions que KURLA connaît. L’absence d’une juridiction ne
                signifie pas qu’aucune restriction n’y existe, et la conformité d’un produit reste de
                la responsabilité de son fabricant.
              </p>
            </div>
          </section>
        )}

        {card.restrictions.length === 0 && (
          <div className={`${cardClass} flex items-start gap-3`}>
            <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
            <p className="text-sm text-[#666666]">
              Aucune restriction réglementaire n’est documentée pour cet ingrédient dans la base KURLA.
              Cela n’équivaut pas à une garantie de conformité : la responsabilité réglementaire d’un
              produit incombe à son fabricant.
            </p>
          </div>
        )}

        {/* Produits publiés qui contiennent cet ingrédient (boucle graphe → catalogue) */}
        {Array.isArray((card as any).products) && (card as any).products.length > 0 && (
          <section className={cardClass}>
            <h2 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Produits qui le contiennent
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {(card as any).products.map((p: any) => (
                <a
                  key={p.id}
                  href={`/produit/${p.slug}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D]/50 transition-colors"
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#F5F1EB] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#111111] truncate">{p.name}</p>
                    {p.brand && <p className="text-[11px] text-[#999999] truncate">{p.brand}</p>}
                    {p.price != null && <p className="text-[11px] text-[#C8753D] font-semibold mt-0.5">{Number(p.price).toFixed(2)} €</p>}
                  </div>
                </a>
              ))}
            </div>
            <p className="text-xs text-[#999999] leading-relaxed mt-3">
              Seuls les produits publiés et dont la composition est vérifiée sont listés.
            </p>
          </section>
        )}

        <p className="text-xs text-[#999999] leading-relaxed px-1">
          {card.note} Cette fiche présente des données publiées. Elle ne constitue pas un avis médical
          et ne garantit aucun résultat sur votre peau ou vos cheveux.
        </p>
      </div>
    </div>
  );
};
