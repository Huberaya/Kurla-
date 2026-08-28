import { ProductQuestion, ProductReview } from '../types';
import { apiErrorMessage } from '../lib/apiDiagnostics';

export interface ProductTrustResponse {
  reviews: ProductReview[];
  questions: ProductQuestion[];
  verifiedReviewCount: number;
  questionsCount: number;
}

function authHeaders(accessToken?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage(response, data, 'La demande n’a pas pu être traitée.'));
  return data as T;
}

/**
 * CHANTIER 7.7 — conformité réglementaire d'un produit pour un pays donné.
 * Le type est celui renvoyé par `/api/products/:id/compliance` (module
 * `src/lib/jurisdiction.ts` côté serveur) : on ne redéclare pas la logique.
 */
export interface ProductComplianceResponse {
  productId: string;
  country: string;
  countryWasDefaulted: boolean;
  jurisdiction: string;
  verdict: 'compliant' | 'restricted' | 'prohibited' | 'unverified' | 'no_data';
  sellable: boolean;
  findings: Array<{
    ingredientId: string;
    jurisdiction: string;
    status: 'allowed' | 'restricted' | 'prohibited' | 'unknown';
    limitPercent: number | null;
    declaredConcentrationPercent: number | null;
    withinLimit: boolean | null;
    message: string;
    reference: string | null;
  }>;
  limitations: string[];
  declaredIngredientCount: number;
  resolvedIngredientCount: number;
  note?: string;
}

export async function fetchProductCompliance(
  productIdOrSlug: string,
  country: string
): Promise<ProductComplianceResponse> {
  const response = await fetch(
    `/api/products/${encodeURIComponent(productIdOrSlug)}/compliance?country=${encodeURIComponent(country)}`
  );
  return parseResponse<ProductComplianceResponse>(response);
}

export async function fetchProductTrust(productIdOrSlug: string): Promise<ProductTrustResponse> {
  const response = await fetch(`/api/products/${encodeURIComponent(productIdOrSlug)}/trust`);
  return parseResponse<ProductTrustResponse>(response);
}

export async function askProductQuestion(productId: string, question: string, accessToken?: string) {
  const response = await fetch(`/api/products/${encodeURIComponent(productId)}/questions`, {
    method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify({ question })
  });
  return parseResponse<{ question: ProductQuestion; message: string }>(response);
}

export async function submitProductReview(productId: string, payload: { rating: number; title?: string; comment: string; variantId?: string }, accessToken?: string) {
  const response = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
    method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify(payload)
  });
  return parseResponse<{ review: ProductReview; message: string }>(response);
}

export async function joinProductWaitlist(productId: string, payload: { email: string; country: string; variantId?: string }, accessToken?: string) {
  const response = await fetch(`/api/products/${encodeURIComponent(productId)}/waitlist`, {
    method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify(payload)
  });
  return parseResponse<{ waitlist: { id: string; status: string }; message: string }>(response);
}

export async function createProductSubscription(productId: string, payload: { frequency: string; quantity: number; country: string; variantId?: string }, accessToken?: string) {
  const response = await fetch(`/api/products/${encodeURIComponent(productId)}/subscriptions`, {
    method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify(payload)
  });
  return parseResponse<{ subscription: unknown; message: string }>(response);
}

// ---------------------------------------------------------------------------
// Vérification publique de la fiche
// ---------------------------------------------------------------------------

export interface ProductVerificationCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface ProductVerificationResponse {
  productId: string;
  verified: boolean;
  verifiedAt: string | null;
  checks: ProductVerificationCheck[];
  note: string;
}

export async function fetchProductVerification(productIdOrSlug: string): Promise<ProductVerificationResponse> {
  const response = await fetch(`/api/products/${encodeURIComponent(productIdOrSlug)}/verification`);
  return parseResponse<ProductVerificationResponse>(response);
}
