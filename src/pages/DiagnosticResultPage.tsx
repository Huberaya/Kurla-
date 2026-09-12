import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Loader2, ShoppingBag, Sparkles, XCircle } from 'lucide-react';
import type { AIRecommendationResult, Product } from '../types';
import { useProducts } from '../services/productService';
import { buildDiagnosticResultModel, type DiagnosticResultModel, type DiagnosticRoutineStep } from '../lib/diagnosticResult';

interface DiagnosticResultPageProps {
  onAddToCart?: (product: Product) => void;
}

type StoredAnswers = Record<string, any>;

const FALLBACK_RESULT: AIRecommendationResult = {
  summary: 'Aucun résultat généré n’est disponible dans cette session.',
  recommendedRoutine: 'Résultat à recalculer',
  reason: 'Les réponses restent disponibles localement. Relancez le diagnostic pour obtenir une recommandation actualisée.',
  steps: [],
  warnings: ['Résultat de secours : aucun conseil personnalisé supplémentaire n’a été généré.'],
  productHandles: [],
  requiresHumanReview: false,
  generatedWithAI: false,
  source: 'fallback',
};

function readSession(): { answers: StoredAnswers; result: AIRecommendationResult; isSkin: boolean } {
  let answers: StoredAnswers = {};
  let result: AIRecommendationResult = FALLBACK_RESULT;
  try {
    const skinRaw = sessionStorage.getItem('kurla_diagnostic_answers_skin') || localStorage.getItem('kurla_skin_answers');
    const legacyRaw = sessionStorage.getItem('kurla_diagnostic_answers');
    if (skinRaw) answers = JSON.parse(skinRaw);
    else if (legacyRaw) answers = JSON.parse(legacyRaw);
  } catch { /* storage unavailable */ }
  try {
    const cached = sessionStorage.getItem('kurla_diagnostic_result');
    if (cached) result = JSON.parse(cached);
  } catch { /* invalid cache: keep explicit fallback */ }
  const isSkin = Boolean(answers.skinType || answers.skinConcerns || answers.skinObjectives || answers.toneDepth || answers.hydrationLevel);
  return { answers, result, isSkin };
}

function money(value: number | null): string {
  return value === null ? 'Prix non communiqué par le serveur' : `${value.toFixed(2).replace('.', ',')} €`;
}

function RoutineColumn({ title, steps }: { title: string; steps: DiagnosticRoutineStep[] }) {
  return (
    <div className="rounded-2xl bg-kurla-ink border border-kurla-cream/10 p-4">
      <h3 className="text-sm font-bold text-kurla-amber mb-3">{title}</h3>
      {steps.length === 0 ? <p className="text-xs text-kurla-cream/50">Aucune étape déclarée.</p> : (
        <ol className="space-y-4">
          {steps.map(step => (
            <li key={`${title}-${step.label}-${step.action}`} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kurla-copper/15 text-xs font-bold text-kurla-amber">{step.label}</span>
              <div className="min-w-0">
                <p className="font-semibold">{step.action}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-kurla-cream/55"><span className="text-kurla-amber font-semibold">Pourquoi : </span>{step.why} <span className="text-kurla-cream/40">Conseil général.</span></p>
                {step.how && <p className="mt-1 text-xs leading-relaxed text-kurla-cream/55"><span className="text-kurla-amber font-semibold">Comment : </span>{step.how}</p>}
                {step.expect && <p className="mt-1 text-xs leading-relaxed text-kurla-cream/55"><span className="text-kurla-amber font-semibold">À attendre : </span>{step.expect}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function availabilityIcon(status: DiagnosticResultModel['products'][number]['availability']) {
  return status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <XCircle className="h-4 w-4 text-amber-300" />;
}

export const DiagnosticResultPage: React.FC<DiagnosticResultPageProps> = ({ onAddToCart }) => {
  const { products, loading: productsLoading, source: catalogSource, error: catalogError } = useProducts();
  const [stored, setStored] = useState<{ answers: StoredAnswers; result: AIRecommendationResult; isSkin: boolean } | null>(null);

  useEffect(() => setStored(readSession()), []);

  const model = useMemo(() => stored ? buildDiagnosticResultModel({ answers: stored.answers, result: stored.result, products, isSkin: stored.isSkin }) : null, [products, stored]);

  if (!stored || !model || productsLoading) {
    return <div className="min-h-screen bg-kurla-ink pt-32 text-kurla-cream flex items-center justify-center"><div className="text-center"><Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-kurla-copper" /><p className="text-sm text-kurla-cream/65">Vérification du catalogue publié…</p></div></div>;
  }

  const profileLabel = model.isSkin ? 'profil cosmétique peau' : 'profil cosmétique cheveux';
  const noProductsMessage = catalogError
    ? 'Le catalogue publié ne répond pas. Aucun prix ni produit de remplacement n’est affiché.'
    : 'Aucun produit recommandé n’est actuellement renvoyé par le catalogue serveur. La routine reste consultable sans promesse de disponibilité.';

  return (
    <div className="min-h-screen bg-kurla-ink pt-28 pb-24 text-kurla-cream">
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-kurla-copper/30 bg-kurla-bark px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-kurla-amber"><Sparkles className="h-4 w-4" /> Résultat du questionnaire</span>
          <h1 className="mt-4 font-serif-title text-3xl font-bold sm:text-4xl">Votre {profileLabel}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-kurla-cream/70">{model.summary}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            <span className="rounded-full border border-kurla-cream/15 bg-kurla-espresso px-3 py-1.5">Calculé à partir de vos réponses</span>
            {model.generatedWithAI && <span className="rounded-full border border-emerald-400/30 bg-emerald-950/30 px-3 py-1.5 text-emerald-200">Généré avec aide IA</span>}
          </div>
        </header>

        <div className="mb-8 rounded-3xl border border-kurla-amber/30 bg-kurla-espresso p-5 text-sm leading-relaxed text-kurla-cream/75">
          <p><strong className="text-kurla-cream">Profil cosmétique, pas diagnostic médical.</strong> Cette page aide à organiser des gestes de soin. Elle ne remplace pas l’avis d’un médecin ou d’un dermatologue.</p>
        </div>

        <section className="mb-6 rounded-3xl border border-kurla-cream/10 bg-kurla-espresso p-6" aria-labelledby="profil-declare">
          <SectionHeading number="1" id="profil-declare" title="Votre profil déclaré" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {model.profileFields.map(field => <div key={field.key} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-3"><p className="text-[11px] uppercase tracking-wide text-kurla-cream/45">{field.label}</p><p className="mt-1 text-sm font-semibold">{field.value}</p></div>)}
          </div>
          <p className="mt-4 text-xs text-kurla-cream/50">Les champs non renseignés ne sont pas complétés par déduction. Le phototype apparaît uniquement s’il a été déclaré avec consentement.</p>
        </section>

        {model.skinKnowledgeProfile && (
          <section className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="skin-knowledge-profile">
            <SectionHeading number="1b" id="skin-knowledge-profile" title="Ce que ta peau mélaninée exige" />
            <h2 className="mt-1 text-xl font-semibold text-[#FFE0C6]">{model.skinKnowledgeProfile.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-kurla-cream/75">{model.skinKnowledgeProfile.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-kurla-cream/80">
              {model.skinKnowledgeProfile.melaninKeyPoints.map(point => <li key={point} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kurla-amber" />{point}</li>)}
            </ul>
          </section>
        )}

        <section className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-emerald-400/20 bg-[#101710] p-6"><SectionHeading number="2" title="Ce qui est certain" /><ul className="space-y-2 text-sm text-kurla-cream/80">{model.certain.length ? model.certain.map(item => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{item}</li>) : <li>Aucune réponse exploitable n’a été conservée.</li>}</ul></div>
          <div className="rounded-3xl border border-amber-400/20 bg-[#171208] p-6"><SectionHeading number="2b" title="Ce qui reste inconnu" /><ul className="space-y-2 text-sm text-kurla-cream/80">{model.unknown.length ? model.unknown.map(item => <li key={item} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{item}</li>) : <li>Aucun champ clé ne manque dans ce questionnaire.</li>}</ul></div>
        </section>

        {model.lessons.length > 0 && (
          <section className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="comprendre">
            <SectionHeading number="2c" id="comprendre" title="Comprendre — vos priorités, expliquées" />
            <p className="mb-4 text-xs leading-relaxed text-kurla-cream/55">Sélectionnées sur ce que vous avez déclaré. Elles expliquent le « pourquoi » de la routine ci-dessous — et elles restent valables quel que soit le produit.</p>
            <div className="space-y-4">
              {model.lessons.map(lesson => (
                <div key={lesson.key} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4">
                  <p className="text-sm font-semibold text-[#FFE0C6]">{lesson.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-kurla-cream/75">{lesson.lesson}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-wide text-kurla-amber">{lesson.source}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-6 rounded-3xl border border-kurla-cream/10 bg-kurla-espresso p-6"><SectionHeading number="3" title="Vos 2 à 3 priorités" /><div className="flex flex-wrap gap-2">{model.priorities.length ? model.priorities.map(priority => <span key={priority} className="rounded-full border border-kurla-copper/40 bg-kurla-copper/15 px-4 py-2 text-sm font-semibold text-[#FFE0C6]">{priority}</span>) : <span className="text-sm text-kurla-cream/60">Aucune priorité assez précise pour personnaliser ce bloc.</span>}</div></section>

        <section className="mb-6 rounded-3xl border border-kurla-cream/10 bg-kurla-espresso p-6"><SectionHeading number="4" title="Routine minimale matin / soir" /><div className="grid gap-4 md:grid-cols-3"><RoutineColumn title="Matin" steps={model.morning} /><RoutineColumn title="Soir" steps={model.evening} /><RoutineColumn title="À observer chaque semaine" steps={model.weekly} /></div><p className="mt-4 text-xs text-kurla-cream/50">Commencez par cette base et introduisez un seul changement à la fois. La routine ne crée pas de promesse de résultat.</p></section>

        <section className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="produits-reels">
          <SectionHeading number="5" id="produits-reels" title="Produits réels et état commercial" />
          <p className="mb-1 text-sm font-semibold text-[#FFE0C6]">Dans le catalogue KURLA</p>
          <p className="mb-4 text-xs text-kurla-cream/55">Prix, pays et état sont lus depuis le catalogue serveur. Aucun prix indicatif n’est inventé dans cette page.</p>
          {model.products.length === 0 ? <div className="rounded-2xl border border-amber-300/25 bg-[#171208] p-4 text-sm text-[#FFE0C6]">
            <p>{noProductsMessage}</p>
            {model.skinKnowledgeProfile && <><p className="mt-3 text-xs text-kurla-cream/65">Cibles de routine mentionnées par la base de connaissance, sans disponibilité ni prix :</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-kurla-cream/75">{model.skinKnowledgeProfile.keyProducts.map(product => <li key={product}>{product}</li>)}</ul></>}
          </div> : <div className="grid gap-4 md:grid-cols-2">{model.products.map(card => <article key={card.product.id} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4"><div className="flex gap-3"><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><a href={`/produit/${card.product.slug}`} className="font-semibold hover:text-kurla-amber">{card.product.name}</a><p className="text-xs text-kurla-cream/50">{card.product.brand}</p></div><span className="flex items-center gap-1 text-xs font-semibold">{availabilityIcon(card.availability)}{card.availabilityLabel}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><span className="text-kurla-cream/45">Prix serveur</span><p className="font-semibold">{money(card.price)}</p></div><div><span className="text-kurla-cream/45">Pays</span><p className="font-semibold">{card.countryLabel}</p></div></div><p className="mt-3 text-xs leading-relaxed text-kurla-cream/60">{card.availabilityMessage}</p><div className="mt-3 flex items-center gap-2">{card.actionable && onAddToCart ? <button type="button" onClick={() => onAddToCart(card.product)} className="inline-flex items-center gap-2 rounded-full bg-kurla-copper px-4 py-2 text-xs font-bold hover:bg-kurla-cocoa"><ShoppingBag className="h-3.5 w-3.5" /> Ajouter</button> : null}<a href={`/produit/${card.product.slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-kurla-amber hover:underline">Voir la fiche <ArrowRight className="h-3.5 w-3.5" /></a></div></div></div></article>)}</div>}
        </section>

        <section className="mb-6 rounded-3xl border border-kurla-cream/10 bg-kurla-espresso p-6"><SectionHeading number="6" title="Pourquoi chaque étape ?" /><div className="grid gap-3 md:grid-cols-2">{[...model.morning, ...model.evening, ...model.weekly].map(step => <div key={`why-${step.label}-${step.action}`} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4"><p className="text-sm font-semibold">{step.action}</p><p className="mt-1 text-xs leading-relaxed text-kurla-cream/65">{step.why}</p><span className="mt-2 inline-block text-[10px] uppercase tracking-wide text-kurla-amber">Conseil général</span></div>)}</div></section>

        <section className="mb-8 rounded-3xl border border-kurla-copper/30 bg-kurla-espresso p-6"><SectionHeading number="7" title="Suivi et prochaines observations" /><p className="mb-4 text-xs leading-relaxed text-kurla-cream/55">Trois questions concrètes, à répondre dans votre journal : ce sont elles qui pilotent l’ajustement de votre routine — pas une intuition.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-kurla-ink p-4"><Clock3 className="mb-2 h-5 w-5 text-kurla-amber" /><p className="text-xs font-bold uppercase tracking-wide text-kurla-cream/45">Aujourd’hui</p><p className="mt-1 text-sm font-semibold leading-relaxed">{model.followUp.firstObservation}</p></div>{model.observations.length > 0 ? model.observations.map(obs => <div key={obs.day} className="rounded-2xl bg-kurla-ink p-4"><Clock3 className="mb-2 h-5 w-5 text-kurla-amber" /><p className="text-xs font-bold uppercase tracking-wide text-kurla-cream/45">{obs.day}</p><p className="mt-1 text-sm leading-relaxed text-kurla-cream/75">{obs.question}</p></div>) : <div className="rounded-2xl bg-kurla-ink p-4"><Clock3 className="mb-2 h-5 w-5 text-kurla-amber" /><p className="text-xs font-bold uppercase tracking-wide text-kurla-cream/45">Prochaine étape</p><p className="mt-1 text-sm font-semibold">{model.followUp.nextObservation}</p></div>}</div>{model.advisoryLoop && <p className="mt-4 rounded-2xl border border-kurla-copper/20 bg-kurla-bark p-4 text-xs leading-relaxed text-kurla-cream/70"><span className="font-bold text-kurla-amber">Votre routine évolue avec vous. </span>{model.advisoryLoop}</p>}<div className="mt-4 flex flex-wrap gap-3"><a href={model.followUp.journalHref} className="rounded-full bg-kurla-copper px-5 py-2.5 text-sm font-bold hover:bg-kurla-cocoa">Ouvrir mon suivi</a><a href={model.followUp.shelfHref} className="rounded-full border border-kurla-cream/20 px-5 py-2.5 text-sm font-semibold hover:border-kurla-amber">Voir ma sélection</a></div></section>

        <div className="space-y-2 text-xs leading-relaxed text-kurla-cream/55"><p><strong className="text-kurla-cream/75">Source du résultat :</strong> {model.generatedWithAI ? 'Gemini a répondu à partir des réponses et du catalogue autorisé.' : 'fallback déterministe KURLA ou résultat mis en cache ; aucune mention d’aide IA n’est affichée.'}</p><p><strong className="text-kurla-cream/75">Catalogue :</strong> {catalogSource === 'supabase' ? 'catalogue serveur publié.' : 'catalogue serveur indisponible ou vide.'}</p>{model.warnings.map(warning => <p key={warning} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kurla-amber" />{warning}</p>)}</div>
        <div className="mt-8 flex flex-wrap gap-4"><a href={model.isSkin ? '/peau/diagnostic' : '/diagnostic'} className="inline-flex items-center gap-1 text-sm font-semibold text-kurla-amber hover:underline"><ArrowLeft className="h-4 w-4" /> Modifier mes réponses</a><a href="/boutique" className="inline-flex items-center gap-1 text-sm font-semibold text-kurla-amber hover:underline">Explorer la boutique <ArrowRight className="h-4 w-4" /></a></div>
      </main>
    </div>
  );
};

function SectionHeading({ number, id, title }: { number: string; id?: string; title: string }) {
  return <h2 id={id} className="mb-4 flex items-center gap-3 font-serif-title text-xl font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-kurla-copper text-xs font-sans text-white">{number}</span>{title}</h2>;
}
