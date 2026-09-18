/* Dejapa Burguer — service worker
   Guarda o app para abrir rápido e funcionar sem internet.
   O cardápio vem da planilha e nunca é cacheado aqui. */
var CACHE = 'dejapa-v1';
var ESSENCIAIS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ESSENCIAIS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.map(function (n) { return n === CACHE ? null : caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // API e imagens externas: direto da rede

  if (req.mode === 'navigate') {                               // páginas: rede primeiro, cache como reserva
    e.respondWith(
      fetch(req).then(function (r) {
        var copia = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
        return r;
      }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); })
    );
    return;
  }
  e.respondWith(caches.match(req).then(function (cacheado) {    // demais arquivos: cache primeiro
    var rede = fetch(req).then(function (r) {
      if (r && r.status === 200) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
      return r;
    }).catch(function () { return cacheado; });
    return cacheado || rede;
  }));
});
