/**
 * CHANTIER 8.7 — service worker de l'application mobile KURLA.
 *
 * Trois règles, par ordre d'importance :
 *
 *  1. LE SW NE MET JAMAIS /api/ EN CACHE. Les réponses de l'API portent des
 *     données personnelles et un jeton d'autorisation : les mettre en cache
 *     reviendrait à les poser sur le disque pour que n'importe quel autre
 *     écran du même navigateur les lise. Toute requête vers /api/ est servie
 *     par le réseau, et rien d'autre.
 *
 *  2. LES REQUÊTES CROISÉES NE SONT PAS MISES EN CACHE. Les polices Google sont
 *     décoratives : hors ligne, on s'en passe. On ne veut pas de réponses
 *     opaques stockées dont on ne contrôle ni l'origine ni le contenu.
 *
 *  3. LE RESTE EST UNE COQUILLE : la page d'accueil, le manifeste et les
 *     icônes suffisent à ouvrir l'application sans réseau. Le reste du
 *     cache est au format « réseau d'abord avec secours local » pour les
 *     navigations, et « cache d'abord » pour les assets de build (dont les
 *     noms sont hachés, donc immuables).
 */
const CACHE = 'kurla-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Règle 1 : l'API n'entre jamais en cache. Pas de secours hors ligne non
  // plus : mieux vaut un écran « hors ligne » honnête qu'un vieux résultat
  // personnel ressorti du disque.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Règle 2 : on ne met en cache que ce qui vient du même hôte.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigations : réseau d'abord, la coquille en secours.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // Assets de build : hachés, donc immuables. Cache d'abord.
  if (
    event.request.method === 'GET' &&
    (url.pathname.startsWith('/assets/') || /\.(png|jpe?g|webp|css|js|woff2?)$/.test(url.pathname))
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            return response;
          })
      )
    );
  }
});
