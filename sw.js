// Mudamos para v13 para forçar o telemóvel a apagar a v12 e baixar o Firestore
const CACHE_NAME = 'saripan-v13-firestore'; 

const ASSETS = [
  './',
  './index.html',
  './style.css',     // Novo arquivo de visual adicionado
  './app.js',        // Novo arquivo de motor adicionado
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          // Apaga qualquer cache que não seja o v13-firestore
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Mantida a sua estratégia: Tenta a rede primeiro, se falhar puxa do Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
