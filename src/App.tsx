import React, { useRef, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './lib/I18nProvider';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { installClientSideRouting, onRouteChange } from './lib/router';
import { API_UNAVAILABLE_EVENT, ApiFailureDetail } from './lib/apiDiagnostics';
import { resolveRoute } from './lib/routeTable';
import type { RouteContext } from './lib/routeTable';
import { useDocumentMeta } from './lib/useDocumentMeta';
import { AlertTriangle } from 'lucide-react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { NotFoundPage } from './pages/NotFoundPage';
import { Footer } from './components/Footer';

// Modals & Widgets
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { PasswordRecoveryPanel } from './components/PasswordRecoveryPanel';
import { CartItem, Product, ProductVariant } from './types';

function AppContent() {
  const { user, session } = useAuth();
  // La clé inclut la query string : deux diagnostics différents partagent le
  // même pathname et doivent pourtant provoquer un nouveau rendu.
  const [locationKey, setLocationKey] = useState(() => `${window.location.pathname}${window.location.search}`);
  const pathname = locationKey.split('?')[0];
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('kurla_cart_items');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const initialCartRef = useRef<CartItem[]>(cartItems);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [anonId] = useState<string>(() => {
    let id = localStorage.getItem('kurla_anon_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('kurla_anon_id', id);
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

  useEffect(() => {
    let cancelled = false;

    const authHeaders: HeadersInit = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};

    const loadCart = async () => {
      setCartHydrated(false);
      try {
        // Read the guest cart without auth and the account cart with the
        // verified session in parallel. This lets a login merge both carts.
        const guestResponse = await fetch('/api/cart', {
          headers: { 'x-anonymous-id': anonId }
        });
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
          merged.set(key, {
            ...item,
            quantity: Math.min(99, (previous?.quantity || 0) + item.quantity)
          });
        });
        setCartItems(Array.from(merged.values()));
      } catch {
        // Keep the local cart available if the API is temporarily offline.
      } finally {
        if (!cancelled) setCartHydrated(true);
      }
    };

    loadCart();
    return () => {
      cancelled = true;
    };
  }, [anonId, user?.id]);

  // Persist the active cart only after the initial guest/account merge. When a
  // session exists, the server associates the cart with the verified user.
  useEffect(() => {
    if (!cartHydrated) return;
    try {
      localStorage.setItem('kurla_cart_items', JSON.stringify(cartItems));
    } catch (e) {}

    fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: 'Bearer ' + session.access_token } : {})
      },
      body: JSON.stringify({
        anonymousId: anonId,
        items: cartItems.map(i => ({ productId: i.product.id, variantId: i.variantId, quantity: i.quantity }))
      })
    }).catch(() => {});
  }, [cartItems, anonId, session?.access_token, cartHydrated]);

  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    const variantId = variant?.id;
    const unitPrice = variant?.price ?? product.price;
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
      search: new URLSearchParams(window.location.search),
      onAddToCart: handleAddToCart,
    };
    const view = resolved.entry.render(context);

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

  const handleCheckout = async () => {
    // Handled directly inside CartDrawer with full status & error state management
  };

  return (
      <div className="min-h-screen bg-[#FFFDF9] text-[#111111] font-sans selection:bg-[#C8753D] selection:text-white">
        <Navbar
          cartCount={cartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          currentPath={pathname}
        />

        {import.meta.env.DEV && !isSupabaseConfigured() && (
          <div role="status" className="fixed top-[72px] left-0 right-0 z-40 px-4 py-2 bg-amber-100 border-b border-amber-200 text-amber-950 text-center text-[11px] font-semibold">
            Mode démonstration : les données catalogue sont illustratives et le paiement réel n’est pas activé.
          </div>
        )}

        {apiFailure && (
          <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(680px,92vw)] rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 text-left">
                <p className="text-[13px] font-semibold text-[#111111]">Service KURLA indisponible</p>
                <p className="text-[12px] leading-relaxed text-neutral-600 mt-0.5">{apiFailure}</p>
              </div>
              <button
                type="button"
                onClick={() => setApiFailure(null)}
                className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-[#111111]"
                aria-label="Fermer l’alerte"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <React.Fragment key={locationKey}>{renderView()}</React.Fragment>

        <Footer />

        {/* Global Drawers & Modals */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
        />

        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />

        <AiAssistantWidget />

        {/*
          Monté au niveau de l'application, pas d'une page : le lien de
          réinitialisation dépose l'utilisateur sur le site à la racine
          (`site_url` + fragment), sans `redirect_to` garanti. Limité à la page
          compte, le panneau n'aurait été atteint par personne.
        */}
        <PasswordRecoveryPanel />
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
