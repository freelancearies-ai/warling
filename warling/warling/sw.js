// sw.js - Service Worker untuk PWA
const CACHE_NAME = 'warling-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/seller.html',
    '/assets/css/style.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', // Cache file dari CDN
    'https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css',
    'https://unpkg.com/@supabase/supabase-js@2', // Cache library Supabase
    '/assets/js/supabase-client.js',
    '/assets/js/main.js',
    '/assets/js/seller.js',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Return cached version or fetch from network
            return response || fetch(event.request);
        })
    );
});