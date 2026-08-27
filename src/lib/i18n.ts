/**
 * CHANTIER 7.5 — internationalisation : utilitaires purs de locale.
 *
 * Aucune dépendance React : la détection de locale, la construction de chemins
 * localisés et les alternates hreflang doivent pouvoir être exercées par les
 * bancs et, plus tard, par les scripts de build (sitemap/prérendu) sans monter
 * quoi que ce soit.
 *
 * Convention : le français est la locale par défaut et n'est PAS préfixée
 * (`/boutique`) ; les autres locales sont préfixées (`/en/boutique`). Cela évite
 * de casser les URLs historiques déjà référencées.
 */

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export interface SplitPath {
  locale: Locale;
  /** Chemin sans le préfixe de locale, commence par `/`. */
  rest: string;
}

/**
 * Sépare un préfixe de locale d'un pathname. `/en/boutique` → `{ en, /boutique }` ;
 * `/boutique` → `{ fr, /boutique }`.
 */
export function splitLocale(pathname: string): SplitPath {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    const rest = '/' + segments.slice(1).join('/');
    return { locale: segments[0], rest: rest === '/' ? '/' : rest };
  }
  return { locale: DEFAULT_LOCALE, rest: pathname === '' ? '/' : pathname };
}

/**
 * Construit le chemin public d'une route pour une locale. La locale par défaut
 * rend le chemin nu afin de préserver les URLs historiques.
 */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  if (clean === '/') return `/${locale}`;
  return `/${locale}${clean}`;
}

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

/**
 * Alternates hreflang pour une route (chemin de base, sans locale). Inclut
 * `x-default` pointant la locale par défaut, comme recommandé pour la page
 * d'entrée quand l'URL n'est pas localisée.
 */
export function hreflangAlternates(basePath: string, siteUrl: string): HreflangAlternate[] {
  // Le type explicite est nécessaire : sans lui, `hreflang` est inféré comme
  // `'fr' | 'en'` et `'x-default'` ne peut plus être ajouté.
  const alternates: HreflangAlternate[] = LOCALES.map(locale => ({
    hreflang: locale,
    href: `${siteUrl}${localizedPath(basePath, locale)}`,
  }));
  alternates.push({
    hreflang: 'x-default',
    href: `${siteUrl}${localizedPath(basePath, DEFAULT_LOCALE)}`,
  });
  return alternates;
}
