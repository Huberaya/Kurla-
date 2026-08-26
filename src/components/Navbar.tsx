import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, User, Menu, X, Sparkles, ChevronRight, LogOut, ShieldCheck, Lock, CalendarDays, NotebookPen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  currentPath?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  onOpenSearch,
  currentPath = '/'
}) => {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const primaryNavLinks = [
    { label: 'Diagnostic', href: '/diagnostic/cheveux' },
    { label: 'Assistant IA', href: '/assistant-beaute' },
    { label: 'Boutique', href: '/boutique' },
    { label: 'Outils', href: '/outils' },
    { label: 'KURLA Pro', href: '/professionnels' },
    { label: 'Communauté', href: '/community' },
  ];

  const subModules = [
    { label: 'KURLA Kids', href: '/kids' },
    { label: 'Protective Styles', href: '/protective-styles' },
    { label: 'Peaux Mélaninées', href: '/melanin-skin' },
    { label: 'Hommes Grooming', href: '/hommes' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E8E1DA] py-3 shadow-sm text-[#111111]'
          : 'bg-gradient-to-b from-[#050403]/80 via-[#050403]/40 to-transparent py-4 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#3A2218] via-[#C8753D] to-[#D49A63] flex items-center justify-center text-white font-serif-title font-bold text-lg shadow-md shadow-[#C8753D]/30 group-hover:scale-105 transition-transform">
            K
          </div>
          <div className="flex flex-col">
            <span className={`font-serif-title text-xl font-bold tracking-tight transition-colors ${
              scrolled ? 'text-[#111111] group-hover:text-[#C8753D]' : 'text-white group-hover:text-[#D49A63]'
            }`}>
              KURLA <span className="font-sans font-light text-xs tracking-widest uppercase text-[#C8753D]">Beauty</span>
            </span>
            <span className={`text-[9px] uppercase tracking-widest font-medium ${
              scrolled ? 'text-[#111111]/60' : 'text-white/60'
            }`}>
              Afro & Melanin Beauty-Tech
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {primaryNavLinks.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <a
                key={link.label}
                href={link.href}
                className={`text-xs font-semibold transition-colors relative py-1 ${
                  scrolled
                    ? isActive ? 'text-[#C8753D]' : 'text-[#111111]/85 hover:text-[#C8753D]'
                    : isActive ? 'text-[#D49A63]' : 'text-white/90 hover:text-white'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8753D] rounded-full" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right Action Icons & Copper CTA */}
        <div className="flex items-center gap-2.5">
          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className={`p-2 rounded-full transition-colors ${
              scrolled ? 'text-[#111111] hover:bg-[#F8F2EC]' : 'text-white hover:bg-white/10'
            }`}
            title="Rechercher"
            aria-label="Rechercher"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Account / User Menu */}
          {user || profile ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`px-3 py-1.5 rounded-full transition-all text-xs font-semibold flex items-center gap-2 ${
                  scrolled
                    ? 'bg-[#F8F2EC] text-[#111111] border border-[#E8E1DA] hover:border-[#C8753D]'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                }`}
                title="Mon Espace KURLA"
              >
                <div className="w-5 h-5 rounded-full bg-[#C8753D] text-white flex items-center justify-center font-bold text-[10px]">
                  {profile?.first_name ? profile.first_name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'K')}
                </div>
                <span className="hidden sm:inline">
                  {profile?.first_name || user?.email?.split('@')[0]}
                </span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#1A0F0A] border border-[#C8753D]/30 shadow-2xl py-2 z-50 text-[#FFF7EF] text-xs space-y-1">
                  <div className="px-4 py-2 border-b border-[#FFF7EF]/10">
                    <p className="font-semibold text-sm text-[#FFF7EF]">
                      {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Compte KURLA'}
                    </p>
                    <p className="text-[11px] text-[#FFF7EF]/50 truncate">{profile?.email || user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#C8753D]/20 text-[#D49A63] text-[10px] font-mono font-bold uppercase">
                      Rôle : {profile?.role || 'customer'}
                    </span>
                  </div>

                  <a
                    href="/account"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-[#FFF7EF]/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <User className="w-3.5 h-3.5 text-[#C8753D]" /> Mon Compte & Routines
                  </a>
                  <a
                    href="/account/kurla-id"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-[#FFF7EF]/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D49A63]" /> Mon KURLA ID
                  </a>
                  <a
                    href="/account/routine-tracker"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-[#FFF7EF]/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-[#C8753D]" /> Ma routine adaptative
                  </a>
                  <a
                    href="/account/progress"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-[#FFF7EF]/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <NotebookPen className="w-3.5 h-3.5 text-[#D49A63]" /> Mon journal de progression
                  </a>

                  {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                    <a
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-amber-400 hover:bg-amber-950/40 transition-colors font-bold"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Administration KURLA
                    </a>
                  )}

                  <div className="pt-1 border-t border-[#FFF7EF]/10">
                    <button
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await signOut();
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-950/40 transition-colors font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className={`px-3 py-1.5 rounded-full transition-all text-xs font-semibold flex items-center gap-1.5 ${
                scrolled
                  ? 'bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white border border-[#E8E1DA]'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#C8753D]" />
              <span className="hidden sm:inline">Connexion</span>
            </button>
          )}

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />

          {/* Cart Button with Counter */}
          <button
            onClick={onOpenCart}
            className={`relative p-2 rounded-full transition-colors ${
              scrolled ? 'text-[#111111] hover:bg-[#F8F2EC]' : 'text-white hover:bg-white/10'
            }`}
            title="Panier"
            aria-label="Panier"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-[#C8753D] text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Primary Copper CTA: Diagnostic Gratuit */}
          <a
            href="/diagnostic/cheveux"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold tracking-wide shadow-md shadow-[#C8753D]/20 transition-all transform hover:-translate-y-0.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Diagnostic (2 min)
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-[#111111]' : 'text-white'
            }`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Extended Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FFFDF9] border-b border-[#E8E1DA] px-6 py-6 space-y-4 animate-in slide-in-from-top duration-300 text-[#111111]">
          <nav className="flex flex-col space-y-2">
            {primaryNavLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-semibold text-[#111111] hover:text-[#C8753D] py-2 border-b border-[#E8E1DA] flex items-center justify-between"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
                <ChevronRight className="w-4 h-4 text-[#111111]/40" />
              </a>
            ))}
          </nav>

          <div className="pt-2">
            <span className="text-[10px] uppercase font-bold text-[#C8753D] tracking-wider block mb-2">
              Espaces Spécialisés
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {subModules.map((sub) => (
                <a
                  key={sub.label}
                  href={sub.href}
                  className="p-2.5 rounded-xl bg-[#F8F2EC] border border-[#E8E1DA] font-semibold text-[#111111] hover:border-[#C8753D] text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {sub.label}
                </a>
              ))}
            </div>
          </div>

          <div className="pt-3 flex flex-col gap-2">
            <a
              href="/account/kurla-id"
              className="w-full py-3 rounded-xl bg-[#111111] text-white text-center text-xs font-semibold flex items-center justify-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="w-4 h-4 text-[#C8753D]" /> Accéder à mon KURLA ID
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a href="/account/routine-tracker" className="py-2.5 rounded-xl border border-[#E8E1DA] text-[#111111] text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><CalendarDays className="w-3.5 h-3.5 inline mr-1 text-[#C8753D]" /> Routine</a>
              <a href="/account/progress" className="py-2.5 rounded-xl border border-[#E8E1DA] text-[#111111] text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><NotebookPen className="w-3.5 h-3.5 inline mr-1 text-[#C8753D]" /> Journal</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
