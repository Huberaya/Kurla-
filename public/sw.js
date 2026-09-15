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
 *
 *  4. LE CACHE PORTE LE NUMÉRO DE CONSTRUCTION (15/09/2026). Il s'appelait
 *     « kurla-shell-v1 » en dur : jamais invalidé, jamais vidé. Après une
 *     mise en ligne, le téléphone continuait de servir l'application
 *     précédente — une version dont les fichiers n'existent plus sur le
 *     serveur, ou qui ne connaît pas les adresses actuelles. Résultat : des
 *     pages blanches pour le visiteur, alors qu'un navigateur neuf affiche
 *     tout. Le nom du cache est donc estampillé à la compilation
 *     (`scripts/stampServiceWorker.ts`) : à chaque construction, l'étape
 *     d'activation vide les caches des constructions précédentes, et le
 *     secours hors ligne ne peut plus ressortir une vieille version.
 */
const CACHE = 'kurla-shell-__KURLA_BUILD__';
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

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'KURLA';
  const options = {
    body: data.body || 'Une nouvelle information KURLA est disponible.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'kurla-notification',
    data: { url: data.url || '/' },
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    })
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
          // Une erreur n'entre pas au cache : y mettre un 404 reviendrait à
          // le resservir ensuite, même une fois le réseau revenu.
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
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
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
      )
    );
  }
});
