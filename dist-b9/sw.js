const BUILD = 'B9';
const ASSETS = ["css/app.css","fixtures/t08.html","icons/apple-touch.png","icons/icon-192.png","icons/icon-512.png","index.html","js/app.js","js/build-info.js","js/db.js","js/domain.js","js/offline.js","manifest.webmanifest"];
const PREFIX = `masareek-spike:${self.registration.scope}:assets:`;
const CACHE = PREFIX + BUILD;
const assetURLs = ASSETS.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assetURLs.map(url => new Request(url, {cache: 'reload'})))));
  // Initial installation activates normally; updates deliberately wait.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const canonical = new URL(url.href); canonical.search = ''; canonical.hash = '';
    if (canonical.href === self.registration.scope) canonical.pathname += 'index.html';
    const cached = await cache.match(canonical.href);
    if (cached) return cached;
    return fetch(request);
  })());
});
function askClient(client) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 2200);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.safe === true); };
    client.postMessage({type: 'CAN_UPDATE'}, [channel.port2]);
  });
}
self.addEventListener('message', event => {
  const port = event.ports[0];
  if (event.data?.type === 'STATUS') event.waitUntil((async () => {
    const cache = await caches.open(CACHE); let count = 0;
    for (const url of assetURLs) if (await cache.match(url)) count++;
    port?.postMessage({build: BUILD, cached: count, expected: assetURLs.length});
  })());
  if (event.data?.type === 'ACTIVATE') event.waitUntil((async () => {
    const clients = (await self.clients.matchAll({type: 'window', includeUncontrolled: true})).filter(c => c.url.startsWith(self.registration.scope));
    const safe = clients.length > 0 && (await Promise.all(clients.map(askClient))).every(Boolean);
    port?.postMessage({ok: safe});
    if (safe) await self.skipWaiting();
  })());
});
