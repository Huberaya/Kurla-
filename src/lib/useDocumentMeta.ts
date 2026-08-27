import { useEffect } from 'react';
import type { RouteMetaMatch } from './routeMeta';
import type { Locale } from './i18n';
import { localizeRouteMeta } from './routeTranslations';

/**
 * Application des métadonnées de route au document.
 *
 * Le rendu reste côté client dans ce sous-chantier : le prérendu (sous-chantier
 * suivant) injectera ces mêmes valeurs dans le HTML statique au build. Le
 * crochet est écrit pour être idempotent et sans effet de bord résiduel, afin
 * que les deux chemins produisent exactement le même `<head>`.
 */

const SITE_NAME = 'KURLA Beauty';
/** `og:locale` au format attendu par Open Graph (`langue_PAYS`). */
const OG_LOCALE: Record<Locale, string> = { fr: 'fr_FR', en: 'en_GB' };
const DEFAULT_OG_IMAGE = '/og-default.png';

/**
 * Synchronise les `<link rel="alternate" hreflang>` : on retire ceux qui ne
 * font plus partie de la route courante, sinon les alternates d'une page
 * traduite restent collés à la page suivante après une navigation.
 */
function syncHreflang(alternates: { hreflang: string; href: string }[]): void {
  document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]').forEach(el => {
    el.remove();
  });
  alternates.forEach(({ hreflang, href }) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    document.head.appendChild(link);
  });
}

function upsertMeta(selector: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${selector}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(selector, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function removeMeta(selector: 'name' | 'property', key: string): void {
  document.head.querySelector(`meta[${selector}="${key}"]`)?.remove();
}

/**
 * Injecte ou remplace un bloc JSON-LD identifié, pour que les appels successifs
 * ne créent pas de doublons. Le `type` est imposé : c'est lui qui rend le bloc
 * lisible par les moteurs sans être exécuté.
 */
function upsertJsonLd(id: string, data: unknown): void {
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string): void {
  document.getElementById(id)?.remove();
}

function organizationJsonLd(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: origin,
    logo: `${origin}/og-default.png`,
    description:
      'Plateforme européenne dédiée aux cheveux texturés, peaux riches en mélanine et beauté afro/multiculturelle.',
  };
}

function websiteJsonLd(origin: string, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: origin,
    inLanguage: locale,
  };
}

function absoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

/**
 * Applique titre, description, canonique, robots et Open Graph.
 *
 * Les pages non indexables reçoivent `noindex, nofollow` : un espace compte ou
 * une confirmation de commande n'a rien à faire dans un index, et le signaler
 * explicitement évite qu'un moteur ne les découvre via un lien interne.
 */
export function useDocumentMeta(match: RouteMetaMatch | null): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!match) {
      document.title = 'Page introuvable | KURLA Beauty';
      upsertMeta('name', 'description', 'Cette page n’existe pas ou n’existe plus.');
      upsertMeta('name', 'robots', 'noindex, nofollow');
      removeMeta('property', 'og:url');
      document.head.querySelector('link[rel="canonical"]')?.remove();
      syncHreflang([]);
      return;
    }

    const origin = typeof window === 'undefined' ? '' : window.location.origin;

    // La locale pilote la langue déclarée, le titre et le canonique. Une route
    // non traduite garde son canonique français : on ne crée pas de doublon.
    const localized = localizeRouteMeta(match.meta, match.locale, match.basePath, origin);
    const { meta, canonicalPath, alternates } = localized;

    document.documentElement.lang = match.locale;
    document.title = meta.title;
    upsertMeta('name', 'description', meta.description);
    upsertMeta(
      'name',
      'robots',
      meta.indexable ? 'index, follow' : 'noindex, nofollow'
    );

    const canonical = absoluteUrl(canonicalPath);
    upsertLink('canonical', canonical);
    syncHreflang(meta.indexable ? alternates : []);

    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', OG_LOCALE[match.locale]);
    upsertMeta('property', 'og:type', canonicalPath === '/' ? 'website' : 'article');
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);

    // Une page non indexable ne doit pas non plus être partageable comme
    // contenu : son URL contient souvent un identifiant de session.
    if (meta.indexable) {
      upsertMeta('property', 'og:url', canonical);
      upsertMeta('property', 'og:image', absoluteUrl(DEFAULT_OG_IMAGE));
      upsertMeta('name', 'twitter:card', 'summary_large_image');
      upsertMeta('name', 'twitter:title', meta.title);
      upsertMeta('name', 'twitter:description', meta.description);
      // Données structurées de base : l'identité du site. Les types par page
      // (Product, Article, BreadcrumbList) suivront avec le prérendu du
      // sous-chantier 7.3, quand ils pourront être injectés dans le HTML statique.
      upsertJsonLd('ld-organization', organizationJsonLd(origin));
      upsertJsonLd('ld-website', websiteJsonLd(origin, match.locale));
    } else {
      removeMeta('property', 'og:url');
      removeMeta('property', 'og:image');
      removeMeta('name', 'twitter:card');
      removeMeta('name', 'twitter:title');
      removeMeta('name', 'twitter:description');
      removeJsonLd('ld-organization');
      removeJsonLd('ld-website');
    }
  }, [
    match?.canonicalPath,
    match?.locale,
    match?.meta.title,
    match?.meta.description,
    match?.meta.indexable,
    match,
  ]);
}
