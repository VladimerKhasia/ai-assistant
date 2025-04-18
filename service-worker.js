const CACHE_NAME = 'ai-assistant-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/index.js',
    '/assets/gemma3-1b-it-int4.task',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm'
];

// Install event: Cache all essential files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache failed', error);
            })
    );
    self.skipWaiting(); // Force the new service worker to activate
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim(); // Take control of clients immediately
});

// Fetch event: Serve cached files, fallback to network
self.addEventListener('fetch', event => {
    console.log('Service Worker: Fetching', event.request.url);
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached response if available
                if (response) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return response;
                }
                // Fallback to network for uncached requests
                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cache new responses for future offline use
                        if (networkResponse && networkResponse.status === 200) {
                            return caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            });
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('Service Worker: Network fetch failed', error);
                        // Fallback for offline HTML page
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        throw error;
                    });
            })
    );
});