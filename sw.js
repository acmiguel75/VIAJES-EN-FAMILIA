const CACHE_NAME = 'viajeros-v3';

// SOLO cacheamos los archivos locales críticos durante la instalación.
// Esto evita errores 404 en enlaces externos que rompen la app.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// Instalación: Cachear solo lo local
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

// Fetch: Estrategia híbrida
// 1. Intenta servir desde Caché
// 2. Si no está, va a la Red
// 3. Guarda la respuesta de la Red en Caché para la próxima vez (Runtime Caching para CDNs)
self.addEventListener('fetch', (event) => {
  // Solo peticiones GET (ignorar POST, PUT, etc.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Verificar respuesta válida
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors' && networkResponse.type !== 'opaque') {
          return networkResponse;
        }

        // Clonar y guardar en caché (Aquí se guardarán Tailwind, Vue, etc. automáticamente)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback opcional si no hay red ni caché (podríamos devolver una página offline.html si existiera)
        console.log('Offline: recurso no disponible');
      });
    })
  );
});