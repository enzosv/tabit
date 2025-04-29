// sw.js - Service Worker for Offline Support (serving from public/)
const CACHE_NAME = 'tabit-cache-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/vendor/bootstrap.min.css',
  '/vendor/bootstrap.bundle.min.js',
  '/vendor/Tooltip.min.js',
  '/vendor/cal-heatmap.css',
  '/vendor/cal-heatmap.min.js',
  '/vendor/d3.v7.min.js',
  '/vendor/jquery-3.7.1.slim.min.js',
  '/vendor/popper.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
