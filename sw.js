// MUDE ESTA VERSÃO TODA VEZ QUE ATUALIZAR O CÓDIGO
const CACHE_NAME = 'saripan-v1.2'; 

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
  // Adicione aqui outros arquivos se tiver (ex: style.css)
];

// 1. Instalação: Baixa os arquivos novos
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o novo SW a entrar em ação imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching nova versão:', CACHE_NAME);
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Ativação: Limpa os caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim(); // Assume o controle da página imediatamente
});

// 3. Fetch: Serve o cache, mas se não tiver, busca na rede
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
