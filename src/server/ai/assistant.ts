import { AI_GUARDRAILS } from '../../lib/ai/guardrails';
import { serverDb } from '../../lib/serverDb';

import { AvailableCatalogEntry, SUPPORTED_AI_LOCALES } from './catalog';
import type { AuthenticatedUser } from '../types';

/**
 * CHANTIER 8.1 — chaîne de réponse de l'assistant, extraite de `server.ts`.
 *
 * Déplacée telle quelle : normalisation de la langue et du pays, sélection des
 * besoins, mise en forme du catalogue pour le prompt, repli déterministe,
 * filtrage de la réponse structurée, triage médical et persistance de
 * l'échange. Les règles de sécurité (`AI_GUARDRAILS`) restent la seule source
 * de vérité — rien n'est réécrit ici.
 */
export function normalizeAiLocale(value: unknown): string {
  const locale = typeof value === 'string' ? value.trim().toLowerCase().split('-')[0] : 'fr';
  return SUPPORTED_AI_LOCALES.has(locale) ? locale : 'fr';
}

export function normalizeAiCountry(value: unknown): string {
  const country = typeof value === 'string' ? value.trim().toUpperCase() : 'FR';
  return /^[A-Z]{2}$/.test(country) ? country : 'FR';
}

export function queryNeeds(query: string, diagnosticType?: string): string[] {
  const value = `${diagnosticType || ''} ${query}`.toLowerCase();
  const needs: string[] = [];
  const add = (need: string, terms: string[]) => { if (terms.some(term => value.includes(term))) needs.push(need); };
  add('hydrater_cheveux', ['cheveu', 'boucle', 'frisé', 'frise', 'crépu', 'crepu', 'dry hair', 'hair']);
  add('reduire_casse', ['casse', 'breakage', 'fragile', 'fragility']);
  add('definir_boucles', ['boucle', 'definition', 'définition', 'curl']);
  add('cuir_chevelu', ['cuir chevelu', 'scalp', 'pellicule', 'démange', 'demange', 'itch']);
  add('entretenir_tresses', ['tresse', 'braid', 'twist']);
  add('entretenir_locks', ['lock', 'microlock']);
  add('entretenir_perruque', ['perruque', 'wig', 'lace']);
  add('protection_solaire', ['spf', 'solaire', 'soleil', 'sun', 'sunscreen']);
  add('taches_hyperpigmentation', ['tache', 'hyperpigment', 'marque', 'pigment', 'dark spot']);
  add('imperfections_acne', ['acné', 'acne', 'imperfection', 'pimple']);
  add('peau_sensible', ['sensible', 'sensibilité', 'sensitivity', 'irrit']);
  add('hydrater_peau', ['peau sèche', 'peau deshydrate', 'peau déshydrat', 'dry skin', 'hydration']);
  return Array.from(new Set(needs));
}

export function catalogForPrompt(catalog: AvailableCatalogEntry[], fits: Map<string, any>) {
  return catalog.map(entry => ({
    slug: entry.slug,
    name: entry.name,
    brand: entry.brand,
    price: entry.price,
    category: entry.category,
    description: entry.description,
    needs: entry.needs,
    keyIngredients: entry.keyIngredients,
    notIdealIf: entry.notIdealIf,
    fitEvidence: fits.get(entry.slug)?.evidence || [],
    fitReasons: fits.get(entry.slug)?.reasons || []
  }));
}

export function recommendationsForSlugs(slugs: unknown, catalog: AvailableCatalogEntry[], fits: Map<string, any>, locale = 'fr', modelDetails?: Map<string, any>) {
  const requested = Array.isArray(slugs) ? slugs : [];
  const uniqueSlugs = Array.from(new Set(requested.filter((slug): slug is string => typeof slug === 'string')));
  return uniqueSlugs
    .map(slug => catalog.find(entry => entry.slug === slug))
    .filter((entry): entry is AvailableCatalogEntry => !!entry)
    .slice(0, 5)
    .map(entry => {
      const fit = fits.get(entry.slug);
      const details = modelDetails?.get(entry.slug);
      const fitEvidence = (fit?.evidence || []).slice(0, 4).map((item: any) => `${item.label}: ${item.value}`);
      const modelEvidence = Array.isArray(details?.evidence) ? details.evidence.filter((value: unknown): value is string => typeof value === 'string').slice(0, 4) : [];
      const evidence = fitEvidence.length > 0 ? fitEvidence : modelEvidence;
      const modelReason = typeof details?.reason === 'string' && details.reason.trim() ? details.reason.trim().slice(0, 500) : undefined;
      const reason = fit?.reasons?.[0] || modelReason || (locale === 'en' ? 'Selected from the verified in-stock catalog for this request.' : 'Sélectionné dans le catalogue vérifié et disponible pour cette demande.');
      return {
        productSlug: entry.slug,
        name: entry.name,
        link: entry.link,
        reason,
        evidence
      };
    });
}

export function budgetLimit(profile: any): number | undefined {
  const value = profile?.hair?.budget || profile?.skin?.budget;
  if (typeof value !== 'string' || value === 'inconnu') return undefined;
  const limits: Record<string, number> = { moins_40: 40, '40_70': 70, '70_100': 100, premium: Number.POSITIVE_INFINITY };
  return limits[value];
}

export function fallbackAnswer(query: string, locale: string, cards: any[], catalog: AvailableCatalogEntry[], fits: Map<string, any>, needs: string[], profile: any): any {
  const isEnglish = locale === 'en';
  const isSpanish = locale === 'es';
  const isPortuguese = locale === 'pt';
  const maxPrice = budgetLimit(profile);
  const products = catalog
    .map(entry => ({ entry, fit: fits.get(entry.slug) }))
    .filter(({ entry, fit }) => {
      if (maxPrice !== undefined && entry.price > maxPrice) return false;
      if (profile && fit?.score !== null && fit?.score !== undefined) return fit.score > 0;
      return needs.length === 0 || entry.needs.some(need => needs.includes(need));
    })
    .sort((a, b) => (b.fit?.score || 0) - (a.fit?.score || 0))
    .slice(0, 3)
    .map(({ entry }) => entry.slug);
  const productRecommendations = recommendationsForSlugs(products, catalog, fits, locale);
  const sourceRefs = cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status }));

  if (isEnglish) return {
    shortAnswer: `For “${query}”, start with a gentle, consistent routine rather than adding many products at once.`,
    simpleExplanation: 'Your profile, environment and stated goal help set priorities. This is cosmetic guidance, not a diagnosis.',
    routineSteps: ['Clarify the priority and work in sections if needed.', 'Introduce one change at a time and observe tolerance.', 'Adjust frequency according to comfort, climate and results.'],
    immediateActions: ['Keep the next step simple and gentle.', 'Stop a product that causes a persistent reaction.', 'Ask a professional if symptoms are intense, sudden or persistent.'],
    usefulProducts: productRecommendations,
    avoidCombinations: ['Avoid layering several new or potentially irritating actives at once.'],
    usefulTools: [],
    errorsToAvoid: ['Do not use a product simply because it is marketed for a texture or skin tone.', 'Do not apply a cosmetic product to damaged skin.'],
    whenToConsultPro: 'Ask a dermatologist or doctor for pain, lesions, bleeding, pus, sudden hair loss or a persistent reaction.',
    uncertainty: profile ? 'Personalization is limited to the fields currently completed in your KURLA ID profile.' : 'No KURLA ID profile was shared, so this remains general cosmetic guidance.',
    sources: sourceRefs,
    ctas: [{ label: 'Browse the catalog', href: '/boutique', type: 'boutique' }, { label: 'Track my routine', href: '/account/routine-tracker', type: 'routine' }]
  };
  if (isSpanish || isPortuguese) return {
    shortAnswer: isSpanish ? `Para “${query}”, empieza con una rutina suave y constante, sin añadir muchos productos a la vez.` : `Para “${query}”, comece com uma rotina suave e consistente, sem adicionar muitos produtos de uma vez.`,
    simpleExplanation: isSpanish ? 'Tu perfil, tu entorno y tu objetivo ayudan a establecer prioridades. Esto es un consejo cosmético, no un diagnóstico.' : 'O seu perfil, ambiente e objetivo ajudam a definir prioridades. Isto é orientação cosmética, não um diagnóstico.',
    routineSteps: isSpanish ? ['Define la prioridad y trabaja por secciones si es necesario.', 'Introduce un cambio cada vez y observa la tolerancia.', 'Ajusta la frecuencia según tu comodidad, clima y resultados.'] : ['Defina a prioridade e trabalhe por secções se necessário.', 'Introduza uma mudança de cada vez e observe a tolerância.', 'Ajuste a frequência segundo o conforto, o clima e os resultados.'],
    immediateActions: isSpanish ? ['Mantén el siguiente paso simple y suave.', 'Suspende un producto que provoque una reacción persistente.', 'Consulta a un profesional si los síntomas son intensos o persistentes.'] : ['Mantenha o próximo passo simples e suave.', 'Pare um produto que cause uma reação persistente.', 'Procure um profissional se os sintomas forem intensos ou persistentes.'],
    usefulProducts: productRecommendations,
    avoidCombinations: [isSpanish ? 'Evita combinar varios activos nuevos o irritantes a la vez.' : 'Evite combinar vários ativos novos ou potencialmente irritantes de uma vez.'],
    usefulTools: [],
    errorsToAvoid: [isSpanish ? 'No uses un producto solo porque se anuncia para una textura o tono.' : 'Não use um produto apenas porque é anunciado para uma textura ou tom de pele.', isSpanish ? 'No apliques cosméticos sobre piel lesionada.' : 'Não aplique cosméticos sobre pele lesionada.'],
    whenToConsultPro: isSpanish ? 'Consulta a un dermatólogo o médico ante dolor, lesiones, sangrado, pus, caída súbita o reacción persistente.' : 'Procure um dermatologista ou médico em caso de dor, lesões, sangramento, pus, queda súbita ou reação persistente.',
    uncertainty: profile ? (isSpanish ? 'La personalización se limita a los campos completados de tu perfil KURLA ID.' : 'A personalização limita-se aos campos preenchidos do seu perfil KURLA ID.') : (isSpanish ? 'No se compartió un perfil KURLA ID: la orientación es general.' : 'Nenhum perfil KURLA ID foi partilhado: a orientação é geral.'),
    sources: sourceRefs,
    ctas: [{ label: isSpanish ? 'Ver el catálogo' : 'Ver o catálogo', href: '/boutique', type: 'boutique' }, { label: isSpanish ? 'Seguir mi rutina' : 'Acompanhar a minha rotina', href: '/account/routine-tracker', type: 'routine' }]
  };
  return {
    shortAnswer: `Pour « ${query} », commence par une routine douce et régulière, sans multiplier les produits.`,
    simpleExplanation: 'Le profil, l’environnement et l’objectif servent à définir les priorités. Il s’agit d’un conseil cosmétique, pas d’un diagnostic.',
    routineSteps: ['Clarifier la priorité et travailler par sections si besoin.', 'Introduire un seul changement à la fois et observer la tolérance.', 'Adapter la fréquence au confort, au climat et aux résultats observés.'],
    immediateActions: ['Garder la prochaine étape simple et douce.', 'Arrêter un produit qui provoque une réaction persistante.', 'Demander un avis professionnel si les signes sont intenses, soudains ou persistants.'],
    usefulProducts: productRecommendations,
    avoidCombinations: ['Éviter d’empiler plusieurs actifs nouveaux ou potentiellement irritants en même temps.'],
    usefulTools: [],
    errorsToAvoid: ['Ne pas choisir un produit uniquement parce qu’il est présenté pour une texture ou une carnation.', 'Ne pas appliquer de cosmétique sur une peau lésée.'],
    whenToConsultPro: 'Demander un avis médical en cas de douleur, lésion, saignement, pus, chute soudaine ou réaction persistante.',
    uncertainty: profile ? 'La personnalisation reste limitée aux champs actuellement renseignés dans votre profil KURLA ID.' : 'Aucun profil KURLA ID n’a été partagé : il s’agit donc de conseils cosmétiques généraux.',
    sources: sourceRefs,
    ctas: [{ label: 'Explorer le catalogue', href: '/boutique', type: 'boutique' }, { label: 'Suivre ma routine', href: '/account/routine-tracker', type: 'routine' }]
  };
}

export function sanitizeStructuredAnswer(raw: any, query: string, locale: string, cards: any[], catalog: AvailableCatalogEntry[], fits: Map<string, any>, needs: string[], profile: any): any {
  const fallback = fallbackAnswer(query, locale, cards, catalog, fits, needs, profile);
  if (!raw || typeof raw !== 'object') return fallback;
  const modelDetails = new Map<string, any>((Array.isArray(raw.usefulProducts) ? raw.usefulProducts : []).filter((product: any) => typeof product?.productSlug === 'string').map((product: any) => [product.productSlug, product]));
  const productRecommendations = recommendationsForSlugs(raw.usefulProducts?.map((p: any) => p?.productSlug), catalog, fits, locale, modelDetails);
  const answer = {
    ...fallback,
    shortAnswer: typeof raw.shortAnswer === 'string' ? raw.shortAnswer.slice(0, 1000) : fallback.shortAnswer,
    simpleExplanation: typeof raw.simpleExplanation === 'string' ? raw.simpleExplanation.slice(0, 2000) : fallback.simpleExplanation,
    whenToConsultPro: typeof raw.whenToConsultPro === 'string' ? raw.whenToConsultPro.slice(0, 1200) : fallback.whenToConsultPro,
    uncertainty: typeof raw.uncertainty === 'string' ? raw.uncertainty.slice(0, 1200) : fallback.uncertainty,
    routineSteps: Array.isArray(raw.routineSteps) && raw.routineSteps.length > 0 ? raw.routineSteps.filter((v: unknown): v is string => typeof v === 'string').slice(0, 8) : fallback.routineSteps,
    immediateActions: Array.isArray(raw.immediateActions) && raw.immediateActions.length > 0 ? raw.immediateActions.filter((v: unknown): v is string => typeof v === 'string').slice(0, 8) : fallback.immediateActions,
    usefulProducts: productRecommendations,
    avoidCombinations: Array.isArray(raw.avoidCombinations) ? raw.avoidCombinations.filter((v: unknown): v is string => typeof v === 'string').slice(0, 8) : fallback.avoidCombinations,
    usefulTools: Array.isArray(raw.usefulTools) ? raw.usefulTools.filter((v: any) => typeof v?.name === 'string' && typeof v?.description === 'string').slice(0, 6) : fallback.usefulTools,
    errorsToAvoid: Array.isArray(raw.errorsToAvoid) ? raw.errorsToAvoid.filter((v: unknown): v is string => typeof v === 'string').slice(0, 8) : fallback.errorsToAvoid,
    sources: cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status })),
    ctas: [{ label: locale === 'en' ? 'Browse the catalog' : 'Explorer le catalogue', href: '/boutique', type: 'boutique' as const }, { label: locale === 'en' ? 'Track my routine' : 'Suivre ma routine', href: '/account/routine-tracker', type: 'routine' as const }]
  };
  return answer;
}

/**
 * Triage médical — délègue à AI_GUARDRAILS, source unique de vérité.
 *
 * L'ancienne implémentation locale comparait des phrases exactes : « j'ai la
 * gorge qui gonfle » ou « je n'arrive plus à respirer » ne déclenchaient rien.
 * La correspondance par racines corrige ce trou de couverture.
 */
export function medicalTriage(query: string): { emergency: boolean; review: boolean; message: string; matched: string[] } {
  return AI_GUARDRAILS.triage(query);
}

export const AI_DISCLAIMER = "Les réponses KURLA sont des informations et conseils cosmétiques. Elles ne constituent ni un diagnostic, ni une prescription, ni un avis médical.";

export async function persistAiExchange(user: AuthenticatedUser | null, session: any, query: string, responseText: string, metadata: Record<string, unknown>, sourceIds: string[], uncertainty?: string) {
  if (!user || !session) return { sessionId: undefined, messageId: undefined, memorySaved: false };
  const userMessage = await serverDb.addAiMessage(session.id, 'user', query, { kind: 'user_query' }, []);
  const assistantMessage = await serverDb.addAiMessage(session.id, 'assistant', responseText, metadata, sourceIds, uncertainty);
  return { sessionId: session.id, messageId: assistantMessage.id, memorySaved: true, userMessageId: userMessage.id };
}
