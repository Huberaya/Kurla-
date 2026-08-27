import { useEffect } from 'react';
import type { RouteMetaMatch } from './routeMeta';

/**
 * Application des métadonnées de route au document.
 *
 * Le rendu reste côté client dans ce sous-chantier : le prérendu (sous-chantier
 * suivant) injectera ces mêmes valeurs dans le HTML statique au build. Le
 * crochet est écrit pour être idempotent et sans effet de bord résiduel, afin
 * que les deux chemins produisent exactement le même `<head>`.
 */

const SITE_NAME = 'KURLA Beauty';
const LOCALE = 'fr_FR';
const DEFAULT_OG_IMAGE = '/og-default.png';

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

function websiteJsonLd(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: origin,
    inLanguage: LOCALE.split('_')[0],
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
      return;
    }

    const { meta, canonicalPath } = match;

    document.title = meta.title;
    upsertMeta('name', 'description', meta.description);
    upsertMeta(
      'name',
      'robots',
      meta.indexable ? 'index, follow' : 'noindex, nofollow'
    );

    const canonical = absoluteUrl(canonicalPath);
    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', LOCALE);
    upsertMeta('property', 'og:type', canonicalPath === '/' ? 'website' : 'article');
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);

    // Une page non indexable ne doit pas non plus être partageable comme
    // contenu : son URL contient souvent un identifiant de session.
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
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
      upsertJsonLd('ld-website', websiteJsonLd(origin));
    } else {
      removeMeta('property', 'og:url');
      removeMeta('property', 'og:image');
      removeMeta('name', 'twitter:card');
      removeMeta('name', 'twitter:title');
      removeMeta('name', 'twitter:description');
      removeJsonLd('ld-organization');
      removeJsonLd('ld-website');
    }
  }, [match?.canonicalPath, match?.meta.title, match?.meta.description, match?.meta.indexable, match]);
}
