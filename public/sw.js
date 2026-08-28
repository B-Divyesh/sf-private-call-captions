const CACHE = 'pcc-site-v2';
const PAGES = ['/', '/demo/', '/privacy/', '/terms/'];
async function precache() {
  const cache = await caches.open(CACHE);
  const pages = await Promise.all(PAGES.map(async path => {
    const response = await fetch(path);
    await cache.put(path, response.clone());
    return response.text();
  }));
  const assets = pages.flatMap(page => [...page.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(match => match[1]));
  await cache.addAll([...new Set([...assets, '/favicon.svg', '/paper-caption-diorama.webp'])]);
}
self.addEventListener('install', event => event.waitUntil(precache().then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request.url);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch { return new Response('This page is available after your first visit.', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }
  })());
});
