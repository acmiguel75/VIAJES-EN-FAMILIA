const CACHE_NAME = 'viajeros-v5'; // Incrementamos versión para forzar actualización

// Usamos rutas ABSOLUTAS (con barra al principio) para evitar problemas en Vercel
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalación: Cachear archivos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpiar caches viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Estrategia Network First para navegación, Cache First para recursos
self.addEventListener('fetch', (event) => {
  // Solo peticiones GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Estrategia especial para Navegación (abrir la app)
  // Intentamos red primero, si falla, devolvemos index.html del caché
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Estrategia para recursos (imágenes, scripts, estilos)
  // Cache First, luego Network y actualizamos caché
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Verificar validez
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors' && networkResponse.type !== 'opaque') {
          return networkResponse;
        }

        // Guardar en caché para el futuro
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Si falla todo (offline y no caché), no hacemos nada o podríamos devolver un placeholder
      });
    })
  );
});