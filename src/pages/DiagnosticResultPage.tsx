import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronDown, Clock3, Loader2, ShoppingBag, Sparkles, XCircle } from 'lucide-react';
import type { Product } from '../types';
import { useProducts } from '../services/productService';
import { buildDiagnosticResultModel, type DiagnosticResultModel, type DiagnosticRoutineStep } from '../lib/diagnosticResult';
import { LeadBlock, splitLead } from '../components/ui/MoreLess';
import { SKIN_EMPTY_COPY } from '../lib/skinCommerce';
import { readDiagnosticSession, type DiagnosticSession } from '../lib/diagnosticSession';

interface DiagnosticResultPageProps {
  onAddToCart?: (product: Product) => void;
}

function money(value: number | null): string {
  return value === null ? 'Prix non communiqué par le serveur' : `${value.toFixed(2).replace('.', ',')} €`;
}

/**
 * D13 — corps d'étape concis : le geste concret en première phrase (le « Comment »
 * s'il existe, sinon le « Pourquoi »), et le reste derrière « Plus ». Rien n'est
 * supprimé du contenu moteur : tout ce qui ne tient pas dans la ligne du haut est
 * dépliable à un clic. Lead trop courte pour mériter un bouton ? Elle est affichée
 * en entier sans expansion.
 */
const StepBody: React.FC<{ step: DiagnosticRoutineStep }> = ({ step }) => {
  const src = step.how && step.how.trim() ? step.how : step.why;
  const { lead, rest } = splitLead(src);
  const blocks: { label: string; text: string }[] = [];
  if (rest.trim().length >= 55) blocks.push({ label: step.how ? 'Comment (suite)' : 'Pourquoi (suite)', text: rest });
  if (step.how && step.why) blocks.push({ label: 'Pourquoi', text: step.why });
  if (step.expect) blocks.push({ label: 'À attendre', text: step.expect });
  const extra = blocks.reduce((n, b) => n + b.text.length, 0);
  const [open, setOpen] = useState(false);
  const id = useId();
  const shown = rest.trim().length >= 55 ? lead : src.trim();
  return (
    <div className="min-w-0">
      <p className="font-semibold">{step.action}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-kurla-cream/55">{shown}</p>
      {extra >= 55 && (
        <>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls={id}
            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-kurla-copper hover:text-kurla-amber"
          >
            {open ? 'Moins' : 'Plus'}
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {open && (
            <div id={id} className="mt-1 space-y-1">
              {blocks.map(b => (
                <p key={b.label} className="text-xs leading-relaxed text-kurla-cream/55">
                  <span className="text-kurla-amber font-semibold">{b.label} : </span>{b.text}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

function RoutineColumn({ title, steps }: { title: string; steps: DiagnosticRoutineStep[] }) {
  return (
    <div className="rounded-2xl bg-kurla-ink border border-kurla-cream/10 p-4">
      <h3 className="text-sm font-bold text-kurla-amber mb-3">{title}</h3>
      {steps.length === 0 ? <p className="text-xs text-kurla-cream/50">Aucune étape déclarée.</p> : (
        <ol className="space-y-4">
          {steps.map(step => (
            <li key={`${title}-${step.label}-${step.action}`} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kurla-copper/15 text-xs font-bold text-kurla-amber">{step.label}</span>
              <StepBody step={step} />
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
  const [stored, setStored] = useState<DiagnosticSession | null>(null);

  // Chantier scroll mobile (18/09) : sur téléphone, les sections se feuilletent
  // de gauche à droite (un « page » par section) ; sur desktop, empilement
  // vertical inchangé. Le contenu est strictement le même — seul le container
  // change de géométrie.
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  const pagerRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => setStored(readDiagnosticSession()), []);

  const model = useMemo(() => stored ? buildDiagnosticResultModel({ answers: stored.answers, result: stored.result, products, isSkin: stored.isSkin }) : null, [products, stored]);

  if (!stored || !model || productsLoading) {
    return <div className="min-h-screen bg-kurla-ink pt-32 text-kurla-cream flex items-center justify-center"><div className="text-center"><Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-kurla-copper" /><p className="text-sm text-kurla-cream/65">Vérification du catalogue publié…</p></div></div>;
  }

  const profileLabel = model.isSkin ? 'profil cosmétique peau' : 'profil cosmétique cheveux';
  const noProductsMessage = catalogError
    ? 'Le catalogue publié ne répond pas. Aucun prix ni produit de remplacement n’est affiché.'
    : model.isSkin
      ? SKIN_EMPTY_COPY.text
      : 'Aucun produit recommandé n’est actuellement renvoyé par le catalogue serveur. La routine reste consultable sans promesse de disponibilité.';

  /* ------------------------- Contenu (identique mobile) ------------------------- */

  const headerBlock = (
    <>
      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-kurla-copper/30 bg-kurla-bark px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-kurla-amber"><Sparkles className="h-4 w-4" /> Résultat du questionnaire</span>
        <h1 className="mt-4 font-serif-title text-3xl font-bold sm:text-4xl">Votre {profileLabel}</h1>
        <div className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-kurla-cream/70"><LeadBlock text={model.summary} /></div>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          <span className="rounded-full border border-kurla-cream/15 bg-kurla-espresso px-3 py-1.5">Calculé à partir de vos réponses</span>
          {model.generatedWithAI && <span className="rounded-full border border-emerald-400/30 bg-emerald-950/30 px-3 py-1.5 text-emerald-200">Généré avec aide IA</span>}
        </div>
      </header>

      <div className="mb-8 rounded-3xl border border-kurla-amber/30 bg-kurla-espresso p-5 text-sm leading-relaxed text-kurla-cream/75">
        <p><strong className="text-kurla-cream">Profil cosmétique, pas diagnostic médical.</strong> Cette page aide à organiser des gestes de soin. Elle ne remplace pas l’avis d’un médecin ou d’un dermatologue.</p>
      </div>
    </>
  );

  const footerBlock = (
    <>
      <div className="space-y-2 text-xs leading-relaxed text-kurla-cream/55"><p><strong className="text-kurla-cream/75">Source du résultat :</strong> {model.generatedWithAI ? 'Gemini a répondu à partir des réponses et du catalogue autorisé.' : 'fallback déterministe KURLA ou résultat mis en cache ; aucune mention d’aide IA n’est affichée.'}</p><p><strong className="text-kurla-cream/75">Catalogue :</strong> {catalogSource === 'supabase' ? 'catalogue serveur publié.' : 'catalogue serveur indisponible ou vide.'}</p>{model.warnings.map(warning => <p key={warning} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />{warning}</p>)}</div>
      <div className="mt-8 flex flex-wrap gap-4"><a href={model.isSkin ? '/peau/diagnostic' : '/diagnostic'} className="inline-flex items-center gap-1 text-sm font-semibold text-kurla-amber hover:underline"><ArrowLeft className="h-4 w-4" /> Modifier mes réponses</a><a href="/boutique" className="inline-flex items-center gap-1 text-sm font-semibold text-kurla-amber hover:underline">Explorer la boutique <ArrowRight className="h-4 w-4" /></a></div>
    </>
  );

  // Une entrée = une « page » du feuilletage mobile (et un bloc empilé sur
  // desktop). Les conditions (savoirs peau, leçons, science, cartes) sont
  // conservées à l’identique.
  const pages: React.ReactNode[] = [
    <section key="page-profil" className="mb-6 rounded-3xl border border-kurla-cream/10 bg-kurla-espresso p-6" aria-labelledby="profil-declare">
      <SectionHeading number="1" id="profil-declare" title="Votre profil déclaré" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {model.profileFields.map(field => <div key={field.key} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-3"><p className="text-[11px] uppercase tracking-wide text-kurla-cream/45">{field.label}</p><p className="mt-1 text-sm font-semibold">{field.value}</p></div>)}
      </div>
      <p className="mt-4 text-xs text-kurla-cream/50">Les champs non renseignés ne sont pas complétés par déduction. Le phototype apparaît uniquement s’il a été déclaré avec consentement.</p>
    </section>,

    // D1 — « Ce que KURLA a compris » : lectures issues du CROISEMENT des
    // réponses déclarées (jamais d'une case seule, jamais d'un champ
    // manquant deviné), chacune fondée sur une carte de la base science.
    model.understood && model.understood.length > 0 ? (
      <section key="page-compris" className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="kurla-a-compris">
        <SectionHeading number="1c" id="kurla-a-compris" title="Ce que KURLA a compris de votre situation" />
        <p className="mb-4 text-xs leading-relaxed text-kurla-cream/55">Ces lectures ne recopient pas vos réponses : elles les croisent, et expliquent pourquoi la routine est construite ainsi pour vous.</p>
        <ul className="space-y-3">{model.understood.map(item => <li key={item.text} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 text-sm leading-relaxed text-kurla-cream/80">{item.text}<span className="mt-2 block text-[11px] uppercase tracking-wide text-kurla-cream/45">Fondé sur : {item.source}</span></li>)}</ul>
      </section>
    ) : null,

    model.skinKnowledgeProfile ? (
      <section key="page-skin-knowledge" className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="skin-knowledge-profile">
        <SectionHeading number="1b" id="skin-knowledge-profile" title="Ce que ta peau mélaninée exige" />
        <h2 className="mt-1 text-xl font-semibold text-[#FFE0C6]">{model.skinKnowledgeProfile.name}</h2>
        <p className="mt-3 text-sm leading-relaxed text-kurla-cream/75">{model.skinKnowledgeProfile.description}</p>
        <ul className="mt-4 space-y-2 text-sm text-kurla-cream/80">
          {model.skinKnowledgeProfile.melaninKeyPoints.map(point => <li key={point} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kurla-amber" />{point}</li>)}
        </ul>
      </section>
    ) : null,

    <section key="page-certain" className="mb-6 grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-emerald-400/20 bg-[#101710] p-6"><SectionHeading number="2" title="Ce qui est certain" /><ul className="space-y-2 text-sm text-kurla-cream/80">{model.certain.length ? model.certain.map(item => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{item}</li>) : <li>Aucune réponse exploitable n’a été conservée.</li>}</ul></div>
      <div className="rounded-3xl border border-amber-400/20 bg-[#171208] p-6"><SectionHeading number="2b" title="Ce qui reste inconnu" /><ul className="space-y-2 text-sm text-kurla-cream/80">{model.unknown.length ? model.unknown.map(item => <li key={item} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{item}</li>) : <li>Aucun champ clé ne manque dans ce questionnaire.</li>}</ul></div>
    </section>,

    // C11 (vague 1) — l'honnêteté : ce que ce diagnostic ne peut pas dire.
    // La confiance est calculée (combien de réponses manquent, et lesquelles),
    // et les signaux d'orientation ne sont plus noyés dans un paragraphe.
    <section key="page-limites" className="mb-6 rounded-3xl border border-rose-400/25 bg-[#1a0f10] p-6">
      <SectionHeading number="2c" id="limites" title="Ce que ce diagnostic ne peut pas dire" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-4 py-1.5 text-xs font-bold ${
          model.confidence.level === 'haute' ? 'bg-emerald-400/20 text-emerald-200'
            : model.confidence.level === 'moyenne' ? 'bg-amber-400/20 text-amber-200'
              : 'bg-rose-400/20 text-rose-200'
        }`}>{model.confidence.label}</span>
        <p className="flex-1 text-sm leading-relaxed text-kurla-cream/75">{model.confidence.note}</p>
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-rose-200/70">Ce qui relève d’un avis professionnel, pas d’une routine</p>
      <ul className="mt-2 space-y-2 text-sm text-kurla-cream/80">{model.redFlags.map(flag => <li key={flag} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />{flag}</li>)}</ul>
      <p className="mt-4 rounded-2xl border border-kurla-cream/10 bg-kurla-ink px-4 py-3 text-xs leading-relaxed text-kurla-cream/60">{model.scopeNote}</p>
    </section>,

    <section key="page-routine" className="mb-6 rounded-3xl border border-kurla-cream/10 bg-kurla-espresso p-6"><SectionHeading number="3" title={model.isSkin ? 'Routine minimale matin / soir' : 'Routine minimale : lavage et entretien'} /><div className="grid gap-4 md:grid-cols-3"><RoutineColumn title={model.routineTitles.morning} steps={model.morning} /><RoutineColumn title={model.routineTitles.evening} steps={model.evening} /><RoutineColumn title={model.routineTitles.weekly} steps={model.weekly} /></div><p className="mt-4 text-xs text-kurla-cream/50">Commencez par cette base et introduisez un seul changement à la fois. La routine ne crée pas de promesse de résultat.</p></section>,

    <section key="page-pourquoi" className="mb-6 rounded-3xl border border-kurla-cream/10 bg-kurla-espresso p-6"><SectionHeading number="4" title="Pourquoi cette routine ?" /><div className="grid gap-3 md:grid-cols-2">{[...model.morning, ...model.evening, ...model.weekly].map(step => <div key={`why-${step.label}-${step.action}`} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4"><p className="text-sm font-semibold">{step.action}</p><LeadBlock className="mt-1 text-xs leading-relaxed text-kurla-cream/65" text={step.why} /></div>)}</div></section>,

    model.lessons.length > 0 ? (
      <section key="page-comprendre" className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="comprendre">
        <SectionHeading number="5" id="comprendre" title="Comprendre — vos priorités, expliquées" />
        <p className="mb-4 text-xs leading-relaxed text-kurla-cream/55">Sélectionnées sur ce que vous avez déclaré. Elles expliquent le « pourquoi » de la routine ci-dessus — et elles restent valables quel que soit le produit.</p>
        <div className="space-y-4">
          {model.lessons.map(lesson => (
            <div key={lesson.key} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4">
              <p className="text-sm font-semibold text-[#FFE0C6]">{lesson.title}</p>
              <LeadBlock className="mt-2 text-sm leading-relaxed text-kurla-cream/75" text={lesson.lesson} />
              <p className="mt-3 text-[10px] uppercase tracking-wide text-kurla-amber">{lesson.source}</p>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    model.scienceInsights.length > 0 ? (
      <section key="page-science" className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="science">
        <SectionHeading number="6" id="science" title={model.isSkin ? 'Ce que la science dit de votre peau — 3 choses à savoir' : 'Ce que la science dit de votre cheveu — 3 choses à savoir'} />
        <p className="mb-4 text-xs leading-relaxed text-kurla-cream/55">Choisis d’après ce que vous avez déclaré. Chaque fait est sourcé : ce n’est pas une intuition d’IA, c’est ce que la recherche documente — expliqué en français, sans jargon.</p>
        <div className="space-y-4">
          {model.scienceInsights.map(insight => (
            <div key={insight.key} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-kurla-amber" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#FFE0C6]">{insight.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-kurla-cream/75">{insight.fact}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-kurla-amber">{scienceConfidenceLabel(insight.confidence)}<span className="normal-case tracking-normal text-kurla-cream/45">— {insight.source}</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <a href={model.isSkin ? '/peau/science' : '/cheveux/science'} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-kurla-amber hover:underline">La base de savoirs complète — tous les faits, avec leurs sources <ArrowRight className="h-3.5 w-3.5" /></a>
      </section>
    ) : null,

    model.problemCards.length > 0 ? (
      <section key="page-problemes" className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="moyens">
        <SectionHeading number="7" id="moyens" title="Vos problèmes — les moyens : faire, éviter, s’attendre" />
        <p className="mb-4 text-xs leading-relaxed text-kurla-cream/55">Un protocole pour chaque problème que vous avez déclaré. Les gestes viennent de la littérature (source en bas de chaque carte) — et les délais sont honnêtes : ce qui est mesuré, on le dit ; ce qui ne l’est pas, on ne le promet pas.</p>
        <div className="space-y-4">
          {model.problemCards.map(card => (
            <div key={card.key} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 sm:p-5">
              <p className="text-sm font-semibold text-[#FFE0C6]">{card.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-kurla-cream/75">{card.fact}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-kurla-espresso p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-300">Faire</p>
                  <ul className="space-y-2 text-xs leading-relaxed text-kurla-cream/75">{card.faire.map(item => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />{item}</li>)}</ul>
                </div>
                <div className="rounded-xl bg-kurla-espresso p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-rose-300">Éviter</p>
                  <ul className="space-y-2 text-xs leading-relaxed text-kurla-cream/75">{card.eviter.map(item => <li key={item} className="flex gap-2"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />{item}</li>)}</ul>
                </div>
                <div className="rounded-xl bg-kurla-espresso p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-300">S’attendre</p>
                  <p className="flex gap-2 text-xs leading-relaxed text-kurla-cream/75"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />{card.attendre}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-kurla-amber">{scienceConfidenceLabel(card.confidence)}<span className="normal-case tracking-normal text-kurla-cream/45"> — {card.source}</span></p>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    <section key="page-priorites" className="mb-6 rounded-3xl border border-kurla-cream/10 bg-kurla-espresso p-6"><SectionHeading number="8" title="Vos 2 à 3 priorités" /><div className="flex flex-wrap gap-2">{model.priorities.length ? model.priorities.map(priority => <span key={priority} className="rounded-full border border-kurla-copper/40 bg-kurla-copper/15 px-4 py-2 text-sm font-semibold text-[#FFE0C6]">{priority}</span>) : <span className="text-sm text-kurla-cream/60">Aucune priorité assez précise pour personnaliser ce bloc.</span>}</div></section>,

    <section key="page-produits" className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="produits-reels">
      <SectionHeading number="9" id="produits-reels" title="Produits réels et état commercial" />
      <p className="mb-4 text-sm font-semibold text-[#FFE0C6]">Dans le catalogue KURLA</p>
      {model.products.length === 0 ? <div className="rounded-2xl border border-amber-300/25 bg-[#171208] p-4 text-sm text-[#FFE0C6]">
        <p>{noProductsMessage}</p>
        {model.skinKnowledgeProfile && <><p className="mt-3 text-xs text-kurla-cream/65">Cibles de routine mentionnées par la base de connaissance, sans disponibilité ni prix :</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-kurla-cream/75">{model.skinKnowledgeProfile.keyProducts.map(product => <li key={product}>{product}</li>)}</ul></>}
      </div> : <div className="grid gap-4 md:grid-cols-2">{model.products.map(card => <article key={card.product.id} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4"><div className="flex gap-3"><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><a href={`/produit/${card.product.slug}`} className="font-semibold hover:text-kurla-amber">{card.product.name}</a><p className="text-xs text-kurla-cream/50">{card.product.brand}</p></div><span className="flex items-center gap-1 text-xs font-semibold">{availabilityIcon(card.availability)}{card.availabilityLabel}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><span className="text-kurla-cream/45">Prix serveur</span><p className="font-semibold">{money(card.price)}</p></div><div><span className="text-kurla-cream/45">Pays</span><p className="font-semibold">{card.countryLabel}</p></div></div><p className="mt-3 text-xs leading-relaxed text-kurla-cream/60">{card.availabilityMessage}</p><div className="mt-3 flex items-center gap-2">{card.actionable && onAddToCart ? <button type="button" onClick={() => onAddToCart(card.product)} className="inline-flex items-center gap-2 rounded-full bg-kurla-copper px-4 py-2 text-xs font-bold hover:bg-kurla-cocoa"><ShoppingBag className="h-3.5 w-3.5" /> Ajouter</button> : null}<a href={`/produit/${card.product.slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-kurla-amber hover:underline">Voir la fiche <ArrowRight className="h-3.5 w-3.5" /></a></div></div></div></article>)}</div>}
    </section>,

    <section key="page-kit" className="mb-6 rounded-3xl border border-kurla-copper/25 bg-kurla-espresso p-6" aria-labelledby="kit-de-soin">
      <SectionHeading number="9b" id="kit-de-soin" title="Votre kit de soin — à emporter avec vous" />
      <p className="mb-4 text-xs leading-relaxed text-kurla-cream/55">Ce que vous gardez : votre fiche technique, le matériel que la routine utilise réellement, et les produits indispensables par phase. Quand une référence KURLA est publiée, elle est liée ci-dessous ; sinon, c’est le type de produit qui fait règle — aucune marque ni aucun prix n’est inventé.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4">
          <h3 className="mb-3 text-sm font-bold text-kurla-amber">Votre fiche technique</h3>
          <ul className="space-y-1.5">
            {model.kit.profileLines.map(line => (
              <li key={line} className="flex gap-2 text-xs leading-relaxed text-kurla-cream/75"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kurla-amber" />{line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4">
          <h3 className="mb-3 text-sm font-bold text-kurla-amber">Matériel nécessaire</h3>
          <ul className="space-y-2.5">
            {model.kit.materials.map(material => (
              <li key={material.name} className="text-xs leading-relaxed">
                <p className="font-semibold text-kurla-cream/90">
                  {material.name}
                  {material.product ? <a href={`/produit/${material.product.slug}`} className="ml-2 inline-flex items-center gap-1 font-semibold text-kurla-amber hover:underline">Réf. KURLA : {material.product.name} <ArrowRight className="h-3 w-3" /></a> : null}
                </p>
                <LeadBlock className="mt-0.5 text-kurla-cream/55" text={material.why} />
              </li>
            ))}
          </ul>
          {model.kit.materialNote && <p className="mt-3 text-[11px] leading-relaxed text-kurla-cream/50">{model.kit.materialNote}</p>}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4">
        <h3 className="mb-3 text-sm font-bold text-kurla-amber">Produits indispensables, par phase</h3>
        <ul className="space-y-3">
          {model.kit.essentials.map(essential => (
            <li key={`${essential.phase}-${essential.type}`} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <span className="w-40 shrink-0 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-kurla-amber">{essential.phase}</span>
              <div className="min-w-0 flex-1 text-xs leading-relaxed">
                <p className="font-semibold text-kurla-cream/90">{essential.type}{essential.nonNegotiable ? <span className="ml-2 rounded-full bg-kurla-copper px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Non négociable</span> : null}</p>
                <LeadBlock className="mt-0.5 text-kurla-cream/55" text={essential.why} />
                {essential.product
                  ? <a href={`/produit/${essential.product.slug}`} className="mt-1 inline-flex items-center gap-1 font-semibold text-kurla-amber hover:underline">Réf. KURLA : {essential.product.name} <ArrowRight className="h-3 w-3" /></a>
                  : <p className="mt-1 text-[11px] text-kurla-cream/45">Aucune référence KURLA publiée pour l’instant — le type de produit fait règle, aucune marque n’est imposée.</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>,

    <section key="page-suivi" className="mb-8 rounded-3xl border border-kurla-copper/30 bg-kurla-espresso p-6"><SectionHeading number="10" title="Suivi et prochaines observations" /><p className="mb-4 text-xs leading-relaxed text-kurla-cream/55">Trois questions concrètes, à répondre dans votre journal : ce sont elles qui pilotent l’ajustement de votre routine — pas une intuition.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-kurla-ink p-4"><Clock3 className="mb-2 h-5 w-5 text-kurla-amber" /><p className="text-xs font-bold uppercase tracking-wide text-kurla-cream/45">Aujourd’hui</p><p className="mt-1 text-sm font-semibold leading-relaxed">{model.followUp.firstObservation}</p></div>{model.observations.length > 0 ? model.observations.map(obs => <div key={obs.day} className="rounded-2xl bg-kurla-ink p-4"><Clock3 className="mb-2 h-5 w-5 text-kurla-amber" /><p className="text-xs font-bold uppercase tracking-wide text-kurla-cream/45">{obs.day}</p><p className="mt-1 text-sm leading-relaxed text-kurla-cream/75">{obs.question}</p></div>) : <div className="rounded-2xl bg-kurla-ink p-4"><Clock3 className="mb-2 h-5 w-5 text-kurla-amber" /><p className="text-xs font-bold uppercase tracking-wide text-kurla-cream/45">Prochaine étape</p><p className="mt-1 text-sm font-semibold">{model.followUp.nextObservation}</p></div>}</div>{model.advisoryLoop && <p className="mt-4 rounded-2xl border border-kurla-copper/20 bg-kurla-bark p-4 text-xs leading-relaxed text-kurla-cream/70"><span className="font-bold text-kurla-amber">Votre routine évolue avec vous. </span>{model.advisoryLoop}</p>}<div className="mt-4 flex flex-wrap gap-3"><a href={model.followUp.journalHref} className="rounded-full bg-kurla-copper px-5 py-2.5 text-sm font-bold hover:bg-kurla-cocoa">Ouvrir mon suivi</a><a href={model.followUp.shelfHref} className="rounded-full border border-kurla-cream/20 px-5 py-2.5 text-sm font-semibold hover:border-kurla-amber">Voir ma sélection</a>{!model.isSkin && <a href="/account/routine-evolution" className="rounded-full border border-kurla-amber/40 px-5 py-2.5 text-sm font-semibold text-kurla-amber hover:border-kurla-amber">Ce que mon journal changera →</a>}</div></section>,

    <div key="page-sources" className={isMobile ? 'pb-16' : ''}>{footerBlock}</div>,
  ];

  /* ------------------------------- Mobile pager ------------------------------- */

  const visiblePages = pages.filter(entry => entry !== null);
  const pageCount = visiblePages.length + 1; // + page d’intro (titre + avertissement)

  const handlePagerScroll = () => {
    const el = pagerRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.min(pageCount - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
    if (index !== pageRef.current) {
      pageRef.current = index;
      setPage(index);
    }
  };

  const goToPage = (index: number) => {
    const el = pagerRef.current;
    if (!el) return;
    const clamped = Math.min(pageCount - 1, Math.max(0, index));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="bg-kurla-ink text-kurla-cream">
      <div className={isMobile ? 'pt-28' : 'min-h-screen pt-28 pb-24'}>
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {isMobile ? (
            <div className="relative h-[calc(100dvh-112px)] min-h-[320px]">
              {/* Feuilletage : chaque section = une page pleine largeur, défilement
                  vertical interne si la page dépasse l’écran. */}
              <div
                ref={pagerRef}
                onScroll={handlePagerScroll}
                className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
                aria-label="Résultat du diagnostic — feuilletage des sections"
              >
                <div className="h-full w-full shrink-0 grow-0 snap-start overflow-y-auto pt-4 pb-16">{headerBlock}</div>
                {visiblePages.map((entry, index) => (
                  <div key={index} className="h-full w-full shrink-0 grow-0 snap-start overflow-y-auto pt-4 pb-16">{entry}</div>
                ))}
              </div>

              {/* Indication de départ (page d’intro uniquement). */}
              {page === 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
                  <span className="animate-pulse rounded-full border border-kurla-copper/40 bg-kurla-espresso/90 px-4 py-2 text-xs font-semibold text-kurla-amber">Faites glisser pour feuilleter →</span>
                </div>
              )}

              {/* Contrôles : précédent / points / suivant. */}
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 0}
                  aria-label="Section précédente"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-kurla-cream/25 bg-kurla-espresso/90 text-kurla-cream transition hover:border-kurla-amber disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5 rounded-full border border-kurla-cream/15 bg-kurla-espresso/90 px-3 py-2">
                  {Array.from({ length: pageCount }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goToPage(index)}
                      aria-label={`Aller à la section ${index + 1} sur ${pageCount}`}
                      className={`h-2 rounded-full transition-all ${index === page ? 'w-5 bg-kurla-amber' : 'w-2 bg-kurla-cream/30 hover:bg-kurla-cream/50'}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === pageCount - 1}
                  aria-label="Section suivante"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-kurla-cream/25 bg-kurla-espresso/90 text-kurla-cream transition hover:border-kurla-amber disabled:opacity-30"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {headerBlock}
              {pages}
              {footerBlock}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

function scienceConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'recherche': return 'Sourcé — recherche publiée';
    case 'institution': return 'Recommandation professionnelles';
    case 'communaute': return 'Données de la communauté spécialisée';
    case 'expertise': return 'Expertise formulateurs';
    default: return 'Sourcé';
  }
}

function SectionHeading({ number, id, title }: { number: string; id?: string; title: string }) {
  return <h2 id={id} className="mb-4 flex items-center gap-3 font-serif-title text-xl font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-kurla-copper text-xs font-sans text-white">{number}</span>{title}</h2>;
}
