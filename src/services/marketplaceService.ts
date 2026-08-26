import { ProductQuestion, ProductReview } from '../types';

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
  if (!response.ok) throw new Error(data?.error || 'La demande n’a pas pu être traitée.');
  return data as T;
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
