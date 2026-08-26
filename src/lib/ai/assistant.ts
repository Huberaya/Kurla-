import { AssistantResponse, StructuredAiAnswer } from './contracts';
import { getSupabaseClient } from '../supabaseClient';

export interface AssistantQueryOptions {
  locale?: string;
  country?: string;
  objective?: string;
  memoryConsent?: boolean;
  sessionId?: string;
}

const disclaimer = "Les réponses KURLA sont des informations et conseils cosmétiques. Elles ne constituent ni un diagnostic, ni une prescription, ni un avis médical.";

function offlineAnswer(query: string, locale = 'fr'): StructuredAiAnswer {
  if (locale === 'en') {
    return {
      shortAnswer: `I could not reach the KURLA assistant for “${query}”.`,
      simpleExplanation: 'No product is suggested offline because availability and profile data cannot be verified in the browser.',
      routineSteps: ['Try again when the service is available.', 'Keep your routine gentle and avoid adding several new products.', 'Ask a professional about persistent or intense symptoms.'],
      immediateActions: ['Do not apply a new product to damaged skin.', 'Stop a product that causes a persistent reaction.'],
      usefulProducts: [],
      avoidCombinations: ['Avoid combining several new or irritating products at once.'],
      usefulTools: [],
      errorsToAvoid: ['Do not treat a cosmetic suggestion as a medical diagnosis.'],
      whenToConsultPro: 'Ask a doctor or dermatologist for pain, lesions, bleeding, pus, sudden hair loss or a persistent reaction.',
      uncertainty: 'The service was unavailable; no catalog recommendation was made.',
      sources: [],
      ctas: [{ label: 'Browse the catalog', href: '/boutique', type: 'boutique' }, { label: 'Track my routine', href: '/account/routine-tracker', type: 'routine' }]
    };
  }
  return {
    shortAnswer: `L’assistant KURLA est momentanément indisponible pour « ${query} ».`,
    simpleExplanation: 'Aucun produit n’est proposé hors connexion : la disponibilité et les données du profil ne peuvent pas être vérifiées dans le navigateur.',
    routineSteps: ['Réessayer lorsque le service est disponible.', 'Garder une routine douce et ne pas ajouter plusieurs nouveautés.', 'Demander un avis professionnel en cas de signes persistants ou intenses.'],
    immediateActions: ['Ne pas appliquer de nouveau produit sur une peau lésée.', 'Arrêter un produit qui provoque une réaction persistante.'],
    usefulProducts: [],
    avoidCombinations: ['Éviter d’associer plusieurs produits nouveaux ou irritants en même temps.'],
    usefulTools: [],
    errorsToAvoid: ['Ne pas prendre un conseil cosmétique pour un diagnostic médical.'],
    whenToConsultPro: 'Demander un avis médical en cas de douleur, lésion, saignement, pus, chute soudaine ou réaction persistante.',
    uncertainty: 'Le service est indisponible ; aucune recommandation de catalogue n’a été faite.',
    sources: [],
    ctas: [{ label: 'Explorer le catalogue', href: '/boutique', type: 'boutique' }, { label: 'Suivre ma routine', href: '/account/routine-tracker', type: 'routine' }]
  };
}

async function authHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const client = getSupabaseClient();
    const { data } = client ? await client.auth.getSession() : { data: { session: null } };
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  } catch (error) {
    console.warn('[KURLA AI] impossible de lire la session Supabase:', error);
  }
  return headers;
}

export async function queryBeautyAssistant(userQuery: string, options: AssistantQueryOptions = {}): Promise<AssistantResponse> {
  const locale = options.locale || 'fr';
  try {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ query: userQuery, ...options })
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && (data.answer || data.isMedicalRedirect)) {
      return {
        isMedicalRedirect: !!data.isMedicalRedirect,
        medicalMessage: data.medicalMessage,
        requiresHumanReview: data.requiresHumanReview,
        answer: data.answer,
        disclaimer: data.disclaimer || disclaimer,
        sessionId: data.sessionId,
        messageId: data.messageId,
        memorySaved: data.memorySaved,
        profileAvailable: data.profileAvailable,
        profileConfidence: data.profileConfidence
      };
    }
    if (res.status === 401 && options.memoryConsent) {
      throw new Error('Connectez-vous pour activer la mémoire de l’assistant.');
    }
  } catch (error) {
    console.warn('[KURLA AI] API indisponible, aucune recommandation produit locale ne sera inventée:', error);
  }

  return {
    isMedicalRedirect: false,
    answer: offlineAnswer(userQuery, locale),
    disclaimer,
    memorySaved: false
  };
}

export interface AiSessionSummary {
  id: string;
  topic: string;
  locale: string;
  country: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export async function getAiHistory(): Promise<AiSessionSummary[]> {
  try {
    const res = await fetch('/api/ai/history', { headers: await authHeaders() });
    const data = await res.json().catch(() => null);
    return res.ok && Array.isArray(data?.sessions) ? data.sessions : [];
  } catch {
    return [];
  }
}

export async function getAiSessionHistory(id: string): Promise<{ id: string; messages: Array<{ id: string; sender: string; message: string; metadata?: Record<string, unknown>; createdAt: string }> } | null> {
  try {
    const res = await fetch(`/api/ai/history/${encodeURIComponent(id)}`, { headers: await authHeaders() });
    const data = await res.json().catch(() => null);
    return res.ok && data?.session && Array.isArray(data.messages) ? { id: data.session.id, messages: data.messages } : null;
  } catch {
    return null;
  }
}

export async function sendAiFeedback(input: { rating: 'helpful' | 'incorrect' | 'unsafe'; comment?: string; sessionId?: string; messageId?: string }): Promise<boolean> {
  try {
    const res = await fetch('/api/ai/feedback', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(input) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function requestAiHumanReview(input: { reason: string; payload?: Record<string, unknown>; sessionId?: string; messageId?: string }): Promise<boolean> {
  try {
    const res = await fetch('/api/ai/human-review', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(input) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteAiHistory(): Promise<boolean> {
  try {
    const res = await fetch('/api/ai/history', { method: 'DELETE', headers: await authHeaders() });
    return res.ok;
  } catch {
    return false;
  }
}
