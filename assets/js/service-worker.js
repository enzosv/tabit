importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js"
);

function startWorkbox() {
  if (!workbox) {
    console.error(`❌ Workbox load failed`);
    return;
  }

  console.log(`✅ Workbox loaded`);

  // Cache HTML, JS, CSS with StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === "document" ||
      request.destination === "script" ||
      request.destination === "style",
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "static-resources",
    })
  );

  // Cache Cal-Heatmap and other vendor JS
  workbox.routing.registerRoute(
    ({ url }) =>
      url.pathname.includes("cal-heatmap") ||
      url.pathname.includes("bootstrap") ||
      url.pathname.includes("jquery") ||
      url.pathname.includes("d3") ||
      url.pathname.includes("popper") ||
      url.pathname.includes("Tooltip") ||
      url.pathname.includes("supabase"),
    new workbox.strategies.CacheFirst({
      cacheName: "vendor-js",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    })
  );

  // Cache images (if any)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === "image",
    new workbox.strategies.CacheFirst({
      cacheName: "images",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
        }),
      ],
    })
  );

  // Optional: Cache API requests (for syncing offline data)
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith("/api/"),
    new workbox.strategies.NetworkFirst({
      cacheName: "api-cache",
    })
  );
}

startWorkbox();
