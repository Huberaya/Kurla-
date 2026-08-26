import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
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

// Modals & Widgets
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { CartItem, Product } from './types';

export function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('kurla_cart_items');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
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

    // Initial server cart fetch
    fetch('/api/cart', {
      headers: { 'x-anonymous-id': anonId }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.items && data.items.length > 0) {
          setCartItems(data.items);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('popstate', handlePopState);
  }, [anonId]);

  // Persist cart to localStorage & public.carts / public.cart_items
  useEffect(() => {
    try {
      localStorage.setItem('kurla_cart_items', JSON.stringify(cartItems));
    } catch (e) {}

    fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymousId: anonId,
        items: cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity }))
      })
    }).catch(() => {});
  }, [cartItems, anonId]);

  const handleAddToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
    } else {
      setCartItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity } : i));
    }
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
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
    if (pathname === '/account/saved') return <ProtectedRoute><SavedPage /></ProtectedRoute>;
    if (pathname === '/account') return <ProtectedRoute><CustomerAccountPage /></ProtectedRoute>;

    // Specialized Category Modules
    if (pathname === '/kids') return <KidsModulePage />;
    if (pathname === '/protective-styles') return <ProtectiveStylesPage />;
    if (pathname === '/melanin-skin') return <MelaninSkinPage />;
    if (pathname === '/hommes') return <MenGroomingPage />;
    if (pathname === '/outils' || pathname === '/guides/outils') return <ToolsPage />;
    if (pathname === '/guides/ingredients') return <IngredientsGuidePage />;
    if (pathname === '/community') return <CommunityPage />;

    if (pathname === '/boutique') return <BoutiquePage onAddToCart={handleAddToCart} />;
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
    <AuthProvider>
      <div className="min-h-screen bg-[#FFFDF9] text-[#111111] font-sans selection:bg-[#C8753D] selection:text-white">
        <Navbar
          cartCount={cartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

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
    </AuthProvider>
  );
}

export default App;
