import React, { Suspense, useRef, useState, useEffect, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './lib/I18nProvider';
import { installClientSideRouting, onRouteChange } from './lib/router';
import { API_UNAVAILABLE_EVENT, ApiFailureDetail } from './lib/apiDiagnostics';
import { resolveRoute } from './lib/routeTable';
import type { RouteContext } from './lib/routeTable';
import { useDocumentMeta } from './lib/useDocumentMeta';
import { AlertTriangle } from 'lucide-react';
import { analytics } from './lib/analytics';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { NotFoundPage } from './pages/NotFoundPage';
import { Footer } from './components/Footer';

// Panier & bannière démo différés : aucun réseau avant le paint
const deferIdle = (cb: () => void) => {
  if ('requestIdleCallback' in window) (window as any).requestIdleCallback(cb, { timeout: 2000 });
  else setTimeout(cb, 800);
};

const DevDemoBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    deferIdle(async () => {
      try {
        const mod = await import('./lib/supabaseClient');
        if (!mod.isSupabaseConfigured()) setShow(true);
      } catch {}
    });
  }, []);
  if (!show) return null;
  return (
    <div role="status" className="fixed top-[72px] left-0 right-0 z-40 px-4 py-2 bg-amber-100 border-b border-amber-200 text-amber-950 text-center text-[11px] font-semibold">
      Mode démonstration : les données catalogue sont illustratives et le paiement réel n’est pas activé.
    </div>
  );
};

// Modals & Widgets — différés (hors chemin critique). Le hero doit peindre
// avant que le JS du panier ou de l'assistant IA ne soit téléchargé.
const CartDrawer = lazy(() => import('./components/CartDrawer').then(m => ({ default: m.CartDrawer })));
const SearchModal = lazy(() => import('./components/SearchModal').then(m => ({ default: m.SearchModal })));
const AiAssistantWidget = lazy(() => import('./components/AiAssistantWidget').then(m => ({ default: m.AiAssistantWidget })));
const AbandonedCartReminder = lazy(() => import('./components/AbandonedCartReminder').then(m => ({ default: m.AbandonedCartReminder })));
const PasswordRecoveryPanel = lazy(() => import('./components/PasswordRecoveryPanel').then(m => ({ default: m.PasswordRecoveryPanel })));
import { CartItem, Product, ProductVariant } from './types';

interface SsrRequestContext {
  pathname: string;
  search?: string;
}

function ssrRequestContext(): SsrRequestContext | null {
  if (typeof window !== 'undefined') return null;
  const context = (globalThis as typeof globalThis & { __KURLA_SSR_CONTEXT?: SsrRequestContext }).__KURLA_SSR_CONTEXT;
  return context?.pathname ? context : null;
}

function initialLocationKey(): string {
  if (typeof window !== 'undefined') return `${window.location.pathname}${window.location.search}`;
  const context = ssrRequestContext();
  return `${context?.pathname || '/'}${context?.search || ''}`;
}

function initialCartItems(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('kurla_cart_items');
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function AppContent() {
  const { user, session } = useAuth();
  // La clé inclut la query string : deux diagnostics différents partagent le
  // même pathname et doivent pourtant provoquer un nouveau rendu.
  const [locationKey, setLocationKey] = useState(initialLocationKey);
  const pathname = locationKey.split('?')[0];
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems);
  const initialCartRef = useRef<CartItem[]>(cartItems);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [anonId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'ssr_anon';
    let id = window.localStorage.getItem('kurla_anon_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 11);
      window.localStorage.setItem('kurla_anon_id', id);
    }
    return id;
  });

  // Routage interne : l'interception des liens évite un rechargement complet
  // du document à chaque clic (voir src/lib/router.ts). L'écouteur `popstate`
  // est installé par ce même module.
  useEffect(() => {
    installClientSideRouting();
    const unsubscribe = onRouteChange(() => {
      setLocationKey(`${window.location.pathname}${window.location.search}`);
    });
    return unsubscribe;
  }, []);

  // Les navigations internes sont des pages vues réelles : sans cet effet,
  // une SPA ne mesure que son premier chargement.
  useEffect(() => {
    try { analytics.pageView(); } catch { /* le funnel ne bloque jamais la navigation */ }
  }, [locationKey]);

  // Panier : réseau différé après le paint (rIC), jamais bloquant le hero
  useEffect(() => {
    let cancelled = false;
    const authHeaders: HeadersInit = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
    const loadCart = async () => {
      setCartHydrated(false);
      try {
        const guestResponse = await fetch('/api/cart', { headers: { 'x-anonymous-id': anonId } });
        const guestData = await guestResponse.json().catch(() => ({}));
        const guestItems: CartItem[] = Array.isArray(guestData?.items) ? guestData.items : [];
        let accountItems: CartItem[] = [];
        if (session?.access_token) {
          const accountResponse = await fetch('/api/cart', { headers: authHeaders });
          const accountData = await accountResponse.json().catch(() => ({}));
          accountItems = Array.isArray(accountData?.items) ? accountData.items : [];
        }
        if (cancelled) return;
        const baseItems = guestItems.length > 0 ? guestItems : initialCartRef.current;
        const merged = new Map<string, CartItem>();
        [...baseItems, ...accountItems].forEach(item => {
          const key = `${item.product.id}:${item.variantId || ''}`;
          const previous = merged.get(key);
          merged.set(key, { ...item, quantity: Math.min(99, (previous?.quantity || 0) + item.quantity) });
        });
        setCartItems(Array.from(merged.values()));
      } catch {}
      finally { if (!cancelled) setCartHydrated(true); }
    };
    // Pas de fetch synchrone au mount : on attend le idle
    let idleId: any;
    if ('requestIdleCallback' in window) idleId = (window as any).requestIdleCallback(() => loadCart(), { timeout: 2000 });
    else idleId = setTimeout(() => loadCart(), 700);
    return () => {
      cancelled = true;
      if ('cancelIdleCallback' in window && idleId) try { (window as any).cancelIdleCallback(idleId); } catch {}
      else clearTimeout(idleId);
    };
  }, [anonId, user?.id]);

  // Persistance panier différée (idle) : le POST ne concurrence pas le hero
  useEffect(() => {
    if (!cartHydrated) return;
    try { localStorage.setItem('kurla_cart_items', JSON.stringify(cartItems)); } catch {}
    const doPersist = () => {
      fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: 'Bearer ' + session.access_token } : {}) },
        body: JSON.stringify({ anonymousId: anonId, items: cartItems.map(i => ({ productId: i.product.id, variantId: i.variantId, quantity: i.quantity })) })
      }).catch(() => {});
    };
    if ('requestIdleCallback' in window) (window as any).requestIdleCallback(doPersist, { timeout: 2000 });
    else setTimeout(doPersist, 400);
  }, [cartItems, anonId, session?.access_token, cartHydrated]);

  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    const variantId = variant?.id;
    const unitPrice = variant?.price ?? product.price;
    // Funnel : chaque ajout panier est mesuré (produit, prix), quelle que soit
    // la page d'origine (fiche produit, boutique, routine, recommandation).
    try { analytics.addToCart(product.id, product.name, unitPrice); } catch { /* jamais bloquant */ }
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.variantId === variantId);
      if (existing) {
        return prev.map(i => i.product.id === product.id && i.variantId === variantId ? { ...i, quantity: Math.min(99, i.quantity + 1) } : i);
      }
      return [...prev, { product, quantity: 1, variantId, variantLabel: variant?.label, unitPrice }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      handleRemoveItem(productId, variantId);
    } else {
      setCartItems(prev => prev.map(i => i.product.id === productId && i.variantId === variantId ? { ...i, quantity: Math.min(99, quantity) } : i));
    }
  };

  const handleRemoveItem = (productId: string, variantId?: string) => {
    setCartItems(prev => prev.filter(i => !(i.product.id === productId && i.variantId === variantId)));
  };

  // L2 — ajout panier global en 1 geste (réassort étagère, notifications…).
  // Le page émettrice porte déjà l'objet produit ; App ne fait que l'ajouter,
  // la mesure (analytics) et ouvrir le panier comme tout autre ajout.
  useEffect(() => {
    const onCartAdd = (event: Event) => {
      const detail = (event as CustomEvent<{ product?: Product; variant?: ProductVariant }>).detail;
      if (detail?.product?.id) handleAddToCart(detail.product, detail.variant);
    };
    window.addEventListener('kurla:cart:add', onCartAdd);
    return () => window.removeEventListener('kurla:cart:add', onCartAdd);
  // handleAddToCart est stable (state setter fonctionnel) : l'écoute ne se
  // recrée pas à chaque rendu.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Une erreur d'infrastructure (API absente du domaine, passerelle en panne)
  // est remontée par l'intercepteur : elle est affichée telle quelle, car un
  // code d'hébergeur brut ne dit rien à l'utilisateur.
  const [apiFailure, setApiFailure] = useState<string | null>(null);

  useEffect(() => {
    const onApiFailure = (event: Event) => {
      const detail = (event as CustomEvent<ApiFailureDetail>).detail;
      setApiFailure(detail?.message || 'Le serveur KURLA n’est pas joignable.');
    };
    window.addEventListener(API_UNAVAILABLE_EVENT, onApiFailure);
    return () => window.removeEventListener(API_UNAVAILABLE_EVENT, onApiFailure);
  }, []);

  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  // Résolution déclarative : la table de routes porte à la fois le composant,
  // l'exigence d'authentification et les métadonnées. Une URL inconnue donne
  // `null`, et c'est le seul cas où la page 404 est rendue.
  const resolved = resolveRoute(pathname);
  useDocumentMeta(resolved ? resolved.meta : null);

  const renderView = () => {
    if (!resolved) return <NotFoundPage />;

    const context: RouteContext = {
      params: resolved.params,
      search: new URLSearchParams(typeof window !== 'undefined' ? window.location.search : (ssrRequestContext()?.search || '')),
      onAddToCart: handleAddToCart,
    };
    const view = (
      <Suspense fallback={<PageLoader />}>
        {resolved.entry.render(context)}
      </Suspense>
    );

    if (!resolved.entry.auth) return view;
    return (
      <ProtectedRoute
        allowedRoles={resolved.entry.auth.roles}
        requiredRoleLabel={resolved.entry.auth.roleLabel}
      >
        {view}
      </ProtectedRoute>
    );
  };

  const PageLoader = () => (
    <div className="min-h-[60vh] flex items-center justify-center bg-kurla-ivory">
      <div className="flex flex-col items-center gap-3 text-kurla-copper">
        <div className="w-8 h-8 border-3 border-kurla-copper/30 border-t-kurla-copper rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest font-semibold">KURLA</span>
      </div>
    </div>
  );

  const handleCheckout = async () => {
    // Handled directly inside CartDrawer with full status & error state management
  };

  return (
      <div className="min-h-screen bg-kurla-ivory text-kurla-carbon font-sans selection:bg-kurla-copper selection:text-white">
        <Navbar
          cartCount={cartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          currentPath={pathname}
        />

        <DevDemoBanner />

        {apiFailure && (
          <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(680px,92vw)] rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 text-left">
                <p className="text-[13px] font-semibold text-kurla-carbon">Service KURLA indisponible</p>
                <p className="text-[12px] leading-relaxed text-neutral-600 mt-0.5">{apiFailure}</p>
              </div>
              <button
                type="button"
                onClick={() => setApiFailure(null)}
                className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-kurla-carbon"
                aria-label="Fermer l’alerte"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <React.Fragment key={locationKey}>{renderView()}</React.Fragment>

        <Footer />

        {/* Global Drawers & Modals — chargés après le premier paint */}
        <Suspense fallback={null}>
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onAddItem={handleAddToCart}
            onCheckout={handleCheckout}
          />
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
          />
          <AiAssistantWidget />
          <AbandonedCartReminder count={cartCount} onOpenCart={() => setIsCartOpen(true)} />
          <PasswordRecoveryPanel />
        </Suspense>
      </div>
  );
}

export function App() {
  // I18nProvider au-dessus d'AuthProvider : la locale vient de l'URL et doit
  // être disponible même quand la session est en cours de résolution, sinon le
  // chrome clignote en français avant de basculer.
  return (
    <I18nProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
