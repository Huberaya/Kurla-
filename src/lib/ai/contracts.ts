export interface AiSourceReference {
  id: string;
  label: string;
  status: 'internal_review_pending' | 'validated';
}

export interface AiProductRecommendation {
  productSlug: string;
  name: string;
  link: string;
  reason: string;
  evidence: string[];
}

export interface StructuredAiAnswer {
  shortAnswer: string;
  simpleExplanation: string;
  routineSteps: string[];
  immediateActions: string[];
  usefulProducts: AiProductRecommendation[];
  avoidCombinations: string[];
  usefulTools: { name: string; description: string }[];
  errorsToAvoid: string[];
  whenToConsultPro: string;
  uncertainty: string;
  sources: AiSourceReference[];
  followUpQuestion?: string;
  ctas: { label: string; href: string; type: 'diagnostic' | 'routine' | 'boutique' | 'pro' | 'medical' }[];
}

export interface AssistantResponse {
  isMedicalRedirect: boolean;
  medicalMessage?: string;
  requiresHumanReview?: boolean;
  answer?: StructuredAiAnswer;
  disclaimer: string;
  sessionId?: string;
  messageId?: string;
  memorySaved?: boolean;
  profileAvailable?: boolean;
  profileConfidence?: { overall: number; hair: number; skin: number; environment: number; knownFields: number; totalFields: number; missingLabels: string[] };
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
