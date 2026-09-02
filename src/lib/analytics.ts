/**
 * Analytics — démarrage et suivi d'événements.
 *
 * Aucun tiers n'est chargé tant qu'un identifiant n'est pas configuré :
 *  - VITE_GA_MEASUREMENT_ID     → Google Analytics 4 (G-XXXX)
 *  - VITE_PLAUSIBLE_DOMAIN      → Plausible (analytics privée, sans cookie)
 * Le tracking est donc silencieux en local et s'active en posant les variables
 * d'environnement (Vercel), sans changer le code.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function initAnalytics(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;

  if (gaId) {
    try {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag(...args: unknown[]) { window.dataLayer!.push(args); };
      window.gtag('js', new Date());
      window.gtag('config', gaId, { anonymize_ip: true });
    } catch { /* analytics never blocks the app */ }
  }

  if (plausibleDomain) {
    try {
      const s = document.createElement('script');
      s.defer = true;
      s.dataset.domain = plausibleDomain;
      s.src = 'https://plausible.io/js/script.js';
      document.head.appendChild(s);
    } catch { /* noop */ }
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

/** Envoie un événement à tous les fournisseurs configurés. Sans effet sinon. */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
  try { window.gtag?.('event', name, clean); } catch { /* noop */ }
  try { (window as any).plausible?.(name, { props: clean }); } catch { /* noop */ }
}

// ── Événements e-commerce standard (GA4) + funnel KURLA ─────────────────────
// Couvre l'entonnoir complet du plan de lancement (action a07) :
// découverte → diagnostic → recommandation → produit → panier → achat.
// Sans ces événements, ni la conversion, ni le CAC, ni le taux
// diagnostic→achat ne sont mesurables.
export const analytics = {
  // ── Bas de funnel (transaction) ──
  beginCheckout: (value?: number, currency = 'EUR') =>
    trackEvent('begin_checkout', { currency, value }),
  purchase: (transactionId: string, value?: number, currency = 'EUR') =>
    trackEvent('purchase', { transaction_id: transactionId, currency, value }),

  // ── Milieu de funnel (catalogue / panier) ──
  viewItem: (itemId: string, itemName?: string, price?: number, category?: string) =>
    trackEvent('view_item', { currency: 'EUR', value: price, item_id: itemId, item_name: itemName, item_category: category }),
  addToCart: (itemId: string, itemName?: string, price?: number, quantity = 1, source?: string) =>
    trackEvent('add_to_cart', { currency: 'EUR', value: price !== undefined ? price * quantity : undefined, item_id: itemId, item_name: itemName, quantity, source }),
  removeFromCart: (itemId: string) =>
    trackEvent('remove_from_cart', { item_id: itemId }),
  viewItemList: (listName: string, itemsCount?: number) =>
    trackEvent('view_item_list', { item_list_name: listName, items_count: itemsCount }),

  // ── Haut de funnel (diagnostic / IA / recherche) ──
  diagnosticStart: (diagnosticType: string) =>
    trackEvent('diagnostic_start', { diagnostic_type: diagnosticType }),
  diagnosticComplete: (diagnosticType: string) =>
    trackEvent('diagnostic_complete', { diagnostic_type: diagnosticType }),
  recommendationClick: (itemId: string, origin: string) =>
    trackEvent('select_promotion', { item_id: itemId, promotion_name: origin }),
  aiAssistantMessage: () => trackEvent('ai_assistant_message'),
  search: (term: string) => trackEvent('search', { search_term: term.slice(0, 100) }),

  // ── Compte / lead ──
  signUp: () => trackEvent('sign_up'),
  waitlistJoin: (profileType = 'client') =>
    trackEvent('generate_lead', { content_name: 'launch_waitlist', content_type: profileType })
};
