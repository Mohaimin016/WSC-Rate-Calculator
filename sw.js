const CACHE_NAME = "wsc-rate-calculator-v3";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"];

self.addEventListener("install", event => {
  // save each file on its own, so one missing file cannot stop the app from working offline
  event.waitUntil(caches.open(CACHE_NAME).then(c => Promise.all(APP_SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const putInCache = (request, response) => {
  if (response && response.ok && new URL(request.url).origin === self.location.origin) {
    const copy = response.clone(); caches.open(CACHE_NAME).then(c => c.put(request, copy));
  }
  return response;
};
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  // the page: newest from the network, but after 3 s (slow internet) or offline use the saved copy
  if (event.request.mode === "navigate") {
    const saved = () => caches.match(event.request, { ignoreSearch: true }).then(c => c || caches.match("./index.html"));
    const network = fetch(event.request).then(r => putInCache(event.request, r));
    const timeout = new Promise(res => setTimeout(res, 3000)).then(saved);
    event.respondWith(Promise.race([network.catch(saved), timeout.then(c => c || network)]).then(r => r || network).catch(saved));
    return;
  }
  event.respondWith(caches.match(event.request).then(c => c || fetch(event.request).then(r => putInCache(event.request, r))));
});
