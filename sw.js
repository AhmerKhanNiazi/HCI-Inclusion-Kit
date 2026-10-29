/**
 * sw.js — InclusionKit Service Worker
 * =====================================
 * Provides offline support and caching for the InclusionKit PWA.
 * Strategy: Cache-first for same-origin assets; Network-only for
 * cross-origin resources (CDNs, external fonts, images).
 */

const CACHE_NAME = 'inclusionkit-v1';

/**
 * Assets to pre-cache during the install phase.
 * These are the core app shell files needed to render the app offline.
 */
const PRE_CACHE_ASSETS = [
  '/',
  '/HCI-Inclusion-Kit/',
  '/HCI-Inclusion-Kit/index.html',
  '/HCI-Inclusion-Kit/css/style.css',
  '/HCI-Inclusion-Kit/js/state.js',
  '/HCI-Inclusion-Kit/js/colorFilters.js',
  '/HCI-Inclusion-Kit/js/typography.js',
  '/HCI-Inclusion-Kit/js/visualHaptics.js',
  '/HCI-Inclusion-Kit/js/wcagInspector.js',
  '/HCI-Inclusion-Kit/js/ecommerceDemo.js',
  '/HCI-Inclusion-Kit/js/voiceEngine.js',
  '/HCI-Inclusion-Kit/js/acousticEngine.js',
  '/HCI-Inclusion-Kit/js/app.js',
  '/HCI-Inclusion-Kit/favicon.svg',
  '/HCI-Inclusion-Kit/manifest.json',
];

// ---------------------------------------------------------------------------
// INSTALL — Pre-cache the app shell
// ---------------------------------------------------------------------------
/**
 * The install event fires when the service worker is first registered or
 * updated. We open (or create) the versioned cache and populate it with
 * all the app-shell assets defined above.
 *
 * `skipWaiting()` forces the new SW to activate immediately rather than
 * waiting for existing clients to close.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell assets...');
        return cache.addAll(PRE_CACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete. Skipping waiting phase.');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Pre-cache failed:', err);
      })
  );
});

// ---------------------------------------------------------------------------
// ACTIVATE — Clean up stale caches and claim all open clients
// ---------------------------------------------------------------------------
/**
 * The activate event fires after install, once any old service worker has
 * been replaced. We delete any caches whose name doesn't match the current
 * CACHE_NAME, preventing stale assets from being served.
 *
 * `clients.claim()` makes this SW immediately control all open tabs without
 * requiring a page reload.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME) // identify old/stale caches
            .map((staleName) => {
              console.log('[SW] Deleting stale cache:', staleName);
              return caches.delete(staleName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete. Claiming all clients.');
        return self.clients.claim();
      })
  );
});

// ---------------------------------------------------------------------------
// FETCH — Route requests using the appropriate caching strategy
// ---------------------------------------------------------------------------
/**
 * The fetch event intercepts every network request made by controlled pages.
 *
 * Routing logic:
 *  1. Cross-origin requests (Tailwind CDN, Google Fonts, Unsplash, etc.)
 *     → Network-only: always go to the network; no caching of third-party assets.
 *  2. Same-origin requests
 *     → Cache-first: serve from cache if available; fall back to network and
 *        store the fresh response in the cache for future use.
 */
self.addEventListener('fetch', (event) => {
  const requestURL = new URL(event.request.url);

  // --- Strategy 1: Network-only for cross-origin (CDN / external) requests ---
  if (requestURL.origin !== self.location.origin) {
    // Let the browser handle these normally; do not cache external resources.
    return; // No event.respondWith → browser uses its default network fetch
  }

  // --- Strategy 2: Cache-first for same-origin requests ---
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve the cached copy immediately (fast, offline-capable)
        return cachedResponse;
      }

      // Not in cache — fetch from network, cache the result, then return it
      return fetch(event.request)
        .then((networkResponse) => {
          // Only cache valid, non-opaque same-origin responses
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }

          // Clone the response: one copy for the cache, one for the browser
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((err) => {
          // Network failed and nothing in cache — log and propagate the error
          console.warn('[SW] Fetch failed for:', event.request.url, err);
          // Optionally return a custom offline fallback page here:
          // return caches.match('/HCI-Inclusion-Kit/offline.html');
        });
    })
  );
});
