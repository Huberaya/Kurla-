import { AI_GUARDRAILS } from './guardrails';
import { getStructuredAnswer, StructuredAiAnswer } from './mockAnswers';

export interface AssistantResponse {
  isMedicalRedirect: boolean;
  medicalMessage?: string;
  answer?: StructuredAiAnswer;
  disclaimer: string;
}

export async function queryBeautyAssistant(userQuery: string): Promise<AssistantResponse> {
  // 1. Client-side Guardrails Check
  if (AI_GUARDRAILS.checkForMedicalFlags(userQuery)) {
    return {
      isMedicalRedirect: true,
      medicalMessage: AI_GUARDRAILS.getMedicalRedirectMessage(),
      disclaimer: AI_GUARDRAILS.disclaimer
    };
  }

  try {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: userQuery })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.answer || data.isMedicalRedirect)) {
        return {
          isMedicalRedirect: !!data.isMedicalRedirect,
          medicalMessage: data.medicalMessage,
          answer: data.answer,
          disclaimer: data.disclaimer || AI_GUARDRAILS.disclaimer
        };
      }
    }
  } catch (err) {
    console.warn('API call to /api/ai/assistant failed, falling back to local knowledge base:', err);
  }

  // 2. Return structured answer fallback
  const fallbackAnswer = getStructuredAnswer(userQuery);

  return {
    isMedicalRedirect: false,
    answer: fallbackAnswer,
    disclaimer: AI_GUARDRAILS.disclaimer
  };
}

