/* All Math Solver service worker
 * - makes the site installable as an app (Android / desktop / Google Play via TWA)
 * - pages, styles and recent history work offline; solving needs internet
 * - the blog (/blog, a separate WordPress site) is left completely alone
 * The server replaces __BUILD__ with a hash of the site files, so every deploy
 * installs a fresh cache automatically and old caches are removed.
 */
const BUILD = '__BUILD__';
const CORE = `ams-core-${BUILD}`;     // app shell, precached on install
const PAGES = `ams-pages-${BUILD}`;   // HTML pages (network first)
const CDN = 'ams-cdn-v1';             // KaTeX, MathLive, Font Awesome (rarely change)

const CORE_FILES = [
  '/',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/photo-tool.js',
  '/js/lang.js',
  '/js/site-routes.js',
  '/images/AMS_Solver.png',
  '/images/watermark-1920.webp',
  '/images/watermark-1024.webp',
  '/icons/icon-192.png',
  '/favicon.ico',
  '/site.webmanifest'
];

// Pages cached in the background after install so they open offline too
const EXTRA_PAGES = [
  '/mathematical-induction-solver', '/quadratic-equation-calculator', '/lcm-calculator', '/gcf-calculator',
  '/percentage-calculator', '/proportion-calculator', '/age-calculator', '/ac-to-dc-calculator',
  '/about', '/contact', '/privacy-policy', '/terms-and-conditions', '/disclaimer', '/cookie-policy', '/site-map'
];

const CDN_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const core = await caches.open(CORE);
    await core.addAll(CORE_FILES.map(u => new Request(u, { cache: 'reload' })));
    const pages = await caches.open(PAGES);
    // best effort: a page that fails to download is simply cached later when visited
    await Promise.allSettled(EXTRA_PAGES.map(u => fetch(u, { cache: 'reload' }).then(r => r.ok && pages.put(u, r))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [CORE, PAGES, CDN];
    for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

const isHtml = (req) => req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

// Same page with or without ?source=app etc.
const pageKey = (url) => url.origin + url.pathname;

async function networkFirstPage(event) {
  const req = event.request;
  const url = new URL(req.url);
  const cache = await caches.open(PAGES);
  try {
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    const res = preload || await fetch(req);
    if (res && res.ok && res.type === 'basic') cache.put(pageKey(url), res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(pageKey(url)) || await caches.match(pageKey(url), { ignoreSearch: true });
    if (cached) return cached;
    if (url.pathname === '/') { const home = await caches.match('/'); if (home) return home; }
    return (await caches.match('/offline.html')) || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function networkFirstAsset(req) {
  const cache = await caches.open(CORE);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res && res.ok) { cache.put(req, res.clone()); return res; }
    throw new Error('bad response');
  } catch (e) {
    return (await cache.match(req, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true })) || new Response('', { status: 504 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreSearch: true });
  const network = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await network) || new Response('', { status: 504 });
}

const offlineJson = () => new Response(JSON.stringify({
  success: false,
  offline: true,
  error: "You're offline. Solving needs an internet connection; your saved pages and recent history still work."
}), { status: 503, headers: { 'Content-Type': 'application/json' } });

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Same-origin API: always live (never cached); a friendly answer when offline
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req).catch(offlineJson));
    return;
  }
  if (req.method !== 'GET') return;

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/admin') || url.pathname === '/sw.js') return; // never cache these
    if (url.pathname === '/blog' || url.pathname.startsWith('/blog/')) return; // WordPress blog: always straight to the network
    if (isHtml(req)) { event.respondWith(networkFirstPage(event)); return; }
    // the site's own scripts and styles: newest first, so they always match the page
    // (stale copies after an update made new buttons do nothing); saved copy when offline
    if (/\.(?:js|css)$/.test(url.pathname)) { event.respondWith(networkFirstAsset(req)); return; }
    event.respondWith(staleWhileRevalidate(req, CORE));
    return;
  }

  if (CDN_HOSTS.includes(url.hostname)) {
    // use the saved copy straight away and refresh it in the background, so a bad download
    // (which the browser can't always see, for cross-site files) never gets stuck in the cache
    event.respondWith(staleWhileRevalidate(req, CDN));
  }
  // everything else (Google sign-in, Google Translate, Web3Forms) goes straight to the network
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
