import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, User, Users, Menu, X, Sparkles, ChevronRight, LogOut, ShieldCheck, Lock, CalendarDays, NotebookPen, Package, Droplets , Scissors } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { AuthModal } from './AuthModal';
import { useI18n } from '../lib/I18nProvider';
import { localizedPath, splitLocale, type Locale } from '../lib/i18n';

/**
 * Sélecteur de langue.
 *
 * Un `button` plutôt qu'un lien : la bascule doit fonctionner sur la page
 * courante (on reste où l'on est, seule la locale change) et ne dépend pas
 * d'une version anglaise existante. `aria-pressed` dit aux lecteurs d'écran
 * quelle langue est active.
 */
const LanguageSwitcher: React.FC<{
  locale: Locale;
  locales: readonly Locale[];
  onSwitch: (locale: Locale) => void;
  scrolled: boolean;
}> = ({ locale, locales, onSwitch, scrolled }) => (
  <div
    role="group"
    aria-label="Langue / Language"
    className={`flex items-center rounded-full border px-1 py-0.5 ${
      scrolled ? 'border-kurla-stone bg-kurla-sand' : 'border-white/20 bg-white/10'
    }`}
  >
    {locales.map((option) => {
      const isActive = option === locale;
      return (
        <button
          key={option}
          type="button"
          onClick={() => onSwitch(option)}
          aria-pressed={isActive}
          title={option === 'fr' ? 'Français' : 'English'}
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${
            isActive
              ? 'bg-kurla-copper text-white'
              : scrolled
                ? 'text-kurla-carbon/60 hover:text-kurla-copper'
                : 'text-white/70 hover:text-white'
          }`}
        >
          {option}
        </button>
      );
    })}
  </div>
);

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
  const { locale, locales, t, switchTo } = useI18n();
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

  // Les chemins restent non préfixés : c'est `localizedPath` qui ajoute la
  // locale au moment du rendu. Le libellé, lui, vient du dictionnaire.
  const primaryNavLinks = [
    { label: t('nav.diagnostic'), path: '/diagnostic/cheveux' },
    { label: 'Peau', path: '/peau' },
    { label: t('nav.assistant'), path: '/assistant-beaute' },
    { label: t('nav.shop'), path: '/boutique' },
    { label: t('nav.inspirations'), path: '/inspirations' },
    { label: t('nav.tools'), path: '/outils' },
    { label: t('nav.pro'), path: '/professionnels' },
  ];

  const subModules = [
    { label: t('nav.ingredients'), path: '/ingredients' },
    { label: t('nav.kids'), path: '/kids' },
    { label: t('nav.protectiveStyles'), path: '/protective-styles' },
    { label: t('nav.melaninSkin'), path: '/melanin-skin' },
    { label: t('nav.men'), path: '/hommes' },
    { label: t('nav.family'), path: '/famille' },
    { label: t('nav.app'), path: '/application' },
  ];

  // L'état actif se compare sur le chemin sans locale, sinon depuis /en/ plus
  // aucun lien ne se surligne.
  const activePath = splitLocale(currentPath).rest;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-kurla-ivory/95 backdrop-blur-md border-b border-kurla-stone py-3 shadow-sm text-kurla-carbon'
          : 'bg-gradient-to-b from-kurla-ink/80 via-kurla-ink/40 to-transparent py-4 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a href={localizedPath('/', locale)} className="flex items-center gap-2.5 group shrink-0" aria-label="KURLA Beauty — accueil">
          <Logo
            variant="lockup"
            tone={scrolled ? 'dark' : 'light'}
            height={34}
            className="shrink-0 group-hover:opacity-90 transition-opacity"
            title=""
          />
          <div className="flex flex-col">
            <span className={`text-[9px] uppercase tracking-widest font-medium ${
              scrolled ? 'text-kurla-carbon/60' : 'text-white/60'
            }`}>
              Afro & Melanin Beauty-Tech
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {primaryNavLinks.map((link) => {
            const isActive = activePath === link.path;
            return (
              <a
                key={link.path}
                href={localizedPath(link.path, locale)}
                className={`text-xs font-semibold transition-colors relative py-1 ${
                  scrolled
                    ? isActive ? 'text-kurla-copper' : 'text-kurla-carbon/85 hover:text-kurla-copper'
                    : isActive ? 'text-kurla-amber' : 'text-white/90 hover:text-white'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-kurla-copper rounded-full" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right Action Icons & Copper CTA */}
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher locale={locale} locales={locales} onSwitch={switchTo} scrolled={scrolled} />

          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className={`p-2 rounded-full transition-colors ${
              scrolled ? 'text-kurla-carbon hover:bg-kurla-sand' : 'text-white hover:bg-white/10'
            }`}
            title={t('nav.search')}
            aria-label={t('nav.search')}
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
                    ? 'bg-kurla-sand text-kurla-carbon border border-kurla-stone hover:border-kurla-copper'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                }`}
                title="Mon Espace KURLA"
              >
                <div className="w-5 h-5 rounded-full bg-kurla-copper text-white flex items-center justify-center font-bold text-[10px]">
                  {profile?.first_name ? profile.first_name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'K')}
                </div>
                <span className="hidden sm:inline">
                  {profile?.first_name || user?.email?.split('@')[0]}
                </span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-kurla-espresso border border-kurla-copper/30 shadow-2xl py-2 z-50 text-kurla-cream text-xs space-y-1">
                  <div className="px-4 py-2 border-b border-kurla-cream/10">
                    <p className="font-semibold text-sm text-kurla-cream">
                      {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Compte KURLA'}
                    </p>
                    <p className="text-[11px] text-kurla-cream/50 truncate">{profile?.email || user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-kurla-copper/20 text-kurla-amber text-[10px] font-mono font-bold uppercase">
                      Rôle : {profile?.role || 'customer'}
                    </span>
                  </div>

                  <a
                    href="/account"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <User className="w-3.5 h-3.5 text-kurla-copper" /> Mon Compte & Routines
                  </a>
                  <a
                    href="/famille"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Users className="w-3.5 h-3.5 text-kurla-amber" /> Espace Famille
                  </a>
                  <a
                    href="/account/kurla-id"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-kurla-amber" /> Mon KURLA ID
                  </a>
                  <a
                    href="/account/routine-tracker"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-kurla-copper" /> Ma routine adaptative
                  </a>
                  <a
                    href="/account/progress"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <NotebookPen className="w-3.5 h-3.5 text-kurla-amber" /> Mon journal de progression
                  </a>
                  <a
                    href="/account/shelf"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Package className="w-3.5 h-3.5 text-kurla-copper" /> Mon étagère (Shelf)
                  </a>
                  <a
                    href="/account/wash-day"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Droplets className="w-3.5 h-3.5 text-kurla-amber" /> Mon wash day
                  </a>
                  <a
                    href="/account/protective-timeline"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Scissors className="w-3.5 h-3.5 text-kurla-amber" /> Coiffures protectrices
                  </a>
                  <a
                    href="/recherche"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Search className="w-3.5 h-3.5 text-kurla-copper" /> Recherche par intention
                  </a>
                  <a
                    href="/routine-builder"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-kurla-amber" /> Construire ma routine
                  </a>
                  <a
                    href="/cout-routine"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-kurla-amber" /> Coût de ma routine
                  </a>
                  <a
                    href="/pros-verifies"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-kurla-amber" /> Pros vérifiés
                  </a>
                  <a
                    href="/mes-reservations"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-kurla-cream/10 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-kurla-amber" /> Mes réservations
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

                  <div className="pt-1 border-t border-kurla-cream/10">
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
                  ? 'bg-kurla-sand hover:bg-kurla-copper text-kurla-carbon hover:text-white border border-kurla-stone'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <User className="w-3.5 h-3.5 text-kurla-copper" />
              <span className="hidden sm:inline">{t('nav.login')}</span>
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
              scrolled ? 'text-kurla-carbon hover:bg-kurla-sand' : 'text-white hover:bg-white/10'
            }`}
            title="Panier"
            aria-label="Panier"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-kurla-copper text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Primary Copper CTA: Diagnostic Gratuit */}
          <a
            href={localizedPath('/diagnostic/cheveux', locale)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-semibold tracking-wide shadow-md shadow-kurla-copper/20 transition-all transform hover:-translate-y-0.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> {t('nav.diagnosticCta')}
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-kurla-carbon' : 'text-white'
            }`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Extended Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-kurla-ivory border-b border-kurla-stone px-6 py-6 space-y-4 animate-in slide-in-from-top duration-300 text-kurla-carbon">
          <nav className="flex flex-col space-y-2">
            {primaryNavLinks.map((link) => (
              <a
                key={link.path}
                href={localizedPath(link.path, locale)}
                className="text-sm font-semibold text-kurla-carbon hover:text-kurla-copper py-2 border-b border-kurla-stone flex items-center justify-between"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
                <ChevronRight className="w-4 h-4 text-kurla-carbon/40" />
              </a>
            ))}
          </nav>

          <div className="pt-2">
            <span className="text-[10px] uppercase font-bold text-kurla-copper tracking-wider block mb-2">
              {t('nav.spaces')}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {subModules.map((sub) => (
                <a
                  key={sub.path}
                  href={localizedPath(sub.path, locale)}
                  className="p-2.5 rounded-xl bg-kurla-sand border border-kurla-stone font-semibold text-kurla-carbon hover:border-kurla-copper text-center"
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
              className="w-full py-3 rounded-xl bg-kurla-carbon text-white text-center text-xs font-semibold flex items-center justify-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="w-4 h-4 text-kurla-copper" /> Accéder à mon KURLA ID
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a href="/account/routine-tracker" className="py-2.5 rounded-xl border border-kurla-stone text-kurla-carbon text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><CalendarDays className="w-3.5 h-3.5 inline mr-1 text-kurla-copper" /> Routine</a>
              <a href="/account/progress" className="py-2.5 rounded-xl border border-kurla-stone text-kurla-carbon text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><NotebookPen className="w-3.5 h-3.5 inline mr-1 text-kurla-copper" /> Journal</a>
              <a href="/account/shelf" className="py-2.5 rounded-xl border border-kurla-stone text-kurla-carbon text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><Package className="w-3.5 h-3.5 inline mr-1 text-kurla-copper" /> Étagère</a>
              <a href="/account/wash-day" className="py-2.5 rounded-xl border border-kurla-stone text-kurla-carbon text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><Droplets className="w-3.5 h-3.5 inline mr-1 text-kurla-copper" /> Wash day</a>
              <a href="/account/protective-timeline" className="py-2.5 rounded-xl border border-kurla-stone text-kurla-carbon text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><Scissors className="w-3.5 h-3.5 inline mr-1 text-kurla-copper" /> Protectrices</a>
              <a href="/recherche" className="py-2.5 rounded-xl border border-kurla-stone text-kurla-carbon text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><Search className="w-3.5 h-3.5 inline mr-1 text-kurla-copper" /> Recherche</a>
              <a href="/routine-builder" className="py-2.5 rounded-xl border border-kurla-stone text-kurla-carbon text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><Sparkles className="w-3.5 h-3.5 inline mr-1 text-kurla-copper" /> Ma routine</a>
              <a href="/cout-routine" className="py-2.5 rounded-xl border border-kurla-stone text-kurla-carbon text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><Sparkles className="w-3.5 h-3.5 inline mr-1 text-kurla-copper" /> Coût routine</a>
              <a href="/pros-verifies" className="py-2.5 rounded-xl border border-kurla-stone text-kurla-carbon text-center text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}><Sparkles className="w-3.5 h-3.5 inline mr-1 text-kurla-copper" /> Pros vérifiés</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
