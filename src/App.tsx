import React, { useRef, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { BenefitStrip } from './components/BenefitStrip';
import { HairSkinSection } from './components/landing/HairSkinSection';
import { ChooseNeedSection } from './components/ChooseNeedSection';
import { AIShowcase } from './components/landing/AIShowcase';
import { BoutiquePreviewSection } from './components/landing/BoutiquePreviewSection';
import { CommunitySection } from './components/landing/CommunitySection';
import { KidsMenSection } from './components/landing/KidsMenSection';
import { DiagnosticPreviewSection } from './components/DiagnosticPreviewSection';
import { RoutineCarouselSection } from './components/RoutineCarouselSection';
import { TextureGallerySection } from './components/TextureGallerySection';
import { BeautyHouseSection } from './components/BeautyHouseSection';
import { KurlaProSection } from './components/KurlaProSection';
import { UgcWallSection } from './components/UgcWallSection';
import { JournalSection } from './components/JournalSection';
import { WaitlistSection } from './components/WaitlistSection';
import { Footer } from './components/Footer';

// Pages
import { DiagnosticHairPage } from './pages/DiagnosticHairPage';
import { DiagnosticSkinPage } from './pages/DiagnosticSkinPage';
import { DiagnosticResultPage } from './pages/DiagnosticResultPage';
import { DiagnosticKidsPage } from './pages/DiagnosticKidsPage';
import { DiagnosticProtectivePage } from './pages/DiagnosticProtectivePage';
import { BoutiquePage } from './pages/BoutiquePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { RoutineDetailPage } from './pages/RoutineDetailPage';
import { ProfessionalsPage } from './pages/ProfessionalsPage';
import { ProProfilePage } from './pages/ProProfilePage';
import { ProApplicationPage } from './pages/ProApplicationPage';
import { JournalPage } from './pages/JournalPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { CustomerAccountPage } from './pages/CustomerAccountPage';
import { ProDashboardPage } from './pages/ProDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ManifestePage } from './pages/ManifestePage';

// Strategic Roadmap Pages
import { AiBeautyAssistantPage } from './pages/AiBeautyAssistantPage';
import { KurlaIdPage } from './pages/KurlaIdPage';
import { HairIdPage } from './pages/HairIdPage';
import { SkinIdPage } from './pages/SkinIdPage';
import { RoutineIdPage } from './pages/RoutineIdPage';
import { RoutineTrackerPage } from './pages/RoutineTrackerPage';
import { ProgressJournalPage } from './pages/ProgressJournalPage';
import { SavedPage } from './pages/SavedPage';
import { KidsModulePage } from './pages/KidsModulePage';
import { ProtectiveStylesPage } from './pages/ProtectiveStylesPage';
import { MelaninSkinPage } from './pages/MelaninSkinPage';
import { MenGroomingPage } from './pages/MenGroomingPage';
import { ToolsPage } from './pages/ToolsPage';
import { IngredientsGuidePage } from './pages/IngredientsGuidePage';
import { CommunityPage } from './pages/CommunityPage';
import { FamilySpacePage } from './pages/FamilySpacePage';
import { LegalPage } from './pages/LegalPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { ShelfPage } from './pages/ShelfPage';
import { WashDayPage } from './pages/WashDayPage';
import { SmartSearchPage } from './pages/SmartSearchPage';
import { RoutineBuilderPage } from './pages/RoutineBuilderPage';

// Modals & Widgets
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { CartItem, Product, ProductVariant } from './types';

function AppContent() {
  const { user, session } = useAuth();
  const [pathname, setPathname] = useState(window.location.pathname);
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

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
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
      window.removeEventListener('popstate', handlePopState);
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
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
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

  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  // Router matcher logic
  const renderView = () => {
    if (pathname === '/assistant-beaute') return <AiBeautyAssistantPage />;

    if (pathname === '/diagnostic/cheveux') return <DiagnosticHairPage />;
    if (pathname === '/diagnostic/peau') return <DiagnosticSkinPage />;
    if (pathname === '/diagnostic/enfant') return <DiagnosticKidsPage />;
    if (pathname === '/diagnostic/protective-style') return <DiagnosticProtectivePage />;
    if (pathname.startsWith('/diagnostic/resultat/')) return <DiagnosticResultPage />;

    // KURLA ID & Account Pages (Protected)
    if (pathname === '/account/kurla-id') return <ProtectedRoute><KurlaIdPage /></ProtectedRoute>;
    if (pathname === '/account/hair-id') return <ProtectedRoute><HairIdPage /></ProtectedRoute>;
    if (pathname === '/account/skin-id') return <ProtectedRoute><SkinIdPage /></ProtectedRoute>;
    if (pathname === '/account/routine-id') return <ProtectedRoute><RoutineIdPage /></ProtectedRoute>;
    if (pathname === '/account/routine-tracker') return <ProtectedRoute><RoutineTrackerPage /></ProtectedRoute>;
    if (pathname === '/account/progress') return <ProtectedRoute><ProgressJournalPage /></ProtectedRoute>;
    if (pathname === '/account/shelf') return <ProtectedRoute><ShelfPage /></ProtectedRoute>;
    if (pathname === '/account/wash-day') return <ProtectedRoute><WashDayPage /></ProtectedRoute>;
    if (pathname === '/recherche') return <ProtectedRoute><SmartSearchPage /></ProtectedRoute>;
    if (pathname === '/routine-builder') return <ProtectedRoute><RoutineBuilderPage /></ProtectedRoute>;
    if (pathname === '/account/saved') return <ProtectedRoute><SavedPage /></ProtectedRoute>;
    if (pathname === '/famille') return <ProtectedRoute requiredRoleLabel="membre de KURLA"><FamilySpacePage /></ProtectedRoute>;
    if (pathname === '/account') return <ProtectedRoute><CustomerAccountPage /></ProtectedRoute>;

    // Specialized Category Modules
    if (pathname === '/kids') return <KidsModulePage />;
    if (pathname === '/protective-styles') return <ProtectiveStylesPage />;
    if (pathname === '/melanin-skin') return <MelaninSkinPage />;
    if (pathname === '/hommes') return <MenGroomingPage />;
    if (pathname === '/outils' || pathname === '/guides/outils') return <ToolsPage />;
    if (pathname === '/guides/ingredients') return <IngredientsGuidePage />;
    if (pathname === '/community') return <CommunityPage />;

    if (pathname === '/boutique') {
      const params = new URLSearchParams(window.location.search);
      return <BoutiquePage onAddToCart={handleAddToCart} selectedCategory={params.get('category') || 'tous'} />;
    }
    if (pathname.startsWith('/produit/')) {
      const slug = pathname.replace('/produit/', '');
      return <ProductDetailPage slug={slug} onAddToCart={handleAddToCart} />;
    }

    if (pathname === '/routines') return <RoutinesPage />;
    if (pathname.startsWith('/routines/')) {
      const slug = pathname.replace('/routines/', '');
      return <RoutineDetailPage slug={slug} onAddToCart={handleAddToCart} />;
    }

    if (pathname === '/professionnels') return <ProfessionalsPage />;
    if (pathname === '/professionnels/rejoindre') return <ProApplicationPage />;
    if (pathname.startsWith('/professionnels/profil/')) {
      const slug = pathname.replace('/professionnels/profil/', '');
      return <ProProfilePage slug={slug} />;
    }

    if (pathname === '/journal') return <JournalPage />;
    if (pathname.startsWith('/journal/')) {
      const slug = pathname.replace('/journal/', '');
      return <ArticleDetailPage slug={slug} />;
    }

    if (pathname === '/pro/dashboard') {
      return (
        <ProtectedRoute allowedRoles={['professional', 'admin', 'superadmin']} requiredRoleLabel="professionnel certifié">
          <ProDashboardPage />
        </ProtectedRoute>
      );
    }

    if (pathname === '/admin') {
      return (
        <ProtectedRoute allowedRoles={['admin', 'superadmin']} requiredRoleLabel="administrateur">
          <AdminDashboardPage />
        </ProtectedRoute>
      );
    }
    if (pathname === '/manifeste') return <ManifestePage />;
    if (pathname === '/cgv') return <LegalPage kind="cgv" />;
    if (pathname === '/confidentialite') return <LegalPage kind="confidentialite" />;
    if (pathname === '/commande/confirmation') {
      const params = new URLSearchParams(window.location.search);
      return <OrderConfirmationPage sessionId={params.get('session_id') || undefined} orderId={params.get('order_id') || undefined} />;
    }

    if (pathname !== '/') return <NotFoundPage />;

    // Home Page Full Template Layout
    return (
      <main className="w-full overflow-hidden">
        <HeroSection />
        <BenefitStrip />
        <HairSkinSection />
        <ChooseNeedSection />
        <AIShowcase />
        <BoutiquePreviewSection />
        <CommunitySection />
        <KidsMenSection />
        <DiagnosticPreviewSection />
        <RoutineCarouselSection />
        <TextureGallerySection />
        <BeautyHouseSection />
        <KurlaProSection />
        <UgcWallSection />
        <JournalSection />
        <WaitlistSection />
      </main>
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

        {renderView()}

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
      </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
