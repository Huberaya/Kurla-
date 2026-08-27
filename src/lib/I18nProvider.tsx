/**
 * CHANTIER 7.5 — contexte de locale.
 *
 * La locale est pilotée par l'URL, pas par un état isolé : `/en/…` signifie
 * anglais, tout le reste est français. C'est la seule source qui reste cohérente
 * après un rechargement, un favori partagé, un lien indexé par Google ou une
 * arrivée directe sur une page prérendue — un `useState` sans lien avec l'URL
 * reviendrait au français à chaque navigation.
 *
 * `switchTo` réécrit l'URL via le routeur interne (sans rechargement) ; les
 * navigateurs et lecteurs d'écran voient donc un changement d'URL réel.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, isLocale, localizedPath, splitLocale, type Locale } from './i18n';
import { LOCALES } from './i18n';
import { navigate, onRouteChange } from './router';
import { translate } from './translations';

interface I18nValue {
  locale: Locale;
  /** Toutes les locales proposées, pour le sélecteur de langue. */
  locales: readonly Locale[];
  t: (key: string) => string;
  switchTo: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n doit être appelé dans I18nProvider');
  return ctx;
}

/** Raccourci pour les composants qui n'ont besoin que des libellés. */
export function useT(): (key: string) => string {
  return useI18n().t;
}

function initialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  return splitLocale(window.location.pathname).locale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  // Le routeur est la source de vérité : popstate, navigate() et liens
  // interceptés passent tous par `emit`, donc par ce callback.
  useEffect(() => onRouteChange(pathname => setLocale(splitLocale(pathname).locale)), []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const switchTo = useCallback((next: Locale) => {
    if (!isLocale(next) || typeof window === 'undefined') return;
    const { rest } = splitLocale(window.location.pathname);
    // preserveLocale: false — sinon la préservation de la locale courante
    // réintroduirait `/en` au moment même où l'on bascule vers le français.
    navigate(localizedPath(rest, next), { preserveLocale: false });
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, locales: LOCALES, t, switchTo }),
    [locale, t, switchTo],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
