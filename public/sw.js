// Minimal service worker. It exists so the site can be installed as an app and
// shows a friendly page when there is no connection. It deliberately does NOT
// cache pages, API calls or Supabase data — registrations, payments and
// balances must always come live from the server.
//
//  - page navigations: always network, fall back to /offline.html when offline
//  - the offline page and its icon: precached
//  - /assets/*: the build gives these content-hashed names, so a cached copy can
//    never be stale — serve them from cache for faster launches
//  - everything else (API, Supabase, fonts, non-GET): untouched

const CACHE = 'ilan-static-v2'
const OFFLINE_URL = '/offline.html'
const PRECACHED = [OFFLINE_URL, '/icon-192.png'] // what the offline page itself needs
const MAX_ASSETS = 80

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHED))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ilan-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trimAssets(cache) {
  const keys = await cache.keys()
  const assets = keys.filter(r => new URL(r.url).pathname.startsWith('/assets/'))
  // oldest entries first — drop the bundles of previous deploys
  await Promise.all(assets.slice(0, Math.max(0, assets.length - MAX_ASSETS)).map(r => cache.delete(r)))
}

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  if (PRECACHED.includes(url.pathname)) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit
        return fetch(req).then(res => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then(cache => cache.put(req, copy).then(() => trimAssets(cache)))
          }
          return res
        })
      }),
    )
  }
})
