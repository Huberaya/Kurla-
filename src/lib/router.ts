/**
 * Routage interne KURLA.
 *
 * L'application n'utilise pas de bibliothèque de routage : `App.tsx` compare
 * `window.location.pathname` à une cascade de branches. Historiquement, chaque
 * lien interne était un `<a href>` ordinaire, donc un chargement de page
 * complet. Sur un hébergement statique sans repli SPA, cela renvoie la page
 * 404 de l'hébergeur dès le premier clic ; même avec un repli, cela recharge
 * toute l'application à chaque navigation.
 *
 * Ce module apporte les deux choses manquantes :
 * - `navigate()` : changement d'URL sans rechargement, via l'History API ;
 * - `installClientSideRouting()` : interception globale des liens internes,
 *   qui couvre les ~110 ancres existantes sans avoir à les réécrire une à une.
 *
 * Le repli serveur (`rewrites` de vercel.json, `sendFile` du serveur Express)
 * reste indispensable : il sert `index.html` pour une entrée directe, un
 * rechargement ou un favori. L'interception ne remplace pas ce repli, elle
 * évite seulement de le solliciter à chaque clic.
 */

import { DEFAULT_LOCALE, localizedPath, splitLocale } from './i18n';

type PathnameListener = (pathname: string) => void;

const listeners = new Set<PathnameListener>();
let installed = false;

/** Extensions servies comme fichiers : ne jamais les traiter comme des routes. */
const STATIC_EXTENSION = /\.(?:js|mjs|cjs|css|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|pdf|xml|txt|json|webmanifest|mp4|webm)(?:[?#]|$)/i;

function emit(pathname: string): void {
  listeners.forEach(listener => listener(pathname));
}

/**
 * Navigation interne. Une URL hors origine (Stripe, lien externe) bascule sur
 * un vrai rechargement : on ne cherche jamais à router en dehors de l'app.
 */
export function navigate(
  to: string,
  options: { replace?: boolean; preserveLocale?: boolean } = {},
): void {
  const target = new URL(to, window.location.origin);

  if (target.origin !== window.location.origin) {
    window.location.assign(target.href);
    return;
  }

  // Préserve la locale courante : depuis /en/, un lien interne nu (/boutique)
  // doit rester en anglais (/en/boutique), sinon chaque clic ramènerait au
  // français et la locale choisie ne tiendrait pas deux navigations.
  let pathname = target.pathname;
  const preserveLocale = options.preserveLocale !== false;
  const { locale: currentLocale } = splitLocale(window.location.pathname);
  if (preserveLocale && currentLocale !== DEFAULT_LOCALE
    && target.pathname.startsWith('/') && !target.pathname.startsWith('//')) {
    const { locale: targetLocale } = splitLocale(target.pathname);
    if (targetLocale === DEFAULT_LOCALE) {
      pathname = localizedPath(target.pathname, currentLocale);
    }
  }

  const sameLocation = pathname === window.location.pathname
    && target.search === window.location.search
    && target.hash === window.location.hash;
  if (sameLocation) return;

  const nextUrl = `${pathname}${target.search}${target.hash}`;
  if (options.replace) {
    window.history.replaceState(window.history.state, '', nextUrl);
  } else {
    window.history.pushState({}, '', nextUrl);
  }

  emit(pathname);
  // Une ancre interne doit atteindre sa cible ; sinon on repart en haut de page.
  if (target.hash) {
    const anchor = document.getElementById(target.hash.slice(1));
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}

/** S'abonne aux changements de route. Retourne la fonction de désabonnement. */
export function onRouteChange(listener: PathnameListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isInternalAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  if (anchor.getAttribute('rel')?.split(/\s+/).includes('external')) return false;

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  // Les API et les fichiers statiques ne sont pas des routes applicatives.
  if (href.startsWith('/api/')) return false;
  if (STATIC_EXTENSION.test(href)) return false;

  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;

  return true;
}

/**
 * Installe l'interception globale des liens internes. Idempotent : plusieurs
 * appels (tests, remount React en développement) ne posent qu'un écouteur.
 */
export function installClientSideRouting(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  document.addEventListener('click', event => {
    if (event.defaultPrevented) return;
    // Clic secondaire, ou ouverture demandée dans un autre onglet/fenêtre.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!isInternalAnchor(anchor)) return;

    event.preventDefault();
    navigate(anchor.getAttribute('href') as string);
  });

  window.addEventListener('popstate', () => {
    emit(window.location.pathname);
  });
}
